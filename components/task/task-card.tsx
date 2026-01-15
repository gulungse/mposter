
import { MoreHorizontal as MoreHorizontalIcon, Play as PlayIcon, Pause as PauseIcon, Clock as ClockIcon, ArrowRight as ArrowRightIcon, Image as ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'

interface TaskCardProps {
    id: string
    name: string
    siteName: string
    keywordGroupName: string
    schedule: string
    status: 'RUNNING' | 'PAUSED' | 'COMPLETED'
    lastRun?: string
    nextRun?: string
    totalPosts: number
}

export function TaskCard({
    id,
    name,
    siteName,
    keywordGroupName,
    schedule,
    status,
    lastRun,
    nextRun,
    totalPosts
}: TaskCardProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="p-5 pb-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                            status === 'RUNNING'
                                ? "bg-green-500/10 text-green-500"
                                : status === 'PAUSED'
                                    ? "bg-orange-500/10 text-orange-500"
                                    : "bg-muted text-muted-foreground"
                        )}>
                            {status === 'RUNNING' ? <PlayIcon className="h-4 w-4 fill-current" /> :
                                status === 'PAUSED' ? <PauseIcon className="h-4 w-4 fill-current" /> :
                                    <ClockIcon className="h-4 w-4" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground line-clamp-1 text-sm">{name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                <span className={clsx(
                                    "font-bold",
                                    status === 'RUNNING' ? "text-green-500" : "text-orange-500"
                                )}>{status}</span>
                                <span>•</span>
                                <span>{schedule}</span>
                            </div>
                        </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontalIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-2.5 rounded-lg bg-muted/50">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Target Site</span>
                        <span className="font-semibold text-foreground line-clamp-1">{siteName}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Keyword Group</span>
                        <span className="font-semibold text-foreground line-clamp-1">{keywordGroupName}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
                    <div className="flex items-center gap-3">
                        <span>Last: {lastRun || 'Never'}</span>
                        <span>Next: {nextRun || 'Manual'}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                        <ImageIcon className="h-3 w-3" />
                        {totalPosts} Posts
                    </div>
                </div>
            </div>

            <div className="flex items-center border-t border-border">
                <Link href={`/dashboard/tasks/${id}`} className="flex-1 py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-b-xl flex items-center justify-center gap-1.5 group/link">
                    View Details
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </Link>
            </div>
        </div>
    )
}
