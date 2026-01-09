import type { Handle, HandleServerError } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE_NAME, createSessionCookie } from '$lib/server/services/session';

// Error handler with better messages
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	// Log detailed error info
	console.error(`[${errorId}] Error ${status}: ${message}`);
	console.error(`[${errorId}] URL: ${event.url.pathname}`);
	console.error(`[${errorId}] Method: ${event.request.method}`);
	console.error(`[${errorId}] Origin header: ${event.request.headers.get('origin')}`);
	console.error(`[${errorId}] Host header: ${event.request.headers.get('host')}`);
	console.error(`[${errorId}] X-Forwarded-Host: ${event.request.headers.get('x-forwarded-host')}`);
	console.error(`[${errorId}] X-Forwarded-Proto: ${event.request.headers.get('x-forwarded-proto')}`);

	if (error instanceof Error) {
		console.error(`[${errorId}] Stack:`, error.stack);
	}

	// Check if it might be CSRF related
	if (status === 403 || message?.includes('CSRF') || message?.includes('cross-site')) {
		console.error(`[${errorId}] CSRF CHECK FAILED - This is likely a reverse proxy configuration issue`);
		console.error(`[${errorId}] Make sure ORIGIN env var matches the public URL`);
		console.error(`[${errorId}] Current ORIGIN env: ${process.env.ORIGIN}`);
	}

	return {
		message: `Error: ${message}`,
		errorId
	};
};

export const handle: Handle = async ({ event, resolve }) => {
	// Log incoming request for debugging
	if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
		console.log(`[Request] ${event.request.method} ${event.url.pathname}`);
	}
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSession(sessionToken);

	if (session && user) {
		// Refresh cookie if session was extended
		const isSecure = event.request.headers.get('x-forwarded-proto') === 'https';
		event.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: isSecure,
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		event.locals.user = user;
		event.locals.session = session;
	} else {
		// Clear invalid session cookie
		event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
