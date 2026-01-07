import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE_NAME, createSessionCookie } from '$lib/server/services/session';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSession(sessionToken);

	if (session && user) {
		// Refresh cookie if session was extended
		event.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
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
