'use client'

import { useState, useEffect } from 'react'
import {
    LayoutDashboard, Globe, Key, Terminal, Cpu, Code2,
    Plus, Save, Trash2, MoveUp, MoveDown, Loader2,
    CheckCircle2, AlertCircle, Menu as MenuIcon, Eye, EyeOff
} from 'lucide-react'
import { getSidebarMenus, createSidebarMenu, updateSidebarMenu, deleteSidebarMenu, seedDefaultMenus } from '@/app/actions/menu'
import { clsx } from 'clsx'

const ICON_MAP: Record<string, any> = {
    LayoutDashboard, Globe, Key, Terminal, Cpu, Code2, MenuIcon
}

export default function MenuManagementPage() {
    const [menus, setMenus] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const loadMenus = async () => {
        setLoading(true)
        const res = await getSidebarMenus()
        if (res.success) setMenus(res.data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadMenus()
    }, [])

    const handleSeed = async () => {
        if (!confirm('기본 메뉴를 생성하시겠습니까? (이미 있는 경우 무시됨)')) return
        setLoading(true)
        const res = await seedDefaultMenus()
        alert(res.message || res.error)
        loadMenus()
    }

    const handleAdd = async () => {
        const label = prompt('메뉴 이름을 입력하세요:')
        if (!label) return
        const href = prompt('연결 주소(href)를 입력하세요 (예: /dashboard/new-feature):')
        if (!href) return

        const res = await createSidebarMenu({
            label,
            href,
            order: menus.length + 1
        })
        if (res.success) loadMenus()
        else alert(res.error)
    }

    const handleToggleActive = async (menu: any) => {
        setSaving(menu.id)
        const res = await updateSidebarMenu(menu.id, { isActive: !menu.isActive })
        if (res.success) {
            setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, isActive: !m.isActive } : m))
        }
        setSaving(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말로 이 메뉴를 삭제하시겠습니까?')) return
        setSaving(id)
        const res = await deleteSidebarMenu(id)
        if (res.success) loadMenus()
        setSaving(null)
    }

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        const newMenus = [...menus]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newMenus.length) return

        // Swap order values
        const menuA = newMenus[index]
        const menuB = newMenus[targetIndex]

        const tempOrder = menuA.order
        menuA.order = menuB.order
        menuB.order = tempOrder

        setMenus([...newMenus].sort((a, b) => a.order - b.order))

        // Update in DB (simple sequential update for safety)
        await updateSidebarMenu(menuA.id, { order: menuA.order })
        await updateSidebarMenu(menuB.id, { order: menuB.order })
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /> 메뉴 데이터를 불러오는 중...</div>

    return (
        <div className="p-8 space-y-8 max-w-5xl">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <MenuIcon className="h-8 w-8 text-blue-600" />
                        사이드바 메뉴 관리
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                        사용자 통합 사이드바의 메뉴 구성과 순서를 실시간으로 조정합니다.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleSeed} className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-[#324467] text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#192233] transition-all">
                        기본 메뉴 초기화
                    </button>
                    <button onClick={handleAdd} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Plus className="h-4 w-4" />
                        메뉴 추가
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467]">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">순서</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">메뉴명 (Label)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">경로 (Href)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">상태</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#192233]">
                        {menus.map((menu, index) => {
                            const IconComp = ICON_MAP[menu.icon] || LayoutDashboard
                            return (
                                <tr key={menu.id} className={clsx("group transition-colors", !menu.isActive && "bg-slate-50/50 dark:bg-slate-900/20 opacity-60")}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 w-4">{menu.order}</span>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30"><MoveUp className="h-3 w-3" /></button>
                                                <button onClick={() => handleMove(index, 'down')} disabled={index === menus.length - 1} className="hover:text-blue-600 disabled:opacity-30"><MoveDown className="h-3 w-3" /></button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-[#192233] rounded-lg">
                                                <IconComp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{menu.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-[11px] font-mono bg-slate-50 dark:bg-[#192233] px-2 py-1 rounded text-blue-600">{menu.href}</code>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleActive(menu)}
                                            disabled={saving === menu.id}
                                            className={clsx(
                                                "mx-auto flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all",
                                                menu.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            {menu.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                            {menu.isActive ? '활성' : '숨김'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(menu.id)}
                                            disabled={saving === menu.id}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {menus.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-slate-400 font-bold mb-4">현재 구성된 메뉴가 없습니다.</p>
                        <button onClick={handleSeed} className="text-blue-600 font-black text-sm underline underline-offset-4">기본 메뉴 세트로 시작하기</button>
                    </div>
                )}
            </div>
        </div>
    )
}
