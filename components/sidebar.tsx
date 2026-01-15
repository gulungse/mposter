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
    Settings as SettingsIcon,
    LogOut,
    ChevronsUpDown
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getUserProfile } from '@/app/actions/user'
import { getActiveSidebarMenus } from '@/app/actions/menu'
import { getGlobalSettings } from '@/app/actions/settings'

const ICON_MAP: Record<string, any> = {
    LayoutDashboard, Globe, Key, Terminal, Cpu, Code2, MenuIcon
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const [user, setUser] = useState<{ name: string | null; email: string; role: string } | null>(null)
    const [menus, setMenus] = useState<any[]>([])
    const [showUpgrade, setShowUpgrade] = useState(false)

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
            ]

            if (res.success && res.data && res.data.length > 0) {
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
        async function loadSettings() {
            const res = await getGlobalSettings()
            if (res.success && res.data) {
                // @ts-ignore
                setShowUpgrade(!!res.data.isUpgradeEnabled)
            }
        }
        loadProfile()
        loadMenus()
        loadSettings()
    }, [])

    return (
        <aside
            className={cn(
                'w-[280px] flex flex-col bg-[#0F1117] border-r border-[#1F2937] transition-all duration-300 relative z-50',
                className
            )}
        >
            {/* Logo Section */}
            <div className="h-[70px] flex items-center px-6 border-b border-[#1F2937]/50">
                <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                    <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">
                        <Sparkles className="h-5 w-5 fill-white/20" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black tracking-tight text-white leading-none">
                            MediPoster
                        </h2>
                        <span className="text-[10px] font-medium text-muted-foreground mt-1 tracking-wide">
                            AI Automation Workspace
                        </span>
                    </div>
                </Link>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto no-scrollbar">

                {/* Main Menu */}
                <div className="space-y-1">
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                        Platform
                    </p>
                    {menus.map((item) => {
                        const isActive = pathname === item.href
                        const IconComp = ICON_MAP[item.icon] || LayoutDashboard
                        return (
                            <NavItem
                                key={item.href}
                                href={item.href}
                                icon={<IconComp className="h-[18px] w-[18px]" />}
                                label={item.label}
                                isActive={isActive}
                            />
                        )
                    })}
                </div>

                {/* Admin Menu - Only visible to ADMIN role */}
                {user?.role === 'ADMIN' && (
                    <div className="space-y-1">
                        <div className="flex items-center px-4 mb-3">
                            <div className="h-px bg-[#1F2937] flex-1" />
                            <p className="px-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                                Admin
                            </p>
                            <div className="h-px bg-[#1F2937] flex-1" />
                        </div>

                        <NavItem
                            href="/dashboard/admin"
                            icon={<ShieldCheck className="h-[18px] w-[18px]" />}
                            label="사용자 관리"
                            isActive={pathname === '/dashboard/admin'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/plans"
                            icon={<CreditCard className="h-[18px] w-[18px]" />}
                            label="요금제 관리"
                            isActive={pathname === '/dashboard/admin/plans'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/prompts"
                            icon={<Terminal className="h-[18px] w-[18px]" />}
                            label="시스템 프롬프트"
                            isActive={pathname === '/dashboard/admin/prompts'}
                            variant="admin"
                        />
                        <NavItem
                            href="/dashboard/admin/settings"
                            icon={<SettingsIcon className="h-[18px] w-[18px]" />}
                            label="시스템 설정"
                            isActive={pathname === '/dashboard/admin/settings'}
                            variant="admin"
                        />
                    </div>
                )}
            </nav>

            {/* Footer / Profile Section */}
            <div className="p-4 border-t border-[#1F2937] bg-[#0A0C10]">

                {showUpgrade && (
                    <Link
                        href="/dashboard/upgrade"
                        className="group relative w-full flex items-center justify-center rounded-xl h-11 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold tracking-wide overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/25"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Sparkles className="h-3.5 w-3.5 mr-2 fill-white/20" />
                        UPGRADE TO PRO
                    </Link>
                )}

                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1F2937] transition-colors cursor-pointer group">
                    <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0 overflow-hidden">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-slate-200 group-hover:text-white transition-colors">
                            {user?.name || 'User'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                            {user?.email || 'Loading...'}
                        </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
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
                'group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden',
                isActive
                    ? variant === 'admin'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-white/5 text-white shadow-inner shadow-white/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
            )}
        >
            {/* Active Indicator Bar */}
            {isActive && variant !== 'admin' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
            )}

            <div className={cn(
                "relative z-10 transition-colors duration-200",
                isActive ? (variant === 'admin' ? "text-amber-500" : "text-blue-400") : "text-slate-500 group-hover:text-slate-300"
            )}>
                {icon}
            </div>
            <span className={cn(
                "relative z-10 text-sm font-medium transition-colors duration-200",
                isActive ? "font-bold" : ""
            )}>
                {label}
            </span>

            {/* Hover Glow Effect */}
            {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
        </Link>
    )
}
