import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(
		{
			data: {},
			message: 'File not found.',
			status: 404
		},
		{ status: 404 }
	);
};
