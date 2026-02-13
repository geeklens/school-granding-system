"use client"

import { useAppStore } from "@/lib/store"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function TeachersPage() {
    const { users, subjects, assignments, assignTeacher, removeAssignment, currentUser, students } = useAppStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState("")
    const [selectedSubject, setSelectedSubject] = useState("")
    const [selectedGroup, setSelectedGroup] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    if (!currentUser) return null

    // Unique groups
    const uniqueGroups = Array.from(new Set(students.map(s => s.group))).sort()
    const teachersList = users.filter(u => u.role === 'TEACHER' || u.permissions?.includes('MANAGE_GRADES'))
    const canEdit = currentUser.role === 'ADMIN' ||
        currentUser.permissions?.includes('MANAGE_ASSIGNMENTS') ||
        currentUser.permissions?.includes('CONFIRM_GRADES')

    // Consolidate assignments by Teacher + Subject
    const consolidatedAssignments = assignments.reduce((acc, curr) => {
        const key = `${curr.teacherId}-${curr.subjectId}`;
        if (!acc[key]) {
            acc[key] = { ...curr, groupIds: [curr.groupId] };
        } else {
            acc[key].groupIds.push(curr.groupId);
        }
        return acc;
    }, {} as Record<string, any>);

    const filteredAssignments = Object.values(consolidatedAssignments).filter(a => {
        const teacher = users.find(u => u.id === a.teacherId)
        const subject = subjects.find(s => s.id === a.subjectId)
        const searchStr = `${teacher?.name} ${subject?.name} ${a.groupIds.join(' ')}`.toLowerCase()
        return searchStr.includes(searchTerm.toLowerCase())
    })

    const handleAddAssignment = () => {
        if (!selectedTeacher || !selectedSubject || !selectedGroup) {
            toast.error("Пожалуйста, заполните все поля")
            return
        }
        assignTeacher(selectedTeacher, selectedSubject, selectedGroup)
        toast.success("Назначение добавлено")
        setIsDialogOpen(false)
    }

    const handleDelete = (teacherId: string, subjectId: string, groupId: string) => {
        if (!canEdit) return
        removeAssignment(teacherId, subjectId, groupId)
        toast.info("Назначение удалено")
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">Назначения</h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold opacity-70">Связи учителей и предметов</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Поиск назначений..."
                            className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canEdit && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9 px-3">
                                    <Plus className="w-4 h-4 mr-1.5" /> Назначить
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Новое Назначение</DialogTitle>
                                    <DialogDescription>Выберите учителя, предмет и группу.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                        <SelectTrigger><SelectValue placeholder="Учитель" /></SelectTrigger>
                                        <SelectContent>
                                            {teachersList.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                        <SelectTrigger><SelectValue placeholder="Предмет" /></SelectTrigger>
                                        <SelectContent>
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                                        <SelectTrigger><SelectValue placeholder="Группа" /></SelectTrigger>
                                        <SelectContent>
                                            {uniqueGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddAssignment} className="w-full">Сохранить</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Учитель</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[30%] text-center">Предмет</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center w-[15%]">Группа</TableHead>
                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[10%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAssignments.map((assignment, idx) => {
                            const teacher = users.find(u => u.id === assignment.teacherId)
                            const subject = subjects.find(s => s.id === assignment.subjectId)

                            if (!teacher || !subject) return null

                            return (
                                <TableRow key={`${assignment.teacherId}-${assignment.subjectId}-${idx}`} className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 group">
                                    <TableCell className="pl-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs tracking-tight">{teacher.name}</span>
                                            <span className="text-[9px] font-mono text-muted-foreground/40 leading-none mt-1">ID: {teacher.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="text-[9px] font-bold py-0.5 h-4.5 bg-primary/5 text-primary border-primary/20">
                                            {subject.name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                            {assignment.groupIds.map((gid: string) => (
                                                <Badge
                                                    key={gid}
                                                    variant="outline"
                                                    className="text-[9px] font-bold border-muted/50 py-0 h-4 group-hover:border-primary/30 transition-colors relative group/badge"
                                                >
                                                    {gid}
                                                    {canEdit && (
                                                        <button
                                                            className="ml-1 hover:text-red-500 opacity-20 group-hover/badge:opacity-100 transition-opacity"
                                                            onClick={() => handleDelete(assignment.teacherId, assignment.subjectId, gid)}
                                                        >
                                                            <Trash2 className="w-2 h-2" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-4 text-right">
                                        {/* Row-level delete (remove all groups) is optional, keeping per-group for now or empty */}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filteredAssignments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-40 text-center">
                                    <p className="text-xs text-muted-foreground/40 font-medium">Нет назначений</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
