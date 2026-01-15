import { Sidebar } from '@/components/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { CronTicker } from '@/components/cron-ticker'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <CronTicker />
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-y-auto bg-background relative">
                <DashboardHeader />
                {children}
            </main>
        </div>
    )
}
