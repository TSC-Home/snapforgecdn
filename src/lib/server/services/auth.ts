import { nanoid } from 'nanoid';
import { db, schema } from '../db';
import { eq, count } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password';
import { createSession, invalidateSession, type SessionUser } from './session';

export interface RegisterResult {
	success: boolean;
	error?: string;
	user?: SessionUser;
	token?: string;
}

export interface LoginResult {
	success: boolean;
	error?: string;
	user?: SessionUser;
	token?: string;
}

export async function hasAnyUsers(): Promise<boolean> {
	const result = await db.select({ count: count() }).from(schema.users).get();
	return (result?.count ?? 0) > 0;
}

export async function register(email: string, password: string): Promise<RegisterResult> {
	// Check if registration is allowed (no users exist OR registration is enabled)
	const hasUsers = await hasAnyUsers();

	if (hasUsers) {
		// Check if registration is enabled in settings
		const setting = await db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, 'registration_enabled'))
			.get();

		if (!setting || setting.value !== true) {
			return { success: false, error: 'Registration is disabled' };
		}
	}

	// Validate email
	if (!email || !email.includes('@')) {
		return { success: false, error: 'Invalid email address' };
	}

	// Validate password
	if (!password || password.length < 8) {
		return { success: false, error: 'Password must be at least 8 characters' };
	}

	// Check if email already exists
	const existingUser = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email.toLowerCase()))
		.get();

	if (existingUser) {
		return { success: false, error: 'Email address already registered' };
	}

	// Create user
	const userId = nanoid();
	const passwordHash = await hashPassword(password);
	const isFirstUser = !hasUsers;

	await db.insert(schema.users).values({
		id: userId,
		email: email.toLowerCase(),
		passwordHash,
		role: isFirstUser ? 'admin' : 'user'
	});

	// Create session
	const { token } = await createSession(userId);

	const user: SessionUser = {
		id: userId,
		email: email.toLowerCase(),
		role: isFirstUser ? 'admin' : 'user',
		maxGalleries: 10,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	return { success: true, user, token };
}

export async function login(email: string, password: string): Promise<LoginResult> {
	// Validate input
	if (!email || !password) {
		return { success: false, error: 'Email and password required' };
	}

	// Find user
	const user = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email.toLowerCase()))
		.get();

	if (!user) {
		return { success: false, error: 'Invalid credentials' };
	}

	// Verify password
	const valid = await verifyPassword(password, user.passwordHash);
	if (!valid) {
		return { success: false, error: 'Invalid credentials' };
	}

	// Create session
	const { token } = await createSession(user.id);

	const { passwordHash: _, ...sessionUser } = user;

	return { success: true, user: sessionUser, token };
}

export async function logout(token: string): Promise<void> {
	await invalidateSession(token);
}
