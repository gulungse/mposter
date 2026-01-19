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
    // 1. 사용자의 플랜 정보 조회 (혹시 플랜이 있으면 그 기본값을 사용, 없으면 BASE_LIMITS 사용)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true }
    })

    if (!user) {
        return BASE_LIMITS
    }

    let currentLimits: UserLimits = {
        sites: BASE_LIMITS.sites,
        keywords: BASE_LIMITS.keywords,
        prompts: BASE_LIMITS.prompts,
        tasks: BASE_LIMITS.tasks,
    }

    if (user.plan) {
        currentLimits = {
            sites: user.plan.siteLimit,
            keywords: user.plan.keywordGroupLimit,
            prompts: user.plan.promptLimit,
            tasks: user.plan.taskLimit,
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

    // 3. 추가 슬롯 합산
    for (const purchase of validPurchases) {
        // userPurchase에 slotAmount가 저장되어 있다고 가정 (구매 시점의 수량)
        // 만약 userPurchase.slotAmount 데이터가 없다면 item.amount를 써야겠지만,
        // 스키마상 userPurchase.slotAmount가 있으므로 그것을 신뢰함.
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

    return currentLimits
}
