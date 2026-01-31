const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tokenPackages = await prisma.tokenPackage.findMany()
  console.log('--- Token Packages ---')
  console.log(JSON.stringify(tokenPackages, null, 2))
  
  const shopItems = await prisma.shopItem.findMany()
  console.log('\n--- Shop Items ---')
  console.log(JSON.stringify(shopItems, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
