'use client'

import { useState, useEffect } from 'react'
import { Key, Save, AlertCircle, Info, Loader2, CheckCircle2, XCircle, Sparkles, Brain, Image as ImageIcon, Globe, ExternalLink } from 'lucide-react'
import { updateUserSettings, getUserSettings, validateOpenAI, validateGemini, validateAnthropic, validatePiApi, validatePixabay, validatePexels, validateUnsplash, validateFreepik } from '@/app/actions/user'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'

export default function ApiManagementPage() {
    const [loading, setLoading] = useState(true)
    // saving state can be general or per key, but for simplicity we keep it general or use a Set for tracking per-row saving?
    // Let's use a state to track which key is saving.
    const [savingKey, setSavingKey] = useState<string | null>(null)

    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })

    // API Keys State
    const [keys, setKeys] = useState({
        openaiApiKey: '',
        anthropicApiKey: '',
        geminiApiKey: '',
        piApiKey: '',
        pixabayApiKey: '',
        pexelsApiKey: '',
        unsplashAppId: '',
        unsplashAccessKey: '',
        unsplashSecretKey: '',
        freepikApiKey: '',
        googleClientId: '',
        googleClientSecret: ''
    })

    // Validation State
    const [validating, setValidating] = useState<Record<string, boolean>>({})
    const [validationResults, setValidationResults] = useState<Record<string, { success: boolean, message: string } | null>>({})

    useEffect(() => {
        async function loadSettings() {
            const res = await getUserSettings()
            if (res.success && res.data) {
                setKeys({
                    openaiApiKey: res.data.openaiApiKey || '',
                    anthropicApiKey: res.data.anthropicApiKey || '',
                    geminiApiKey: res.data.geminiApiKey || '',
                    piApiKey: res.data.piApiKey || '',
                    pixabayApiKey: res.data.pixabayApiKey || '',
                    pexelsApiKey: res.data.pexelsApiKey || '',
                    unsplashAppId: res.data.unsplashAppId || '',
                    unsplashAccessKey: res.data.unsplashAccessKey || '',
                    unsplashSecretKey: res.data.unsplashSecretKey || '',
                    freepikApiKey: res.data.freepikApiKey || '',
                    googleClientId: (res.data as any).googleClientId || '',
                    googleClientSecret: (res.data as any).googleClientSecret || ''
                })
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    const handleChange = (field: keyof typeof keys, type: string, value: string) => {
        setKeys(prev => ({ ...prev, [field]: value }))
        // 입력값이 변경되면 해당 타입의 검증 결과 초기화
        setValidationResults(prev => ({ ...prev, [type]: null }))
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type })
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
    }

    const handleSaveSingle = async (
        keyName: string,
        label: string,
        validation: { success: boolean, message: string } | null | undefined,
        skipValidation = false
    ) => {
        // 1. 검증 여부 확인 (skipValidation이 false일 때만 체크)
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

        setSavingKey(keyName)

        // 현재 상태의 keys를 모두 저장하지만, 사용자에게는 해당 키만 저장한 것처럼 피드백
        const res = await updateUserSettings(keys)

        if (res.success) {
            showToast(`${label} API 키 적용 완료!`, 'success')
        } else {
            showToast(res.error || '저장 중 오류가 발생했습니다.', 'error')
        }
        setSavingKey(null)
    }

    const testConnection = async (type: 'openai' | 'anthropic' | 'gemini' | 'piapi' | 'pixabay' | 'pexels' | 'unsplash' | 'freepik') => {
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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <Key className="h-8 w-8 text-blue-600" />
                        API 관리
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                        콘텐츠 생성 및 이미지 제작을 위한 외부 서비스 API 키를 설정하고 테스트하세요.
                    </p>
                </div>
                            {/* Notice Badge/Card Simplified */}
                <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-2xl flex gap-3 lg:max-w-md">
                    <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300 leading-relaxed">
                        API 키는 암호화되어 보관됩니다. <strong>연결 테스트</strong> 통과 후에 <strong>적용</strong>해주시기 바랍니다.
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] animate-in fade-in zoom-in duration-300">
                    <div className={clsx(
                        "px-12 py-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.2)] border flex flex-col items-center gap-6 min-w-[400px] bg-white/95 dark:bg-[#1a2333]/95 backdrop-blur-xl",
                        toast.type === 'success'
                            ? "border-green-500/30 text-green-600 dark:text-green-400"
                            : "border-red-500/30 text-red-600 dark:text-red-400"
                    )}>
                        <div className={clsx(
                            "p-4 rounded-full",
                            toast.type === 'success' ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                        )}>
                            {toast.type === 'success' ? <CheckCircle2 className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
                        </div>
                        <span className="font-black text-2xl text-slate-800 dark:text-white text-center">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Row 1: GPT, Gemini, Claude, Google OAuth (Align with Row 2 by using 5 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <ApiInputRow
                    label="CHATGPT (OPENAI)"
                    description="GPT-4o, GPT-4o-mini 모델 텍스트 생성"
                    value={keys.openaiApiKey}
                    onChange={(v) => handleChange('openaiApiKey', 'openai', v)}
                    onTest={() => testConnection('openai')}
                    onSave={() => handleSaveSingle('openai', 'ChatGPT', validationResults['openai'])}
                    isSaving={savingKey === 'openai'}
                    isValidating={validating['openai']}
                    validationResult={validationResults['openai']}
                    icon={<Brain className="h-5 w-5 text-emerald-500" />}
                    placeholder="sk-..."
                    issueURL="https://openai.com/ko-KR/index/openai-api/"
                />

                <ApiInputRow
                    label="GEMINI (GOOGLE)"
                    description="Google 최신 LLM 텍스트/이미지 생성"
                    value={keys.geminiApiKey}
                    onChange={(v) => handleChange('geminiApiKey', 'gemini', v)}
                    onTest={() => testConnection('gemini')}
                    onSave={() => handleSaveSingle('gemini', 'Gemini', validationResults['gemini'])}
                    isSaving={savingKey === 'gemini'}
                    isValidating={validating['gemini']}
                    validationResult={validationResults['gemini']}
                    icon={<Sparkles className="h-5 w-5 text-blue-500" />}
                    placeholder="AIza..."
                    issueURL="https://aistudio.google.com/app/api-keys?hl=ko"
                />

                <ApiInputRow
                    label="CLAUDE 3 (ANTHROPIC)"
                    description="Claude 3 Opus 등 고품질 텍스트 생성"
                    value={keys.anthropicApiKey}
                    onChange={(v) => handleChange('anthropicApiKey', 'anthropic', v)}
                    onTest={() => testConnection('anthropic')}
                    onSave={() => handleSaveSingle('anthropic', 'Claude 3', validationResults['anthropic'])}
                    isSaving={savingKey === 'anthropic'}
                    isValidating={validating['anthropic']}
                    validationResult={validationResults['anthropic']}
                    icon={<Sparkles className="h-5 w-5 text-orange-500" />}
                    placeholder="sk-ant-..."
                    issueURL="https://console.anthropic.com/"
                />

                {/* Consolidated Google OAuth Card */}
                <ApiInputRowGroup
                    label="GOOGLE OAUTH"
                    description={"블로그스팟 사용 필수연결"}
                    icon={<Globe className="h-5 w-5 text-amber-500" />}
                    issueURL="https://console.cloud.google.com/welcome"
                    inputs={[
                        { label: 'CLIENT ID', value: keys.googleClientId || '', placeholder: 'Client ID', onChange: (v) => handleChange('googleClientId', 'google', v) },
                        { label: 'CLIENT SECRET', value: keys.googleClientSecret || '', placeholder: 'Secret Key', onChange: (v) => handleChange('googleClientSecret', 'google', v) }
                    ]}
                    onSave={() => handleSaveSingle('google', 'Google OAuth', null, true)}
                    isSaving={savingKey === 'google'}
                    isValidating={false}
                    validationResult={null}
                    color="amber"
                />
            </div>

            {/* Row 2: piAPI, Pixabay, Pexels, Freepik, Unsplash (5 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <ApiInputRow
                    label="PIAPI (FLUX)"
                    description="FLUX 모델 고퀄리티 블로그 이미지 생성"
                    value={keys.piApiKey}
                    onChange={(v) => handleChange('piApiKey', 'piapi', v)}
                    onTest={() => testConnection('piapi')}
                    onSave={() => handleSaveSingle('piapi', 'piAPI', validationResults['piapi'])}
                    isSaving={savingKey === 'piapi'}
                    isValidating={validating['piapi']}
                    validationResult={validationResults['piapi']}
                    icon={<ImageIcon className="h-5 w-5 text-purple-500" />}
                    placeholder="piapi.ai API Key"
                    issueURL="https://piapi.ai/"
                />

                <ApiInputRow
                    label="PIXABAY"
                    description="방대한 무료 이미지 라이브러리"
                    value={keys.pixabayApiKey}
                    onChange={(v) => handleChange('pixabayApiKey', 'pixabay', v)}
                    onTest={() => testConnection('pixabay')}
                    onSave={() => handleSaveSingle('pixabay', 'Pixabay', validationResults['pixabay'])}
                    isSaving={savingKey === 'pixabay'}
                    isValidating={validating['pixabay']}
                    validationResult={validationResults['pixabay']}
                    icon={<ImageIcon className="h-5 w-5 text-green-500" />}
                    placeholder="Pixabay Key"
                    issueURL="https://pixabay.com/service/about/api/"
                />

                <ApiInputRow
                    label="PEXELS"
                    description="감각적인 고퀄리티 무료 이미지"
                    value={keys.pexelsApiKey}
                    onChange={(v) => handleChange('pexelsApiKey', 'pexels', v)}
                    onTest={() => testConnection('pexels')}
                    onSave={() => handleSaveSingle('pexels', 'Pexels', validationResults['pexels'])}
                    isSaving={savingKey === 'pexels'}
                    isValidating={validating['pexels']}
                    validationResult={validationResults['pexels']}
                    icon={<ImageIcon className="h-5 w-5 text-teal-500" />}
                    placeholder="Pexels Key"
                    issueURL="https://www.pexels.com/api/"
                />

                <ApiInputRow
                    label="FREEPIK"
                    description="프리미엄급 고화질 이미지 검색"
                    value={keys.freepikApiKey}
                    onChange={(v) => handleChange('freepikApiKey', 'freepik', v)}
                    onTest={() => testConnection('freepik')}
                    onSave={() => handleSaveSingle('freepik', 'Freepik', validationResults['freepik'])}
                    isSaving={savingKey === 'freepik'}
                    isValidating={validating['freepik']}
                    validationResult={validationResults['freepik']}
                    icon={<ImageIcon className="h-5 w-5 text-blue-600" />}
                    placeholder="Freepik Key"
                    issueURL="https://www.freepik.com/api"
                />

                {/* Consolidated Unsplash Card */}
                <ApiInputRowGroup
                    label="UNSPLASH"
                    description={"App ID & Access Key"}
                    icon={<ImageIcon className="h-5 w-5 text-gray-400" />}
                    issueURL="https://unsplash.com/developers"
                    inputs={[
                        { label: 'APP ID', value: keys.unsplashAppId, placeholder: 'App ID', onChange: (v) => handleChange('unsplashAppId', 'unsplash', v) },
                        { label: 'ACCESS KEY', value: keys.unsplashAccessKey, placeholder: 'Access Key', onChange: (v) => handleChange('unsplashAccessKey', 'unsplash', v) }
                    ]}
                    onTest={() => testConnection('unsplash')}
                    onSave={() => handleSaveSingle('unsplash', 'Unsplash', validationResults['unsplash'], true)}
                    isSaving={savingKey === 'unsplash'}
                    isValidating={validating['unsplash']}
                    validationResult={validationResults['unsplash']}
                    color="slate"
                />
            </div>
        </div>
    )
}

interface ApiInputRowProps {
    label: string
    description: string
    value: string
    onChange: (val: string) => void
    onTest?: () => void
    onSave: () => void
    isSaving: boolean
    isValidating: boolean
    validationResult: { success: boolean, message: string } | null | undefined
    icon: React.ReactNode
    placeholder: string
    compact?: boolean
    issueURL?: string
}

function ApiInputRow({ label, description, value, onChange, onTest, onSave, isSaving, isValidating, validationResult, icon, placeholder, compact, issueURL }: ApiInputRowProps) {
    return (
        <div className={clsx(
            "bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] shadow-lg overflow-hidden group transition-all hover:border-blue-400/50 flex flex-col p-6 w-full max-w-[300px]",
            compact && "rounded-xl"
        )}>
            <div className="flex flex-col gap-4 flex-1 items-center text-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tighter leading-tight uppercase font-heading">
                        {label}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium whitespace-pre-line leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="w-full space-y-2.5">
                    <div className="relative">
                        <input
                            type="password"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="키 입력"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#00e5ff]/10 dark:bg-[#00e5ff]/5 border-2 border-[#00e5ff]/30 text-center text-xs focus:outline-none focus:ring-4 focus:ring-[#00e5ff]/20 transition-all font-bold text-slate-900 dark:text-[#00e5ff] placeholder:text-[#00e5ff]/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {onTest && (
                            <button
                                onClick={onTest}
                                disabled={isValidating || !value}
                                className={clsx(
                                    "w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase",
                                    !value
                                        ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-[#333c4d] text-white border-[#333c4d] hover:bg-[#1f2937]"
                                )}
                            >
                                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isValidating ? '연결 중...' : '연결 테스트'}
                            </button>
                        )}

                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={clsx(
                                "w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase",
                                "bg-[#1d4ed8] text-white border-[#1d4ed8] hover:bg-[#1e40af]",
                                isSaving && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            적용하기
                        </button>

                        {issueURL && (
                            <a
                                href={issueURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase bg-[#059669] text-white border-[#059669] hover:bg-[#047857]"
                            >
                                발급받기
                            </a>
                        )}
                    </div>
                </div>

                {validationResult && (
                    <div className={clsx(
                        "mt-auto pt-1 flex items-center gap-2 text-[10px] font-black animate-in fade-in slide-in-from-bottom-1",
                        validationResult.success ? "text-green-600" : "text-red-500"
                    )}>
                        {validationResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="truncate">{validationResult.message}</span>
                    </div>
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
    isValidating: boolean
    validationResult: { success: boolean, message: string } | null | undefined
    icon: React.ReactNode
    issueURL?: string
    color: 'slate' | 'amber'
}

function ApiInputRowGroup({ label, description, inputs, onTest, onSave, isSaving, isValidating, validationResult, icon, issueURL, color }: ApiInputRowGroupProps) {
    return (
        <div className={clsx(
            "bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] shadow-lg overflow-hidden group transition-all hover:border-blue-400/50 flex flex-col p-6 w-full max-w-[300px]"
        )}>
            <div className="flex flex-col gap-4 flex-1 items-center text-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tighter leading-tight uppercase font-heading">
                        {label}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium whitespace-pre-line leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="w-full space-y-3">
                    <div className="space-y-2">
                        {inputs.map((input, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="text-[9px] font-bold text-slate-400 text-left px-1">{input.label}</div>
                                <input
                                    type="password"
                                    value={input.value}
                                    onChange={(e) => input.onChange(e.target.value)}
                                    placeholder={input.placeholder}
                                    className="w-full px-4 py-2 rounded-xl bg-[#00e5ff]/10 dark:bg-[#00e5ff]/5 border-2 border-[#00e5ff]/30 text-center text-xs focus:outline-none focus:ring-4 focus:ring-[#00e5ff]/20 transition-all font-bold text-slate-900 dark:text-[#00e5ff] placeholder:text-[#00e5ff]/50"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {onTest && (
                            <button
                                onClick={onTest}
                                disabled={isValidating || inputs.some(i => !i.value)}
                                className={clsx(
                                    "w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase",
                                    inputs.some(i => !i.value)
                                        ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-[#333c4d] text-white border-[#333c4d] hover:bg-[#1f2937]"
                                )}
                            >
                                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isValidating ? '연결 중...' : '연결 테스트'}
                            </button>
                        )}

                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={clsx(
                                "w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase",
                                "bg-[#1d4ed8] text-white border-[#1d4ed8] hover:bg-[#1e40af]",
                                isSaving && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            전체 적용하기
                        </button>

                        {issueURL && (
                            <a
                                href={issueURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-2 border shadow-sm active:scale-95 uppercase bg-[#059669] text-white border-[#059669] hover:bg-[#047857]"
                            >
                                발급받기
                            </a>
                        )}
                    </div>
                </div>

                {validationResult && (
                    <div className={clsx(
                        "mt-auto pt-1 flex items-center gap-2 text-[10px] font-black animate-in fade-in slide-in-from-bottom-1",
                        validationResult.success ? "text-green-600" : "text-red-500"
                    )}>
                        {validationResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="truncate">{validationResult.message}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

interface ExternalLinkBtnProps {
    href: string
    icon: React.ReactNode
    label: string
    color: string
}

function ExternalLinkBtn({ href, icon, label, color }: ExternalLinkBtnProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
                "flex items-center gap-2.5 p-2 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-sm group border",
                "bg-white dark:bg-[#111722] border-slate-200 dark:border-[#324467] hover:border-blue-300 dark:hover:border-blue-700"
            )}
        >
            <div className={clsx("p-1.5 rounded-xl text-white shadow-sm shrink-0", color)}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                    {label}
                </div>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
        </a>
    )
}


