'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Edit2, ShieldAlert, Sparkles, MessageSquare, RotateCcw, Zap } from 'lucide-react'
import { getSystemPromptsAdmin, createSystemPrompt, updatePrompt, deletePrompt, seedDefaultSystemPrompts } from '@/app/actions/prompt'

import { clsx } from "clsx"

interface Prompt {
    id: string
    title: string
    content: string
    [key: string]: any
}

interface AdminPromptCardProps {
    prompt: Prompt
    isEditing: boolean
    onEdit: () => void
    onCancel: () => void
    onSave: (data: Prompt) => void
    onDelete: () => void
}

export default function AdminPromptsPage() {
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [loading, setLoading] = useState(true)
    const [isSeeding, setIsSeeding] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [newPrompt, setNewPrompt] = useState({ title: '', content: '' })
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        loadPrompts()
    }, [])

    async function loadPrompts() {
        setLoading(true)
        const res = await getSystemPromptsAdmin()
        if (res.success) setPrompts(res.data || [])
        setLoading(false)
    }

    async function handleCreate() {
        if (!newPrompt.title || !newPrompt.content) return alert('제목과 내용을 입력해주세요.')
        const res = await createSystemPrompt(newPrompt)
        if (res.success) {
            setIsAdding(false)
            setNewPrompt({ title: '', content: '' })
            loadPrompts()
        } else {
            alert(res.error)
        }
    }


    async function handleUpdate(id: string, data: Prompt) {
        const res = await updatePrompt(id, data)
        if (res.success) {
            setEditingId(null)
            loadPrompts()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('정말 삭제하시겠습니까? 모든 회원의 화면에서 사라집니다.')) return
        const res = await deletePrompt(id)
        if (res.success) loadPrompts()
    }

    async function handleSeed() {
        setIsSeeding(true)
        const res = await seedDefaultSystemPrompts()
        alert(res.message || res.error)
        setIsSeeding(false)
        loadPrompts()
    }

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-purple-600" />
                        시스템 프롬프트 관리
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-base mt-2">
                        모든 회원에게 공통으로 제공되는 시스템 프롬프트를 관리합니다.
                    </p>
                </div>
                <div className="flex gap-3">
                    {prompts.length === 0 && (
                        <button
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="bg-slate-100 dark:bg-[#1c263a] text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
                        >
                            <RotateCcw className="h-4 w-4" />
                            기본 3종 생성
                        </button>
                    )}
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        새 프롬프트 추가
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 flex gap-4 items-start">
                <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-500 mb-1">주의사항</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-600/80 leading-relaxed">
                        여기서 수정/삭제한 프롬프트는 <strong>모든 일반 회원들의 프롬프트 선택 창</strong>에 실시간으로 반영됩니다.<br />
                        이미 해당 프롬프트를 사용하여 예약된 자동화 작업이 있다면 영향을 줄 수 있으니 신중하게 관리해주세요.
                    </p>
                </div>
            </div>

            {/* Add New Form */}
            {isAdding && (
                <div className="bg-white dark:bg-[#111722] p-8 rounded-[2.5rem] border-2 border-purple-500 shadow-xl shadow-purple-500/10 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            새로운 시스템 프롬프트 등록
                        </h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">취소</button>
                    </div>
                    <div className="space-y-4">
                        <input
                            className="w-full bg-slate-50 dark:bg-[#1c263a] border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 ring-purple-500"
                            placeholder="프롬프트 제목 (예: SEO 최적화 전문 작가)"
                            value={newPrompt.title}
                            onChange={e => setNewPrompt({ ...newPrompt, title: e.target.value })}
                        />
                        <textarea
                            rows={6}
                            className="w-full bg-slate-50 dark:bg-[#1c263a] border-none rounded-2xl px-5 py-4 focus:ring-2 ring-purple-500"
                            placeholder="프롬프트 내용을 입력하세요. AI가 수행할 역할을 구체적으로 작성할수록 좋습니다."
                            value={newPrompt.content}
                            onChange={e => setNewPrompt({ ...newPrompt, content: e.target.value })}
                        />
                        <button
                            onClick={handleCreate}
                            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all"
                        >
                            시스템 프롬프트 공식 등록
                        </button>
                    </div>
                </div>
            )}

            {/* Prompts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prompts.map((prompt) => (
                    <AdminPromptCard
                        key={prompt.id}
                        prompt={prompt}
                        isEditing={editingId === prompt.id}
                        onEdit={() => setEditingId(prompt.id)}
                        onCancel={() => setEditingId(null)}
                        onSave={(data) => handleUpdate(prompt.id, data)}
                        onDelete={() => handleDelete(prompt.id)}
                    />
                ))}
            </div>
        </div>
    )
}


function AdminPromptCard({ prompt, isEditing, onEdit, onCancel, onSave, onDelete }: AdminPromptCardProps) {
    const [formData, setFormData] = useState({ ...prompt })

    return (
        <div className={clsx(
            "bg-white dark:bg-[#111722] rounded-[2rem] border-2 p-6 transition-all",
            isEditing ? "border-purple-500 shadow-xl shadow-purple-500/5 ring-1 ring-purple-500" : "border-slate-100 dark:border-[#232f48]"
        )}>
            {isEditing ? (
                <div className="space-y-4">
                    <input
                        className="w-full bg-slate-50 dark:bg-[#1c263a] border-none rounded-xl px-4 py-3 font-bold focus:ring-1 ring-purple-500"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <textarea
                        rows={5}
                        className="w-full bg-slate-50 dark:bg-[#1c263a] border-none rounded-xl px-4 py-3 text-sm focus:ring-1 ring-purple-500"
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSave(formData)}
                            className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                            <Save className="h-4 w-4" /> 저장
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-6 bg-slate-100 dark:bg-[#232f48] text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200"
                        >
                            취소
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                                <Zap className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white">{prompt.title}</h3>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={onEdit} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors">
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#1c263a] p-4 rounded-2xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                            {prompt.content}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Sparkles className="h-3 w-3" /> System Managed
                    </div>
                </div>
            )}
        </div>
    )
}
