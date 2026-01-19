const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Global Settings
  const settings = await prisma.globalSetting.upsert({
    where: { id: 'SYSTEM' },
    update: {},
    create: {
      id: 'SYSTEM',
      costPerPost: 1,
      costPerScrap: 1,
      costPerAIImage: 2,
      signupBonus: 10,
      isUpgradeEnabled: false
    }
  })
  console.log({ settings })

  // 2. Plans - Free
  const freePlan = await prisma.plan.upsert({
    where: { name: 'Free Plan' },
    update: {},
    create: {
      name: 'Free Plan',
      description: '기본 무료 요금제',
      price: 0,
      siteLimit: 5,
      keywordGroupLimit: 10,
      promptLimit: 10,
      taskLimit: 10,
      isActive: true
    }
  })
  console.log({ freePlan })

  // 3. Plans - Pro
  const proPlan = await prisma.plan.upsert({
    where: { name: 'Pro Plan' },
    update: {},
    create: {
      name: 'Pro Plan',
      description: '전문가를 위한 무제한 플랜',
      price: 29900,
      siteLimit: 50,
      keywordGroupLimit: 100,
      promptLimit: 100,
      taskLimit: 100,
      isActive: true
    }
  })
  console.log({ proPlan })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
