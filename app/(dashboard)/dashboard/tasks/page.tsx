
import { TaskCard } from '@/components/task/task-card'
import { MonitorPlay as MonitorPlayIcon, Plus as PlusIcon, Search as SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { getAutomationTasks } from '@/app/actions/task'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
    const { data: tasks = [] } = await getAutomationTasks()

    const activeTasksCount = tasks.filter(t => t.isActive === true).length

    return (
        <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                        자동화 작업
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        콘텐츠 생성 작업을 모니터링하고 관리하세요.
                    </p>
                </div>
                <Link
                    href="/dashboard/tasks/new"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-blue-500/20 transition-all w-fit"
                >
                    <PlusIcon className="h-4 w-4" />
                    새 작업 만들기
                </Link>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <MonitorPlayIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">활성 작업</p>
                        <p className="text-xl font-black text-foreground">{activeTasksCount}</p>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                        <MonitorPlayIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">전체 작업</p>
                        <p className="text-xl font-black text-foreground">{tasks.length}</p>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <MonitorPlayIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">성공률</p>
                        <p className="text-xl font-black text-foreground">99%</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <label className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="작업 검색..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                </label>
                <div className="flex gap-2">
                    <select className="bg-card border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none cursor-pointer">
                        <option>모든 상태</option>
                        <option>실행 중</option>
                        <option>일시정지됨</option>
                    </select>
                </div>
            </div>

            {/* Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 text-foreground">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        id={task.id}
                        name={task.name}
                        siteName={task.site.name}
                        keywordGroupName={task.keywordGroup.name}
                        schedule={task.scheduleCron === '0 * * * *' ? '매 시간' : task.scheduleCron === '0 9 * * *' ? '매일 오전 9시' : task.scheduleCron || '수동'}
                        status={task.isActive ? 'RUNNING' : 'PAUSED'}
                        lastRun={task.lastRunAt ? new Date(task.lastRunAt).toLocaleString('ko-KR') : '기록 없음'}
                        nextRun={task.nextRunAt ? new Date(task.nextRunAt).toLocaleString('ko-KR') : '-'}
                        totalPosts={0} // 추후 연동 데이터
                    />
                ))}

                {/* New Task Button */}
                <Link href="/dashboard/tasks/new" className="group flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-6 hover:bg-muted/50 transition-colors min-h-[300px]">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                        <PlusIcon className="h-6 w-6 text-muted-foreground group-hover:text-white" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-base text-foreground group-hover:text-primary">새 작업 추가</p>
                        <p className="text-xs text-muted-foreground mt-1">자동화된 콘텐츠 생성을 설정하세요</p>
                    </div>
                </Link>
            </div>
        </div>
    )
}
