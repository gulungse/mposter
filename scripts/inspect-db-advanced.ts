
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Advanced DB Inspection ---');

        // 1. Extensions
        const extensions = await prisma.$queryRawUnsafe(`SELECT extname FROM pg_extension`);
        console.log('Extensions:', JSON.stringify(extensions, null, 2));

        // 2. Rules
        const rules = await prisma.$queryRawUnsafe(`SELECT * FROM pg_rules WHERE tablename = 'users'`);
        console.log('Rules on "users":', JSON.stringify(rules, null, 2));

        // 3. Event Triggers
        const eventTriggers = await prisma.$queryRawUnsafe(`SELECT evtname, evtevent FROM pg_event_trigger`);
        console.log('Event Triggers:', JSON.stringify(eventTriggers, null, 2));

        // 4. Searching for the string in ALL possible places in pg_catalog
        console.log('\n--- Searching for "useManualPostRights" in system catalogs ---');
        
        // Search in views
        const viewMatches = await prisma.$queryRawUnsafe(`
            SELECT schemaname, viewname 
            FROM pg_views 
            WHERE definition ILIKE '%useManualPostRights%'
        `);
        console.log('View matches:', JSON.stringify(viewMatches, null, 2));

        // Search in triggers (proc source)
        const triggerMatches = await prisma.$queryRawUnsafe(`
            SELECT tgname, relname
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE pg_get_functiondef(p.oid) ILIKE '%useManualPostRights%'
        `);
        console.log('Trigger matches (function def):', JSON.stringify(triggerMatches, null, 2));

        // Search in all columns of all tables (just in case it's a value, though unlikely)
        // Skip for now to avoid long run

    } catch (e: any) {
        console.error('Inspection failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
