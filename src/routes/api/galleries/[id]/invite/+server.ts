import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inviteToGallery, getPendingInvitations, getUserGalleryPermissions } from '$lib/server/services/collaboration';
import { isSmtpConfigured } from '$lib/server/services/settings';
import { sendInvitationEmail, sendRegistrationInviteEmail } from '$lib/server/services/email';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { CollaboratorRole } from '$lib/server/db/schema';

const validRoles: CollaboratorRole[] = ['viewer', 'editor', 'manager'];

// GET /api/galleries/[id]/invite - Get pending invitations
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const galleryId = params.id;

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, galleryId);
	if (!permissions?.canManageCollaborators) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const invitations = await getPendingInvitations(galleryId);

	return json({
		invitations: invitations.map(inv => ({
			id: inv.id,
			email: inv.email,
			role: inv.role,
			expiresAt: inv.expiresAt,
			createdAt: inv.createdAt
		}))
	});
};

// POST /api/galleries/[id]/invite - Send invitation
export const POST: RequestHandler = async ({ params, locals, request, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const galleryId = params.id;

	try {
		const body = await request.json();
		const { email, role } = body;

		if (!email || typeof email !== 'string' || !email.includes('@')) {
			return json({ error: 'Valid email is required' }, { status: 400 });
		}

		if (!role || !validRoles.includes(role)) {
			return json({ error: 'Invalid role' }, { status: 400 });
		}

		// Create invitation
		const result = await inviteToGallery(galleryId, email, role, locals.user.id);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		// Get gallery info for email
		const gallery = await db
			.select()
			.from(schema.galleries)
			.where(eq(schema.galleries.id, galleryId))
			.get();

		const baseUrl = url.origin;
		let emailSent = false;

		// Try to send email if SMTP is configured
		const smtpConfigured = await isSmtpConfigured();
		if (smtpConfigured && result.invitation) {
			const emailFn = result.existingUser ? sendInvitationEmail : sendRegistrationInviteEmail;
			const emailResult = await emailFn(
				email,
				locals.user.email,
				gallery?.name || 'Gallery',
				result.inviteUrl!,
				baseUrl
			);
			emailSent = emailResult.success;
		}

		return json({
			success: true,
			invitation: {
				id: result.invitation!.id,
				email: result.invitation!.email,
				role: result.invitation!.role,
				expiresAt: result.invitation!.expiresAt
			},
			inviteUrl: `${baseUrl}${result.inviteUrl}`,
			emailSent,
			smtpConfigured
		}, { status: 201 });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};
