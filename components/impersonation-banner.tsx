'use client'

import { useState, useEffect } from 'react'
import { Eye, LogOut } from 'lucide-react'
import { stopImpersonating, getImpersonationStatus } from '@/app/actions/admin'

export function ImpersonationBanner() {
    const [status, setStatus] = useState<{ isImpersonating: boolean, targetUser?: { name: string | null } } | null>(null)

    useEffect(() => {
        checkStatus()
    }, [])

    async function checkStatus() {
        const res = await getImpersonationStatus()
        setStatus(res as any)
    }

    async function handleStop() {
        await stopImpersonating()
        window.location.reload() // Force reload to clear state
    }

    if (!status?.isImpersonating) return null

    return (
        <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-lg relative z-50">
            <div className="flex items-center gap-2 text-sm font-medium">
                <div className="bg-white/20 p-1 rounded">
                    <Eye className="h-4 w-4" />
                </div>
                <span>
                    현재 <strong>{status.targetUser?.name || '회원'}</strong>님으로 접속(View As) 중입니다.
                </span>
            </div>
            <button
                onClick={handleStop}
                className="bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
                <LogOut className="h-3.5 w-3.5" />
                원래 계정으로 돌아가기(Exit)
            </button>
        </div>
    )
}
