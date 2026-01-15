import { getKeywordGroups, fetchTrendingKeywords } from '@/app/actions/keyword'
import { KeywordCard } from '@/components/keyword/keyword-card'
import { Plus as PlusIcon, Search as SearchIcon, TrendingUp as TrendingUpIcon, Zap as ZapIcon, PlusCircle as PlusCircleIcon, ExternalLink as ExternalLinkIcon, Clock as ClockIcon, Trash2 as Trash2Icon, Edit as EditIcon } from 'lucide-react'
import Link from 'next/link'

export default async function KeywordPage() {
    const { data: groups = [] } = await getKeywordGroups()
    const trending = await fetchTrendingKeywords()

    return (
        <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                        키워드 관리
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        실시간 검색어와 키워드 그룹을 리스트 형태로 관리하세요.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/dashboard/keywords/new"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        <PlusIcon className="h-4 w-4" />
                        새 그룹 생성
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left Side: Signal.bz Trending (40%) */}
                <div className="lg:w-[40%] flex-shrink-0 space-y-4">
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUpIcon className="h-5 w-5 text-primary" />
                                <h2 className="font-bold text-foreground text-base">실시간 급상승 TOP 10</h2>
                            </div>
                            <span className="text-xs bg-blue-500/10 text-blue-500 font-extrabold px-2 py-0.5 rounded uppercase">Live</span>
                        </div>
                        <div className="divide-y divide-border">
                            {trending.length > 0 ? (
                                trending.slice(0, 10).map((keyword, index) => (
                                    <TrendingItem key={index} keyword={keyword} index={index} />
                                ))
                            ) : (
                                <div className="p-16 text-center text-muted-foreground text-sm">
                                    트렌드 데이터를 불러오는 중입니다...
                                </div>
                            )}
                        </div>
                        <Link href="https://www.signal.bz/" target="_blank" className="block text-center py-4 text-xs text-muted-foreground hover:text-primary font-bold bg-muted/30 transition-colors">
                            Signal.bz 상세 리포트 확인 <ExternalLinkIcon className="h-3 w-3 inline-block ml-1" />
                        </Link>
                    </div>
                </div>

                {/* Right Side: Keyword Groups (60%) */}
                <div className="lg:w-[60%] flex-1 space-y-4">
                    <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-sm">
                        <div className="relative flex-1 max-w-sm">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="키워드 그룹 검색..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div className="hidden sm:block text-[10px] font-bold text-muted-foreground ml-4">
                            총 {groups.length}개 그룹 관리 중
                        </div>
                    </div>

                    <div className="space-y-3">
                        {groups.map((group) => (
                            <KeywordCard
                                key={group.id}
                                id={group.id}
                                name={group.name}
                                keywords={group.keywords}
                                lastUpdated={new Date(group.updatedAt).toLocaleDateString()}
                                listMode={true}
                            />
                        ))}

                        <Link href="/dashboard/keywords/new" className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-muted/50 transition-all group">
                            <PlusIcon className="h-4 w-4 group-hover:scale-125 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-tight">새로운 키워드 그룹 추가</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

function TrendingItem({ keyword, index }: { keyword: string, index: number }) {
    return (
        <div className="px-6 py-4 flex items-center justify-between group hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
                <span className={`text-sm font-black w-6 italic ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {index + 1}
                </span>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {keyword}
                </span>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <Link
                    href={`/dashboard/keywords/new?keyword=${encodeURIComponent(keyword)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
                >
                    <PlusCircleIcon className="h-3.5 w-3.5" />
                    등록
                </Link>
                <Link
                    href={`/dashboard/tasks/new?keyword=${encodeURIComponent(keyword)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shadow-blue-500/20"
                >
                    <ZapIcon className="h-3.5 w-3.5" />
                    발행
                </Link>
            </div>
        </div>
    )
}
