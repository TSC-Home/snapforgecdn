import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	getUserGalleryPermissions,
	getGalleryCollaborators,
	getPendingInvitations,
	inviteToGallery,
	updateCollaboratorRole,
	removeCollaborator,
	cancelInvitation
} from '$lib/server/services/collaboration';
import { isSmtpConfigured } from '$lib/server/services/settings';
import { sendInvitationEmail, sendRegistrationInviteEmail } from '$lib/server/services/email';
import type { CollaboratorRole } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const galleryId = params.id;

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user!.id, galleryId);
	if (!permissions?.canView) {
		throw redirect(302, '/galleries');
	}

	// Get gallery
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.id, galleryId))
		.get();

	if (!gallery) {
		throw redirect(302, '/galleries');
	}

	// Get owner info
	const owner = await db
		.select({ id: schema.users.id, email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, gallery.userId))
		.get();

	// Get collaborators
	const collaborators = await getGalleryCollaborators(galleryId);

	// Get pending invitations (only if user can manage)
	const invitations = permissions.canManageCollaborators
		? await getPendingInvitations(galleryId)
		: [];

	// Check if SMTP is configured
	const smtpConfigured = await isSmtpConfigured();

	return {
		gallery,
		owner,
		collaborators,
		invitations,
		permissions,
		smtpConfigured
	};
};

export const actions: Actions = {
	invite: async ({ params, locals, request, url }) => {
		const galleryId = params.id;

		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const role = formData.get('role') as CollaboratorRole;

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Valid email is required', action: 'invite' });
		}

		const validRoles: CollaboratorRole[] = ['viewer', 'editor', 'manager'];
		if (!validRoles.includes(role)) {
			return fail(400, { error: 'Invalid role', action: 'invite' });
		}

		const result = await inviteToGallery(galleryId, email, role, locals.user!.id);

		if (!result.success) {
			return fail(400, { error: result.error, action: 'invite' });
		}

		// Get gallery info for email
		const gallery = await db
			.select()
			.from(schema.galleries)
			.where(eq(schema.galleries.id, galleryId))
			.get();

		// Try to send email if SMTP is configured
		const smtpConfigured = await isSmtpConfigured();
		let emailSent = false;

		if (smtpConfigured && result.invitation) {
			const emailFn = result.existingUser ? sendInvitationEmail : sendRegistrationInviteEmail;
			const emailResult = await emailFn(
				email,
				locals.user!.email,
				gallery?.name || 'Gallery',
				result.inviteUrl!,
				url.origin
			);
			emailSent = emailResult.success;
		}

		return {
			success: true,
			action: 'invite',
			inviteUrl: `${url.origin}${result.inviteUrl}`,
			emailSent,
			smtpConfigured
		};
	},

	updateRole: async ({ params, locals, request }) => {
		const galleryId = params.id;

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const role = formData.get('role') as CollaboratorRole;

		const validRoles: CollaboratorRole[] = ['viewer', 'editor', 'manager'];
		if (!validRoles.includes(role)) {
			return fail(400, { error: 'Invalid role', action: 'updateRole' });
		}

		const updated = await updateCollaboratorRole(galleryId, userId, role, locals.user!.id);

		if (!updated) {
			return fail(400, { error: 'Failed to update role', action: 'updateRole' });
		}

		return { success: true, action: 'updateRole' };
	},

	remove: async ({ params, locals, request }) => {
		const galleryId = params.id;

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		const removed = await removeCollaborator(galleryId, userId, locals.user!.id);

		if (!removed) {
			return fail(400, { error: 'Failed to remove collaborator', action: 'remove' });
		}

		return { success: true, action: 'remove' };
	},

	cancelInvite: async ({ params, locals, request }) => {
		const formData = await request.formData();
		const inviteId = formData.get('inviteId') as string;

		const cancelled = await cancelInvitation(inviteId, locals.user!.id);

		if (!cancelled) {
			return fail(400, { error: 'Failed to cancel invitation', action: 'cancelInvite' });
		}

		return { success: true, action: 'cancelInvite' };
	}
};
