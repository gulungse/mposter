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

/**
 * 워드프레스 연결 유효성을 검사합니다.
 */
async function validateWordPressConnection(url: string, username: string | undefined, apiToken: string) {
    const baseUrl = url.replace(/\/$/, '')
    try {
        await axios.get(`${baseUrl}/wp-json/wp/v2/users/me`, {
            auth: {
                username: username || '',
                password: apiToken
            },
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })
        return { success: true }
    } catch (err: any) {
        console.error('WP Connection Test Failed:', err.message)

        if (err.response?.status === 401) {
            return {
                success: false,
                message: '워드프레스 인증 실패 (401): 입력하신 아이디(Username) 또는 앱 비밀번호가 올바르지 않습니다. 워드프레스 사용자 목록의 아이디와 정확히 일치하는지 확인해주세요.'
            }
        }

        return {
            success: false,
            message: `워드프레스 연결 실패: ${err.message} ${err.response?.status ? `(Status: ${err.response.status})` : ''} ${err.response?.data?.message ? `(${err.response.data.message})` : ''}`
        }
    }
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

        // 워드프레스 연결 테스트
        if (data.type === 'WORDPRESS') {
            const validation = await validateWordPressConnection(data.url, data.username, data.apiToken)
            if (!validation.success) {
                return { success: false, message: validation.message }
            }
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
    try {
        const user = await getOrCreateUser()

        const sites = await prisma.site.findMany({
            where: { userId: user.id },
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

        // 사이트 타입 조회 (워드프레스인지 확인하기 위해)
        const existingSite = await prisma.site.findUnique({
            where: { id, userId: user.id }
        })

        if (!existingSite) {
            return { success: false, error: '수정할 사이트를 찾을 수 없습니다.' }
        }

        // 워드프레스인 경우 연결 테스트 수행
        if (existingSite.type === 'WORDPRESS') {
            const validation = await validateWordPressConnection(data.url, data.username, data.apiToken)
            if (!validation.success) {
                return { success: false, error: validation.message }
            }
        }

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
            },
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

/**
 * Google OAuth 인증 URL 생성
 */
export async function getBloggerAuthUrl() {
    try {
        const user = await getOrCreateUser() as any
        const clientId = user.settings?.googleClientId

        if (!clientId) {
            return { success: false, error: 'Google Client ID가 설정되지 않았습니다. API 관리 메뉴에서 설정해 주세요.' }
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/sites/new`
        const scope = 'https://www.googleapis.com/auth/blogger'

        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

        return { success: true, url }
    } catch (error: any) {
        return { success: false, error: '인증 URL 생성 중 오류가 발생했습니다.' }
    }
}

/**
 * Blogger 인증 코드 교환 및 블로그 목록 조회
 */
export async function exchangeBloggerCode(code: string) {
    try {
        const user = await getOrCreateUser() as any
        const clientId = user.settings?.googleClientId
        const clientSecret = user.settings?.googleClientSecret

        if (!clientId || !clientSecret) {
            return { success: false, error: 'Google API 설정이 누락되었습니다.' }
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/sites/new`

        // 1. 토큰 교환
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })

        const { access_token, refresh_token } = tokenRes.data

        // 2. 블로그 목록 조회
        const blogsRes = await axios.get('https://www.googleapis.com/blogger/v3/users/self/blogs', {
            headers: { Authorization: `Bearer ${access_token}` }
        })

        const blogs = blogsRes.data.items || []

        if (blogs.length === 0) {
            return { success: false, error: '연동된 블로그(Blogspot)가 없습니다.' }
        }

        // 블로그 정보와 토큰 반환
        return {
            success: true,
            data: {
                blogs: blogs.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    url: b.url,
                    blogId: b.id // API 호출 시 필요한 블로그 ID
                })),
                accessToken: access_token,
                refreshToken: refresh_token
            }
        }

    } catch (error: any) {
        console.error('Blogger Auth Error:', error.response?.data || error.message)
        return { success: false, error: `인증 처리에 실패했습니다: ${error.response?.data?.error_description || error.message}` }
    }
}
