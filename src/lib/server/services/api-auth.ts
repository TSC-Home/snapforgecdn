import type { RequestEvent } from '@sveltejs/kit';
import { getGalleryByToken } from './gallery';
import type { Gallery } from '../db/schema';

export interface ApiAuthResult {
	authenticated: boolean;
	gallery?: Gallery;
	error?: string;
}

export async function authenticateApiRequest(event: RequestEvent): Promise<ApiAuthResult> {
	const authHeader = event.request.headers.get('Authorization');

	if (!authHeader) {
		return { authenticated: false, error: 'Authorization header fehlt' };
	}

	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		return { authenticated: false, error: 'Ungueltiges Authorization Format (Bearer token erwartet)' };
	}

	const token = parts[1];
	const gallery = await getGalleryByToken(token);

	if (!gallery) {
		return { authenticated: false, error: 'Ungueltiger Access Token' };
	}

	return { authenticated: true, gallery };
}
