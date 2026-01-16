'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import OpenAI from 'openai'
import axios from 'axios'

/**
 * 사용자 API 설정 조회
 */
export async function getUserSettings() {
    try {
        const user = await getOrCreateUser()
        return {
            success: true,
            data: (user as any).settings || {}
        }
    } catch (error) {
        return { success: false, error: '설정을 불러올 수 없습니다.' }
    }
}

/**
 * 사용자 API 설정 업데이트
 */
export async function updateUserSettings(data: any) {
    try {
        const user = await getOrCreateUser()

        // 기존 설정과 병합
        const currentSettings = (user as any).settings || {}
        const newSettings = { ...currentSettings, ...data }

        await prisma.user.update({
            where: { id: user.id },
            data: { settings: newSettings } as any
        })

        revalidatePath('/dashboard/api')
        return { success: true }
    } catch (error) {
        return { success: false, error: '설정 저장에 실패했습니다.' }
    }
}

/**
 * OpenAI API 키 검증
 */
export async function validateOpenAI(apiKey: string) {
    try {
        const openai = new OpenAI({ apiKey })
        await openai.models.list()
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || '유효하지 않은 API 키입니다.' }
    }
}

/**
 * Gemini API 키 검증
 */
export async function validateGemini(apiKey: string) {
    try {
        // v1beta 모델 목록 조회로 검증
        await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: '유효하지 않은 API 키입니다.' }
    }
}

/**
 * PiAPI (Flux) 키 검증
 */
export async function validatePiApi(apiKey: string) {
    // PiAPI는 명확한 검증 엔드포인트가 문서화되어 있지 않으므로 
    // 간단히 키가 비어있는지만 체크하거나, 
    // 실제로는 태스크 생성 시도 등을 해야 하지만 여기선 형식만 체크
    if (!apiKey || apiKey.length < 10) {
        return { success: false, error: '유효하지 않은 키 형식입니다.' }
    }
    return { success: true }
}
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 회원 탈퇴 처리
 * - 사용자 데이터(User)는 물리적으로 삭제 (Cascade로 관련 데이터 일괄 삭제)
 * - 탈퇴 이력(WithdrawnUser)에 이메일, 탈퇴일, 재가입가능일(1년 후) 기록
 * - Supabase Auth에서도 사용자 삭제 시도 (선택 사항, 보통은 로그아웃만 시킴)
 */
export async function withdrawUser() {
    try {
        const user = await getOrCreateUser() // 현재 로그인 유저 확인
        const email = user.email

        // 1. 재가입 제한 날짜 계산 (1년 후)
        const now = new Date()
        const availableAt = new Date(now)
        availableAt.setFullYear(availableAt.getFullYear() + 1)

        // 2. 트랜잭션으로 처리
        await prisma.$transaction(async (tx) => {
            // 이미 탈퇴 이력이 있는지 확인 (중복 방지, 사실 Unique라 에러나겠지만)
            const exists = await tx.withdrawnUser.findUnique({ where: { email } })
            if (!exists) {
                // 탈퇴 이력 기록
                await tx.withdrawnUser.create({
                    data: {
                        email,
                        withdrawnAt: now,
                        availableAt: availableAt
                    }
                })
            }

            // 사용자 데이터 삭제 (Cascade 설정되어 있으면 관련 데이터도 삭제됨)
            // 주의: prisma schema에서 relation onDelete: Cascade가 설정되어 있어야 함.
            await tx.user.delete({
                where: { id: user.id }
            })
        })

        // 3. Supabase 세션 로그아웃 처리
        const supabase = await createClient()
        await supabase.auth.signOut()

        return { success: true }

    } catch (error: any) {
        console.error('Failed to withdraw user:', error)
        return { success: false, error: '회원 탈퇴 처리에 실패했습니다. 관리자에게 문의해주세요.' }
    }
}

/**
 * 사용자 프로필 정보 조회
 */
export async function getUserProfile() {
    try {
        const user = await getOrCreateUser()
        return {
            success: true,
            data: {
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role
            }
        }
    } catch (error) {
        return { success: false, error: '프로필을 불러올 수 없습니다.' }
    }
}
