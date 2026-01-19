"use client"

import Link from 'next/link'
import { Coins as CoinsIcon, ArrowRight as ArrowRightIcon } from 'lucide-react'

export function BuyTokensButton() {
    return (
        <Link
            href="/dashboard/shop"
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity relative z-10"
        >
            토큰 추가 구매 <ArrowRightIcon className="h-3 w-3" />
        </Link>
    )
}
