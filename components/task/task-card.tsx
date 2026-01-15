'use client'

import { useState } from 'react'
import { MoreHorizontal as MoreHorizontalIcon, Play as PlayIcon, Pause as PauseIcon, Clock as ClockIcon, Calendar as CalendarIcon, Edit as EditIcon, Trash2 as Trash2Icon, Loader2 as Loader2Icon, Hash as HashIcon, Terminal as TerminalIcon, Globe as GlobeIcon, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { toggleTaskStatus, deleteAutomationTask } from '@/app/actions/task'
import { useRouter } from 'next/navigation'

interface TaskCardProps {
    id: string
    name: string
    siteName: string
    siteType: 'WORDPRESS' | 'BLOGSPOT'
    keywordGroupName: string
    promptTitle: string
    schedule: string
    status: boolean // isActive
    nextRun?: string
}

export function TaskCard({
    id,
    name,
    siteName,
    siteType,
    keywordGroupName,
    promptTitle,
    schedule,
    status,
    nextRun
}: TaskCardProps) {
    const router = useRouter()
    const [isToggling, setIsToggling] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleToggle = async () => {
        setIsToggling(true)
        try {
            await toggleTaskStatus(id, status)
            router.refresh()
        } catch (error) {
            alert('상태 변경 실패')
        } finally {
            setIsToggling(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('정말로 이 작업을 삭제하시겠습니까?')) return
        setIsDeleting(true)
        try {
            await deleteAutomationTask(id)
            router.refresh()
        } catch (error) {
            alert('삭제 실패')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 group overflow-hidden">
            {/* Header Area */}
            <div className="p-6 pb-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={clsx(
                                "text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter",
                                siteType === 'WORDPRESS' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            )}>
                                {siteType === 'WORDPRESS' ? 'WORDPRESS' : 'BLOGSPOT'}
                            </div>
                            <span className={clsx("h-2 w-2 rounded-full animate-pulse", status ? "bg-green-500" : "bg-orange-500")} />
                        </div>
                        <h3 className="text-lg font-black text-foreground leading-tight line-clamp-2" title={name}>
                            {name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <GlobeIcon className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{siteName}</span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-border/50 to-transparent" />

                {/* Info Grid */}
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <HashIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">키워드 그룹</span>
                        </div>
                        <span className="font-semibold truncate text-foreground text-xs">{keywordGroupName}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TerminalIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">사용 프롬프트</span>
                        </div>
                        <span className="font-semibold truncate text-foreground text-xs">{promptTitle}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <ClockIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">발행 주기</span>
                        </div>
                        <span className="font-semibold truncate text-foreground text-xs">{schedule}</span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">다음 실행</span>
                        </div>
                        <span className="font-semibold truncate text-foreground text-xs">{nextRun || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-auto p-4 pt-0 space-y-3">
                {/* Main Toggle Button */}
                <button
                    onClick={handleToggle}
                    disabled={isToggling}
                    className={clsx(
                        "w-full h-14 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg hover:brightness-110 active:scale-[0.98]",
                        status
                            ? "bg-green-500 text-white shadow-green-500/20"
                            : "bg-orange-500 text-white shadow-orange-500/20",
                        isToggling && "opacity-70 cursor-not-allowed"
                    )}
                >
                    {isToggling ? <Loader2Icon className="h-5 w-5 animate-spin" /> :
                        status ? <PauseIcon className="h-5 w-5 fill-current" /> : <PlayIcon className="h-5 w-5 fill-current" />}
                    {status ? '동작중 (클릭하여 일시정지)' : '일시정지됨 (클릭하여 시작)'}
                </button>

                {/* Sub Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href={`/dashboard/tasks/new?edit=${id}`}
                        className="h-12 rounded-xl bg-blue-600 border border-blue-700 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-500/20"
                    >
                        <EditIcon className="h-4 w-4" />
                        수정
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="h-12 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold flex items-center justify-center gap-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 text-sm"
                    >
                        {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
                        삭제
                    </button>
                </div>
            </div>
        </div>
    )
}
