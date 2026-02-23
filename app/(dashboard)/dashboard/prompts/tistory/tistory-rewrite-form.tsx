'use client'

import { useState, useEffect } from 'react'
import { 
    Loader2 as Loader2Icon, 
    Sparkles as SparklesIcon, 
    Globe as GlobeIcon, 
    LayoutList as LayoutListIcon,
    Image as ImageIcon,
    Hash,
    Link as LinkIcon,
    Terminal as TerminalIcon,
    Bot as BotIcon,
    CheckCircle
} from 'lucide-react'
import { getWordPressCategories } from '@/app/actions/site'
import { tistoryRewritePublishAction } from '@/app/actions/tistory-rewrite'

interface TistoryRewriteFormProps {
    initialPrompts: any[]
    initialSites: any[]
    hasRights: boolean
}

export default function TistoryRewriteForm({ initialPrompts, initialSites, hasRights }: TistoryRewriteFormProps) {
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [loadingCats, setLoadingCats] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        tistoryUrl: '',
        siteId: '',
        wpCategoryId: 0,
        imageSource: 'SCRAP' as const,
        imageCount: 1,
        promptId: initialPrompts[0]?.id || '',
        customPrompt: '',
        aiModel: 'GPT4O' as const,
        advThumbnailLines: ['', '추천하는 이 글!', '지금 바로 확인하세요', 'MediPoster'],
        advImageMode: 'STANDARD'
    })

    // 사이트 변경 시 카테고리 로드
    useEffect(() => {
        if (formData.siteId) {
            loadCategories(formData.siteId)
        } else {
            setCategories([])
        }
    }, [formData.siteId])

    const loadCategories = async (siteId: string) => {
        setLoadingCats(true)
        const res = await getWordPressCategories(siteId)
        if (res.success) {
            setCategories(res.data)
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, wpCategoryId: res.data[0].id }))
            }
        } else {
            setCategories([])
        }
        setLoadingCats(false)
    }

    const handleSubmit = async () => {
        if (!formData.tistoryUrl) return alert('티스토리 주소를 입력해주세요.')
        if (!formData.siteId) return alert('사이트를 선택해주세요.')
        if (!formData.promptId && !formData.customPrompt) return alert('프롬프트를 선택하거나 입력해주세요.')

        setLoading(true)
        setSuccess(null)
        try {
            const res = await tistoryRewritePublishAction(formData as any)
            if (res.success) {
                setSuccess(res.postUrl || '발행 성공!')
                alert('발행이 완료되었습니다.')
            } else {
                alert(res.error || '발행 중 오류가 발생했습니다.')
            }
        } catch (err: any) {
            alert(err.message || '오류 발생')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-8 space-y-8">
                
                {/* 1. 티스토리 주소 */}
                <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-orange-500" /> 가져올 글의 주소 (티스토리)
                    </label>
                    <input
                        type="url"
                        value={formData.tistoryUrl}
                        onChange={e => setFormData({ ...formData, tistoryUrl: e.target.value })}
                        placeholder="https://thanksy6905.tistory.com/5 또는 https://example.tistory.com/123"
                        className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 2. 대상 사이트 설정 */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <GlobeIcon className="h-4 w-4 text-blue-500" /> 적용할 내 사이트
                            </label>
                            <select
                                value={formData.siteId}
                                onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            >
                                <option value="">사이트 선택...</option>
                                {initialSites.filter(s => s.type === 'WORDPRESS').map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.url})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <LayoutListIcon className="h-4 w-4 text-emerald-500" /> 등록할 카테고리
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.wpCategoryId}
                                    onChange={e => setFormData({ ...formData, wpCategoryId: parseInt(e.target.value) })}
                                    disabled={loadingCats || !formData.siteId}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none disabled:opacity-50 appearance-none"
                                >
                                    {categories.length > 0 ? (
                                        categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                    ) : (
                                        <option value="0">{loadingCats ? '로딩 중...' : '카테고리 없음'}</option>
                                    )}
                                </select>
                                {loadingCats && <Loader2Icon className="absolute right-4 top-4 h-5 w-5 animate-spin text-slate-400" />}
                            </div>
                        </div>
                    </div>

                    {/* 3. 이미지 및 모델 설정 */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-purple-500" /> 이미지 설정
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={formData.imageSource}
                                    onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                                >
                                    <option value="NONE">이미지 없음</option>
                                    <option value="SCRAP">무료 고화질 검색</option>
                                    <option value="DALLE">AI 생성 (DALL-E 3)</option>
                                    <option value="FLUX">AI 생성 (FLUX)</option>
                                </select>
                                <select
                                    value={formData.imageCount}
                                    onChange={e => setFormData({ ...formData, imageCount: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                                >
                                    {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}개 삽입</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <BotIcon className="h-4 w-4 text-indigo-500" /> AI 모델 선택
                            </label>
                            <select
                                value={formData.aiModel}
                                onChange={e => setFormData({ ...formData, aiModel: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            >
                                <option value="GPT4O">GPT-4o (강력 추천)</option>
                                <option value="GEMINI">Gemini 2.5 Flash (속도)</option>
                                <option value="CLAUDE">Claude 3.5 Opus (품질)</option>
                                <option value="GPT5">GPT-5 mini (신규)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 4. 프롬프트 */}
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-[#324467]">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <TerminalIcon className="h-4 w-4 text-blue-600" /> 적용할 프롬프트
                        </label>
                        <select
                            value={formData.promptId}
                            onChange={e => setFormData({ ...formData, promptId: e.target.value, customPrompt: '' })}
                            className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 py-4 text-sm font-bold outline-none mb-4"
                        >
                            <option value="">직접 입력...</option>
                            {initialPrompts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        
                        {!formData.promptId && (
                            <textarea
                                value={formData.customPrompt}
                                onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                placeholder="적용할 프롬프트 명령을 상세히 입력하세요..."
                                className="w-full h-40 p-5 text-sm font-bold bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                            />
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                    >
                        {loading ? <Loader2Icon className="h-6 w-6 animate-spin" /> : <SparklesIcon className="h-6 w-6" />}
                        {loading ? '글 가져오기 및 재구성 중...' : '발행하기'}
                    </button>
                    
                    {success && (
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-emerald-500" />
                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">발행 성공!</span>
                            </div>
                            <a 
                                href={success} 
                                target="_blank" 
                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"
                            >
                                게시글 확인하기
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
