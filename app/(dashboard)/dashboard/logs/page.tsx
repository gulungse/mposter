import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatInKST } from '@/lib/date'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
    const user = await getOrCreateUser()

    // 최근 100개의 로그를 가져옴 (내림차순)
    const logs = await prisma.postLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { job: true }
    })

    return (
        <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-900 rounded-lg">
                    <Terminal className="h-5 w-5 text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                        SYSTEM_LOGS
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                        Showing last {logs.length} entries • real-time monitor
                    </p>
                </div>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono text-xs md:text-sm">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="text-slate-500 text-[10px]">
                        user@{user.email?.split('@')[0]} : ~/logs
                    </div>
                </div>

                {/* Logs Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {logs.map((log) => {
                        const time = formatInKST(log.createdAt, 'MM/dd HH:mm:ss')
                        const isError = log.status === 'FAILED'
                        const isSuccess = log.status === 'SUCCESS'

                        return (
                            <div key={log.id} className="group flex items-start gap-2 hover:bg-slate-900/50 -mx-2 px-2 py-0.5 rounded transition-colors">
                                <span className={cn(
                                    "shrink-0 w-[110px] opacity-50",
                                    isError ? "text-red-400" : "text-slate-500"
                                )}>
                                    [{time}]
                                </span>

                                <span className={cn(
                                    "shrink-0 font-bold w-[80px]",
                                    isSuccess && "text-green-400",
                                    isError && "text-red-500",
                                    !isSuccess && !isError && "text-blue-400 animate-pulse"
                                )}>
                                    {log.status}
                                </span>

                                <div className="flex-1 break-all text-slate-300">
                                    <span className="text-slate-500 mr-2">
                                        [{log.job?.name || "MANUAL_TASK"}]
                                    </span>
                                    <span className={cn(isError && "text-red-300")}>
                                        {log.errorMessage ? (
                                            <>
                                                Error: {log.errorMessage} <span className="opacity-50 text-[10px] ml-1">({log.keyword})</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-yellow-100/70">"{log.keyword}"</span>
                                                {log.postUrl && (
                                                    <a href={log.postUrl} target="_blank" className="ml-2 text-blue-400 hover:underline opacity-70 hover:opacity-100">
                                                        [LINK] &rarr;
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )
                    })}

                    {logs.length === 0 && (
                        <div className="text-slate-600 text-center py-20 italic">
                            // No logs found. System is waiting for tasks...
                        </div>
                    )}

                    <div className="h-4" /> {/* Bottom spacer for scroll */}
                </div>
            </div>
        </div>
    )
}
