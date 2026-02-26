
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Global DB Function Search ---');

        const functions: any[] = await prisma.$queryRawUnsafe(`
            SELECT n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        `);
        
        console.log(`Checking ${functions.length} functions...`);
        let found = false;
        for (const f of functions) {
            if (f.definition.includes('useManualPostRights') || f.name.includes('serviceUpdate')) {
                console.log(`\nMATCH FOUND:`);
                console.log(`Schema: ${f.schema}`);
                console.log(`Name: ${f.name}`);
                console.log(`Definition: ${f.definition.substring(0, 500)}...`);
                found = true;
            }
        }

        if (!found) {
            console.log('No matches found in any function in any schema.');
        }

    } catch (e: any) {
        console.error('Search failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
