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
    Image as ImageIcon,
    Plus,
    X,
    Images,
    Brain
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getKeywordGroups } from '@/app/actions/keyword'
import { getPrompts } from '@/app/actions/prompt'
import { createAutomationTask, getAutomationTask, updateAutomationTask } from '@/app/actions/task'
import { testPublishAction } from '@/app/actions/worker'
import { getUserProfile } from '@/app/actions/user'
import { getGlobalSettings } from '@/app/actions/settings'
import { clsx } from 'clsx'
import { TaskAgreementModal } from '@/components/task/task-agreement-modal'
import { ShieldCheck } from 'lucide-react'

function TaskForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editTaskId = searchParams.get('edit')

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false)
    const [isAgreed, setIsAgreed] = useState(false)
    const [taskDataFromDb, setTaskDataFromDb] = useState<any>(null)

    // Data lists
    const [sites, setSites] = useState<any[]>([])
    const [keywordGroups, setKeywordGroups] = useState<any[]>([])
    const [prompts, setPrompts] = useState<any[]>([])
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])
    const [hasAdvancedRights, setHasAdvancedRights] = useState(false)
    const [costs, setCosts] = useState({ costPerPost: 1, costPerScrap: 1, costPerAIImage: 2 })

    const [formData, setFormData] = useState({
        name: '',
        siteId: '',
        keywordGroupId: '',
        promptId: '',
        scheduleCron: '0 * * * *',
        initialRunAt: '',
        aiModel: 'GPT_5_4',
        imageSource: 'DALLE',
        imageCount: 1,
        wpCategoryId: undefined as number | undefined,
        postStatus: 'publish',
        advThumbnailLines: ['', '', '', ''],
        advContentPhraseA: '',
        advContentPhraseB: '',
        advImageMode: 'STANDARD',
        advCustomImages: [] as string[],
        useThumbnailTemplate: true
    })

    const [keywordMode, setKeywordMode] = useState<'GROUP' | 'MANUAL'>('GROUP')
    const [manualKeywords, setManualKeywords] = useState('')

    useEffect(() => {
        const urlKeyword = searchParams.get('keyword')
        if (urlKeyword) {
            setKeywordMode('MANUAL')
            setManualKeywords(urlKeyword)
        }
    }, [searchParams])

    useEffect(() => {
        const loadInitialData = async () => {
            const [sitesRes, keywordsRes, promptsRes, profileRes, settingsRes] = await Promise.all([
                getSites(),
                getKeywordGroups(),
                getPrompts(),
                getUserProfile(),
                getGlobalSettings()
            ])
            if (sitesRes.success) setSites(sitesRes.data || [])
            if (keywordsRes.success) setKeywordGroups(keywordsRes.data || [])
            if (promptsRes.success) setPrompts(promptsRes.data || [])
            if (profileRes.success) setHasAdvancedRights(profileRes.data?.hasImageGenRights || false)
            if (settingsRes.success && settingsRes.data) {
                setCosts({
                    costPerPost: settingsRes.data.costPerPost || 1,
                    costPerScrap: settingsRes.data.costPerScrap || 1,
                    costPerAIImage: settingsRes.data.costPerAIImage || 2
                })
            }

            // If editing, load task data
            if (editTaskId) {
                const taskRes = await getAutomationTask(editTaskId)
                if (taskRes.success && taskRes.data) {
                    const t = taskRes.data

                    // Handle Manual Keywords
                    let mode: 'GROUP' | 'MANUAL' = 'GROUP'
                    let kws = ''
                    if (t.keywords && t.keywords.length > 0) {
                        mode = 'MANUAL'
                        kws = t.keywords.join('\n')
                        setKeywordMode('MANUAL')
                        setManualKeywords(kws)
                    }

                    setFormData({
                        name: t.name,
                        siteId: t.siteId || '',
                        keywordGroupId: t.keywordGroupId || '',
                        promptId: t.promptId || '',
                        scheduleCron: t.scheduleCron || '0 * * * *',
                        initialRunAt: '', // 수정 시 최초 재시작 시간 지정
                        aiModel: (t as any).aiModel || 'GPT4O',
                        imageSource: (t as any).imageSource || 'DALLE',
                        imageCount: (t as any).imageCount || 1,
                        wpCategoryId: (t as any).wpCategoryId,
                        postStatus: (t as any).postStatus || 'publish',
                        advThumbnailLines: (t as any).advThumbnailLines || ['', '', '', ''],
                        advContentPhraseA: (t as any).advContentPhraseA || '',
                        advContentPhraseB: (t as any).advContentPhraseB || '',
                        advImageMode: (t as any).advImageMode || 'STANDARD',
                        advCustomImages: (t as any).advCustomImages || [],
                        useThumbnailTemplate: (t as any).useThumbnailTemplate ?? true
                    })
                    setTaskDataFromDb(t)
                } else {
                    alert('작업 정보를 불러올 수 없습니다.')
                    router.push('/dashboard/tasks')
                }
            }
            setLoading(false)
        }
        loadInitialData()
    }, [editTaskId, router])

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
        let finalGroupId: string | undefined = formData.keywordGroupId
        let finalKeywords: string[] | undefined = undefined

        if (keywordMode === 'MANUAL') {
            if (!manualKeywords.trim()) { alert('키워드를 입력해주세요.'); return; }
            const kws = manualKeywords.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
            if (kws.length === 0) { alert('유효한 키워드가 없습니다.'); return; }

            finalGroupId = undefined
            finalKeywords = kws
        } else {
            if (!formData.siteId || !formData.keywordGroupId || !formData.promptId) {
                alert('사이트, 키워드, 지시사항을 모두 선택해주세요.')
                return
            }
        }

        setTesting(true)
        const result = await testPublishAction({
            siteId: formData.siteId,
            keywordGroupId: finalGroupId as any,
            keywords: finalKeywords,
            promptId: formData.promptId,
            aiModel: formData.aiModel as any,
            imageSource: formData.imageSource as any,
            imageCount: formData.imageCount,
            wpCategoryId: formData.wpCategoryId,
            postStatus: formData.postStatus,
            advThumbnailLines: formData.advThumbnailLines,
            advContentPhraseA: formData.advContentPhraseA,
            advContentPhraseB: formData.advContentPhraseB,
            advImageMode: formData.advImageMode,
            advCustomImages: formData.advCustomImages,
            useThumbnailTemplate: formData.useThumbnailTemplate
        })
        if (result.success) {
            alert('테스트 발행 성공! 실제 사이트에서 확인해 보세요.')
        } else {
            alert(result.error || '테스트 발행 실패')
        }
        setTesting(false)
    }

    const handleSubmit = async (bypassAgreement = false) => {
        let finalGroupId: string | undefined = formData.keywordGroupId
        let finalKeywords: string[] | undefined = undefined

        if (keywordMode === 'MANUAL') {
            if (!manualKeywords.trim()) { alert('키워드를 입력해주세요.'); return; }
            const kws = manualKeywords.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
            if (kws.length === 0) { alert('유효한 키워드가 없습니다.'); return; }

            finalGroupId = undefined
            finalKeywords = kws
        } else {
            if (!formData.name || !formData.siteId || !formData.keywordGroupId || !formData.promptId) {
                alert('필수 항목을 모두 입력해주세요.')
                return
            }
        }

        // 새 작업인 경우 동의 팝업 체크
        if (!editTaskId && !bypassAgreement) {
            setIsAgreementModalOpen(true)
            return
        }

        setSubmitting(true)
        let finalInitialRunAt = formData.initialRunAt
        if (finalInitialRunAt) {
            // 브라우저 로컬 시간을 UTC 기준 ISO 문자열로 변환하여 서버에 전달 (타임존 오류 방지)
            finalInitialRunAt = new Date(finalInitialRunAt).toISOString()
        }

        const submitData = {
            ...formData,
            initialRunAt: finalInitialRunAt,
            keywordGroupId: finalGroupId,
            keywords: finalKeywords,
            isAgreed: true // 명시적 동의 후 등록
        }

        let result
        if (editTaskId) {
            result = await updateAutomationTask(editTaskId, submitData)
        } else {
            result = await createAutomationTask(submitData as any)
        }

        if (result.success) {
            router.push('/dashboard/tasks')
        } else {
            alert(result.error || (editTaskId ? '작업 수정 실패' : '작업 생성 실패'))
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-4">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard/tasks" className="hover:text-foreground transition-colors">Automations</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">{editTaskId ? 'Edit Task' : 'New Task'}</span>
                </nav>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground font-sans">
                            {editTaskId ? '자동화 작업 수정' : '새 자동화 작업 만들기'}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">AI 기반 콘텐츠 생성 워크플로우를 설정하세요.</p>
                        
                        {editTaskId && (taskDataFromDb as any)?.isAgreed && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg w-fit animate-in fade-in slide-in-from-left-2 duration-500">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase tracking-tight">
                                    자동화작업 서비스 이용 사전 동의 및 제한고지 동의완료
                                    {(taskDataFromDb as any).agreedAt && (
                                        <span className="ml-2 font-medium opacity-80">
                                            ({new Date((taskDataFromDb as any).agreedAt).toLocaleString('ko-KR')})
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Form Container */}
            <div className="space-y-6 pb-24">

                {/* Step 1: Destination */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs">1</div>
                        <h3 className="text-lg font-bold text-foreground">플랫폼 및 카테고리 선택</h3>
                    </div>
                    <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">사이트 선택</label>
                            <select
                                value={formData.siteId}
                                onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option value="">발행할 사이트를 선택하세요...</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">카테고리 선택</label>
                            <select
                                value={formData.wpCategoryId || ''}
                                onChange={e => setFormData({ ...formData, wpCategoryId: Number(e.target.value) })}
                                disabled={!categories.length}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <option value="">{fetchingCategories ? '로딩 중...' : '카테고리 선택 (선택사항)'}</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Publish Status Option */}
                    {['WORDPRESS', 'BLOGSPOT'].includes(sites.find(s => s.id === formData.siteId)?.type || '') && (
                        <div className="pl-9 mt-4 w-1/2 pr-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">발행 상태</label>
                                <select
                                    value={formData.postStatus}
                                    onChange={e => setFormData({ ...formData, postStatus: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                                >
                                    <option value="publish">🚀 즉시 발행 (공개)</option>
                                    <option value="draft">💾 임시 저장 (비공개)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </section>

                <div className="w-full h-px bg-border pl-9" />

                {/* Step 2: Keyword Source */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs">2</div>
                        <h3 className="text-lg font-bold text-foreground">키워드 유형 선택</h3>
                    </div>
                    <div className="pl-9 space-y-4">
                        <div className="bg-card border border-border rounded-lg p-1 inline-flex">
                            <button onClick={() => setKeywordMode('GROUP')} type="button" className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-all ${keywordMode === 'GROUP' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>키워드 그룹</button>
                            <button onClick={() => setKeywordMode('MANUAL')} type="button" className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-all ${keywordMode === 'MANUAL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>수동 입력</button>
                        </div>

                        {keywordMode === 'GROUP' ? (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">키워드 그룹 선택</label>
                                <select
                                    value={formData.keywordGroupId}
                                    onChange={e => setFormData({ ...formData, keywordGroupId: e.target.value })}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                                >
                                    <option value="">여기를 클릭해서 키워드그룹을 선택하세요</option>
                                    {keywordGroups.map(k => (
                                        <option key={k.id} value={k.id}>{k.name} ({k.keywords?.length || 0} 키워드)</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    이 그룹에는 {keywordGroups.find(k => k.id === formData.keywordGroupId)?.keywords?.length || 0}개의 키워드가 있습니다. 각 키워드마다 별도의 포스팅이 생성됩니다.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">키워드 입력 (쉼표나 줄바꿈으로 구분)</label>
                                <textarea
                                    value={manualKeywords}
                                    onChange={e => setManualKeywords(e.target.value)}
                                    placeholder={`아이폰 16 출시일\n갤럭시 S24 울트라\n...`}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px]"
                                />
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    입력한 키워드로 목록이 자동 생성되며, 저장 시 새로운 그룹으로 등록됩니다.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="w-full h-px bg-border pl-9" />

                {/* Step 3: AI Configuration */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs">3</div>
                        <h3 className="text-lg font-bold text-foreground">글쓰기 AI 선택</h3>
                    </div>
                    <div className="pl-9 space-y-10">
                        {/* OpenAI Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-1 opacity-80">OpenAI (GPT-5 / o1)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <ModelCard 
                                    selected={formData.aiModel === 'GPT_5_4'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GPT_5_4' })}
                                    icon={<SparklesIcon className="h-4 w-4" />}
                                    iconBg="bg-emerald-500/10"
                                    iconColor="text-emerald-500"
                                    title="GPT-5.4"
                                    description="최신 GPT-5 시리즈. 압도적인 지능과 성능."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'GPT_5_4_MINI'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GPT_5_4_MINI' })}
                                    icon={<ZapIcon className="h-4 w-4" />}
                                    iconBg="bg-emerald-500/10"
                                    iconColor="text-emerald-500"
                                    title="GPT-5.4 mini"
                                    description="최고의 속도와 효율성을 가진 경량 모델."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'GPT_5_4_THINKING'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GPT_5_4_THINKING' })}
                                    icon={<Brain className="h-4 w-4" />}
                                    iconBg="bg-emerald-500/10"
                                    iconColor="text-emerald-500"
                                    title="GPT-5 Thinking"
                                    description="복잡한 추론과 깊은 분석이 필요한 작업용."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'GPT4O'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GPT4O' })}
                                    icon={<SparklesIcon className="h-4 w-4" />}
                                    iconBg="bg-emerald-600/10"
                                    iconColor="text-emerald-600"
                                    title="GPT-4o (Legacy)"
                                    description="검증된 안정성과 창의성을 제공합니다."
                                />
                            </div>
                        </div>

                        {/* Google Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1 opacity-80">Google (Gemini 3.1 / 2.5)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <ModelCard 
                                    selected={formData.aiModel === 'GEMINI_3_1_PRO_PREVIEW'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GEMINI_3_1_PRO_PREVIEW' })}
                                    icon={<Plus className="h-4 w-4" />}
                                    iconBg="bg-blue-500/10"
                                    iconColor="text-blue-500"
                                    title="Gemini 3.1 Pro"
                                    description="차세대 초거대 AI 프리뷰. 극강의 컨텍스트."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'GEMINI_2_5_PRO'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GEMINI_2_5_PRO' })}
                                    icon={<ZapIcon className="h-4 w-4" />}
                                    iconBg="bg-blue-600/10"
                                    iconColor="text-blue-600"
                                    title="Gemini 2.5 Pro"
                                    description="안정적인 비즈니스 추론 및 고도화된 작성."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'GEMINI_2_5_FLASH'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'GEMINI_2_5_FLASH' })}
                                    icon={<ZapIcon className="h-4 w-4" />}
                                    iconBg="bg-blue-400/10"
                                    iconColor="text-blue-400"
                                    title="Gemini 2.5 Flash"
                                    description="대용량 데이터의 즉각적인 처리와 요약에 특화."
                                />
                            </div>
                        </div>

                        {/* Anthropic Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] px-1 opacity-80">Anthropic (Claude 4)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <ModelCard 
                                    selected={formData.aiModel === 'CLAUDE_4_OPUS'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'CLAUDE_4_OPUS' })}
                                    icon={<BotIcon className="h-4 w-4" />}
                                    iconBg="bg-orange-500/10"
                                    iconColor="text-orange-500"
                                    title="Claude 4 Opus"
                                    description="인간과 가장 유사한 최고 수준의 문장력."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'CLAUDE_4_SONNET'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'CLAUDE_4_SONNET' })}
                                    icon={<BotIcon className="h-4 w-4" />}
                                    iconBg="bg-orange-600/10"
                                    iconColor="text-orange-600"
                                    title="Claude 4 Sonnet"
                                    description="속도와 지능의 완벽한 조화를 제공합니다."
                                />
                                <ModelCard 
                                    selected={formData.aiModel === 'CLAUDE_4_HAIKU'} 
                                    onClick={() => setFormData({ ...formData, aiModel: 'CLAUDE_4_HAIKU' })}
                                    icon={<ZapIcon className="h-4 w-4" />}
                                    iconBg="bg-orange-400/10"
                                    iconColor="text-orange-400"
                                    title="Claude 4 Haiku"
                                    description="가장 빠른 속도의 즉각적인 텍스트 생성."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">프롬프트 선택</label>
                            <select
                                value={formData.promptId}
                                onChange={e => setFormData({ ...formData, promptId: e.target.value })}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option value="">AI 프롬프트를 선택하세요...</option>
                                {prompts.filter(p => p.type === 'SYSTEM').length > 0 && (
                                    <optgroup label="🤖 시스템 프롬프트" className="font-bold text-blue-600 dark:text-blue-400">
                                        {prompts.filter(p => p.type === 'SYSTEM').map(p => (
                                            <option key={p.id} value={p.id} className="text-blue-900 bg-blue-100 dark:text-white dark:bg-blue-900">
                                                {p.title}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {prompts.filter(p => p.type !== 'SYSTEM').length > 0 && (
                                    <optgroup label="👤 커스텀 프롬프트" className="font-bold text-green-600 dark:text-green-400">
                                        {prompts.filter(p => p.type !== 'SYSTEM').map(p => (
                                            <option key={p.id} value={p.id} className="text-green-900 bg-green-100 dark:text-white dark:bg-green-900">
                                                {p.title}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">자동화 작업명</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="예: 일일 기술 뉴스 발행"
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">발행 시간 선택</label>
                            <select
                                value={formData.scheduleCron}
                                onChange={e => setFormData({ ...formData, scheduleCron: e.target.value })}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option value="*/5 * * * *">🔥 5분마다</option>
                                <option value="*/10 * * * *">🔥 10분마다</option>
                                <option value="*/30 * * * *">⏰ 30분마다</option>
                                <option value="0 * * * *">🕒 1시간마다</option>
                                <option value="0 */3 * * *">🕒 3시간마다</option>
                                <option value="0 */6 * * *">🕒 6시간마다</option>
                                <option value="0 */12 * * *">🌗 12시간마다</option>
                                <option value="0 0 * * *">🌙 24시간마다 (매일)</option>
                                <option value="0 0 */2 * *">📅 48시간마다 (이틀에 한번)</option>
                                <option value="0 0 */2 * *">📅 48시간마다 (이틀에 한번)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                최초 실행 시간 <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-full">선택사항</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.initialRunAt || ''}
                                onChange={e => setFormData({ ...formData, initialRunAt: e.target.value })}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                                비워두면 저장 즉시 주기가 시작됩니다. 시간을 지정하면 해당 시간에 동작 후 주기가 적용됩니다.
                            </p>
                        </div>
                    </div>
                    <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                        {formData.advImageMode === 'PREMIUM' && (
                            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl border-2 border-dashed border-orange-500/30">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-600 text-white rounded-full text-[10px] font-black shadow-lg shadow-orange-500/30 animate-pulse">
                                        <SparklesIcon className="h-3 w-3" />
                                        PREMIUM MODE ACTIVE
                                    </div>
                                    <p className="text-[9px] text-orange-700 font-bold">하단 프리미엄 설정이 적용 중입니다.</p>
                                </div>
                            </div>
                        )}
                        <div className={clsx("space-y-1.5", formData.advImageMode === 'PREMIUM' && "opacity-40 grayscale")}>
                            <label className="text-xs font-medium text-muted-foreground">이미지 입력 방법</label>
                            <select
                                value={formData.imageSource}
                                onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                disabled={formData.advImageMode === 'PREMIUM'}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                                <option value="DALLE">DALL-E 3</option>
                                <option value="FLUX">FLUX Pro</option>
                                <option value="SCRAP">웹 스크래핑</option>
                                <option value="NONE">이미지 없음</option>
                            </select>
                        </div>
                        <div className={clsx("space-y-1.5", formData.advImageMode === 'PREMIUM' && "opacity-40 grayscale")}>
                            <label className="text-xs font-medium text-muted-foreground">이미지 개수 (1~5)</label>
                            <select
                                value={formData.imageCount}
                                onChange={e => setFormData({ ...formData, imageCount: Number(e.target.value) })}
                                disabled={formData.imageSource === 'NONE' || formData.advImageMode === 'PREMIUM'}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value={1}>1개</option>
                                <option value={2}>2개</option>
                                <option value={3}>3개</option>
                                <option value={4}>4개</option>
                                <option value={5}>5개</option>
                            </select>
                        </div>
                    </div>
                    {/* Thumbnail Template Toggle */}
                    <div className={clsx("pl-9 flex items-center gap-2", formData.imageSource === 'NONE' && "opacity-50 grayscale pointer-events-none")}>
                        <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg cursor-pointer hover:border-primary/50 transition-all">
                            <input
                                type="checkbox"
                                id="useThumbnailTemplate"
                                checked={formData.useThumbnailTemplate}
                                onChange={e => setFormData({ ...formData, useThumbnailTemplate: e.target.checked })}
                                disabled={formData.imageSource === 'NONE'}
                                className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="useThumbnailTemplate" className="text-xs font-bold text-foreground cursor-pointer">
                                    첫 번째 이미지를 텍스트 썸네일 템플릿으로 생성
                                </label>
                                <p className="text-[10px] text-muted-foreground">
                                    체크 해제 시 선택된 소스(AI/스크래핑)의 원본을 그대로 썸네일로 사용합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 고급 이미지 생성 옵션 (권한 보유자 전용) */}
                    {hasAdvancedRights && (
                        <div className="pl-9 mt-8 pt-8 border-t border-border space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                        <SparklesIcon className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight">프리미엄 채널 모드 설정</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium tracking-tight">이미지 생성 권한 전용: 브랜드화된 전용 레이아웃과 커스텀 배경을 사용합니다.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, advImageMode: 'STANDARD' })}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-[10px] font-black transition-all",
                                            formData.advImageMode === 'STANDARD' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        일반 모드
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, advImageMode: 'PREMIUM' })}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-[10px] font-black transition-all",
                                            formData.advImageMode === 'PREMIUM' ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        프리미엄 채널 모드
                                    </button>
                                </div>
                            </div>

                            {formData.advImageMode === 'PREMIUM' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Background Image Gallery */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">배경 이미지 갤러리 (최대 10개 - 순차적 사용)</label>
                                                <p className="text-[9px] text-muted-foreground font-medium">자동화 실행 시 갤러리에 등록한 이미지를 하나씩 순서대로 배경으로 사용합니다.</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-orange-600">{formData.advCustomImages.length} / 10</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {formData.advCustomImages.map((url, idx) => (
                                                <div key={idx} className="group relative aspect-square rounded-xl border-2 border-border overflow-hidden bg-muted hover:border-orange-500/50 transition-all">
                                                    <img src={url} alt={`BG ${idx + 1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newImgs = formData.advCustomImages.filter((_, i) => i !== idx);
                                                                setFormData({ ...formData, advCustomImages: newImgs });
                                                            }}
                                                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[8px] font-black rounded-md">
                                                        #{idx + 1}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {formData.advCustomImages.length < 10 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const url = prompt('이미지 URL을 입력해주세요. (향후 직접 업로드 기능 지원 예정)');
                                                        if (url && url.trim()) {
                                                            setFormData({ ...formData, advCustomImages: [...formData.advCustomImages, url.trim()] });
                                                        }
                                                    }}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted hover:border-orange-500/30 transition-all text-muted-foreground hover:text-orange-600"
                                                >
                                                    <Plus className="h-6 w-6" />
                                                    <span className="text-[10px] font-black uppercase tracking-tight">이미지 추가</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Image Count per Post (Premium Mode) */}
                                        <div className="pt-2 px-1">
                                            <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/40">
                                                <div className="space-y-1 flex-1">
                                                    <label className="text-[10px] font-black text-orange-800 dark:text-orange-300 uppercase tracking-widest">포스팅당 생성 이미지 개수</label>
                                                    <p className="text-[9px] text-orange-700/70 dark:text-orange-400/70 font-bold">하나의 게시물에 몇 개의 프리미엄 이미지를 넣을지 선택하세요 (썸네일 포함)</p>
                                                </div>
                                                <select
                                                    value={formData.imageCount}
                                                    onChange={e => setFormData({ ...formData, imageCount: parseInt(e.target.value) })}
                                                    className="h-10 w-24 bg-card border border-orange-200 dark:border-orange-800 rounded-lg px-3 text-xs font-black text-orange-600 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none text-center cursor-pointer"
                                                >
                                                    {[1, 2, 3, 4, 5].map(v => (
                                                        <option key={v} value={v}>{v}개</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                        {/* Thumbnail Lines */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">전용 썸네일 문구 설정</label>
                                            <div className="space-y-2">
                                                <div className="relative opacity-60 grayscale-[0.8]">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-600">1</span>
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-orange-600 uppercase">자동 키워드</span>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value="[ 포스팅 키워드 자동 삽입 ]"
                                                        className="w-full h-10 bg-orange-50 shadow-inner border border-orange-100 rounded-lg pl-8 pr-20 text-[10px] font-black text-orange-800 outline-none cursor-not-allowed"
                                                    />
                                                </div>
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{i + 1}</span>
                                                        <input
                                                            type="text"
                                                            placeholder={i === 3 ? '연락처 또는 브랜드명' : `문구 ${i + 1}`}
                                                            value={formData.advThumbnailLines[i]}
                                                            onChange={e => {
                                                                const newLines = [...formData.advThumbnailLines];
                                                                newLines[i] = e.target.value;
                                                                setFormData({ ...formData, advThumbnailLines: newLines });
                                                            }}
                                                            className="w-full h-10 bg-card border border-border rounded-lg pl-8 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Content Image Phrases */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">본문 이미지 텍스트 레이아웃</label>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="relative">
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground uppercase">상단</span>
                                                            <input
                                                                type="text"
                                                                placeholder="상단 커스텀 문구 (A)"
                                                                value={formData.advContentPhraseA}
                                                                onChange={e => setFormData({ ...formData, advContentPhraseA: e.target.value })}
                                                                className="w-full h-10 bg-card border border-border rounded-lg px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                        
                                                        <div className="h-10 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                                                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">[ 키워드 한글 타이포그래피 ]</span>
                                                        </div>

                                                        <div className="relative">
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground uppercase">하단</span>
                                                            <input
                                                                type="text"
                                                                placeholder="하단 커스텀 문구 (B)"
                                                                value={formData.advContentPhraseB}
                                                                onChange={e => setFormData({ ...formData, advContentPhraseB: e.target.value })}
                                                                className="w-full h-10 bg-card border border-border rounded-lg px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-muted/50 rounded-xl border border-border">
                                                    <p className="text-[9px] text-muted-foreground font-bold leading-relaxed flex items-center gap-2">
                                                        <Images className="h-3 w-3" />
                                                        갤러리에 등록한 {formData.advCustomImages.length > 0 ? `${formData.advCustomImages.length}개의` : '이미지를'} 순차적으로 사용하여 배경으로 활용합니다.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border z-20 pl-64 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">💡 예상 소모 비용:</span>
                            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-sm font-black flex items-center gap-1.5 shadow-inner">
                                <ZapIcon className="h-4 w-4" />
                                1회당 {costs.costPerPost + (formData.imageSource === 'SCRAP' ? costs.costPerScrap * formData.imageCount : (formData.imageSource === 'DALLE' || formData.imageSource === 'FLUX' ? costs.costPerAIImage * formData.imageCount : 0))} 토큰
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-medium">자동 저장 설정됨</span>
                            <span className="text-[10px] text-muted-foreground opacity-60">| 기본 {costs.costPerPost}T + 이미지 추가비용</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleTestPublish()}
                            disabled={testing || submitting}
                            className="px-6 py-4 bg-card hover:bg-muted border border-border text-foreground rounded-xl text-base font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {testing ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <LayersIcon className="h-5 w-5" />}
                            테스트 발행
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={submitting || testing}
                            className="px-8 py-4 bg-primary hover:opacity-90 text-primary-foreground rounded-xl text-base font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <SaveIcon className="h-5 w-5" />}
                            {editTaskId ? '작업 수정 저장' : '작업 저장'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="h-24" /> {/* Spacer for fixed bottom bar */}

            <TaskAgreementModal 
                isOpen={isAgreementModalOpen}
                onClose={() => setIsAgreementModalOpen(false)}
                onConfirm={() => {
                    setIsAgreementModalOpen(false)
                    handleSubmit(true)
                }}
            />
        </div >
    )
}

function ModelCard({ selected, onClick, icon, iconBg, iconColor, title, description }: { selected: boolean, onClick: () => void, icon: React.ReactNode, iconBg: string, iconColor: string, title: string, description: string }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer rounded-xl border p-4 flex items-start gap-3 transition-all transform hover:scale-[1.02] active:scale-95 ${selected ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20' : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card'}`}
        >
            <div className={clsx("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", iconBg, iconColor)}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-[13px] text-foreground tracking-tight">{title}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-tight">{description}</p>
            </div>
            {selected && <CheckCircle2Icon className="h-4 w-4 text-primary shrink-0" />}
        </div>
    )
}

export default function NewTaskPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Engine...</div>}>
            <TaskForm />
        </Suspense>
    )
}
