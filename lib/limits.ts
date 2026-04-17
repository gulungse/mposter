import { prisma } from '@/lib/prisma'

export interface UserLimits {
    sites: number
    keywords: number
    prompts: number
    tasks: number
}

// 기본 무료 제공량 (가입 시 주어졌던 기본값)
export const BASE_LIMITS: UserLimits = {
    sites: 2,
    keywords: 3,
    prompts: 3,
    tasks: 3
}

export async function getUserLimits(userId: string): Promise<UserLimits> {
    // 1. 사용자의 플랜 정보 조회 (Prisma Client mismatch 방어를 위해 Raw SQL 사용)
    const users = await prisma.$queryRawUnsafe<any[]>(`
        SELECT u.*, p.id as "plan_id", p.name as "plan_name", 
               p."siteLimit", p."keywordGroupLimit", p."promptLimit", p."taskLimit"
        FROM "users" u
        LEFT JOIN "plans" p ON u."planId" = p.id
        WHERE u.id = $1
        LIMIT 1
    `, userId);

    const user = users?.[0] || null;

    if (!user) {
        return BASE_LIMITS
    }

    // Map raw SQL fields to expected structure if needed, or just handle nulls
    const plan = user.plan_id ? {
        id: user.plan_id,
        name: user.plan_name,
        siteLimit: user.siteLimit,
        keywordGroupLimit: user.keywordGroupLimit,
        promptLimit: user.promptLimit,
        taskLimit: user.taskLimit
    } : null;

    // Use user with plan
    const userData = { ...user, plan };

    // [Admin Override] 특정 관리자 계정 무제한 (UI 표시용)
    if (user.email && user.email.toLowerCase().trim() === 'gulungse@gmail.com') {
        return { sites: 9999, keywords: 9999, prompts: 9999, tasks: 9999 }
    }

    let currentLimits: UserLimits = {
        sites: BASE_LIMITS.sites,
        keywords: BASE_LIMITS.keywords,
        prompts: BASE_LIMITS.prompts,
        tasks: BASE_LIMITS.tasks,
    }

    if (userData.plan) {
        currentLimits = {
            sites: userData.plan.siteLimit,
            keywords: userData.plan.keywordGroupLimit,
            prompts: userData.plan.promptLimit,
            tasks: userData.plan.taskLimit,
        }
    } else {
        // 플랜이 없는 경우(무료 회원), DB에서 'Free Plan'을 찾아 그 설정을 따름
        // (관리자가 수정한 무료 플랜 한도를 적용하기 위함)
        const freePlan = await prisma.plan.findFirst({
            where: { name: 'Free Plan' }
        })

        if (freePlan) {
            currentLimits = {
                sites: freePlan.siteLimit,
                keywords: freePlan.keywordGroupLimit,
                prompts: freePlan.promptLimit,
                tasks: freePlan.taskLimit,
            }
        }
    }

    // 2. 유효한(만료되지 않은) 구매 슬롯 조회
    const now = new Date()
    const validPurchases = await prisma.userPurchase.findMany({
        where: {
            userId: userId,
            endDate: { gt: now } // 만료일이 현재보다 미래인 것만
        },
        include: { item: true }
    })

    // 3. 추가 슬롯 합산 (정기 구매)
    for (const purchase of validPurchases) {
        const amount = purchase.slotAmount

        switch (purchase.type) {
            case 'SITE_SLOT':
                currentLimits.sites += amount
                break
            case 'KEYWORD_SLOT':
                currentLimits.keywords += amount
                break
            case 'PROMPT_SLOT':
                currentLimits.prompts += amount
                break
            case 'TASK_SLOT':
                currentLimits.tasks += amount
                break
        }
    }

    // 4. 관리자 수동 할당 보너스 합산 (User.limits JSON 필드)
    if (user.limits && typeof user.limits === 'object') {
        const customLimits = user.limits as any
        if (customLimits.siteBonus) currentLimits.sites += Number(customLimits.siteBonus)
        if (customLimits.keywordBonus) currentLimits.keywords += Number(customLimits.keywordBonus)
        if (customLimits.promptBonus) currentLimits.prompts += Number(customLimits.promptBonus)
        if (customLimits.taskBonus) currentLimits.tasks += Number(customLimits.taskBonus)
    }

    return currentLimits
}
