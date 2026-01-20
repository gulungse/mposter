import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { Coins, ShoppingBag, Zap, Calendar, Package } from 'lucide-react'
import { TokenChargeCard } from '@/components/shop/token-charge-card'
import { ShopItemCard } from '@/components/shop/shop-item-card'

export default async function ShopPage() {
    const user = await getOrCreateUser() // auth check

    // DB에서 사용자 정보 최신화 (잔액 표시용)
    const userData = await prisma.user.findUnique({
        where: { id: user.id }
    })

    // 판매 중인 상점 아이템 조회
    const shopItems = await prisma.shopItem.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' }
    })

    // 판매 중인 토큰 패키지 조회 (포트원 연동)
    const tokenPackages = await prisma.tokenPackage.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' }
    })

    return (
        <div className="p-5 space-y-10 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    상점 (Shop)
                </h1>
                <p className="text-muted-foreground text-sm font-medium mt-1">
                    토큰을 충전하고 슬롯 확장 아이템을 구매하여 작업 효율을 높이세요.
                </p>
            </div>

            {/* Token Balance & Charge Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Coins className="h-5 w-5 text-yellow-500" />
                        토큰 충전
                    </h2>
                    <div className="bg-muted px-4 py-2 rounded-xl text-sm font-medium">
                        보유 토큰: <span className="font-bold text-foreground">{userData?.tokenBalance?.toLocaleString() ?? 0}</span>
                    </div>
                </div>

                {/* Dynamically rendered packages */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Fetch packages logic needs to be added above return */}
                    {tokenPackages.map((pkg) => (
                        <TokenChargeCard
                            key={pkg.id}
                            id={pkg.id}
                            name={pkg.name}
                            amount={pkg.tokenAmount}
                            price={pkg.price}
                            isPopular={pkg.tokenAmount === 10000} // Example logic: 10k is popular
                            buyerEmail={user.email}
                            buyerName={user.name ?? undefined}
                            userId={user.id}
                        />
                    ))}
                </div>
            </section>

            {/* Slot Shop Section */}
            <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        슬롯 확장 상품
                    </h2>
                </div>

                {/* Banner */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-foreground">1개월(30일) 기간제 상품</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            아래 상품은 구매 시점으로부터 30일간 해당 슬롯을 추가로 제공하는 유료 상품입니다.<br />
                            기간이 만료되면 가장 최근에 등록한 자원부터 비활성화됩니다.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {shopItems.map((item) => (
                        <ShopItemCard key={item.id} item={item} />
                    ))}
                </div>
            </section>
        </div>
    )
}
