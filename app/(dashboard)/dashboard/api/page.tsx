'use client'

import { useState, useEffect } from 'react'
import { Key, Save, AlertCircle, Info, Loader2, CheckCircle2, XCircle, Sparkles, Brain, Image as ImageIcon, Globe } from 'lucide-react'
import { updateUserSettings, getUserSettings, validateOpenAI, validateGemini, validatePiApi } from '@/app/actions/user'
import { clsx } from 'clsx'

export default function ApiManagementPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // API Keys State
    const [keys, setKeys] = useState({
        openaiApiKey: '',
        geminiApiKey: '',
        piApiKey: '',
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
                    geminiApiKey: res.data.geminiApiKey || '',
                    piApiKey: res.data.piApiKey || '',
                    googleClientId: (res.data as any).googleClientId || '',
                    googleClientSecret: (res.data as any).googleClientSecret || ''
                })
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        const res = await updateUserSettings(keys)
        if (res.success) {
            setMessage({ type: 'success', text: '모든 설정이 성공적으로 저장되었습니다.' })
        } else {
            setMessage({ type: 'error', text: res.error || '저장 중 오류가 발생했습니다.' })
        }
        setSaving(false)
    }

    const testConnection = async (type: 'openai' | 'gemini' | 'piapi') => {
        setValidating(prev => ({ ...prev, [type]: true }))
        setValidationResults(prev => ({ ...prev, [type]: null }))

        let result;
        if (type === 'openai') result = await validateOpenAI(keys.openaiApiKey)
        else if (type === 'gemini') result = await validateGemini(keys.geminiApiKey)
        else result = await validatePiApi(keys.piApiKey)

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
        <div className="p-8 space-y-8 max-w-5xl">
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

            {message && (
                <div className={clsx(
                    "p-4 rounded-xl border text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    message.type === 'success' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ApiInputRow
                            label="ChatGPT (OpenAI)"
                            description="GPT-4o, GPT-4o-mini 모델을 사용하여 텍스트 콘텐츠를 생성합니다."
                            value={keys.openaiApiKey}
                            onChange={(v) => setKeys({ ...keys, openaiApiKey: v })}
                            onTest={() => testConnection('openai')}
                            isValidating={validating['openai']}
                            validationResult={validationResults['openai']}
                            icon={<Brain className="h-5 w-5 text-emerald-500" />}
                            placeholder="sk-..."
                        />

                        <ApiInputRow
                            label="Gemini (Google)"
                            description="Google의 최신 LLM을 사용하여 텍스트 및 멀티모달 콘텐츠를 생성합니다."
                            value={keys.geminiApiKey}
                            onChange={(v) => setKeys({ ...keys, geminiApiKey: v })}
                            onTest={() => testConnection('gemini')}
                            isValidating={validating['gemini']}
                            validationResult={validationResults['gemini']}
                            icon={<Sparkles className="h-5 w-5 text-blue-500" />}
                            placeholder="AIza..."
                        />

                        <ApiInputRow
                            label="piAPI (FLUX)"
                            description="FLUX 모델을 사용하여 고품질의 블로그 이미지를 생성합니다."
                            value={keys.piApiKey}
                            onChange={(v) => setKeys({ ...keys, piApiKey: v })}
                            onTest={() => testConnection('piapi')}
                            isValidating={validating['piapi']}
                            validationResult={validationResults['piapi']}
                            icon={<ImageIcon className="h-5 w-5 text-purple-500" />}
                            placeholder="API Key from piapi.ai"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-500" />
                                Google OAuth 설정 (블로그스팟용)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ApiInputRow
                                label="Google Client ID"
                                description="블로그스팟 연결을 위한 OAuth 2.0 클라이언트 ID입니다."
                                value={keys.googleClientId || ''}
                                onChange={(v) => setKeys({ ...keys, googleClientId: v })}
                                onTest={() => { }}
                                isValidating={false}
                                validationResult={null}
                                icon={<Globe className="h-5 w-5 text-amber-500" />}
                                placeholder="example.apps.googleusercontent.com"
                            />

                            <ApiInputRow
                                label="Google Client Secret"
                                description="OAuth 2.0 클라이언트 보안 비밀번호입니다."
                                value={keys.googleClientSecret || ''}
                                onChange={(v) => setKeys({ ...keys, googleClientSecret: v })}
                                onTest={() => { }}
                                isValidating={false}
                                validationResult={null}
                                icon={<Globe className="h-5 w-5 text-amber-500" />}
                                placeholder="****************"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            모든 설정 저장하기
                        </button>
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
    onTest: () => void
    isValidating: boolean
    validationResult: { success: boolean, message: string } | null | undefined
    icon: React.ReactNode
    placeholder: string
}

function ApiInputRow({ label, description, value, onChange, onTest, isValidating, validationResult, icon, placeholder }: ApiInputRowProps) {
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
                    <button
                        onClick={onTest}
                        disabled={isValidating || !value}
                        className={clsx(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border",
                            !value
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white dark:bg-transparent text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                    >
                        {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        연결 테스트
                    </button>
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


