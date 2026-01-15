import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAutomationTask } from '@/app/actions/worker'

export const dynamic = 'force-dynamic'

function getNextRun(cron: string, fromDate: Date = new Date()): Date {
    const next = new Date(fromDate)

    if (cron.startsWith('*/5')) {
        next.setMinutes(next.getMinutes() + 5)
    } else if (cron.startsWith('*/10')) {
        next.setMinutes(next.getMinutes() + 10)
    } else if (cron.startsWith('*/30')) {
        next.setMinutes(next.getMinutes() + 30)
    } else if (cron === '0 * * * *') {
        next.setHours(next.getHours() + 1)
        next.setMinutes(0, 0, 0)
    } else if (cron === '0 */3 * * *') {
        next.setHours(next.getHours() + 3)
        next.setMinutes(0, 0, 0)
    } else if (cron === '0 */6 * * *') {
        next.setHours(next.getHours() + 6)
        next.setMinutes(0, 0, 0)
    } else if (cron === '0 */12 * * *') {
        next.setHours(next.getHours() + 12)
        next.setMinutes(0, 0, 0)
    } else if (cron === '0 0 * * *') {
        next.setDate(next.getDate() + 1)
        next.setHours(0, 0, 0, 0)
    } else if (cron === '0 0 */2 * *') {
        next.setDate(next.getDate() + 2)
        next.setHours(0, 0, 0, 0)
    } else {
        // Fallback for custom or unknown: Default 1 hour safety
        next.setHours(next.getHours() + 1)
    }
    return next
}

export async function GET() {
    try {
        const jobs = await prisma.automationJob.findMany({
            where: { isActive: true, nextRunAt: { lte: new Date() } }
        })

        if (jobs.length === 0) {
            return NextResponse.json({ success: true, ran: 0, message: 'No pending jobs' })
        }

        const results = []
        for (const job of jobs) {
            console.log(`[CRON] Executing Job: ${job.name} (${job.id})`)

            // 1. Run Task
            let start = Date.now()
            let res: any = { success: false, error: 'Unknown' }
            try {
                res = await runAutomationTask(job.id)
            } catch (e: any) {
                res = { success: false, error: e.message }
            }

            // 2. Schedule Next
            if (job.scheduleCron && job.scheduleCron !== 'MANUAL') {
                const nextDate = getNextRun(job.scheduleCron)
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
