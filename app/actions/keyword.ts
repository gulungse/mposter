'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { getOrCreateUser } from '@/lib/auth'
import { checkLimit } from './plan'

// Signal.bz 실시간 검색어 가져오기
export async function fetchTrendingKeywords(): Promise<string[]> {
    try {
        const response = await axios.get('https://api.signal.bz/news/realtime', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        })

        const data = response.data
        if (data && Array.isArray(data.top10)) {
            // API returns { top10: [{ keyword: "..." }, ...] }
            return data.top10.map((item: any) => item.keyword)
        }
        return []
    } catch (error) {
        console.error('Failed to fetch signal.bz keywords:', error)
        return []
    }
}

// 키워드 그룹 생성
export async function createKeywordGroup(name: string, keywords: string[]) {
    try {
        const user = await getOrCreateUser()

        // 요금제 한도 체크
        const limitRes = await checkLimit('keywordGroup')
        if (!limitRes.success) {
            return { success: false, message: limitRes.error }
        }

        const group = await prisma.keywordGroup.create({
            data: {
                userId: user.id,
                name,
                keywords
            }
        })

        revalidatePath('/dashboard/keywords')
        return { success: true, message: '키워드 그룹이 생성되었습니다.', data: group }
    } catch (error) {
        console.error('Failed to create keyword group:', error)
        return { success: false, message: '키워드 그룹 생성 실패' }
    }
}

// 키워드 그룹 목록 조회
export async function getKeywordGroups() {
    try {
        const user = await getOrCreateUser()

        const groups = await prisma.keywordGroup.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: groups }
    } catch (error) {
        console.error('Failed to fetch keyword groups:', error)
        return { success: false, error: '조회 실패', data: [] }
    }
}

// 키워드 그룹 단일 조회
export async function getKeywordGroup(id: string) {
    try {
        const group = await prisma.keywordGroup.findUnique({
            where: { id }
        })
        if (!group) return { success: false, message: '그룹을 찾을 수 없습니다.' }
        return { success: true, data: group }
    } catch (error) {
        return { success: false, message: '조회 실패' }
    }
}

// 키워드 그룹 수정
export async function updateKeywordGroup(id: string, name: string, keywords: string[]) {
    try {
        await prisma.keywordGroup.update({
            where: { id },
            data: { name, keywords }
        })
        revalidatePath('/dashboard/keywords')
        return { success: true, message: '수정되었습니다.' }
    } catch (error) {
        return { success: false, message: '수정 실패' }
    }
}

// 키워드 그룹 삭제
export async function deleteKeywordGroup(id: string) {
    try {
        await prisma.keywordGroup.delete({
            where: { id }
        })
        revalidatePath('/dashboard/keywords')
        return { success: true, message: '삭제되었습니다.' }
    } catch (error) {
        return { success: false, message: '삭제 실패' }
    }
}
