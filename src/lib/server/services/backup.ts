import { writeFile, unlink, rm, mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { Zip, ZipDeflate, unzipSync } from 'fflate';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { closeDb, resetDbConnection } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

const DB_PATH = resolve('./data/snapforge.db');
const UPLOADS_PATH = resolve('./data/uploads');
const MIGRATIONS_PATH = resolve('./drizzle');

async function collectFiles(dir: string, prefix: string = ''): Promise<Array<{ fs: string; zip: string }>> {
	const results: Array<{ fs: string; zip: string }> = [];
	if (!existsSync(dir)) return results;
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fsPath = join(dir, entry.name);
		const zipPath = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			results.push(...(await collectFiles(fsPath, zipPath)));
		} else {
			results.push({ fs: fsPath, zip: zipPath });
		}
	}
	return results;
}

export async function createBackupStream(): Promise<PassThrough> {
	const output = new PassThrough();

	const zip = new Zip((err, chunk, final) => {
		if (err) {
			output.destroy(err as Error);
			return;
		}
		output.write(Buffer.from(chunk));
		if (final) output.end();
	});

	const files: Array<{ fs: string; zip: string }> = [];
	if (existsSync(DB_PATH)) files.push({ fs: DB_PATH, zip: 'snapforge.db' });
	files.push(...(await collectFiles(UPLOADS_PATH, 'uploads')));

	(async () => {
		try {
			for (const { fs, zip: zipPath } of files) {
				const data = await readFile(fs);
				const deflate = new ZipDeflate(zipPath, { level: 6 });
				zip.add(deflate);
				deflate.push(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), true);
			}
			const meta = Buffer.from(JSON.stringify({ timestamp: new Date().toISOString(), version: '1.0' }));
			const metaDeflate = new ZipDeflate('backup_meta.json', { level: 1 });
			zip.add(metaDeflate);
			metaDeflate.push(new Uint8Array(meta.buffer, meta.byteOffset, meta.byteLength), true);
			zip.end();
		} catch (err) {
			output.destroy(err as Error);
		}
	})();

	return output;
}

export async function restoreFromZip(zipBuffer: Buffer): Promise<void> {
	closeDb();

	const files = unzipSync(new Uint8Array(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength));

	const dbData = files['snapforge.db'];
	if (!dbData) throw new Error('snapforge.db nicht im Backup gefunden');

	await mkdir(dirname(DB_PATH), { recursive: true });
	await writeFile(DB_PATH, Buffer.from(dbData));

	await rm(UPLOADS_PATH, { recursive: true, force: true });
	await mkdir(UPLOADS_PATH, { recursive: true });

	for (const [path, data] of Object.entries(files)) {
		if (path.startsWith('uploads/') && !path.endsWith('/')) {
			const destPath = resolve('./data', path);
			await mkdir(dirname(destPath), { recursive: true });
			await writeFile(destPath, Buffer.from(data));
		}
	}

	resetDbConnection();
	const freshClient = createClient({ url: 'file:' + DB_PATH });
	const freshDb = drizzle(freshClient, { schema });
	await migrate(freshDb, { migrationsFolder: MIGRATIONS_PATH });
	freshClient.close();
}

export async function resetDatabase(): Promise<void> {
	closeDb();
	await unlink(DB_PATH).catch(() => {});
	await mkdir('./data', { recursive: true });
	const freshClient = createClient({ url: 'file:' + DB_PATH });
	const freshDb = drizzle(freshClient, { schema });
	await migrate(freshDb, { migrationsFolder: MIGRATIONS_PATH });
	freshClient.close();
}
