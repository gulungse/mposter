'use client'

import { useState, useEffect } from 'react'
import {
    Zap as ZapIcon,
    Loader2 as Loader2Icon,
    Sparkles as SparklesIcon,
    Layers as LayersIcon,
    CheckCircle2 as CheckCircle2Icon,
    ArrowLeft as ArrowLeftIcon,
    Play as PlayIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { testDirectPromptAction } from '@/app/actions/worker'

export default function PromptTestPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)

    // Data lists
    const [sites, setSites] = useState<any[]>([])
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])

    const [formData, setFormData] = useState({
        siteId: '',
        keyword: '',
        promptContent: '',
        manualTags: '', // 추가된 필드
        aiModel: 'GPT4O',
        imageSource: 'NONE',
        imageCount: 1,
        wpCategoryId: undefined as number | undefined,
        postStatus: 'draft'
    })

    useEffect(() => {
        const loadInitialData = async () => {
            const sitesRes = await getSites()
            if (sitesRes.success) setSites(sitesRes.data || [])
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

    const handleTestRun = async () => {
        if (!formData.siteId || !formData.promptContent.trim() || !formData.keyword.trim()) {
            alert('사이트, 키워드, 그리고 프롬프트 내용을 모두 입력해주세요.')
            return
        }

        setTesting(true)
        try {
            // 태그 배열 처리
            const tags = formData.manualTags
                ? formData.manualTags.split(/[\n,]+/).map(t => t.trim()).filter(t => t)
                : [];

            const result = await testDirectPromptAction({
                siteId: formData.siteId,
                keyword: formData.keyword,
                promptContent: formData.promptContent,
                tags: tags, // 수동 태그 전달
                aiModel: formData.aiModel as any,
                imageSource: formData.imageSource as any,
                imageCount: formData.imageCount,
                wpCategoryId: formData.wpCategoryId,
                postStatus: formData.postStatus
            })

            if (result.success) {
                alert(result.message || '테스트 발행 성공! 실제 사이트(임시글)를 확인해 보세요.')
            } else {
                alert(result.error || '테스트 발행 실패')
            }
        } catch (error: any) {
            alert('오류가 발생했습니다: ' + error.message)
        } finally {
            setTesting(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard/prompts" className="hover:text-foreground transition-colors">Prompts</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Prompt Test</span>
                </nav>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground font-sans">
                            프롬프트 자유 테스트
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            새로운 지침을 직접 입력하여 실제 발행 결과를 즉시 확인해보세요. (1토큰 사용)
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground border-l-4 border-primary pl-3">대상 사이트 설정</h3>
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">사이트 선택</label>
                                <select
                                    value={formData.siteId}
                                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                                >
                                    <option value="">대상 사이트 선택...</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                    ))}
                                </select>
                            </div>

                            {sites.find(s => s.id === formData.siteId)?.type === 'WORDPRESS' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">카테고리</label>
                                    <select
                                        value={formData.wpCategoryId || ''}
                                        onChange={e => setFormData({ ...formData, wpCategoryId: Number(e.target.value) })}
                                        disabled={!categories.length}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="">{fetchingCategories ? '로딩 중...' : '카테고리 선택'}</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <h3 className="text-sm font-bold text-foreground border-l-4 border-primary pl-3">AI 모델 및 이미지</h3>
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <button
                                    onClick={() => setFormData({ ...formData, aiModel: 'GPT4O' })}
                                    className={`p-3 rounded-xl border text-center transition-all ${formData.aiModel === 'GPT4O' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                                >
                                    <div className="text-xs font-bold">GPT-4o</div>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, aiModel: 'GEMINI' })}
                                    className={`p-3 rounded-xl border text-center transition-all ${formData.aiModel === 'GEMINI' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                                >
                                    <div className="text-xs font-bold">Gemini 1.5</div>
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">이미지 소스</label>
                                <select
                                    value={formData.imageSource}
                                    onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                                >
                                    <option value="NONE">이미지 없음</option>
                                    <option value="SCRAP">웹 스크래핑 (무료)</option>
                                    <option value="DALLE">DALL-E 3</option>
                                    <option value="FLUX">FLUX Pro</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 pt-4 border-t border-border/50">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">추가 태그 (쉼표 구분)</label>
                                <input
                                    type="text"
                                    value={formData.manualTags}
                                    onChange={e => setFormData({ ...formData, manualTags: e.target.value })}
                                    placeholder="태그1, 태그2, 태그3"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                                <p className="text-[9px] text-muted-foreground">이곳에 직접 태그를 입력하거나, 본문에 #해시태그를 넣으면 자동으로 등록됩니다.</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Prompt Input */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">테스트 주제 (키워드)</label>
                            <input
                                type="text"
                                value={formData.keyword}
                                onChange={e => setFormData({ ...formData, keyword: e.target.value })}
                                placeholder="어떤 주제로 글을 써볼까요? (예: 아이폰 16 후기)"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                                <span>프롬프트 지침 (Prompt Instructions)</span>
                                <span className="text-primary normal-case">#해시태그 사용 가능</span>
                            </label>
                            <textarea
                                value={formData.promptContent}
                                onChange={e => setFormData({ ...formData, promptContent: e.target.value })}
                                placeholder={`여기에 AI에게 전달할 구체적인 지침을 입력하세요.\n\n예: "IT 전문 블로거로서 친근한 말투로 아이폰의 장단점을 분석해줘. #아이폰 #성능비교"`}
                                className="w-full bg-background border border-border rounded-xl px-4 py-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[400px] font-mono leading-relaxed"
                            />
                        </div>
                    </section>
                </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t border-border z-20 pl-64">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <ZapIcon className="h-3.5 w-3.5" />
                        <span>1회 테스트당 <strong>1토큰</strong>이 사용됩니다.</span>
                    </div>
                    <button
                        onClick={handleTestRun}
                        disabled={testing}
                        className="px-8 py-4 bg-primary hover:opacity-90 text-primary-foreground rounded-2xl text-base font-black shadow-xl shadow-blue-500/20 flex items-center gap-3 transition-all disabled:opacity-50"
                    >
                        {testing ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <PlayIcon className="h-5 w-5 fill-current" />}
                        실행 및 발행 테스트
                    </button>
                </div>
            </div>
        </div>
    )
}
