import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import axios from 'axios'

export async function POST(req: Request) {
    try {
        const user = await getOrCreateUser()
        const { imp_uid, merchant_uid, packageId } = await req.json()

        if (!imp_uid || !merchant_uid || !packageId) {
            return NextResponse.json(
                { success: false, message: 'Missing required parameters' },
                { status: 400 }
            )
        }

        // 1. 포트원 API Access Token 발급
        const getTokenResponse = await axios.post('https://api.iamport.kr/users/getToken', {
            imp_key: process.env.PORTONE_API_KEY,
            imp_secret: process.env.PORTONE_API_SECRET
        })

        const { access_token } = getTokenResponse.data.response

        // 2. 결제 정보 조회
        const paymentDataResponse = await axios.get(`https://api.iamport.kr/payments/${imp_uid}`, {
            headers: { Authorization: access_token }
        })

        const paymentData = paymentDataResponse.data.response

        // 3. DB 상품 정보 조회
        const tokenPackage = await prisma.tokenPackage.findUnique({
            where: { id: packageId }
        })

        if (!tokenPackage) {
            return NextResponse.json(
                { success: false, message: 'Invalid package' },
                { status: 400 }
            )
        }

        // 4. 결제 검증 (금액 일치 여부 & 결제 상태)
        // 포트원 응답 금액(amount)과 우리 DB 상품 가격 비교
        if (paymentData.amount !== tokenPackage.price) {
            return NextResponse.json(
                { success: false, message: 'Payment amount mismatch' },
                { status: 400 }
            )
        }

        // 결제 상태 검증 (중요: 취소된 결제 등 방지)
        if (paymentData.status !== 'paid') {
            return NextResponse.json(
                { success: false, message: `Payment status is ${paymentData.status}, not paid` },
                { status: 400 }
            )
        }

        // 5. 이미 처리된 결제인지 확인 (멱등성)
        const existingPayment = await prisma.payment.findUnique({
            where: { impUid: imp_uid }
        })

        if (existingPayment) {
            return NextResponse.json({ success: true, message: 'Already processed' })
        }

        // 6. 결제 내용 및 토큰 지급 처리 (트랜잭션)
        await prisma.$transaction(async (tx: any) => {
            // 결제 기록 저장
            await tx.payment.create({
                data: {
                    userId: user.id,
                    packageId: tokenPackage.id,
                    impUid: imp_uid,
                    merchantUid: merchant_uid,
                    amount: paymentData.amount,
                    status: 'PAID',
                    paidAt: new Date(paymentData.paid_at * 1000), // Unix timestamp to Date
                }
            })

            // 사용자 토큰 증가
            await tx.user.update({
                where: { id: user.id },
                data: {
                    tokenBalance: { increment: tokenPackage.tokenAmount }
                }
            })

            // 트랜잭션 기록 (토큰 이력)
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: tokenPackage.tokenAmount,
                    type: 'PURCHASE', // enum에 PURCHASE가 있다고 가정
                    description: `토큰 충전: ${tokenPackage.name}`
                }
            })
        })

        return NextResponse.json({ success: true, message: 'Payment verified and tokens granted' })

    } catch (error: any) {
        console.error('Payment verification failed:', error)
        // Axios error handling
        const errorMessage = error.response?.data?.message || error.message || 'Internal Server Error'
        return NextResponse.json(
            { success: false, message: errorMessage },
            { status: 500 }
        )
    }
}
