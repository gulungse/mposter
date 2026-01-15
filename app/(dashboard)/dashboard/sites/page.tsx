'use client'

import { useState, useEffect } from 'react'
import { Plus as PlusIcon, Search as SearchIcon, Smartphone, Zap as ZapIcon } from 'lucide-react'
import Link from 'next/link'
import { getSites } from '@/app/actions/site'
import { getKeywordGroups } from '@/app/actions/keyword'
import { getPrompts } from '@/app/actions/prompt'
import { SiteCard } from '@/components/site-card'
import { NewTaskModal } from '@/components/task/new-task-modal'

export default function SitesPage() {
    const [sites, setSites] = useState<any[]>([])
    const [keywords, setKeywords] = useState<any[]>([])
    const [prompts, setPrompts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [sitesRes, keywordsRes, promptsRes] = await Promise.all([
            getSites(),
            getKeywordGroups(),
            getPrompts()
        ])
        if (sitesRes.success) setSites(sitesRes.data || [])
        if (keywordsRes.success) setKeywords(keywordsRes.data || [])
        if (promptsRes.success) setPrompts(promptsRes.data || [])
        setLoading(false)
    }

    const openCreateTask = (siteId?: string) => {
        setSelectedSiteId(siteId)
        setIsModalOpen(true)
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                        사이트 관리
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        연결된 워드프레스 및 구글 블로그를 관리하고 자동화를 시작하세요.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => openCreateTask()}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        <ZapIcon className="h-4 w-4" />
                        빠른 자동화 생성
                    </button>
                    <Link
                        href="/dashboard/sites/new"
                        className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-secondary/80 border border-border shadow-sm transition-all w-fit"
                    >
                        <PlusIcon className="h-4 w-4" />
                        새 사이트 연결
                    </Link>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="사이트 검색..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground placeholder:text-muted-foreground"
                    />
                </label>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sites.map((site) => (
                    <SiteCard
                        key={site.id}
                        id={site.id}
                        name={site.name}
                        url={site.url}
                        type={site.type}
                        status="ACTIVE"
                        postCount={0}
                        onCreateTask={() => openCreateTask(site.id)}
                    />
                ))}

                {/* Empty State / Add New Card */}
                <Link href="/dashboard/sites/new" className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-5 hover:bg-muted/50 transition-all py-10 hover:border-primary/50">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <PlusIcon className="h-6 w-6 text-muted-foreground group-hover:text-white" />
                    </div>
                    <p className="font-bold text-muted-foreground text-xs group-hover:text-primary transition-colors uppercase tracking-tight">새 사이트 추가</p>
                </Link>
            </div>

            {/* Mobile-Style Creation Modal */}
            <NewTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                sites={sites}
                keywordGroups={keywords}
                prompts={prompts}
                initialSiteId={selectedSiteId}
            />
        </div>
    )
}
