'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Globe, Lock } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { createSite } from '@/app/actions/site'

export default function NewSitePage() {
    const router = useRouter()
    const [platform, setPlatform] = useState<'wordpress' | 'blogger'>('wordpress')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const form = new FormData(e.currentTarget)
        const data = {
            name: form.get('name') as string,
            url: `https://${form.get('url')}`,
            username: form.get('username') as string,
            apiToken: form.get('appPassword') as string,
            refreshToken: form.get('refreshToken') as string,
            type: platform === 'wordpress' ? 'WORDPRESS' : 'BLOGSPOT'
        }

        const result = await createSite(data)

        setLoading(false)
        if (result.success) {
            router.push('/dashboard/sites')
            router.refresh()
        } else {
            alert(result.message || '사이트 추가 실패')
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/sites" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        새 사이트 연결
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                        워드프레스 또는 블로거 사이트를 추가하여 자동화를 시작하세요.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Steps */}
                <div className="space-y-6">
                    <div className="relative pl-6 pb-6 border-l-2 border-blue-600">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-blue-600 border-2 border-slate-50 dark:border-[#101622]" />
                        <h3 className="text-sm font-bold text-blue-600 mb-1">플랫폼 선택</h3>
                        <p className="text-xs text-slate-500">CMS 플랫폼을 선택하세요</p>
                    </div>
                    <div className="relative pl-6 pb-6 border-l-2 border-slate-200 dark:border-[#324467]">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 dark:bg-[#324467] border-2 border-slate-50 dark:border-[#101622]" />
                        <h3 className="text-sm font-bold text-slate-400 mb-1">계정 정보</h3>
                        <p className="text-xs text-slate-500">연결 정보를 입력하세요</p>
                    </div>
                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-[#324467]">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 dark:bg-[#324467] border-2 border-slate-50 dark:border-[#101622]" />
                        <h3 className="text-sm font-bold text-slate-400 mb-1">연결 확인</h3>
                        <p className="text-xs text-slate-500">연결 테스트</p>
                    </div>
                </div>

                {/* Form Area */}
                <div className="md:col-span-2 space-y-6">
                    {/* Platform Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setPlatform('wordpress')}
                            className={clsx(
                                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                platform === 'wordpress'
                                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/10"
                                    : "border-slate-200 dark:border-[#324467] hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                        >
                            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <img src="/icons/wordpress.png" alt="WordPress" className="h-8 w-8 object-contain" />
                            </div>
                            <span className={clsx("font-bold text-sm", platform === 'wordpress' ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-400")}>WordPress</span>
                            {platform === 'wordpress' && <CheckCircle2 className="h-4 w-4 text-blue-600 absolute top-4 right-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPlatform('blogger')}
                            className={clsx(
                                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                platform === 'blogger'
                                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10"
                                    : "border-slate-200 dark:border-[#324467] hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                        >
                            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <img src="/icons/blogspot.png" alt="Blogger" className="h-8 w-8 object-contain" />
                            </div>
                            <span className={clsx("font-bold text-sm", platform === 'blogger' ? "text-orange-700 dark:text-orange-400" : "text-slate-600 dark:text-slate-400")}>Blogger</span>
                            {platform === 'blogger' && <CheckCircle2 className="h-4 w-4 text-orange-500 absolute top-4 right-4" />}
                        </button>
                    </div>

                    {/* Connection Form */}
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 space-y-4 shadow-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">사이트 이름</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="나의 멋진 블로그"
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">사이트 주소 (URL)</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-[#324467] bg-slate-100 dark:bg-[#232f48] text-slate-500 text-sm">
                                    https://
                                </span>
                                <input
                                    type="text"
                                    name="url"
                                    required
                                    placeholder="example.com"
                                    className="flex-1 px-4 py-2.5 rounded-r-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">
                                    {platform === 'wordpress' ? '아이디 (Username)' : '블로그 ID (Blog ID)'}
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    placeholder={platform === 'wordpress' ? "admin" : "12345678"}
                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">
                                    {platform === 'wordpress' ? '앱 비밀번호' : 'Access Token'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="appPassword"
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        {platform === 'blogger' && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">Refresh Token (선택 사항)</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="refreshToken"
                                        placeholder="토큰 자동 갱신을 위해 입력해 주세요"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                                <p className="text-[11px] text-slate-500">Access Token은 1시간 뒤 만료됩니다. 장기 자동화를 위해 Refresh Token 입력이 권장됩니다.</p>
                            </div>
                        )}

                        {platform === 'wordpress' && (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-xs text-blue-700 dark:text-blue-300 leading-relaxed word-keep-all">
                                <strong>팁:</strong> 보안을 위해 메인 비밀번호 대신 <a href="https://wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noopener noreferrer" className="underline">앱 비밀번호</a>를 사용하는 것을 권장합니다.
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <Link
                                href="/dashboard/sites"
                                className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232f48] transition-colors"
                            >
                                취소
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                사이트 연결하기
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
