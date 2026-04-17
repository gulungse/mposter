'use client'

import { useState, useEffect } from 'react'
import { Key, AlertCircle, Info, Loader2, CheckCircle2, XCircle, Sparkles, Brain, Image as ImageIcon, ExternalLink, BarChart3, DollarSign, TrendingUp, Activity } from 'lucide-react'
import { updateUserSettings, getUserSettings, validateOpenAI, validateGemini, validateAnthropic, validatePiApi, validatePixabay, validatePexels, validateUnsplash, validateFreepik, getApiUsageStats } from '@/app/actions/user'
import { MODEL_PRICING } from '@/lib/ai-models'
import { clsx } from 'clsx'

export default function ApiManagementPage() {
    const [loading, setLoading] = useState(true)
    const [keys, setKeys] = useState<Record<string, string>>({})
    const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
    const [savingKey, setSavingKey] = useState<string | null>(null)
    const [validating, setValidating] = useState<Record<string, boolean>>({})
    const [validationResults, setValidationResults] = useState<Record<string, { success: boolean, message: string } | null>>({})
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
    const [usageStats, setUsageStats] = useState<any[]>([])
    const [statsLoading, setStatsLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                setStatsLoading(true)
                const [settingsRes, usageRes] = await Promise.all([
                    getUserSettings(),
                    getApiUsageStats()
                ])
                
                if (settingsRes.success && settingsRes.data) {
                    setKeys(settingsRes.data as Record<string, string>)
                    const initialApplied = new Set<string>()
                    Object.entries(settingsRes.data).forEach(([k, v]) => {
                        if (v && (v as string).trim()) {
                            const service = k.replace('ApiKey', '').replace('AccessKey', '').replace('AppId', '').toLowerCase()
                            initialApplied.add(service)
                        }
                    })
                    setAppliedKeys(initialApplied)
                }
                if (usageRes.success && usageRes.data) {
                    setUsageStats(usageRes.data)
                }
            } catch (err) {
                console.error("Error loading API data:", err)
                showToast("데이터를 불러오는 중 오류가 발생했습니다.", 'error')
            } finally {
                setLoading(false)
                setStatsLoading(false)
            }
        }
        loadData()
    }, [])

    const handleChange = (field: string, type: string, value: string) => {
        setKeys(prev => ({ ...prev, [field]: value }))
        setValidationResults(prev => ({ ...prev, [type]: null }))
        setAppliedKeys(prev => { 
            const n = new Set(prev)
            n.delete(type)
            return n 
        })
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type })
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
    }

    const handleSaveSingle = async (
        service: string,
        label: string,
        validation: { success: boolean, message: string } | null | undefined,
        skipValidation = false
    ) => {
        if (!skipValidation) {
            if (!validation) {
                showToast("먼저 '연결 테스트'를 진행해주세요.", 'error')
                return
            }
            if (!validation.success) {
                showToast("유효하지 않은 API 키입니다. 테스트를 통과해야 합니다.", 'error')
                return
            }
        }

        setSavingKey(service)
        const res = await updateUserSettings(keys)

        if (res.success) {
            showToast(`${label} API 키 적용 완료!`, 'success')
            setAppliedKeys(prev => new Set(prev).add(service))
        } else {
            showToast(res.error || '저장 중 오류가 발생했습니다.', 'error')
        }
        setSavingKey(null)
    }

    const testConnection = async (type: string) => {
        setValidating(prev => ({ ...prev, [type]: true }))
        setValidationResults(prev => ({ ...prev, [type]: null }))

        let result;
        if (type === 'openai') result = await validateOpenAI(keys.openaiApiKey)
        else if (type === 'anthropic') result = await validateAnthropic(keys.anthropicApiKey)
        else if (type === 'gemini') result = await validateGemini(keys.geminiApiKey)
        else if (type === 'piapi') result = await validatePiApi(keys.piApiKey)
        else if (type === 'pixabay') result = await validatePixabay(keys.pixabayApiKey)
        else if (type === 'pexels') result = await validatePexels(keys.pexelsApiKey)
        else if (type === 'unsplash') result = await validateUnsplash(keys.unsplashAccessKey)
        else if (type === 'freepik') result = await validateFreepik(keys.freepikApiKey)
        else result = { success: false, message: '알 수 없는 타입' }

        setValidationResults(prev => ({ ...prev, [type]: result }))
        setValidating(prev => ({ ...prev, [type]: false }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-[#0B1220]">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B1220] p-6 sm:p-8 space-y-10 font-sans text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1F2937] pb-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
                        <Key className="h-8 w-8 text-blue-500" />
                        API 관리
                    </h1>
                    <p className="text-[#9CA3AF] text-base mt-2">
                        콘텐츠 생성 및 이미지 제작을 위한 외부 서비스 API 키를 설정하고 테스트하세요.
                    </p>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 px-4 py-3 rounded-xl flex gap-3 max-w-md">
                    <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300 leading-relaxed">
                        API 키는 암호화되어 보관됩니다. <strong>연결 테스트</strong> 통과 후에 <strong>적용</strong>해주세요.
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in fade-in zoom-in duration-300">
                    <div className={clsx(
                        "px-12 py-10 rounded-2xl shadow-2xl border flex flex-col items-center gap-6 min-w-[400px] bg-[#111827]/98 backdrop-blur-xl",
                        toast.type === 'success' ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"
                    )}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
                        <span className="font-semibold text-xl text-white text-center">{toast.message}</span>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <ApiInputRow
                    label="CHATGPT"
                    description="OpenAI GPT-4o, GPT-4o-mini"
                    value={keys.openaiApiKey || ''}
                    onChange={(v) => handleChange('openaiApiKey', 'openai', v)}
                    onTest={() => testConnection('openai')}
                    onSave={() => handleSaveSingle('openai', 'ChatGPT', validationResults['openai'])}
                    isSaving={savingKey === 'openai'}
                    isApplied={appliedKeys.has('openai')}
                    isValidating={validating['openai']}
                    validationResult={validationResults['openai']}
                    icon={<Brain className="h-5 w-5" />}
                    placeholder="sk-..."
                    issueURL="https://openai.com/ko-KR/index/openai-api/"
                />

                <ApiInputRow
                    label="GEMINI"
                    description="Google Multi-modal LLM (Flash/Pro)"
                    value={keys.geminiApiKey || ''}
                    onChange={(v) => handleChange('geminiApiKey', 'gemini', v)}
                    onTest={() => testConnection('gemini')}
                    onSave={() => handleSaveSingle('gemini', 'Gemini', validationResults['gemini'])}
                    isSaving={savingKey === 'gemini'}
                    isApplied={appliedKeys.has('gemini')}
                    isValidating={validating['gemini']}
                    validationResult={validationResults['gemini']}
                    icon={<Sparkles className="h-5 w-5" />}
                    placeholder="AIza..."
                    issueURL="https://aistudio.google.com/app/api-keys?hl=ko"
                />

                <ApiInputRow
                    label="CLAUDE 3"
                    description="Anthropic High-performance Models"
                    value={keys.anthropicApiKey || ''}
                    onChange={(v) => handleChange('anthropicApiKey', 'anthropic', v)}
                    onTest={() => testConnection('anthropic')}
                    onSave={() => handleSaveSingle('anthropic', 'Claude 3', validationResults['anthropic'])}
                    isSaving={savingKey === 'anthropic'}
                    isApplied={appliedKeys.has('anthropic')}
                    isValidating={validating['anthropic']}
                    validationResult={validationResults['anthropic']}
                    icon={<Sparkles className="h-5 w-5" />}
                    placeholder="sk-ant-..."
                    issueURL="https://console.anthropic.com/"
                />

                <ApiInputRow
                    label="PIAPI (FLUX)"
                    description="Advanced Image Generation (FLUX/SDXL)"
                    value={keys.piApiKey || ''}
                    onChange={(v) => handleChange('piApiKey', 'piapi', v)}
                    onTest={() => testConnection('piapi')}
                    onSave={() => handleSaveSingle('piapi', 'piAPI', validationResults['piapi'])}
                    isSaving={savingKey === 'piapi'}
                    isApplied={appliedKeys.has('piapi')}
                    isValidating={validating['piapi']}
                    validationResult={validationResults['piapi']}
                    icon={<ImageIcon className="h-5 w-5" />}
                    placeholder="piapi.ai API Key"
                    issueURL="https://piapi.ai/"
                />

                <ApiInputRowGroup
                    label="UNSPLASH"
                    description="Premium Visuals Content"
                    icon={<ImageIcon className="h-5 w-5" />}
                    issueURL="https://unsplash.com/developers"
                    inputs={[
                        { label: 'APP ID', value: keys.unsplashAppId || '', placeholder: 'App ID', onChange: (v) => handleChange('unsplashAppId', 'unsplash', v) },
                        { label: 'ACCESS KEY', value: keys.unsplashAccessKey || '', placeholder: 'Access Key', onChange: (v) => handleChange('unsplashAccessKey', 'unsplash', v) }
                    ]}
                    onTest={() => testConnection('unsplash')}
                    onSave={() => handleSaveSingle('unsplash', 'Unsplash', validationResults['unsplash'], true)}
                    isSaving={savingKey === 'unsplash'}
                    isApplied={appliedKeys.has('unsplash')}
                    isValidating={validating['unsplash']}
                    validationResult={validationResults['unsplash']}
                />

                <ApiInputRow
                    label="PIXABAY"
                    description="Free Image & Video Library"
                    value={keys.pixabayApiKey || ''}
                    onChange={(v) => handleChange('pixabayApiKey', 'pixabay', v)}
                    onTest={() => testConnection('pixabay')}
                    onSave={() => handleSaveSingle('pixabay', 'Pixabay', validationResults['pixabay'])}
                    isSaving={savingKey === 'pixabay'}
                    isApplied={appliedKeys.has('pixabay')}
                    isValidating={validating['pixabay']}
                    validationResult={validationResults['pixabay']}
                    icon={<ImageIcon className="h-5 w-5" />}
                    placeholder="Pixabay Key"
                    issueURL="https://pixabay.com/service/about/api/"
                />

                <ApiInputRow
                    label="PEXELS"
                    description="High-quality Free Photos"
                    value={keys.pexelsApiKey || ''}
                    onChange={(v) => handleChange('pexelsApiKey', 'pexels', v)}
                    onTest={() => testConnection('pexels')}
                    onSave={() => handleSaveSingle('pexels', 'Pexels', validationResults['pexels'])}
                    isSaving={savingKey === 'pexels'}
                    isApplied={appliedKeys.has('pexels')}
                    isValidating={validating['pexels']}
                    validationResult={validationResults['pexels']}
                    icon={<ImageIcon className="h-5 w-5" />}
                    placeholder="Pexels Key"
                    issueURL="https://www.pexels.com/api/"
                />

                <ApiInputRow
                    label="FREEPIK"
                    description="Professional Vector & Photo Assets"
                    value={keys.freepikApiKey || ''}
                    onChange={(v) => handleChange('freepikApiKey', 'freepik', v)}
                    onTest={() => testConnection('freepik')}
                    onSave={() => handleSaveSingle('freepik', 'Freepik', validationResults['freepik'])}
                    isSaving={savingKey === 'freepik'}
                    isApplied={appliedKeys.has('freepik')}
                    isValidating={validating['freepik']}
                    validationResult={validationResults['freepik']}
                    icon={<ImageIcon className="h-5 w-5" />}
                    placeholder="Freepik Key"
                    issueURL="https://www.freepik.com/api"
                />
            </div>

            {/* AI Usage & Cost Dashboard Section */}
            <div className="space-y-6 mt-16 pt-10 border-t border-[#1F2937]">
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-blue-500" />
                    <h2 className="text-xl font-semibold text-white tracking-tight uppercase">API Usage & Billing Dashboard</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatusCard 
                        label="Total Estimated Cost" 
                        value={`$${calculateTotalCost(usageStats).toFixed(3)}`} 
                        subLabel="Calculated from logs"
                        icon={<DollarSign className="h-5 w-5 text-green-500" />}
                    />
                    <StatusCard 
                        label="Total Prompt Tokens" 
                        value={usageStats.reduce((acc, curr) => acc + (curr.inputTokens || 0), 0).toLocaleString()} 
                        subLabel="Sent to AI models"
                        icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                    />
                    <StatusCard 
                        label="Total Completion Tokens" 
                        value={usageStats.reduce((acc, curr) => acc + (curr.outputTokens || 0), 0).toLocaleString()} 
                        subLabel="Generated by models"
                        icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                    />
                    <StatusCard 
                        label="Active Models" 
                        value={new Set(usageStats.map(s => s.aiModelUsed)).size.toString()} 
                        subLabel="Different AI utilized"
                        icon={<Activity className="h-5 w-5 text-purple-500" />}
                    />
                </div>

                {/* Detailed Usage Table */}
                <div className="bg-[#111827] rounded-xl border border-[#1F2937] overflow-hidden shadow-xl mt-4">
                    <div className="p-6 border-b border-[#1F2937] bg-[#111827]/50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Provider Usage Breakdown</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-[#1F2937] px-2 py-1 rounded-full uppercase">Last 30 Days</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0B1220] border-b border-[#1F2937]">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Model ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Prompt Tokens</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Completion Tokens</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Estimated Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {Object.entries(aggregateUsage(usageStats)).map(([model, data]: [string, any]) => (
                                    <tr key={model} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "h-2 w-2 rounded-full",
                                                    model.includes('gpt') ? "bg-emerald-500" : model.includes('gemini') ? "bg-blue-500" : "bg-orange-500"
                                                )} />
                                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-tight">{model}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400 text-right font-mono">
                                            {data.input.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400 text-right font-mono">
                                            {data.output.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md">
                                                ${calculateModelCost(model, data.input, data.output).toFixed(4)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {usageStats.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <BarChart3 className="h-8 w-8 text-slate-500" />
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No usage records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusCard({ label, value, subLabel, icon }: { label: string, value: string, subLabel: string, icon: React.ReactNode }) {
    return (
        <div className="bg-[#111827] p-6 rounded-xl border border-[#1F2937] shadow-sm hover:border-blue-500/30 transition-all flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="p-2 bg-[#0B1220] rounded-lg border border-[#1F2937]">
                    {icon}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
            </div>
            <div>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-1">{subLabel}</div>
            </div>
        </div>
    )
}

// --- Helper Functions for Stats ---

function calculateModelCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };
    return (inputTokens / 1_000_000 * pricing.input) + (outputTokens / 1_000_000 * pricing.output);
}

function calculateTotalCost(stats: any[]): number {
    return stats.reduce((acc, curr) => {
        return acc + calculateModelCost(curr.aiModelUsed, curr.inputTokens || 0, curr.outputTokens || 0);
    }, 0);
}

function aggregateUsage(stats: any[]): Record<string, { input: number, output: number }> {
    const agg: Record<string, { input: number, output: number }> = {};
    stats.forEach(s => {
        const model = s.aiModelUsed || 'unknown';
        if (!agg[model]) agg[model] = { input: 0, output: 0 };
        agg[model].input += (s.inputTokens || 0);
        agg[model].output += (s.outputTokens || 0);
    });
    return agg;
}

interface ApiInputRowProps {
    label: string
    description: string
    value: string
    onChange: (val: string) => void
    onTest?: () => void
    onSave: () => void
    isSaving: boolean
    isApplied: boolean
    isValidating: boolean
    validationResult: { success: boolean, message: string } | null | undefined
    icon: React.ReactNode
    placeholder: string
    issueURL?: string
}

function ApiInputRow({ label, description, value, onChange, onTest, onSave, isSaving, isApplied, isValidating, validationResult, icon, placeholder, issueURL }: ApiInputRowProps) {
    return (
        <div className="bg-[#111827] rounded-xl border border-[#1F2937] p-6 hover:shadow-[0_0_30px_rgba(59,130,246,0.03)] transition-all flex flex-col lg:flex-row lg:items-center gap-8 group">
            {/* Left: Brand Info */}
            <div className="flex items-center gap-4 lg:w-1/3 min-w-[280px]">
                <div className="bg-[#1F2937] p-3 rounded-xl text-blue-400 group-hover:bg-blue-600/10 transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight leading-none mb-1.5 uppercase transition-colors">
                        {label}
                    </h3>
                    <p className="text-sm text-[#9CA3AF] font-medium leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {/* Middle: Input field */}
            <div className="flex-1 relative">
                <input
                    type="password"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full bg-[#0B1220] border border-[#1F2937] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4B5563] Transition-all font-mono tracking-widest",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
                    )}
                />
                
                {/* Status Badge */}
                {validationResult && (
                    <div className={clsx(
                        "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold border animate-in zoom-in duration-200",
                        validationResult.success 
                            ? "bg-green-500/10 text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                        {validationResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {validationResult.message}
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 lg:w-auto shrink-0 justify-end">
                {onTest && (
                    <button
                        onClick={onTest}
                        disabled={isValidating || !value}
                        className={clsx(
                            "px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border active:scale-95",
                            !value
                                ? "bg-transparent text-[#4B5563] border-[#1F2937] cursor-not-allowed"
                                : "bg-transparent text-white border-[#1F2937] hover:bg-[#1F2937] hover:border-[#374151]"
                        )}
                    >
                        {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        연결 테스트
                    </button>
                )}

                <button
                    onClick={onSave}
                    disabled={isSaving || (isApplied && !isSaving)}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 border",
                        isApplied 
                            ? "bg-green-500/10 text-green-400 border-green-500/20 cursor-default"
                            : "bg-[#22C55E] text-white hover:bg-[#16a34a] border-[#22C55E]"
                    )}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {isSaving ? '적용 중' : isApplied ? '적용됨' : '적용하기'}
                </button>

                {issueURL && (
                    <a
                        href={issueURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] transition-all flex items-center gap-1.5"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        발급
                    </a>
                )}
            </div>
        </div>
    )
}

interface ApiInputRowGroupProps {
    label: string
    description: string
    inputs: { label: string, value: string, placeholder: string, onChange: (v: string) => void }[]
    onTest?: () => void
    onSave: () => void
    isSaving: boolean
    isApplied: boolean
    isValidating: boolean
    validationResult: { success: boolean, message: string } | null | undefined
    icon: React.ReactNode
    issueURL?: string
}

function ApiInputRowGroup({ label, description, inputs, onTest, onSave, isSaving, isApplied, isValidating, validationResult, icon, issueURL }: ApiInputRowGroupProps) {
    return (
        <div className="bg-[#111827] rounded-xl border border-[#1F2937] p-6 hover:shadow-[0_0_30px_rgba(59,130,246,0.03)] transition-all flex flex-col lg:flex-row lg:items-center gap-8 group">
            {/* Left: Brand Info */}
            <div className="flex items-center gap-4 lg:w-1/3 min-w-[280px]">
                <div className="bg-[#1F2937] p-3 rounded-xl text-blue-400 group-hover:bg-blue-600/10 transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white tracking-tight leading-none mb-1.5 uppercase transition-colors">
                        {label}
                    </h3>
                    <p className="text-sm text-[#9CA3AF] font-medium leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {/* Middle: Inputs */}
            <div className="flex-1 space-y-4 relative">
                {inputs.map((input, idx) => (
                    <div key={idx} className="relative">
                        <div className="absolute left-3 -top-2 px-1 bg-[#111827] text-[8px] font-bold text-[#4B5563] uppercase tracking-tighter z-10">{input.label}</div>
                        <input
                            type="password"
                            value={input.value || ''}
                            onChange={(e) => input.onChange(e.target.value)}
                            placeholder={input.placeholder}
                            className="w-full bg-[#0B1220] border border-[#1F2937] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all font-mono tracking-widest"
                        />
                    </div>
                ))}

                {/* Status Badge */}
                {validationResult && (
                    <div className={clsx(
                        "absolute right-3 bottom-3 flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold border animate-in zoom-in duration-200 z-20",
                        validationResult.success 
                            ? "bg-green-500/10 text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                        {validationResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {validationResult.message}
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 lg:w-auto shrink-0 justify-end">
                {onTest && (
                    <button
                        onClick={onTest}
                        disabled={isValidating || inputs.some(i => !i.value)}
                        className={clsx(
                            "px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border active:scale-95",
                            inputs.some(i => !i.value)
                                ? "bg-transparent text-[#4B5563] border-[#1F2937] cursor-not-allowed"
                                : "bg-transparent text-white border-[#1F2937] hover:bg-[#1F2937] hover:border-[#374151]"
                        )}
                    >
                        {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        연결 테스트
                    </button>
                )}

                <button
                    onClick={onSave}
                    disabled={isSaving || (isApplied && !isSaving)}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 border",
                        isApplied 
                            ? "bg-green-500/10 text-green-400 border-green-500/20 cursor-default"
                            : "bg-[#22C55E] text-white hover:bg-[#16a34a] border-[#22C55E]"
                    )}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {isSaving ? '적용 중' : isApplied ? '적용됨' : '적용하기'}
                </button>

                {issueURL && (
                    <a
                        href={issueURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] transition-all flex items-center gap-1.5"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        발급
                    </a>
                )}
            </div>
        </div>
    )
}
