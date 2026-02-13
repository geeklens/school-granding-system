"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { db } from "@/utils/firebase/client"
import { collection, query, orderBy, getDocs } from "firebase/firestore"

// ... (rest of imports)
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    Search,
    History,
    Filter,
    User,
    FileText,
    Clock,
    Info,
    ChevronLeft,
    ChevronRight,
    AlertCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

// Временный тип для логов (позже можно вынести в store.ts)
interface ActivityLog {
    id: string;
    user_id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    profiles?: {
        full_name: string;
        username: string;
    };
}

export default function ActivityLogPage() {
    const { currentUser } = useAppStore()
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterAction, setFilterAction] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRemoteLogs = async () => {
            setIsLoading(true);
            try {
                const logsQuery = query(collection(db, 'activity_log'), orderBy('created_at', 'desc'));
                const logsSnap = await getDocs(logsQuery);

                // Also need to fetch profiles to match the join behavior
                const profilesSnap = await getDocs(collection(db, 'profiles'));
                const profilesMap: Record<string, any> = {};
                profilesSnap.forEach(doc => {
                    profilesMap[doc.id] = doc.data();
                });

                const logsData = logsSnap.docs.map(doc => {
                    const data = doc.data();
                    const profile = profilesMap[data.user_id];
                    return {
                        id: doc.id,
                        ...data,
                        profiles: profile ? {
                            full_name: profile.full_name,
                            username: profile.username
                        } : undefined
                    };
                });

                setLogs(logsData as ActivityLog[]);
            } catch (error) {
                console.error("Error fetching logs:", error);
            }
            setIsLoading(false);
        };

        if (currentUser) {
            fetchRemoteLogs();
        }
    }, [currentUser]);


    // Добавляем импорт клиента в начало файла

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'RESPONSIBLE')) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertCircle className="w-12 h-12 text-destructive/50" />
                <h1 className="text-xl font-bold">Доступ ограничен</h1>
                <p className="text-muted-foreground">Только администраторы могут просматривать историю действий.</p>
            </div>
        )
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action_type.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = filterAction === "all" || log.action_type === filterAction;

        return matchesSearch && matchesAction;
    })

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const getActionBadge = (action: string) => {
        if (action.startsWith('CREATE')) return <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/5">Создание</Badge>
        if (action.startsWith('UPDATE')) return <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-500/5">Изменение</Badge>
        if (action.startsWith('DELETE')) return <Badge variant="outline" className="border-red-500/50 text-red-600 bg-red-500/5">Удаление</Badge>
        return <Badge variant="outline">{action}</Badge>
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">История действий</h1>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-70">Системный аудит</p>
                </div>
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Поиск по имени или действию..."
                        className="h-9 pl-8 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-primary shadow-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/5 border border-border/40 rounded-lg">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Фильтры:</span>
                </div>

                <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="h-8 w-[180px] text-[10px] font-bold uppercase bg-transparent border-border/40">
                        <SelectValue placeholder="Тип действия" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] uppercase font-bold">Все действия</SelectItem>
                        <SelectItem value="CREATE_GRADE" className="text-[10px] uppercase font-bold">Выставление оценок</SelectItem>
                        <SelectItem value="UPDATE_GRADE" className="text-[10px] uppercase font-bold">Изменение оценок</SelectItem>
                        <SelectItem value="CONFIRM_GRADE" className="text-[10px] uppercase font-bold">Подтверждение</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    Всего записей: {filteredLogs.length}
                </div>
            </div>

            <div className="rounded-md border border-border/40 overflow-hidden bg-transparent">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-border/40">
                            <TableHead className="pl-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 w-[180px]">Время</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Пользователь</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Действие</TableHead>
                            <TableHead className="font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60">Объект</TableHead>
                            <TableHead className="pr-4 font-bold uppercase text-[9px] tracking-widest py-3 text-muted-foreground/60 text-right">Детали</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedLogs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-primary/[0.02] transition-colors border-border/40 last:border-0 group">
                                <TableCell className="pl-4 py-3">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="size-3" />
                                        <span className="text-[10px] font-mono leading-none">
                                            {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {log.profiles?.full_name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold leading-none">{log.profiles?.full_name}</span>
                                            <span className="text-[10px] text-muted-foreground/60">@{log.profiles?.username}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    {getActionBadge(log.action_type)}
                                </TableCell>
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="size-3 text-muted-foreground/50" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{log.entity_type}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="pr-4 py-3 text-right">
                                    <Button variant="ghost" size="icon" className="size-7 hover:bg-primary/5 text-muted-foreground/50 hover:text-primary">
                                        <Info className="size-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {paginatedLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/40 gap-1.5">
                                        <History className="h-8 w-8 opacity-10" />
                                        <p className="text-xs font-medium">История пуста</p>
                                    </div>
                                </TableCell>
                            </TableRow>
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
