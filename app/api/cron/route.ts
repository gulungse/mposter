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

            // 1. Run Task (Auth Free)
            let start = Date.now()
            let res: any = { success: false, error: 'Unknown' }
            try {
                res = await processAutomationJob(job.id)
            } catch (e: any) {
                res = { success: false, error: e.message }
            }

            // 2. Schedule Next
            if (job.scheduleCron && job.scheduleCron !== 'MANUAL') {
                const nextDate = calculateNextRun(job.scheduleCron) // Use imported function
                await prisma.automationJob.update({
                    where: { id: job.id },
                    data: {
                        lastRunAt: new Date(),
                        nextRunAt: nextDate
                    }
                })
            }

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
