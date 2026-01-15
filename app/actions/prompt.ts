'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOrCreateUser } from '@/lib/auth'
import { checkLimit } from './plan'

/**
 * 프롬프트 생성 (사용사용)
 */
export async function createPrompt(formData: {
    title: string;
    content: string;
}) {
    try {
        const user = await getOrCreateUser()

        // 요금제 한도 체크
        const limitRes = await checkLimit('prompt')
        if (!limitRes.success) {
            return { success: false, error: limitRes.error }
        }

        const prompt = await prisma.prompt.create({
            data: {
                userId: user.id,
                title: formData.title,
                content: formData.content,
                type: 'USER'
            }
        })

        revalidatePath('/dashboard/prompts')
        return { success: true, data: prompt }
    } catch (error) {
        console.error('프롬프트 생성 실패:', error)
        return { success: false, error: '프롬프트를 저장하는 중 오류가 발생했습니다.' }
    }
}

/**
 * 프롬프트 목록 조회
 */
export async function getPrompts() {
    try {
        const user = await getOrCreateUser()

        const prompts = await prisma.prompt.findMany({
            where: {
                OR: [
                    { userId: user.id },
                    { type: 'SYSTEM' } // 시스템 프롬프트도 함께 조회
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { success: true, data: prompts }
    } catch (error) {
        console.error('프롬프트 조회 실패:', error)
        return { success: false, error: '프롬프트 목록을 가져오는 중 오류가 발생했습니다.' }
    }
}

/**
 * 단일 프롬프트 조회 (수정용)
 */
export async function getPrompt(id: string) {
    try {
        const user = await getOrCreateUser()

        const prompt = await prisma.prompt.findUnique({
            where: { id }
        })

        if (!prompt) {
            return { success: false, error: '프롬프트를 찾을 수 없습니다.' }
        }

        // 권한 체크
        if (prompt.userId !== user.id && user.role !== 'ADMIN') {
            return { success: false, error: '접근 권한이 없습니다.' }
        }

        return { success: true, data: prompt }
    } catch (error) {
        console.error('프롬프트 상세 조회 실패:', error)
        return { success: false, error: '프롬프트 정보를 가져오는 중 오류가 발생했습니다.' }
    }
}

/**
 * 모든 시스템 프롬프트 조회 (어드민용)
 */
export async function getSystemPromptsAdmin() {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const prompts = await prisma.prompt.findMany({
            where: { type: 'SYSTEM' },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: prompts }
    } catch (error) {
        return { success: false, error: '시스템 프롬프트를 가져오지 못했습니다.' }
    }
}

/**
 * 시스템 프롬프트 생성 (어드민용)
 */
export async function createSystemPrompt(data: { title: string, content: string }) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const prompt = await prisma.prompt.create({
            data: {
                userId: user.id,
                title: data.title,
                content: data.content,
                type: 'SYSTEM'
            }
        })

        revalidatePath('/dashboard/admin/prompts')
        revalidatePath('/dashboard/prompts')
        return { success: true, data: prompt }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 프롬프트 업데이트 (사용자/어드민 공용)
 */
export async function updatePrompt(id: string, data: { title?: string, content?: string }) {
    try {
        const user = await getOrCreateUser()

        // 해당 프롬프트 찾기
        const prompt = await prisma.prompt.findUnique({ where: { id } })
        if (!prompt) throw new Error('Prompt not found')

        // 권한 체크: 본인 것이거나 ADMIN인 경우
        if (prompt.userId !== user.id && user.role !== 'ADMIN') {
            throw new Error('Unauthorized')
        }

        const updated = await prisma.prompt.update({
            where: { id },
            data
        })

        revalidatePath('/dashboard/prompts')
        revalidatePath('/dashboard/admin/prompts')
        return { success: true, data: updated }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 프롬프트 삭제
 */
export async function deletePrompt(id: string) {
    try {
        const user = await getOrCreateUser()
        const prompt = await prisma.prompt.findUnique({ where: { id } })
        if (!prompt) throw new Error('Prompt not found')

        if (prompt.userId !== user.id && user.role !== 'ADMIN') {
            throw new Error('Unauthorized')
        }

        await prisma.prompt.delete({ where: { id } })

        revalidatePath('/dashboard/prompts')
        revalidatePath('/dashboard/admin/prompts')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 시스템 기본 프롬프트 3종 시딩
 */
export async function seedDefaultSystemPrompts() {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const systemCount = await prisma.prompt.count({ where: { type: 'SYSTEM' } })
        if (systemCount > 0) return { success: true, message: '이미 시스템 프롬프트가 존재합니다.' }

        const defaults = [
            { title: 'SEO 텍스트 고도화', content: '당신은 전문 카피라이터입니다. 제공된 내용을 검색 엔진 최적화(SEO)에 맞게 다듬고, 독자들의 클릭을 유도하는 매력적인 문체로 재구성하세요.' },
            { title: '블로그 포스팅 전문화', content: '주어진 주제에 대해 논리적이고 정보가 풍부한 블로그 포스트를 작성하세요. 서론, 본론(소제목 포함), 결론의 명확한 구조를 갖추어야 합니다.' },
            { title: '뉴스 요약 및 재구성', content: '뉴스 기사 원문을 분석하여 핵심 내용을 요약하고, 저작권 이슈를 피하기 위해 문장을 완전히 새로운 구성으로 패러프레이징하세요.' }
        ]

        for (const p of defaults) {
            await prisma.prompt.create({
                data: {
                    userId: user.id,
                    title: p.title,
                    content: p.content,
                    type: 'SYSTEM'
                }
            })
        }

        revalidatePath('/dashboard/prompts')
        return { success: true, message: '기본 시스템 프롬프트 3종이 생성되었습니다.' }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
