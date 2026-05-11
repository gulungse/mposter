'use client'

import { useState, useEffect } from 'react'
import {
    LayoutGrid as LayoutGridIcon,
    Zap as ZapIcon,
    Loader2 as Loader2Icon,
    Sparkles as SparklesIcon,
    Bot as BotIcon,
    Wand2,
    Check as CheckIcon,
    Copy as CopyIcon,
    Rocket
} from 'lucide-react'
import Link from 'next/link'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { publishSeoMachineAction } from '@/app/actions/seo-machine'

export default function SeoMachinePage() {
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [sites, setSites] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [fetchingCats, setFetchingCats] = useState(false)

    const [formData, setFormData] = useState({
        keyword: '',
        brandVoice: '전문적이고 신뢰감 있는 (Professional)',
        toneAndManner: '객관적인 정보 전달 (Informative)',
        aiModel: 'GPT_5_4_MINI' as const,
        siteId: '',
        wpCategoryId: 0,
        postStatus: 'draft' as 'publish' | 'draft',
        imageSource: 'NONE' as 'NONE' | 'AI' | 'SCRAP' | 'DALLE' | 'FLUX',
        imageCount: 1
    })

    useEffect(() => {
        async function loadData() {
            const siteRes = await getSites()
            if (siteRes.success) setSites(siteRes.data || [])
            setLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (!formData.siteId) {
            setCategories([])
            return
        }
        const site = sites.find(s => s.id === formData.siteId)
        if (site?.type === 'WORDPRESS') {
            async function loadCats() {
                setFetchingCats(true)
                const res = await getWordPressCategories(formData.siteId)
                if (res.success) setCategories(res.data || [])
                setFetchingCats(false)
            }
            loadCats()
        } else {
            setCategories([])
        }
    }, [formData.siteId, sites])

    const handlePublish = async () => {
        if (!formData.keyword.trim()) {
            alert('키워드를 입력해주세요.')
            return
        }
        if (!formData.siteId) {
            alert('발행할 사이트를 선택해주세요.')
            return
        }

        if (!confirm('설정한 옵션으로 SEO 최적화 글을 생성하고 사이트에 발행하시겠습니까? (1토큰 소모)')) return

        setPublishing(true)
        const res = await publishSeoMachineAction(formData as any)
        if (res.success) {
            alert(res.message || '발행 성공!')
            setFormData(prev => ({ ...prev, keyword: '' })) // 성공 시 키워드 초기화
        } else {
            alert(res.error || '발행 실패')
        }
        setPublishing(false)
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">SEO Machine</span>
                </nav>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                        <Rocket className="h-7 w-7 text-indigo-600" />
                        SEO 머신 발행
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">최상위 랭킹을 위한 SEO 최적화 블로그 포스팅을 원클릭으로 생성하고 발행합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Input Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-blue-600" /> 1. 콘텐츠 설정
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">타겟 키워드 (필수)</label>
                            <input
                                type="text"
                                value={formData.keyword}
                                onChange={e => setFormData({ ...formData, keyword: e.target.value })}
                                placeholder="예: 저속노화 식단, 애플워치 리뷰..."
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">브랜드 보이스 (스타일)</label>
                                <select
                                    value={formData.brandVoice}
                                    onChange={e => setFormData({ ...formData, brandVoice: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                >
                                    <option value="전문적이고 신뢰감 있는 (Professional)">전문적이고 신뢰감 있는</option>
                                    <option value="친근하고 대화하는 듯한 (Conversational)">친근하고 대화하는 듯한</option>
                                    <option value="권위있고 학술적인 (Authoritative)">권위있고 학술적인</option>
                                    <option value="유쾌하고 재치있는 (Humorous)">유쾌하고 재치있는</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">톤 앤 매너</label>
                                <select
                                    value={formData.toneAndManner}
                                    onChange={e => setFormData({ ...formData, toneAndManner: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                >
                                    <option value="객관적인 정보 전달 (Informative)">객관적인 정보 전달</option>
                                    <option value="설득력 있고 행동을 유도하는 (Persuasive)">설득력 있고 행동 유도</option>
                                    <option value="감성적이고 공감가는 (Empathetic)">감성적이고 공감가는</option>
                                    <option value="직설적이고 명쾌한 (Direct)">직설적이고 명쾌한</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">AI 모델</label>
                            <select
                                value={formData.aiModel}
                                onChange={e => setFormData({ ...formData, aiModel: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                            >
                                <optgroup label="OpenAI (GPT-5 / o1)">
                                    <option value="GPT_5_4_MINI">GPT-5.4 mini (추천)</option>
                                    <option value="GPT_5_4">GPT-5.4</option>
                                    <option value="GPT_5_4_THINKING">GPT-5.4 Thinking</option>
                                </optgroup>
                                <optgroup label="Anthropic (Claude 4)">
                                    <option value="CLAUDE_4_SONNET">Claude 4 Sonnet</option>
                                    <option value="CLAUDE_4_OPUS">Claude 4 Opus</option>
                                </optgroup>
                                <optgroup label="Google (Gemini)">
                                    <option value="GEMINI_3_1_PRO_PREVIEW">Gemini 3.1 Pro</option>
                                    <option value="GEMINI_2_5_PRO">Gemini 2.5 Pro</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-6">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <ZapIcon className="h-4 w-4 text-indigo-600" /> 2. 발행 및 이미지 설정
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">대상 사이트</label>
                                    <select
                                        value={formData.siteId}
                                        onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                    >
                                        <option value="">사이트 선택...</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>[{s.type}] {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">발행 상태</label>
                                    <select
                                        value={formData.postStatus}
                                        onChange={e => setFormData({ ...formData, postStatus: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                    >
                                        <option value="draft">임시 저장</option>
                                        <option value="publish">즉시 발행</option>
                                    </select>
                                </div>
                            </div>

                            {formData.siteId && sites.find(s => s.id === formData.siteId)?.type === 'WORDPRESS' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-center">
                                        워드프레스 카테고리
                                        {fetchingCats && <Loader2Icon className="h-3 w-3 animate-spin text-indigo-500" />}
                                    </label>
                                    <select
                                        value={formData.wpCategoryId}
                                        onChange={e => setFormData({ ...formData, wpCategoryId: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                    >
                                        <option value={0}>기본 카테고리</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-[10px] font-black text-green-500 uppercase tracking-widest">이미지 설정</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">이미지 소스</label>
                                    <select
                                        value={formData.imageSource}
                                        onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                                    >
                                        <option value="NONE">사용 안 함</option>
                                        <option value="AI">AI 검색 (무료 이미지)</option>
                                        <option value="DALLE">DALL-E 3 생성</option>
                                        <option value="FLUX">FLUX 생성</option>
                                        <option value="SCRAP">무료 이미지 스크랩</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-bold uppercase transition-colors ${formData.imageSource === 'NONE' ? 'text-slate-200 dark:text-slate-800' : 'text-slate-400'}`}>삽입 갯수</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={formData.imageCount}
                                        onChange={e => setFormData({ ...formData, imageCount: parseInt(e.target.value) })}
                                        disabled={formData.imageSource === 'NONE'}
                                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none disabled:opacity-30 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handlePublish}
                                disabled={publishing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                            >
                                {publishing ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                                {publishing ? 'SEO 최적화 모델 구동 중...' : '원클릭 SEO 머신 발행 시작'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Info Section */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[600px] relative">
                        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <BotIcon className="h-4 w-4 text-indigo-400" /> SEO MACHINE ENGINE
                            </h3>
                        </div>
                        <div className="flex-1 p-8 text-sm leading-relaxed text-slate-300 flex flex-col justify-center items-center">
                            {publishing ? (
                                <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20"></div>
                                        <Loader2Icon className="h-16 w-16 text-indigo-400 animate-spin relative z-10" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="font-bold text-lg text-white">AI 엔진 구동 중...</p>
                                        <p className="text-slate-400 text-xs">검색 의도 파악 및 2000단어 이상의 장문 콘텐츠 작성 중</p>
                                        <p className="text-slate-500 text-[10px]">이 작업은 1~2분 정도 소요될 수 있습니다.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 w-full max-w-sm">
                                    <div className="text-center space-y-3 mb-8">
                                        <Rocket className="h-12 w-12 text-indigo-500 mx-auto opacity-80" />
                                        <h4 className="text-lg font-black text-white">강력한 자동화 엔진</h4>
                                        <p className="text-xs text-slate-400">단 하나의 키워드로 완벽한 블로그를 만듭니다.</p>
                                    </div>
                                    
                                    <ul className="space-y-4">
                                        <li className="flex gap-3">
                                            <CheckIcon className="h-5 w-5 text-green-400 shrink-0" />
                                            <div>
                                                <p className="font-bold text-slate-200">2000자 이상의 압도적 분량</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">상위 노출을 위해 풍부한 정보량과 H2/H3 구조를 완벽하게 준수합니다.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <CheckIcon className="h-5 w-5 text-green-400 shrink-0" />
                                            <div>
                                                <p className="font-bold text-slate-200">LSI 연관 검색어 자연 배치</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">키워드 스터핑을 피하고 연관 검색어를 문맥에 맞게 자연스럽게 녹여냅니다.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <CheckIcon className="h-5 w-5 text-green-400 shrink-0" />
                                            <div>
                                                <p className="font-bold text-slate-200">맞춤형 브랜드 보이스 튜닝</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">설정하신 톤앤매너에 맞게 글의 뉘앙스를 변경하여 인간적인 글을 작성합니다.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
