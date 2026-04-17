'use client'

import { useState, useEffect } from 'react'
import { X, Zap, Globe, Hash, MonitorPlay, Loader2, Save, Sparkles, Layers, Image as ImageIcon, Clock, LayoutGrid, CheckCircle2, PlayCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { getWordPressCategories } from '@/app/actions/site'
import { TaskAgreementModal } from './task-agreement-modal'
import { createAutomationTask } from '@/app/actions/task'
import { testPublishAction } from '@/app/actions/worker'
import { useRouter } from 'next/navigation'

interface NewTaskModalProps {
    isOpen: boolean
    onClose: () => void
    sites: any[]
    keywordGroups: any[]
    prompts: any[]
    initialSiteId?: string
}

export function NewTaskModal({ isOpen, onClose, sites, keywordGroups, prompts, initialSiteId }: NewTaskModalProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [testing, setTesting] = useState(false)
    const [fetchingCategories, setFetchingCategories] = useState(false)
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false)
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([])

    const [formData, setFormData] = useState({
        name: '',
        siteId: initialSiteId || '',
        keywordGroupId: '',
        promptId: '',
        scheduleCron: '0 * * * *',
        aiModel: 'GPT4O',
        imageSource: 'DALLE',
        wpCategoryId: undefined as number | undefined
    })

    useEffect(() => {
        if (initialSiteId) setFormData(prev => ({ ...prev, siteId: initialSiteId }))
    }, [initialSiteId])

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
        if (!formData.siteId || !formData.keywordGroupId || !formData.promptId) {
            alert('사이트, 키워드, 지시사항을 모두 선택해주세요.')
            return
        }
        setTesting(true)
        const result = await testPublishAction({
            siteId: formData.siteId,
            keywordGroupId: formData.keywordGroupId,
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

    const handleSubmit = async (bypassAgreement = false) => {
        if (!formData.name || !formData.siteId || !formData.keywordGroupId || !formData.promptId) {
            alert('모든 필수 항목을 선택해주세요.')
            return
        }

        if (!bypassAgreement) {
            setIsAgreementModalOpen(true)
            return
        }

        setSubmitting(true)
        const result = await createAutomationTask({
            ...formData,
            isAgreed: true
        } as any)
        if (result.success) {
            onClose()
            router.push('/dashboard/tasks')
            router.refresh()
        } else {
            alert(result.error || '작업 생성 실패')
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-[#1e293b] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <LayoutGrid className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">자동화 작업 최적화 설정</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configure your AI auto-posting agent</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Two Column Grid */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">

                    {/* Left: Target Selection */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-6 w-1 rounded-full bg-blue-600" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">핵심 리소스 선택</h3>
                        </div>

                        {/* Site */}
                        <div className="space-y-2 group">
                            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                                <Globe className="h-3.5 w-3.5" /> 1. 타겟 사이트
                            </label>
                            <select
                                value={formData.siteId}
                                onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#0f172a] rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="">연결할 사이트를 선택하세요</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                ))}
                            </select>
                        </div>

                        {/* WP Category */}
                        {categories.length > 0 && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="h-3.5 w-3.5" /> 1.1 워드프레스 카테고리
                                </label>
                                <select
                                    value={formData.wpCategoryId}
                                    onChange={e => setFormData({ ...formData, wpCategoryId: Number(e.target.value) })}
                                    className="w-full bg-slate-100 dark:bg-[#151f32] border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 text-sm font-bold outline-none cursor-pointer"
                                >
                                    <option value="">기본 카테고리 (자동 선택)</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Keyword Group */}
                        <div className="space-y-2 group">
                            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                                <Hash className="h-3.5 w-3.5" /> 2. 키워드 그룹
                            </label>
                            <select
                                value={formData.keywordGroupId}
                                onChange={e => setFormData({ ...formData, keywordGroupId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#0f172a] rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="">키워드 소스를 선택하세요</option>
                                {keywordGroups.map(k => (
                                    <option key={k.id} value={k.id}>{k.name} ({k.keywords?.length || 0}개 키워드)</option>
                                ))}
                            </select>
                        </div>

                        {/* Prompt */}
                        <div className="space-y-2 group">
                            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                                <MonitorPlay className="h-3.5 w-3.5" /> 3. AI 지시사항
                            </label>
                            <select
                                value={formData.promptId}
                                onChange={e => setFormData({ ...formData, promptId: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#0f172a] rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="">적용할 프롬프트를 선택하세요</option>
                                {prompts.map(p => (
                                    <option key={p.id} value={p.id}>{p.title} ({p.type === 'SYSTEM' ? '시스템' : '사용자'})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right: Detailed Config */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-6 w-1 rounded-full bg-indigo-500" />
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">고급 옵션 & 스케줄링</h3>
                        </div>

                        {/* Task Name */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-indigo-500" /> 작업 식별 명칭
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="예: 매일 오전 뉴스 브리핑"
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5" /> AI 모델
                                </label>
                                <select
                                    value={formData.aiModel}
                                    onChange={e => setFormData({ ...formData, aiModel: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] rounded-2xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <optgroup label="OpenAI (GPT-5 / o1)">
                                        <option value="GPT_5_4">GPT-5.4 (신규)</option>
                                        <option value="GPT_5_4_MINI">GPT-5.4 Mini (가속)</option>
                                        <option value="GPT_5_4_THINKING">GPT-5.4 Thinking (추론)</option>
                                        <option value="GPT4O">GPT-4o (Legacy)</option>
                                    </optgroup>
                                    <optgroup label="Google (Gemini 3.1)">
                                        <option value="GEMINI_3_1_PRO_PREVIEW">Gemini 3.1 Pro (Preview)</option>
                                        <option value="GEMINI_2_5_PRO">Gemini 2.5 Pro (Balanced)</option>
                                        <option value="GEMINI_2_5_FLASH">Gemini 2.5 Flash (Fast)</option>
                                    </optgroup>
                                    <optgroup label="Anthropic (Claude 4)">
                                        <option value="CLAUDE_4_OPUS">Claude 4 Opus (Premium)</option>
                                        <option value="CLAUDE_4_SONNET">Claude 4 Sonnet (Balanced)</option>
                                        <option value="CLAUDE_4_HAIKU">Claude 4 Haiku (Fast)</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon className="h-3.5 w-3.5" /> 이미지 소급
                                </label>
                                <select
                                    value={formData.imageSource}
                                    onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] rounded-2xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="DALLE">DALL-E 3</option>
                                    <option value="FLUX">FLUX Pro</option>
                                    <option value="SCRAP">원본 스크랩</option>
                                    <option value="NONE">안함</option>
                                </select>
                            </div>
                        </div>

                        {/* Schedule - FULL RESTORATION */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> 자동 실행 주기
                            </label>
                            <select
                                value={formData.scheduleCron}
                                onChange={e => setFormData({ ...formData, scheduleCron: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="*/5 * * * *">🔥 5분마다</option>
                                <option value="*/10 * * * *">🚀 10분마다</option>
                                <option value="*/15 * * * *">📦 15분마다</option>
                                <option value="*/30 * * * *">⏰ 30분마다</option>
                                <option value="0 * * * *">🕒 60분마다 (1시간)</option>
                                <option value="0 */3 * * *">📅 3시간마다</option>
                                <option value="0 */6 * * *">📅 6시간마다</option>
                                <option value="0 */12 * * *">📅 12시간마다</option>
                                <option value="0 0 * * *">🌙 24시간마다 (매일)</option>
                                <option value="0 0 */2 * *">💤 48시간마다 (이틀)</option>
                                <option value="MANUAL">🕹️ 수동 실행만</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar - RESTORED TEST PUBLISH */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-4">
                    <div className="flex-1 flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> System Strategy Confirmed
                    </div>
                    <button
                        onClick={handleTestPublish}
                        disabled={testing || submitting}
                        className="bg-white dark:bg-[#1e293b] border-2 border-blue-600 text-blue-600 px-6 py-4 rounded-2xl font-black text-xs hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        실제 사이트 테스트 발행
                    </button>
                    <button
                        onClick={() => handleSubmit()}
                        disabled={submitting || testing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        자동화 작업 생성 확정
                    </button>
                </div>
            </div>

            <TaskAgreementModal 
                isOpen={isAgreementModalOpen}
                onClose={() => setIsAgreementModalOpen(false)}
                onConfirm={() => {
                    setIsAgreementModalOpen(false)
                    handleSubmit(true)
                }}
            />
        </div>
    )
}
