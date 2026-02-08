
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// Module-level cache for global settings to reduce DB load
let cachedSettings: { signupBonus: number, verificationBonus: number } | null = null;

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

    // Global Settings 조회 (Global cache check)
    if (!cachedSettings) {
        try {
            const settingsRaw = await prisma.$queryRawUnsafe<any[]>(`SELECT "signupBonus", "verificationBonus" FROM "global_settings" WHERE "id" = 'SYSTEM' LIMIT 1`)
            if (Array.isArray(settingsRaw) && settingsRaw.length > 0) {
                cachedSettings = {
                    signupBonus: settingsRaw[0]?.signupBonus ?? 10,
                    verificationBonus: settingsRaw[0]?.verificationBonus ?? 20
                }
            }
        } catch (e) {
            console.warn("Failed to fetch global settings, using defaults:", e)
        }
    }

    const { signupBonus = 10, verificationBonus = 20 } = cachedSettings || {};

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

        // 유저 생성 및 가입 보너스 지급 (트랜잭션)
        // Use transaction to ensure safe creation
        user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    id: authUser.id,
                    email: authUser.email!,
                    name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
                    image: authUser.user_metadata.avatar_url,
                    role: isFirstUser ? 'ADMIN' : 'USER',
                    planId: freePlanId,
                    tokenBalance: signupBonus
                    // Note: We intentionally omit emailVerifiedAt here to avoid errors if Prisma Client is stale.
                    // We will update it in the bonus block below using raw SQL.
                }
            })

            // 가입 축하금 기록
            await tx.transaction.create({
                data: {
                    userId: newUser.id,
                    amount: signupBonus,
                    type: 'BONUS',
                    description: '회원가입 축하금'
                }
            })

            return newUser
        })
    }

    // 이메일 인증 보너스 로직 (가입 직후 또는 추후 인증 시)
    // Check if user exists (TS check) and verify email status
    if (user && authUser.email_confirmed_at) {
        try {
            const confirmedAt = new Date(authUser.email_confirmed_at).toISOString()

            // Raw SQL update to support new fields even if Prisma Client is stale
            // Updates only if verificationBonusClaimed is false (meaning not yet claimed)
            const result = await prisma.$executeRawUnsafe(
                `UPDATE "users" 
                 SET "tokenBalance" = "tokenBalance" + $1, 
                     "verificationBonusClaimed" = true, 
                     "emailVerifiedAt" = $2::timestamp 
                 WHERE "id" = $3 AND "verificationBonusClaimed" = false`,
                verificationBonus,
                confirmedAt,
                user.id
            )

            // If rows affected > 0, it means we applied the bonus
            if (result > 0) {
                await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        amount: verificationBonus,
                        type: 'BONUS',
                        description: '이메일 인증 보너스'
                    }
                })
                // Update local user object token balance so UI reflects it immediately
                user.tokenBalance += verificationBonus
            }
        } catch (e) {
            console.error("Failed to apply verification bonus:", e)
        }
    }


    // ----------------------------------------------------------------
    // ADMIN IMPERSONATION CHECK
    // ----------------------------------------------------------------
    if (user && user.role === 'ADMIN') {
        const cookieStore = await cookies()
        const impersonateId = cookieStore.get('x-impersonate-user-id')?.value

        if (impersonateId) {
            // Find the target user
            const targetUser = await prisma.user.findUnique({
                where: { id: impersonateId }
            })

            if (targetUser) {
                // Return the target user context
                return targetUser
            }
        }
    }

    return user
}
