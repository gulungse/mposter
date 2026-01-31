import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Resend Inbound Webhook Handler
 * Littly 결제 완료 이메일을 파싱하여 사용자 토큰을 자동 충전합니다.
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json()
        
        // Resend Inbound Payload 구조분해
        // data 필드 내부에 실제 이메일 정보가 들어있습니다.
        if (payload.type !== 'email.received') {
            return NextResponse.json({ message: 'Not an email event' }, { status: 200 })
        }

        const { text, html, subject, from } = payload.data

        console.log('[Resend Inbound] Received email keys:', Object.keys(payload.data))
        console.log('[Resend Inbound] Details:', { 
            subject, 
            from, 
            hasText: !!text, 
            hasHtml: !!html 
        })

        // text가 없으면 html이라도 시도 (HTML에서 태그 제거는 간단히 처리)
        const emailContent = text || html?.replace(/<[^>]*>?/gm, '') || ''

        if (!emailContent) {
            console.error('[Resend Inbound] No content found in email')
            return NextResponse.json({ error: 'No content found' }, { status: 400 })
        }

        // 1. 이메일 파싱 (Littly 포맷)
        // * 주문자 : 이름 / 전화번호 / gulungse@gmail.com
        // * 구매상품 : 토큰 100(1개) 100원
        
        // 이메일 추출 정규식
        const emailMatch = emailContent.match(/\/\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
        const customerEmail = emailMatch ? emailMatch[1].trim() : null

        // 상품명에서 토큰 수량 추출 정규식 (예: 토큰 100)
        const productMatch = emailContent.match(/구매상품\s*:\s*토큰\s*(\d+)/)
        const tokenAmount = productMatch ? parseInt(productMatch[1], 10) : null

        console.log('[Resend Inbound] Parsed Data:', { customerEmail, tokenAmount })

        if (!customerEmail || !tokenAmount) {
            console.error('[Resend Inbound] Failed to parse email or token amount')
            return NextResponse.json({ message: 'Parsing failed, but acknowledged' }, { status: 200 })
        }

        // 2. 사용자 조회
        const user = await prisma.user.findUnique({
            where: { email: customerEmail }
        })

        if (!user) {
            console.error(`[Resend Inbound] User not found: ${customerEmail}`)
            return NextResponse.json({ message: 'User not found' }, { status: 200 })
        }

        // 3. 중복 처리 방지 (주문번호 활용)
        const orderNoMatch = emailContent.match(/주문번호\s*:\s*(\d+)/)
        const orderNo = orderNoMatch ? orderNoMatch[1] : `LIT_${Date.now()}`

        const existingPayment = await prisma.payment.findUnique({
            where: { merchantUid: orderNo }
        })

        if (existingPayment) {
            console.log(`[Resend Inbound] Order ${orderNo} already processed.`)
            return NextResponse.json({ message: 'Already processed' }, { status: 200 })
        }

        // 4. DB 트랜잭션 처리 (토큰 충전)
        await prisma.$transaction([
            prisma.payment.create({
                data: {
                    userId: user.id,
                    impUid: `LIT_${orderNo}`,
                    merchantUid: orderNo,
                    amount: 0,
                    status: 'PAID',
                    paidAt: new Date(),
                }
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    tokenBalance: { increment: tokenAmount }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: tokenAmount,
                    type: 'CHARGE',
                    description: `토큰 충전 (Littly): ${tokenAmount} 토큰`
                }
            })
        ])

        console.log(`[Resend Inbound] Successfully charged ${tokenAmount} tokens to ${customerEmail}`)
        return NextResponse.json({ success: true, customerEmail, tokenAmount })

    } catch (error: any) {
        console.error('[Resend Inbound] Webhook error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
