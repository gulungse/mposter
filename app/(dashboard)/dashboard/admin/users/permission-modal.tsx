'use client'

import { useState, useEffect } from 'react'
import { X, ShieldCheck, Shield, Zap, Youtube, Wand2, Sparkles, Image as ImageIcon } from 'lucide-react'
import { updateUserPermissions } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'

interface PermissionModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

export function PermissionModal({ isOpen, onClose, user }: PermissionModalProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [permissions, setPermissions] = useState({
        hasImageGenRights: false,
        hasManualPostRights: false,
        hasYoutubeRights: false,
        hasTistoryRewriteRights: false,
        hasNaverRewriteRights: false
    })
    const [bonusLimits, setBonusLimits] = useState({
        siteBonus: 0,
        keywordBonus: 0,
        promptBonus: 0,
        taskBonus: 0
    })

    useEffect(() => {
        if (user) {
            setPermissions({
                hasImageGenRights: !!user.hasImageGenRights,
                hasManualPostRights: !!user.hasManualPostRights,
                hasYoutubeRights: !!user.hasYoutubeRights,
                hasTistoryRewriteRights: !!user.hasTistoryRewriteRights,
                hasNaverRewriteRights: !!user.hasNaverRewriteRights
            })

            const customLimits = user.limits && typeof user.limits === 'object' ? user.limits : {}
            setBonusLimits({
                siteBonus: (customLimits as any).siteBonus || 0,
                keywordBonus: (customLimits as any).keywordBonus || 0,
                promptBonus: (customLimits as any).promptBonus || 0,
                taskBonus: (customLimits as any).taskBonus || 0
            })
        }
    }, [user, isOpen])

    if (!isOpen || !user) return null

    const handleToggle = (key: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleLimitChange = (key: keyof typeof bonusLimits, value: string) => {
        const num = parseInt(value) || 0
        setBonusLimits(prev => ({ ...prev, [key]: num }))
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        const result = await updateUserPermissions(user.id, {
            ...permissions,
            limits: bonusLimits
        })

        if (result.success) {
            alert('권한 및 한도가 성공적으로 업데이트되었습니다.')
            router.refresh()
            onClose()
        } else {
            alert(result.error || '업데이트 실패')
        }
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#334155] animate-in zoom-in-95 duration-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-500" />
                            기능 권한 관리
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            사용자 <span className="font-bold text-blue-500">{user.name}</span>님의 기능을 활성화합니다.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                    <div className="pb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">기능 권한</h3>
                        <div className="space-y-3">
                            <PermissionToggle
                                icon={<ImageIcon className="h-4 w-4 text-orange-500" />}
                                label="이미지 생성"
                                description="DALL-E, FLUX 등 AI 이미지 생성 기능 이용"
                                checked={permissions.hasImageGenRights}
                                onChange={() => handleToggle('hasImageGenRights')}
                            />
                            <PermissionToggle
                                icon={<Wand2 className="h-4 w-4 text-emerald-500" />}
                                label="수동 발행"
                                description="직접 작성한 글을 블로그로 전송하는 기능"
                                checked={permissions.hasManualPostRights}
                                onChange={() => handleToggle('hasManualPostRights')}
                            />
                            <PermissionToggle
                                icon={<Youtube className="h-4 w-4 text-red-500" />}
                                label="유튜브 → 블로그"
                                description="유튜브 영상을 블로그 포스팅으로 변환"
                                checked={permissions.hasYoutubeRights}
                                onChange={() => handleToggle('hasYoutubeRights')}
                            />
                            <PermissionToggle
                                icon={<Sparkles className="h-4 w-4 text-indigo-500" />}
                                label="티스토리 재작성"
                                description="티스토리 글을 AI로 재작성하여 발행"
                                checked={permissions.hasTistoryRewriteRights}
                                onChange={() => handleToggle('hasTistoryRewriteRights')}
                            />
                            <PermissionToggle
                                icon={<Zap className="h-4 w-4 text-green-500" />}
                                label="네이버 재구성"
                                description="네이버 블로그를 AI로 재구성하여 발행"
                                checked={permissions.hasNaverRewriteRights}
                                onChange={() => handleToggle('hasNaverRewriteRights')}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">추가 한도 관리 (보너스)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <LimitInput
                                label="사이트 추가"
                                value={bonusLimits.siteBonus}
                                onChange={(val) => handleLimitChange('siteBonus', val)}
                            />
                            <LimitInput
                                label="키워드 추가"
                                value={bonusLimits.keywordBonus}
                                onChange={(val) => handleLimitChange('keywordBonus', val)}
                            />
                            <LimitInput
                                label="프롬프트 추가"
                                value={bonusLimits.promptBonus}
                                onChange={(val) => handleLimitChange('promptBonus', val)}
                            />
                            <LimitInput
                                label="자동화 추가"
                                value={bonusLimits.taskBonus}
                                onChange={(val) => handleLimitChange('taskBonus', val)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg leading-relaxed">
                            💡 여기에 입력한 숫자는 사용자의 현재 플랜 한도에 **추가로 합산**됩니다. (마이너스 입력 시 차감)
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#334155] text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-[#475569] transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? '처리 중...' : '적용하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function PermissionToggle({ icon, label, description, checked, onChange }: {
    icon: React.ReactNode,
    label: string,
    description: string,
    checked: boolean,
    onChange: () => void
}) {
    return (
        <div
            onClick={onChange}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${checked
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-100'
                }`}
        >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${checked ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-200/50 dark:bg-slate-800/50'
                }`}>
                {icon}
            </div>
            <div className="flex-1">
                <p className={`text-sm font-bold ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                    {label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
            </div>
            <div className={`h-6 w-11 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </div>
    )
}

function LimitInput({ label, value, onChange }: {
    label: string,
    value: number,
    onChange: (val: string) => void
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 ml-1">{label}</label>
            <div className="relative group">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                />
            </div>
        </div>
    )
}
