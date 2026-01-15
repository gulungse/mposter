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
    ArrowLeft as ArrowLeftIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getKeywordGroups, createKeywordGroup } from '@/app/actions/keyword'
import { getPrompts } from '@/app/actions/prompt'
import { createAutomationTask, getAutomationTask, updateAutomationTask } from '@/app/actions/task'
import { testPublishAction } from '@/app/actions/worker'

function TaskForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editTaskId = searchParams.get('edit')

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)

    // Data lists
    const [sites, setSites] = useState<any[]>([])
    const [keywordGroups, setKeywordGroups] = useState<any[]>([])
    const [prompts, setPrompts] = useState<any[]>([])
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])

    const [formData, setFormData] = useState({
        name: '',
        siteId: '',
        keywordGroupId: '',
        promptId: '',
        scheduleCron: '0 * * * *',
        aiModel: 'GPT4O',
        imageSource: 'DALLE',
        wpCategoryId: undefined as number | undefined
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
            const [sitesRes, keywordsRes, promptsRes] = await Promise.all([
                getSites(),
                getKeywordGroups(),
                getPrompts()
            ])
            if (sitesRes.success) setSites(sitesRes.data || [])
            if (keywordsRes.success) setKeywordGroups(keywordsRes.data || [])
            if (promptsRes.success) setPrompts(promptsRes.data || [])

            // If editing, load task data
            if (editTaskId) {
                const taskRes = await getAutomationTask(editTaskId)
                if (taskRes.success && taskRes.data) {
                    const t = taskRes.data
                    setFormData({
                        name: t.name,
                        siteId: t.siteId || '',
                        keywordGroupId: t.keywordGroupId || '',
                        promptId: t.promptId || '',
                        scheduleCron: t.scheduleCron || 'MANUAL',
                        aiModel: (t as any).aiModel || 'GPT4O',
                        imageSource: (t as any).imageSource || 'DALLE', // Default to DALLE or whatever
                        wpCategoryId: (t as any).wpCategoryId
                    })
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
        let finalGroupId = formData.keywordGroupId

        if (keywordMode === 'MANUAL') {
            if (!manualKeywords.trim()) { alert('키워드를 입력해주세요.'); return; }
            const kws = manualKeywords.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
            if (kws.length === 0) { alert('유효한 키워드가 없습니다.'); return; }

            setTesting(true)
            const groupRes = await createKeywordGroup(`Manual-${new Date().toLocaleTimeString()}`, kws)
            if (!groupRes.success || !groupRes.data) {
                setTesting(false)
                alert(groupRes.message || '키워드 그룹 생성 실패')
                return
            }
            finalGroupId = groupRes.data.id
        } else {
            if (!formData.siteId || !formData.keywordGroupId || !formData.promptId) {
                alert('사이트, 키워드, 지시사항을 모두 선택해주세요.')
                return
            }
        }

        setTesting(true)
        const result = await testPublishAction({
            siteId: formData.siteId,
            keywordGroupId: finalGroupId,
            promptId: formData.promptId,
            aiModel: formData.aiModel as any,
            imageSource: formData.imageSource as any,
            wpCategoryId: formData.wpCategoryId
        })
        if (result.success) {
            alert('테스트 발행 성공! 실제 사이트에서 확인해 보세요.')
        } else {
            alert(result.error || '테스트 발행 실패')
        }
        setTesting(false)
    }

    const handleSubmit = async () => {
        let finalGroupId = formData.keywordGroupId

        if (keywordMode === 'MANUAL') {
            if (!manualKeywords.trim()) { alert('키워드를 입력해주세요.'); return; }
            const kws = manualKeywords.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
            if (kws.length === 0) { alert('유효한 키워드가 없습니다.'); return; }

            setSubmitting(true)
            const groupRes = await createKeywordGroup(`Manual-${new Date().toLocaleTimeString()}`, kws)
            if (!groupRes.success || !groupRes.data) {
                setSubmitting(false)
                alert(groupRes.message || '키워드 그룹 생성 실패')
                return
            }
            finalGroupId = groupRes.data.id
        } else {
            if (!formData.name || !formData.siteId || !formData.keywordGroupId || !formData.promptId) {
                alert('필수 항목을 모두 입력해주세요.')
                return
            }
        }

        setSubmitting(true)
        const submitData = { ...formData, keywordGroupId: finalGroupId }

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
                    <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            onClick={() => setFormData({ ...formData, aiModel: 'GPT4O' })}
                            className={`cursor-pointer rounded-lg border p-4 flex items-start gap-3 transition-all ${formData.aiModel === 'GPT4O' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}
                        >
                            <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                <SparklesIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground">ChatGPT-4o</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">창의적이고 매력적인 콘텐츠 생성에 적합합니다.</p>
                            </div>
                            {formData.aiModel === 'GPT4O' && <CheckCircle2Icon className="ml-auto h-4 w-4 text-primary" />}
                        </div>

                        <div
                            onClick={() => setFormData({ ...formData, aiModel: 'GEMINI' })}
                            className={`cursor-pointer rounded-lg border p-4 flex items-start gap-3 transition-all ${formData.aiModel === 'GEMINI' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}
                        >
                            <div className="h-8 w-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                                <ZapIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Gemini 1.5 Pro</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">사실적이고 데이터 중심의 분석글에 적합합니다.</p>
                            </div>
                            {formData.aiModel === 'GEMINI' && <CheckCircle2Icon className="ml-auto h-4 w-4 text-primary" />}
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
                                {prompts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
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
                                <option value="MANUAL">🕹️ 수동 실행</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">이미지 입력 방법</label>
                            <select
                                value={formData.imageSource}
                                onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option value="DALLE">DALL-E 3</option>
                                <option value="FLUX">FLUX Pro</option>
                                <option value="SCRAP">웹 스크래핑</option>
                                <option value="NONE">이미지 없음</option>
                            </select>
                        </div>
                    </div>

                </section>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border z-20 pl-64">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-muted-foreground">자동 저장: <span className="text-foreground">켜짐</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleTestPublish}
                            disabled={testing || submitting}
                            className="px-6 py-4 bg-card hover:bg-muted border border-border text-foreground rounded-xl text-base font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {testing ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <LayersIcon className="h-5 w-5" />}
                            테스트 발행
                        </button>
                        <button
                            onClick={handleSubmit}
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
        </div>
    )
}

export default function NewTaskPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>}>
            <TaskForm />
        </Suspense>
    )
}
