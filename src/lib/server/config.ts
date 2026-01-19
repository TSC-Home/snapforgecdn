// Zentrale Konfiguration mit sinnvollen Defaults
// ENV-Variablen sind optional und ueberschreiben nur bei Bedarf

export const config = {
	// Database
	database: {
		url: process.env.DATABASE_URL || 'file:./data/snapforge.db'
	},

	// Storage
	storage: {
		type: (process.env.STORAGE_TYPE || 'local') as 'local' | 's3',
		localPath: process.env.STORAGE_PATH || './data/uploads',
		s3: {
			bucket: process.env.S3_BUCKET || '',
			region: process.env.S3_REGION || '',
			accessKey: process.env.S3_ACCESS_KEY || '',
			secretKey: process.env.S3_SECRET_KEY || '',
			endpoint: process.env.S3_ENDPOINT || ''
		}
	},

	// Image Processing Defaults
	images: {
		thumbSize: 150,
		thumbQuality: 60,
		maxUploadSize: 50 * 1024 * 1024, // 50MB
		allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
	},

	// Video Processing Defaults
	videos: {
		maxUploadSize: 500 * 1024 * 1024, // 500MB
		maxDuration: 3600, // 1 hour
		allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
		defaultCodec: 'h264',
		defaultQuality: 23, // CRF
		defaultAudioCodec: 'aac',
		defaultAudioBitrate: 128, // kbps
		thumbnailTime: 1 // seconds
	},

	// User Defaults
	users: {
		defaultMaxGalleries: 10
	}
} as const;
