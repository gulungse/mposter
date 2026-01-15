import Link from 'next/link'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    Search,
    Bell,
    Settings,
    FileText as FileTextIcon,
    Hash as HashIcon,
    Coins as CoinsIcon,
    Activity as ActivityIcon,
    Zap as ZapIcon,
    LayoutList as LayoutListIcon, // Using LayoutList for logs
    Cpu as CpuIcon,
    AlertCircle as AlertCircleIcon
} from 'lucide-react'
import { BuyTokensButton } from '@/components/dashboard/buy-tokens-button'

export default async function DashboardPage() {
    const user = await getOrCreateUser()

    // 통계 데이터 및 최근 로그 조회
    const [successPosts, activeJobs, recentLogs] = await Promise.all([
        prisma.postLog.count({ where: { userId: user.id, status: 'SUCCESS' } }),
        prisma.automationJob.count({ where: { userId: user.id, isActive: true } }),
        prisma.postLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                job: {
                    include: {
                        site: true
                    }
                }
            }
        })
    ])

    // 키워드 그룹 수 조회 (별도 쿼리로 분리)
    const totalKeywords = await prisma.keywordGroup.count({ where: { userId: user.id } })

    const stats = {
        activeSites: activeJobs,
        totalPosts: successPosts,
        totalKeywords: totalKeywords
    }

    return (
        <>
            {/* Top Navbar */}
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-6 py-3">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search bar removed */}
                </div>
                <div className="flex items-center gap-3">
                    {/* Icons removed */}
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
                        <h1 className="text-2xl font-black tracking-tight text-foreground">종합상황대기실 [DashBoard]</h1>
                        <p className="text-muted-foreground text-sm font-medium mt-1">자동화 작업 및 블로그 발행 현황을 한눈에 확인하세요.</p>
                    </div>
                    <Link href="/dashboard/tasks/new" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
                        <ZapIcon className="h-4 w-4" />
                        새 작업 만들기
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                    <StatCard
                        title="활성화된 자동화 작업"
                        value={stats.activeSites}
                        icon={ActivityIcon}
                        trend="Active Jobs"
                        trendUp={true}
                    />
                    <StatCard
                        title="총 발행포스트"
                        value={stats.totalPosts}
                        icon={FileTextIcon}
                        trend="Total Posted"
                        trendUp={true}
                    />
                    <StatCard
                        title="등록한 키워드"
                        value={stats.totalKeywords}
                        icon={HashIcon}
                        trend="Target Keywords"
                        trendUp={true}
                    />

                    {/* Premium Token Card */}
                    <div className="bg-card border border-primary/20 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-blue-500/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/20"></div>
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-wider">토큰 보유량</p>
                                <h3 className="text-2xl font-black text-foreground mt-1">{user?.tokenBalance?.toLocaleString() || 0}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <CoinsIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 relative z-10 h-4">
                            {/* Empty placeholder for spacing or remove completely if not needed */}
                        </p>
                        <BuyTokensButton />
                    </div>
                </div>

                {/* Main Content Grid - Merged View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Automation Status Table */}
                    <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
                                <LayoutListIcon className="h-4 w-4 text-primary" />
                                자동화 작업 현황
                            </h3>
                            <Link href="/dashboard/history" className="text-xs font-bold text-primary hover:underline">
                                전체 내역 보기
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-2">사이트명</th>
                                        <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">발행된 제목</th>
                                        <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">상태</th>
                                        <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">발행 시간</th>
                                        <th className="pb-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider text-right pr-2">소모 토큰</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {recentLogs.length > 0 ? (
                                        recentLogs.map((log) => (
                                            <tr key={log.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="py-3 pl-2 font-bold text-foreground">
                                                    {log.job?.site?.name || 'Unknown Site'}
                                                </td>
                                                <td className="py-3 text-foreground/90 max-w-[200px] truncate" title={log.title || ''}>
                                                    {log.title || '(No Title)'}
                                                </td>
                                                <td className="py-3">
                                                    <StatusBadge status={log.status} />
                                                </td>
                                                <td className="py-3 text-muted-foreground">
                                                    {new Date(log.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 text-right pr-2 font-medium">
                                                    - {log.tokensUsed}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                아직 발행된 작업 기록이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: System Health & Resources (Restored) */}
                    <div className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
                            <h3 className="font-bold text-foreground flex items-center gap-2 mb-5 text-sm">
                                <CpuIcon className="h-4 w-4 text-orange-500" />
                                시스템 리소스 상태
                            </h3>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">API 사용량 (OpenAI)</span>
                                        <span className="text-foreground">85%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[85%] rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">서버 부하</span>
                                        <span className="text-foreground">12%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-[12%] rounded-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">스토리지 공간</span>
                                        <span className="text-foreground">45%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 w-[45%] rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">시스템 알림</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                                        <AlertCircleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-foreground">블로그 연결 만료 임박</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">'My Tech Blog' 연결이 2일 내 만료됩니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <footer className="mt-auto py-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                    <p>© 2026 MediPoster Service</p>
                    <div className="flex gap-4">
                        <Link href="#" className="hover:text-foreground">고객지원</Link>
                        <Link href="#" className="hover:text-foreground">매뉴얼</Link>
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/5 text-primary`}>
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

function StatusBadge({ status }: { status: string }) {
    let classes = "bg-gray-500/10 text-gray-500"
    let label = status

    switch (status) {
        case 'SUCCESS':
            classes = "bg-green-500/10 text-green-500"
            label = "발행 성공"
            break
        case 'FAILED':
            classes = "bg-red-500/10 text-red-500"
            label = "실패"
            break
        case 'PROCESSING':
            classes = "bg-blue-500/10 text-blue-500"
            label = "작업중"
            break
        case 'PENDING':
            classes = "bg-yellow-500/10 text-yellow-500"
            label = "대기중"
            break
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${classes}`}>
            {label}
        </span>
    )
}
