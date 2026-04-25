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
    Terminal as TerminalIcon,
    PlayCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getKeywordGroups } from '@/app/actions/keyword'
import { testPublishAction } from '@/app/actions/worker'

function PromptTestForm() {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)

    // Data lists
    const [sites, setSites] = useState<any[]>([])
    const [keywordGroups, setKeywordGroups] = useState<any[]>([])
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])

    const [formData, setFormData] = useState({
        siteId: '',
        keywordGroupId: '',
        customPrompt: '',
        aiModel: 'GPT_5_4',
        imageSource: 'DALLE',
        imageCount: 1,
        wpCategoryId: undefined as number | undefined,
        postStatus: 'publish'
    })

    const [keywordMode, setKeywordMode] = useState<'GROUP' | 'MANUAL'>('GROUP')
    const [manualKeywords, setManualKeywords] = useState('')

    useEffect(() => {
        const loadInitialData = async () => {
            const [sitesRes, keywordsRes] = await Promise.all([
                getSites(),
                getKeywordGroups()
            ])
            if (sitesRes.success) setSites(sitesRes.data || [])
            if (keywordsRes.success) setKeywordGroups(keywordsRes.data || [])
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

    const handleTestPublish = async () => {
        if (!formData.customPrompt.trim()) {
            alert('테스트할 프롬프트를 입력해주세요.')
            return
        }

        let finalGroupId: string | undefined = formData.keywordGroupId
        let finalKeywords: string[] | undefined = undefined

        if (keywordMode === 'MANUAL') {
            if (!manualKeywords.trim()) { alert('키워드를 입력해주세요.'); return; }
            const kws = manualKeywords.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
            if (kws.length === 0) { alert('유효한 키워드가 없습니다.'); return; }

            finalGroupId = undefined
            finalKeywords = kws
        } else {
            if (!formData.siteId || !formData.keywordGroupId) {
                alert('사이트와 키워드를 모두 선택해주세요.')
                return
            }
        }

        setTesting(true)
        const result = await testPublishAction({
            siteId: formData.siteId,
            keywordGroupId: finalGroupId as any,
            keywords: finalKeywords,
            customPrompt: formData.customPrompt,
            aiModel: formData.aiModel as any,
            imageSource: formData.imageSource as any,
            imageCount: formData.imageCount,
            wpCategoryId: formData.wpCategoryId,
            postStatus: formData.postStatus
        })
        if (result.success) {
            alert('테스트 발행 성공! 실제 사이트에서 확인해 보세요.')
        } else {
            alert(result.error || '테스트 발행 실패')
        }
        setTesting(false)
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard/prompts" className="hover:text-foreground transition-colors">Prompts</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Test Environment</span>
                </nav>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                            <TerminalIcon className="h-7 w-7 text-blue-600" />
                            프롬프트 실시간 테스트
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">프롬프트를 직접 입력하여 다양한 조건에서 즉시 발행 테스트를 수행합니다.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Prompt Editor (Main) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="px-6 py-4 bg-slate-50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467] flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4 text-blue-600" /> SYSTEM PROMPT (LIVE)
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">직접 수정하며 테스트하세요</span>
                        </div>
                        <div className="flex-1 p-1">
                            <textarea
                                value={formData.customPrompt}
                                onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                placeholder="당신은 전문 카피라이터입니다. {{keywords}}를 주제로 전문적인 블로그 포스팅을 작성하세요..."
                                className="w-full h-full min-h-[450px] p-6 text-sm font-medium bg-transparent border-none outline-none resize-none leading-relaxed text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Configuration Sidebar */}
                <div className="space-y-6">
                    {/* Site & Category */}
                    <div className="bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] p-5 space-y-4 shadow-sm">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <LayoutGridIcon className="h-3.5 w-3.5" /> 1. 타겟 사이트
                        </h4>
                        <div className="space-y-3">
                            <select
                                value={formData.siteId}
                                onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">사이트 선택...</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                ))}
                            </select>
                            {(categories.length > 0 || fetchingCategories) && (
                                <select
                                    value={formData.wpCategoryId || ''}
                                    onChange={e => setFormData({ ...formData, wpCategoryId: Number(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">{fetchingCategories ? '카테고리 로딩 중...' : '카테고리 선택 (옵션)'}</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] p-5 space-y-4 shadow-sm">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ZapIcon className="h-3.5 w-3.5 text-amber-500" /> 2. 테스트 키워드
                            </h4>
                            <div className="bg-slate-100 dark:bg-[#1e293b] p-0.5 rounded-lg flex gap-1">
                                <button
                                    onClick={() => setKeywordMode('GROUP')}
                                    className={`px-2 py-1 text-[9px] font-black rounded ${keywordMode === 'GROUP' ? 'bg-white dark:bg-[#111722] shadow-sm text-blue-600' : 'text-slate-500'}`}
                                >그룹</button>
                                <button
                                    onClick={() => setKeywordMode('MANUAL')}
                                    className={`px-2 py-1 text-[9px] font-black rounded ${keywordMode === 'MANUAL' ? 'bg-white dark:bg-[#111722] shadow-sm text-blue-600' : 'text-slate-500'}`}
                                >수동</button>
                            </div>
                        </div>
                        {keywordMode === 'GROUP' ? (
                            <select
                                value={formData.keywordGroupId}
                                onChange={e => setFormData({ ...formData, keywordGroupId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">키워드 그룹 선택...</option>
                                {keywordGroups.map(k => (
                                    <option key={k.id} value={k.id}>{k.name}</option>
                                ))}
                            </select>
                        ) : (
                            <textarea
                                value={manualKeywords}
                                onChange={e => setManualKeywords(e.target.value)}
                                placeholder="테스트할 키워드 입력..."
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24"
                            />
                        )}
                    </div>

                    {/* AI Model */}
                    <div className="bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] p-5 space-y-4 shadow-sm">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <BotIcon className="h-3.5 w-3.5 text-blue-500" /> 3. AI 및 이미지 옵션
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">AI 모델</label>
                                <select
                                    value={formData.aiModel}
                                    onChange={e => setFormData({ ...formData, aiModel: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                >
                                    <optgroup label="OpenAI (GPT-5 / o1)">
                                        <option value="GPT_5_4">GPT-5.4</option>
                                        <option value="GPT_5_4_MINI">GPT-5.4 mini</option>
                                        <option value="GPT_5_4_THINKING">GPT-5.4 Thinking</option>
                                        <option value="GPT4O">GPT-4o (Legacy)</option>
                                    </optgroup>
                                    <optgroup label="Google (Gemini)">
                                        <option value="GEMINI_3_1_PRO_PREVIEW">Gemini 3.1 Pro</option>
                                        <option value="GEMINI_2_5_PRO">Gemini 2.5 Pro</option>
                                        <option value="GEMINI_2_5_FLASH">Gemini 2.5 Flash</option>
                                    </optgroup>
                                    <optgroup label="Anthropic (Claude 4)">
                                        <option value="CLAUDE_4_OPUS">Claude 4 Opus</option>
                                        <option value="CLAUDE_4_SONNET">Claude 4 Sonnet</option>
                                        <option value="CLAUDE_4_HAIKU">Claude 4 Haiku</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">발행 상태</label>
                                <select
                                    value={formData.postStatus}
                                    onChange={e => setFormData({ ...formData, postStatus: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="publish">즉시 발행</option>
                                    <option value="draft">임시 저장</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">이미지 소스</label>
                                <select
                                    value={formData.imageSource}
                                    onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="DALLE">DALL-E 3</option>
                                    <option value="FLUX">FLUX Pro</option>
                                    <option value="SCRAP">스크랩</option>
                                    <option value="NONE">없음</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">이미지 수</label>
                                <select
                                    value={formData.imageCount}
                                    onChange={e => setFormData({ ...formData, imageCount: Number(e.target.value) })}
                                    disabled={formData.imageSource === 'NONE'}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none disabled:opacity-50"
                                >
                                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}개</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600/5 dark:bg-blue-600/10 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-5 space-y-3">
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed italic">
                            * 테스트 발행 시에는 실제 발행과 동일하게 AI 및 이미지 생성 비용(토큰)이 발생합니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 pl-72">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
                    <div className="flex-1 flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Standby: Ready for execution</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => alert('미리보기 기능은 준비 중입니다. 현재는 실제 사이트 발행 테스트만 가능합니다.')}
                            className="px-6 py-4 border-2 border-slate-200 dark:border-[#324467] text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs hover:bg-slate-50 dark:hover:bg-[#192233] transition-all"
                        >
                            결과 미리보기 (UI전용)
                        </button>
                        <button
                            onClick={handleTestPublish}
                            disabled={testing}
                            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 flex items-center gap-3 transition-all active:scale-95"
                        >
                            {testing ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                            실제 사이트 테스트 발행 시행
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function PromptTestPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>}>
            <PromptTestForm />
        </Suspense>
    )
}
