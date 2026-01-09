#!/usr/bin/env node

/**
 * Database initialization script
 * Creates fresh database tables from drizzle migrations
 */

import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log all relevant environment variables
console.log('='.repeat(60));
console.log('ENVIRONMENT CONFIGURATION');
console.log('='.repeat(60));
console.log(`NODE_ENV:          ${process.env.NODE_ENV || '(not set)'}`);
console.log(`ORIGIN:            ${process.env.ORIGIN || '(not set)'}`);
console.log(`HOST:              ${process.env.HOST || '(not set)'}`);
console.log(`PORT:              ${process.env.PORT || '(not set)'}`);
console.log(`DATABASE_URL:      ${process.env.DATABASE_URL || '(not set)'}`);
console.log(`STORAGE_TYPE:      ${process.env.STORAGE_TYPE || '(not set)'}`);
console.log(`STORAGE_PATH:      ${process.env.STORAGE_PATH || '(not set)'}`);
console.log('='.repeat(60));

const dbUrl = process.env.DATABASE_URL || 'file:./data/snapforge.db';

console.log(`\nInitializing fresh database: ${dbUrl}`);

const client = createClient({ url: dbUrl });

// Read and execute all migration SQL files (without tracking)
const migrationsFolder = join(__dirname, '..', 'drizzle');
console.log(`Reading migrations from: ${migrationsFolder}`);

try {
    const files = readdirSync(migrationsFolder)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
        console.log(`Applying: ${file}`);
        const sql = readFileSync(join(migrationsFolder, file), 'utf-8');

        // Split by statement and execute each
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await client.execute(statement);
            } catch (err) {
                // Ignore "already exists" errors
                if (!err.message?.includes('already exists')) {
                    console.warn(`  Warning: ${err.message}`);
                }
            }
        }
    }

    console.log('\nDatabase initialization complete!');
    console.log('='.repeat(60));
} catch (error) {
    console.error('Database initialization error:', error.message);
}

client.close();
