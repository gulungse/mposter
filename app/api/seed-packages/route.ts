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
                    name: '100 토큰',
                    tokenAmount: 100,
                    price: 1100,
                    isActive: true
                },
                {
                    name: '550 토큰 (10% Bonus)',
                    tokenAmount: 550,
                    price: 5500,
                    isActive: true
                },
                {
                    name: '1200 토큰 (20% Bonus)',
                    tokenAmount: 1200,
                    price: 11000,
                    isActive: true
                }
            ]
        })

        return NextResponse.json({ success: true, message: 'Packages seeded successfully' })
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    }
}
