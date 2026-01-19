'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { TokenPackage } from '@prisma/client'

export async function getTokenPackagesAdmin() {
    try {
        const packages = await prisma.tokenPackage.findMany({
            orderBy: { price: 'asc' }
        })
        return { success: true, data: packages }
    } catch (error) {
        return { success: false, message: '토큰 상품 목록을 불러오지 못했습니다.' }
    }
}

export async function createTokenPackage(data: {
    name: string
    tokenAmount: number
    price: number
    isActive: boolean
}) {
    try {
        const newPackage = await prisma.tokenPackage.create({
            data
        })
        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true, data: newPackage }
    } catch (error) {
        return { success: false, message: '상품 생성 중 오류가 발생했습니다.' }
    }
}

export async function updateTokenPackage(id: string, data: Partial<TokenPackage>) {
    try {
        const updated = await prisma.tokenPackage.update({
            where: { id },
            data
        })
        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true, data: updated }
    } catch (error) {
        return { success: false, message: '상품 수정 중 오류가 발생했습니다.' }
    }
}

export async function deleteTokenPackage(id: string) {
    try {
        await prisma.tokenPackage.delete({
            where: { id }
        })
        revalidatePath('/dashboard/shop')
        revalidatePath('/dashboard/admin/shop')
        return { success: true }
    } catch (error) {
        return { success: false, message: '상품 삭제 중 오류가 발생했습니다.' }
    }
}
