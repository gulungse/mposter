'use client'

import { useState, useEffect } from 'react'
import {
    LayoutGrid as LayoutGridIcon,
    Zap as ZapIcon,
    Loader2 as Loader2Icon,
    Sparkles as SparklesIcon,
    Terminal as TerminalIcon,
    Copy as CopyIcon,
    Check as CheckIcon,
    FileText,
    Bot as BotIcon,
    Wand2,
    Link as LinkIcon,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { getPrompts } from '@/app/actions/prompt'
import { generateManualContentAction, scrapeNaverBlogAction } from '@/app/actions/worker'

export default function ManualPostPage() {
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [prompts, setPrompts] = useState<any[]>([])
    const [copiedAll, setCopiedAll] = useState(false)
    const [copiedTitle, setCopiedTitle] = useState(false)
    const [copiedContent, setCopiedContent] = useState(false)

    const [formData, setFormData] = useState({
        originalTitle: '',
        originalContent: '',
        promptId: '',
        customPrompt: '',
        aiModel: 'GPT4O' as const
    })
    const [naverUrl, setNaverUrl] = useState('')
    const [scraping, setScraping] = useState(false)

    const [result, setResult] = useState<{ title: string; content: string } | null>(null)

    useEffect(() => {
        async function loadData() {
            const res = await getPrompts()
            if (res.success) setPrompts(res.data || [])
            setLoading(false)
        }
        loadData()
    }, [])

    const handleScrape = async () => {
        if (!naverUrl.trim()) {
            alert('네이버 블로그 URL을 입력해주세요.')
            return
        }
        if (!naverUrl.includes('blog.naver.com')) {
            alert('올바른 네이버 블로그 URL이 아닙니다.')
            return
        }

        setScraping(true)
        try {
            const res = await scrapeNaverBlogAction(naverUrl)
            if (res.success && res.data) {
                setFormData(prev => ({
                    ...prev,
                    originalTitle: res.data.title,
                    originalContent: res.data.content
                }))
            } else {
                alert(res.error || '내용 추출에 실패했습니다.')
            }
        } catch (error) {
            alert('오류가 발생했습니다.')
        } finally {
            setScraping(false)
        }
    }

    const handleGenerate = async () => {
        if (!formData.originalContent.trim()) {
            alert('원본 내용을 입력해주세요.')
            return
        }
        if (!formData.promptId && !formData.customPrompt.trim()) {
            alert('사용할 프롬프트를 선택하거나 직접 입력해주세요.')
            return
        }

        setGenerating(true)
        const res = await generateManualContentAction(formData)
        if (res.success && res.data) {
            setResult(res.data)
        } else {
            alert(res.error || '생성 실패')
        }
        setGenerating(false)
    }

    const handleCopyAll = () => {
        if (!result) return
        const textToCopy = `${result.title}\n\n${result.content}`
        navigator.clipboard.writeText(textToCopy)
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 2000)
    }

    const handleCopyTitle = () => {
        if (!result) return
        navigator.clipboard.writeText(result.title)
        setCopiedTitle(true)
        setTimeout(() => setCopiedTitle(false), 2000)
    }

    const handleCopyContent = () => {
        if (!result) return
        navigator.clipboard.writeText(result.content)
        setCopiedContent(true)
        setTimeout(() => setCopiedContent(false), 2000)
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            {/* Header */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Link href="/dashboard/prompts" className="hover:text-foreground transition-colors">Prompts</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">Manual Generation</span>
                </nav>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground font-sans flex items-center gap-3">
                        <Wand2 className="h-7 w-7 text-indigo-600" />
                        수동 글 생성 시스템
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">원본 데이터를 직접 입력하고 프롬프트를 적용하여 새 글을 생성합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Input Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl overflow-hidden flex flex-col p-6 space-y-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" /> 1. 원본 데이터 입력
                        </h3>

                        {/* Naver Blog Scraper Section */}
                        <div className="bg-slate-50 dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-200 dark:border-[#324467] space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                <LinkIcon className="h-3 w-3" /> 네이버 블로그 URL 추출 (선택 사항)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={naverUrl}
                                    onChange={e => setNaverUrl(e.target.value)}
                                    placeholder="https://blog.naver.com/..."
                                    className="flex-1 bg-white dark:bg-[#111722] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button
                                    onClick={handleScrape}
                                    disabled={scraping}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                                >
                                    {scraping ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                    추출
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                                네이버 블로그 URL을 넣고 추출을 누르면 아래 제목과 본문이 자동으로 채워집니다.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">원본 제목 (옵션)</label>
                            <input
                                type="text"
                                value={formData.originalTitle}
                                onChange={e => setFormData({ ...formData, originalTitle: e.target.value })}
                                placeholder="생성할 때 참고할 제목을 입력하세요..."
                                className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="space-y-2 flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">원본 내용 (필수)</label>
                            <textarea
                                value={formData.originalContent}
                                onChange={e => setFormData({ ...formData, originalContent: e.target.value })}
                                placeholder="가공할 원본 글 내용을 여기에 붙여넣으세요..."
                                className="w-full h-64 p-4 text-sm font-medium bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111722] rounded-3xl border border-slate-200 dark:border-[#324467] shadow-xl p-6 space-y-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <TerminalIcon className="h-4 w-4 text-blue-600" /> 2. 프롬프트 및 옵션 선택
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">프로프트 선택</label>
                                <select
                                    value={formData.promptId}
                                    onChange={e => setFormData({ ...formData, promptId: e.target.value, customPrompt: '' })}
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
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
                                    className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
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
                                <label className="text-[10px] font-bold text-slate-400 uppercase">사용자 정의 프롬프트</label>
                                <textarea
                                    value={formData.customPrompt}
                                    onChange={e => setFormData({ ...formData, customPrompt: e.target.value })}
                                    placeholder="적용할 프롬프트 명령을 입력하세요..."
                                    className="w-full h-32 p-4 text-sm font-medium bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#324467] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            {generating ? <Loader2Icon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                            {generating ? '생성 중...' : '새 글 생성하기'}
                        </button>
                    </div>
                </div>

                {/* Right: Output Section */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full min-h-[600px] relative">
                        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <BotIcon className="h-4 w-4 text-indigo-400" /> GENERATED CONTENT
                            </h3>
                            {result && (
                                <button
                                    onClick={handleCopyAll}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-white transition-colors"
                                >
                                    {copiedAll ? <CheckIcon className="h-3 w-3 text-green-400" /> : <CopyIcon className="h-3 w-3" />}
                                    {copiedAll ? 'COPIED!' : 'COPY ALL'}
                                </button>
                            )}
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto font-mono text-sm leading-relaxed text-slate-300">
                            {result ? (
                                <div className="space-y-6">
                                    <div className="relative group/item">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase"># Title</div>
                                            <button
                                                onClick={handleCopyTitle}
                                                className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[9px] font-black text-slate-300 transition-all"
                                            >
                                                {copiedTitle ? <CheckIcon className="h-2.5 w-2.5 text-green-400" /> : <CopyIcon className="h-2.5 w-2.5" />}
                                                {copiedTitle ? 'COPIED' : 'COPY'}
                                            </button>
                                        </div>
                                        <div className="text-lg font-bold text-white bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                            {result.title}
                                        </div>
                                    </div>
                                    <div className="relative group/item">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase"># Content</div>
                                            <button
                                                onClick={handleCopyContent}
                                                className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[9px] font-black text-slate-300 transition-all"
                                            >
                                                {copiedContent ? <CheckIcon className="h-2.5 w-2.5 text-green-400" /> : <CopyIcon className="h-2.5 w-2.5" />}
                                                {copiedContent ? 'COPIED' : 'COPY'}
                                            </button>
                                        </div>
                                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 whitespace-pre-wrap">
                                            {result.content}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 animate-pulse">
                                    <SparklesIcon className="h-12 w-12 opacity-20" />
                                    <p className="font-bold text-center">왼쪽에서 데이터를 입력하고 <br />생성 버튼을 눌러주세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
