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

declare global {
    interface Window {
        PayApp?: any
    }
}

export function TokenChargeCard({ id, name, amount, price, isPopular, buyerEmail, buyerName, buyerTel, userId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCharge = async () => {
        if (!window.PayApp) {
            alert('결제 모듈이 로드되지 않았습니다. 새로고침 후 다시 시도해주세요.')
            return
        }

        if (isLoading) return
        setIsLoading(true)

        const PAYAPP_ID = process.env.NEXT_PUBLIC_PAYAPP_USER_ID
        if (!PAYAPP_ID) {
            alert('상점 아이디(M-Poster)가 설정되지 않았습니다.\n관리자에게 문의해주세요.')
            setIsLoading(false)
            return
        }

        const merchant_uid = `mid_${new Date().getTime()}`
        const origin = window.location.origin

        window.PayApp.payrequest({
            userid: PAYAPP_ID,
            shopname: 'M-Poster',
            goodname: name,
            price: price,
            mul_no: merchant_uid,
            buyerid: buyerEmail, // 구매자 식별자(이메일 사용)
            buyername: buyerName,
            buyertel: buyerTel,
            // 웹훅 및 리다이렉트 설정
            returnurl: `${origin}/dashboard/shop`,
            feedbackurl: `${origin}/api/payments/feedback`,
            var1: userId,    // 사용자 ID
            var2: id,        // 패키지 ID
            smsuse: 'n',     // 결제요청 SMS 발송 안함
            reqaddr: '0',    // 주소 요청 안함
            checkretry: 'y', // Feedback 재시도 설정
        }, function (ret: any) {
            // 콜백 함수 (결제창 닫힘 등)
            // PayApp Lite는 보통 리턴 URL로 이동하거나, 여기서 성공/실패 확인 가능
            if (ret.state === 'SA' || ret.state === 'OK') {
                // 결제 성공 (또는 승인 대기)
                // 실제 토큰 지급은 Feedback URL(webhook)을 통해 처리됩니다.
                alert('결제가 완료되었습니다. 토큰이 지급될 때까지 잠시만 기다려주세요.')
                router.refresh()
            } else {
                // 사용자가 취소했거나 오류 발생
                if (ret.message) alert(ret.message)
            }
            setIsLoading(false)
        })
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
