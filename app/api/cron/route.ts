import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAutomationTask } from '@/app/actions/worker'

export const dynamic = 'force-dynamic'

import { calculateNextRun } from '@/lib/cron'

// Removed local getNextRun function as we use the imported one
// function getNextRun(cron: string, fromDate: Date = new Date()): Date { ... }

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
