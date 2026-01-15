'use client'

import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Globe,
    Key,
    Terminal,
    Cpu,
    Code2,
    Sparkles,
    ShieldCheck,
    Menu as MenuIcon,
    CreditCard,
    Settings as SettingsIcon
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getUserProfile } from '@/app/actions/user'
import { getActiveSidebarMenus } from '@/app/actions/menu'

const ICON_MAP: Record<string, any> = {
    LayoutDashboard, Globe, Key, Terminal, Cpu, Code2, MenuIcon
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const [user, setUser] = useState<{ name: string | null; email: string; role: string } | null>(null)
    const [menus, setMenus] = useState<any[]>([])

    useEffect(() => {
        async function loadProfile() {
            const res = await getUserProfile()
            if (res.success && res.data) {
                setUser(res.data as any)
            }
        }
        async function loadMenus() {
            const res = await getActiveSidebarMenus()
            const defaultMenus = [
                { href: '/dashboard', icon: 'LayoutDashboard', label: '대시보드' },
                { href: '/dashboard/sites', icon: 'Globe', label: '사이트 관리' },
                { href: '/dashboard/keywords', icon: 'Key', label: '키워드 관리' },
                { href: '/dashboard/prompts', icon: 'Terminal', label: '프롬프트 관리' },
                { href: '/dashboard/tasks', icon: 'Cpu', label: '자동화 작업' },
                { href: '/dashboard/api', icon: 'Code2', label: 'API 관리' },
            ]

            if (res.success && res.data && res.data.length > 0) {
                // 기본 메뉴와 DB 메뉴 중복 제거 (href 기준)
                const dbMenus = res.data
                const merged = [...defaultMenus]

                dbMenus.forEach((dbItem: any) => {
                    if (!merged.find(m => m.href === dbItem.href)) {
                        merged.push(dbItem)
                    }
                })
                setMenus(merged)
            } else {
                setMenus(defaultMenus)
            }
        }
        loadProfile()
        loadMenus()
    }, [])

    return (
        <aside
            className={cn(
                'w-64 flex flex-col bg-background border-r border-border transition-colors duration-300',
                className
            )}
        >
            <div className="p-6 flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-foreground font-sans">
                    Marketing AI
                </h2>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <div className="mb-2">
                    <p className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Main Menu</p>
                    {menus.map((item) => {
                        const isActive = pathname === item.href
                        const IconComp = ICON_MAP[item.icon] || LayoutDashboard
                        return (
                            <NavItem
                                key={item.href}
                                href={item.href}
                                icon={<IconComp className="h-5 w-5" />}
                                label={item.label}
                                isActive={isActive}
                            />
                        )
                    })}
                </div>

                {/* Admin Menu - Only visible to ADMIN role */}
                {user?.role === 'ADMIN' && (
                    <div className="mt-6 pt-4 border-t border-border space-y-1">
                        <p className="px-3 text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Administration</p>
                        <NavItem
                            href="/dashboard/admin"
                            icon={<ShieldCheck className="h-5 w-5" />}
                            label="사용자 관리"
                            isActive={pathname === '/dashboard/admin'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/plans"
                            icon={<CreditCard className="h-5 w-5" />}
                            label="요금제 관리"
                            isActive={pathname === '/dashboard/admin/plans'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/prompts"
                            icon={<Terminal className="h-5 w-5" />}
                            label="시스템 프롬프트"
                            isActive={pathname === '/dashboard/admin/prompts'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/settings"
                            icon={<SettingsIcon className="h-5 w-5" />}
                            label="시스템 설정"
                            isActive={pathname === '/dashboard/admin/settings'}
                            variant="admin"
                        />
                    </div>
                )}
            </nav>

            <div className="p-3 border-t border-border mt-auto">
                <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-card border border-border">
                    <div className="h-9 w-9 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold shrink-0">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p className="text-sm font-bold truncate text-foreground">
                            {user?.name || 'User'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'Loading...'}</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/upgrade"
                    className="w-full flex items-center justify-center rounded-xl h-10 px-4 bg-primary text-primary-foreground text-sm font-bold tracking-wide transition-all hover:opacity-90 shadow-lg shadow-blue-500/10"
                >
                    Upgrade Pro
                </Link>
            </div>
        </aside>
    )
}

function NavItem({
    href,
    icon,
    label,
    isActive,
    variant = 'default',
}: {
    href: string
    icon: React.ReactNode
    label: string
    isActive?: boolean
    variant?: 'default' | 'admin'
}) {
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 group',
                isActive
                    ? variant === 'admin'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-primary text-primary-foreground shadow-md shadow-blue-500/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <div className={cn("transition-colors", isActive ? "text-inherit" : "text-muted-foreground group-hover:text-foreground")}>
                {icon}
            </div>
            <span className="text-[15px] font-bold">{label}</span>
        </Link>
    )
}
