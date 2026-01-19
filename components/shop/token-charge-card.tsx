'use client'

import { Coins, Loader2 } from 'lucide-react'
import { useState } from 'react'
import axios from 'axios'
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
}

export function TokenChargeCard({ id, name, amount, price, isPopular, buyerEmail, buyerName, buyerTel }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleCharge = async () => {
        if (!window.IMP) {
            // 결제 모듈이 로드되지 않았을 경우
            alert('결제 모듈(PortOne)이 로드되지 않았습니다.\n새로고침 하거나 관리자에게 문의해주세요.')
            console.error('Window.IMP is missing')
            return
        }

        if (isLoading) return
        setIsLoading(true)

        // PortOne Init
        const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
        if (!STORE_ID) {
            alert('상점 아이디(Store ID)가 설정되지 않았습니다.\n환경변수 NEXT_PUBLIC_PORTONE_STORE_ID를 확인해주세요.')
            console.error('Store ID is missing')
            setIsLoading(false)
            return
        }
        window.IMP.init(STORE_ID)

        const merchant_uid = `mid_${new Date().getTime()}`

        const data = {
            pg: process.env.NEXT_PUBLIC_PORTONE_PG || 'tosspayments', // PG사 설정 (기본값: 토스페이먼츠)
            pay_method: 'card',
            merchant_uid: merchant_uid,
            name: `토큰 충전: ${name}`,
            amount: price,
            buyer_email: buyerEmail || 'test@mposter.ai',
            buyer_name: buyerName || '테스트유저',
            buyer_tel: buyerTel || '010-1234-5678',
        }

        window.IMP.request_pay(data, async (rsp: any) => {
            // 성공 여부가 없더라도 imp_uid가 있으면 서버에서 검증 시도 (일부 PG사 호환성)
            if (rsp.success || rsp.imp_uid) {
                // ... verify logic ...
                try {
                    const verifyRes = await axios.post('/api/payments/verify', {
                        imp_uid: rsp.imp_uid,
                        merchant_uid: rsp.merchant_uid,
                        packageId: id
                    })

                    if (verifyRes.data.success) {
                        alert('결제가 성공적으로 완료되었습니다! 토큰이 지급되었습니다.')
                        router.refresh()
                    } else {
                        alert(`결제 검증 실패: ${verifyRes.data.message}`)
                    }
                } catch (error: any) {
                    console.error('Verify Error:', error)
                    alert(`결제 검증 중 오류 발생: ${error.response?.data?.message || 'Unknown Error'}`)
                }
            } else {
                const errorMsg = rsp.error_msg || rsp.msg || '결제가 취소되었습니다.'
                alert(`결제 실패: ${errorMsg}`)
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
