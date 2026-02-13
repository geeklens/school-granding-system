"use client"

import { useState, useEffect } from "react"
// ... imports ...
import { useAppStore, Student } from "@/lib/store"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Users, Search, ArrowRight, FileUp, ChevronLeft, ChevronRight, Filter, Trash2 } from "lucide-react"
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function StudentsPage() {
    const {
        studentsPage,
        studentsTotalCount,
        fetchStudentsPage,
        groups,
        addStudent,
        bulkAddStudents,
        currentUser,
        isLoading,
        isStudentsLoading,
        _hasHydrated
    } = useAppStore()

    const router = useRouter()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [isImporting, setIsImporting] = useState(false)


    // Filter and Pagination state
    const [filterCourse, setFilterCourse] = useState<string>("all")
    const [filterGroup, setFilterGroup] = useState<string>("all")
    const [filterGender, setFilterGender] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8 // Smaller page size for faster loading

    useEffect(() => {
        if (_hasHydrated && currentUser) {
            fetchStudentsPage(currentPage, itemsPerPage, {
                searchTerm,
                course: filterCourse,
                group: filterGroup,
                gender: filterGender
            })
        }
    }, [currentPage, searchTerm, filterCourse, filterGroup, filterGender, _hasHydrated, currentUser, fetchStudentsPage])

    // New student state
    const [formData, setFormData] = useState<Omit<Student, 'id'>>({
        name: "",
        group: "",
        hemisId: "",
        passportId: "",
        nationality: "",
        gender: "Мужской",
        pinfl: "",
        course: 1,
        language: "Узбекский",
        academicYear: "2023-2024",
        semester: 1
    })

    if (!_hasHydrated || !currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 italic">Синхронизация с базой данных...</p>
            </div>
        )
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            const rows = data.slice(1);

            const newStudents = rows.map((row: any[]) => {
                return {
                    hemisId: String(row[0] || "").trim(),
                    name: String(row[1] || "").trim(),
                    nationality: String(row[2] || "").trim(),
                    gender: String(row[3] || "").trim(),
                    passportId: String(row[4] || "").trim(),
                    pinfl: String(row[5] || "").trim(),
                    course: parseInt(String(row[6] || "").replace(/\D/g, "")) || 1,
                    group: String(row[7] || "").trim(),
                    language: String(row[8] || "").trim(),
                    academicYear: String(row[9] || "").trim(),
                    semester: parseInt(String(row[10] || "").replace(/\D/g, "")) || 1
                };
            }).filter(s => s.name && s.hemisId);
            if (newStudents.length > 0) {
                try {
                    await bulkAddStudents(newStudents);
                    toast.success(`Импортировано ${newStudents.length} студентов`);
                    // Refresh current page
                    fetchStudentsPage(currentPage, itemsPerPage, { searchTerm, course: filterCourse, group: filterGroup, gender: filterGender });
                } catch (err: any) {
                    toast.error("Ошибка при импорте: " + (err.message || "проверьте данные"));
                } finally {
                    setIsImporting(false);
                }
            } else {
                toast.error("Не удалось найти данные для импорта. Проверьте структуру файла.");
                setIsImporting(false);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    const handleAddStudent = async () => {
        if (!formData.name || !formData.group || !formData.hemisId) {
            toast.error("Пожалуйста, заполните основные поля: ФИО, Группа, HEMIS ID")
            return
        }
        try {
            await addStudent(formData)
            toast.success("Студент успешно добавлен")
            setIsDialogOpen(false)
            setFormData({
                name: "",
                group: "",
                hemisId: "",
                passportId: "",
                nationality: "",
                gender: "Мужской",
                pinfl: "",
                course: 1,
                language: "Узбекский",
                academicYear: "2023-2024",
                semester: 1
            })
            // Refresh
            fetchStudentsPage(currentPage, itemsPerPage, { searchTerm, course: filterCourse, group: filterGroup, gender: filterGender });
        } catch (error: any) {
            toast.error(error.message || "Ошибка при добавлении");
        }
    }


    const totalPages = Math.ceil(studentsTotalCount / itemsPerPage);

    const availableGroups = groups.map(g => g.name).sort();
    const availableCourses = ["1", "2", "3", "4"];
    const availableGenders = ["Мужской", "Женский"];


    const canManage = currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('VIEW_STUDENTS');

    const handleDeleteStudent = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Вы уверены, что хотите удалить этого студента?")) {
            const promise = useAppStore.getState().removeStudent(id);
            toast.promise(promise, {
                loading: 'Удаление студента...',
                success: () => {
                    fetchStudentsPage(currentPage, itemsPerPage, { searchTerm, course: filterCourse, group: filterGroup, gender: filterGender });
                    return 'Студент удален';
                },
                error: 'Ошибка при удалении',
            });
        }
    }

    const handleClearAll = async () => {
        if (confirm("ОПАСНО: Вы уверены, что хотите УДАЛИТЬ ВСЕХ студентов из базы данных? Это действие необратимо.")) {
            const promise = useAppStore.getState().clearAllStudents();
            toast.promise(promise, {
                loading: 'Очистка базы данных...',
                success: () => {
                    fetchStudentsPage(1, itemsPerPage, { searchTerm: "", course: "all", group: "all", gender: "all" });
                    return 'База данных студентов очищена';
                },
                error: (err) => `Ошибка при очистке: ${err.message}`,
            });
        }
    }


    return (
        <div className="p-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">Студенты</h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold opacity-70">Общий реестр</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Поиск..."
                            className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canManage && currentUser?.role === 'ADMIN' && (
                        <>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="excel-upload"
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all text-[11px] font-bold uppercase tracking-tight"
                                    onClick={() => document.getElementById('excel-upload')?.click()}
                                >
                                    <FileUp className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                    Импорт
                                </Button>
                            </div>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="h-9 px-3 text-[11px] font-bold uppercase tracking-tight">
                                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Добавить
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Добавить Студента</DialogTitle>
                                        <DialogDescription>Заполните анкету нового студента.</DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                                        <div className="grid gap-6 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name" className="text-[11px] uppercase font-bold text-muted-foreground/60">ФИО Студента</Label>
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Иванов Иван Иванович"
                                                    className="bg-muted/5 border-border/40"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="hemis" className="text-[11px] uppercase font-bold text-muted-foreground/60">HEMIS ID</Label>
                                                    <Input
                                                        id="hemis"
                                                        value={formData.hemisId}
                                                        onChange={(e) => setFormData({ ...formData, hemisId: e.target.value })}
                                                        placeholder="30001001"
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="group" className="text-[11px] uppercase font-bold text-muted-foreground/60">Группа</Label>
                                                    <Input
                                                        id="group"
                                                        value={formData.group}
                                                        onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                                        placeholder="IF-23-1"
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="nationality" className="text-[11px] uppercase font-bold text-muted-foreground/60">Национальность</Label>
                                                    <Input
                                                        id="nationality"
                                                        value={formData.nationality}
                                                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                                        placeholder="Узбек"
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="gender" className="text-[11px] uppercase font-bold text-muted-foreground/60">Пол</Label>
                                                    <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                                        <SelectTrigger className="bg-muted/5 border-border/40">
                                                            <SelectValue placeholder="Выберите пол" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Мужской">Мужской</SelectItem>
                                                            <SelectItem value="Женский">Женский</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="course" className="text-[11px] uppercase font-bold text-muted-foreground/60">Курс</Label>
                                                    <Input
                                                        type="number"
                                                        id="course"
                                                        value={formData.course}
                                                        onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) })}
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="semester" className="text-[11px] uppercase font-bold text-muted-foreground/60">Семестр</Label>
                                                    <Input
                                                        type="number"
                                                        id="semester"
                                                        value={formData.semester}
                                                        onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="language" className="text-[11px] uppercase font-bold text-muted-foreground/60">Язык</Label>
                                                    <Input
                                                        id="language"
                                                        value={formData.language}
                                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                                        placeholder="Узбекский"
                                                        className="bg-muted/5 border-border/40"
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddStudent} className="w-full">Зачислить Студента</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/5 border border-border/40 rounded-lg">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Фильтры:</span>
                </div>

                <Select value={filterCourse} onValueChange={(v) => { setFilterCourse(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[110px] text-[10px] font-bold uppercase bg-transparent border-border/40">
                        <SelectValue placeholder="Курс" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold">Все курсы</SelectItem>
                        {availableCourses.map(c => (
                            <SelectItem key={c} value={c} className="text-[10px] uppercase font-bold">{c} курс</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterGroup} onValueChange={(v) => { setFilterGroup(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[140px] text-[10px] font-bold uppercase bg-transparent border-border/40">
                        <SelectValue placeholder="Группа" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold">Все группы</SelectItem>
                        {availableGroups.map(g => (
                            <SelectItem key={g} value={g} className="text-[10px] uppercase font-bold">{g}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterGender} onValueChange={(v) => { setFilterGender(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[110px] text-[10px] font-bold uppercase bg-transparent border-border/40">
                        <SelectValue placeholder="Пол" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold">Все</SelectItem>
                        {availableGenders.map(g => (
                            <SelectItem key={g} value={g} className="text-[10px] uppercase font-bold">{g}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>


                <div className="ml-auto text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Найдено: {studentsTotalCount}
                </div>
            </div>

            <div className="rounded-md border border-border/40 overflow-x-auto bg-transparent mt-4">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">HEMIS ID</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Имя</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Нац.</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Пол</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Курс</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Группа</TableHead>
                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isStudentsLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Загрузка...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {studentsPage.map((student) => (
                                    <TableRow key={student.id} className="hover:bg-primary/[0.02] border-border/40 cursor-pointer group" onClick={() => router.push(`/students/${student.id}`)}>
                                        <TableCell className="pl-4 py-2.5 font-mono text-[10px]">{student.hemisId}</TableCell>
                                        <TableCell className="py-2.5 font-bold text-xs">{student.name}</TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground">{student.nationality}</TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground">{student.gender}</TableCell>
                                        <TableCell className="text-center text-[10px] font-bold">{student.course}</TableCell>
                                        <TableCell className="text-center text-[10px] text-primary font-bold">{student.group}</TableCell>
                                        <TableCell className="pr-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteStudent(e, student.id); }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {studentsPage.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground/40 gap-1.5">
                                                <Users className="h-8 w-8 opacity-10" />
                                                <p className="text-xs font-medium uppercase tracking-widest">Студенты не найдены</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between py-4 border-t border-border/40">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Страница {currentPage} из {totalPages}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

