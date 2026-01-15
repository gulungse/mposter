'use client'

import { useState, useEffect, Suspense } from 'react'
import { ArrowLeft, Hash, Plus, X, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createKeywordGroup, fetchTrendingKeywords } from '@/app/actions/keyword'

function NewKeywordGroupContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [currentKeyword, setCurrentKeyword] = useState('')
    const [keywords, setKeywords] = useState<string[]>([])
    const [isBulk, setIsBulk] = useState(false)
    const [bulkText, setBulkText] = useState('')

    // URL 파라미터로 키워드가 넘어온 경우 자동으로 추가
    useEffect(() => {
        const keywordParam = searchParams.get('keyword')
        if (keywordParam && !keywords.includes(keywordParam)) {
            setKeywords(prev => [...prev, keywordParam])
        }
    }, [searchParams])

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault()
        const textToProcess = isBulk ? bulkText : currentKeyword
        if (!textToProcess.trim()) return

        // 콤마(,), 줄바꿈(\n)으로 분리하여 처리
        const newKeywords = textToProcess
            .split(/,|\n/)
            .map(k => k.trim())
            .filter(k => k !== '' && !keywords.includes(k))

        if (newKeywords.length > 0) {
            setKeywords([...keywords, ...newKeywords])
            if (isBulk) {
                setBulkText('')
                setIsBulk(false) // 추가 후 일반 모드로 복귀 (옵션)
            } else {
                setCurrentKeyword('')
            }
        }
    }

    const removeKeyword = (keyword: string) => {
        setKeywords(keywords.filter(k => k !== keyword))
    }

    const handleFetchSignal = async () => {
        setLoading(true)
        const trending = await fetchTrendingKeywords()
        if (trending && trending.length > 0) {
            setKeywords(prev => Array.from(new Set([...prev, ...trending])))
        } else {
            alert('실시간 검색어를 가져오는데 실패했습니다.')
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string

        const result = await createKeywordGroup(name, keywords)

        setLoading(false)
        if (result.success) {
            router.push('/dashboard/keywords')
            router.refresh()
        } else {
            alert(result.message || '키워드 그룹 생성 실패')
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/keywords" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        키워드 그룹 만들기
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                        자동화 작업에 사용할 키워드 목록을 정의하세요.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">그룹 이름</label>
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="예: 일일 기술 뉴스 키워드"
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">키워드 추가</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBulk(!isBulk)}
                                    className={`text-xs font-bold px-2 py-1 rounded transition-colors ${isBulk
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border dark:border-slate-700'
                                        }`}
                                >
                                    {isBulk ? '일반 입력으로 전환' : '대량 추가(메모장 복사)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFetchSignal}
                                    disabled={loading}
                                    className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    Signal.bz 키워드
                                </button>
                            </div>
                        </div>

                        {isBulk ? (
                            <div className="space-y-2">
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="키워드를 콤마(,)나 줄바꿈으로 구분하여 여러 개 입력하세요.&#10;예: 키워드1, 키워드2&#10;키워드3&#10;키워드4"
                                    className="w-full h-32 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium resize-none text-slate-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddKeyword}
                                    disabled={!bulkText.trim()}
                                    className="w-full bg-slate-800 dark:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    입력한 키워드 모두 추가하기
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentKeyword}
                                    onChange={(e) => setCurrentKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(e)}
                                    placeholder="키워드를 입력하고 엔터를 누르세요"
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddKeyword}
                                    className="bg-slate-100 dark:bg-[#232f48] text-slate-600 dark:text-white px-4 py-2.5 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-[#324467] transition-colors"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-slate-400">
                            {isBulk ? '복사한 키워드를 붙여넣고 버튼을 누르세요' : '엔터 키를 눌러 태그를 추가하거나 콤마(,)로 구분해 입력하세요'}
                        </p>
                    </div>

                    {/* Keyword Chips */}
                    <div className="min-h-[100px] p-4 rounded-lg border border-dashed border-slate-200 dark:border-[#324467] bg-slate-50/50 dark:bg-[#101622]/50">
                        {keywords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <Hash className="h-8 w-8 opacity-20" />
                                <span className="text-sm">추가된 키워드가 없습니다</span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {keywords.map((keyword, index) => (
                                    <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-100 dark:border-blue-900/30">
                                        {keyword}
                                        <button type="button" onClick={() => removeKeyword(keyword)} className="hover:text-red-500 transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-[#232f48]">
                        <Link
                            href="/dashboard/keywords"
                            className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232f48] transition-colors"
                        >
                            취소
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || keywords.length === 0}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            그룹 저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function NewKeywordGroupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewKeywordGroupContent />
        </Suspense>
    )
}
