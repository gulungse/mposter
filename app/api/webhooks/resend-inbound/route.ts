import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

/**
 * Resend Inbound Webhook Handler
 * Littly 결제 완료 이메일을 파싱하여 사용자 토큰을 자동 충전합니다.
 */
export async function POST(req: Request) {
    try {
        const payload = await req.json()
        const RESEND_API_KEY = process.env.RESEND_API_KEY
        
        console.log('[Resend Inbound] Webhook received. Event type:', payload.type)
        
        if (payload.type !== 'email.received') {
            return NextResponse.json({ message: 'Not an email event' }, { status: 200 })
        }

        const data = payload.data
        const emailId = data.email_id

        if (!emailId) {
            console.error('[Resend Inbound] No email_id found in payload')
            return NextResponse.json({ error: 'No email_id' }, { status: 400 })
        }

        // 1. Resend API를 통해 이메일 본문 가져오기
        console.log(`[Resend Inbound] Fetching email content for ID: ${emailId}`)
        
        let response;
        try {
            response = await axios.get(`https://api.resend.com/emails/${emailId}`, {
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                }
            })
        } catch (axiosError: any) {
            console.error('[Resend Inbound] Resend API Error:', axiosError.response?.data || axiosError.message)
            return NextResponse.json({ 
                error: 'Resend API fetch failed', 
                details: axiosError.response?.data || axiosError.message,
                emailId 
            }, { status: 500 })
        }

        const emailData = response.data
        const text = emailData.text
        const html = emailData.html
        
        // text가 없으면 html이라도 시도
        const emailContent = text || html?.replace(/<[^>]*>?/gm, '') || ''

        if (!emailContent) {
            console.error('[Resend Inbound] No content found via API')
            return NextResponse.json({ error: 'Email content empty' }, { status: 400 })
        }

        console.log('[Resend Inbound] Content fetched successfully')

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
