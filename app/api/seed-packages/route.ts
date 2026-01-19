import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const count = await prisma.tokenPackage.count()
        if (count > 0) {
            return NextResponse.json({ message: 'Packages already exist' })
        }

        await prisma.tokenPackage.createMany({
            data: [
                {
                    name: '5,000 토큰',
                    tokenAmount: 5000,
                    price: 5000,
                    isActive: true
                },
                {
                    name: '10,000 토큰',
                    tokenAmount: 10000,
                    price: 10000,
                    isActive: true
                },
                {
                    name: '30,000 토큰 (Bonus +10%)',
                    tokenAmount: 33000,
                    price: 30000,
                    isActive: true
                },
                {
                    name: '50,000 토큰 (Bonus +20%)',
                    tokenAmount: 60000,
                    price: 50000,
                    isActive: true
                }
            ]
        })

        return NextResponse.json({ success: true, message: 'Packages seeded successfully' })
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    }
}
