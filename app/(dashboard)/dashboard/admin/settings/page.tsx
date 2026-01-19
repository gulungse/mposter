'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, Coins, Settings as SettingsIcon, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getGlobalSettings, updateGlobalSettings } from '@/app/actions/settings'
import { Loader2 } from 'lucide-react'

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        costPerPost: 1,
        costPerScrap: 1,
        costPerAIImage: 2,
        signupBonus: 10,
        isUpgradeEnabled: false,
        googleClientId: '',
        googleClientSecret: ''
    })

    useEffect(() => {
        async function load() {
            const res = await getGlobalSettings()
            if (res.success && res.data) {
                setSettings({
                    costPerPost: res.data.costPerPost,
                    costPerScrap: res.data.costPerScrap,
                    costPerAIImage: res.data.costPerAIImage,
                    signupBonus: (res.data as any).signupBonus || 10,
                    isUpgradeEnabled: res.data.isUpgradeEnabled,
                    googleClientId: (res.data as any).googleClientId || '',
                    googleClientSecret: (res.data as any).googleClientSecret || ''
                })
            }
            setLoading(false)
        }
        load()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await updateGlobalSettings(settings)
        if (res.success) {
            alert('시스템 설정이 저장되었습니다.')
        } else {
            alert(res.error || '저장 실패')
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xl">
                        <SettingsIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            시스템 환경설정
                        </h1>
                        <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                            토큰 소모량 및 전역 규칙을 정의합니다.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111722] rounded-2xl border border-slate-200 dark:border-[#324467] p-8 shadow-sm space-y-8">

                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Coins className="h-5 w-5 text-yellow-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">토큰 정책 설정</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cost Per Post */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#1a2333] border border-slate-100 dark:border-[#2a364d] flex flex-col justify-between gap-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">기본 글 발행 비용</label>
                                <p className="text-xs text-slate-400 mt-1">글 1개 발행 시 차감되는 기본 토큰</p>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={settings.costPerPost}
                                onChange={e => setSettings({ ...settings, costPerPost: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#324467] font-bold text-right focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>

                        {/* Cost Per Scrap Image */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#1a2333] border border-slate-100 dark:border-[#2a364d] flex flex-col justify-between gap-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">이미지 스크랩 비용</label>
                                <p className="text-xs text-slate-400 mt-1">스크랩 이미지 사용 추가 비용</p>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={settings.costPerScrap}
                                onChange={e => setSettings({ ...settings, costPerScrap: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#324467] font-bold text-right focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>

                        {/* Cost Per AI Image */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#1a2333] border border-slate-100 dark:border-[#2a364d] flex flex-col justify-between gap-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">AI 이미지 생성 비용</label>
                                <p className="text-xs text-slate-400 mt-1">DALL-E 3 또는 FLUX 생성 추가 비용</p>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={settings.costPerAIImage}
                                onChange={e => setSettings({ ...settings, costPerAIImage: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#324467] font-bold text-right focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>

                        {/* Signup Bonus */}
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#1a2333] border border-slate-100 dark:border-[#2a364d] flex flex-col justify-between gap-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">회원가입 무료 토큰</label>
                                <p className="text-xs text-slate-400 mt-1">신규 가입자에게 지급될 웰컴 토큰</p>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={settings.signupBonus}
                                onChange={e => setSettings({ ...settings, signupBonus: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#324467] font-bold text-right focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 pt-6 border-t border-slate-100 dark:border-[#2a364d]">
                        <SettingsIcon className="h-5 w-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">베타 기능 설정</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#1a2333] border border-slate-100 dark:border-[#2a364d]">
                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">결제 시스템 (Upgrade Pro)</label>
                                <p className="text-xs text-slate-400 mt-1">사이드바에 업그레이드 버튼을 표시하고 결제 페이지 접근을 허용합니다.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.isUpgradeEnabled}
                                    onChange={e => setSettings({ ...settings, isUpgradeEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p>
                            설정된 비용은 <strong>즉시 적용</strong>되며, 이후 생성되는 모든 자동화 작업 및 테스트 발행에 반영됩니다.
                            <br />예를 들어, 글 발행(1) + AI 이미지(2) = 총 3토큰이 차감됩니다.
                        </p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-[#2a364d] flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        설정 저장
                    </button>
                </div>
            </form>
        </div>
    )
}
