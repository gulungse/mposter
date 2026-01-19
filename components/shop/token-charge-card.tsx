'use client'

import { Coins, Loader2 } from 'lucide-react'
import { buyToken } from '@/app/actions/shop'
import { useState } from 'react'

interface Props {
    amount: number
    price: number
    isPopular?: boolean
}

export function TokenChargeCard({ amount, price, isPopular }: Props) {
    const [isLoading, setIsLoading] = useState(false)

    const handleCharge = async () => {
        if (!confirm(`${amount.toLocaleString()} 토큰을 충전하시겠습니까? (시뮬레이션)`)) return

        setIsLoading(true)
        try {
            const res = await buyToken(amount)
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
