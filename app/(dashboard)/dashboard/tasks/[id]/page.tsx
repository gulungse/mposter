'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Globe, Hash, MonitorPlay, Zap, Trash2, Play, Pause, ExternalLink, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { getAutomationTask, deleteAutomationTask, toggleTaskStatus } from '@/app/actions/task'
import { runAutomationTask } from '@/app/actions/worker'
import { clsx } from 'clsx'

export default function TaskDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [task, setTask] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)

    const loadTask = async () => {
        const res = await getAutomationTask(id as string)
        if (res.success) {
            setTask(res.data)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadTask()
    }, [id])

    const handleDelete = async () => {
        if (!confirm('정말로 이 작업을 삭제하시겠습니까?')) return
        const res = await deleteAutomationTask(id as string)
        if (res.success) {
            router.push('/dashboard/tasks')
        }
    }

    const handleToggle = async () => {
        const res = await toggleTaskStatus(id as string, task.isActive)
        if (res.success) {
            loadTask()
        }
    }

    const handleRunNow = async () => {
        setRunning(true)
        const res = await runAutomationTask(id as string)
        alert(res.success ? '작업이 성공적으로 실행되었습니다.' : (res.error || '실행 중 오류가 발생했습니다.'));
        setRunning(false)
        loadTask()
    }

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>
    if (!task) return <div className="p-8 text-center text-red-500 font-bold">작업을 찾을 수 없습니다.</div>

    return (
        <div className="max-w-6xl mx-auto p-8 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/tasks" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{task.name}</h1>
                        <p className="text-slate-500 text-sm mt-1">작업 상세 정보 및 실행 이력</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRunNow} disabled={running} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50">
                        {running ? <Zap className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        지금 실행
                    </button>
                    <button onClick={handleToggle} className={clsx("px-4 py-2 rounded-lg border-2 text-sm font-bold flex items-center gap-2 transition-all", task.isActive ? "border-orange-500 text-orange-500 hover:bg-orange-50" : "border-green-500 text-green-500 hover:bg-green-50")}>
                        {task.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {task.isActive ? '일시 중지' : '작업 재개'}
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg border-2 border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <MonitorPlay className="h-5 w-5 text-blue-600" /> 설정 정보
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded flex items-center justify-center bg-white border border-slate-100 dark:border-slate-800 p-0.5 overflow-hidden">
                                        <img
                                            src={task.site.type === 'WORDPRESS' ? "/icons/wordpress.png" : "/icons/blogspot.png"}
                                            alt={task.site.type}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">발행 사이트</p>
                                        <p className="font-bold text-sm">{task.site.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{task.site.url}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Hash className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">키워드 그룹</p>
                                        <p className="font-bold text-sm">{task.keywordGroup.name}</p>
                                        <p className="text-xs text-slate-500">{task.keywordGroup.keywords.length}개 키워드</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <ClipboardList className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">사용 지시사항</p>
                                        <p className="font-bold text-sm">{task.prompt.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Zap className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AI 모델 / 이미지 소스</p>
                                        <p className="font-bold text-sm capitalize">{task.aiModel || 'GPT4O'} / {task.imageSource || 'NONE'} (템플릿: {task.useThumbnailTemplate !== false ? '✅' : '❌'})</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#324467] p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-6 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" /> 최근 발행 로그
                            </span>
                            <span className="text-xs text-slate-400 font-normal">최근 10건</span>
                        </h2>
                        <div className="space-y-3">
                            {task.logs.length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm">발행 내역이 아직 없습니다.</p>
                            ) : (
                                task.logs.map((log: any) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-[#232f48] hover:bg-slate-50 dark:hover:bg-[#192233] transition-colors">
                                        <div className="min-w-0 flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={clsx("text-[10px] font-black px-1.5 py-0.5 rounded uppercase", log.status === 'SUCCESS' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                    {log.status}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{log.title || log.keyword}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('ko-KR')}</p>
                                        </div>
                                        {log.postUrl && (
                                            <a href={log.postUrl} target="_blank" className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">현재 상태</p>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={clsx("h-3 w-3 rounded-full animate-pulse", task.isActive ? "bg-green-500" : "bg-orange-500")} />
                            <span className="text-xl font-bold">{task.isActive ? '작업 실행 중' : '일시 정지됨'}</span>
                        </div>
                        <div className="space-y-4 pt-6 border-t border-slate-800">
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">실행 주기</p>
                                <p className="text-sm font-bold">{task.scheduleCron}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">마지막 실행</p>
                                <p className="text-sm font-bold">{task.lastRunAt ? new Date(task.lastRunAt).toLocaleString('ko-KR') : '-'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">다음 실행 예정</p>
                                <p className="text-sm font-bold">{task.nextRunAt ? new Date(task.nextRunAt).toLocaleString('ko-KR') : '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
