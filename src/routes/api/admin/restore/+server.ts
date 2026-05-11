import type { RequestHandler } from './$types';
import { restoreFromZip } from '$lib/server/services/backup';
import { SESSION_COOKIE_NAME } from '$lib/server/services/session';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (locals.user?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('backup') as File | null;

		if (!file || !file.name.endsWith('.zip')) {
			return new Response(JSON.stringify({ error: 'Eine .zip Backup-Datei wird benötigt' }), {
				status: 400
			});
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		await restoreFromZip(buffer);

		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Restore failed:', err);
		const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
		return new Response(JSON.stringify({ error: `Restore fehlgeschlagen: ${message}` }), {
			status: 500
		});
	}
};
