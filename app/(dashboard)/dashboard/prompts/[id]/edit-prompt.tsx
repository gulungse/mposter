'use client'

import { useState } from 'react'
import { ArrowLeft, Sparkles, Info } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updatePrompt } from '@/app/actions/prompt'

interface EditPromptProps {
    prompt: {
        id: string
        title: string
        content: string
    }
}

export default function EditPrompt({ prompt }: EditPromptProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [promptContent, setPromptContent] = useState(prompt.content)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const title = formData.get('title') as string

        const result = await updatePrompt(prompt.id, {
            title,
            content: promptContent
        })

        if (result.success) {
            router.push('/dashboard/prompts')
            router.refresh()
        } else {
            setError(result.error || '수정 중 오류가 발생했습니다.')
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Link href="/dashboard/prompts" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        프롬프트 수정
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                        기존 프롬프트를 개선하고 업데이트하세요.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Column */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">프롬프트 제목</label>
                            <input
                                name="title"
                                type="text"
                                required
                                defaultValue={prompt.title}
                                placeholder="예: 친절한 테크 리뷰어"
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">시스템 지시사항 (System Prompt)</label>
                                <span className="text-xs text-slate-400">총 글자 수: {promptContent.length}</span>
                            </div>
                            <textarea
                                required
                                rows={12}
                                value={promptContent}
                                onChange={(e) => setPromptContent(e.target.value)}
                                placeholder="당신은 전문 카피라이터입니다. 당신의 임무는..."
                                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono leading-relaxed resize-none text-slate-900 dark:text-white"
                            />
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                <code>{`{{keywords}}`}</code> 또는 <code>{`{{title}}`}</code> 같은 변수를 사용하여 동적 콘텐츠를 주입하세요.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-[#232f48]">
                            <Link
                                href="/dashboard/prompts"
                                className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232f48] transition-colors"
                            >
                                취소
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                수정사항 저장
                            </button>
                        </div>
                    </form>
                </div>

                {/* Tips Column */}
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-900/20">
                        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> 작성 팁 (Pro Tips)
                        </h3>
                        <ul className="space-y-3 text-sm text-blue-700 dark:text-blue-400/80">
                            <li className="flex gap-2">
                                <span className="text-blue-500">•</span>
                                페르소나를 구체적으로 설정하세요 (예: "냉소적인 영화 평론가").
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-500">•</span>
                                출력 형식을 명확히 정의하세요 (예: "마크다운 헤딩과 불릿 포인트 사용").
                            </li>
                            <li className="flex gap-2">
                                <span className="text-blue-500">•</span>
                                제약 사항을 언급하세요 (예: "전문 용어 사용 금지", "500자 이내").
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-[#111722] rounded-xl p-6 border border-slate-200 dark:border-[#324467]">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">사용 가능 변수</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#101622] text-xs font-mono">
                                <span className="text-slate-600 dark:text-slate-300">{`{{title}}`}</span>
                                <span className="text-slate-400">글 제목</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#101622] text-xs font-mono">
                                <span className="text-slate-600 dark:text-slate-300">{`{{keywords}}`}</span>
                                <span className="text-slate-400">타겟 키워드</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#101622] text-xs font-mono">
                                <span className="text-slate-600 dark:text-slate-300">{`{{content}}`}</span>
                                <span className="text-slate-400">원본 내용</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
