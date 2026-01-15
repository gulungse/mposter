'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { SiteType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import axios from 'axios'

import { getOrCreateUser } from '@/lib/auth'

import { checkLimit } from './plan'

export type CreateSiteState = {
    success: boolean
    message?: string
}

export async function createSite(data: {
    name: string
    url: string
    type: string
    username?: string
    apiToken: string
    refreshToken?: string
}): Promise<CreateSiteState> {
    try {
        const user = await getOrCreateUser()

        // 요금제 한도 체크
        const limitRes = await checkLimit('site')
        if (!limitRes.success) {
            return { success: false, message: limitRes.error }
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        // Prisma Client가 업데이트되지 않아도 DB에 직접 쿼리를 날려 저장합니다. (SiteType 및 Timestamp 캐스팅 추가)
        await (prisma as any).$executeRawUnsafe(`
            INSERT INTO "sites" ("id", "userId", "type", "name", "url", "username", "apiToken", "refreshToken", "createdAt", "updatedAt")
            VALUES ($1, $2, $3::"SiteType", $4, $5, $6, $7, $8, $9::timestamp, $10::timestamp)
        `,
            id,
            user.id,
            data.type,
            data.name,
            data.url,
            data.username || null,
            data.apiToken,
            data.refreshToken || null,
            now,
            now
        )

        revalidatePath('/dashboard/sites')
        return { success: true, message: '사이트가 성공적으로 추가되었습니다.' }

    } catch (error: any) {
        console.error('Failed to create site (Raw SQL):', error)
        return { success: false, message: `사이트 추가 실패: ${error.message || '알 수 없는 오류'}` }
    }
}

export async function getSites() {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return { success: false, error: '인증 필요', data: [] }

    try {
        const sites = await prisma.site.findMany({
            where: { userId: authUser.id },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: sites }
    } catch (error) {
        console.error('Failed to fetch sites:', error)
        return { success: false, error: '조회 실패', data: [] }
    }
}

export async function getSite(id: string) {
    try {
        const user = await getOrCreateUser()

        // Prisma Client sync 이슈 방지를 위해 Raw SQL로 조회 (as any 캐스팅)
        const sites = await (prisma as any).$queryRawUnsafe(
            'SELECT * FROM "sites" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
            id,
            user.id
        )

        if (!sites || sites.length === 0) return { success: false, error: '사이트를 찾을 수 없습니다.' }

        return { success: true, data: sites[0] }
    } catch (error) {
        console.error('Failed to get site (Raw SQL):', error)
        return { success: false, error: '사이트 조회 중 오류 발생' }
    }
}

export async function updateSite(id: string, data: {
    name: string
    url: string
    username?: string
    apiToken: string
    refreshToken?: string
}) {
    try {
        const user = await getOrCreateUser()
        const now = new Date().toISOString()

        // Prisma Client sync 이슈 방지를 위해 Raw SQL로 업데이트
        await (prisma as any).$executeRawUnsafe(`
            UPDATE "sites" 
            SET "name" = $1, "url" = $2, "username" = $3, "apiToken" = $4, "refreshToken" = $5, "updatedAt" = $6::timestamp
            WHERE "id" = $7 AND "userId" = $8
        `,
            data.name,
            data.url,
            data.username || null,
            data.apiToken,
            data.refreshToken || null,
            now,
            id,
            user.id
        )

        revalidatePath('/dashboard/sites')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update site (Raw SQL):', error)
        return { success: false, error: `사이트 수정 실패: ${error.message}` }
    }
}

export async function deleteSite(id: string) {
    try {
        const user = await getOrCreateUser()
        await prisma.site.delete({
            where: { id, userId: user.id }
        })
        revalidatePath('/dashboard/sites')
        return { success: true }
    } catch (error) {
        return { success: false, error: '사이트 삭제 중 오류 발생' }
    }
}

export async function getWordPressCategories(siteId: string) {
    try {
        const user = await getOrCreateUser()
        const site = await prisma.site.findUnique({
            where: { id: siteId, userId: user.id }
        })

        if (!site || site.type !== 'WORDPRESS') {
            return { success: false, error: '워드프레스 사이트가 아닙니다.' }
        }

        const response = await axios.get(`${site.url}/wp-json/wp/v2/categories`, {
            params: { per_page: 100 },
            auth: {
                username: site.username || '',
                password: site.apiToken || ''
            }
        })

        const categories = response.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name
        }))

        return { success: true, data: categories }
    } catch (error: any) {
        console.error('워드프레스 카테고리 조회 실패:', error.response?.data || error.message)
        return { success: false, error: '카테고리를 가져올 수 없습니다. 연결 정보를 확인해주세요.' }
    }
}
