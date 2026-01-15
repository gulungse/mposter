"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getGlobalSettings() {
    try {
        let settings = await prisma.globalSetting.findUnique({
            where: { id: "SYSTEM" }
        })

        if (!settings) {
            settings = await prisma.globalSetting.create({
                data: {
                    id: "SYSTEM",
                    costPerPost: 1,
                    costPerScrap: 1,
                    costPerAIImage: 2,
                    signupBonus: 10,
                    isUpgradeEnabled: false
                }
            })
        }

        return { success: true, data: settings }
    } catch (error) {
        console.error("Failed to fetch settings:", error)
        return { success: false, error: "Failed to fetch settings" }
    }
}

export async function updateGlobalSettings(data: {
    isUpgradeEnabled?: boolean,
    costPerPost?: number,
    costPerScrap?: number,
    costPerAIImage?: number,
    signupBonus?: number,
    googleClientId?: string,
    googleClientSecret?: string
}) {
    try {
        await prisma.globalSetting.upsert({
            where: { id: "SYSTEM" },
            update: data,
            create: {
                id: "SYSTEM",
                ...data
            }
        })

        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Failed to update settings:", error)
        return { success: false, error: "Failed to update settings" }
    }
}
