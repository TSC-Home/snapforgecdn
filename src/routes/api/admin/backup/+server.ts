import type { RequestHandler } from './$types';
import { createBackupStream } from '$lib/server/services/backup';
import { Readable } from 'node:stream';

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
	}

	try {
		const archive = await createBackupStream();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		const filename = `snapforge-backup-${timestamp}.zip`;

		const webStream = Readable.toWeb(archive) as ReadableStream;

		return new Response(webStream, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		console.error('Backup failed:', err);
		return new Response(JSON.stringify({ error: 'Backup fehlgeschlagen' }), { status: 500 });
	}
};
