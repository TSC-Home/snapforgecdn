#!/usr/bin/env node

/**
 * Database initialization script
 * Applies Drizzle migrations from the /drizzle folder
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 'file:./data/snapforge.db';

console.log(`Initializing database: ${dbUrl}`);

const client = createClient({ url: dbUrl });
const db = drizzle(client);

// Run migrations from the drizzle folder
const migrationsFolder = join(__dirname, '..', 'drizzle');

console.log(`Running migrations from: ${migrationsFolder}`);

try {
    await migrate(db, { migrationsFolder });
    console.log('Database migrations completed successfully!');
} catch (error) {
    if (error.message?.includes('already exists')) {
        console.log('Tables already exist, skipping migration.');
    } else {
        console.error('Migration error:', error.message);
        // Don't exit with error - app should still try to start
    }
}

client.close();
console.log('Database initialization complete!');
