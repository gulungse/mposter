"use client";

import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border/40 bg-background py-8">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="font-bold text-lg mb-4">MediPoster</h3>
                        <div className="space-y-1 text-xs text-muted-foreground/80 leading-relaxed">
                            <p>대표 : 김정호</p>
                            <p>사업자명 : E메디치</p>
                            <p>소재지 : 경기도 고양시 덕양구 꽃마을로 36</p>
                            <p>연락처 : 010-2474-2300</p>
                            <p>등록번호 : 571-16-00444</p>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="col-span-1">
                        <h4 className="font-semibold text-sm mb-4">Policies</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors">
                                    이용약관
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors">
                                    개인정보처리방침
                                </Link>
                            </li>
                            <li>
                                <Link href="/refund" className="hover:text-foreground transition-colors">
                                    환불규정
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
                    © {currentYear} MediPoster. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
