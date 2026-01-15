'use client'

import { useState, useEffect, Suspense } from 'react'
import { ArrowLeft, CheckCircle2, Globe, Lock, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSite, getBloggerAuthUrl, exchangeBloggerCode } from '@/app/actions/site'

function NewSiteContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [platform, setPlatform] = useState<'wordpress' | 'blogger'>('wordpress')
    const [loading, setLoading] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    // Blogger Auth State
    const [bloggerData, setBloggerData] = useState<{
        blogs: any[],
        accessToken: string,
        refreshToken: string
    } | null>(null)

    // Handle OAuth Callback
    useEffect(() => {
        const code = searchParams.get('code')
        if (code && !bloggerData) {
            handleBloggerCode(code)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const handleBloggerCode = async (code: string) => {
        setLoading(true)
        setPlatform('blogger') // Force switch to blogger tab

        // Remove code from URL to prevent re-execution
        window.history.replaceState({}, '', '/dashboard/sites/new')

        const res = await exchangeBloggerCode(code)
        setLoading(false)

        if (res.success && res.data) {
            setBloggerData(res.data)
        } else {
            setAuthError(res.error || '블로그 정보를 불러오지 못했습니다.')
        }
    }

    const handleGoogleConnect = async () => {
        setLoading(true)
        setAuthError(null)
        const res = await getBloggerAuthUrl()
        if (res.success && res.url) {
            window.location.href = res.url
        } else {
            setLoading(false)
            setAuthError(res.error || '인증 URL을 생성할 수 없습니다.')
        }
    }

    const handleSelectBlog = async (blog: any) => {
        if (!bloggerData) return

        setLoading(true)
        const result = await createSite({
            name: blog.name,
            url: blog.url,
            username: blog.blogId, // Blog ID stored in username field for Blogger
            apiToken: bloggerData.accessToken,
            refreshToken: bloggerData.refreshToken,
            type: 'BLOGSPOT'
        })

        if (result.success) {
            router.push('/dashboard/sites')
            router.refresh()
        } else {
            setLoading(false)
            alert(result.message || '사이트 추가 실패')
        }
    }

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

    // Blogger Blog Selection UI
    if (bloggerData) {
        return (
            <div className="max-w-2xl mx-auto p-8">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setBloggerData(null)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">블로그 선택</h1>
                        <p className="text-slate-500 text-sm mt-1">연결할 블로그스팟 계정을 선택해주세요.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {bloggerData.blogs.map((blog: any) => (
                        <button
                            key={blog.id}
                            onClick={() => handleSelectBlog(blog)}
                            disabled={loading}
                            className="w-full text-left p-6 rounded-2xl bg-white dark:bg-[#111722] border border-slate-200 dark:border-[#324467] hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20 transition-all group relative"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-orange-600 transition-colors">{blog.name}</h3>
                                    <p className="text-slate-500 text-sm mt-1">{blog.url}</p>
                                </div>
                                <div className="h-10 w-10 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500">
                                    <Globe className="h-5 w-5" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )
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

                    {authError && (
                        <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {authError}
                        </div>
                    )}

                    {/* Connection Form : Wordpress (Manual) / Blogger (OAuth Button) */}
                    {platform === 'wordpress' ? (
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
                                    <label className="text-sm font-bold text-slate-900 dark:text-white">아이디 (Username)</label>
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        placeholder="admin"
                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-900 dark:text-white">앱 비밀번호</label>
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

                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-xs text-blue-700 dark:text-blue-300 leading-relaxed word-keep-all">
                                <strong>팁:</strong> 보안을 위해 메인 비밀번호 대신 <a href="https://wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noopener noreferrer" className="underline">앱 비밀번호</a>를 사용하는 것을 권장합니다.
                            </div>

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
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    사이트 연결하기
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-8 space-y-6 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-2">
                                <img src="/icons/blogspot.png" alt="Blogger" className="h-8 w-8 object-contain" />
                            </div>

                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Google 계정으로 연결</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    설정된 Google Client Key를 사용하여<br />안전하게 블로그스팟 계정을 연결합니다.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleGoogleConnect}
                                    disabled={loading}
                                    className="bg-white text-slate-700 border border-slate-300 px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm transition-all disabled:opacity-70 flex items-center gap-3"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                                    ) : (
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                                    )}
                                    Google 계정으로 계속하기
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 max-w-xs">
                                * API 관리 페이지에서 Google Client ID/Secret이 먼저 설정되어 있어야 합니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function NewSitePage() {
    return (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
            <NewSiteContent />
        </Suspense>
    )
}
