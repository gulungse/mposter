'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 특정 회원으로 접속 (Impersonate)
 */
export async function impersonateUser(userId: string) {
    try {
        // 보안 검증: 현재 '실제' 접속자가 ADMIN인지 확인
        // 주의: getOrCreateUser() 자체가 임퍼스네이션된 유저를 반환하므로,
        // 여기서는 임퍼스네이션을 우회하여 실제 유저를 확인해야 함.

        // 가장 안전한 방법: Supabase Auth ID로 직접 DB 조회하여 권한 확인
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return { success: false, message: '로그인이 필요합니다.' }
        }

        const realUser = await prisma.user.findUnique({
            where: { id: authUser.id }
        })

        if (!realUser || realUser.role !== 'ADMIN') {
            return { success: false, message: '관리자 권한이 없습니다.' }
        }

        // 권한 확인 완료 -> 쿠키 설정
        const cookieStore = await cookies()
        cookieStore.set('x-impersonate-user-id', userId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Impersonation failed:', error)
        return { success: false, message: '접속 실패' }
    }
}

/**
 * 접속 종료 (원래 계정으로 복귀)
 */
export async function stopImpersonating() {
    const cookieStore = await cookies()
    cookieStore.delete('x-impersonate-user-id')
    revalidatePath('/')
    return { success: true }
}

/**
 * 현재 접속 상태 확인 (배너 표시용)
 */
export async function getImpersonationStatus() {
    const cookieStore = await cookies()
    const impersonatedId = cookieStore.get('x-impersonate-user-id')?.value

    if (!impersonatedId) return { isImpersonating: false }

    try {
        const targetUser = await prisma.user.findUnique({
            where: { id: impersonatedId },
            select: { name: true, email: true }
        })

        if (!targetUser) return { isImpersonating: false }

        return {
            isImpersonating: true,
            targetUser
        }
    } catch (error) {
        return { isImpersonating: false }
    }
}

/**
 * 전체 사용자 목록 조회 (관리자 전용)
 */
export async function getUsers() {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') {
            return { success: false, error: '권한이 없습니다.' }
        }

        // Raw SQL to bypass stale Prisma client/EPERM issues
        const users = await prisma.$queryRawUnsafe(`SELECT * FROM "users" ORDER BY "createdAt" DESC`) as any[]
        return { success: true, data: users }
    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
        return { success: false, error: '사용자 목록을 불러올 수 없습니다.' }
    }
}

/**
 * 사용자 토큰 수동 조정 (관리자 전용)
 */
export async function updateUserTokens(userId: string, amount: number, description: string) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') {
            return { success: false, error: '권한이 없습니다.' }
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { tokenBalance: { increment: amount } }
            })

            await tx.transaction.create({
                data: {
                    userId,
                    amount,
                    type: amount >= 0 ? 'BONUS' : 'USAGE', // Positive = BONUS, Negative = USAGE
                    description
                }
            })
        })

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
        console.error('Token update failed:', error)
        return { success: false, error: '토큰 조정에 실패했습니다.' }
    }
}

/**
 * 사용자 이미지 생성 권한 설정 (관리자 전용)
 */
export async function updateUserImageRights(userId: string, hasRights: boolean) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') {
            return { success: false, error: '권한이 없습니다.' }
        }

        // Raw SQL update to bypass Prisma Client stale state / EPERM issues
        await prisma.$executeRawUnsafe(
            `UPDATE "users" SET "hasImageGenRights" = $1 WHERE "id" = $2`,
            hasRights,
            userId
        )

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Failed to update image rights:', error)
        return { success: false, error: '이미지 권한 업데이트에 실패했습니다.' }
    }
}
/**
 * 사용자 다중 권한 일괄 설정 (관리자 전용)
 */
export async function updateUserPermissions(userId: string, permissions: { 
    hasManualPostRights?: boolean, 
    hasYoutubeRights?: boolean, 
    hasTistoryRewriteRights?: boolean, 
    hasImageGenRights?: boolean 
}) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') {
            return { success: false, error: '권한이 없습니다.' }
        }

        const allowedKeys = ['hasManualPostRights', 'hasYoutubeRights', 'hasTistoryRewriteRights', 'hasImageGenRights']
        const updates: string[] = []
        const values: any[] = []

        Object.entries(permissions).forEach(([key, value], index) => {
            if (allowedKeys.includes(key)) {
                updates.push(`"${key}" = $${index + 1}`)
                values.push(value)
            }
        })

        if (updates.length === 0) return { success: true }

        values.push(userId)
        await prisma.$executeRawUnsafe(
            `UPDATE "users" SET ${updates.join(', ')} WHERE "id" = $${values.length}`,
            ...values
        )

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Failed to update permissions:', error)
        return { success: false, error: '권한 업데이트에 실패했습니다.' }
    }
}
