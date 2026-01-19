import { 
    Shield as ShieldIcon, 
    Users as UsersIcon, 
    Menu as MenuIcon, 
    Terminal as TerminalIcon, 
    Coins as CoinsIcon, 
    CreditCard as CreditCardIcon, 
    ShoppingBag as ShoppingBagIcon, 
    BarChart3 as BarChartIcon,
    Activity as ActivityIcon,
    Zap as ZapIcon,
    Settings as SettingsIcon
} from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
    const user = await getOrCreateUser()

    if (user.role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const [userCount, postCount, siteCount, jobCount, activeJobCount] = await Promise.all([
        prisma.user.count(),
        prisma.postLog.count({ where: { status: 'SUCCESS' } }),
        prisma.site.count(),
        prisma.automationJob.count(),
        prisma.automationJob.count({ where: { isActive: true } })
    ])

    return (
        <div className="p-5 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <ShieldIcon className="h-6 w-6 text-primary" />
                    관리자 메뉴
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    시스템 전체 현황 파악 및 통합 관리 기능을 제공합니다.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <AdminStatCard 
                    title="전체 사용자" 
                    value={userCount} 
                    icon={<UsersIcon className="h-4 w-4" />} 
                    color="blue" 
                    unit="명"
                />
                <AdminStatCard 
                    title="누적 발행수" 
                    value={postCount} 
                    icon={<ActivityIcon className="h-4 w-4" />} 
                    color="green" 
                    unit="건"
                />
                <AdminStatCard 
                    title="활성 자동화" 
                    value={activeJobCount} 
                    icon={<ZapIcon className="h-4 w-4" />} 
                    color="orange" 
                    unit="개"
                />
                <AdminStatCard 
                    title="연결된 사이트" 
                    value={siteCount} 
                    icon={<BarChartIcon className="h-4 w-4" />} 
                    color="purple" 
                    unit="개"
                />
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Row 1 */}
                <AdminMenuCard
                    title="사용자 관리"
                    description="회원 목록 조회 및 권한/상태 관리"
                    icon={<UsersIcon className="h-5 w-5" />}
                    href="/dashboard/admin/users"
                    color="blue"
                />
                <AdminMenuCard
                    title="사이드바 메뉴 관리"
                    description="대시보드 사이드바 메뉴 구성 설정"
                    icon={<MenuIcon className="h-5 w-5" />}
                    href="/dashboard/admin/menus"
                    color="indigo"
                />
                <AdminMenuCard
                    title="시스템 프롬프트 관리"
                    description="공용 AI 프롬프트 템플릿 관리"
                    icon={<TerminalIcon className="h-5 w-5" />}
                    href="/dashboard/admin/prompts"
                    color="pink"
                />
                <AdminMenuCard
                    title="토큰 관리"
                    description="토큰 사용 내역 및 지급 관리"
                    icon={<CoinsIcon className="h-5 w-5" />}
                    href="/dashboard/admin/tokens"
                    color="yellow"
                />

                {/* Row 2 */}
                <AdminMenuCard
                    title="무료회원 슬롯 관리"
                    description="기본 무료 플랜의 한도 설정"
                    icon={<CreditCardIcon className="h-5 w-5" />}
                    href="/dashboard/admin/plans"
                    color="green"
                />
                <AdminMenuCard
                    title="상점 상품 관리"
                    description="슬롯 확장권 등 판매 상품 관리"
                    icon={<ShoppingBagIcon className="h-5 w-5" />}
                    href="/dashboard/admin/shop"
                    color="cyan"
                />
                <AdminMenuCard
                    title="유료 판매 현황"
                    description="결제 및 아이템 구매 매출 통계"
                    icon={<BarChartIcon className="h-5 w-5" />}
                    href="/dashboard/admin/sales"
                    color="orange"
                />
                <AdminMenuCard
                    title="시스템 환경설정"
                    description="토큰 비용 및 전역 시스템 규칙 설정"
                    icon={<SettingsIcon className="h-5 w-5" />}
                    href="/dashboard/admin/settings"
                    color="slate"
                />
            </div>
        </div>
    )
}

function AdminStatCard({ title, value, icon, color, unit }: { title: string, value: number, icon: React.ReactNode, color: string, unit: string }) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-500 bg-blue-500/10",
        green: "text-green-500 bg-green-500/10",
        purple: "text-purple-500 bg-purple-500/10",
        orange: "text-orange-500 bg-orange-500/10",
    }

    return (
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-black text-foreground">
                    {value.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">{unit}</span>
                </h3>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
        </div>
    )
}

function AdminMenuCard({ title, description, icon, href, color }: { title: string, description: string, icon: React.ReactNode, href: string, color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-900/50",
        indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/50",
        pink: "text-pink-500 bg-pink-500/10 border-pink-200 dark:border-pink-900/50",
        yellow: "text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-900/50",
        green: "text-green-500 bg-green-500/10 border-green-200 dark:border-green-900/50",
        cyan: "text-cyan-500 bg-cyan-500/10 border-cyan-200 dark:border-cyan-900/50",
        orange: "text-orange-500 bg-orange-500/10 border-orange-200 dark:border-orange-900/50",
        slate: "text-slate-500 bg-slate-500/10 border-slate-200 dark:border-slate-800",
    }

    return (
        <Link href={href} className="flex flex-col h-full bg-card p-5 rounded-xl border border-border hover:border-primary/50 shadow-sm hover:shadow-md transition-all group">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </Link>
    )
}
