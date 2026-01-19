'use client'

import { useState, useEffect } from 'react'
import { Save, Layers, Check, Sparkles, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getAllPlansAdmin, updatePlan, createPlan } from '@/app/actions/plan'
import { clsx } from 'clsx'

export default function AdminPlansPage() {
    const [freePlan, setFreePlan] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // 기본 템플릿 (DB에 없을 경우 사용)
    const DEFAULT_FREE_PLAN = {
        name: 'Free Plan',
        price: 0,
        siteLimit: 2,
        keywordGroupLimit: 3,
        promptLimit: 3,
        taskLimit: 3,
        monthlyTokens: 0,
        description: '무료 회원 기본 제공량',
        isTemplate: true
    }

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const res = await getAllPlansAdmin()
        if (res.success && res.data) {
            // 'Free Plan' 찾기 (대소문자 무시)
            const found = res.data.find((p: any) => p.name.toLowerCase() === 'free plan')
            if (found) {
                setFreePlan(found)
            } else {
                setFreePlan(DEFAULT_FREE_PLAN) // 없으면 템플릿 로드
            }
        } else {
            setFreePlan(DEFAULT_FREE_PLAN)
        }
        setLoading(false)
    }

    async function handleSave() {
        if (!freePlan) return
        setSaving(true)

        try {
            if (freePlan.isTemplate) {
                // 아직 DB에 없으면 생성
                const res = await createPlan({
                    ...freePlan,
                    name: 'Free Plan', // 강제 고정
                    price: 0
                })
                if (res.success) {
                    alert('기본 설정이 생성되고 저장되었습니다.')
                    loadData() // ID 등을 받아오기 위해 재로딩
                } else {
                    alert('저장 실패: ' + res.error)
                }
            } else {
                // 있으면 업데이트
                const res = await updatePlan(freePlan.id, {
                    siteLimit: freePlan.siteLimit,
                    keywordGroupLimit: freePlan.keywordGroupLimit,
                    promptLimit: freePlan.promptLimit,
                    taskLimit: freePlan.taskLimit,
                    monthlyTokens: freePlan.monthlyTokens
                })
                if (res.success) {
                    alert('무료 회원 정책이 수정되었습니다.')
                } else {
                    alert('저장 실패: ' + res.error)
                }
            }
        } catch (e) {
            console.error(e)
            alert('오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">설정 불러오는 중...</div>

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Settings className="h-3.5 w-3.5" /> Admin Console
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        무료 회원 <span className="text-blue-600">슬롯 관리</span>
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9]">
                        가입한 모든 회원에게 기본으로 제공되는 무료 수량을 설정합니다.
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-[#111722] rounded-[2.5rem] border border-slate-200 dark:border-[#232f48] shadow-2xl shadow-slate-200/50 dark:shadow-none p-10">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <SlotInput
                        label="사이트 등록 슬롯"
                        description="등록 가능한 사이트 수"
                        value={freePlan.siteLimit}
                        onChange={v => setFreePlan({ ...freePlan, siteLimit: v })}
                    />
                    <SlotInput
                        label="키워드 그룹 슬롯"
                        description="저장 가능한 키워드 그룹 수"
                        value={freePlan.keywordGroupLimit}
                        onChange={v => setFreePlan({ ...freePlan, keywordGroupLimit: v })}
                    />
                    <SlotInput
                        label="프롬프트 슬롯"
                        description="커스텀 프롬프트 저장 수"
                        value={freePlan.promptLimit}
                        onChange={v => setFreePlan({ ...freePlan, promptLimit: v })}
                    />
                    <SlotInput
                        label="자동화 작업 슬롯"
                        description="동시 실행 가능한 자동화 수"
                        value={freePlan.taskLimit}
                        onChange={v => setFreePlan({ ...freePlan, taskLimit: v })}
                    />
                     <SlotInput
                        label="월간 무료 토큰"
                        description="매월 1일 지급되는 무료 토큰"
                        value={freePlan.monthlyTokens}
                        onChange={v => setFreePlan({ ...freePlan, monthlyTokens: v })}
                        isToken
                    />
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-5 rounded-2xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                모든 설정 저장하기
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4">
                        저장 시 데이터베이스의 'Free Plan' 설정이 업데이트됩니다.
                    </p>
                </div>
            </div>
        </div>
    )
}

function SlotInput({ label, description, value, onChange, isToken }: { label: string, description: string, value: number, onChange: (v: number) => void, isToken?: boolean }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{label}</h3>
                    <p className="text-xs text-slate-500 font-medium">{description}</p>
                </div>
                {isToken && <Sparkles className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="flex items-center gap-2 p-1 pl-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <input
                    type="number"
                    min="0"
                    className="w-full bg-transparent border-none p-2 text-xl font-black text-slate-900 dark:text-white focus:ring-0 text-right"
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                />
                <div className="pr-4 text-sm font-bold text-slate-400 shrink-0">
                    {isToken ? 'Token' : '개'}
                </div>
            </div>
        </div>
    )
}
