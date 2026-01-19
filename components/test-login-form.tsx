'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Beaker } from 'lucide-react'

export function TestLoginForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [id, setId] = useState('test80')
    const [password, setPassword] = useState('test80')
    const router = useRouter()

    const handleTestLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id || !password) return

        setIsLoading(true)
        const supabase = createClient()
        const email = `${id}@mposter.kr` // Fake email for ID-based login feel

        // 1. Try Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) {
            // 2. If login fails, try SignUp (Auto-create)
            console.log("Login failed, attempting sign up...", signInError.message)
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: `Test User (${id})`,
                    }
                }
            })

            if (signUpError) {
                alert(`로그인/가입 실패: ${signUpError.message}\nSupabase 설정에서 이메일 가입이 허용되어 있어야 합니다.`)
            } else if (signUpData.session) {
                // SignUp successful and session created (Email confirm off)
                router.refresh()
            } else if (signUpData.user && !signUpData.session) {
                // Confirm Email이 꺼져 있어도 Session이 바로 안 오는 경우가 있음 -> 로그인 재시도
                const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })

                if (retryError || !retryData.session) {
                    alert("계정이 생성되었으나 바로 로그인할 수 없습니다.\nSupabase 관리자 패널에서 'Confirm Email'이 꺼져 있는지 확인해주세요.")
                } else {
                    router.refresh()
                }
            }
        } else {
            // Login successful
            router.refresh()
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={handleTestLogin} className="w-full max-w-sm flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                <Beaker className="h-3.5 w-3.5" />
                <span>테스트 계정 접속 (개발용)</span>
            </div>
            
            <div className="flex gap-2">
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="ID"
                    className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PW"
                    className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-800 text-white rounded-lg py-2.5 text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '테스트 계정으로 로그인'}
            </button>
            <p className="text-[10px] text-center text-muted-foreground/60">
                입력한 ID로 계정이 없으면 자동 생성 후 로그인을 시도합니다.<br/>
                (Suffix: @mposter.kr)
            </p>
        </form>
    )
}
