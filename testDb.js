const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const jobs = await prisma.automationJob.findMany({ select: { id: true, postStatus: true } });
    console.log(jobs.map(j => j.postStatus));
}
run();
