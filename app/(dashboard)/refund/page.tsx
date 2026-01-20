import { RefreshCcw } from "lucide-react"

export default function RefundPage() {
    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <RefreshCcw className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">환불규정</h1>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-8 space-y-10">
                    <p className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/40 rounded-lg border border-border/50">
                        본 환불규정은 Mposter.kr(이하 "사이트")에서 제공하는 유료 서비스 및 토큰 구매와 관련하여 회원과 사업자 간의 권리·의무 및 환불 절차를 명확히 규정함을 목적으로 합니다.
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. 환불 적용 대상의 명확화</h2>
                        <ul className="space-y-3 text-sm text-muted-foreground list-disc list-inside bg-muted/30 p-5 rounded-lg border border-border/50">
                            <li>회원이 사이트 내 상점에서 구매한 유료 재화는 <strong>토큰(Token)</strong> 형태로 제공됩니다.</li>
                            <li>토큰은 사이트 내 기능 활성화 및 서비스 이용을 위한 디지털 재화입니다.</li>
                            <li><strong>가치 환산</strong>: 1토큰은 1원의 가치를 가집니다.</li>
                            <li><strong>적용 범위</strong>: 환불은 회원이 <strong>90일 이내에</strong> 구매한 토큰 중 <u>사용하지 않은 잔여 토큰</u>에 한하여 적용됩니다.</li>
                        </ul>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section>
                            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                2. 환불 가능 조건
                            </h2>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">다음 각 호의 사유에 해당하는 경우 <strong>100% 환불</strong>이 가능합니다.</p>
                                <ul className="space-y-2 text-sm text-muted-foreground list-check">
                                    <li className="flex gap-2">
                                        <span className="text-green-500">✔</span> 동일 상품 또는 토큰의 중복 결제
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-green-500">✔</span> 회원의 의사와 무관한 오결제
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-green-500">✔</span> 사이트 오류로 인한 서비스 이용 불가
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-green-500">✔</span> 사용되지 않은 잔여 토큰에 대한 환불 요청
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                3. 환불 불가 조건
                            </h2>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">다음의 경우에는 환불이 <strong>불가능</strong>합니다.</p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <span className="text-red-500">✕</span> 이미 서비스 이용을 위해 소비된 토큰
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-red-500">✕</span> 토큰을 사용하여 기능이 활성화된 이후의 해당 소비분
                                    </li>
                                </ul>
                                <p className="text-xs text-muted-foreground mt-2 bg-red-50 dark:bg-red-900/10 p-2 rounded text-red-600 dark:text-red-400">
                                    * 단, 구매한 토큰 중 사용되지 않은 잔여 토큰이 존재하는 경우에는 해당 잔여 토큰에 한해 환불이 가능합니다.
                                </p>
                            </div>
                        </section>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. 환불 요청 절차 및 방식</h2>
                        <div className="border border-border rounded-lg divide-y divide-border">
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="font-semibold text-sm">신청 방법</div>
                                <div className="md:col-span-2 text-sm text-muted-foreground">사이트 내 <strong>1:1 카카오톡 문의하기</strong>를 통해 요청</div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="font-semibold text-sm">필수 정보</div>
                                <div className="md:col-span-2 text-sm text-muted-foreground">구매일자, 상품명(토큰 내역), 결제 방법</div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="font-semibold text-sm">처리 기간</div>
                                <div className="md:col-span-2 text-sm text-muted-foreground">접수일로부터 3영업일 이내 검토 및 처리</div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="font-semibold text-sm">유효 기간</div>
                                <div className="md:col-span-2 text-sm text-muted-foreground">
                                    토큰의 유효기간은 90일이며 결제 후 90일이 지난 토큰은 소멸.<br />
                                    환불은 결제 후 90일 이내에 요청.
                                </div>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="font-semibold text-sm">환불 방식</div>
                                <div className="md:col-span-2 text-sm text-muted-foreground">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><strong>전액 미사용 시</strong>: 결제 승인 100% 취소</li>
                                        <li><strong>일부 사용 시</strong>: 사용분 제외 후 부분 취소</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. 부분 환불 및 위약금 규정</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            토큰은 사용량에 따라 차감되는 방식의 디지털 재화입니다.
                            이에 따라 환불 시 <strong>별도의 위약금은 부과되지 않으며</strong>, 이미 사용한 토큰을 제외한 잔여 토큰에 대해서만 제하고 환불이 이루어집니다.
                            만약 구매한 토큰을 전혀 사용하지 않은 경우에는 구매 금액 전액이 환불됩니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">6. 관련 법령 준수</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">본 환불규정은 다음의 관련 법령을 준수하여 운영됩니다.</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            <li>「전자상거래 등에서의 소비자보호에 관한 법률」</li>
                            <li>「콘텐츠산업진흥법」 및 「약관의 규제에 관한 법률」</li>
                        </ul>
                    </section>

                    <div className="pt-8 border-t border-border">
                        <h2 className="text-lg font-bold text-foreground mb-4">사업자 정보</h2>
                        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex flex-col">
                                <dt className="text-muted-foreground mb-1">사이트명</dt>
                                <dd className="font-medium text-foreground">Mposter.kr</dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="text-muted-foreground mb-1">담당자</dt>
                                <dd className="font-medium text-foreground">김정호</dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="text-muted-foreground mb-1">시행일자</dt>
                                <dd className="font-medium text-foreground">2026년 1월 5일</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    )
}
