import { db, schema } from '../db';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { encodeBase64url } from '@oslojs/encoding';
import type {
	GalleryCollaborator,
	GalleryInvitation,
	CollaboratorRole,
	User,
	Gallery
} from '../db/schema';

// Permission interface
export interface GalleryPermissions {
	canView: boolean;
	canUpload: boolean;
	canDelete: boolean;
	canManageCollaborators: boolean;
	canEditSettings: boolean;
	canDeleteGallery: boolean;
	isOwner: boolean;
	role: CollaboratorRole | 'owner';
}

// Collaborator with user info
export interface CollaboratorWithUser extends GalleryCollaborator {
	user: {
		id: string;
		email: string;
	};
}

// Invitation with gallery info
export interface InvitationWithGallery extends GalleryInvitation {
	gallery: {
		id: string;
		name: string;
	};
	inviter: {
		email: string;
	};
}

// Invite result
export interface InviteResult {
	success: boolean;
	invitation?: GalleryInvitation;
	inviteUrl?: string;
	error?: string;
	existingUser?: boolean;
}

// Get permissions based on role
function getPermissionsForRole(role: CollaboratorRole | 'owner'): GalleryPermissions {
	switch (role) {
		case 'owner':
			return {
				canView: true,
				canUpload: true,
				canDelete: true,
				canManageCollaborators: true,
				canEditSettings: true,
				canDeleteGallery: true,
				isOwner: true,
				role: 'owner'
			};
		case 'manager':
			return {
				canView: true,
				canUpload: true,
				canDelete: true,
				canManageCollaborators: true,
				canEditSettings: false,
				canDeleteGallery: false,
				isOwner: false,
				role: 'manager'
			};
		case 'editor':
			return {
				canView: true,
				canUpload: true,
				canDelete: true,
				canManageCollaborators: false,
				canEditSettings: false,
				canDeleteGallery: false,
				isOwner: false,
				role: 'editor'
			};
		case 'viewer':
		default:
			return {
				canView: true,
				canUpload: false,
				canDelete: false,
				canManageCollaborators: false,
				canEditSettings: false,
				canDeleteGallery: false,
				isOwner: false,
				role: 'viewer'
			};
	}
}

// Generate secure invitation token (URL-safe)
function generateInviteToken(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return encodeBase64url(bytes); // URL-safe: uses - and _ instead of + and /
}

// Get user's permissions for a gallery
export async function getUserGalleryPermissions(
	userId: string,
	galleryId: string
): Promise<GalleryPermissions | null> {
	// Check if user is owner
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.id, galleryId))
		.get();

	if (!gallery) return null;

	if (gallery.userId === userId) {
		return getPermissionsForRole('owner');
	}

	// Check if user is collaborator
	const collaborator = await db
		.select()
		.from(schema.galleryCollaborators)
		.where(
			and(
				eq(schema.galleryCollaborators.galleryId, galleryId),
				eq(schema.galleryCollaborators.userId, userId)
			)
		)
		.get();

	if (collaborator) {
		return getPermissionsForRole(collaborator.role as CollaboratorRole);
	}

	return null;
}

// Check if user can access a gallery
export async function canUserAccessGallery(
	userId: string,
	galleryId: string
): Promise<{ canAccess: boolean; role?: CollaboratorRole | 'owner'; isOwner?: boolean }> {
	const permissions = await getUserGalleryPermissions(userId, galleryId);

	if (!permissions) {
		return { canAccess: false };
	}

	return {
		canAccess: true,
		role: permissions.role,
		isOwner: permissions.isOwner
	};
}

// Invite a user to a gallery
export async function inviteToGallery(
	galleryId: string,
	email: string,
	role: CollaboratorRole,
	invitedBy: string
): Promise<InviteResult> {
	// Check if gallery exists
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.id, galleryId))
		.get();

	if (!gallery) {
		return { success: false, error: 'Gallery not found' };
	}

	// Check if inviter has permission
	const inviterPermissions = await getUserGalleryPermissions(invitedBy, galleryId);
	if (!inviterPermissions?.canManageCollaborators) {
		return { success: false, error: 'No permission to invite collaborators' };
	}

	// Normalize email
	const normalizedEmail = email.toLowerCase().trim();

	// Check if user with this email exists
	const existingUser = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, normalizedEmail))
		.get();

	// Check if already a collaborator
	if (existingUser) {
		// Don't allow inviting the owner
		if (gallery.userId === existingUser.id) {
			return { success: false, error: 'Cannot invite the gallery owner' };
		}

		const existingCollaborator = await db
			.select()
			.from(schema.galleryCollaborators)
			.where(
				and(
					eq(schema.galleryCollaborators.galleryId, galleryId),
					eq(schema.galleryCollaborators.userId, existingUser.id)
				)
			)
			.get();

		if (existingCollaborator) {
			return { success: false, error: 'User is already a collaborator' };
		}
	}

	// Check for existing pending invitation
	const existingInvitation = await db
		.select()
		.from(schema.galleryInvitations)
		.where(
			and(
				eq(schema.galleryInvitations.galleryId, galleryId),
				eq(schema.galleryInvitations.email, normalizedEmail)
			)
		)
		.get();

	if (existingInvitation) {
		// Delete old invitation and create new one
		await db
			.delete(schema.galleryInvitations)
			.where(eq(schema.galleryInvitations.id, existingInvitation.id));
	}

	// Create invitation
	const token = generateInviteToken();
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	const invitation: GalleryInvitation = {
		id: nanoid(),
		galleryId,
		email: normalizedEmail,
		role,
		invitedBy,
		token,
		expiresAt,
		createdAt: new Date()
	};

	await db.insert(schema.galleryInvitations).values(invitation);

	return {
		success: true,
		invitation,
		inviteUrl: `/invitations/${token}`,
		existingUser: !!existingUser
	};
}

// Accept an invitation
export async function acceptInvitation(
	token: string,
	userId: string
): Promise<{ success: boolean; galleryId?: string; error?: string }> {
	// Find invitation
	const invitation = await db
		.select()
		.from(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.token, token))
		.get();

	if (!invitation) {
		return { success: false, error: 'Invitation not found' };
	}

	// Check if expired
	if (invitation.expiresAt < new Date()) {
		// Delete expired invitation
		await db
			.delete(schema.galleryInvitations)
			.where(eq(schema.galleryInvitations.id, invitation.id));
		return { success: false, error: 'Invitation has expired' };
	}

	// Get user email to verify it matches
	const user = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();

	if (!user) {
		return { success: false, error: 'User not found' };
	}

	// Email should match (case-insensitive)
	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		return { success: false, error: 'This invitation is for a different email address' };
	}

	// Check if already a collaborator
	const existingCollaborator = await db
		.select()
		.from(schema.galleryCollaborators)
		.where(
			and(
				eq(schema.galleryCollaborators.galleryId, invitation.galleryId),
				eq(schema.galleryCollaborators.userId, userId)
			)
		)
		.get();

	if (existingCollaborator) {
		// Delete invitation since they're already a collaborator
		await db
			.delete(schema.galleryInvitations)
			.where(eq(schema.galleryInvitations.id, invitation.id));
		return { success: false, error: 'Already a collaborator' };
	}

	// Create collaborator record
	const collaborator: GalleryCollaborator = {
		id: nanoid(),
		galleryId: invitation.galleryId,
		userId,
		role: invitation.role,
		invitedBy: invitation.invitedBy,
		invitedAt: invitation.createdAt,
		acceptedAt: new Date()
	};

	await db.insert(schema.galleryCollaborators).values(collaborator);

	// Delete invitation
	await db
		.delete(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.id, invitation.id));

	return { success: true, galleryId: invitation.galleryId };
}

// Get invitation by token
export async function getInvitationByToken(token: string): Promise<InvitationWithGallery | null> {
	const invitation = await db
		.select()
		.from(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.token, token))
		.get();

	if (!invitation) return null;

	// Check if expired
	if (invitation.expiresAt < new Date()) {
		return null;
	}

	// Get gallery info
	const gallery = await db
		.select({ id: schema.galleries.id, name: schema.galleries.name })
		.from(schema.galleries)
		.where(eq(schema.galleries.id, invitation.galleryId))
		.get();

	// Get inviter info
	const inviter = await db
		.select({ email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, invitation.invitedBy))
		.get();

	if (!gallery || !inviter) return null;

	return {
		...invitation,
		gallery,
		inviter
	};
}

// Get all collaborators for a gallery
export async function getGalleryCollaborators(galleryId: string): Promise<CollaboratorWithUser[]> {
	const collaborators = await db
		.select({
			collaborator: schema.galleryCollaborators,
			user: {
				id: schema.users.id,
				email: schema.users.email
			}
		})
		.from(schema.galleryCollaborators)
		.innerJoin(schema.users, eq(schema.galleryCollaborators.userId, schema.users.id))
		.where(eq(schema.galleryCollaborators.galleryId, galleryId));

	return collaborators.map(c => ({
		...c.collaborator,
		user: c.user
	}));
}

// Get pending invitations for a gallery
export async function getPendingInvitations(galleryId: string): Promise<GalleryInvitation[]> {
	const now = new Date();
	const invitations = await db
		.select()
		.from(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.galleryId, galleryId));

	// Filter out expired ones
	return invitations.filter(inv => inv.expiresAt > now);
}

// Update collaborator role
export async function updateCollaboratorRole(
	galleryId: string,
	userId: string,
	newRole: CollaboratorRole,
	requesterId: string
): Promise<boolean> {
	// Check if requester has permission
	const permissions = await getUserGalleryPermissions(requesterId, galleryId);
	if (!permissions?.canManageCollaborators) {
		return false;
	}

	await db
		.update(schema.galleryCollaborators)
		.set({ role: newRole })
		.where(
			and(
				eq(schema.galleryCollaborators.galleryId, galleryId),
				eq(schema.galleryCollaborators.userId, userId)
			)
		);

	return true;
}

// Remove a collaborator
export async function removeCollaborator(
	galleryId: string,
	userId: string,
	requesterId: string
): Promise<boolean> {
	// Check if requester has permission (or is removing themselves)
	const permissions = await getUserGalleryPermissions(requesterId, galleryId);
	if (!permissions?.canManageCollaborators && requesterId !== userId) {
		return false;
	}

	await db
		.delete(schema.galleryCollaborators)
		.where(
			and(
				eq(schema.galleryCollaborators.galleryId, galleryId),
				eq(schema.galleryCollaborators.userId, userId)
			)
		);

	return true;
}

// Cancel a pending invitation
export async function cancelInvitation(
	invitationId: string,
	requesterId: string
): Promise<boolean> {
	// Get the invitation to check the gallery
	const invitation = await db
		.select()
		.from(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.id, invitationId))
		.get();

	if (!invitation) return false;

	// Check if requester has permission
	const permissions = await getUserGalleryPermissions(requesterId, invitation.galleryId);
	if (!permissions?.canManageCollaborators) {
		return false;
	}

	await db
		.delete(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.id, invitationId));

	return true;
}

// Get all galleries a user has access to (owned + collaborated)
export async function getUserAccessibleGalleries(userId: string): Promise<{ gallery: Gallery; role: CollaboratorRole | 'owner' }[]> {
	// Get owned galleries
	const ownedGalleries = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.userId, userId));

	// Get collaborated galleries
	const collaborations = await db
		.select({
			gallery: schema.galleries,
			role: schema.galleryCollaborators.role
		})
		.from(schema.galleryCollaborators)
		.innerJoin(schema.galleries, eq(schema.galleryCollaborators.galleryId, schema.galleries.id))
		.where(eq(schema.galleryCollaborators.userId, userId));

	return [
		...ownedGalleries.map(g => ({ gallery: g, role: 'owner' as const })),
		...collaborations.map(c => ({ gallery: c.gallery, role: c.role as CollaboratorRole }))
	];
}

// Get pending invitations for a user (by email)
export async function getUserPendingInvitations(email: string): Promise<InvitationWithGallery[]> {
	const normalizedEmail = email.toLowerCase().trim();
	const now = new Date();

	const invitations = await db
		.select()
		.from(schema.galleryInvitations)
		.where(eq(schema.galleryInvitations.email, normalizedEmail));

	// Filter expired and add gallery/inviter info
	const validInvitations: InvitationWithGallery[] = [];

	for (const invitation of invitations) {
		if (invitation.expiresAt <= now) continue;

		const gallery = await db
			.select({ id: schema.galleries.id, name: schema.galleries.name })
			.from(schema.galleries)
			.where(eq(schema.galleries.id, invitation.galleryId))
			.get();

		const inviter = await db
			.select({ email: schema.users.email })
			.from(schema.users)
			.where(eq(schema.users.id, invitation.invitedBy))
			.get();

		if (gallery && inviter) {
			validInvitations.push({
				...invitation,
				gallery,
				inviter
			});
		}
	}

	return validInvitations;
}
