
import { PromptCard } from '@/components/prompt/prompt-card'
import { Plus as PlusIcon, Search as SearchIcon, Sparkles as SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { getPrompts } from '@/app/actions/prompt'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
    const { data: prompts = [] } = await getPrompts()

    const systemPrompts = prompts.filter(p => p.type === 'SYSTEM')
    const userPrompts = prompts.filter(p => p.type === 'USER')

    return (
        <div className="p-5 space-y-5">
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
                <Link
                    href="/dashboard/prompts/new"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-blue-500/20 transition-all w-fit"
                >
                    <PlusIcon className="h-4 w-4" />
                    새 프롬프트 만들기
                </Link>
            </div>

            {/* Filters & Tabs (Visual only for now) */}
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="프롬프트 검색..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                </label>
                <div className="flex bg-muted p-1 rounded-xl border border-border">
                    <button className="px-4 py-1.5 rounded-lg bg-card shadow-sm text-xs font-bold text-foreground">전체</button>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">시스템</button>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">내 프롬프트</button>
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
                        <Link href="/dashboard/prompts/new" className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-5 hover:bg-muted/50 transition-colors h-full min-h-[160px]">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <PlusIcon className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                            </div>
                            <p className="font-bold text-xs text-muted-foreground group-hover:text-primary">맞춤형 프롬프트 추가</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
