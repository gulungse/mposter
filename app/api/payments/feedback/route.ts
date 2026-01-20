import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        // PayApp sends data as application/x-www-form-urlencoded
        const formData = await req.formData()
        const data = Object.fromEntries(formData.entries())

        // 1. 기본 검증 (linkval)
        const PAYAPP_LINK_VALUE = process.env.PAYAPP_LINK_VALUE
        console.log('[PayApp Feedback] Received:', {
            pay_state: data.pay_state,
            pay_no: data.pay_no,
            price: data.price,
            linkval_received: data.linkval,
            linkval_expected: PAYAPP_LINK_VALUE ? 'SET' : 'NOT_SET'
        })

        if (!PAYAPP_LINK_VALUE) {
            console.error('[PayApp Feedback] Error: PAYAPP_LINK_VALUE is not set in env')
            return new Response('System Error', { status: 500 })
        }

        if (data.linkval !== PAYAPP_LINK_VALUE) {
            console.error(`[PayApp Feedback] Linkval mismatch. Received: ${data.linkval}, Expected: ${PAYAPP_LINK_VALUE}`)
            return new Response('Invalid linkval', { status: 400 })
        }

        // 2. 결제 상태 확인
        // pay_state: 1(요청), 4(결제완료), 8-, 9-, 64-(취소/실패)
        // 여기서는 완료(4)만 처리
        if (data.pay_state !== '4') {
            // 결제 완료가 아니면 무시 (혹은 취소 처리가 필요하면 추가 구현)
            return new Response('SUCCESS', { status: 200 }) // PayApp에게는 성공으로 응답하여 재전송 방지
        }

        const userId = data.var1 as string
        const packageId = data.var2 as string
        const payNo = data.pay_no as string // PayApp 거래번호
        const mulNo = data.mul_no as string // 주문번호
        const price = parseInt(data.price as string, 10)

        if (!userId || !packageId || !payNo || !mulNo) {
            console.error('Missing required fields')
            return new Response('Missing fields', { status: 400 })
        }

        // 3. 중복 처리 확인 (멱등성)
        const existingPayment = await prisma.payment.findUnique({
            where: { merchantUid: mulNo }
        })

        if (existingPayment) {
            // 이미 처리된 건이면 성공 응답
            return new Response('SUCCESS', { status: 200 })
        }

        // 4. 상품 정보 및 가격 검증
        const tokenPackage = await prisma.tokenPackage.findUnique({
            where: { id: packageId }
        })

        if (!tokenPackage) {
            console.error('Invalid packageId:', packageId)
            return new Response('Invalid package', { status: 400 })
        }

        if (tokenPackage.price !== price) {
            console.error('Price mismatch:', price, tokenPackage.price)
            // 금액 불일치는 심각한 오류 혹은 조작 시도
            return new Response('Price mismatch', { status: 400 })
        }

        // 5. 결제 기록 및 토큰 지급 (트랜잭션)
        await prisma.$transaction(async (tx: any) => {
            // 결제 기록 생성
            // Note: impUid 필드를 pay_no로 사용
            await tx.payment.create({
                data: {
                    userId: userId,
                    packageId: packageId,
                    impUid: payNo,      // PayApp pay_no
                    merchantUid: mulNo, // PayApp mul_no
                    amount: price,
                    status: 'PAID',
                    paidAt: new Date(),
                }
            })

            // 사용자 토큰 증가
            await tx.user.update({
                where: { id: userId },
                data: {
                    tokenBalance: { increment: tokenPackage.tokenAmount }
                }
            })

            // 토큰 트랜잭션 기록
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: tokenPackage.tokenAmount,
                    type: 'PURCHASE',
                    description: `토큰 충전 (PayApp): ${tokenPackage.name}`
                }
            })
        })

        // PayApp은 'SUCCESS' 문자열을 반환해야 정상 처리로 간주
        return new Response('SUCCESS', { status: 200 })

    } catch (error: any) {
        console.error('Payment feedback error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
