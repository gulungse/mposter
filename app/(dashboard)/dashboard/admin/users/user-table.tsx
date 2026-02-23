'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldAlert, ShieldCheck, Coins, Search, UserCheck, Eye, Image as ImageIcon, Loader2 as Loader2Icon } from 'lucide-react'
import { clsx } from 'clsx'
import { TokenAdjustmentModal } from './token-modal'
import { PermissionModal } from './permission-modal'

interface UserTableProps {
    users: any[]
}

export function UserTable({ users }: UserTableProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [permissionUser, setPermissionUser] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="이름 또는 이메일 검색..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#111722] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white transition-all"
                    />
                </label>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 dark:border-[#324467] bg-white dark:bg-[#111722] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-[#232f48] bg-slate-50 dark:bg-[#192233]">
                                <th className="px-6 py-4">사용자</th>
                                <th className="px-6 py-4">권한</th>
                                <th className="px-6 py-4">토큰 잔액</th>
                                <th className="px-6 py-4">가입일</th>
                                <th className="px-6 py-4 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#232f48]">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-[#192233]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden relative">
                                                {user.image ? (
                                                    <img src={user.image} alt={user.name || ''} className="absolute inset-0 object-cover w-full h-full" />
                                                ) : (
                                                    (user.name || 'U').substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                                                user.role === 'ADMIN'
                                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                            )}>
                                                {user.role === 'ADMIN' ? '관리자' : '일반 사용자'}
                                            </span>
                                            {user.hasImageGenRights && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                    이미지
                                                </span>
                                            )}
                                            {user.hasManualPostRights && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                    수동발행
                                                </span>
                                            )}
                                            {user.hasYoutubeRights && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                    유튜브
                                                </span>
                                            )}
                                            {user.hasTistoryRewriteRights && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                    티스토리
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                                            <Coins className="h-4 w-4 text-yellow-500" />
                                            {user.tokenBalance?.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setPermissionUser(user)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="권한 관리"
                                            >
                                                <ShieldCheck className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                                title="토큰 조정"
                                            >
                                                <Coins className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`${user.name}님으로 접속하시겠습니까?`)) {
                                                        const { impersonateUser } = await import('@/app/actions/admin')
                                                        const res = await impersonateUser(user.id)
                                                        if (res.success) {
                                                            window.location.reload()
                                                        } else {
                                                            alert(res.message)
                                                        }
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                title="이 사용자로 접속 (View As)"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-slate-500 text-sm">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <TokenAdjustmentModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                user={selectedUser}
            />

            <PermissionModal
                isOpen={!!permissionUser}
                onClose={() => setPermissionUser(null)}
                user={permissionUser}
            />
        </div>
    )
}
