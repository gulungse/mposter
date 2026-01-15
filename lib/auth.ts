
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase Auth 사용자와 Prisma DB 사용자를 동기화하고 반환합니다.
 * DB에 사용자가 없으면 생성합니다. (첫 가입자는 관리자로 등록)
 */
export async function getOrCreateUser() {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) {
        throw new Error('Authentication required')
    }

    let user = await prisma.user.findUnique({
        where: { id: authUser.id }
    })

    if (!user) {
        // 현재 DB에 사용자가 한 명도 없으면 첫 사용자를 ADMIN으로 생성
        const userCount = await prisma.user.count()
        const isFirstUser = userCount === 0

        // 기본 무료 플랜 ID 조회 (없으면 null)
        const freePlans: any[] = await (prisma as any).$queryRawUnsafe(`SELECT id FROM "plans" WHERE "name" LIKE 'Free%' LIMIT 1`)
        const freePlanId = freePlans[0]?.id || null

        user = await prisma.user.create({
            data: {
                id: authUser.id,
                email: authUser.email!,
                name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
                image: authUser.user_metadata.avatar_url,
                role: isFirstUser ? 'ADMIN' : 'USER',
                planId: freePlanId,
                tokenBalance: 10 // 가입 축하 기본 토큰
            }
        })
    }

    return user
}
