import { ScrollText } from "lucide-react"

export default function TermsPage() {
    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <ScrollText className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">이용약관</h1>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-8 space-y-10">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            제1조 (목적)
                        </h2>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            본 약관은 Mposter.kr(이하 "사이트")이 제공하는 모든 서비스의 이용과 관련하여 사이트와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                            사이트가 제공하는 디지털 콘텐츠 및 이에 부수되는 서비스의 이용 조건과 절차, 회원과 사업자 간의 권리·의무 및 책임사항을 명확히 규정합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제2조 (정의)</h2>
                        <ul className="space-y-3 text-sm text-muted-foreground list-disc list-inside bg-muted/30 p-5 rounded-lg border border-border/50">
                            <li><strong className="text-foreground">사이트</strong>: Mposter.kr이 운영하는 온라인 서비스 플랫폼</li>
                            <li><strong className="text-foreground">회원</strong>: 본 약관에 동의하고 사이트에 가입하여 서비스를 이용하는 자</li>
                            <li><strong className="text-foreground">토큰</strong>: 사이트 내 유료 서비스 이용을 위해 회원이 구매하는 디지털 재화 (1토큰 = 1원 가치)</li>
                            <li><strong className="text-foreground">디지털 상품</strong>: 토큰을 사용하여 활성화되는 슬롯 추가 등 사이트 내 기능 및 서비스</li>
                            <li><strong className="text-foreground">잔여 토큰</strong>: 회원이 구매한 토큰 중 사용되지 않고 남아 있는 토큰</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제3조 (약관의 효력 및 변경)</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                            본 약관은 회원이 사이트에 가입하거나 서비스를 이용하는 시점부터 효력이 발생합니다.
                            사이트는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 내용과 적용 일자를 사전에 공지합니다.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제4조 (서비스의 제공)</h2>
                        <div className="text-sm text-muted-foreground leading-relaxed">
                            <p className="mb-2">사이트는 회원에게 다음과 같은 서비스를 제공합니다:</p>
                            <ul className="list-disc list-inside ml-2 space-y-1 mb-3">
                                <li>토큰 구매 및 충전 서비스</li>
                                <li>토큰을 활용한 디지털 기능 활성화 서비스</li>
                                <li>기타 사이트가 정하는 부가 서비스</li>
                            </ul>
                            <p>사이트는 서비스의 내용, 운영상 또는 기술상 필요에 따라 제공하는 서비스를 변경할 수 있습니다.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제5조 (토큰의 구매 및 사용)</h2>
                        <ul className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                            <li>회원은 사이트가 정한 결제 수단을 통해 토큰을 구매할 수 있습니다.</li>
                            <li>토큰은 현금과 교환되거나 외부로 이전될 수 없으며, 사이트 내에서만 사용 가능합니다.</li>
                            <li>토큰은 슬롯 추가 등 디지털 기능을 활성화하는 즉시 차감됩니다.</li>
                            <li>토큰의 사용 내역은 회원 계정을 통해 확인할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제6조 (토큰의 환불)</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                            토큰 환불은 사이트의 <strong>환불규정</strong>에 따라 처리됩니다.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
                                <h3 className="font-semibold text-red-600 mb-2 text-sm">환불 불가</h3>
                                <p className="text-xs text-muted-foreground">이미 사용된 토큰은 디지털 상품의 특성상 환불이 불가능합니다.</p>
                            </div>
                            <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-600 mb-2 text-sm">환불 가능</h3>
                                <p className="text-xs text-muted-foreground">구매한 토큰 중 사용되지 않은 <strong>잔여 토큰</strong>에 한하여 환불이 가능합니다.</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-sm mt-3">
                            중복 결제, 오결제, 사업자 귀책 사유로 인한 서비스 이용 불가의 경우 잔여 토큰에 대해 환불이 이루어집니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제7조 (환불 절차 및 방법)</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                            환불을 원하는 회원은 사이트 내 안내된 <strong>1:1 카카오톡 문의하기</strong>를 통해 환불을 요청해야 합니다.
                            요청 시 구매일자, 상품명, 결제 방법 등 사이트가 요구하는 정보를 제출해야 하며, 사이트는 접수 후 3영업일 이내에 처리합니다.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            결제 수단에 따라 전액 승인 취소 또는 부분 취소 방식으로 환불이 이루어질 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제8조 (회원의 의무)</h2>
                        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                            <li>회원은 본 약관 및 관계 법령을 준수해야 합니다.</li>
                            <li>허위 정보 제공, 부정 결제, 서비스 악용 행위를 해서는 안 됩니다.</li>
                            <li>회원은 자신의 계정 정보에 대한 관리 책임을 부담합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제9조 (서비스 이용 제한)</h2>
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">사이트는 다음 각 호의 경우 회원의 서비스 이용을 제한하거나 중단할 수 있습니다.</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                <li>약관 또는 법령을 위반한 경우</li>
                                <li>부정한 방법으로 토큰을 사용하거나 취득한 경우</li>
                                <li>서비스 운영을 고의로 방해한 경우</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-3">* 이 경우, 이미 사용된 토큰은 환불되지 않습니다.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제10조 (책임의 제한)</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            사이트는 천재지변, 시스템 장애 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
                            또한 회원의 귀책 사유로 발생한 손해에 대해서는 사이트가 책임을 부담하지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">제11조 (지식재산권)</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            사이트에서 제공하는 모든 콘텐츠 및 서비스에 대한 저작권 및 지식재산권은 사이트 또는 정당한 권리자에게 귀속됩니다.
                            회원은 이를 무단으로 복제, 배포, 상업적으로 이용할 수 없습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">기타 규정</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">제12조 (분쟁 해결 및 관할)</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    본 약관과 관련하여 발생한 분쟁은 상호 협의를 통해 해결함을 원칙으로 합니다.
                                    협의가 이루어지지 않을 경우 관련 법령에 따라 관할 법원을 통해 해결합니다.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">제13조 (준거법)</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    본 약관은 대한민국 법률을 준거법으로 합니다.
                                </p>
                            </div>
                        </div>
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
