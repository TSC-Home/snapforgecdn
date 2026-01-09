#!/usr/bin/env node

/**
 * Database initialization script
 * Creates all tables if they don't exist
 * Run this before starting the app for the first time
 */

import Database from 'libsql';

const dbUrl = process.env.DATABASE_URL || 'file:./data/snapforge.db';
const dbPath = dbUrl.replace('file:', '');

console.log(`Initializing database at: ${dbPath}`);

const db = new Database(dbPath);

// Create all tables
const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    max_galleries INTEGER NOT NULL DEFAULT 10,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
);

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    thumb_size INTEGER,
    thumb_quality INTEGER,
    image_quality INTEGER,
    output_format TEXT CHECK (output_format IN ('original', 'jpeg', 'webp', 'avif', 'png')),
    resize_method TEXT CHECK (resize_method IN ('lanczos3', 'lanczos2', 'mitchell', 'catrom', 'nearest')),
    jpeg_quality INTEGER,
    webp_quality INTEGER,
    avif_quality INTEGER,
    png_compression_level INTEGER,
    effort INTEGER,
    chroma_subsampling TEXT CHECK (chroma_subsampling IN ('420', '422', '444')),
    strip_metadata INTEGER,
    auto_orient INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    altitude REAL,
    taken_at INTEGER,
    created_at INTEGER NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Gallery collaborators table
CREATE TABLE IF NOT EXISTS gallery_collaborators (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'manager')),
    invited_by TEXT NOT NULL REFERENCES users(id),
    invited_at INTEGER NOT NULL,
    accepted_at INTEGER
);

-- Gallery invitations table
CREATE TABLE IF NOT EXISTS gallery_invitations (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'manager')),
    invited_by TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- Image tags table
CREATE TABLE IF NOT EXISTS image_tags (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT
);

-- Image tag assignments table
CREATE TABLE IF NOT EXISTS image_tag_assignments (
    image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES image_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (image_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_images_gallery_id ON images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_collaborators_gallery_id ON gallery_collaborators(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_collaborators_user_id ON gallery_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_invitations_gallery_id ON gallery_invitations(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_invitations_token ON gallery_invitations(token);
CREATE INDEX IF NOT EXISTS idx_image_tags_gallery_id ON image_tags(gallery_id);
`;

// Execute each statement - using run() method which is safe for DDL
const statements = schema.split(';').filter(s => s.trim());

for (const statement of statements) {
    if (statement.trim()) {
        try {
            db.prepare(statement).run();
        } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists')) {
                console.error(`Error executing: ${statement.substring(0, 50)}...`);
                console.error(err.message);
            }
        }
    }
}

db.close();
console.log('Database initialized successfully!');
