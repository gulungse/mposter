'use client'

import { Globe as GlobeIcon, MoreHorizontal as MoreHorizontalIcon, Settings as SettingsIcon, Trash2 as Trash2Icon, ExternalLink as ExternalLinkIcon, Loader2 as Loader2Icon, Zap as ZapIcon } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { deleteSite } from '@/app/actions/site'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SiteCardProps {
    id: string
    name: string
    url: string
    type: 'WORDPRESS' | 'BLOGSPOT'
    status: 'ACTIVE' | 'ERROR'
    createdAt: string | Date
    onCreateTask?: () => void
    onDeleted?: () => void
}

export function SiteCard({ id, name, url, type, status, createdAt, onCreateTask, onDeleted }: SiteCardProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`정말로 '${name}' 사이트를 삭제하시겠습니까?`)) return
        setIsDeleting(true)
        const res = await deleteSite(id)
        if (res.success) {
            router.refresh()
            if (onDeleted) onDeleted()
        } else {
            alert(res.error || '삭제 실패')
            setIsDeleting(false)
        }
    }

    return (
        <div className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-border bg-white p-1",
                    )}>
                        <img
                            src={type === 'WORDPRESS' ? "/icons/wordpress.png" : "/icons/blogspot.png"}
                            alt={type}
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground line-clamp-1 text-sm">{name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{type === 'WORDPRESS' ? 'WordPress' : 'Blogger'}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                                {new URL(url).hostname} <ExternalLinkIcon className="h-2 w-2" />
                            </a>
                        </div>
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontalIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-t border-border border-b">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">상태</span>
                    <span className={clsx(
                        "inline-flex items-center gap-1.5 w-fit py-0.5 px-2 rounded-full text-[10px] font-bold border uppercase",
                        status === 'ACTIVE'
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                        <div className={clsx("size-1.5 rounded-full", status === 'ACTIVE' ? "bg-green-500" : "bg-red-500")} />
                        {status === 'ACTIVE' ? '정상' : '에러'}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">등록일</span>
                    <span className="text-xs font-bold text-foreground">
                        {new Date(createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onCreateTask}
                    className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <ZapIcon className="h-3.5 w-3.5" />
                    자동화 생성
                </button>
                <Link href={`/dashboard/sites/${id}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 border border-border">
                    <SettingsIcon className="h-3.5 w-3.5" />
                    설정
                </Link>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 border border-border group/delete disabled:opacity-50"
                >
                    {isDeleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5 transition-colors" />}
                </button>
            </div>
        </div>
    )
}
