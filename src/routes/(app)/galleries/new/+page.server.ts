import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createGallery, getUserGalleries } from '$lib/server/services/gallery';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const galleries = await getUserGalleries(user.id);

	// Check if user can create more galleries
	if (galleries.length >= user.maxGalleries) {
		throw redirect(302, '/galleries');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();

		if (!name) {
			return fail(400, { error: 'Name ist erforderlich', name: '' });
		}

		if (name.length < 2) {
			return fail(400, { error: 'Name muss mindestens 2 Zeichen haben', name });
		}

		if (name.length > 50) {
			return fail(400, { error: 'Name darf maximal 50 Zeichen haben', name });
		}

		const result = await createGallery(locals.user!.id, name);

		if (!result.success) {
			return fail(400, { error: result.error, name });
		}

		throw redirect(302, `/galleries/${result.gallery!.id}`);
	}
};
