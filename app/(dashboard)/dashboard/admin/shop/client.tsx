'use client'

import { useState } from 'react'
import { ShopItem, TokenPackage } from '@prisma/client'
import { Coins, Plus, Edit, Trash2, Package, Save, X, Layers } from 'lucide-react'
import { createShopItem, updateShopItem, deleteShopItem } from '@/app/actions/admin-shop'
import { createTokenPackage, updateTokenPackage, deleteTokenPackage } from '@/app/actions/token-package'
import { cn } from '@/lib/utils'

interface Props {
    initialShopItems: ShopItem[]
    initialTokenPackages: TokenPackage[]
}

const TYPE_OPTIONS = [
    { value: 'SITE_SLOT', label: '사이트 슬롯' },
    { value: 'KEYWORD_SLOT', label: '키워드 그룹 슬롯' },
    { value: 'PROMPT_SLOT', label: '프롬프트 슬롯' },
    { value: 'TASK_SLOT', label: '자동화 작업 슬롯' },
]

type Tab = 'TOKEN' | 'SLOT'

export default function AdminShopClient({ initialShopItems, initialTokenPackages }: Props) {
    const [currentTab, setCurrentTab] = useState<Tab>('TOKEN')

    // Shop Items State
    const [shopItems, setShopItems] = useState<ShopItem[]>(initialShopItems)
    const [isEditingShop, setIsEditingShop] = useState<string | null>(null)
    const [shopForm, setShopForm] = useState<Partial<ShopItem>>({})

    // Token Packages State
    const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>(initialTokenPackages)
    const [isEditingToken, setIsEditingToken] = useState<string | null>(null)
    const [tokenForm, setTokenForm] = useState<Partial<TokenPackage>>({})

    // --- Shop Item Handlers ---
    const handleShopEdit = (item: ShopItem) => {
        setIsEditingShop(item.id)
        setShopForm(item)
    }

    const handleShopCreate = () => {
        setIsEditingShop('new')
        setShopForm({
            name: '',
            description: '',
            type: 'KEYWORD_SLOT',
            price: 3000,
            amount: 1,
            durationDays: 30,
            isActive: true
        })
    }

    const handleShopCancel = () => {
        setIsEditingShop(null)
        setShopForm({})
    }

    const handleShopSave = async () => {
        if (!shopForm.name || !shopForm.price) {
            alert('상품명과 가격은 필수입니다.')
            return
        }

        const dataToSubmit = { ...shopForm, description: shopForm.description || undefined }

        if (isEditingShop === 'new') {
            const res = await createShopItem(dataToSubmit as any)
            if (res.success) {
                setShopItems([res.data!, ...shopItems])
                setIsEditingShop(null)
            } else alert(res.message)
        } else if (isEditingShop) {
            const res = await updateShopItem(isEditingShop, dataToSubmit)
            if (res.success) {
                setShopItems(shopItems.map(i => i.id === isEditingShop ? { ...i, ...shopForm } as ShopItem : i))
                setIsEditingShop(null)
            } else alert(res.message)
        }
    }

    const handleShopDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        const res = await deleteShopItem(id)
        if (res.success) setShopItems(shopItems.filter(i => i.id !== id))
        else alert(res.message)
    }

    // --- Token Package Handlers ---
    const handleTokenEdit = (pkg: TokenPackage) => {
        setIsEditingToken(pkg.id)
        setTokenForm(pkg)
    }

    const handleTokenCreate = () => {
        setIsEditingToken('new')
        setTokenForm({
            name: '',
            tokenAmount: 1000,
            price: 1000,
            isActive: true
        })
    }

    const handleTokenCancel = () => {
        setIsEditingToken(null)
        setTokenForm({})
    }

    const handleTokenSave = async () => {
        if (!tokenForm.name || !tokenForm.price || !tokenForm.tokenAmount) {
            alert('상품명, 가격, 토큰 양은 필수입니다.')
            return
        }

        if (isEditingToken === 'new') {
            const res = await createTokenPackage(tokenForm as any)
            if (res.success) {
                setTokenPackages(prev => {
                    const newList = [...prev, res.data!]
                    return newList.sort((a, b) => a.price - b.price)
                })
                setIsEditingToken(null)
            } else alert(res.message)
        } else if (isEditingToken) {
            const res = await updateTokenPackage(isEditingToken, tokenForm)
            if (res.success) {
                setTokenPackages(prev => {
                    const idx = prev.findIndex(p => p.id === isEditingToken)
                    if (idx < 0) return prev
                    const updated = [...prev]
                    updated[idx] = { ...updated[idx], ...tokenForm } as TokenPackage
                    return updated.sort((a, b) => a.price - b.price)
                })
                setIsEditingToken(null)
            } else alert(res.message)
        }
    }

    const handleTokenDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        const res = await deleteTokenPackage(id)
        if (res.success) setTokenPackages(tokenPackages.filter(i => i.id !== id))
        else alert(res.message)
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-1">
                <button
                    onClick={() => setCurrentTab('TOKEN')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2",
                        currentTab === 'TOKEN'
                            ? "bg-card border-x border-t border-border text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <Coins className="h-4 w-4" /> 토큰 충전 상품 ({tokenPackages.length})
                </button>
                <button
                    onClick={() => setCurrentTab('SLOT')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2",
                        currentTab === 'SLOT'
                            ? "bg-card border-x border-t border-border text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <Layers className="h-4 w-4" /> 슬롯 확장 상품 ({shopItems.length})
                </button>
            </div>

            {/* Token Packages Content */}
            {currentTab === 'TOKEN' && (
                <div className="bg-card border border-border rounded-b-2xl rounded-tr-2xl p-6 shadow-sm mt-[-1px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Coins className="h-5 w-5 text-primary" />
                            토큰 상품 목록
                        </h2>
                        <button
                            onClick={handleTokenCreate}
                            className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> 상품 추가
                        </button>
                    </div>

                    {isEditingToken === 'new' && (
                        <div className="mb-6 p-4 border border-primary/50 bg-primary/5 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-bold mb-4">새 토큰 상품 추가</h3>
                            <TokenPackageForm form={tokenForm} setForm={setTokenForm} onSave={handleTokenSave} onCancel={handleTokenCancel} />
                        </div>
                    )}

                    <div className="space-y-3">
                        {tokenPackages.map((pkg) => (
                            <div key={pkg.id} className="bg-background border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/30">
                                {isEditingToken === pkg.id ? (
                                    <div className="w-full">
                                        <TokenPackageForm form={tokenForm} setForm={setTokenForm} onSave={handleTokenSave} onCancel={handleTokenCancel} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`
                                                h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold border
                                                ${pkg.isActive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-transparent text-muted-foreground'}
                                            `}>
                                                <Coins className="h-4 w-4 mb-0.5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-foreground text-lg">{pkg.name}</h3>
                                                    {!pkg.isActive && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">판매중지</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-sm font-medium text-muted-foreground">
                                                    <span className="text-foreground font-bold">{pkg.tokenAmount.toLocaleString()} 토큰</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>{pkg.price.toLocaleString()}원</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end md:self-center">
                                            <button onClick={() => handleTokenEdit(pkg)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleTokenDelete(pkg.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {tokenPackages.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-sm">등록된 토큰 상품이 없습니다.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Shop Items Content (Slot Extensions) */}
            {currentTab === 'SLOT' && (
                <div className="bg-card border border-border rounded-b-2xl rounded-tr-2xl p-6 shadow-sm mt-[-1px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            슬롯 확장 상품 목록
                        </h2>
                        <button
                            onClick={handleShopCreate}
                            className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> 상품 추가
                        </button>
                    </div>

                    {isEditingShop === 'new' && (
                        <div className="mb-6 p-4 border border-primary/50 bg-primary/5 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-bold mb-4">새 슬롯 상품 추가</h3>
                            <ShopItemForm form={shopForm} setForm={setShopForm} onSave={handleShopSave} onCancel={handleShopCancel} />
                        </div>
                    )}

                    <div className="space-y-3">
                        {shopItems.map((item) => (
                            <div key={item.id} className="bg-background border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/30">
                                {isEditingShop === item.id ? (
                                    <div className="w-full">
                                        <ShopItemForm form={shopForm} setForm={setShopForm} onSave={handleShopSave} onCancel={handleShopCancel} />
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
                                            <button onClick={() => handleShopEdit(item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleShopDelete(item.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {shopItems.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">등록된 상품이 없습니다.</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

function ShopItemForm({ form, setForm, onSave, onCancel }: { form: any, setForm: any, onSave: any, onCancel: any }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">상품명</label>
                    <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">유형</label>
                    <select value={form.type || 'KEYWORD_SLOT'} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                        {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">가격 (원)</label>
                    <input type="number" value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">제공 슬롯 수</label>
                        <input type="number" value={form.amount || 1} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">유효 기간 (일)</label>
                        <input type="number" value={form.durationDays || 30} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground block mb-1">설명</label>
                    <input type="text" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="isActive" checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded border-border" />
                    <label htmlFor="isActive" className="text-sm font-medium">판매 활성화</label>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><X className="h-4 w-4" /> 취소</button>
                <button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Save className="h-4 w-4" /> 저장</button>
            </div>
        </div>
    )
}

function TokenPackageForm({ form, setForm, onSave, onCancel }: { form: any, setForm: any, onSave: any, onCancel: any }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground block mb-1">상품명</label>
                    <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="예: 5,000 토큰" />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">지급 토큰 양</label>
                    <input type="number" value={form.tokenAmount || 0} onChange={e => setForm({ ...form, tokenAmount: Number(e.target.value) })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">가격 (원)</label>
                    <input type="number" value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="tokenIsActive" checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded border-border" />
                    <label htmlFor="tokenIsActive" className="text-sm font-medium">판매 활성화 (체크 해제 시 상점에 노출되지 않음)</label>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><X className="h-4 w-4" /> 취소</button>
                <button onClick={onSave} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Save className="h-4 w-4" /> 저장</button>
            </div>
        </div>
    )
}
