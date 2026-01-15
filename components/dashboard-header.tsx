'use client'

import { Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUserProfile } from '@/app/actions/user'

export function DashboardHeader() {
    const [user, setUser] = useState<{ name: string | null; email: string; image: string | null } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const res = await getUserProfile()
                if (res.success && res.data) {
                    setUser(res.data)
                }
            } catch (error) {
                console.error('Failed to load profile header', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-6 py-3 h-[60px]">
            <div className="flex items-center gap-4 flex-1">
                <div className="bg-yellow-500/10 text-yellow-500 rounded-lg px-4 py-1.5 text-xs font-bold flex items-center gap-2 animate-pulse cursor-pointer hover:bg-yellow-500/20 transition-colors">
                    <Megaphone className="h-4 w-4" />
                    <span>공지사항은 카톡 오픈방에 올라옵니다. 좌측 공지사항 오픈톡방을 반드시 입장해주세요</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        {loading ? (
                            <div className="space-y-1">
                                <div className="h-3 w-20 bg-muted animate-pulse rounded ml-auto" />
                                <div className="h-2 w-24 bg-muted animate-pulse rounded ml-auto" />
                            </div>
                        ) : (
                            <>
                                <p className="text-xs font-bold text-foreground uppercase truncate max-w-[100px]">{user?.name || 'User'}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user?.email || ''}</p>
                            </>
                        )}
                    </div>
                    <div className="bg-muted rounded-lg size-9 border border-primary/20 overflow-hidden relative">
                        {loading ? (
                            <div className="h-full w-full bg-muted animate-pulse" />
                        ) : (
                            user?.image ? <img src={user.image} alt="User" className="absolute inset-0 object-cover" /> : <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary font-bold text-xs">{user?.name?.[0] || 'U'}</div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
