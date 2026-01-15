import { Shield as ShieldIcon, Users as UsersIcon, AlertTriangle as AlertTriangleIcon, FileText as FileTextIcon, Activity as ActivityIcon, CreditCard as CreditCardIcon, MessageSquare as MessageSquareIcon } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { clsx } from 'clsx'

export default async function AdminPage() {
    const user = await getOrCreateUser()

    if (user.role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const [userCount, postCount, siteCount, jobCount] = await Promise.all([
        prisma.user.count(),
        prisma.postLog.count({ where: { status: 'SUCCESS' } }),
        prisma.site.count(),
        prisma.automationJob.count()
    ])

    return (
        <div className="p-5 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <ShieldIcon className="h-6 w-6 text-primary" />
                    시스템 관리자 콘솔
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    시스템 전체 현황 파악 및 사용자 관리 기능을 제공합니다.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <AdminStatCard title="전체 사용자" value={userCount} icon={<UsersIcon className="h-4 w-4" />} color="blue" />
                <AdminStatCard title="누적 발행물" value={postCount} icon={<FileTextIcon className="h-4 w-4" />} color="green" />
                <AdminStatCard title="연결된 사이트" value={siteCount} icon={<ActivityIcon className="h-4 w-4" />} color="purple" />
                <AdminStatCard title="활성 자동화" value={jobCount} icon={<ActivityIcon className="h-4 w-4" />} color="orange" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* User Management */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                    <div className="h-9 w-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 mb-3">
                        <UsersIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">사용자 관리</h3>
                    <p className="text-xs text-muted-foreground mb-4 h-8">사용자 목록 확인, 권한 부여(Admin/User), 및 계정 상태를 관리합니다.</p>
                    <Link href="/dashboard/admin/users" className="block w-full py-2 text-center bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50">
                        사용자 관리 바로가기
                    </Link>
                </div>

                {/* Menu Management */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-3">
                        <ShieldIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">사이드바 메뉴 관리</h3>
                    <p className="text-xs text-muted-foreground mb-4 h-8">대시보드 사이드바의 메뉴 구성, 아이콘, 순서 및 활성화 상태를 관리합니다.</p>
                    <Link href="/dashboard/admin/menus" className="block w-full py-2 text-center bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50">
                        메뉴 관리 바로가기
                    </Link>
                </div>

                {/* Plan Management */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                    <div className="h-9 w-9 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 mb-3">
                        <CreditCardIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">요금제 및 한도 관리</h3>
                    <p className="text-xs text-muted-foreground mb-4 h-8">Free, Basic, Pro 플랜의 가격과 각 리소스별 생성 한도를 설정합니다.</p>
                    <Link href="/dashboard/admin/plans" className="block w-full py-2 text-center bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50">
                        요금제 관리 바로가기
                    </Link>
                </div>

                {/* System Prompt Management */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-3">
                        <MessageSquareIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">시스템 프롬프트 관리</h3>
                    <p className="text-xs text-muted-foreground mb-4 h-8">모든 회원에게 공용으로 제공되는 AI 프롬프트를 추가, 수정, 삭제합니다.</p>
                    <Link href="/dashboard/admin/prompts" className="block w-full py-2 text-center bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50">
                        프롬프트 관리 바로가기
                    </Link>
                </div>

                {/* System Logs */}
                <div className="bg-card p-5 rounded-xl border border-border shadow-sm opacity-60">
                    <div className="h-9 w-9 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 mb-3">
                        <AlertTriangleIcon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">시스템 로그</h3>
                    <p className="text-xs text-muted-foreground mb-4 h-8">시스템 오류 및 배치 작업 실행 이력을 모니터링합니다 (준비 중).</p>
                    <button disabled className="block w-full py-2 text-center bg-muted/30 rounded-lg text-xs font-bold text-muted-foreground cursor-not-allowed border border-border/30">
                        준비 중
                    </button>
                </div>
            </div>
        </div>
    )
}

function AdminStatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-500 bg-blue-500/10",
        green: "text-green-500 bg-green-500/10",
        purple: "text-purple-500 bg-purple-500/10",
        orange: "text-orange-500 bg-orange-500/10",
    }

    return (
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        </div>
    )
}
