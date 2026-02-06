'use client'

import { Sidebar } from '@/components/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { CronTicker } from '@/components/cron-ticker'
import { Footer } from '@/components/footer'
import { ImpersonationBanner } from '@/components/impersonation-banner'
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
                <ImpersonationBanner />
                <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </main>
        </div>
    )
}
