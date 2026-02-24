'use client'

import { useState, useEffect } from 'react'
import {
    LayoutGrid as LayoutGridIcon,
    Zap as ZapIcon,
    Loader2 as Loader2Icon,
    Sparkles as SparklesIcon,
    Terminal as TerminalIcon,
    Link as LinkIcon,
    ArrowRight,
    Wand2,
    FileText,
    Globe,
    Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import { getPrompts } from '@/app/actions/prompt'
import { scrapeNaverBlogAction, publishManualAction } from '@/app/actions/worker'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getUserProfile } from '@/app/actions/user'

export default function NaverRewritePage() {
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [prompts, setPrompts] = useState<any[]>([])
    const [sites, setSites] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [fetchingCats, setFetchingCats] = useState(false)
    const [publishing, setPublishing] = useState(false)

    const [naverUrl, setNaverUrl] = useState('')
    const [formData, setFormData] = useState({
        promptId: '',
        customPrompt: '',
        aiModel: 'GPT4O' as const,
        siteId: '',
        wpCategoryId: 0,
        postStatus: 'draft' as 'publish' | 'draft',
        imageSource: 'ORIGINAL' as 'NONE' | 'ORIGINAL' | 'AI' | 'SCRAP' | 'DALLE' | 'FLUX',
        imageCount: 1
    })

    useEffect(() => {
        async function loadData() {
            const [profileRes, promptRes, siteRes] = await Promise.all([
                getUserProfile(),
                getPrompts(),
                getSites()
            ])
            if (profileRes.success) setUser(profileRes.data)
            if (promptRes.success) setPrompts(promptRes.data || [])
            if (siteRes.success) setSites(siteRes.data || [])
            setLoading(false)
        }
        loadData()
    }, [])

    // 사이트 변경 시 카테고리 로드
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

    const handleRun = async () => {
        if (!naverUrl.trim()) {
            alert('네이버 블로그 URL을 입력해주세요.')
            return
        }
        if (!naverUrl.includes('blog.naver.com')) {
            alert('올바른 네이버 블로그 URL이 아닙니다.')
            return
        }
        if (!formData.siteId) {
            alert('발행할 사이트를 선택해주세요.')
            return
        }
        if (!formData.promptId && !formData.customPrompt.trim()) {
            alert('사용할 프롬프트를 선택하거나 직접 입력해주세요.')
            return
        }

        if (!confirm('설정한 내용으로 네이버 블로그를 재작성하여 발행하시겠습니까? (1토큰 소모)')) return

        setPublishing(true)
        try {
            // 1. 스크랩 실행
            const scrapeRes = await scrapeNaverBlogAction(naverUrl)
            if (!scrapeRes.success || !scrapeRes.data) {
                alert(scrapeRes.error || '네이버 블로그 내용 추출에 실패했습니다.')
                setPublishing(false)
                return
            }

            // 2. 발행 실행
            const res = await publishManualAction({
                ...formData,
                originalTitle: scrapeRes.data.title,
                originalContent: scrapeRes.data.content,
                imageCount: formData.imageCount
            } as any)

            if (res.success) {
                alert(res.message || '발행이 완료되었습니다!')
                setNaverUrl('')
            } else {
                alert(res.error || '발행에 실패했습니다.')
            }
        } catch (error) {
            alert('오류가 발생했습니다.')
        } finally {
            setPublishing(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    // 권한 체크
    if (!user || (user.role !== 'ADMIN' && !user.hasNaverRewriteRights)) {
        return (
            <div className="p-12 text-center">
                <p className="text-slate-500 font-bold">이 메뉴를 사용할 권한이 없습니다. 관리자에게 문의하세요.</p>
                <Link href="/dashboard" className="text-indigo-600 mt-4 inline-block font-bold">대시보드로 돌아가기</Link>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard/prompts" className="hover:text-foreground transition-colors">Publishing</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Naver Blog Rewrite</span>
                </nav>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                        <ZapIcon className="h-7 w-7 text-green-500 fill-green-500/20" />
                        네이버 블로그 재구성
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">네이버 블로그 URL을 입력하면 AI가 내용을 재구성하여 내 사이트에 즉시 발행합니다.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Naver URL Input */}
                <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-blue-600" /> 1. 네이버 블로그 URL
                    </h3>
                    <input
                        type="text"
                        value={naverUrl}
                        onChange={e => setNaverUrl(e.target.value)}
                        placeholder="https://blog.naver.com/아이디/글번호"
                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>

                {/* 2. Site Selection */}
                <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-600" /> 2. 발행 사이트 선택
                    </h3>
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

                {/* 3. AI & Prompt Selection */}
                <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <TerminalIcon className="h-4 w-4 text-blue-600" /> 3. 프롬프트 및 AI 모델
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">프롬프트 선택</label>
                            <select
                                value={formData.promptId}
                                onChange={e => setFormData({ ...formData, promptId: e.target.value, customPrompt: '' })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                            >
                                <option value="">직접 입력...</option>
                                {prompts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">AI 모델</label>
                            <select
                                value={formData.aiModel}
                                onChange={e => setFormData({ ...formData, aiModel: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                            >
                                <option value="GPT4O">GPT-4o</option>
                                <option value="CLAUDE">Claude 3.5</option>
                                <option value="GEMINI">Gemini 2.5</option>
                                <option value="GPT5">GPT-5 mini</option>
                            </select>
                        </div>
                    </div>
                    {!formData.promptId && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">직접 입력 프롬프트</label>
                            <textarea
                                value={formData.customPrompt}
                                onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                placeholder="적용할 프롬프트 지시 내용을 입력하세요..."
                                className="w-full h-32 p-4 text-sm font-medium bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* 4. Image Settings */}
                <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-green-600" /> 4. 이미지 설정
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">이미지 소스</label>
                            <select
                                value={formData.imageSource}
                                onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all"
                            >
                                <option value="NONE">사용 안 함</option>
                                <option value="ORIGINAL">원본 가져오기 (권장)</option>
                                <option value="DALLE">AI 이미지 생성 (DALL-E)</option>
                                <option value="FLUX">AI 이미지 생성 (FLUX)</option>
                                <option value="SCRAP">무료 이미지 스크랩</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-bold uppercase ${['NONE', 'ORIGINAL'].includes(formData.imageSource) ? 'text-slate-200 dark:text-slate-800' : 'text-slate-400'}`}>삽입 갯수</label>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                value={formData.imageCount}
                                onChange={e => setFormData({ ...formData, imageCount: parseInt(e.target.value) })}
                                disabled={['NONE', 'ORIGINAL'].includes(formData.imageSource)}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none disabled:opacity-30 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Run Button */}
                <button
                    onClick={handleRun}
                    disabled={publishing}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                >
                    {publishing ? <Loader2Icon className="h-6 w-6 animate-spin" /> : <SparklesIcon className="h-6 w-6" />}
                    {publishing ? '네이버 글 분석 및 발행 중...' : '네이버 블로그 재구성 및 발행 시작'}
                </button>
            </div>
        </div>
    )
}
