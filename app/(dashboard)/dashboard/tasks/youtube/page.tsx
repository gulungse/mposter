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
    FileText,
    ArrowRight,
    Circle,
    CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSites, getWordPressCategories } from '@/app/actions/site'
import { getPrompts } from '@/app/actions/prompt'
import { testPublishAction } from '@/app/actions/worker'
import { getYoutubeTranscriptAction } from '@/app/actions/youtube'
import { getUserProfile } from '@/app/actions/user'

// --- Types ---
type WorkflowStatus = 'IDLE' | 'SETTINGS_CHECK' | 'URL_CHECK' | 'TRANSCRIPT_FETCH' | 'BLOG_GENERATE' | 'COMPLETE' | 'ERROR';

interface Step {
    id: WorkflowStatus;
    label: string;
}

const STEPS: Step[] = [
    { id: 'SETTINGS_CHECK', label: '설정확인' },
    { id: 'URL_CHECK', label: 'URL확인' },
    { id: 'TRANSCRIPT_FETCH', label: '스크립트 추출' },
    { id: 'BLOG_GENERATE', label: '작성 중' },
    { id: 'COMPLETE', label: '완료' },
];

function ProgressStepper({ currentStatus, error }: { currentStatus: WorkflowStatus, error: string | null }) {
    const getStepIndex = (status: WorkflowStatus) => {
        if (status === 'IDLE') return -1;
        if (status === 'ERROR') return -1;
        return STEPS.findIndex(s => s.id === status);
    };

    const currentIndex = getStepIndex(currentStatus);

    return (
        <div className="w-full py-8 px-4 flex flex-col items-center">
            <div className="relative w-full max-w-4xl flex justify-between items-center">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
                
                {/* Active Progress Line */}
                <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-red-500 -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
                    style={{ width: `${currentIndex >= 0 ? (currentIndex / (STEPS.length - 1)) * 100 : 0}%` }}
                ></div>

                {STEPS.map((step, index) => {
                    const isActive = index <= currentIndex;
                    const isProcessing = index === currentIndex && currentStatus !== 'COMPLETE';
                    const isError = currentStatus === 'ERROR' && index === currentIndex;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            <div className={`
                                w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300
                                ${isActive ? 'bg-red-500 scale-125' : 'bg-slate-200 dark:bg-slate-700'}
                                ${isProcessing ? 'animate-pulse ring-4 ring-red-500/20' : ''}
                                ${isError ? 'bg-orange-500 ring-4 ring-orange-500/20' : ''}
                            `}>
                                {isActive && index < currentIndex ? (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-slate-400'}`} />
                                )}
                            </div>
                            <span className={`
                                absolute top-8 whitespace-nowrap text-[11px] font-black tracking-tighter transition-all duration-300
                                ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}
                                ${isError ? 'text-orange-500' : ''}
                            `}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {error && (
                <div className="mt-16 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 w-full text-center">
                    <p className="text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2">
                         에러 발생: {error}
                    </p>
                </div>
            )}
        </div>
    );
}

function YoutubeToBlogForm() {
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('IDLE')
    const [workflowError, setWorkflowError] = useState<string | null>(null)
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
                const res = await getWordPressCategories(formData.siteId)
                if (res.success) setCategories(res.data)
                else setCategories([])
            } else {
                setCategories([])
            }
        }
        fetchCats()
    }, [formData.siteId, sites])

    const startWorkflow = async () => {
        setWorkflowError(null);
        setWorkflowStatus('SETTINGS_CHECK');

        try {
            // 1. Settings Check
            await new Promise(r => setTimeout(r, 600)); // Visual delay
            if (!formData.siteId) throw new Error('발행할 사이트를 선택해주세요.');
            
            const finalPrompt = isCustomPrompt ? formData.customPrompt : prompts.find(p => p.id === formData.selectedPromptId)?.content;
            if (!finalPrompt) throw new Error('프롬프트를 선택하거나 입력해주세요.');

            // 2. URL Check
            setWorkflowStatus('URL_CHECK');
            await new Promise(r => setTimeout(r, 600));
            if (!formData.youtubeUrl.trim()) throw new Error('유튜브 URL을 입력해주세요.');

            // 3. Transcript Fetch
            setWorkflowStatus('TRANSCRIPT_FETCH');
            const transcriptRes = await getYoutubeTranscriptAction(formData.youtubeUrl);
            if (!transcriptRes.success || !transcriptRes.data) {
                throw new Error(transcriptRes.error || '자막 추출에 실패했습니다.');
            }
            const fetchedTranscript = transcriptRes.data.transcript;
            setFormData(prev => ({ ...prev, transcript: fetchedTranscript }));

            // 4. Blog Generate
            setWorkflowStatus('BLOG_GENERATE');
            const result = await testPublishAction({
                siteId: formData.siteId,
                keywords: ['유튜브 요약 포스팅'],
                customPrompt: finalPrompt,
                transcript: fetchedTranscript,
                aiModel: formData.aiModel as any,
                imageSource: formData.imageSource as any,
                imageCount: formData.imageCount,
                wpCategoryId: formData.wpCategoryId,
                postStatus: formData.postStatus,
                useThumbnailTemplate: true
            });

            if (!result.success) {
                throw new Error(result.error || '블로그 변환 중 오류가 발생했습니다.');
            }

            // 5. Complete
            setWorkflowStatus('COMPLETE');
            alert('블로그 변환 및 발행이 무사히 완료되었습니다!');
            
        } catch (err: any) {
            console.error('Workflow Error:', err);
            setWorkflowError(err.message);
            setWorkflowStatus('ERROR');
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2Icon className="h-10 w-10 animate-spin text-slate-300" />
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">환경 설정 로드 중...</p>
        </div>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-12">
                <nav className="flex items-center gap-2 text-[10px] text-muted-foreground mb-4 font-black">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
                    <span>/</span>
                    <span className="text-foreground">유튜브 → 블로그</span>
                </nav>
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                            <YoutubeIcon className="h-10 w-10 text-red-600" />
                        </div>
                        AI 유튜브 블로거
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">단 한 번의 클릭으로 유튜브 자막을 고급 블로그 포스팅으로 재탄생시킵니다.</p>
                </div>
            </div>

            {/* Progress Stepper Section */}
            {(workflowStatus !== 'IDLE') && (
                <div className="mb-12 bg-white dark:bg-[#111722] rounded-[2rem] border border-slate-200 dark:border-[#324467] py-8 pt-4 shadow-2xl shadow-red-500/5">
                    <ProgressStepper currentStatus={workflowStatus} error={workflowError} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Settings Panel */}
                <div className="lg:col-span-12 space-y-8">
                    <div className="bg-white dark:bg-[#111722] rounded-[2rem] border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden">
                        <div className="px-8 py-6 bg-slate-50/50 dark:bg-[#161e2d] border-b border-slate-200 dark:border-[#324467] flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                <LayoutGridIcon className="h-4 w-4 text-blue-600" /> 워크플로우 환경 설정
                            </h3>
                        </div>
                        
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Site & Category */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">발행 대상 사이트</label>
                                        <select
                                            value={formData.siteId}
                                            onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                            className="w-full h-14 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">사이트를 선택하세요...</option>
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
                                                className="w-full h-14 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 text-sm font-bold outline-none"
                                            >
                                                <option value="">카테고리 선택 (옵션)</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* AI Model & Status */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">AI 모델 선정</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['GPT4O', 'CLAUDE', 'GEMINI', 'GPT5'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setFormData({ ...formData, aiModel: m })}
                                                    className={`h-14 rounded-2xl text-[10px] font-black transition-all ${formData.aiModel === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 dark:bg-[#1e293b] text-slate-400 border border-slate-200 dark:border-[#324467]'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">발행 방식</label>
                                        <div className="flex gap-2">
                                            {['publish', 'draft'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setFormData({ ...formData, postStatus: s })}
                                                    className={`flex-1 h-14 rounded-2xl text-[10px] font-black transition-all ${formData.postStatus === s ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'bg-slate-50 dark:bg-[#1e293b] text-slate-400 border border-slate-200 dark:border-[#324467]'}`}
                                                >
                                                    {s === 'publish' ? '즉시 발행' : '임시 저장'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Images */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">이미지 생성 엔진</label>
                                        <select
                                            value={formData.imageSource}
                                            onChange={e => setFormData({ ...formData, imageSource: e.target.value as any })}
                                            className="w-full h-14 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 text-sm font-bold outline-none"
                                        >
                                            <option value="DALLE">DALL-E 3 (권장)</option>
                                            <option value="FLUX">FLUX Pro (고화질)</option>
                                            <option value="SCRAP">스크랩</option>
                                            <option value="NONE">이미지 없음</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">이미지 수량</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button
                                                    key={n}
                                                    disabled={formData.imageSource === 'NONE'}
                                                    onClick={() => setFormData({ ...formData, imageCount: n })}
                                                    className={`flex-1 h-12 rounded-xl text-xs font-black transition-all disabled:opacity-30 ${formData.imageCount === n ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600' : 'bg-slate-50 dark:bg-[#1e293b]'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Prompt Configuration */}
                            <div className="mt-12 bg-slate-50/50 dark:bg-[#161e2d] rounded-3xl p-8 border border-slate-100 dark:border-[#324467]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                                        <SparklesIcon className="h-4 w-4 text-orange-500" /> 글 작성 프롬프트
                                    </h4>
                                    <div className="bg-white dark:bg-[#111722] p-1 rounded-xl flex gap-1 shadow-sm border border-slate-200 dark:border-[#324467]">
                                        <button
                                            onClick={() => setIsCustomPrompt(false)}
                                            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${!isCustomPrompt ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
                                        >저장된 프롬프트</button>
                                        <button
                                            onClick={() => setIsCustomPrompt(true)}
                                            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${isCustomPrompt ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
                                        >직접 입력</button>
                                    </div>
                                </div>

                                {!isCustomPrompt ? (
                                    <select
                                        value={formData.selectedPromptId}
                                        onChange={e => setFormData({ ...formData, selectedPromptId: e.target.value })}
                                        className="w-full h-14 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-2xl px-5 text-sm font-bold text-slate-900 dark:text-white outline-none shadow-sm"
                                    >
                                        <option value="">적용할 프롬프트를 선택하세요...</option>
                                        {prompts.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({p.type})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <textarea
                                        value={formData.customPrompt}
                                        onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                        placeholder="AI에게 내 영상을 어떤 스타일로 요약해달라고 할까요?"
                                        className="w-full h-40 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-3xl p-6 text-sm font-medium leading-relaxed resize-none outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Flow - The Big Start Button */}
                    <div className="bg-white dark:bg-[#111722] rounded-[3rem] border-4 border-slate-900 dark:border-slate-700 p-8 pt-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32 rounded-full"></div>

                        <div className="relative z-10 space-y-8 text-center max-w-2xl mx-auto">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">지금 시작하세요</h3>
                                <p className="text-slate-400 text-xs font-medium">유튜브 URL만 입력하면 모든 과정이 자동으로 시작됩니다.</p>
                            </div>

                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formData.youtubeUrl}
                                    onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full h-20 bg-slate-50 dark:bg-[#161e2d] border-2 border-slate-200 dark:border-[#324467] rounded-[1.5rem] px-8 text-lg font-black outline-none focus:border-red-500 transition-all text-center pr-12 group-hover:shadow-lg"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                     <YoutubeIcon className="h-6 w-6 text-red-500 opacity-20" />
                                </div>
                            </div>

                            <button
                                onClick={startWorkflow}
                                disabled={workflowStatus !== 'IDLE' && workflowStatus !== 'ERROR' && workflowStatus !== 'COMPLETE'}
                                className={`
                                    w-full py-8 rounded-[2rem] font-black text-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4
                                    ${(workflowStatus === 'IDLE' || workflowStatus === 'ERROR' || workflowStatus === 'COMPLETE')
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-slate-500/30'
                                        : 'bg-slate-100 dark:bg-[#1e293b] text-slate-400 cursor-not-allowed'}
                                `}
                            >
                                {(workflowStatus !== 'IDLE' && workflowStatus !== 'ERROR' && workflowStatus !== 'COMPLETE') ? (
                                    <>
                                        <Loader2Icon className="h-8 w-8 animate-spin" />
                                        <span>AI 블로거 작업 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <ZapIcon className="h-8 w-8 fill-current" />
                                        <span>자동 생성 및 발행 시작</span>
                                        <ArrowRight className="h-6 w-6" />
                                    </>
                                )}
                            </button>
                            
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                                추출된 스크립트 기반 블로그 생성은 인공지능이 수행하며,<br/>
                                평균적으로 40초에서 1분 정도 소요됩니다.
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
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2Icon className="h-10 w-10 animate-spin text-slate-300" />
            </div>
        }>
            <YoutubeToBlogForm />
        </Suspense>
    )
}
