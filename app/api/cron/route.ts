import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAutomationJob } from '@/lib/automation'
import { calculateNextRun } from '@/lib/cron'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Vercel Timeout 연장 (최대 5분)

export async function GET(request: Request) {
    try {
        // 보안 체크: 로컬호스트(127.0.0.1/::1)에서의 요청은 허용, 그 외에는 CRON_SECRET 확인
        const authHeader = request.headers.get('authorization');
        const host = request.headers.get('host') || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

        if (!isLocalhost && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const jobs = await prisma.automationJob.findMany({
            where: { isActive: true, nextRunAt: { lte: new Date() } }
        })

        if (jobs.length === 0) {
            return NextResponse.json({ success: true, ran: 0, message: 'No pending jobs' })
        }

        let results: any[] = []
        let lockedJobs = []

        // 1. 모든 유효한 Job에 대해 Lock을 먼저 겁니다. (중복 실행 방지)
        for (const job of jobs) {
            if (job.scheduleCron && job.scheduleCron !== 'MANUAL') {
                let nextDate = calculateNextRun(job.scheduleCron, job.nextRunAt || new Date())
                if (nextDate <= new Date()) {
                    nextDate = calculateNextRun(job.scheduleCron)
                }

                const lockResult = await prisma.automationJob.updateMany({
                    where: { id: job.id, nextRunAt: job.nextRunAt },
                    data: { nextRunAt: nextDate }
                })
                
                if (lockResult.count > 0) {
                    lockedJobs.push(job)
                } else {
                    console.log(`[CRON] Job skipped (already locked): ${job.name} (${job.id})`)
                }
            }
        }

        if (lockedJobs.length === 0) {
            return NextResponse.json({ success: true, ran: 0, message: 'All pending jobs were already locked' })
        }

        console.log(`[CRON] Processing ${lockedJobs.length} locked jobs in chunks...`)

        // 2. 3개 단위(Chunk)로 병렬 처리하여 타임아웃 방지 및 Rate Limit 방어
        const chunkSize = 3;
        for (let i = 0; i < lockedJobs.length; i += chunkSize) {
            const chunk = lockedJobs.slice(i, i + chunkSize);
            console.log(`[CRON] Processing chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} jobs)`)
            
            const chunkResults = await Promise.all(chunk.map(async (job) => {
                let start = Date.now()
                let res: any = { success: false, error: 'Unknown' }
                try {
                    console.log(`[CRON] Executing Job: ${job.name} (${job.id})`)
                    res = await processAutomationJob(job.id)
                } catch (e: any) {
                    res = { success: false, error: e.message }
                }

                try {
                    await prisma.automationJob.update({
                        where: { id: job.id },
                        data: { lastRunAt: new Date() }
                    })
                } catch (updateErr) {
                    console.error(`[CRON] Failed to update lastRunAt for ${job.id}:`, updateErr)
                }

                return {
                    id: job.id,
                    success: res.success,
                    duration: Date.now() - start
                }
            }));
            
            results = results.concat(chunkResults);
        }

        return NextResponse.json({ success: true, ran: results.length, details: results })
    } catch (error: any) {
        console.error('[CRON] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
