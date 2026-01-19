# SnapForgeCDN

A self-hosted media CDN with admin dashboard, gallery management, and on-the-fly image/video processing.

## Features

- **Gallery Management** - Organize media in separate galleries with unique access tokens
- **Image Processing** - Resize, crop, and convert images via URL parameters
- **Video Processing** - Transcode videos with configurable codecs, quality, and resolution
- **Modern Formats** - Images: JPEG, PNG, WebP, AVIF | Videos: MP4, WebM (H.264, H.265, VP9, AV1)
- **Tagging & Location** - Organize media with tags and GPS coordinates
- **Team Collaboration** - Invite collaborators with role-based permissions
- **RESTful API** - Upload and manage media programmatically
- **Background Uploads** - Non-blocking upload with progress indicator

## Quick Start

```bash
# Clone and start with Docker
git clone https://github.com/TSC-Home/snapforgecdn.git
cd snapforgecdn
docker compose -f docker-compose.local.yml up -d

# Open http://localhost:3000
```

The first registered user becomes admin.

## Docker Compose

```yaml
version: '3.8'

services:
  snapforge:
    image: ghcr.io/tsc-home/snapforgecdn:latest
    container_name: snapforgecdn
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - snapforge_data:/app/data
    environment:
      - ORIGIN=https://cdn.example.com

volumes:
  snapforge_data:
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ORIGIN` | `http://localhost:3000` | Public URL (required in production) |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `DATABASE_URL` | `file:/app/data/snapforge.db` | SQLite database path |
| `STORAGE_PATH` | `/app/data/uploads` | Local storage path |

### Email (Optional)

Required for sending collaboration invitations:

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender email address |

## CDN Usage

### Images

Images are served from `/i/{imageId}` with optional transformations:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `thumb` | `?thumb` | Thumbnail (150px) |
| `w` | `?w=800` | Resize to width |
| `h` | `?h=600` | Resize to height |
| `w` + `h` | `?w=800&h=600` | Crop to exact dimensions |
| `q` | `?q=80` | Quality 1-100 |
| `f` | `?f=webp` | Format: jpeg, webp, avif, png |
| `auto` | `?auto` | Auto-select WebP/AVIF based on browser |

**Examples:**
```
/i/abc123              # Original image
/i/abc123?thumb        # 150px thumbnail
/i/abc123?w=800        # Resize to 800px width
/i/abc123?w=400&h=300  # Crop to 400x300
/i/abc123?auto&q=85    # Best format at 85% quality
```

### Videos

Videos are served from `/v/{videoId}`:

```
/v/xyz789              # Stream video (supports range requests)
/v/xyz789?thumb        # Video thumbnail
```

All media is cached for 1 year (`Cache-Control: public, max-age=31536000, immutable`).

## API

All endpoints require authentication via gallery access token:

```
Authorization: Bearer <gallery-access-token>
```

### Images

```bash
# Upload image
curl -X POST "https://cdn.example.com/api/images/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg"

# List images
curl "https://cdn.example.com/api/images?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete image
curl -X DELETE "https://cdn.example.com/api/images/{id}" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Batch delete
curl -X DELETE "https://cdn.example.com/api/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2"]}'
```

### Videos

```bash
# Upload video
curl -X POST "https://cdn.example.com/api/videos/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@video.mp4"

# List videos
curl "https://cdn.example.com/api/videos?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete video
curl -X DELETE "https://cdn.example.com/api/videos/{id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Tags

```bash
# List gallery tags
GET /api/galleries/{galleryId}/tags

# Create tag
POST /api/galleries/{galleryId}/tags
{"name": "vacation", "color": "#3b82f6"}

# Update image tags
POST /api/images/{imageId}/tags
{"tagIds": ["tag1", "tag2"]}
```

### Metadata

```bash
PATCH /api/images/{imageId}/metadata
{
  "latitude": 52.520008,
  "longitude": 13.404954,
  "locationName": "Berlin"
}
```

## Video Processing Settings

Each gallery can have custom video processing settings:

| Setting | Description |
|---------|-------------|
| **Output Format** | Keep original, MP4, or WebM |
| **Video Codec** | H.264, H.265/HEVC, VP9, AV1 |
| **Quality (CRF)** | 0-51 (lower = better quality) |
| **Max Resolution** | Limit width/height |
| **Audio Codec** | AAC, Opus, Copy, or None |
| **Audio Bitrate** | 32-320 kbps |
| **Thumbnail** | Auto-generate from video frame |

## Development

```bash
pnpm install
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm check        # Type checking
```

**Requirements:**
- Node.js 22+
- FFmpeg (for video processing)

## Tech Stack

- **Framework:** SvelteKit 2 + Svelte 5
- **Database:** SQLite + Drizzle ORM
- **Image Processing:** Sharp (libvips)
- **Video Processing:** FFmpeg
- **Styling:** Tailwind CSS 4

## License

MIT
