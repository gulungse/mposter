const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Checking for Littly Payments ---')
  const payments = await prisma.payment.findMany({
    where: {
      merchantUid: {
        startsWith: '2601' // 주문번호 시작 부분 (이미지로 확인된 것: 2601318817179342)
      }
    }
  })
  console.log('Payments found:', JSON.stringify(payments, null, 2))

  const transactions = await prisma.transaction.findMany({
    where: {
      description: {
        contains: 'Littly'
      }
    }
  })
  console.log('\n--- Checking for Littly Transactions ---')
  console.log('Transactions found:', JSON.stringify(transactions, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
