import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAutomationJob } from '@/lib/automation'
import { calculateNextRun } from '@/lib/cron'

export const dynamic = 'force-dynamic'

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

        const results = []
        for (const job of jobs) {
            console.log(`[CRON] Executing Job: ${job.name} (${job.id})`)

            // 1. Prevent concurrent executions (Atomic Lock)
            if (job.scheduleCron && job.scheduleCron !== 'MANUAL') {
                // 이전 대기시간 또는 소요시간에 의한 드리프트(밀림 현상) 방지
                // 설정된 원래 예정 시간을 기준으로 다음 시간을 계산함
                let nextDate = calculateNextRun(job.scheduleCron, job.nextRunAt || new Date())
                
                // 만약 서버 정지 등으로 인해 계산된 다음 시간이 여전히 과거라면 현실적인 현재 시간 기준으로 재조정
                if (nextDate <= new Date()) {
                    nextDate = calculateNextRun(job.scheduleCron)
                }

                const lockResult = await prisma.automationJob.updateMany({
                    where: { id: job.id, nextRunAt: job.nextRunAt },
                    data: { nextRunAt: nextDate }
                })
                
                // If count is 0, another cron instance already picked it up
                if (lockResult.count === 0) {
                    console.log(`[CRON] Job skipped (already locked): ${job.name} (${job.id})`)
                    continue;
                }
            } else {
                continue; // MANUAL shouldn't be executed via background CRON ideally, but skipped for safety
            }

            // 2. Run Task (Auth Free)
            let start = Date.now()
            let res: any = { success: false, error: 'Unknown' }
            try {
                res = await processAutomationJob(job.id)
            } catch (e: any) {
                res = { success: false, error: e.message }
            }

            // 3. Record lastRunAt
            await prisma.automationJob.update({
                where: { id: job.id },
                data: {
                    lastRunAt: new Date()
                }
            })

            results.push({
                id: job.id,
                success: res.success,
                duration: Date.now() - start
            })
        }

        return NextResponse.json({ success: true, ran: results.length, details: results })
    } catch (error: any) {
        console.error('[CRON] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
