'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'

export function EmailLoginForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!email || !password) return

        setIsLoading(true)
        setError(null)
        
        try {
            const supabase = createClient()
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) {
                setError(signInError.message === 'Invalid login credentials' 
                    ? '이메일 또는 비밀번호가 일치하지 않습니다.' 
                    : signInError.message)
            } else {
                // 로그인 성공 시 대시보드로 이동
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err: any) {
            setError('로그인 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 mt-8">
            <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">또는 이메일로 로그인</span>
                <div className="flex-grow border-t border-border"></div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium animate-in fade-in slide-in-from-top-1 text-center">
                    {error}
                </div>
            )}

            <div className="space-y-3 text-left">
                <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일 주소"
                        required
                        className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
                <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        required
                        className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '로그인'}
            </button>
        </form>
    )
}
