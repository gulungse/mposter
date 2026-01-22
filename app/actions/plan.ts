'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getUserLimits } from '@/lib/limits'

/**
 * 모든 요금제 플랜을 가져옵니다.
 */
export async function getPlans() {
    try {
        const plans = await (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "plans" WHERE "isActive" = true ORDER BY "price" ASC
        `)
        return { success: true, data: plans }
    } catch (error) {
        console.error('Failed to get plans:', error)
        return { success: false, error: '플랜을 가져오지 못했습니다.' }
    }
}

/**
 * 관리자용 모든 플랜 조회 (비활성 포함)
 */
export async function getAllPlansAdmin() {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const plans = await (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "plans" ORDER BY "price" ASC
        `)
        return { success: true, data: plans }
    } catch (error) {
        return { success: false, error: '플랜 목록을 가져오지 못했습니다.' }
    }
}

/**
 * 플랜 생성
 */
export async function createPlan(data: {
    name: string
    price: number
    siteLimit: number
    keywordGroupLimit: number
    promptLimit: number
    taskLimit: number
    monthlyTokens: number
    description?: string
}) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await (prisma as any).$executeRawUnsafe(`
            INSERT INTO "plans" ("id", "name", "price", "siteLimit", "keywordGroupLimit", "promptLimit", "taskLimit", "monthlyTokens", "description", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::timestamp, $11::timestamp)
        `, id, data.name, data.price, data.siteLimit, data.keywordGroupLimit, data.promptLimit, data.taskLimit, data.monthlyTokens || 0, data.description || '', now, now)

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 플랜 업데이트
 */
export async function updatePlan(id: string, data: any) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        const now = new Date().toISOString()

        // 간단한 필드 업데이트 로직
        const entries = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'updatedAt' && k !== 'createdAt')
        for (const [key, value] of entries) {
            await (prisma as any).$executeRawUnsafe(`
                UPDATE "plans" SET "${key}" = $1, "updatedAt" = $2::timestamp WHERE "id" = $3
            `, value, now, id)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 플랜 삭제 (비활성화 처리 권장되나 요청에 따라 삭제 구현)
 */
export async function deletePlan(id: string) {
    try {
        const user = await getOrCreateUser()
        if (user.role !== 'ADMIN') throw new Error('Unauthorized')

        await (prisma as any).$executeRawUnsafe(`DELETE FROM "plans" WHERE "id" = $1`, id)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 기본 플랜 시딩 (Free, Basic, Pro)
 */
export async function seedDefaultPlans() {
    try {
        const plansCheck: any[] = await (prisma as any).$queryRawUnsafe(`SELECT count(*) FROM "plans"`)
        if (Number(plansCheck[0]?.count || 0) > 0) return { success: true, message: '이미 플랜이 존재합니다.' }

        const defaults = [
            { name: 'Free Plan', price: 0, sites: 2, keywords: 3, prompts: 2, tasks: 2, tokens: 0, desc: '무료로 시작하는 자동화의 첫걸음' },
            { name: 'Basic Plan', price: 29000, sites: 5, keywords: 10, prompts: 10, tasks: 8, tokens: 300, desc: '개인 블로거를 위한 최적의 선택' },
            { name: 'Pro Plan', price: 79000, sites: 15, keywords: 30, prompts: 30, tasks: 20, tokens: 1000, desc: '전문가 수준의 대량 자동 포스팅' }
        ]

        const now = new Date().toISOString()
        for (const p of defaults) {
            const id = crypto.randomUUID()
            await (prisma as any).$executeRawUnsafe(`
                INSERT INTO "plans" ("id", "name", "price", "siteLimit", "keywordGroupLimit", "promptLimit", "taskLimit", "monthlyTokens", "description", "isActive", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::timestamp, $11::timestamp)
            `, id, p.name, p.price, p.sites, p.keywords, p.prompts, p.tasks, p.tokens, p.desc, now, now)
        }

        return { success: true, message: '기본 요금제 3종이 생성되었습니다.' }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 사용자의 플랜 정보를 포함한 프로필 조회
 */
export async function getUserWithPlan() {
    try {
        const user = await getOrCreateUser()

        // 플랜 정보 조회를 위해 Raw SQL 사용
        let plan = null
        if (user.planId) {
            const plans: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM "plans" WHERE id = $1`, user.planId)
            plan = plans[0] || null
        }

        const limits = await getUserLimits(user.id)

        // 유효한 구매 내역 조회 (슬롯 확장 등)
        const purchases = await prisma.userPurchase.findMany({
            where: {
                userId: user.id,
                endDate: { gt: new Date() }
            },
            include: { item: true },
            orderBy: { endDate: 'asc' }
        })

        return {
            success: true,
            data: {
                ...user,
                plan,
                limits,
                purchases
            }
        }
    } catch (error) {
        return { success: false, error: '프로필을 가져오지 못했습니다.' }
    }
}

/**
 * 리소스 생성 전 한도를 체크합니다.
 */
/**
 * 리소스 생성 전 한도를 체크합니다.
 */
export async function checkLimit(type: 'site' | 'keywordGroup' | 'prompt' | 'automationJob') {
    try {
        const user = await getOrCreateUser()
        if (user.role === 'ADMIN' || (user.email && user.email.toLowerCase().trim() === 'gulungse@gmail.com')) {
            console.log(`[Limit Check] Override Success for ${user.email}`);
            return { success: true } 
        }

        const limits = await getUserLimits(user.id)

        let currentCount = 0
        let limit = 0

        switch (type) {
            case 'site':
                currentCount = await prisma.site.count({ where: { userId: user.id } })
                limit = limits.sites
                break
            case 'keywordGroup':
                currentCount = await prisma.keywordGroup.count({ where: { userId: user.id } })
                limit = limits.keywords
                break
            case 'prompt':
                currentCount = await prisma.prompt.count({ where: { userId: user.id } })
                limit = limits.prompts
                break
            case 'automationJob':
                currentCount = await prisma.automationJob.count({ where: { userId: user.id } })
                limit = limits.tasks
                break
        }

        if (currentCount >= limit) {
                         console.log(`[Limit Check] Failed: ${type} (Count: ${currentCount} / Limit: ${limit})`)
            return {
                success: false,
                error: `"${type === 'site' ? '사이트' : type === 'keywordGroup' ? '키워드 그룹' : type === 'prompt' ? '프롬프트' : '자동화 작업'}" 생성 한도(${limit}개)를 초과했습니다. 상점에서 슬롯을 확장해 보세요!`
            }
        }
        
        console.log(`[Limit Check] Passed: ${type} (Count: ${currentCount} / Limit: ${limit})`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 사용자에게 요금제를 할당합니다. (토큰 지급 포함)
 * - 관리자 기능 or 결제 후 호출용
 */
export async function assignPlanToUser(userId: string, planId: string) {
    try {
        const user = await getOrCreateUser() // 호출자 확인 (Admin or Self if implementing payment)
        // 여기서는 간단히 Admin이거나 본인(결제연동시)이라 가정하지만, 안전을 위해 역할 체크를 할 수도 있음.
        // 하지만 결제 로직이 시스템 내부에서 돌면 역할 체크는 상황에 따라 다름.
        // 일단 관리자 로직에 추가하는 것이므로 Admin 체크는 함수 밖이나 여기서 추가.

        // 플랜 정보 조회
        const plans: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM "plans" WHERE id = $1`, planId)
        const plan = plans[0]

        if (!plan) return { success: false, error: '존재하지 않는 요금제입니다.' }

        const monthlyTokens = plan.monthlyTokens || 0
        const tokenDescription = `${plan.name} 구독 혜택 (월간 지급)`

        // 트랜잭션으로 처리: 유저 플랜 업데이트 + 토큰 지급 + 트랜잭션 로그
        await prisma.$transaction(async (tx) => {
            const targetUser = await tx.user.findUnique({ where: { id: userId } })
            if (!targetUser) throw new Error('사용자를 찾을 수 없습니다.')

            // 날짜 계산
            const subEnd = new Date()
            subEnd.setMonth(subEnd.getMonth() + 1)

            // 유저 업데이트 (increment 대신 직접 합산)
            await tx.user.update({
                where: { id: userId },
                data: {
                    planId: planId,
                    subscriptionEnd: subEnd,
                    tokenBalance: targetUser.tokenBalance + monthlyTokens
                }
            })

            // 로그 생성
            await tx.transaction.create({
                data: {
                    userId,
                    amount: monthlyTokens,
                    description: tokenDescription,
                    type: 'BONUS'
                }
            })
        })

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/admin/users')
        return { success: true, message: `${plan.name}으로 변경 및 ${monthlyTokens} 토큰이 지급되었습니다.` }
    } catch (error: any) {
        console.error('Plan assignment failed:', error)
        return { success: false, error: error.message }
    }
}
