'use client'

import { useState } from 'react'
import { ShopItem } from '@prisma/client'
import { Coins, Plus, Edit, Trash2, Package, Save, X } from 'lucide-react'
import { createShopItem, updateShopItem, deleteShopItem } from '@/app/actions/admin-shop'

interface Props {
    initialItems: ShopItem[]
}

const TYPE_OPTIONS = [
    { value: 'SITE_SLOT', label: '사이트 슬롯' },
    { value: 'KEYWORD_SLOT', label: '키워드 그룹 슬롯' },
    { value: 'PROMPT_SLOT', label: '프롬프트 슬롯' },
    { value: 'TASK_SLOT', label: '자동화 작업 슬롯' },
]

export default function AdminShopClient({ initialItems }: Props) {
    const [items, setItems] = useState<ShopItem[]>(initialItems)
    const [isEditing, setIsEditing] = useState<string | null>(null) // ID of item being edited, or 'new'
    const [editForm, setEditForm] = useState<Partial<ShopItem>>({})

    const handleEdit = (item: ShopItem) => {
        setIsEditing(item.id)
        setEditForm(item)
    }

    const handleCreate = () => {
        setIsEditing('new')
        setEditForm({
            name: '',
            description: '',
            type: 'KEYWORD_SLOT',
            price: 3000,
            amount: 1,
            durationDays: 30,
            isActive: true
        })
    }

    const handleCancel = () => {
        setIsEditing(null)
        setEditForm({})
    }

    const handleSave = async () => {
        if (!editForm.name || !editForm.price) {
            alert('상품명과 가격은 필수입니다.')
            return
        }

        if (isEditing === 'new') {
            const dataToSubmit = {
                ...editForm,
                description: editForm.description || undefined
            }
            const res = await createShopItem(dataToSubmit as any)
            if (res.success) {
                setItems([res.data!, ...items])
                setIsEditing(null)
            } else {
                alert(res.message)
            }
        } else if (isEditing) {
            const dataToSubmit = {
                ...editForm,
                description: editForm.description || undefined
            }
            const res = await updateShopItem(isEditing, dataToSubmit)
            if (res.success) {
                setItems(items.map(i => i.id === isEditing ? { ...i, ...editForm } as ShopItem : i))
                setIsEditing(null)
            } else {
                alert(res.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        const res = await deleteShopItem(id)
        if (res.success) {
            setItems(items.filter(i => i.id !== id))
        } else {
            alert(res.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        상품 목록 ({items.length})
                    </h2>
                    <button 
                        onClick={handleCreate}
                        className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> 상품 추가
                    </button>
                </div>

                {isEditing === 'new' && (
                    <div className="mb-6 p-4 border border-primary/50 bg-primary/5 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold mb-4">새 상품 추가</h3>
                        <ShopItemForm form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={handleCancel} />
                    </div>
                )}

                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="bg-background border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/30">
                            {isEditing === item.id ? (
                                <div className="w-full">
                                    <ShopItemForm form={editForm} setForm={setEditForm} onSave={handleSave} onCancel={handleCancel} />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`
                                            h-10 w-10 rounded-lg flex items-center justify-center shrink-0 font-black text-lg
                                            ${item.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                                        `}>
                                            {item.amount}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-foreground">{item.name}</h3>
                                                {!item.isActive && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">판매중지</span>}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                                                <span className="text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    {TYPE_OPTIONS.find(o => o.value === item.type)?.label || item.type}
                                                </span>
                                                <span>{item.durationDays}일</span>
                                                <span className="font-bold text-foreground flex items-center gap-1">
                                                    <Coins className="h-3 w-3 text-yellow-500" />
                                                    {item.price.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    
                    {items.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            등록된 상품이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ShopItemForm({ form, setForm, onSave, onCancel }: { form: any, setForm: any, onSave: any, onCancel: any }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">상품명</label>
                    <input 
                        type="text" 
                        value={form.name || ''} 
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">유형</label>
                    <select
                        value={form.type || 'KEYWORD_SLOT'}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    >
                        {TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">가격 (토큰)</label>
                    <input 
                        type="number" 
                        value={form.price || 0} 
                        onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">제공 슬롯 수</label>
                        <input 
                            type="number" 
                            value={form.amount || 1} 
                            onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">유효 기간 (일)</label>
                        <input 
                            type="number" 
                            value={form.durationDays || 30} 
                            onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground block mb-1">설명</label>
                    <input 
                        type="text" 
                        value={form.description || ''} 
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="isActive"
                        checked={form.isActive ?? true}
                        onChange={e => setForm({ ...form, isActive: e.target.checked })}
                        className="rounded border-border"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">판매 활성화 (체크 해제 시 상점에 노출되지 않음)</label>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <X className="h-4 w-4" /> 취소
                </button>
                <button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Save className="h-4 w-4" /> 저장
                </button>
            </div>
        </div>
    )
}
