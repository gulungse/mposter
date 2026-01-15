
import { Copy as CopyIcon, Edit as EditIcon, MoreHorizontal as MoreHorizontalIcon, Shield as ShieldIcon, Sparkles as SparklesIcon, Trash2 as Trash2Icon, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

interface PromptCardProps {
    id: string
    title: string
    preview: string
    type: 'SYSTEM' | 'USER'
}

export function PromptCard({ id, title, preview, type }: PromptCardProps) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        type === 'SYSTEM' ? "bg-purple-500/10 text-purple-600" : "bg-primary/10 text-primary"
                    )}>
                        {type === 'SYSTEM' ? <ShieldIcon className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground line-clamp-1 text-sm">{title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={clsx(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 rounded-md border",
                                type === 'SYSTEM'
                                    ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                    : "bg-primary/10 text-primary border-primary/20"
                            )}>
                                {type === 'SYSTEM' ? 'System Preset' : 'Custom'}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontalIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-border/50">
                <p className="text-[11px] text-muted-foreground font-mono line-clamp-3 leading-relaxed">
                    {preview}
                </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
                {type === 'SYSTEM' ? (
                    <button className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 border border-border">
                        <CopyIcon className="h-3.5 w-3.5" />
                        복제하기
                    </button>
                ) : (
                    <>
                        <Link href={`/dashboard/prompts/${id}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 border border-border">
                            <EditIcon className="h-3.5 w-3.5" />
                            수정
                        </Link>
                        <button className="flex items-center justify-center rounded-xl bg-secondary p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive border border-border">
                            <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
