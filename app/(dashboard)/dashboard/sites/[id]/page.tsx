'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Globe, Lock, Trash2, CheckCircle2, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { getSite, updateSite, deleteSite } from '@/app/actions/site'
import { clsx } from 'clsx'

export default function SiteDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [site, setSite] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadSite = async () => {
            const res = await getSite(id as string)
            if (res.success) {
                setSite(res.data)
            } else {
                setError(res.error || '사이트 정보를 불러오지 못했습니다.')
            }
            setLoading(false)
        }
        loadSite()
    }, [id])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name') as string,
            url: formData.get('url') as string,
            username: formData.get('username') as string,
            apiToken: formData.get('apiToken') as string,
            refreshToken: formData.get('refreshToken') as string,
        }

        const res = await updateSite(id as string, data)
        if (res.success) {
            alert('사이트 정보가 성공적으로 수정되었습니다.')
            router.push('/dashboard/sites')
            router.refresh()
        } else {
            setError(res.error || '수정 중 오류 발생')
        }
        setSubmitting(false)
    }

    const handleDelete = async () => {
        if (!confirm('정말로 이 사이트를 삭제하시겠습니까? 연결된 자동화 작업도 모두 삭제될 수 있습니다.')) return
        const res = await deleteSite(id as string)
        if (res.success) {
            router.push('/dashboard/sites')
            router.refresh()
        } else {
            alert(res.error || '삭제 중 오류 발생')
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>
    if (!site) return <div className="p-8 text-center text-red-500 font-bold">{error || '사이트를 찾을 수 없습니다.'}</div>

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/sites" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">설정 관리</h1>
                        <p className="text-slate-500 text-sm mt-1">{site.name}의 연결 정보를 수정합니다.</p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg border-2 border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 dark:border-[#232f48] mb-4 shadow-sm">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-white border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden">
                        <img
                            src={site.type === 'WORDPRESS' ? "/icons/wordpress.png" : "/icons/blogspot.png"}
                            alt={site.type}
                            className="h-8 w-8 object-contain"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{site.type}</p>
                        <p className="text-xs text-slate-500 font-medium">{site.url}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">사이트 이름</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={site.name}
                            required
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">사이트 주소 (URL)</label>
                        <input
                            type="text"
                            name="url"
                            defaultValue={site.url}
                            required
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">아이디 / ID</label>
                            <input
                                type="text"
                                name="username"
                                defaultValue={site.username}
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">API 키 / 앱 패스워드</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="apiToken"
                                    defaultValue={site.apiToken}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {site.type === 'BLOGSPOT' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-bold text-slate-900 dark:text-white">Refresh Token (자동 갱신용)</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="refreshToken"
                                    defaultValue={site.refreshToken}
                                    placeholder="토큰이 있으면 여기에 표시됩니다."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-[#324467] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                * 구글의 보안 정책상 Access Token은 1시간만 유효합니다. 자동 재인증을 위해 Refresh Token이 반드시 필요합니다.
                            </p>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-[#232f48] flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        변경사항 저장
                    </button>
                </div>
            </form>
        </div>
    )
}
