import { getShopItemsAdmin } from '@/app/actions/admin-shop'
import AdminShopClient from './client'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AdminShopPage() {
    const res = await getShopItemsAdmin()
    const items = res.success ? (res.data || []) : []

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                        상점 상품 관리
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        사용자에게 판매할 슬롯 확장 상품을 등록하고 관리합니다.
                    </p>
                </div>
            </div>

            <AdminShopClient initialItems={items} />
        </div>
    )
}
