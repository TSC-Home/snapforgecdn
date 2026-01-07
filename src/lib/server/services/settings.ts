import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { config } from '../config';

// Settings types
export interface GeneralSettings {
	defaultMaxGalleries: number;
	allowRegistration: boolean;
}

export interface StorageSettings {
	type: 'local' | 's3';
	localPath: string;
	s3Bucket: string;
	s3Region: string;
	s3AccessKey: string;
	s3SecretKey: string;
	s3Endpoint: string;
}

export interface ImageSettings {
	thumbSize: number;
	thumbQuality: number;
	maxUploadSizeMB: number;
}

export interface AllSettings {
	general: GeneralSettings;
	storage: StorageSettings;
	images: ImageSettings;
}

// Default settings (from config)
function getDefaults(): AllSettings {
	return {
		general: {
			defaultMaxGalleries: config.users.defaultMaxGalleries,
			allowRegistration: false
		},
		storage: {
			type: config.storage.type,
			localPath: config.storage.localPath,
			s3Bucket: config.storage.s3.bucket,
			s3Region: config.storage.s3.region,
			s3AccessKey: config.storage.s3.accessKey,
			s3SecretKey: config.storage.s3.secretKey,
			s3Endpoint: config.storage.s3.endpoint
		},
		images: {
			thumbSize: config.images.thumbSize,
			thumbQuality: config.images.thumbQuality,
			maxUploadSizeMB: Math.round(config.images.maxUploadSize / (1024 * 1024))
		}
	};
}

// Get a single setting
export async function getSetting<T>(key: string): Promise<T | null> {
	const result = await db
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.key, key))
		.get();

	if (!result) return null;
	return result.value as T;
}

// Set a single setting
export async function setSetting<T>(key: string, value: T): Promise<void> {
	await db
		.insert(schema.settings)
		.values({ key, value: value as Record<string, unknown> })
		.onConflictDoUpdate({
			target: schema.settings.key,
			set: { value: value as Record<string, unknown> }
		});
}

// Get all settings (with defaults)
export async function getAllSettings(): Promise<AllSettings> {
	const defaults = getDefaults();

	const general = await getSetting<GeneralSettings>('general');
	const storage = await getSetting<StorageSettings>('storage');
	const images = await getSetting<ImageSettings>('images');

	return {
		general: { ...defaults.general, ...general },
		storage: storage ?? defaults.storage,
		images: images ?? defaults.images
	};
}

// Update general settings
export async function updateGeneralSettings(settings: GeneralSettings): Promise<void> {
	await setSetting('general', settings);
}

// Update storage settings
export async function updateStorageSettings(settings: StorageSettings): Promise<void> {
	await setSetting('storage', settings);
}

// Update image settings
export async function updateImageSettings(settings: ImageSettings): Promise<void> {
	await setSetting('images', settings);
}

// Check if registration is allowed
export async function isRegistrationAllowed(): Promise<boolean> {
	const general = await getSetting<GeneralSettings>('general');
	return general?.allowRegistration ?? false;
}

// Get effective config (merges DB settings with env/defaults)
export async function getEffectiveImageConfig() {
	const settings = await getAllSettings();
	return {
		thumbSize: settings.images.thumbSize,
		thumbQuality: settings.images.thumbQuality,
		maxUploadSize: settings.images.maxUploadSizeMB * 1024 * 1024,
		allowedMimeTypes: config.images.allowedMimeTypes
	};
}

export async function getEffectiveStorageConfig() {
	const settings = await getAllSettings();
	return {
		type: settings.storage.type,
		localPath: settings.storage.localPath,
		s3: {
			bucket: settings.storage.s3Bucket,
			region: settings.storage.s3Region,
			accessKey: settings.storage.s3AccessKey,
			secretKey: settings.storage.s3SecretKey,
			endpoint: settings.storage.s3Endpoint
		}
	};
}
