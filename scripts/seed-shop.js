const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ShopItems...')

  const items = [
    {
      name: '사이트 슬롯 확장 (1개)',
      description: '사이트를 1개 더 등록할 수 있습니다. (30일 유효)',
      type: 'SITE_SLOT',
      amount: 1,
      price: 5000,
      durationDays: 30,
    },
    {
      name: '키워드 그룹 슬롯 확장 (1개)',
      description: '키워드 그룹을 1개 더 등록할 수 있습니다. (30일 유효)',
      type: 'KEYWORD_SLOT',
      amount: 1,
      price: 3000,
      durationDays: 30,
    },
    {
      name: '프롬프트 슬롯 확장 (1개)',
      description: '프롬프트를 1개 더 등록할 수 있습니다. (30일 유효)',
      type: 'PROMPT_SLOT',
      amount: 1,
      price: 3000,
      durationDays: 30,
    },
    {
      name: '자동화 작업 슬롯 확장 (1개)',
      description: '자동화 작업을 1개 더 생성할 수 있습니다. (30일 유효)',
      type: 'TASK_SLOT',
      amount: 1,
      price: 5000,
      durationDays: 30,
    },
  ]

  for (const item of items) {
    const exists = await prisma.shopItem.findFirst({
      where: { type: item.type, amount: item.amount, durationDays: item.durationDays }
    })

    if (!exists) {
      await prisma.shopItem.create({ data: item })
      console.log(`Created item: ${item.name}`)
    } else {
      console.log(`Item already exists: ${item.name}`)
    }
  }

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
