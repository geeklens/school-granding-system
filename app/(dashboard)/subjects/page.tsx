"use client"

import { useState } from "react"
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
import { BookOpen, Plus, Search, Trash2 } from "lucide-react"
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
import { toast } from "sonner"

export default function SubjectsPage() {
    const { subjects, assignments, users, currentUser, addSubject, removeSubject } = useAppStore()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newSubjectName, setNewSubjectName] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    if (!currentUser) return null;

    const handleAddSubject = () => {
        if (!newSubjectName) {
            toast.error("Пожалуйста, введите название предмета")
            return
        }
        addSubject(newSubjectName)
        toast.success("Предмет добавлен")
        setNewSubjectName("")
        setIsDialogOpen(false)
    }

    const handleDeleteSubject = (id: string) => {
        if (confirm("Удалить этот предмет? Это может повлиять на оценки и назначения.")) {
            removeSubject(id);
            toast.success("Предмет удален");
        }
    }


    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const canManage = currentUser.role === 'ADMIN' || currentUser.permissions?.includes('MANAGE_SUBJECTS');

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">Предметы</h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold opacity-70">Управление дисциплинами</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Поиск предмета..."
                            className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canManage && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9 px-3">
                                    <Plus className="w-4 h-4 mr-1.5" /> Добавить
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Новый Предмет</DialogTitle>
                                    <DialogDescription>Введите название учебной дисциплины.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Название</Label>
                                        <Input
                                            id="name"
                                            value={newSubjectName}
                                            onChange={(e) => setNewSubjectName(e.target.value)}
                                            placeholder="Например: Высшая математика"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddSubject} className="w-full">Сохранить</Button>
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
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Название предмета</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center w-[40%]">Преподаватели</TableHead>
                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[10%]">ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubjects.map((subject) => {
                            const teachers = assignments
                                .filter((a) => a.subjectId === subject.id)
                                .map((a) => users.find((u) => u.id === a.teacherId)?.name)
                                .filter(Boolean) as string[]

                            return (
                                <TableRow key={subject.id} className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 group">
                                    <TableCell className="pl-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-all">
                                                <BookOpen className="size-3.5" />
                                            </div>
                                            <span className="font-bold text-xs tracking-tight">{subject.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                            {teachers.length > 0 ? (
                                                teachers.map((t, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-[9px] font-bold border-muted/50 py-0 h-4 px-1.5 leading-tight">
                                                        {t}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/40 italic">Не назначен</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-4 text-right flex items-center justify-end gap-3">
                                        <span className="text-[9px] font-mono font-medium text-muted-foreground/40">{subject.id.slice(0, 6)}...</span>
                                        {canManage && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => handleDeleteSubject(subject.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </TableCell>

                                </TableRow>
                            )
                        })}
                        {filteredSubjects.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-40 text-center">
                                    <p className="text-xs text-muted-foreground/40 font-medium">Предметы не найдены</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
