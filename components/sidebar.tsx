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
    Coins,
    Settings as SettingsIcon,
    LogOut,
    ChevronsUpDown,
    ShoppingBag,
    X,
    ScrollText,
    Wand2,
    ChevronDown,
    ChevronUp,
    Youtube,
    ShieldAlert
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getUserProfile } from '@/app/actions/user'
import { getActiveSidebarMenus } from '@/app/actions/menu'
import { getGlobalSettings } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'
import { DeleteAccountButton } from '@/components/delete-account-button'

const ICON_MAP: Record<string, any> = {
    LayoutDashboard, Globe, Key, Terminal, Cpu, Code2, MenuIcon, Coins, ShoppingBag, ScrollText, Sparkles, Wand2, Youtube, ShieldCheck, ShieldAlert
}

interface SidebarProps {
    className?: string
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ className, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<{
        name: string | null;
        email: string;
        role: string;
        hasImageGenRights?: boolean;
        hasManualPostRights?: boolean;
        hasYoutubeRights?: boolean;
        hasTistoryRewriteRights?: boolean;
        hasNaverRewriteRights?: boolean;
    } | null>(null)
    const [menus, setMenus] = useState<any[]>([])
    const [showUpgrade, setShowUpgrade] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['MANAGEMENT', 'PUBLISHING', 'ADMIN'])

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        )
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/')
    }

    async function loadProfile() {
        const res = await getUserProfile()
        if (res.success && res.data) {
            setUser(res.data as any)
        }
    }

    async function loadMenus() {
        const res = await getActiveSidebarMenus()

        // Groups based on user request
        const dashboardMenu = { href: '/dashboard', icon: 'LayoutDashboard', label: '대시보드' }
        const shopMenu = { href: '/dashboard/shop', icon: 'Coins', label: '충전소' }

        const managementGroup = {
            id: 'MANAGEMENT',
            label: '관리메뉴',
            items: [
                { href: '/dashboard/sites', icon: 'Globe', label: '사이트 관리' },
                { href: '/dashboard/prompts', icon: 'Terminal', label: '프롬프트 관리' },
                { href: '/dashboard/keywords', icon: 'Key', label: '키워드 관리' },
                { href: '/dashboard/api', icon: 'Code2', label: 'API 관리' },
                { href: '/dashboard/logs', icon: 'ScrollText', label: '활동로그 관리' },
            ]
        }

        const publishingGroup = {
            id: 'PUBLISHING',
            label: '발행메뉴',
            items: [
                { href: '/dashboard/prompts/test', icon: 'Sparkles', label: '프롬프트 테스트' },
                { href: '/dashboard/tasks', icon: 'Cpu', label: '자동화 발행' },
                // Conditional permissions
                ...(user?.hasManualPostRights || user?.role === 'ADMIN' ? [
                    { href: '/dashboard/prompts/manual', icon: 'Wand2', label: '수동 발행' }
                ] : []),
                ...(user?.hasYoutubeRights || user?.role === 'ADMIN' ? [
                    { href: '/dashboard/tasks/youtube', icon: 'Youtube', label: '유튜브 > 블로그발행' }
                ] : []),
                ...(user?.hasTistoryRewriteRights || user?.role === 'ADMIN' ? [
                    { href: '/dashboard/prompts/tistory', icon: 'Sparkles', label: '티스토리 재작성' }
                ] : []),
                ...(user?.hasNaverRewriteRights || user?.role === 'ADMIN' ? [
                    { href: '/dashboard/naver-rewrite', icon: 'Wand2', label: '네이버 블로그 재구성' }
                ] : []),
            ]
        }

        const adminGroup = user?.role === 'ADMIN' ? {
            id: 'ADMIN',
            label: '관리자 메뉴',
            href: '/dashboard/admin',
            items: [
                { href: '/dashboard/admin/users', icon: 'ShieldCheck', label: '사용자 관리' },
                { href: '/dashboard/admin/slots', icon: 'ShieldAlert', label: '무료회원 슬롯관리' },
                { href: '/dashboard/admin/prompts', icon: 'Terminal', label: '시스템 프롬프트관리' },
                { href: '/dashboard/admin/tokens', icon: 'Coins', label: '토큰 관리' },
                { href: '/dashboard/admin/shop', icon: 'ShoppingBag', label: '상점 상품 관리' },
            ]
        } : null

        // Support DB menus - they will go into Management if not categorized
        let extraMenus: any[] = []
        if (res.success && res.data && res.data.length > 0) {
            const allItems = [
                dashboardMenu.href, shopMenu.href,
                ...managementGroup.items.map(i => i.href),
                ...publishingGroup.items.map(i => i.href),
                ...(adminGroup ? adminGroup.items.map(i => i.href) : [])
            ]
            res.data.forEach((dbItem: any) => {
                if (!allItems.includes(dbItem.href)) {
                    extraMenus.push(dbItem)
                }
            })
        }

        const finalStructure = {
            dashboard: dashboardMenu,
            shop: shopMenu,
            groups: [
                { ...managementGroup, items: [...managementGroup.items, ...extraMenus] },
                publishingGroup,
                ...(adminGroup ? [adminGroup] : [])
            ]
        }

        setMenus([finalStructure])
    }

    useEffect(() => {
        loadProfile()
    }, [])

    useEffect(() => {
        loadMenus()
        async function loadSettings() {
            const res = await getGlobalSettings()
            if (res.success && res.data) {
                // @ts-ignore
                setShowUpgrade(!!res.data.isUpgradeEnabled)
            }
        }
        loadSettings()
    }, [user])

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-[#0F1117] border-r border-[#1F2937] transition-transform duration-300 md:relative md:translate-x-0',
                    isOpen ? "translate-x-0" : "-translate-x-full",
                    className
                )}
            >
                {/* Logo Section */}
                <div className="h-[70px] flex items-center justify-between px-6 border-b border-[#1F2937]/50">
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
                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto no-scrollbar">
                    {menus[0] && (
                        <>
                            {/* Dashboard */}
                            <NavItem
                                href={menus[0].dashboard.href}
                                icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
                                label={menus[0].dashboard.label}
                                isActive={pathname === menus[0].dashboard.href}
                                onClick={onClose}
                            />

                            {/* Groups */}
                            {menus[0].groups.map((group: any) => {
                                const isExpanded = expandedGroups.includes(group.id)
                                return (
                                    <div key={group.id} className="space-y-1">
                                        <div
                                            className="flex items-center justify-between px-4 py-2 cursor-pointer group/header"
                                            onClick={() => group.href ? router.push(group.href) : toggleGroup(group.id)}
                                        >
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover/header:text-slate-300 transition-colors">
                                                {group.label}
                                            </p>
                                            {!group.href && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                                    className="text-slate-500 group-hover/header:text-slate-300"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded && (
                                            <div className="space-y-1 ml-2 border-l border-slate-800/50 pl-2">
                                                {group.items.map((item: any) => {
                                                    const isActive = pathname === item.href
                                                    const IconComp = ICON_MAP[item.icon] || LayoutDashboard
                                                    return (
                                                        <NavItem
                                                            key={item.href}
                                                            href={item.href}
                                                            icon={<IconComp className="h-[16px] w-[16px]" />}
                                                            label={item.label}
                                                            isActive={isActive}
                                                            onClick={onClose}
                                                            size="sm"
                                                        />
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Shop */}
                            <NavItem
                                href={menus[0].shop.href}
                                icon={<Coins className="h-[18px] w-[18px]" />}
                                label={menus[0].shop.label}
                                isActive={pathname === menus[0].shop.href}
                                onClick={onClose}
                            />
                        </>
                    )}
                </nav>

                {/* Footer / Profile Section */}
                <div className="p-4 border-t border-[#1F2937] bg-[#0A0C10]">

                    {showUpgrade && (
                        <Link
                            href="/dashboard/upgrade"
                            className="group relative w-full flex items-center justify-center rounded-xl h-11 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold tracking-wide overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/25"
                            onClick={onClose}
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
                    </div>
                    <div className="mt-4">
                        <DeleteAccountButton variant="button" />
                    </div>
                </div>
            </aside>
        </>
    )
}

function NavItem({
    href,
    icon,
    label,
    isActive,
    variant = 'default',
    size = 'default',
    onClick
}: {
    href: string
    icon: React.ReactNode
    label: string
    isActive?: boolean
    variant?: 'default' | 'admin'
    size?: 'default' | 'sm'
    onClick?: () => void
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                'group relative flex items-center gap-3 rounded-xl transition-all duration-200 overflow-hidden',
                size === 'sm' ? 'px-3 py-2' : 'px-4 py-3',
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
                "relative z-10 font-medium transition-colors duration-200",
                size === 'sm' ? "text-xs" : "text-sm",
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
