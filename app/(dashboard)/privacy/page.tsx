import { ShieldCheck } from "lucide-react"

export default function PrivacyPage() {
    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">개인정보 처리방침</h1>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-8 space-y-10">
                    <div className="p-4 bg-muted/40 rounded-lg text-sm text-muted-foreground leading-relaxed border border-border/50">
                        <p><strong>Mposter.kr</strong>(이하 "사이트")은 「개인정보 보호법」 등 관계 법령을 준수하며, 회원의 개인정보를 보호하기 위하여 본 개인정보처리방침을 수립·공개합니다.</p>
                        <p className="mt-2">본 방침은 사이트의 서비스 이용 과정에서 어떠한 개인정보가 처리되는지, 그리고 그 처리 방식과 보호 조치에 대해 안내하는 것을 목적으로 합니다.</p>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. 개인정보의 수집 여부 및 수집 항목</h2>
                        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                            <p>사이트는 회원의 개인정보를 <strong>직접 수집하지 않습니다.</strong></p>
                            <p>사이트의 회원 가입 및 로그인은 Google OAuth 인증 방식을 통해 이루어지며, 이 과정에서 사이트는 다음과 같은 개인정보를 <strong>직접 수집·저장·보관하지 않습니다.</strong></p>
                            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                                <li className="px-3 py-2 bg-muted rounded text-center">이름</li>
                                <li className="px-3 py-2 bg-muted rounded text-center">이메일 주소</li>
                                <li className="px-3 py-2 bg-muted rounded text-center">전화번호</li>
                                <li className="px-3 py-2 bg-muted rounded text-center">주소</li>
                                <li className="px-3 py-2 bg-muted rounded text-center">결제 정보</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2">* Google OAuth 인증 과정에서 제공되는 정보는 로그인 인증 확인 목적으로만 일시적으로 활용되며, 사이트 서버에 별도로 저장되지 않습니다.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. 개인정보의 수집 방법</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            사이트는 자체 회원가입 양식, 입력 폼, 오프라인 방식 등을 통해 개인정보를 수집하지 않습니다.
                            로그인은 제3자 인증 서비스인 <strong>Google OAuth</strong>를 통해서만 이루어집니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3. 개인정보의 이용 목적</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                            사이트는 개인정보를 직접 수집하지 않으므로, 다음 목적에 한해 인증 결과만을 활용합니다.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>회원 식별 및 로그인 상태 유지</li>
                            <li>서비스 이용을 위한 인증 확인</li>
                        </ul>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border border-dashed">
                            사이트는 광고, 마케팅, 통계 분석, 제3자 제공을 목적으로 개인정보를 활용하지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. 개인정보의 보유 및 이용 기간</h2>
                        <div className="text-sm text-muted-foreground leading-relaxed">
                            <p className="mb-2">사이트는 개인정보를 직접 보유하거나 저장하지 않으므로 <strong>별도의 보유 기간을 두지 않습니다.</strong></p>
                            <p>Google OAuth 인증 정보는 인증 세션 종료 시 자동으로 소멸됩니다.</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-3">5. 개인정보의 제3자 제공</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                사이트는 회원의 개인정보를 제3자에게 제공하지 않습니다.
                                다만, 로그인 과정에서 Google의 OAuth 인증 시스템을 이용하므로, 해당 정보의 처리는 Google의 개인정보처리방침에 따릅니다.
                            </p>
                        </section>
                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-3">6. 개인정보 처리의 위탁</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                사이트는 개인정보 처리 업무를 외부에 위탁하지 않습니다.
                                결제 과정에서 이용되는 PG사(결제대행사)는 결제 처리에 필요한 정보만을 독립적으로 처리하며, 해당 정보는 사이트에 저장되지 않습니다.
                            </p>
                        </section>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">7. 개인정보의 파기</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            사이트는 개인정보를 직접 수집·보관하지 않으므로 별도의 파기 절차를 운영하지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">8. 정보주체의 권리와 행사 방법</h2>
                        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                            <li>회원은 언제든지 Google 계정을 통해 OAuth 인증 연동을 해제할 수 있습니다.</li>
                            <li>사이트 서비스 이용을 중단하고자 하는 경우 회원 탈퇴를 요청할 수 있습니다.</li>
                            <li>개인정보와 관련한 문의는 아래의 연락처를 통해 가능합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">9. 개인정보 보호를 위한 기술적·관리적 조치</h2>
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                사이트는 <strong>개인정보를 직접 저장하지 않는 구조</strong>를 채택함으로써, 개인정보 유출 위험을 최소화하고 있습니다.
                                또한 서비스 운영에 있어 관련 법령과 보안 기준을 준수합니다.
                            </p>
                        </div>
                    </section>

                    <div className="pt-8 border-t border-border">
                        <h2 className="text-lg font-bold text-foreground mb-4">사업자 정보 및 문의</h2>
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

                    <div className="text-xs text-muted-foreground text-center pt-4">
                        * 본 개인정보처리방침은 법령, 서비스 내용 또는 운영 정책 변경에 따라 수정될 수 있으며, 변경 시에는 사이트를 통해 사전 또는 사후에 공지합니다.
                    </div>
                </div>
            </div>
        </div>
    )
}
