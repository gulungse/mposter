'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TistoryRewriteForm from './tistory-rewrite-form'
import { getPrompts } from '@/app/actions/prompt'
import { getSites } from '@/app/actions/site'

export default async function TistoryRewritePage() {
    const user = await getOrCreateUser()
    
    // 권한 체크
    const rightsRes = await (prisma as any).$queryRawUnsafe(`SELECT "hasImageGenRights" FROM "users" WHERE id = '${user.id}'`)
    const hasRights = rightsRes?.[0]?.hasImageGenRights === true
    const isAdmin = user.role === 'ADMIN'

    if (!hasRights && !isAdmin) {
        redirect('/dashboard')
    }

    // 초기 데이터 로딩
    const [promptsRes, sitesRes] = await Promise.all([
        getPrompts(),
        getSites()
    ])

    return (
        <div className="p-8 max-w-5xl mx-auto pb-32">
            <div className="mb-8">
                <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                    티스재작성 시스템
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">티스토리 글을 가져와 재작성 후 워드프레스로 자동 전송합니다.</p>
            </div>

            <TistoryRewriteForm 
                initialPrompts={promptsRes.success ? (promptsRes.data as any[]) : []}
                initialSites={sitesRes.success ? (sitesRes.data as any[]) : []}
                hasRights={hasRights}
            />
        </div>
    )
}
