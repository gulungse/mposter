import { PromptCard } from '@/components/prompt/prompt-card'
import { Plus as PlusIcon, Search as SearchIcon, Sparkles as SparklesIcon, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { getPrompts } from '@/app/actions/prompt'
import { getUserWithPlan } from '@/app/actions/plan'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
    const [{ data: prompts = [] }, planRes] = await Promise.all([
        getPrompts(),
        getUserWithPlan()
    ])

    const systemPrompts = prompts.filter(p => p.type === 'SYSTEM')
    const userPrompts = prompts.filter(p => p.type === 'USER')

    const limit = (planRes.success && (planRes.data as any).plan?.promptLimit) ?? 3
    const isLimitReached = userPrompts.length >= limit

    return (
        <div className="p-5 space-y-5">
            {/* Warning Message */}
            {isLimitReached && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div className="text-sm font-bold">
                        현재 프롬프트 생성 가능한 슬롯({limit}개)을 모두 사용 중입니다. 추가 생성을 원하시면 플랜을 업그레이드해주세요.
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                        프롬프트 라이브러리
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        시스템 프리셋 및 나만의 AI 프롬프트를 관리하세요.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* System Prompts Section */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" /> 시스템 프리셋
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {systemPrompts.map(prompt => (
                            <PromptCard
                                key={prompt.id}
                                id={prompt.id}
                                title={prompt.title}
                                preview={prompt.content}
                                type="SYSTEM"
                            />
                        ))}
                        {systemPrompts.length === 0 && (
                            <p className="text-xs text-muted-foreground py-8 col-span-full text-center border border-dashed border-border rounded-xl">기본 시스템 프롬프트가 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* User Prompts Section */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <PlusIcon className="h-4 w-4" /> 내 프롬프트
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {userPrompts.map(prompt => (
                            <PromptCard
                                key={prompt.id}
                                id={prompt.id}
                                title={prompt.title}
                                preview={prompt.content}
                                type="USER"
                            />
                        ))}

                        {/* Add New Button */}
                        {!isLimitReached && (
                            <Link href="/dashboard/prompts/new" className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-5 hover:bg-muted/50 transition-colors h-full min-h-[160px]">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <PlusIcon className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                                </div>
                                <p className="font-bold text-xs text-muted-foreground group-hover:text-primary">맞춤형 프롬프트 추가</p>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
