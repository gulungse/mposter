"use client"

import { MoreHorizontal as MoreHorizontalIcon, Hash as HashIcon, Clock as ClockIcon, Trash2 as Trash2Icon, Edit as EditIcon, Loader2 as Loader2Icon, Zap as ZapIcon } from 'lucide-react'
import Link from 'next/link'
import { deleteKeywordGroup } from '@/app/actions/keyword'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'

interface KeywordCardProps {
    id: string
    name: string
    keywords: string[]
    type?: 'MANUAL' | 'AUTO_SIGNAL' // Made optional
    lastUpdated: string
    listMode?: boolean
}

export function KeywordCard({ id, name, keywords, type = 'MANUAL', lastUpdated, listMode = false }: KeywordCardProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`'${name}' 그룹을 정말 삭제하시겠습니까?`)) return

        setIsDeleting(true)
        const result = await deleteKeywordGroup(id)
        if (result.success) {
            router.refresh()
        } else {
            alert(result.message)
            setIsDeleting(false)
        }
    }

    if (listMode) {
        return (
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 transition-all group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <HashIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate text-sm">{name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-extrabold text-muted-foreground border border-border px-1.5 py-0.5 rounded italic uppercase">
                                {keywords.length} keywords
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" /> {lastUpdated}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 px-4 flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                        {keywords.slice(0, 3).map((k, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground border border-border">
                                {k}
                            </span>
                        ))}
                        {keywords.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center font-medium">+{keywords.length - 3}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-border">
                    <Link
                        href={`/dashboard/keywords/${id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-bold transition-all shadow-sm border border-border"
                    >
                        수정
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[32px]"
                    >
                        {isDeleting ? <Loader2Icon className="h-3 w-3 animate-spin" /> : '삭제'}
                    </button>
                    <Link
                        href={`/dashboard/tasks/new?groupId=${id}`}
                        className="ml-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <ZapIcon className="h-3 w-3" />
                        자동 발행
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        type === 'AUTO_SIGNAL' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-muted text-muted-foreground'
                    )}>
                        <HashIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground line-clamp-1 text-sm">{name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border px-1.5 rounded-md">
                                {type === 'AUTO_SIGNAL' ? 'Signal.bz' : 'Manual'}
                            </span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" /> {lastUpdated}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontalIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                    {keywords.slice(0, 5).map((k, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground border border-border">
                            {k}
                        </span>
                    ))}
                    {keywords.length > 5 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground border border-border">
                            +{keywords.length - 5}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Link href={`/dashboard/keywords/${id}`} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 border border-border">
                    <EditIcon className="h-3.5 w-3.5" />
                    수정
                </Link>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive border border-border disabled:opacity-50"
                >
                    {isDeleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    )
}
