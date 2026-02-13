"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full">
                <div className="flex items-center gap-2 border-b p-4">
                    <SidebarTrigger />
                    <span className="text-sm font-semibold">School Grading System</span>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
