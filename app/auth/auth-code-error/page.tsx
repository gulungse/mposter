import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">인증 오류 발생</h1>
            <p className="mb-6 text-gray-600">
                로그인 처리 중 문제가 발생했습니다.<br />
                잠시 후 다시 시도해 주세요.
            </p>
            <div className="flex gap-4">
                <Link
                    href="/login"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    로그인 페이지로 돌아가기
                </Link>
                <Link
                    href="/"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    홈으로 이동
                </Link>
            </div>
        </div>
    )
}
