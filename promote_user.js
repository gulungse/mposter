
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'gulungse@gmail.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' },
        });
        console.log(`Successfully updated user ${email} to ADMIN.`);
        console.log(user);
    } catch (error) {
        console.error(`Error updating user ${email}:`, error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
