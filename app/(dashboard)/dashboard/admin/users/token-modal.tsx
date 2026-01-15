'use client'

import { useState } from 'react'
import { X, Coins, CheckCircle2, AlertCircle } from 'lucide-react'
import { updateUserTokens } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'

interface TokenAdjustmentModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

export function TokenAdjustmentModal({ isOpen, onClose, user }: TokenAdjustmentModalProps) {
    const router = useRouter()
    const [amount, setAmount] = useState<string>('0')
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    if (!isOpen || !user) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const tokenAmount = parseInt(amount)
        if (isNaN(tokenAmount) || tokenAmount === 0) {
            alert('유효한 토큰 수량을 입력해주세요.')
            return
        }
        if (!reason.trim()) {
            alert('변경 사유를 입력해주세요.')
            return
        }

        setSubmitting(true)
        const result = await updateUserTokens(user.id, tokenAmount, reason)

        if (result.success) {
            alert('토큰이 성공적으로 조정되었습니다.')
            router.refresh()
            onClose()
        } else {
            alert(result.error || '토큰 조정 실패')
        }
        setSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#334155] animate-in zoom-in-95 duration-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Coins className="h-5 w-5 text-yellow-500" />
                            토큰 조정
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            사용자 <span className="font-bold text-blue-500">{user.name}</span>님의 잔액을 수정합니다.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">조정 수량 (+ 지급, - 회수)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white"
                            placeholder="예: 100 또는 -50"
                        />
                        <p className="text-[10px] text-slate-400">
                            현재 잔액: <span className="font-bold text-slate-700 dark:text-slate-300">{user.tokenBalance} 토큰</span>
                            {' '}/{' '}
                            변경 후: <span className="font-bold text-blue-500">{user.tokenBalance + (parseInt(amount) || 0)} 토큰</span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">변경 사유 (필수)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none text-slate-900 dark:text-white"
                            placeholder="예: 관리자 보너스 지급, 환불 처리 등"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#334155] text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-[#475569] transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? '처리 중...' : '확인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
