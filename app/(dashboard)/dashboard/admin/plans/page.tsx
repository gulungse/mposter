'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Edit2, ShieldAlert, CreditCard, Layers, RotateCcw, Zap, Check, Sparkles } from 'lucide-react'
import { getAllPlansAdmin, updatePlan, createPlan, deletePlan, seedDefaultPlans } from '@/app/actions/plan'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSeeding, setIsSeeding] = useState(false)

    const DEFAULT_TEMPLATES = [
        { id: 'template-free', name: 'Free Plan', price: 0, siteLimit: 2, keywordGroupLimit: 3, promptLimit: 2, taskLimit: 2, monthlyTokens: 0, description: '무료로 시작하는 자동화의 첫걸음', isTemplate: true },
        { id: 'template-basic', name: 'Basic Plan', price: 29000, siteLimit: 5, keywordGroupLimit: 10, promptLimit: 10, taskLimit: 8, monthlyTokens: 300, description: '개인 블로거를 위한 최적의 선택', isTemplate: true },
        { id: 'template-pro', name: 'Pro Plan', price: 79000, siteLimit: 15, keywordGroupLimit: 30, promptLimit: 30, taskLimit: 20, monthlyTokens: 1000, description: '전문가 수준의 대량 자동 포스팅', isTemplate: true }
    ]

    useEffect(() => {
        loadPlans()
    }, [])

    async function loadPlans() {
        setLoading(true)
        const res = await getAllPlansAdmin()
        const dbPlans = res.success ? res.data || [] : []

        // 데이터베이스에 있는 플랜 이름들 (매칭용)
        const dbPlanNames = dbPlans.map((p: any) => p.name.toLowerCase())

        // 템플릿 중 아직 DB에 등록되지 않은 것들만 필터링
        const missingTemplates = DEFAULT_TEMPLATES.filter(template => {
            const templateKey = template.name.split(' ')[0].toLowerCase() // "free", "basic", "pro"
            return !dbPlanNames.some((name: string) => name.toLowerCase().includes(templateKey))
        })

        // DB 데이터와 남은 템플릿을 합쳐서 가격순 정렬
        const combined = [...dbPlans, ...missingTemplates].sort((a, b) => a.price - b.price)

        setPlans(combined)
        setLoading(false)
    }

    async function handleUpdate(id: string, data: any) {
        if (id.startsWith('template-')) {
            // 템플릿인 경우 개별 생성
            const res = await createPlan(data)
            if (res.success) {
                alert('요금제가 새롭게 생성되었습니다.')
                loadPlans()
            } else {
                alert(res.error)
            }
            return
        }

        const res = await updatePlan(id, data)
        if (res.success) {
            alert('요금제 설정이 즉시 반영되었습니다.')
            loadPlans()
        } else {
            alert(res.error)
        }
    }

    async function handleSeed() {
        setIsSeeding(true)
        const res = await seedDefaultPlans()
        if (res.success) {
            alert('기본 요금제 3종이 모두 생성되었습니다.')
            loadPlans()
        } else {
            alert(res.error)
        }
        setIsSeeding(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                        <CreditCard className="h-3.5 w-3.5" /> Admin Console
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        요금제 및 <span className="text-blue-600">한도 관리</span>
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-lg max-w-2xl">
                        {plans[0]?.isTemplate
                            ? "아직 생성된 요금제가 없습니다. 아래 템플릿을 확인하고 활성화하세요."
                            : "회원들에게 노출되는 업그레이드 페이지의 내용을 실시간으로 수정합니다."}
                    </p>
                </div>
                {plans[0]?.isTemplate && (
                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="bg-blue-600 text-white px-8 py-4 rounded-3xl text-sm font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <Zap className="h-5 w-5" />
                        {isSeeding ? '생성 중...' : '기본 플랜 3종 일괄 활성화'}
                    </button>
                )}
            </div>

            {/* Warning Banner */}
            {plans.length > 0 && (
                <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 flex gap-4 items-start">
                    <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-500 mb-1">주의사항</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-600/80 leading-relaxed">
                            여기서 수정된 한도는 시스템 전체에 <strong>즉시 적용</strong>됩니다. <br />
                            가격을 변경하면 신규 구독자부터 적용되며, 기존 구독자 정보에는 영향을 주지 않습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* Plans Grid - WYSIWYG Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {plans.map((plan) => (
                    <AdminPlanCard
                        key={plan.id}
                        plan={plan}
                        onSave={(data) => handleUpdate(plan.id, data)}
                    />
                ))}
            </div>
        </div>
    )
}

function AdminPlanCard({ plan, onSave }: { plan: any, onSave: (data: any) => void }) {
    const [formData, setFormData] = useState({ ...plan })
    const isPopular = plan.name.toLowerCase().includes('basic')
    const isPro = plan.name.toLowerCase().includes('pro')
    const isTemplate = plan.id.startsWith('template-')

    const hasChanged = JSON.stringify(formData) !== JSON.stringify(plan)

    return (
        <div className={clsx(
            "relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all duration-300",
            isPopular
                ? "border-blue-600 bg-white dark:bg-[#111722] shadow-2xl shadow-blue-500/10 scale-105 z-10"
                : "border-slate-100 dark:border-[#232f48] bg-white/50 dark:bg-[#111722]/50",
            isTemplate && "opacity-80 grayscale-[30%] border-dashed"
        )}>
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black shadow-lg uppercase tracking-widest">
                    MOST POPULAR
                </div>
            )}

            {isTemplate && (
                <div className="absolute top-4 right-8 bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black shadow-md uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> PREVIEW
                </div>
            )}

            {/* Plan Name & Desc Edit */}
            <div className="mb-8 space-y-2">
                <input
                    className="w-full text-xl font-black bg-transparent border-none p-0 focus:ring-0 text-slate-900 dark:text-white"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <textarea
                    rows={2}
                    className="w-full text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none p-0 focus:ring-0 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="플랜 설명을 입력하세요..."
                />
            </div>

            {/* Price Edit */}
            <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">₩</span>
                    <input
                        type="number"
                        className="w-32 text-4xl font-black bg-transparent border-none p-0 focus:ring-0 text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                    <span className="text-slate-500 dark:text-slate-400 font-bold">/월</span>
                </div>
            </div>

            {/* Limits Edit - Features Style */}
            <div className="space-y-5 mb-10 flex-1">
                <AdminFeatureInput
                    label="월 제공 토큰"
                    unit="개"
                    value={formData.monthlyTokens || 0}
                    onChange={v => setFormData({ ...formData, monthlyTokens: v })}
                />
                <AdminFeatureInput
                    label="사이트 등록 최대"
                    unit="개"
                    value={formData.siteLimit}
                    onChange={v => setFormData({ ...formData, siteLimit: v })}
                />
                <AdminFeatureInput
                    label="키워드 그룹 최대"
                    unit="개"
                    value={formData.keywordGroupLimit}
                    onChange={v => setFormData({ ...formData, keywordGroupLimit: v })}
                />
                <AdminFeatureInput
                    label="커스텀 프롬프트 최대"
                    unit="개"
                    value={formData.promptLimit}
                    onChange={v => setFormData({ ...formData, promptLimit: v })}
                />
                <AdminFeatureInput
                    label="자동화 작업 최대"
                    unit="개"
                    value={formData.taskLimit}
                    onChange={v => setFormData({ ...formData, taskLimit: v })}
                />

                <div className="flex items-center gap-3 opacity-40">
                    <div className="h-5 w-5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium text-slate-400">AI 기반 고퀄리티 콘텐츠 (고정)</span>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={() => onSave(formData)}
                disabled={!isTemplate && !hasChanged}
                className={clsx(
                    "w-full py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl",
                    isTemplate || hasChanged
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
                        : "bg-slate-100 dark:bg-[#192233] text-slate-400 cursor-not-allowed border border-slate-200 dark:border-[#232f48] shadow-none"
                )}
            >
                {isTemplate ? <Zap className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {isTemplate ? '즉시 활성화 및 저장' : '설정 반영 및 저장'}
            </button>
        </div>
    )
}

function AdminFeatureInput({ label, unit, value, onChange }: { label: string, unit: string, value: number, onChange: (v: number) => void }) {
    return (
        <div className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#192233] border border-slate-100 dark:border-[#232f48] transition-colors hover:border-blue-400 dark:hover:border-blue-400/50">
            <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    className="w-12 text-sm font-black text-right bg-transparent border-none p-0 focus:ring-0 text-blue-600 dark:text-blue-400"
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                />
                <span className="text-xs font-bold text-slate-400">{unit}</span>
            </div>
        </div>
    )
}
