import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { config } from '../config';
import * as schema from './schema';

let client: Client | null = null;
let database: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
	if (!client) {
		client = createClient({
			url: config.database.url
		});
	}
	return client;
}

export function getDb(): LibSQLDatabase<typeof schema> {
	if (!database) {
		database = drizzle(getClient(), { schema });
	}
	return database;
}

// For backwards compatibility - lazy getter
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
	get(_, prop) {
		return (getDb() as Record<string | symbol, unknown>)[prop];
	}
});

export { schema };
