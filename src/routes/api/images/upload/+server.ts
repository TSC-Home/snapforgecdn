import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiRequest } from '$lib/server/services/api-auth';
import { uploadImage } from '$lib/server/services/image';

export const POST: RequestHandler = async (event) => {
	// Authenticate
	const auth = await authenticateApiRequest(event);
	if (!auth.authenticated) {
		return json({ error: auth.error }, { status: 401 });
	}

	try {
		const formData = await event.request.formData();
		const file = formData.get('file');

		if (!file || !(file instanceof File)) {
			return json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
		}

		const result = await uploadImage(auth.gallery!.id, file);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		const baseUrl = event.url.origin;

		return json({
			success: true,
			image: {
				id: result.image!.id,
				filename: result.image!.originalFilename,
				mimeType: result.image!.mimeType,
				size: result.image!.sizeBytes,
				width: result.image!.width,
				height: result.image!.height,
				createdAt: result.image!.createdAt
			},
			urls: {
				original: `${baseUrl}/i/${result.image!.id}`,
				thumb: `${baseUrl}/i/${result.image!.id}?thumb`
			}
		});
	} catch (e) {
		console.error('Upload error:', e);
		return json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
	}
};
