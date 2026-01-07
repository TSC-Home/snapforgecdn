import { encodeBase64, decodeBase64 } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db, schema } from '../db';
import { eq, lt } from 'drizzle-orm';
import type { User } from '../db/schema';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionUser = Omit<User, 'passwordHash'>;

export interface SessionValidationResult {
	session: schema.Session | null;
	user: SessionUser | null;
}

function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return encodeBase64(bytes);
}

function hashSessionToken(token: string): string {
	const bytes = new TextEncoder().encode(token);
	const hash = sha256(bytes);
	return encodeBase64(hash);
}

export async function createSession(userId: string): Promise<{ token: string; session: schema.Session }> {
	const token = generateSessionToken();
	const sessionId = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	const session: schema.Session = {
		id: sessionId,
		userId,
		expiresAt
	};

	await db.insert(schema.sessions).values(session);

	return { token, session };
}

export async function validateSession(token: string): Promise<SessionValidationResult> {
	const sessionId = hashSessionToken(token);

	const result = await db
		.select({
			session: schema.sessions,
			user: schema.users
		})
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.where(eq(schema.sessions.id, sessionId))
		.get();

	if (!result) {
		return { session: null, user: null };
	}

	const { session, user } = result;

	// Check if session is expired
	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
		return { session: null, user: null };
	}

	// Extend session if less than 15 days remaining
	if (Date.now() >= session.expiresAt.getTime() - SESSION_DURATION_MS / 2) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db
			.update(schema.sessions)
			.set({ expiresAt: newExpiresAt })
			.where(eq(schema.sessions.id, sessionId));
		session.expiresAt = newExpiresAt;
	}

	// Remove passwordHash from user
	const { passwordHash: _, ...sessionUser } = user;

	return { session, user: sessionUser };
}

export async function invalidateSession(token: string): Promise<void> {
	const sessionId = hashSessionToken(token);
	await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function cleanupExpiredSessions(): Promise<void> {
	await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

// Cookie helpers
export const SESSION_COOKIE_NAME = 'session';

export function createSessionCookie(token: string): string {
	return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}`;
}

export function createBlankSessionCookie(): string {
	return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
