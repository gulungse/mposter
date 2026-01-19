'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton({
    variant = 'text',
    className
}: {
    variant?: 'text' | 'button',
    className?: string
}) {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/')
    }

    return (
        <button
            onClick={handleLogout}
            className={variant === 'text'
                ? `group text-xs text-muted-foreground hover:text-red-500 font-bold underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-all duration-200 ${className || ''}`
                : `group w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-slate-400 hover:text-red-500 cursor-pointer transition-all duration-200 ${className || ''}`
            }
            title="로그아웃"
        >
            <LogOut className="h-4 w-4 transition-colors group-hover:stroke-red-500" />
            <span className="text-xs font-bold">로그아웃</span>
        </button>
    )
}
