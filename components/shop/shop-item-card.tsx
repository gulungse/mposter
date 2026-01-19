'use client'

import { ShopItem } from '@prisma/client'
import { Package, Clock, ShoppingCart, Loader2, Globe, Key, Terminal, Cpu } from 'lucide-react'
import { buyShopItem } from '@/app/actions/shop'
import { useState } from 'react'

interface Props {
    item: ShopItem
}

const ICON_MAP: Record<string, any> = {
    SITE_SLOT: Globe,
    KEYWORD_SLOT: Key,
    PROMPT_SLOT: Terminal,
    TASK_SLOT: Cpu
}

const LABEL_MAP: Record<string, string> = {
    SITE_SLOT: '사이트 슬롯',
    KEYWORD_SLOT: '키워드 그룹 슬롯',
    PROMPT_SLOT: '프롬프트 슬롯',
    TASK_SLOT: '자동화 작업 슬롯'
}

export function ShopItemCard({ item }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const Icon = ICON_MAP[item.type] || Package

    const handlePurchase = async () => {
        if (!confirm(`'${item.name}' 상품을 구매하시겠습니까?\n가격: ${item.price.toLocaleString()} 토큰`)) return

        setIsLoading(true)
        try {
            const res = await buyShopItem(item.id)
            if (res.success) {
                alert(res.message)
            } else {
                alert(res.message)
            }
        } catch (e) {
            alert('오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-lg group flex flex-col h-full">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.durationDays}일
                    </div>
                </div>
                
                <h3 className="font-bold text-foreground text-sm line-clamp-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                    {item.description}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-400">
                    <span className="bg-blue-500/10 px-2 py-0.5 rounded-full">
                        +{item.amount} {LABEL_MAP[item.type]}
                    </span>
                </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
                <div className="font-black text-foreground">
                    {item.price.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">Tokens</span>
                </div>
                <button
                    onClick={handlePurchase}
                    disabled={isLoading}
                    className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                    구매하기
                </button>
            </div>
        </div>
    )
}
