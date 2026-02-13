"use client"

import * as React from "react"
import {
    LayoutDashboard,
    Users,
    BookOpen,
    GraduationCap,
    BarChart3,
    UserCog,
    LogOut,
    CheckCircle2,
    Settings,
    Sun,
    Moon,
    History,
    Globe
} from "lucide-react"

import { useTranslation } from "@/lib/hooks"
import { LanguageSwitcher } from "./language-switcher"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar"
import { useAppStore } from "@/lib/store"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppSidebar() {
    const { currentUser, logout, students } = useAppStore()
    const { theme, setTheme } = useTheme()
    const { t } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()

    if (!currentUser) return null

    // Get unique groups from students
    const groups = Array.from(new Set(students.map(s => s.group))).sort()

    const mainItems = [
        {
            title: t('common.dashboard'),
            icon: LayoutDashboard,
            url: "/dashboard",
            role: ["ADMIN", "TEACHER", "RESPONSIBLE"]
        },
        {
            title: t('common.groups'),
            icon: Users,
            url: "/groups",
            role: ["ADMIN", "TEACHER", "RESPONSIBLE"]
        },
        {
            title: t('common.reports'),
            icon: BarChart3,
            url: "/reports",
            role: ["ADMIN", "RESPONSIBLE"]
        },
        {
            title: t('common.logs'),
            icon: History,
            url: "/logs",
            role: ["ADMIN", "RESPONSIBLE"]
        }
    ]

    const manageItems = [
        {
            title: t('common.students'),
            icon: GraduationCap,
            url: "/students",
            role: ["ADMIN", "RESPONSIBLE", "TEACHER"]
        },
        {
            title: t('common.teachers'),
            icon: Users,
            url: "/teachers",
            role: ["ADMIN"]
        },
        {
            title: t('common.subjects'),
            icon: BookOpen,
            url: "/subjects",
            role: ["ADMIN"]
        }
    ]

    const filteredMainItems = mainItems.filter(item => item.role.includes(currentUser.role))
    const filteredManageItems = manageItems.filter(item => item.role.includes(currentUser.role))

    const handleLogout = () => {
        logout()
        router.push("/login")
    }


    return (
        <Sidebar>
            <SidebarHeader className="border-b py-4">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-0.5 leading-none overflow-hidden text-left">
                            <span className="font-semibold text-sm truncate uppercase">{currentUser.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">{currentUser.role}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground/50 hover:text-foreground transition-colors"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                        </Button>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t('sidebar.grading')}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredMainItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url} className="flex items-center gap-3">
                                            <item.icon className="size-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {filteredManageItems.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>{t('sidebar.management')}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {filteredManageItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(item.url)}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.url} className="flex items-center gap-3">
                                                <item.icon className="size-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-border/40 p-3 pt-4">
                <div className="space-y-3">
                    {currentUser.role === 'ADMIN' && (
                        <div className="px-1">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/users"}
                                        className="h-10 bg-muted/20 border border-border/40 hover:bg-muted/40 transition-all rounded-lg group/btn"
                                    >
                                        <Link href="/users" className="flex items-center gap-3">
                                            <div className="flex items-center justify-center size-6 rounded bg-primary/10 text-primary group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-colors">
                                                <UserCog className="size-3.5" />
                                            </div>
                                            <span className="font-bold text-[10px] uppercase tracking-wider">{t('common.users')}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </div>
                    )}

                    <div className="pt-2">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={handleLogout}
                                    className="h-10 w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all rounded-lg group/exit"
                                >
                                    <div className="flex items-center justify-center size-6 rounded bg-muted/30 group-hover/exit:bg-red-500/10 transition-colors mr-3">
                                        <LogOut className="size-3.5" />
                                    </div>
                                    <span className="font-bold text-[10px] uppercase tracking-wider">{t('common.logout')}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
