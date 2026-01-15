import Link from 'next/link'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    Search,
    Bell,
    Settings,
    Globe as GlobeIcon,
    FileText as FileTextIcon,
    Hash as HashIcon,
    Coins as CoinsIcon,
    BarChart3 as BarChart3Icon,
    Activity as ActivityIcon,
    Cpu as CpuIcon,
    AlertCircle as AlertCircleIcon,
    Zap as ZapIcon,
    MoreHorizontal as MoreHorizontalIcon,
    ArrowRight as ArrowRightIcon
} from 'lucide-react'
import clsx from 'clsx'

export default async function DashboardPage() {
    const user = await getOrCreateUser()

    // 통계 데이터 조회
    const [successPosts, activeJobs, tokens] = await Promise.all([
        prisma.postLog.count({ where: { userId: user.id, status: 'SUCCESS' } }),
        prisma.automationJob.count({ where: { userId: user.id, isActive: true } }),
        Promise.resolve(user.tokenBalance)
    ])

    const stats = {
        activeSites: activeJobs, // Using active jobs as proxy for active sites or just 0
        totalPosts: successPosts,
        totalKeywords: 0 // Placeholder as we didn't fetch this yet
    }

    return (
        <>
            {/* Top Navbar */}
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-6 py-3">
                <div className="flex items-center gap-4 flex-1">
                    <label className="flex flex-col w-full max-w-md h-9">
                        <div className="flex w-full items-stretch rounded-lg h-full bg-card border border-border transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                            <div className="text-muted-foreground flex items-center justify-center pl-3">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-xs placeholder:text-muted-foreground px-3 text-foreground"
                                placeholder="Search tasks, sites, or prompts..."
                            />
                        </div>
                    </label>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-center rounded-lg size-9 bg-card border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Bell className="h-4 w-4" />
                    </button>
                    <button className="flex items-center justify-center rounded-lg size-9 bg-card border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Settings className="h-4 w-4" />
                    </button>
                    <div className="h-6 w-[1px] bg-border mx-1" />
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-foreground uppercase truncate max-w-[100px]">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user.email}</p>
                        </div>
                        <div className="bg-muted rounded-lg size-9 border border-primary/20 overflow-hidden relative">
                            {user.image ? <img src={user.image} alt="User" className="absolute inset-0 object-cover" /> : <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary font-bold text-xs">{user.name?.[0] || 'U'}</div>}
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-5 space-y-5 pb-10">
                {/* Header */}
                <div className="mb-5 flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Dashboard Overview</h1>
                        <p className="text-muted-foreground text-sm font-medium mt-1">Monitor your AI-driven content engine and task performance.</p>
                    </div>
                    <Link href="/dashboard/tasks/new" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
                        <ZapIcon className="h-4 w-4" />
                        New Task
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                    <StatCard
                        title="Active Tasks"
                        value={stats.activeSites}
                        icon={ActivityIcon}
                        trend="+2 new"
                        trendUp={true}
                    />
                    <StatCard
                        title="Total Posts"
                        value={stats.totalPosts}
                        icon={FileTextIcon}
                        trend="+124 today"
                        trendUp={true}
                    />
                    <StatCard
                        title="Keywords Tracked"
                        value={stats.totalKeywords}
                        icon={HashIcon}
                        trend="98% coverage"
                        trendUp={true}
                    />

                    {/* Premium Token Card */}
                    <div className="bg-card border border-primary/20 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-blue-500/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/20"></div>
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-wider">Token Balance</p>
                                <h3 className="text-2xl font-black text-foreground mt-1">{user?.tokenBalance || 0}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <CoinsIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 relative z-10">
                            {user?.tokenBalance === 0 ? 'Recharge needed to continue.' : 'Sufficient for ~120 posts.'}
                        </p>
                        <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity relative z-10">
                            Buy Tokens <ArrowRightIcon className="h-3 w-3" />
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Left Column: Activity & Health */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Graph */}
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                                    <BarChart3Icon className="h-4 w-4 text-primary" />
                                    Publishing Activity
                                </h3>
                                <select className="bg-muted text-muted-foreground text-xs rounded-lg px-2 py-1 outline-none border-none">
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                </select>
                            </div>
                            <div className="h-[250px] w-full flex items-end justify-between gap-2 px-2">
                                {/* Mock Chart Bars */}
                                {[40, 65, 30, 85, 50, 90, 60].map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end gap-2 group cursor-pointer">
                                        <div
                                            className="w-full bg-primary/20 rounded-t-lg relative transition-all duration-500 group-hover:bg-primary"
                                            style={{ height: `${h}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                {h} posts
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-center text-muted-foreground font-medium">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Tasks Table */}
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                                    <ActivityIcon className="h-4 w-4 text-green-500" />
                                    Recent Automation Tasks
                                </h3>
                                <Link href="/dashboard/tasks" className="text-xs font-bold text-primary hover:underline">View All</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border text-left">
                                            <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-2">Task Name</th>
                                            <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Schedule</th>
                                            <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider text-right pr-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {[1, 2, 3].map((_, i) => (
                                            <tr key={i} className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                            <ZapIcon className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-bold text-foreground">Tech News Daily #{i + 1}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold text-[10px]">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="py-3 text-muted-foreground font-medium">Every 3 hours</td>
                                                <td className="py-3 text-right pr-2">
                                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                                                        <MoreHorizontalIcon className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: System Health & Resources */}
                    <div className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
                            <h3 className="font-bold text-foreground flex items-center gap-2 mb-5 text-sm">
                                <CpuIcon className="h-4 w-4 text-orange-500" />
                                Resource Health
                            </h3>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">API Quota (OpenAI)</span>
                                        <span className="text-foreground">85%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[85%] rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">Server Load</span>
                                        <span className="text-foreground">12%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[12%] rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">Storage</span>
                                        <span className="text-foreground">45%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 w-[45%] rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">System Alerts</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                                        <AlertCircleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Blogger Token Expiring</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Reconnect 'My Tech Blog' within 2 days.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="mt-auto py-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                    <p>© 2026 ContentAI - MediPoster Service</p>
                    <div className="flex gap-4">
                        <Link href="#" className="hover:text-foreground">Support</Link>
                        <Link href="#" className="hover:text-foreground">Documentation</Link>
                    </div>
                </footer>
            </div>
        </>
    )
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: { title: string, value: string | number, icon: any, trend: string, trendUp?: boolean }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/50 transition-colors group">
            <div className="flex justify-between items-start mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {trend}
                </span>
            </div>
            <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-foreground mt-1">{value?.toLocaleString()}</h3>
            </div>
        </div>
    )
}
