'use client'

import { useState, useEffect, use } from 'react'
import { ArrowLeft, Hash, Plus, X, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getKeywordGroup, updateKeywordGroup, deleteKeywordGroup, fetchTrendingKeywords } from '@/app/actions/keyword'

export default function EditKeywordGroupPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [groupName, setGroupName] = useState('')
    const [currentKeyword, setCurrentKeyword] = useState('')
    const [keywords, setKeywords] = useState<string[]>([])
    const [isBulk, setIsBulk] = useState(false)
    const [bulkText, setBulkText] = useState('')

    useEffect(() => {
        async function loadGroup() {
            const result = await getKeywordGroup(id)
            if (result.success && result.data) {
                setGroupName(result.data.name)
                setKeywords(result.data.keywords)
            } else {
                alert(result.message || '그룹을 불러오지 못했습니다.')
                router.push('/dashboard/keywords')
            }
            setLoading(false)
        }
        loadGroup()
    }, [id, router])

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault()
        const textToProcess = isBulk ? bulkText : currentKeyword
        if (!textToProcess.trim()) return

        const newKeywords = textToProcess
            .split(/,|\n/)
            .map(k => k.trim())
            .filter(k => k !== '' && !keywords.includes(k))

        if (newKeywords.length > 0) {
            setKeywords([...keywords, ...newKeywords])
            if (isBulk) {
                setBulkText('')
                setIsBulk(false)
            } else {
                setCurrentKeyword('')
            }
        }
    }

    const removeKeyword = (keyword: string) => {
        setKeywords(keywords.filter(k => k !== keyword))
    }

    const handleFetchSignal = async () => {
        setSaving(true)
        const trending = await fetchTrendingKeywords()
        if (trending && trending.length > 0) {
            setKeywords(prev => Array.from(new Set([...prev, ...trending])))
        }
        setSaving(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const result = await updateKeywordGroup(id, groupName, keywords)

        setSaving(false)
        if (result.success) {
            router.push('/dashboard/keywords')
            router.refresh()
        } else {
            alert(result.message)
        }
    }

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        setSaving(true)
        const result = await deleteKeywordGroup(id)
        if (result.success) {
            router.push('/dashboard/keywords')
            router.refresh()
        } else {
            alert(result.message)
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/keywords" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            키워드 그룹 수정
                        </h1>
                        <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                            키워드 목록을 업데이트 하세요.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    title="그룹 삭제"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>

            <div className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">그룹 이름</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
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
                                    {isBulk ? '일반 입력전환' : '대량 추가(메모장)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFetchSignal}
                                    disabled={saving}
                                    className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
                                    Signal.bz 키워드
                                </button>
                            </div>
                        </div>

                        {isBulk ? (
                            <div className="space-y-2">
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="콤마(,)나 줄바꿈으로 구분"
                                    className="w-full h-32 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddKeyword}
                                    className="w-full bg-slate-800 dark:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm"
                                >
                                    모두 추가하기
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentKeyword}
                                    onChange={(e) => setCurrentKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(e)}
                                    placeholder="키워드 입력"
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddKeyword}
                                    className="bg-slate-100 dark:bg-[#232f48] text-slate-600 dark:text-white px-4 py-2.5 rounded-lg font-bold"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="min-h-[100px] p-4 rounded-lg border border-dashed border-slate-200 dark:border-[#324467] bg-slate-50/50 dark:bg-[#101622]/50">
                        <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, index) => (
                                <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-100 dark:border-blue-900/30">
                                    {keyword}
                                    <button type="button" onClick={() => removeKeyword(keyword)} className="hover:text-red-500">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-[#232f48]">
                        <Link href="/dashboard/keywords" className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                            취소
                        </Link>
                        <button
                            type="submit"
                            disabled={saving || keywords.length === 0}
                            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            변경내용 저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
