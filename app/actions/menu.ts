'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * 모든 사이드바 메뉴를 가져옵니다.
 */
export async function getSidebarMenus() {
    try {
        const menus = await (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "sidebar_menus" ORDER BY "order" ASC
        `)
        return { success: true, data: menus }
    } catch (error) {
        console.error('Failed to get menus (Raw SQL):', error)
        return { success: false, error: '메뉴를 가져오지 못했습니다.' }
    }
}

/**
 * 활성화된 사이드바 메뉴만 가져옵니다. (사용자 화면용)
 */
export async function getActiveSidebarMenus() {
    try {
        const menus = await (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "sidebar_menus" WHERE "isActive" = true ORDER BY "order" ASC
        `)
        return { success: true, data: menus }
    } catch (error) {
        return { success: false, error: '메뉴를 가져오지 못했습니다.' }
    }
}

/**
 * 새 메뉴를 추가합니다. (Admin 전용)
 */
export async function createSidebarMenu(data: {
    label: string
    href: string
    icon?: string
    order?: number
}) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const order = data.order || 0
        const icon = data.icon || 'LayoutDashboard'

        await (prisma as any).$executeRawUnsafe(`
            INSERT INTO "sidebar_menus" ("id", "label", "href", "icon", "order", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, true, $6::timestamp, $7::timestamp)
        `, id, data.label, data.href, icon, order, now, now)

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Create menu failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * 메뉴를 업데이트합니다.
 */
export async function updateSidebarMenu(id: string, data: any) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const now = new Date().toISOString()

        // 동적 쿼리 생성이 복잡하므로 자주 사용되는 필드 위주로 처리
        if (data.isActive !== undefined) {
            await (prisma as any).$executeRawUnsafe(`
                UPDATE "sidebar_menus" SET "isActive" = $1, "updatedAt" = $2::timestamp WHERE "id" = $3
            `, data.isActive, now, id)
        } else if (data.order !== undefined) {
            await (prisma as any).$executeRawUnsafe(`
                UPDATE "sidebar_menus" SET "order" = $1, "updatedAt" = $2::timestamp WHERE "id" = $3
            `, data.order, now, id)
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 메뉴를 삭제합니다.
 */
export async function deleteSidebarMenu(id: string) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        await (prisma as any).$executeRawUnsafe(`
            DELETE FROM "sidebar_menus" WHERE "id" = $1
        `, id)

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 기본 메뉴가 없을 경우 초기화합니다.
 */
export async function seedDefaultMenus() {
    try {
        const menus: any[] = await (prisma as any).$queryRawUnsafe(`SELECT count(*) FROM "sidebar_menus"`)
        const count = Number(menus[0]?.count || 0)

        if (count > 0) return { success: true, message: '이미 메뉴가 존재합니다.' }

        const defaultMenus = [
            { label: '대시보드', href: '/dashboard', icon: 'LayoutDashboard', order: 1 },
            { label: '사이트 관리', href: '/dashboard/sites', icon: 'Globe', order: 2 },
            { label: '키워드 관리', href: '/dashboard/keywords', icon: 'Key', order: 3 },
            { label: '프롬프트 관리', href: '/dashboard/prompts', icon: 'Terminal', order: 4 },
            { label: '프롬프트 테스트', href: '/dashboard/prompts/test', icon: 'Sparkles', order: 5 },
            { label: '유튜브 → 블로그', href: '/dashboard/tasks/youtube', icon: 'Youtube', order: 6 },
            { label: '자동화 작업', href: '/dashboard/tasks', icon: 'Cpu', order: 7 },
            { label: 'API 관리', href: '/dashboard/api', icon: 'Code2', order: 8 },
        ]

        const now = new Date().toISOString()
        for (const m of defaultMenus) {
            const id = crypto.randomUUID()
            await (prisma as any).$executeRawUnsafe(`
                INSERT INTO "sidebar_menus" ("id", "label", "href", "icon", "order", "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, true, $6::timestamp, $7::timestamp)
            `, id, m.label, m.href, m.icon, m.order, now, now)
        }

        return { success: true, message: '기본 메뉴가 생성되었습니다.' }
    } catch (error: any) {
        console.error('Seed failed:', error)
        return { success: false, error: error.message }
    }
}
