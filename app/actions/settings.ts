'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * 시스템 설정 조회 (싱글톤)
 */
export async function getGlobalSettings() {
    try {
        let settings = await prisma.globalSetting.findUnique({
            where: { id: 'SYSTEM' }
        })

        // 없으면 기본값으로 생성
        if (!settings) {
            settings = await prisma.globalSetting.create({
                data: {
                    id: 'SYSTEM',
                    costPerPost: 1,
                    costPerScrap: 1,
                    costPerAIImage: 2
                }
            })
        }

        return { success: true, data: settings }
    } catch (error) {
        console.error('설정 조회 실패:', error)
        return { success: false, error: '설정을 불러오지 못했습니다.' }
    }
}

/**
 * 시스템 설정 업데이트 (관리자 전용)
 */
export async function updateGlobalSettings(data: {
    costPerPost: number
    costPerScrap: number
    costPerAIImage: number
}) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') {
            return { success: false, error: '관리자 권한이 필요합니다.' }
        }

        const settings = await prisma.globalSetting.upsert({
            where: { id: 'SYSTEM' },
            create: {
                id: 'SYSTEM',
                ...data
            },
            update: data
        })

        revalidatePath('/dashboard/admin/settings')
        revalidatePath('/dashboard') // 토큰 관련 UI 갱신 위함
        return { success: true, data: settings }
    } catch (error) {
        console.error('설정 저장 실패:', error)
        return { success: false, error: '설정을 저장하지 못했습니다.' }
    }
}
