import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/services/password';
import {
	getAllSettings,
	updateGeneralSettings,
	updateStorageSettings,
	updateImageSettings
} from '$lib/server/services/settings';

export const load: PageServerLoad = async ({ locals }) => {
	// Get user data for account settings
	const user = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			role: schema.users.role,
			maxGalleries: schema.users.maxGalleries,
			createdAt: schema.users.createdAt
		})
		.from(schema.users)
		.where(eq(schema.users.id, locals.user!.id))
		.get();

	const isAdmin = locals.user?.role === 'admin';

	// Only load admin settings if user is admin
	const settings = isAdmin ? await getAllSettings() : null;

	return { user, settings, isAdmin };
};

export const actions: Actions = {
	// Account actions (available to all users)
	email: async ({ request, locals }) => {
		const formData = await request.formData();
		const newEmail = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';

		if (!newEmail || !newEmail.includes('@')) {
			return fail(400, { error: 'Invalid email address', action: 'email' });
		}

		const existing = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, newEmail))
			.get();

		if (existing && existing.id !== locals.user!.id) {
			return fail(400, { error: 'Email address already in use', action: 'email' });
		}

		await db
			.update(schema.users)
			.set({ email: newEmail, updatedAt: new Date() })
			.where(eq(schema.users.id, locals.user!.id));

		return { success: true, action: 'email' };
	},

	password: async ({ request, locals }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!currentPassword || !newPassword) {
			return fail(400, { error: 'All password fields are required', action: 'password' });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: 'New password must be at least 8 characters', action: 'password' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', action: 'password' });
		}

		const user = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, locals.user!.id))
			.get();

		if (!user) {
			return fail(400, { error: 'User not found', action: 'password' });
		}

		const isValid = await verifyPassword(currentPassword, user.passwordHash);
		if (!isValid) {
			return fail(400, { error: 'Current password is incorrect', action: 'password' });
		}

		const newHash = await hashPassword(newPassword);
		await db
			.update(schema.users)
			.set({ passwordHash: newHash, updatedAt: new Date() })
			.where(eq(schema.users.id, locals.user!.id));

		return { success: true, action: 'password' };
	},

	// Admin actions (restricted to admins)
	general: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Only admins can change settings' });
		}

		const formData = await request.formData();
		const defaultMaxGalleries = parseInt(formData.get('defaultMaxGalleries') as string);
		const maxUploadSizeMB = parseInt(formData.get('maxUploadSizeMB') as string);
		const allowRegistration = formData.get('allowRegistration') === 'on';

		if (isNaN(defaultMaxGalleries) || defaultMaxGalleries < 1 || defaultMaxGalleries > 1000) {
			return fail(400, { error: 'Invalid number of galleries (1-1000)', action: 'general' });
		}

		if (isNaN(maxUploadSizeMB) || maxUploadSizeMB < 1 || maxUploadSizeMB > 500) {
			return fail(400, { error: 'Max upload size must be between 1-500MB', action: 'general' });
		}

		await updateGeneralSettings({ defaultMaxGalleries, allowRegistration });
		const currentSettings = await getAllSettings();
		await updateImageSettings({
			thumbSize: currentSettings.images.thumbSize,
			thumbQuality: currentSettings.images.thumbQuality,
			maxUploadSizeMB
		});
		return { success: true, action: 'general' };
	},

	storage: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') {
			return fail(403, { error: 'Only admins can change settings' });
		}

		const formData = await request.formData();
		const type = formData.get('type') as 'local' | 's3';
		const localPath = formData.get('localPath') as string;
		const s3Bucket = formData.get('s3Bucket') as string;
		const s3Region = formData.get('s3Region') as string;
		const s3AccessKey = formData.get('s3AccessKey') as string;
		const s3SecretKey = formData.get('s3SecretKey') as string;
		const s3Endpoint = formData.get('s3Endpoint') as string;

		if (type !== 'local' && type !== 's3') {
			return fail(400, { error: 'Invalid storage type', action: 'storage' });
		}

		if (type === 'local' && !localPath) {
			return fail(400, { error: 'Local path required', action: 'storage' });
		}

		if (type === 's3' && (!s3Bucket || !s3Region || !s3AccessKey || !s3SecretKey)) {
			return fail(400, { error: 'S3 configuration incomplete', action: 'storage' });
		}

		await updateStorageSettings({
			type,
			localPath: localPath || './data/uploads',
			s3Bucket: s3Bucket || '',
			s3Region: s3Region || '',
			s3AccessKey: s3AccessKey || '',
			s3SecretKey: s3SecretKey || '',
			s3Endpoint: s3Endpoint || ''
		});

		return { success: true, action: 'storage' };
	}
};
