
import { getUsers } from '@/app/actions/admin'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserTable } from './user-table'

export default async function UserManagementPage() {
    const result = await getUsers()

    if (!result.success) {
        // 관리자가 아니면 대시보드로 튕겨냄
        redirect('/dashboard')
    }

    const users = result.data || []

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232f48] text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        사용자 관리
                    </h1>
                    <p className="text-slate-500 dark:text-[#92a4c9] text-sm mt-1">
                        전체 가입 사용자의 권한과 계정 상태를 관리합니다.
                    </p>
                </div>
            </div>

            <UserTable users={users} />
        </div>
    )
}

