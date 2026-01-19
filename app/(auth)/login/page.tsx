import { LoginButton } from '@/components/login-button'
import { Sparkles as SparklesIcon, Zap as ZapIcon, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function LoginPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { error, date } = await searchParams

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
            {/* Subtle Top Navigation / Brand Only */}
            <header className="absolute top-0 left-0 w-full px-5 py-5 flex justify-center">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-blue-500/20">
                        <SparklesIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-foreground">
                        MediPoster
                    </span>
                </div>
            </header>

            {/* Main Login Card */}
            <main className="relative z-10 w-full max-w-[400px] px-5 py-10 text-center">
                {/* Hero Image / Visual Element (Subtle) */}
                <div className="mb-6 flex justify-center">
                    <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent w-24 rounded-full opacity-50" />
                </div>

                {/* WITHDRAWAL ALERT */}
                {error === 'withdrawn' && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-600 animate-in fade-in zoom-in-95 shadow-sm">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm font-black">재가입 제한 안내</p>
                        </div>
                        <p className="text-xs font-medium leading-relaxed opacity-90">
                            탈퇴하신 계정은 정책에 따라<br />
                            <span className="font-bold underline decoration-red-500/30 underline-offset-2">{date}</span> 까지 재가입이 불가능합니다.
                        </p>
                    </div>
                )}

                {/* Headline Text */}
                <div className="mb-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl px-4">
                        <span className="font-black text-3xl sm:text-4xl tracking-tight block mb-2">Mediposter</span>
                        오신것을 환영합니다.
                    </h1>
                </div>

                {/* Body Text */}
                <div className="mb-8">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        당신의 블로그 생활을<br />
                        조금 더 편하게 즐기세요.
                    </p>
                </div>

                {/* Single Button Component (Google Login) */}
                <div className="flex flex-col gap-4 items-center">
                    <LoginButton />

                    <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                        10,000명 이상의 마케터가 선택했습니다
                    </p>
                </div>

                {/* Service Feature Preview (Minimalist) */}
                <div className="mt-12 grid grid-cols-1 gap-4 text-left">
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:bg-card backdrop-blur-sm">
                        <ZapIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-foreground">
                                빠른 초안 생성
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 word-keep-all">
                                몇 시간이 아닌 몇 초 만에 블로그 글을 작성하세요.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-5 w-full px-5 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground">
                <Link href="#" className="hover:text-primary transition-colors">
                    개인정보 처리방침
                </Link>
                <span className="hidden sm:block h-0.5 w-0.5 rounded-full bg-slate-700" />
                <Link href="#" className="hover:text-primary transition-colors">
                    서비스 이용약관
                </Link>
                <span className="hidden sm:block h-0.5 w-0.5 rounded-full bg-slate-700" />
                <Link href="#" className="hover:text-primary transition-colors">
                    고객센터
                </Link>
            </footer>

            {/* Decorative background elements */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
        </div>
    )
}
