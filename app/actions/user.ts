'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

/**
 * 사용자의 설정(API 키 등)을 업데이트합니다.
 */
export async function updateUserSettings(data: {
    openaiApiKey?: string,
    geminiApiKey?: string,
    piApiKey?: string
}) {
    try {
        const user = await getOrCreateUser() as any

        const currentSettings = (user.settings as any) || {}
        const newSettings = {
            ...currentSettings,
            ...data
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { settings: newSettings } as any
        })

        revalidatePath('/dashboard/api')
        return { success: true, message: '설정이 저장되었습니다.' }
    } catch (error) {
        console.error('설정 저장 실패:', error)
        return { success: false, error: '설정을 저장하는 중 오류가 발생했습니다.' }
    }
}

/**
 * 사용자의 현재 프로젝트 설정을 조회합니다.
 */
export async function getUserSettings() {
    try {
        const user = await getOrCreateUser() as any
        return { success: true, data: user.settings as any }
    } catch (error) {
        return { success: false, error: '설정을 가져오지 못했습니다.' }
    }
}

/**
 * 사용자의 기본 정보를 조회합니다. (역할 포함)
 */
export async function getUserProfile() {
    try {
        const user = await getOrCreateUser()
        return {
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                tokenBalance: user.tokenBalance
            }
        }
    } catch (error) {
        return { success: false, error: '프로필을 가져오지 못했습니다.' }
    }
}

/**
 * OpenAI API 키 유효성 검사
 */
export async function validateOpenAI(key: string) {
    const trimmedKey = key?.trim()
    if (!trimmedKey) return { success: false, message: '키를 입력해주세요.' }
    try {
        const openai = new OpenAI({ apiKey: trimmedKey })
        await openai.models.list()
        return { success: true, message: '유효한 OpenAI API 키입니다.' }
    } catch (error: any) {
        return { success: false, message: `검사 실패: ${error.message}` }
    }
}

/**
 * Gemini API 키 유효성 검사 (Raw Fetch 진단 방식)
 */
export async function validateGemini(key: string) {
    const trimmedKey = key?.trim()
    if (!trimmedKey) return { success: false, message: '키를 입력해주세요.' }

    try {
        // 1. 가장 먼저 모델 목록 조회를 통해 키가 유효한지 확인
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`
        const listRes = await axios.get(listUrl, {
            validateStatus: (status) => status < 500
        })

        if (listRes.status === 200) {
            const models = listRes.data.models || []
            const hasFlash = models.some((m: any) => m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-pro'))
            if (hasFlash) {
                return { success: true, message: '유효한 키입니다. (Gemini 1.5 사용 가능 확인됨)' }
            }
            const modelNames = models.map((m: any) => m.name.split('/').pop()).slice(0, 5)
            return { success: true, message: `키는 유효하지만 모델 접근 권한이 다릅니다. 사용 가능: ${modelNames.join(', ')}` }
        }

        if (listRes.status === 403 || listRes.status === 400) {
            return { success: false, message: `검사 실패: 키가 잘못되었거나 승인되지 않았습니다. (상태: ${listRes.status})` }
        }

        // 2. 모델 직접 요청 확인 (v1)
        const checkUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash?key=${trimmedKey}`
        const checkRes = await axios.get(checkUrl, {
            validateStatus: (status) => status < 500
        })
        if (checkRes.status === 200) return { success: true, message: '유효한 Gemini API 키입니다.' }

        return { success: false, message: `모델을 찾을 수 없습니다(404). 구글 AI Studio에서 API 키의 활성 상태와 제한 사항을 확인해 주세요.` }
    } catch (error: any) {
        return { success: false, message: `검사 실패: ${error.message}` }
    }
}

/**
 * piAPI (FLUX) API 키 유효성 검사
 */
export async function validatePiApi(key: string) {
    const trimmedKey = key?.trim()
    if (!trimmedKey) return { success: false, message: '키를 입력해주세요.' }

    const testUrls = [
        'https://api.piapi.ai/account/info',
        'https://api.piapi.ai/api/v1/account/info',
        'https://api.piapi.ai/api/v1/user/info'
    ]

    for (const url of testUrls) {
        try {
            const res = await axios.get(url, {
                headers: { 'X-API-Key': trimmedKey },
                timeout: 7000,
                validateStatus: (status) => status < 500
            })

            if (res.status === 200) {
                return { success: true, message: '유효한 piAPI 키입니다. (FLUX 사용 가능)' }
            }

            if (res.status === 401) {
                return { success: false, message: '유효하지 않은 API 키입니다.' }
            }
        } catch (error) {
            continue
        }
    }

    return { success: false, message: '연결에 실패했습니다. API 키와 네트워크 상태를 확인해 주세요. (404 등 발생)' }
}
