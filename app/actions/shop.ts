'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOrCreateUser } from '@/lib/auth'

export async function buyToken(amount: number) {
    try {
        const user = await getOrCreateUser() // 세션 사용자 확인

        // 실제 결제 연동(PG사)이 있다면 여기서 검증 로직 통과 후 진행
        // 현재는 "충전" 버튼 누르면 즉시 충전되는 시뮬레이션

        await prisma.$transaction(async (tx) => {
            // 1. 사용자 토큰 증가
            await tx.user.update({
                where: { id: user.id },
                data: { tokenBalance: { increment: amount } }
            })

            // 2. 트랜잭션 기록
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: amount,
                    type: 'CHARGE',
                    description: `토큰 충전 (${amount.toLocaleString()}개)`
                }
            })
        })

        revalidatePath('/dashboard')
        return { success: true, message: `${amount.toLocaleString()} 토큰이 충전되었습니다.` }
    } catch (error) {
        console.error('buyToken Error:', error)
        return { success: false, message: '토큰 충전 중 오류가 발생했습니다.' }
    }
}

export async function buyShopItem(itemId: string) {
    try {
        const user = await getOrCreateUser()

        const item = await prisma.shopItem.findUnique({
            where: { id: itemId }
        })

        if (!item) {
            return { success: false, message: '존재하지 않는 상품입니다.' }
        }

        // 잔액 확인
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { tokenBalance: true }
        })

        if (!dbUser || dbUser.tokenBalance < item.price) {
            return { success: false, message: '토큰 잔액이 부족합니다.' }
        }

        await prisma.$transaction(async (tx) => {
            // 1. 토큰 차감
            await tx.user.update({
                where: { id: user.id },
                data: { tokenBalance: { decrement: item.price } }
            })

            // 2. 사용 기록 (Transaction)
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    amount: -item.price,
                    type: 'PURCHASE', // USAGE 대신 PURCHASE 사용 (상품 구매)
                    description: `상점 구매: ${item.name}`
                }
            })

            // 3. UserPurchase 생성 (슬롯 적용)
            const startDate = new Date()
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + item.durationDays)

            await tx.userPurchase.create({
                data: {
                    userId: user.id,
                    itemId: item.id,
                    type: item.type,
                    slotAmount: item.amount,
                    price: item.price,
                    startDate: startDate,
                    endDate: endDate
                }
            })
        })

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/shop')
        return { success: true, message: '구매가 완료되었습니다. 슬롯이 확장되었습니다.' }

    } catch (error) {
        console.error('buyShopItem Error:', error)
        return { success: false, message: '구매 처리 중 오류가 발생했습니다.' }
    }
}
