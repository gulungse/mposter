
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Checking pg_trigger for "users" table ---');

        const triggers: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                tgname as trigger_name,
                relname as table_name,
                nspname as schema_name
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE relname = 'users'
               OR relname = 'User'; -- Prisma might name it "User" or "users"
        `);
        
        console.log('Found triggers:', JSON.stringify(triggers, null, 2));

        // 2. 모든 스키마의 함수 중 'useManualPostRights' 검색 (더 강력하게)
        console.log('\n--- Searching string "useManualPostRights" in ALL source ---');
        const legacySearch: any[] = await prisma.$queryRawUnsafe(`
            SELECT n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE pg_get_functiondef(p.oid) ILIKE '%useManualPostRights%';
        `);
        console.log('Matches:', JSON.stringify(legacySearch.map(m => ({ s: m.schema, n: m.name })), null, 2));

    } catch (e: any) {
        console.error('Search failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
