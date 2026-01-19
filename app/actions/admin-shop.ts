'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ShopItem } from '@prisma/client'

// 관리자 권한 확인 헬퍼
async function ensureAdmin() {
    const user = await getOrCreateUser()
    if (user.role !== 'ADMIN') {
        throw new Error('접근 권한이 없습니다 (관리자 전용).')
    }
    return user
}

export async function createShopItem(data: {
    name: string
    description?: string
    type: 'SITE_SLOT' | 'KEYWORD_SLOT' | 'PROMPT_SLOT' | 'TASK_SLOT'
    price: number
    amount: number
    durationDays: number
    isActive: boolean
}) {
    try {
        await ensureAdmin()

        const item = await prisma.shopItem.create({
            data: {
                name: data.name,
                description: data.description,
                type: data.type,
                price: data.price,
                amount: data.amount,
                durationDays: data.durationDays,
                isActive: data.isActive
            }
        })

        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true, message: '상품이 생성되었습니다.', data: item }
    } catch (error: any) {
        return { success: false, message: error.message || '상품 생성 실패' }
    }
}

export async function updateShopItem(id: string, data: {
    name?: string
    description?: string
    price?: number
    amount?: number
    durationDays?: number
    isActive?: boolean
}) {
    try {
        await ensureAdmin()

        await prisma.shopItem.update({
            where: { id },
            data
        })

        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true, message: '상품 정보가 수정되었습니다.' }
    } catch (error: any) {
        return { success: false, message: error.message || '상품 수정 실패' }
    }
}

export async function deleteShopItem(id: string) {
    try {
        await ensureAdmin()

        await prisma.shopItem.delete({
            where: { id }
        })

        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true, message: '상품이 삭제되었습니다.' }
    } catch (error: any) {
        return { success: false, message: error.message || '상품 삭제 실패' }
    }
}

export async function getShopItemsAdmin() {
    try {
        await ensureAdmin()

        const items = await prisma.shopItem.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: items }
    } catch (error: any) {
        return { success: false, message: '상품 목록 조회 실패' }
    }
}
