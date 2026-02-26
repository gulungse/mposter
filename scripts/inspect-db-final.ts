
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Final Exhaustive DB Search ---');

        // 1. 모든 테이블의 모든 컬럼 중 이름이 일치하는지 확인
        const columns = await prisma.$queryRawUnsafe(`
            SELECT table_schema, table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name ILIKE '%useManualPostRights%'
               OR column_name ILIKE '%serviceUpdate%';
        `);
        console.log('Column matches:', JSON.stringify(columns, null, 2));

        // 2. 모든 테이블 이름 중 일치하는지 확인
        const tables = await prisma.$queryRawUnsafe(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%serviceUpdate%'
               OR table_name ILIKE '%useManualPostRights%';
        `);
        console.log('Table matches:', JSON.stringify(tables, null, 2));

        // 3. 모든 뷰 이름 중 일치하는지 확인
        const views = await prisma.$queryRawUnsafe(`
            SELECT schemaname, viewname 
            FROM pg_views 
            WHERE viewname ILIKE '%serviceUpdate%'
               OR viewname ILIKE '%useManualPostRights%';
        `);
        console.log('View matches:', JSON.stringify(views, null, 2));

        // 4. pg_description (코멘트) 검색
        const comments = await prisma.$queryRawUnsafe(`
            SELECT description 
            FROM pg_description 
            WHERE description ILIKE '%useManualPostRights%'
               OR description ILIKE '%serviceUpdate%';
        `);
        console.log('Comment matches:', JSON.stringify(comments, null, 2));

    } catch (e: any) {
        console.error('Final search failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
