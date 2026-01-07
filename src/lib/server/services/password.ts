import { encodeBase64, decodeBase64 } from '@oslojs/encoding';

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const passwordKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);

	const hash = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: ITERATIONS,
			hash: 'SHA-512'
		},
		passwordKey,
		KEY_LENGTH * 8
	);

	// Format: base64(salt):base64(hash)
	return `${encodeBase64(salt)}:${encodeBase64(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	try {
		const [saltB64, hashB64] = storedHash.split(':');
		if (!saltB64 || !hashB64) return false;

		const salt = new Uint8Array(decodeBase64(saltB64));
		const expectedHash = decodeBase64(hashB64);

		const passwordKey = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(password),
			'PBKDF2',
			false,
			['deriveBits']
		);

		const hash = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: salt.buffer as ArrayBuffer,
				iterations: ITERATIONS,
				hash: 'SHA-512'
			},
			passwordKey,
			KEY_LENGTH * 8
		);

		// Timing-safe comparison
		const hashArray = new Uint8Array(hash);
		if (hashArray.length !== expectedHash.length) return false;

		let diff = 0;
		for (let i = 0; i < hashArray.length; i++) {
			diff |= hashArray[i] ^ expectedHash[i];
		}
		return diff === 0;
	} catch {
		return false;
	}
}
