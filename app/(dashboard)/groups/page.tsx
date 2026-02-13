"use client"

import { useAppStore } from "@/lib/store"
import { Users, Search, ArrowRight, LayoutGrid, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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

export default function GroupsPage() {
    const {
        groupsPage,
        groupsTotalCount,
        isGroupsLoading,
        fetchGroupsPage,
        students,
        assignments,
        currentUser,
        _hasHydrated
    } = useAppStore()

    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")

    // Filter and Pagination state
    const [filterCourse, setFilterCourse] = useState<string>("all")
    const [filterFlow, setFilterFlow] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    useEffect(() => {
        if (_hasHydrated && currentUser) {
            fetchGroupsPage(currentPage, itemsPerPage, {
                searchTerm,
                // course and flow filtering as before might be limited if not on group doc,
                // but searchTerm will work.
            })
        }
    }, [currentPage, searchTerm, _hasHydrated, currentUser, fetchGroupsPage])

    if (!currentUser) return null

    const totalPages = Math.ceil(groupsTotalCount / itemsPerPage);

    // Flows and courses for filters (derived from loaded students for now)
    const availableFlows = Array.from(new Set(students.map(s => s.group.split('-')[1] || ""))).filter(Boolean).sort()
    const availableCourses = ["1", "2", "3", "4"]

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">Группы</h1>
                    <p className="text-muted-foreground text-xs">Реестр академических групп.</p>
                </div>
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Поиск группы..."
                        className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                    />
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

                <Select value={filterFlow} onValueChange={(v) => { setFilterFlow(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[110px] text-[10px] font-bold uppercase bg-transparent border-border/40">
                        <SelectValue placeholder="Поток" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold">Все потоки</SelectItem>
                        {availableFlows.map(f => (
                            <SelectItem key={f} value={f} className="text-[10px] uppercase font-bold">{f} поток</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {(filterCourse !== "all" || filterFlow !== "all") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFilterCourse("all");
                            setFilterFlow("all");
                            setCurrentPage(1);
                        }}
                        className="h-8 px-2 text-[10px] font-bold uppercase text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
                    >
                        Сбросить
                    </Button>
                )}

                <div className="ml-auto text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Найдено групп: {groupsTotalCount}
                </div>
            </div>

            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[40%]">Группа</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-center">Поток</TableHead>
                            <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[15%]">Студ.</TableHead>
                            <TableHead className="text-center font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[15%]">Пред.</TableHead>
                            <TableHead className="pr-4 text-right font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isGroupsLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Загрузка...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {groupsPage.map((group) => {
                                    const groupId = group.name
                                    const groupStudentsCount = students.filter(s => s.group === groupId).length
                                    const groupSubjectsCount = assignments.filter(a => a.groupId === group.id).length
                                    const flow = groupId.split('-')[1] || "23"

                                    return (
                                        <TableRow
                                            key={group.id}
                                            className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 group cursor-pointer"
                                            onClick={() => router.push(`/groups/${encodeURIComponent(groupId)}`)}
                                        >
                                            <TableCell className="pl-4 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-7 w-7 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all">
                                                        <Users className="size-3.5" />
                                                    </div>
                                                    <span className="font-bold text-xs tracking-tight">{groupId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-[10px] font-mono text-muted-foreground/60">
                                                    {flow}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs font-bold text-muted-foreground/80">{groupStudentsCount}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs font-bold text-muted-foreground/80">{groupSubjectsCount}</span>
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <div className="inline-flex items-center justify-center h-7 px-2 text-[10px] font-bold gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-all">
                                                    Журнал <ArrowRight className="w-3 h-3" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {groupsPage.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground/40 gap-1.5">
                                                <LayoutGrid className="h-8 w-8 opacity-10" />
                                                <p className="text-xs font-medium">Группы не найдены</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
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

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;

                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`h-8 w-8 p-0 text-[10px] font-bold ${currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}`}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}

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
