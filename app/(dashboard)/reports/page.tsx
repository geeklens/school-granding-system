"use client"

import { useAppStore } from "@/lib/store"
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    PieChart,
    Pie,
    Legend
} from "recharts"
import { Download, Users, Globe, LayoutGrid, Languages, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportAllGradesToExcel } from "@/lib/export-utils"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function ReportsPage() {
    const { stats, subjects, users, currentUser } = useAppStore()

    if (!currentUser || (currentUser.role !== 'ADMIN' && !currentUser.permissions?.includes('VIEW_REPORTS'))) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <LayoutGrid className="w-16 h-16 text-muted-foreground opacity-20" />
                <div className="text-xl font-semibold opacity-50">Доступ ограничен</div>
                <p className="text-muted-foreground">У вас нет прав для просмотра аналитических отчетов.</p>
            </div>
        )
    }

    const {
        totalStudents,
        totalGroups,
        courseDistribution,
        genderDistribution
    } = stats;

    const handleExportStudents = () => {
        toast.info("Функция экспорта всего контингента (8.5 млн) временно ограничена разработчиком. Используйте выгрузку по группам.");
    };

    const handleExportGrades = () => {
        toast.info("Функция экспорта всех оценок временно ограничена. Используйте выгрузку по группам/предметам.");
    };

    const dashboardStats = [
        { label: "Студенты", value: totalStudents, icon: Users, color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/10" },
        { label: "Группы", value: totalGroups, icon: LayoutGrid, color: "text-indigo-500", bg: "bg-indigo-500/5", border: "border-indigo-500/10" },
        { label: "Курсы", value: 4, icon: FileText, color: "text-orange-500", bg: "bg-orange-500/5", border: "border-orange-500/10" },
        { label: "Языки", value: 2, icon: Languages, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
    ]

    const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--primary)/0.3)'];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">Отчеты</h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold opacity-70">Статистика контингента студентов</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportGrades} size="sm" className="h-9 px-3 gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10" variant="outline">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold uppercase tracking-tight">Весь поток (Оценки)</span>
                    </Button>
                    <Button onClick={handleExportStudents} size="sm" className="h-9 px-3 gap-2 border-border/40" variant="outline">
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold uppercase tracking-tight">Контингент</span>
                    </Button>
                </div>
            </div>

            {/* Standard Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                {dashboardStats.map((stat) => (
                    <div key={stat.label} className={`p-4 rounded-md border ${stat.border} bg-transparent transition-all hover:scale-[1.02] duration-300`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{stat.label}</span>
                            <div className={`${stat.bg} ${stat.color} p-1.5 rounded`}>
                                <stat.icon className="size-3.5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold tracking-tighter">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Chart 1 */}
                <div className="md:col-span-4 space-y-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold px-1">Распределение по курсам</h2>
                    <div className="rounded-md border border-border/40 p-6 bg-transparent">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={courseDistribution}>
                                <XAxis
                                    dataKey="name"
                                    stroke="currentColor"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground/40 font-bold uppercase"
                                />
                                <YAxis
                                    stroke="currentColor"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground/40 font-bold"
                                />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--primary)/0.02)' }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderRadius: '6px',
                                        border: '1px solid hsl(var(--border)/0.4)',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2 */}
                <div className="md:col-span-3 space-y-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold px-1">Гендерный состав</h2>
                    <div className="rounded-md border border-border/40 p-6 bg-transparent h-[348px] flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderDistribution}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genderDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderRadius: '6px',
                                        border: '1px solid hsl(var(--border)/0.4)',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
