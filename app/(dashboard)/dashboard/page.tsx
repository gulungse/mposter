import Link from 'next/link'
import Image from 'next/image'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserLimits } from '@/lib/limits'
import { formatInKST, toKSTString } from '@/lib/date'

export const dynamic = 'force-dynamic'
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
import { LogoutButton } from '@/components/logout-button'

export default async function DashboardPage() {
    const user = await getOrCreateUser()

    // 사용자 데이터 조회 (getOrCreateUser 내부의 raw SQL 로직을 활용하여 schema mismatch 방어)
    const userData = await getOrCreateUser()

    // 동적 리소스 제한 조회 (기본 + 슬롯 구매)
    const limits = await getUserLimits(user.id)

    // 통계 데이터 동시 조회
    const [
        successPosts,
        activeJobs,
        recentLogs,
        siteCount,
        keywordGroupCount,
        promptCount,
        taskCount,
        purchases
    ] = await Promise.all([
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
        }),
        prisma.site.count({ where: { userId: user.id } }),
        prisma.keywordGroup.count({ where: { userId: user.id } }),
        prisma.prompt.count({ where: { userId: user.id, type: 'USER' } }),
        prisma.automationJob.count({ where: { userId: user.id } }),
        prisma.userPurchase.findMany({
            where: {
                userId: user.id,
                endDate: { gt: new Date() }
            },
            include: { item: true },
            orderBy: { endDate: 'asc' }
        })
    ])

    const stats = {
        activeSites: activeJobs,
        totalPosts: successPosts,
        totalKeywords: keywordGroupCount // Note: Showing keyword group count in stats card as explicit request implied slots
    }

    return (
        <>
            <div className="p-5 space-y-6 pb-10">
                {/* Header Title (Simplified) */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">대시보드</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">나의 작업 현황과 리소스를 한눈에 확인하세요.</p>
                </div>

                {/* New User Profile & Overview Section */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                        {/* Profile & Plan */}
                        <div className="flex items-start gap-5">
                            <div className="h-20 w-20 rounded-2xl bg-muted border-2 border-border overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                                {user.image ? (
                                    <Image
                                        src={user.image}
                                        alt={user.name || 'User'}
                                        width={80}
                                        height={80}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ActivityIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground">{user.name || '알 수 없는 사용자'}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase border border-primary/20">
                                            <ZapIcon className="h-3 w-3" />
                                            {userData?.plan?.name || 'Free Plan'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Account Info Details (Middle) */}
                        <div className="flex-1 border-l border-border pl-8 flex flex-col justify-center space-y-2.5 hidden md:flex">
                            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-2 min-w-[80px]">
                                    이메일
                                </span>
                                <span className="text-foreground">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-2 min-w-[80px]">
                                    로그인 방식
                                </span>
                                <span className="text-foreground">Google (Social)</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-2 min-w-[80px]">
                                    가입 날짜
                                </span>
                                <span className="text-foreground">
                                    {toKSTString(user.createdAt)}
                                </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border/50 w-full flex justify-start">
                                <LogoutButton />
                            </div>
                        </div>

                        {/* Token Balance (Right) */}
                        <div className="flex flex-col items-end justify-center min-w-[220px] bg-muted/30 p-5 rounded-2xl border border-border/50">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">토큰 보유량</h3>
                            <div className="flex items-center gap-2 mb-2">
                                <CoinsIcon className="h-5 w-5 text-primary" />
                                <div className="text-3xl font-black text-primary">
                                    {user?.tokenBalance?.toLocaleString() || 0}
                                </div>
                            </div>
                            <div className="text-[11px] font-bold text-red-500 mb-3 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-200 dark:border-red-900/30">
                                7일내 소멸예정 토큰 : 0
                            </div>
                            <div className="w-full">
                                <BuyTokensButton />
                            </div>
                        </div>
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
                                <span className="text-muted-foreground text-xs font-medium ml-2 bg-muted px-2 py-0.5 rounded-full">
                                    총 {stats.totalPosts.toLocaleString()}개 발행됨
                                </span>
                            </h3>
                            <div className="flex gap-2">
                                <Link href="/dashboard/tasks/new" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                    <ZapIcon className="h-3 w-3" /> 작업 생성
                                </Link>
                                <span className="text-border">|</span>
                                <Link href="/dashboard/history" className="text-xs font-bold text-muted-foreground hover:text-foreground">
                                    전체 내역
                                </Link>
                            </div>
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
                                                <td className="py-3 text-foreground/90 max-w-[200px] truncate" title={log.title || log.keyword}>
                                                    {log.status === 'SUCCESS' && log.postUrl ? (
                                                        <a href={log.postUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors block truncate">
                                                            {log.title || log.keyword || '(No Title)'}
                                                        </a>
                                                    ) : (
                                                        log.title || log.keyword || '제목 생성 중...'
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    <StatusBadge status={log.status} />
                                                </td>
                                                <td className="py-3 text-muted-foreground">
                                                    {formatInKST(log.createdAt, 'MM/dd HH:mm')}
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

                    {/* Right Column: User Usage Stats (Real Data) */}
                    <div className="space-y-5">
                        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
                            <h3 className="font-bold text-foreground flex items-center gap-2 mb-5 text-sm">
                                <CpuIcon className="h-4 w-4 text-orange-500" />
                                내 리소스 현황
                            </h3>

                            <div className="space-y-6">
                                <UsageBar
                                    label="사이트 등록 슬롯"
                                    used={siteCount}
                                    limit={limits.sites}
                                    color="bg-blue-500"
                                />
                                <UsageBar
                                    label="자동화 작업 슬롯"
                                    used={taskCount}
                                    limit={limits.tasks}
                                    color="bg-green-500"
                                />
                                <UsageBar
                                    label="키워드 그룹 슬롯"
                                    used={keywordGroupCount}
                                    limit={limits.keywords}
                                    color="bg-purple-500"
                                />
                                <UsageBar
                                    label="프롬프트 슬롯"
                                    used={promptCount}
                                    limit={limits.prompts}
                                    color="bg-pink-500"
                                />
                            </div>

                            <div className="mt-8 pt-6 border-t border-border">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">활성 구독 및 확장권</h4>
                                <div className="space-y-3">
                                    {(userData as any).plan && (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <ZapIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">{(userData as any).plan?.name || 'Basic Plan'}</p>
                                                    <p className="text-[10px] text-muted-foreground">기본 요금제</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">구독중</span>
                                        </div>
                                    )}

                                    {/* Active Purchases List */}
                                    {purchases.length > 0 ? (
                                        purchases.map((purchase: any) => (
                                            <div key={purchase.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                        <CoinsIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{purchase.item?.name || 'Unknown Item'}</p>
                                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                            ~ {new Date(purchase.endDate).toLocaleDateString()} 만료
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                                    +{purchase.slotAmount}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        !(userData as any).plan && (
                                            <div className="text-center py-4 text-xs text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border/50">
                                                활성화된 추가 구독이 없습니다.
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </>
    )
}

function UsageBar({ label, used, limit, color }: { label: string, used: number, limit: number, color: string }) {
    const percent = Math.min(100, Math.max(0, (used / limit) * 100))
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{used} / {limit} ({Math.round(percent)}%)</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
            </div>
        </div>
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
