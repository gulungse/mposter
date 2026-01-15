'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

/**
 * 모든 사용자 목록 조회 (관리자 전용)
 */
export async function getUsers() {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return { success: false, error: '인증이 필요합니다.' }

    // 현재 사용자 권한 확인
    const currentUser = await prisma.user.findUnique({ where: { id: authUser.id } })
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('사용자 목록 조회 실패:', error)
        return { success: false, error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' }
    }
}

/**
 * 사용자 역할(Role) 변경
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return { success: false, error: '인증이 필요합니다.' }

    const currentUser = await prisma.user.findUnique({ where: { id: authUser.id } })
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        })
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('역할 업데이트 실패:', error)
        return { success: false, error: '역할을 변경하는 중 오류가 발생했습니다.' }
    }
}

/**
 * 사용자 토큰 잔액 수정
 */
export async function updateUserTokens(userId: string, amount: number, description: string) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return { success: false, error: '인증이 필요합니다.' }

    const currentUser = await prisma.user.findUnique({ where: { id: authUser.id } })
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
    }

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { tokenBalance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    amount,
                    description,
                    type: amount > 0 ? 'CHARGE' : 'USAGE'
                }
            })
        ])
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('토큰 충전 실패:', error)
        return { success: false, error: '토큰을 조정하는 중 오류가 발생했습니다.' }
    }
}
