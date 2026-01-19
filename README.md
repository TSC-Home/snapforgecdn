# SnapForgeCDN

A self-hosted image CDN with admin dashboard, gallery management, and on-the-fly image processing.

## Features

- **Gallery Management** - Organize images in separate galleries with unique access tokens
- **On-the-fly Processing** - Resize, crop, and convert images via URL parameters
- **Modern Formats** - JPEG, PNG, WebP, AVIF with auto-detection based on browser support
- **Tagging & Location** - Organize images with tags and GPS coordinates
- **Team Collaboration** - Invite collaborators with role-based permissions (Owner, Editor, Viewer)
- **RESTful API** - Upload and manage images programmatically
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

All images are cached for 1 year (`Cache-Control: public, max-age=31536000, immutable`).

## API

All endpoints require authentication via gallery access token:

```
Authorization: Bearer <gallery-access-token>
```

### Upload

```bash
curl -X POST "https://cdn.example.com/api/images/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg"
```

### List Images

```bash
curl "https://cdn.example.com/api/images?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete

```bash
# Single image
curl -X DELETE "https://cdn.example.com/api/images/{id}" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Batch delete
curl -X DELETE "https://cdn.example.com/api/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2"]}'
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

## Development

```bash
pnpm install
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm check        # Type checking
```

## Tech Stack

- **Framework:** SvelteKit 2 + Svelte 5
- **Database:** SQLite + Drizzle ORM
- **Image Processing:** Sharp (libvips)
- **Styling:** Tailwind CSS 4

## License

MIT
