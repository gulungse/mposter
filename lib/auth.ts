
import { redirect } from 'next/navigation'
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
        redirect('/login')
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

        // 탈퇴 이력 확인 (재가입 방지)
        if (authUser.email) {
            // Prisma Client 갱신 지연 시 방어 로직 (재시작 전까지 크래시 방지)
            if ((prisma as any).withdrawnUser) {
                const withdrawn = await prisma.withdrawnUser.findUnique({
                    where: { email: authUser.email }
                })

                if (withdrawn) {
                    const now = new Date()
                    if (withdrawn.availableAt > now) {
                        await supabase.auth.signOut()
                        const dateStr = withdrawn.availableAt.toISOString().split('T')[0]
                        redirect(`/login?error=withdrawn&date=${dateStr}`)
                    }
                }
            } else {
                // 개발 환경에서 스키마 변경 후 서버 재시작이 안 되었을 때 로그 남김
                console.warn("⚠️ Warning: 'withdrawnUser' model not found in Prisma Client. Please restart the server to apply schema changes.")
            }
        }

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
