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
                ? `text-xs text-muted-foreground hover:text-foreground font-bold underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ${className || ''}`
                : `w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-slate-300 hover:text-white cursor-pointer transition-all duration-200 ${className || ''}`
            }
            title="로그아웃"
        >
            <LogOut className="h-4 w-4" />
            <span className="text-xs font-bold">로그아웃</span>
        </button>
    )
}
