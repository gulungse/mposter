
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, CreditCard } from 'lucide-react'

export default async function AdminSalesPage() {
    const user = await getOrCreateUser()
    if (user.role !== 'ADMIN') redirect('/dashboard')

    // 최근 구매 내역 (UserPurchase)
    const purchases = await prisma.userPurchase.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true, item: true },
        take: 50
    })

    // 간단 통계 계산
    const totalSales = purchases.reduce((acc, curr) => acc + curr.price, 0)
    const totalCount = purchases.length

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        유료 판매 현황
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                        상점 아이템 판매 및 매출 현황을 분석합니다. (최근 50건 기준)
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#111722] p-6 rounded-3xl border border-slate-200 dark:border-[#324467] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">누적 매출액 (TOKEN)</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalSales.toLocaleString()}</h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111722] p-6 rounded-3xl border border-slate-200 dark:border-[#324467] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">판매 건수</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalCount}건</h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <CreditCard className="h-6 w-6" />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111722] p-6 rounded-3xl border border-slate-200 dark:border-[#324467] shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">전환율</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">- %</h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {/* Recent Sales List (Card Style as requested? Or List within Card Container?) 
                User requested "Card Form" for Sales. Usually Sales data is best in a list, 
                but I can put the list INSIDE a card container.
            */}
            <div className="bg-white dark:bg-[#111722] rounded-[2.5rem] border border-slate-200 dark:border-[#324467] shadow-xl p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    최근 결제 내역
                </h3>
                
                <div className="space-y-4">
                    {purchases.map(p => (
                        <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-[#1c263a] border border-slate-100 dark:border-[#232f48] hover:border-blue-500 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <ShoppingBagIcon itemType={p.type} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{p.item?.name || 'Unknown Item'}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {p.user?.name} ({p.user?.email}) • {new Date(p.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 md:mt-0 text-right">
                                <p className="text-lg font-black text-slate-900 dark:text-white">
                                    {p.price.toLocaleString()} <span className="text-xs font-medium text-slate-400">Tokens</span>
                                </p>
                                <p className="text-[10px] text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full inline-block">
                                    결제 완료
                                </p>
                            </div>
                        </div>
                    ))}
                    {purchases.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm font-bold">
                            아직 판매 내역이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ShoppingBagIcon({ itemType }: { itemType: string }) {
    // Just a wrapper to render conditional icons if needed, or static
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
    )
}
