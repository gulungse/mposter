import { getShopItemsAdmin } from '@/app/actions/admin-shop'
import AdminShopClient from './client'
import { ShoppingBag } from 'lucide-react'

export default async function AdminShopPage() {
    const res = await getShopItemsAdmin()
    const items = res.success ? (res.data || []) : []

    return (
        <div className="p-5 space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    상점 상품 관리
                </h1>
                <p className="text-muted-foreground text-sm font-medium mt-1">
                    사용자에게 판매할 슬롯 확장 상품을 등록하고 관리합니다. (가격, 수량, 유효기간 등)
                </p>
            </div>

            <AdminShopClient initialItems={items} />
        </div>
    )
}
