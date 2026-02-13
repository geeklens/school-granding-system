"use client"

import { useState, useMemo } from "react"
import { useAppStore, GradeType, User, Grade } from "@/lib/store"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, Lock, ArrowLeft, Users, BookOpen, ExternalLink, Settings, Trash2, Plus, Save, Search, ChevronsUpDown, FileDown } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { exportGroupGradesToExcel } from "@/lib/export-utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// --- Helper Component: Searchable Select ---
interface SearchableSelectProps {
    options: { id: string, name: string }[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    emptyText: string;
    disabled?: boolean;
}

const SearchableSelect = ({ options, value, onValueChange, placeholder, emptyText, disabled }: SearchableSelectProps) => {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            opt.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [options, searchQuery])

    const selectedOption = options.find(opt => opt.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-9 bg-background border-border/40 text-[11px] font-medium px-3"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[240px] p-0 shadow-2xl border-border/40" align="start">
                <div className="flex flex-col">
                    <div className="flex items-center border-b border-border/20 px-3 py-2">
                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <input
                            className="flex h-7 w-full rounded-md bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Поиск..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1 py-1.5 custom-scrollbar">
                        {filteredOptions.length === 0 && (
                            <div className="py-4 text-center text-[10px] text-muted-foreground/60 font-medium">
                                {emptyText}
                            </div>
                        )}
                        {filteredOptions.map((opt) => (
                            <div
                                key={opt.id}
                                className={`
                                    relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-[11px] outline-none transition-colors
                                    ${value === opt.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50"}
                                `}
                                onClick={() => {
                                    onValueChange(opt.id)
                                    setOpen(false)
                                    setSearchQuery("")
                                }}
                            >
                                <span className="flex-1 truncate">{opt.name}</span>
                                {value === opt.id && <Check className="ml-2 h-3.5 w-3.5 shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default function GroupGradingPage() {
    const params = useParams()
    const router = useRouter()
    const { currentUser, students, subjects, users, grades, assignments, saveGroupGrades, confirmGrade, assignTeacher, removeAssignment } = useAppStore()

    // State
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
    const [examType, setExamType] = useState<GradeType>('MIDTERM')
    const [localGrades, setLocalGrades] = useState<Record<string, { midterm: string, final: string }>>({})
    const [isManagingSubjects, setIsManagingSubjects] = useState(false)
    const [newSubjectId, setNewSubjectId] = useState("")
    const [newTeacherId, setNewTeacherId] = useState("")

    if (!currentUser) return null

    // Permissions logic
    const canGrade = currentUser.permissions?.includes('MANAGE_GRADES') || currentUser.role === 'ADMIN';
    const canConfirm = currentUser.permissions?.includes('CONFIRM_GRADES') || currentUser.role === 'ADMIN';
    const canManageAssignments = currentUser.permissions?.includes('MANAGE_ASSIGNMENTS') || currentUser.role === 'ADMIN';
    const isAdmin = currentUser.role === 'ADMIN';

    // 1. Data Retrieval - Decode classId in case of / in the ID
    const classId = params.classId as string;
    const currentGroupId = decodeURIComponent(classId);

    const classStudents = students.filter(s => s.group === currentGroupId).sort((a, b) => a.name.localeCompare(b.name));

    // Get assigned subjects for this group
    const groupAssignments = assignments.filter(a => a.groupId === currentGroupId);
    const assignedSubjectIds = groupAssignments.map(a => a.subjectId);
    let groupSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));

    // Available Subjects for grading (teacher-specific view)
    let availableGradingSubjects = groupSubjects;
    if (canGrade && !isAdmin) {
        const teacherSubjectIds = groupAssignments
            .filter(a => a.teacherId === currentUser.id)
            .map(a => a.subjectId);
        availableGradingSubjects = groupSubjects.filter(s => teacherSubjectIds.includes(s.id));
    }

    // 2. Handlers
    const enterGradingMode = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        // Initialize local state
        const newLocalGrades: Record<string, { midterm: string, final: string }> = {};
        classStudents.forEach(student => {
            const midterm = grades.find(g => g.studentId === student.id && g.subjectId === subjectId && g.type === 'MIDTERM');
            const final = grades.find(g => g.studentId === student.id && g.subjectId === subjectId && g.type === 'FINAL');
            newLocalGrades[student.id] = {
                midterm: midterm ? String(midterm.value) : "",
                final: final ? String(final.value) : ""
            };
        });
        setLocalGrades(newLocalGrades);
    }

    const handleBack = () => {
        setSelectedSubjectId("");
        setExamType("MIDTERM");
    }

    const handleInputChange = (studentId: string, type: 'midterm' | 'final', val: string) => {
        setLocalGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [type]: val
            }
        }));
    }

    const handleSave = () => {
        if (!selectedSubjectId) return;
        const gradesToSave: { studentId: string, subjectId: string, teacherId: string, value: number, type: GradeType }[] = [];
        Object.entries(localGrades).forEach(([studentId, data]) => {
            if (data.midterm) {
                const val = parseFloat(data.midterm);
                if (!isNaN(val)) gradesToSave.push({ studentId, subjectId: selectedSubjectId, teacherId: currentUser.id, value: val, type: 'MIDTERM' });
            }
            if (data.final) {
                const val = parseFloat(data.final);
                if (!isNaN(val)) gradesToSave.push({ studentId, subjectId: selectedSubjectId, teacherId: currentUser.id, value: val, type: 'FINAL' });
            }
        });
        saveGroupGrades(gradesToSave);
        toast.success("Оценки сохранены!");
    }

    const handleConfirmAll = () => {
        const pendingGrades = grades.filter(g =>
            g.subjectId === selectedSubjectId && g.type === examType && g.status === 'PENDING' && classStudents.some(s => s.id === g.studentId)
        );
        if (pendingGrades.length === 0) {
            toast.info("Нет оценок для подтверждения");
            return;
        }
        if (confirm(`Подтвердить ${pendingGrades.length} оценок?`)) {
            pendingGrades.forEach(g => confirmGrade(g.id, currentUser.id));
            toast.success("Оценки подтверждены");
        }
    }

    const handleAddAssignment = () => {
        if (!newSubjectId) {
            toast.error("Выберите предмет");
            return;
        }
        assignTeacher(newTeacherId || "unassigned", newSubjectId, currentGroupId);
        toast.success("Предмет добавлен в программу группы");
        setNewSubjectId("");
        setNewTeacherId("");
    }

    const handleRemoveAssignment = (subjectId: string) => {
        const assignment = groupAssignments.find(a => a.subjectId === subjectId);
        if (assignment && assignment.teacherId && currentGroupId) {
            removeAssignment(assignment.teacherId, subjectId, currentGroupId);
            toast.info("Предмет удален из программы");
        }
    }

    const isLocked = (studentId: string, type: GradeType) => {
        const grade = grades.find(g => g.studentId === studentId && g.subjectId === selectedSubjectId && g.type === type);
        return grade?.status === 'CONFIRMED' && !isAdmin;
    }

    // Helper to calculate progress counts
    const getProgressStats = (subjectId: string, type: GradeType) => {
        if (classStudents.length === 0) return { count: 0, total: 0 };
        const count = classStudents.filter(s =>
            grades.some(g => g.studentId === s.id && g.subjectId === subjectId && g.type === type)
        ).length;
        return { count, total: classStudents.length };
    }

    // --- VIEW 1: DASHBOARD ---
    if (!selectedSubjectId) {
        return (
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full border border-border/40 hover:bg-muted/50 transition-all group shrink-0"
                            onClick={() => router.push("/groups")}
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </Button>
                        <div className="flex flex-col flex-1">
                            <h1 className="text-2xl font-bold tracking-tight">Группа {currentGroupId}</h1>
                            <div className="flex items-center gap-4 text-muted-foreground/45 text-[9px] uppercase font-bold tracking-widest mt-0.5">
                                <div className="flex items-center gap-1.5">
                                    <Users className="size-2.5" />
                                    <span>{classStudents.length} Студентов</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen className="size-2.5" />
                                    <span>{groupSubjects.length} Предметов в программе</span>
                                </div>
                            </div>
                        </div>

                        {canManageAssignments && (
                            <div className="flex items-center gap-2">
                                {isAdmin && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm(`Вы уверены, что хотите удалить группу ${currentGroupId} и всех её студентов? Это действие необратимо.`)) {
                                                const promise = useAppStore.getState().removeGroup(currentGroupId);
                                                toast.promise(promise, {
                                                    loading: `Удаление группы ${currentGroupId}...`,
                                                    success: () => {
                                                        router.push("/groups");
                                                        return `Группа ${currentGroupId} удалена`;
                                                    },
                                                    error: 'Ошибка при удалении группы',
                                                });
                                            }
                                        }}
                                        className="h-8 px-3 gap-2 text-[11px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Удалить группу
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setIsManagingSubjects(!isManagingSubjects)}
                                    variant={isManagingSubjects ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-8 px-3 gap-2 text-[11px] font-bold uppercase tracking-widest transition-all ${isManagingSubjects ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-primary/5 text-muted-foreground/60 hover:text-primary'}`}
                                >
                                    <Settings className={`w-3.5 h-3.5 transition-transform duration-500 ${isManagingSubjects ? 'rotate-180' : ''}`} />
                                    {isManagingSubjects ? "Готово" : "Настройка предметов"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Subjects Management or Grid */}
                    {isManagingSubjects ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <Card className="border-primary/20 bg-primary/[0.02]">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-xs uppercase tracking-widest font-bold">Добавить предмет в программу группы</CardTitle>
                                </CardHeader>
                                <CardContent className="py-0 px-4 pb-4">
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="flex-1">
                                            <SearchableSelect
                                                options={subjects.filter(s => !assignedSubjectIds.includes(s.id))}
                                                value={newSubjectId}
                                                onValueChange={setNewSubjectId}
                                                placeholder="Выберите предмет из каталога"
                                                emptyText="Предметы не найдены"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <SearchableSelect
                                                options={[
                                                    { id: "unassigned", name: "Без преподавателя" },
                                                    ...users.filter(u => u.role === 'TEACHER' || u.permissions?.includes('MANAGE_GRADES')).map(u => ({ id: u.id, name: u.name }))
                                                ]}
                                                value={newTeacherId}
                                                onValueChange={setNewTeacherId}
                                                placeholder="Назначить преподавателя (опционально)"
                                                emptyText="Преподаватели не найдены"
                                            />
                                        </div>
                                        <Button size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-tight" onClick={handleAddAssignment}>
                                            <Plus className="w-4 h-4 mr-2" /> Добавить
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="rounded-md border border-border/40 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/5">
                                        <TableRow className="hover:bg-transparent border-border/40">
                                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Предмет</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[40%]">Преподаватель</TableHead>
                                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[10%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupAssignments.map(a => {
                                            const sub = subjects.find(s => s.id === a.subjectId);
                                            if (!sub) return null;
                                            return (
                                                <TableRow key={a.subjectId} className="hover:bg-primary/[0.01] border-border/40 last:border-0">
                                                    <TableCell className="pl-4 py-3">
                                                        <span className="font-bold text-xs tracking-tight">{sub.name}</span>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <SearchableSelect
                                                            options={[
                                                                { id: "unassigned", name: "Без преподавателя" },
                                                                ...users.filter(u => u.role === 'TEACHER' || u.permissions?.includes('MANAGE_GRADES')).map(u => ({ id: u.id, name: u.name }))
                                                            ]}
                                                            value={a.teacherId || "unassigned"}
                                                            onValueChange={(val) => assignTeacher(val, a.subjectId, currentGroupId)}
                                                            disabled={!canManageAssignments}
                                                            placeholder="Выбрать преподавателя"
                                                            emptyText="Не найдено"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                            onClick={() => handleRemoveAssignment(a.subjectId)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {groupAssignments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-10 text-[11px] font-medium text-muted-foreground/40 italic">Программа обучения пуста. Добавьте предметы из каталога.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">Предметы</h2>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/30">Электронный журнал группы</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {availableGradingSubjects.map(sub => {
                                    const midtermStats = getProgressStats(sub.id, 'MIDTERM');
                                    const finalStats = getProgressStats(sub.id, 'FINAL');
                                    const assignment = groupAssignments.find(a => a.subjectId === sub.id);
                                    const teacher = users.find(u => u.id === assignment?.teacherId);

                                    return (
                                        <div
                                            key={sub.id}
                                            className="cursor-pointer border border-border/40 hover:border-primary/40 rounded-md p-3 transition-all group/card bg-transparent flex flex-col justify-between min-h-[140px]"
                                            onClick={() => enterGradingMode(sub.id)}
                                        >
                                            <div>
                                                <div className="mb-3 flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-bold truncate group-hover/card:text-primary transition-colors">{sub.name}</h3>
                                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30 font-bold mt-0.5">
                                                            {teacher ? teacher.name : "Преподаватель не назначен"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 mt-4">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider">
                                                            <span className="text-muted-foreground/50">Промежуточный</span>
                                                            <span className="text-muted-foreground/80">{midtermStats.count} / {midtermStats.total}</span>
                                                        </div>
                                                        <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500/60"
                                                                style={{ width: `${(midtermStats.count / (midtermStats.total || 1)) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider">
                                                            <span className="text-muted-foreground/50">Итоговый</span>
                                                            <span className="text-muted-foreground/80">{finalStats.count} / {finalStats.total}</span>
                                                        </div>
                                                        <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500/60"
                                                                style={{ width: `${(finalStats.count / (finalStats.total || 1)) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Student Roster */}
                    <div className="pt-4">
                        <div className="pt-2">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">Список Студентов</h2>
                            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                                <Table>
                                    <TableHeader className="bg-muted/5">
                                        <TableRow className="hover:bg-transparent border-border/40">
                                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">HEMIS ID</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Имя</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Курс</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Сем.</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Язык</TableHead>
                                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Паспорт</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {classStudents.map((student) => (
                                            <TableRow
                                                key={student.id}
                                                className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 cursor-pointer group/row"
                                                onClick={() => router.push(`/students/${student.id}`)}
                                            >
                                                <TableCell className="pl-4 py-2.5">
                                                    <span className="text-[10px] font-mono font-medium text-muted-foreground/80">{student.hemisId}</span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className="font-bold text-xs tracking-tight group-hover/row:text-primary transition-colors">{student.name}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground/80">{student.course}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground/80">{student.semester}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-[10px] text-muted-foreground/60 font-medium">{student.language}</span>
                                                </TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <span className="text-[10px] font-mono text-muted-foreground/60">{student.passportId}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {classStudents.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground/40 p-10 text-xs font-medium">Нет студентов</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 2: GRADING TABLE ---
    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 mb-4 border-b border-border/40">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full border border-border/40 hover:bg-muted/50 transition-all group shrink-0"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </Button>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold tracking-tight">
                            {subjects.find(s => s.id === selectedSubjectId)?.name}
                        </h2>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-primary/60 leading-none mt-0.5">{currentGroupId}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="bg-muted/30 p-0.5 rounded-md flex mr-2">
                        <Button
                            variant={examType === 'MIDTERM' ? 'secondary' : 'ghost'}
                            className="text-[10px] h-7 px-3 font-bold uppercase tracking-tight"
                            size="sm"
                            onClick={() => setExamType('MIDTERM')}
                        >
                            Midterm
                        </Button>
                        <Button
                            variant={examType === 'FINAL' ? 'secondary' : 'ghost'}
                            className="text-[10px] h-7 px-3 font-bold uppercase tracking-tight"
                            size="sm"
                            onClick={() => setExamType('FINAL')}
                        >
                            Final
                        </Button>
                    </div>

                    {canConfirm && (
                        <Button onClick={handleConfirmAll} size="sm" className="bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 border-none h-7 text-[10px] font-bold uppercase tracking-tight px-3">
                            <Check className="w-3.5 h-3.5 mr-1.5" /> Подтвердить
                        </Button>
                    )}

                    {canGrade && (
                        <Button onClick={handleSave} size="sm" className="bg-green-600/10 text-green-500 hover:bg-green-600/20 border-none h-7 text-[10px] font-bold uppercase tracking-tight px-3">
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить
                        </Button>
                    )}

                    <Button
                        onClick={() => {
                            const subject = subjects.find(s => s.id === selectedSubjectId);
                            if (subject) {
                                exportGroupGradesToExcel(
                                    currentGroupId,
                                    subject.name,
                                    classStudents,
                                    grades,
                                    selectedSubjectId,
                                    examType
                                );
                                toast.success("Excel файл скачивается");
                            }
                        }}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-bold uppercase tracking-tight px-3 border-border/40 hover:bg-primary/5"
                    >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" /> Excel
                    </Button>
                </div>
            </div>

            {/* Grading Table */}
            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[20%]">ФИО Студента</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">HEMIS ID</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Passport</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Курс</TableHead>
                            <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[20%]">
                                {examType} БАЛЛ
                            </TableHead>
                            <TableHead className="text-right pr-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Старт / Статус</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classStudents.map(student => {
                            const midtermVal = localGrades[student.id]?.midterm || "";
                            const finalVal = localGrades[student.id]?.final || "";

                            const currentVal = examType === 'MIDTERM' ? midtermVal : finalVal;
                            const locked = isLocked(student.id, examType);

                            const gradeInStore = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubjectId && g.type === examType);
                            const isPending = gradeInStore?.status === 'PENDING';

                            const midtermGradeObj = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubjectId && g.type === 'MIDTERM');
                            const isMidtermConfirmed = midtermGradeObj?.status === 'CONFIRMED';
                            const isSequenceLocked = examType === 'FINAL' && !isMidtermConfirmed;

                            return (
                                <TableRow key={student.id} className="hover:bg-primary/[0.01] border-border/40 last:border-0">
                                    <TableCell className="pl-4 py-2">
                                        <Link
                                            href={`/students/${student.id}`}
                                            className="group/link inline-flex items-center gap-2 hover:text-primary transition-colors"
                                        >
                                            <span className="font-bold text-xs tracking-tight">{student.name}</span>
                                            <ExternalLink className="size-2.5 opacity-0 group-hover/link:opacity-40 transition-opacity" />
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                        <span className="text-[9px] font-mono text-muted-foreground/40">{student.hemisId}</span>
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                        <span className="text-[9px] font-mono text-muted-foreground/40">{student.passportId || "-"}</span>
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                        <span className="text-[10px] font-bold text-muted-foreground/60">{student.course}</span>
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                        <div className="flex justify-center items-center gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                className={`h-7 w-20 text-center font-bold text-xs bg-transparent border-border/40 focus:ring-1 focus:ring-primary ${locked ? 'text-green-500' : ''}`}
                                                value={currentVal}
                                                onChange={(e) => handleInputChange(student.id, examType === 'MIDTERM' ? 'midterm' : 'final', e.target.value)}
                                                disabled={(!canGrade && !isAdmin) || isSequenceLocked || locked}
                                            />
                                            {locked && <Lock className="w-3 h-3 text-green-500/50" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4 py-2">
                                        <div className="inline-flex items-center gap-2">
                                            {locked ? (
                                                <span className="text-[9px] font-bold text-green-500/60 uppercase tracking-widest">OK</span>
                                            ) : isPending ? (
                                                <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest">Check</span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Draft</span>
                                            )}
                                            {canConfirm && isPending && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-1.5 text-[9px] font-bold uppercase text-primary hover:bg-primary/10"
                                                    onClick={() => confirmGrade(gradeInStore!.id, currentUser.id)}
                                                >
                                                    Confirm
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
