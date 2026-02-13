"use client"

import { useAppStore } from "@/lib/store"
import {
    Users,
    GraduationCap,
    BookOpen,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    CalendarDays
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/hooks"
import { format } from "date-fns"
import { ru, enUS, uz } from "date-fns/locale"

export default function DashboardPage() {
    const { currentUser, users, subjects, stats } = useAppStore()
    const { t, language } = useTranslation()

    if (!currentUser) return null

    const totalStudents = stats.totalStudents
    const totalTeachers = stats.totalTeachers
    const totalSubjects = stats.totalSubjects
    const totalGroups = stats.totalGroups

    const pendingGrades = stats.pendingGrades
    const confirmedGrades = stats.confirmedGrades
    const totalGrades = pendingGrades + confirmedGrades

    const dashboardStats = [
        {
            title: t('dashboard.totalStudents'),
            value: totalStudents,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/5",
            border: "border-blue-500/10"
        },
        {
            title: t('dashboard.totalGroups'),
            value: totalGroups,
            icon: Users,
            color: "text-indigo-500",
            bg: "bg-indigo-500/5",
            border: "border-indigo-500/10"
        },
        {
            title: t('dashboard.totalTeachers'),
            value: totalTeachers,
            icon: Users,
            color: "text-amber-500",
            bg: "bg-amber-500/5",
            border: "border-amber-500/10"
        },
        {
            title: t('dashboard.totalSubjects'),
            value: totalSubjects,
            icon: BookOpen,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/10"
        }
    ]

    const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 flex items-center gap-2">
                    <CalendarDays className="size-3" />
                    {format(new Date(), 'PPPP', { locale: dateLocale })}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {dashboardStats.map((stat) => (
                    <div key={stat.title} className={`p-4 rounded-md border ${stat.border} bg-transparent transition-all hover:scale-[1.02] duration-300`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{stat.title}</span>
                            <div className={`${stat.bg} ${stat.color} p-1.5 rounded`}>
                                <stat.icon className="size-3.5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold tracking-tighter">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 space-y-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold px-1">{t('dashboard.title')}</h2>
                    <div className="rounded-md border border-border/40 p-6 bg-transparent space-y-8">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                                <span className="flex items-center gap-2 text-green-500/80">
                                    <CheckCircle2 className="size-3.5" />
                                    {t('dashboard.confirmedGrades')}
                                </span>
                                <span className="text-muted-foreground">{confirmedGrades} / {totalGrades}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500/60 transition-all duration-1000 ease-out"
                                    style={{ width: `${totalGrades > 0 ? (confirmedGrades / totalGrades) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                                <span className="flex items-center gap-2 text-amber-500/80">
                                    <Clock className="size-3.5" />
                                    {t('dashboard.pendingGrades')}
                                </span>
                                <span className="text-muted-foreground">{pendingGrades} / {totalGrades}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500/60 transition-all duration-1000 ease-out"
                                    style={{ width: `${totalGrades > 0 ? (pendingGrades / totalGrades) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {totalGrades === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/20 italic">
                                <AlertCircle className="size-10 mb-2 opacity-5" />
                                <p className="text-xs font-medium">{t('common.noData')}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-3 space-y-4">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold px-1">Профиль системы</h2>
                    <div className="rounded-md border border-border/40 p-6 bg-transparent space-y-6">
                        <div className="space-y-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/40">Статус аккаунта</span>
                            <div className="pt-1">
                                <Badge className="px-3 py-1 bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-tight">
                                    {currentUser.role}
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/40">Список разрешений</span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {currentUser.permissions.map(p => (
                                    <span key={p} className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-2 py-0.5 rounded border border-border/20">
                                        {p.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
