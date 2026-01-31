'use client'

import { Coins, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    id: string
    name: string
    amount: number
    price: number
    isPopular?: boolean
    buyerEmail?: string
    buyerName?: string
    buyerTel?: string
    userId: string
}


export function TokenChargeCard({ id, name, amount, price, isPopular, buyerEmail, buyerName, buyerTel, userId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCharge = async () => {
        const LITTLY_URL = process.env.NEXT_PUBLIC_LITTLY_URL || 'https://litt.ly/mposter'
        
        if (isLoading) return
        setIsLoading(true)

        try {
            // 리틀리 상점으로 이동
            window.open(LITTLY_URL, '_blank')
            
            // 안내 메시지
            alert('리틀리 상점 페이지로 이동합니다.\n결제 완료 후 자동으로 토큰이 충전됩니다.')
        } catch (error) {
            console.error('Redirect error:', error)
            alert('페이지 이동 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
            router.refresh()
        }
    }

    return (
        <div
            onClick={!isLoading ? handleCharge : undefined}
            className={`
                relative bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group flex flex-col items-center text-center gap-2
                ${isPopular ? 'border-primary/50 shadow-primary/5' : 'border-border hover:border-primary/50'}
            `}
        >
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                </div>
            )}

            <div className={`
                h-10 w-10 rounded-full flex items-center justify-center mb-1 transition-colors
                ${isPopular ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
            `}>
                <Coins className="h-5 w-5" />
            </div>

            <div className="space-y-0.5">
                <h3 className="font-black text-lg text-foreground">{amount.toLocaleString()}</h3>
                <p className="text-xs font-medium text-muted-foreground">TOKENS</p>
            </div>

            <div className="mt-2 w-full pt-3 border-t border-border/50">
                <p className="text-sm font-bold text-foreground">₩ {price.toLocaleString()}</p>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-card/80 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            )}
        </div>
    )
}
