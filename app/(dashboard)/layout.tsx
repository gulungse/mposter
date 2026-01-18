'use client'

import { Sidebar } from '@/components/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { CronTicker } from '@/components/cron-ticker'
import { useState } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <CronTicker />
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 flex flex-col overflow-y-auto bg-background relative">
                <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                {children}
            </main>
        </div>
    )
}
