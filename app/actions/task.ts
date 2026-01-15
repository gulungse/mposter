'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { runAutomationTask } from './worker'
import { checkLimit } from './plan'

/**
 * 자동화 작업 생성
 */
export async function createAutomationTask(data: {
    name: string;
    siteId: string;
    keywordGroupId: string;
    promptId: string;
    scheduleCron: string;
    aiModel: any;
    imageSource: any;
    wpCategoryId?: number;
    runImmediately?: boolean;
}) {
    try {
        const user = await getOrCreateUser()

        // 요금제 한도 체크
        const limitRes = await checkLimit('automationJob')
        if (!limitRes.success) {
            return { success: false, error: limitRes.error }
        }

        const task = await (prisma.automationJob as any).create({
            data: {
                userId: user.id,
                name: data.name,
                siteId: data.siteId,
                keywordGroupId: data.keywordGroupId,
                promptId: data.promptId,
                scheduleCron: data.scheduleCron,
                aiModel: data.aiModel,
                imageSource: data.imageSource,
                wpCategoryId: data.wpCategoryId,
                isActive: true,
                nextRunAt: new Date(Date.now() + 6 * 10 * 1000) // 기본 1시간 후 (Cron에 의해 덮어씌워짐)
            }
        })

        // 테스트 발행인 경우 즉시 실행
        if (data.runImmediately) {
            // 비동기로 실행하거나 결과를 기다릴 수 있습니다.
            // 여기서는 흐름상 즉시 실행 결과를 반환하는 것이 좋으므로 기다립니다.
            const runResult = await runAutomationTask(task.id)
            if (!runResult.success) {
                return { success: true, data: task, warning: runResult.error }
            }
        }

        revalidatePath('/dashboard/tasks')
        return { success: true, data: task }
    } catch (error: any) {
        console.error('자동화 작업 생성 실패:', error)
        return {
            success: false,
            error: `자동화 작업을 저장하는 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`
        }
    }
}

/**
 * 자동화 작업 목록 조회
 */
export async function getAutomationTasks() {
    try {
        const user = await getOrCreateUser()

        const tasks = await prisma.automationJob.findMany({
            where: { userId: user.id },
            include: {
                site: true,
                keywordGroup: true,
                prompt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { success: true, data: tasks }
    } catch (error) {
        console.error('자동화 작업 조회 실패:', error)
        return { success: false, error: '자동화 작업 목록을 가져오는 중 오류가 발생했습니다.' }
    }
}

/**
 * 작업 상태 변경 (활성/비활성)
 */
export async function toggleTaskStatus(taskId: string, currentStatus: boolean) {
    try {
        await prisma.automationJob.update({
            where: { id: taskId },
            data: { isActive: !currentStatus }
        })

        revalidatePath('/dashboard/tasks')
        return { success: true }
    } catch (error) {
        console.error('작업 상태 변경 실패:', error)
        return { success: false, error: '상태를 변경하는 중 오류가 발생했습니다.' }
    }
}

/**
 * 단일 작업 상세 조회
 */
export async function getAutomationTask(id: string) {
    try {
        const user = await getOrCreateUser()
        const task = await prisma.automationJob.findUnique({
            where: { id, userId: user.id },
            include: {
                site: true,
                keywordGroup: true,
                prompt: true,
                logs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        })
        return { success: true, data: task }
    } catch (error) {
        return { success: false, error: '작업 조회 중 오류가 발생했습니다.' }
    }
}

/**
 * 작업 삭제
 */
export async function deleteAutomationTask(id: string) {
    try {
        const user = await getOrCreateUser()
        await prisma.automationJob.delete({
            where: { id, userId: user.id }
        })
        revalidatePath('/dashboard/tasks')
        return { success: true }
    } catch (error) {
        return { success: false, error: '작업 삭제 중 오류가 발생했습니다.' }
    }
}
