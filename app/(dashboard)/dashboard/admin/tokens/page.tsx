
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Coins } from 'lucide-react'

export default async function AdminTokensPage() {
    const user = await getOrCreateUser()
    if (user.role !== 'ADMIN') redirect('/dashboard')

    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true },
        take: 100 // Limit for now
    })

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Coins className="h-8 w-8 text-yellow-500" />
                        토큰 관리
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                        전체 사용자의 토큰 적립, 사용, 환불 내역을 모니터링합니다. (최근 100건)
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467]">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">일시</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">사용자</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">유형</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">내용</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">변동량</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#192233]">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                    {new Date(tx.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {tx.user?.name || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {tx.user?.email}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                     <TokenBadge type={tx.type} />
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                    {tx.description}
                                </td>
                                <td className={`px-6 py-4 text-right font-black ${tx.amount > 0 ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-400 text-sm font-bold">
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function TokenBadge({ type }: { type: string }) {
    const styles: Record<string, string> = {
        CHARGE: "bg-blue-100 text-blue-700",
        USAGE: "bg-slate-100 text-slate-600",
        BONUS: "bg-yellow-100 text-yellow-700",
        REFUND: "bg-red-100 text-red-700",
        PURCHASE: "bg-purple-100 text-purple-700"
    }

    const labels: Record<string, string> = {
        CHARGE: "충전",
        USAGE: "사용",
        BONUS: "보너스",
        REFUND: "환불",
        PURCHASE: "구매"
    }

    return (
        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${styles[type] || "bg-slate-100 text-slate-500"}`}>
            {labels[type] || type}
        </span>
    )
}
