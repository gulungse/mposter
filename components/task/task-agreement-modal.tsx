'use client'

import { useState } from 'react'
import { X, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

interface TaskAgreementModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export function TaskAgreementModal({ isOpen, onClose, onConfirm }: TaskAgreementModalProps) {
    const [isAgreed, setIsAgreed] = useState(false)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">서비스 이용 사전 동의 및 제한 고지</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Service Agreement & Usage Restrictions</p>
                        </div>
                    </div>
                </div>

                {/* Content - Scrollable area */}
                <div className="p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f172a]">
                    <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="font-bold text-amber-900 dark:text-amber-300">
                                본 프로그램은 이용자의 동의를 전제로 제공되며, 아래 사항에 동의하지 않을 경우 서비스 이용이 제한됩니다. 이용자는 프로그램 사용과 동시에 본 고지의 내용에 대해 법적 효력을 갖는 동의를 한 것으로 간주됩니다.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <h3 className="text-slate-900 dark:text-white font-black mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-amber-500 rounded-full" />
                                    제1조 (서비스 이용 제한 및 통제 권한)
                                </h3>
                                <div className="pl-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 ml-0.5">
                                    <p>본 서비스는 공용 서버 및 데이터베이스 환경에서 운영되며, 모든 이용자는 시스템 안정성 유지를 위한 의무를 부담합니다.</p>
                                    <p>이용자가 과도한 요청, 비정상적인 트래픽 유발, 반복적 자동화 호출 등으로 서버 또는 데이터베이스에 부담을 초래한다고 판단되는 경우, <strong>관리자는 사전 통지 없이 해당 이용자의 서비스 이용을 즉시 제한, 중단 또는 차단할 수 있습니다.</strong></p>
                                    <p>본 조에 따른 이용 제한 조치는 서비스 보호를 위한 정당한 권한 행사로 간주되며, 이에 대해 이용자는 이의를 제기할 수 없습니다.</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-slate-900 dark:text-white font-black mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-amber-500 rounded-full" />
                                    제2조 (금지행위 및 이용 제한)
                                </h3>
                                <div className="pl-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 ml-0.5">
                                    <p>이용자는 본 프로그램을 다음 각 호에 해당하는 목적 또는 방식으로 사용할 수 없습니다.</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>관련 법령 또는 사회질서, 미풍양속에 위배되는 행위</li>
                                        <li>스팸, 불법 광고, 도박, 사행성 콘텐츠의 생성 및 유포</li>
                                        <li>음란물, 성인물 등 부적절한 콘텐츠 제작 및 배포</li>
                                        <li>타인의 권리를 침해하거나 불법적인 사이트 운영에 활용하는 행위</li>
                                        <li>기타 서비스의 정상적인 운영 목적에 반하는 모든 행위</li>
                                    </ul>
                                    <p>상기 금지행위가 확인될 경우, 관리자는 별도의 사전 경고 없이 즉시 서비스 이용을 제한하거나 계정을 영구 차단할 수 있습니다.</p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-slate-900 dark:text-white font-black mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-amber-500 rounded-full" />
                                    제3조 (이용 제한 및 책임 면책)
                                </h3>
                                <div className="pl-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 ml-0.5">
                                    <p>관리자는 본 고지 위반 또는 서비스 안정성 저해가 우려되는 경우, 이용자의 서비스 접근을 제한할 수 있으며, 해당 조치로 인해 발생하는 손해에 대해 책임을 부담하지 않습니다.</p>
                                    <p>이용자의 위반 행위로 인해 서비스 또는 제3자에게 손해가 발생한 경우, 그 책임은 전적으로 이용자에게 귀속됩니다.</p>
                                    <p><strong>본 프로그램을 이용하여 생성된 콘텐츠 및 그 활용에 대한 모든 법적 책임은 이용자 본인에게 있습니다.</strong></p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-slate-900 dark:text-white font-black mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-amber-500 rounded-full" />
                                    제4조 (동의의 효력)
                                </h3>
                                <div className="pl-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 ml-0.5">
                                    <p>이용자는 본 프로그램 이용 전 본 고지 내용을 충분히 확인하였으며, 이에 명시된 모든 사항에 대해 명시적이고 자발적으로 동의한 것으로 간주됩니다.</p>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer Agreement & Submit */}
                <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-all">
                        <div className={clsx(
                            "mt-0.5 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all",
                            isAgreed 
                                ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20" 
                                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
                        )}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isAgreed}
                                onChange={(e) => setIsAgreed(e.target.checked)}
                            />
                            {isAgreed && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none">
                            본인은 위 내용을 모두 확인하였으며, 이에 동의합니다.
                            <span className="text-red-600 dark:text-red-500 ml-2 font-black underline underline-offset-4">(필수)</span>
                        </span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => {
                                if (isAgreed) onConfirm()
                            }}
                            disabled={!isAgreed}
                            className={clsx(
                                "flex-[2] py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2",
                                isAgreed 
                                    ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20 hover:bg-amber-600" 
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            동의하고 작업 등록
                        </button>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
            `}</style>
        </div>
    )
}
