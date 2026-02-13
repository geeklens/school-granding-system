"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useAppStore } from "@/lib/store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, _hasHydrated } = useAppStore()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Basic protection: only redirect if finished hydrating and no user
        if (_hasHydrated && !currentUser && pathname !== "/login") {
            router.push("/login")
        }

    }, [currentUser, pathname, router, _hasHydrated])

    // Wait for hydration to avoid flash or premature redirect
    if (!_hasHydrated) return null;

    if (!currentUser) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-background/20 backdrop-blur-md rounded-md border border-border/40 p-0.5">
                        <SidebarTrigger className="h-7 w-7" />
                    </div>
                </div>
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
