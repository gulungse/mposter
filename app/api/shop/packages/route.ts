import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const packages = await prisma.tokenPackage.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        })

        return NextResponse.json({
            success: true,
            data: packages
        })
    } catch (error) {
        console.error('Error fetching token packages:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch packages' },
            { status: 500 }
        )
    }
}
