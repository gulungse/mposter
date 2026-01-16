'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { withdrawUser } from '@/app/actions/user'
import { useRouter } from 'next/navigation'

export function DeleteAccountButton({
    variant = 'text',
    className
}: {
    variant?: 'text' | 'button',
    className?: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleWithdraw = async () => {
        if (!confirm('정말로 탈퇴하시겠습니까? 관련 모든 데이터가 삭제되며 복구할 수 없습니다.')) return

        setLoading(true)
        const res = await withdrawUser()

        if (res.success) {
            alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.')
            router.push('/login')
        } else {
            alert(res.error || '탈퇴 처리에 실패했습니다.')
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={variant === 'text'
                    ? `text-xs text-red-500 hover:text-red-600 font-bold underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ${className || ''}`
                    : `w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1F2937] hover:bg-red-900/20 text-slate-300 hover:text-red-400 cursor-pointer transition-all duration-200 ${className || ''}`
                }
                title="회원 탈퇴"
            >
                <Trash2 className="h-4 w-4" />
                <span className={variant === 'button' ? "text-xs font-bold" : (variant === 'text' ? "text-xs font-bold" : "")}>회원 탈퇴</span>
            </button>

            {/* Confirmation Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-red-500">
                                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-black text-foreground">회원 탈퇴 처리</h3>
                            </div>

                            <div className="space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                                <p className="text-sm font-bold text-red-600">
                                    [주의] 탈퇴 전 아래 내용을 반드시 확인해주세요.
                                </p>
                                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                    <li>회원님의 계정 및 모든 관련 데이터(사이트, 작업, 로그 등)가 <strong className="text-foreground">즉시 삭제</strong>됩니다.</li>
                                    <li>유료 멤버십 및 잔여 토큰은 자동 소멸되며 <strong className="text-foreground">환불되지 않습니다.</strong></li>
                                    <li>정책에 따라 <strong className="text-foreground">향후 1년간 동일 이메일로 재가입이 제한</strong>됩니다.</li>
                                </ul>
                            </div>

                            <p className="text-sm text-center font-medium">
                                정말로 탈퇴하시겠습니까?
                            </p>
                        </div>
                        <div className="p-4 bg-muted/50 border-t border-border flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                                className="flex-1 py-3 text-sm font-bold bg-card border border-border rounded-xl hover:bg-muted transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={loading}
                                className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '탈퇴하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
