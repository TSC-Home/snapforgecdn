import { mkdir, writeFile, readFile, unlink, access } from 'fs/promises';
import { join, dirname } from 'path';
import { config } from '../config';

export interface StorageProvider {
	save(path: string, data: Buffer): Promise<void>;
	read(path: string): Promise<Buffer>;
	delete(path: string): Promise<void>;
	exists(path: string): Promise<boolean>;
}

class LocalStorage implements StorageProvider {
	private basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	private getFullPath(path: string): string {
		return join(this.basePath, path);
	}

	async save(path: string, data: Buffer): Promise<void> {
		const fullPath = this.getFullPath(path);
		await mkdir(dirname(fullPath), { recursive: true });
		await writeFile(fullPath, data);
	}

	async read(path: string): Promise<Buffer> {
		const fullPath = this.getFullPath(path);
		return readFile(fullPath);
	}

	async delete(path: string): Promise<void> {
		const fullPath = this.getFullPath(path);
		try {
			await unlink(fullPath);
		} catch (e) {
			// Ignore if file doesn't exist
		}
	}

	async exists(path: string): Promise<boolean> {
		const fullPath = this.getFullPath(path);
		try {
			await access(fullPath);
			return true;
		} catch {
			return false;
		}
	}
}

class S3Storage implements StorageProvider {
	// S3 implementation will be added later
	// For now, throw error if used
	async save(_path: string, _data: Buffer): Promise<void> {
		throw new Error('S3 storage not implemented yet');
	}

	async read(_path: string): Promise<Buffer> {
		throw new Error('S3 storage not implemented yet');
	}

	async delete(_path: string): Promise<void> {
		throw new Error('S3 storage not implemented yet');
	}

	async exists(_path: string): Promise<boolean> {
		throw new Error('S3 storage not implemented yet');
	}
}

// Create storage instance based on config
function createStorage(): StorageProvider {
	if (config.storage.type === 's3') {
		return new S3Storage();
	}
	return new LocalStorage(config.storage.localPath);
}

export const storage = createStorage();
