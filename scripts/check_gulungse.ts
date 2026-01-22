
import { config } from 'dotenv';
config();
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Checking for user: gulungse@gmail.com');
  
  // 1. Exact match check
  const exactUser = await prisma.user.findUnique({
    where: { email: 'gulungse@gmail.com' }
  });

  if (exactUser) {
    console.log('Found Exact Match:', exactUser);
  } else {
    console.log('No exact match found for gulungse@gmail.com');
  }

  // 2. Fuzzy search (if applicable or needed, but email is unique)
  // Let's check all users to see if there's something similar
  const allUsers = await prisma.user.findMany();
  console.log(`Total Users: ${allUsers.length}`);
  allUsers.forEach(u => {
      console.log(`- [${u.email}] (Role: ${u.role}, ID: ${u.id})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
