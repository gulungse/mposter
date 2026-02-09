'use client'

import { useState, useEffect, Suspense } from 'react'
import {
    LayoutGrid as LayoutGridIcon,
    Zap as ZapIcon,
    Loader2 as Loader2Icon,
    Save as SaveIcon,
    Sparkles as SparklesIcon,
    Layers as LayersIcon,
    CheckCircle2 as CheckCircle2Icon,
    ArrowLeft as ArrowLeftIcon,
    Bot as BotIcon,
    Youtube as YoutubeIcon,
    PlayCircle,
    Copy,
    FileText
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getPrompts } from '@/app/actions/prompt'
import { testPublishAction } from '@/app/actions/worker'
import { getYoutubeTranscriptAction } from '@/app/actions/youtube'

function YoutubeToBlogForm() {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [fetchingTranscript, setFetchingTranscript] = useState(false)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)

    // Data lists
    const [sites, setSites] = useState<any[]>([])
    const [prompts, setPrompts] = useState<any[]>([])
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])

    const [formData, setFormData] = useState({
        youtubeUrl: '',
        transcript: '',
        siteId: '',
        selectedPromptId: '',
        customPrompt: '',
        aiModel: 'GPT4O',
        imageSource: 'DALLE',
        imageCount: 1,
        wpCategoryId: undefined as number | undefined,
        postStatus: 'publish'
    })

    const [isCustomPrompt, setIsCustomPrompt] = useState(false)

    useEffect(() => {
        const loadInitialData = async () => {
            const [sitesRes, promptsRes] = await Promise.all([
                getSites(),
                getPrompts()
            ])
            if (sitesRes.success) setSites(sitesRes.data || [])
            if (promptsRes.success) setPrompts(promptsRes.data || [])
            setLoading(false)
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        const fetchCats = async () => {
            if (!formData.siteId) {
                setCategories([])
                return
            }
            const selectedSite = sites.find(s => s.id === formData.siteId)
            if (selectedSite?.type === 'WORDPRESS') {
                setFetchingCategories(true)
                const res = await getWordPressCategories(formData.siteId)
                if (res.success) setCategories(res.data)
                else setCategories([])
                setFetchingCategories(false)
            } else {
                setCategories([])
            }
        }
        fetchCats()
    }, [formData.siteId, sites])

    const handleFetchTranscript = async () => {
        if (!formData.youtubeUrl.trim()) {
            alert('유튜브 URL을 입력해주세요.')
            return
        }
        setFetchingTranscript(true)
        const res = await getYoutubeTranscriptAction(formData.youtubeUrl)
        if (res.success && res.data) {
            setFormData(prev => ({ ...prev, transcript: res.data!.transcript }))
            alert('스크립트를 성공적으로 가져왔습니다!')
        } else {
            alert(res.error || '스크립트 추출 실패')
        }
        setFetchingTranscript(false)
    }

    const handleGenerate = async () => {
        if (!formData.transcript) {
            alert('먼저 유튜브 스크립트를 가져와주세요.')
            return
        }
        if (!formData.siteId) {
            alert('발행할 사이트를 선택해주세요.')
            return
        }

        const finalPrompt = isCustomPrompt ? formData.customPrompt : prompts.find(p => p.id === formData.selectedPromptId)?.content
        if (!finalPrompt) {
            alert('적용할 프롬프트(지시사항)를 선택하거나 입력해주세요.')
            return
        }

        setTesting(true)
        // Use testPublishAction as the engine for transformation
        const result = await testPublishAction({
            siteId: formData.siteId,
            keywords: ['유튜브 요약 포스팅'], // Temporary keyword as it's required
            customPrompt: finalPrompt,
            transcript: formData.transcript,
            aiModel: formData.aiModel as any,
            imageSource: formData.imageSource as any,
            imageCount: formData.imageCount,
            wpCategoryId: formData.wpCategoryId,
            postStatus: formData.postStatus
        })

        if (result.success) {
            alert('블로그 변환 및 발행 성공!')
        } else {
            alert(result.error || '변환 실패')
        }
        setTesting(false)
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">유튜브 → 블로그</span>
                </nav>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                            <YoutubeIcon className="h-8 w-8 text-red-600" />
                            유튜브 → 블로그 자동 변환
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">영상 스크립트를 추출하여 나만의 스타일로 재구성한 블로그 포스팅을 생성합니다.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: YouTube URL & Transcript Preview */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467] flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <PlayCircle className="h-4 w-4 text-red-600" /> 1. 원본 영상 소스
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.youtubeUrl}
                                    onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="flex-1 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20"
                                />
                                <button
                                    onClick={handleFetchTranscript}
                                    disabled={fetchingTranscript}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                >
                                    {fetchingTranscript ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                    스크립트 추출
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">추출된 스크립트 미리보기</label>
                                <textarea
                                    value={formData.transcript}
                                    readOnly
                                    placeholder="영상 링크 입력 후 추출 버튼을 눌러주세요..."
                                    className="w-full h-80 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl p-4 text-xs font-medium leading-relaxed resize-none text-slate-500 dark:text-slate-400 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467] flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4 text-blue-600" /> 2. 변환 지시사항 (프롬프트)
                            </h3>
                            <div className="bg-slate-100 dark:bg-[#1e293b] p-0.5 rounded-lg flex gap-1">
                                <button
                                    onClick={() => setIsCustomPrompt(false)}
                                    className={`px-3 py-1 text-[10px] font-black rounded ${!isCustomPrompt ? 'bg-white dark:bg-[#111722] shadow-sm text-blue-600' : 'text-slate-500'}`}
                                >저장된 프롬프트</button>
                                <button
                                    onClick={() => setIsCustomPrompt(true)}
                                    className={`px-3 py-1 text-[10px] font-black rounded ${isCustomPrompt ? 'bg-white dark:bg-[#111722] shadow-sm text-blue-600' : 'text-slate-500'}`}
                                >직접 입력</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {!isCustomPrompt ? (
                                <select
                                    value={formData.selectedPromptId}
                                    onChange={e => setFormData({ ...formData, selectedPromptId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="">프롬프트 선택...</option>
                                    {prompts.map(p => (
                                        <option key={p.id} value={p.id}>{p.title} ({p.type})</option>
                                    ))}
                                </select>
                            ) : (
                                <textarea
                                    value={formData.customPrompt}
                                    onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                    placeholder="유튜브 스크립트를 바탕으로 친근한 어조의 블로그 포스팅으로 변환해줘. 제목은 자극적으로, 본문은 3문단 이상으로 구성해."
                                    className="w-full h-40 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl p-4 text-sm font-medium leading-relaxed resize-none outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            )}
                            <p className="mt-3 text-[11px] text-slate-400 font-medium italic">
                                * 프롬프트 내에 {'{{transcript}}'} 플레이스홀더를 사용하면 더 정교한 제어가 가능합니다. (미사용 시 자동으로 상단에 배치됨)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Target Config */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] p-6 space-y-6 shadow-xl sticky top-8">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <LayoutGridIcon className="h-4 w-4" /> 3. 발행 및 모델 설정
                            </h4>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">대상 사이트</label>
                                <select
                                    value={formData.siteId}
                                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">사이트 선택...</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                    ))}
                                </select>
                            </div>

                            {categories.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">카테고리</label>
                                    <select
                                        value={formData.wpCategoryId || ''}
                                        onChange={e => setFormData({ ...formData, wpCategoryId: Number(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    >
                                        <option value="">카테고리 선택 (옵션)</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AI 모델</label>
                                    <select
                                        value={formData.aiModel}
                                        onChange={e => setFormData({ ...formData, aiModel: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-3 text-xs font-black outline-none"
                                    >
                                        <option value="GPT4O">GPT-4o</option>
                                        <option value="CLAUDE">Claude 3.5</option>
                                        <option value="GEMINI">Gemini 2.5</option>
                                        <option value="GPT5">GPT-5 mini</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">발행 상태</label>
                                    <select
                                        value={formData.postStatus}
                                        onChange={e => setFormData({ ...formData, postStatus: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-3 text-xs font-black outline-none"
                                    >
                                        <option value="publish">🚀 즉시 발행</option>
                                        <option value="draft">💾 임시 저장</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">이미지 소스</label>
                                    <select
                                        value={formData.imageSource}
                                        onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-3 text-xs font-black outline-none"
                                    >
                                        <option value="DALLE">DALL-E 3</option>
                                        <option value="FLUX">FLUX Pro</option>
                                        <option value="SCRAP">스크랩</option>
                                        <option value="NONE">없음</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">이미지 수</label>
                                    <select
                                        value={formData.imageCount}
                                        onChange={e => setFormData({ ...formData, imageCount: Number(e.target.value) })}
                                        disabled={formData.imageSource === 'NONE'}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-3 text-xs font-black outline-none disabled:opacity-50"
                                    >
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}개</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleGenerate}
                                disabled={testing || fetchingTranscript}
                                className="w-full py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:grayscale"
                            >
                                {testing ? <Loader2Icon className="h-6 w-6 animate-spin" /> : <SparklesIcon className="h-6 w-6" />}
                                변환 및 블로그 발행 시작
                            </button>
                            <p className="mt-4 text-[11px] text-center text-slate-400 font-bold leading-relaxed px-4">
                                * 대량의 데이터를 처리하므로 변환 완료까지 최대 1-2분이 소요될 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function YoutubePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>}>
            <YoutubeToBlogForm />
        </Suspense>
    )
}
