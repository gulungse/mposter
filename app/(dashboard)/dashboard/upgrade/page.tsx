'use server'

import { Check as CheckIcon, Zap as ZapIcon, Sparkles as SparklesIcon, Rocket as RocketIcon } from 'lucide-react'
import { getPlans, getUserWithPlan } from '@/app/actions/plan'
import { clsx } from 'clsx'

export default async function UpgradePage() {
    const [plansRes, userRes] = await Promise.all([
        getPlans(),
        getUserWithPlan()
    ])

    const plans = plansRes.success && plansRes.data?.length > 0
        ? plansRes.data
        : [
            { id: 'free', name: 'Free Plan', price: 0, siteLimit: 2, keywordGroupLimit: 3, promptLimit: 2, taskLimit: 2, description: '무료로 시작하는 자동화의 첫걸음' },
            { id: 'basic', name: 'Basic Plan', price: 29000, siteLimit: 5, keywordGroupLimit: 10, promptLimit: 10, taskLimit: 8, description: '개인 블로거를 위한 최적의 선택' },
            { id: 'pro', name: 'Pro Plan', price: 79000, siteLimit: 15, keywordGroupLimit: 30, promptLimit: 30, taskLimit: 20, description: '전문가 수준의 대량 자동 포스팅' }
        ]
    const user = userRes.success ? userRes.data : null
    const currentPlanId = (user as any)?.planId

    return (
        <div className="p-5 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    <SparklesIcon className="h-3 w-3" /> Pricing Plans
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">
                    업무 효율을 위한 <span className="text-primary">완벽한 플랜</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                    무료로 시작하거나, 더 많은 사이트와 자동화가 필요하다면<br />
                    비즈니스 성장에 최적화된 유료 플랜으로 업그레이드하세요.
                </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan: any) => {
                    const isPopular = plan.name.toLowerCase().includes('basic')
                    const isPro = plan.name.toLowerCase().includes('pro')
                    const isCurrent = currentPlanId === plan.id

                    return (
                        <div
                            key={plan.id}
                            className={clsx(
                                "relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:translate-y-[-4px]",
                                isPopular
                                    ? "border-primary bg-card shadow-xl shadow-blue-500/10 scale-105 z-10"
                                    : "border-border bg-card/50"
                            )}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                                <p className="text-xs text-muted-foreground min-h-[32px]">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-foreground">₩{plan.price.toLocaleString()}</span>
                                    <span className="text-muted-foreground font-medium text-xs">/월</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8 flex-1">
                                <FeatureItem
                                    label={`매월 ${plan.monthlyTokens ? plan.monthlyTokens.toLocaleString() : 0} 토큰 지급`}
                                    highlight
                                />
                                <FeatureItem label={`사이트 등록 최대 ${plan.siteLimit}개`} />
                                <FeatureItem label={`키워드 그룹 최대 ${plan.keywordGroupLimit}개`} />
                                <FeatureItem label={`커스텀 프롬프트 최대 ${plan.promptLimit}개`} />
                                <FeatureItem label={`자동화 작업 최대 ${plan.taskLimit}개`} />
                                <FeatureItem label="AI 기반 고퀄리티 콘텐츠 생성" />
                                <FeatureItem label="실시간 발행 및 예약 관리" />
                                {isPro && <FeatureItem label="우선 순위 기술 지원" highlight />}
                            </div>

                            <button
                                disabled={isCurrent || plan.price === 0}
                                className={clsx(
                                    "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    isCurrent
                                        ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                                        : isPopular || isPro
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-blue-500/20"
                                            : "bg-foreground text-background hover:opacity-90"
                                )}
                            >
                                {isCurrent ? '현재 이용 중인 플랜' : plan.price === 0 ? '기본 제공' : '결제하고 업그레이드'}
                                {!isCurrent && plan.price > 0 && <ZapIcon className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* FAQ or Trust Badges (Optional but adds premium feel) */}
            <div className="pt-8 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6">
                <TrustItem icon={<RocketIcon className="h-5 w-5" />} title="빠른 시작" desc="결제 즉시 모든 한도가 증량되며 바로 사용 가능합니다." />
                <TrustItem icon={<ZapIcon className="h-5 w-5" />} title="자동 갱신" desc="매월 자동으로 갱신되며, 언제든 설정에서 해지할 수 있습니다." />
                <TrustItem icon={<SparklesIcon className="h-5 w-5" />} title="지속적인 업데이트" desc="모든 플랜 사용자에게 새로운 기능이 지속적으로 업데이트됩니다." />
            </div>
        </div>
    )
}

function FeatureItem({ label, highlight = false }: { label: string, highlight?: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={clsx(
                "h-4 w-4 rounded-full flex items-center justify-center shrink-0",
                highlight ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
            )}>
                <CheckIcon className="h-2.5 w-2.5" />
            </div>
            <span className={clsx(
                "text-xs font-medium",
                highlight ? "text-amber-500" : "text-muted-foreground"
            )}>{label}</span>
        </div>
    )
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center text-primary shadow-sm shrink-0 border border-border">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-foreground text-xs mb-0.5">{title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}
