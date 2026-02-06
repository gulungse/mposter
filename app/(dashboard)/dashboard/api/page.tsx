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
        <div className="p-8 space-y-8 max-w-5xl relative">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <Key className="h-8 w-8 text-blue-600" />
                    API 관리
                </h1>
                <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                    콘텐츠 생성 및 이미지 제작을 위한 외부 서비스 API 키를 설정하고 테스트하세요.
                </p>
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

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">

                {/* Left Column: API Inputs */}
                <div className="xl:col-span-3 space-y-8">
                    {/* Notice Card */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/20 p-5 rounded-2xl flex gap-4 items-start">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                            <Info className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">API 보안 안내</h4>
                            <p className="text-xs text-blue-700/80 dark:text-blue-400 mt-1 leading-relaxed">
                                입력하신 API 키는 암호화되어 안전하게 보관됩니다. 각 서비스의 유효성 테스트 버튼을 눌러 연결 상태를 즉시 확인할 수 있습니다.
                            </p>
                        </div>
                    </div>

                    {/* API Key Sections */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                            <ApiInputRow
                                label="ChatGPT (OpenAI)"
                                description="GPT-4o, GPT-4o-mini 모델을 사용하여 텍스트 콘텐츠를 생성합니다."
                                value={keys.openaiApiKey}
                                onChange={(v) => handleChange('openaiApiKey', 'openai', v)}
                                onTest={() => testConnection('openai')}
                                onSave={() => handleSaveSingle('openai', 'ChatGPT', validationResults['openai'])}
                                isSaving={savingKey === 'openai'}
                                isValidating={validating['openai']}
                                validationResult={validationResults['openai']}
                                icon={<Brain className="h-5 w-5 text-emerald-500" />}
                                placeholder="sk-..."
                            />

                            <ApiInputRow
                                label="Claude 3 (Anthropic)"
                                description="Claude 3 Opus 모델을 사용하여 고품질 텍스트 콘텐츠를 생성합니다."
                                value={keys.anthropicApiKey}
                                onChange={(v) => handleChange('anthropicApiKey', 'anthropic', v)}
                                onTest={() => testConnection('anthropic')}
                                onSave={() => handleSaveSingle('anthropic', 'Claude 3', validationResults['anthropic'])}
                                isSaving={savingKey === 'anthropic'}
                                isValidating={validating['anthropic']}
                                validationResult={validationResults['anthropic']}
                                icon={<Sparkles className="h-5 w-5 text-orange-500" />}
                                placeholder="sk-ant-..."
                            />

                            <ApiInputRow
                                label="Gemini (Google)"
                                description="Google의 최신 LLM을 사용하여 텍스트 및 멀티모달 콘텐츠를 생성합니다."
                                value={keys.geminiApiKey}
                                onChange={(v) => handleChange('geminiApiKey', 'gemini', v)}
                                onTest={() => testConnection('gemini')}
                                onSave={() => handleSaveSingle('gemini', 'Gemini', validationResults['gemini'])}
                                isSaving={savingKey === 'gemini'}
                                isValidating={validating['gemini']}
                                validationResult={validationResults['gemini']}
                                icon={<Sparkles className="h-5 w-5 text-blue-500" />}
                                placeholder="AIza..."
                            />

                            <ApiInputRow
                                label="piAPI (FLUX)"
                                description="FLUX 모델을 사용하여 고품질의 블로그 이미지를 생성합니다."
                                value={keys.piApiKey}
                                onChange={(v) => handleChange('piApiKey', 'piapi', v)}
                                onTest={() => testConnection('piapi')}
                                onSave={() => handleSaveSingle('piapi', 'piAPI', validationResults['piapi'])}
                                isSaving={savingKey === 'piapi'}
                                isValidating={validating['piapi']}
                                validationResult={validationResults['piapi']}
                                icon={<ImageIcon className="h-5 w-5 text-purple-500" />}
                                placeholder="API Key from piapi.ai"
                            />

                            <ApiInputRow
                                label="Pixabay (무료 이미지)"
                                description="Pixabay의 방대한 무료 이미지 라이브러리를 사용합니다."
                                value={keys.pixabayApiKey}
                                onChange={(v) => handleChange('pixabayApiKey', 'pixabay', v)}
                                onTest={() => testConnection('pixabay')}
                                onSave={() => handleSaveSingle('pixabay', 'Pixabay', validationResults['pixabay'])}
                                isSaving={savingKey === 'pixabay'}
                                isValidating={validating['pixabay']}
                                validationResult={validationResults['pixabay']}
                                icon={<ImageIcon className="h-5 w-5 text-green-500" />}
                                placeholder="Pixabay API Key"
                            />

                            <ApiInputRow
                                label="Pexels (무료 이미지)"
                                description="Pexels의 감각적인 무료 사진을 사용합니다."
                                value={keys.pexelsApiKey}
                                onChange={(v) => handleChange('pexelsApiKey', 'pexels', v)}
                                onTest={() => testConnection('pexels')}
                                onSave={() => handleSaveSingle('pexels', 'Pexels', validationResults['pexels'])}
                                isSaving={savingKey === 'pexels'}
                                isValidating={validating['pexels']}
                                validationResult={validationResults['pexels']}
                                icon={<ImageIcon className="h-5 w-5 text-teal-500" />}
                                placeholder="Pexels API Key"
                            />

                            <ApiInputRow
                                label="Freepik (고품질 이미지)"
                                description="Freepik의 프리미엄급 이미지를 사용합니다."
                                value={keys.freepikApiKey}
                                onChange={(v) => handleChange('freepikApiKey', 'freepik', v)}
                                onTest={() => testConnection('freepik')}
                                onSave={() => handleSaveSingle('freepik', 'Freepik', validationResults['freepik'])}
                                isSaving={savingKey === 'freepik'}
                                isValidating={validating['freepik']}
                                validationResult={validationResults['freepik']}
                                icon={<ImageIcon className="h-5 w-5 text-blue-600" />}
                                placeholder="Freepik API Key"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-gray-500" />
                                    Unsplash 설정 (App ID, Access Key, Secret Key)
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <ApiInputRow
                                    label="App ID"
                                    description="Application ID"
                                    value={keys.unsplashAppId}
                                    onChange={(v) => handleChange('unsplashAppId', 'unsplash', v)}
                                    // App ID는 Access Key 테스트에 의존하거나 별도 테스트 없으므로 일단 검증 생략
                                    onSave={() => handleSaveSingle('unsplash', 'Unsplash', null, true)}
                                    isSaving={savingKey === 'unsplash'}
                                    isValidating={false}
                                    validationResult={null}
                                    icon={<ImageIcon className="h-5 w-5 text-gray-500" />}
                                    placeholder="App ID"
                                />
                                <ApiInputRow
                                    label="Access Key"
                                    description="Public Access Key"
                                    value={keys.unsplashAccessKey}
                                    onChange={(v) => handleChange('unsplashAccessKey', 'unsplash', v)}
                                    onTest={() => testConnection('unsplash')}
                                    onSave={() => handleSaveSingle('unsplash', 'Unsplash', validationResults['unsplash'])}
                                    isSaving={savingKey === 'unsplash'}
                                    isValidating={validating['unsplash']}
                                    validationResult={validationResults['unsplash']}
                                    icon={<Key className="h-5 w-5 text-gray-500" />}
                                    placeholder="Access Key"
                                />
                                <ApiInputRow
                                    label="Secret Key"
                                    description="Secret Key (보안 주의)"
                                    value={keys.unsplashSecretKey}
                                    onChange={(v) => handleChange('unsplashSecretKey', 'unsplash', v)}
                                    // Secret Key도 검증 생략
                                    onSave={() => handleSaveSingle('unsplash', 'Unsplash', null, true)}
                                    isSaving={savingKey === 'unsplash'}
                                    isValidating={false}
                                    validationResult={null}
                                    icon={<Key className="h-5 w-5 text-gray-500" />}
                                    placeholder="Secret Key"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Key className="h-5 w-5 text-amber-500" />
                                    Google OAuth 설정 (블로그스팟용)
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <ApiInputRow
                                    label="Google Client ID"
                                    description="블로그스팟 연결을 위한 OAuth 2.0 클라이언트 ID입니다."
                                    value={keys.googleClientId || ''}
                                    onChange={(v) => handleChange('googleClientId', 'google', v)}
                                    // Google OAuth는 테스트 버튼이 없으므로 검증 생략
                                    onSave={() => handleSaveSingle('google', 'Google OAuth', null, true)}
                                    isSaving={savingKey === 'google'}
                                    isValidating={false}
                                    validationResult={null}
                                    icon={<Globe className="h-5 w-5 text-amber-500" />}
                                    placeholder="example.apps.googleusercontent.com"
                                />

                                <ApiInputRow
                                    label="Google Client Secret"
                                    description="OAuth 2.0 클라이언트 보안 비밀번호입니다."
                                    value={keys.googleClientSecret || ''}
                                    onChange={(v) => handleChange('googleClientSecret', 'google', v)}
                                    // Google OAuth는 테스트 버튼이 없으므로 검증 생략
                                    onSave={() => handleSaveSingle('google', 'Google OAuth', null, true)}
                                    isSaving={savingKey === 'google'}
                                    isValidating={false}
                                    validationResult={null}
                                    icon={<Globe className="h-5 w-5 text-amber-500" />}
                                    placeholder="****************"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Column: API Resources Sidebar */}
                <div className="xl:col-span-1 space-y-4">
                    <div className="sticky top-8">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 px-1">
                            텍스트 생성 API
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <ExternalLinkBtn
                                href="https://openai.com/ko-KR/index/openai-api/"
                                icon={<Brain className="h-5 w-5" />}
                                label="OpenAI API"
                                subLabel="유료"
                                color="bg-[#10a37f]"
                            />
                            <ExternalLinkBtn
                                href="https://aistudio.google.com/app/api-keys?hl=ko"
                                icon={<Sparkles className="h-5 w-5" />}
                                label="Gemini API"
                                subLabel="일정량 무료"
                                color="bg-[#4285f4]"
                            />
                            <ExternalLinkBtn
                                href="https://console.cloud.google.com/welcome"
                                icon={<Globe className="h-5 w-5" />}
                                label="Google Cloud"
                                subLabel="플랫폼"
                                color="bg-[#fbbc04] text-black"
                            />
                        </div>

                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-8 mb-4 px-1">
                            이미지 생성/검색 API
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <ExternalLinkBtn
                                href="https://piapi.ai/"
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="PiAPI (FLUX)"
                                subLabel="유료"
                                color="bg-[#8e24aa]"
                            />
                            <ExternalLinkBtn
                                href="https://pixabay.com/service/about/api/"
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="Pixabay"
                                subLabel="무료"
                                color="bg-[#02be6e]"
                            />
                            <ExternalLinkBtn
                                href="https://www.pexels.com/api/"
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="Pexels"
                                subLabel="무료"
                                color="bg-[#05a081]"
                            />
                            <ExternalLinkBtn
                                href="https://unsplash.com/developers"
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="Unsplash"
                                subLabel="무료"
                                color="bg-[#000000]"
                            />
                            <ExternalLinkBtn
                                href="https://www.freepik.com/api"
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="Freepik"
                                subLabel="무료"
                                color="bg-[#1273eb]"
                            />
                        </div>
                    </div>
                </div>

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
}

function ApiInputRow({ label, description, value, onChange, onTest, onSave, isSaving, isValidating, validationResult, icon, placeholder }: ApiInputRowProps) {
    return (
        <div className="bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] shadow-sm overflow-hidden group transition-all hover:border-blue-400/50">
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-50 dark:bg-[#192233] rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{label}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onTest && (
                            <button
                                onClick={onTest}
                                disabled={isValidating || !value}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border",
                                    !value
                                        ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-white dark:bg-transparent text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                )}
                            >
                                {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                연결 테스트
                            </button>
                        )}

                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border",
                                "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:scale-95",
                                isSaving && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            적용하기
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="password"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                {validationResult && (
                    <div className={clsx(
                        "flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-left-2",
                        validationResult.success ? "text-green-600" : "text-red-500"
                    )}>
                        {validationResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {validationResult.message}
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
    subLabel: string
    color: string
}

function ExternalLinkBtn({ href, icon, label, subLabel, color }: ExternalLinkBtnProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
                "flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-sm group",
                "bg-white dark:bg-[#111722] border border-slate-200 dark:border-[#324467] hover:border-blue-300 dark:hover:border-blue-700"
            )}
        >
            <div className={clsx("p-2 rounded-lg text-white shadow-sm", color)}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {label}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                    {subLabel}
                </div>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
        </a>
    )
}


