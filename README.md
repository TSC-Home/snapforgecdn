# SnapForgeCDN

A minimalist, self-hosted image CDN with admin dashboard, gallery management, and flexible storage (local or S3).

## Features

- **Gallery Management** - Organize images in galleries with access tokens
- **Image Processing** - On-the-fly resizing, format conversion, compression
- **Multiple Formats** - JPEG, WebP, AVIF, PNG with auto-detection
- **Collaboration** - Invite team members with role-based access
- **Tagging & Location** - Tag images and add GPS coordinates
- **S3 Support** - Store images locally or on S3-compatible storage
- **API Access** - RESTful API for programmatic uploads

## Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/snapforgecdn.git
cd snapforgecdn

# Start with Docker Compose
docker compose up -d

# Open http://localhost:3000
```

The first user to register becomes the admin.

## Docker Compose

```yaml
version: '3.8'

services:
  snapforge:
    image: ghcr.io/TSC-Home/snapforgecdn:latest
    # Or build locally:
    # build: .
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
| `ORIGIN` | `http://localhost:3000` | **Required in production.** Public URL of your instance |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `DATABASE_URL` | `file:/app/data/snapforge.db` | SQLite database path |

### Storage Configuration

**Local Storage (default):**
| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_TYPE` | `local` | Storage type |
| `STORAGE_PATH` | `/app/data/uploads` | Local storage path |

**S3 Storage:**
| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_TYPE` | Yes | Set to `s3` |
| `S3_BUCKET` | Yes | S3 bucket name |
| `S3_REGION` | Yes | AWS region (e.g., `eu-central-1`) |
| `S3_ACCESS_KEY` | Yes | AWS access key ID |
| `S3_SECRET_KEY` | Yes | AWS secret access key |
| `S3_ENDPOINT` | No | Custom endpoint for S3-compatible storage |

### Email Configuration (Optional)

For collaboration invitations via email:

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for emails |

## API Usage

### Authentication

All API requests require the gallery access token:

```
Authorization: Bearer <gallery-access-token>
```

### Upload Image

```bash
curl -X POST "https://cdn.example.com/api/images/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg"
```

### Get Image (CDN)

```
GET /i/{imageId}
```

**Query Parameters:**
| Parameter | Example | Description |
|-----------|---------|-------------|
| `thumb` | `/i/abc?thumb` | Thumbnail (~150px) |
| `w` | `/i/abc?w=800` | Width in pixels |
| `h` | `/i/abc?h=600` | Height in pixels |
| `q` | `/i/abc?q=80` | Quality (1-100) |
| `f` | `/i/abc?f=webp` | Format (jpeg, webp, avif, png) |
| `auto` | `/i/abc?auto` | Auto-select best format based on browser |

**Examples:**
```
/i/abc123                    # Original
/i/abc123?thumb              # Thumbnail
/i/abc123?w=800              # Resize to 800px width
/i/abc123?w=800&h=600        # Crop to 800x600
/i/abc123?f=webp&q=85        # WebP at 85% quality
/i/abc123?auto               # Auto WebP/AVIF for modern browsers
```

### List Images

```bash
curl "https://cdn.example.com/api/images?page=1&perPage=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Image

```bash
curl -X DELETE "https://cdn.example.com/api/images/{imageId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Batch Delete

```bash
curl -X DELETE "https://cdn.example.com/api/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["id1", "id2", "id3"]}'
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run production build
node build
```

## Tech Stack

- **Framework:** SvelteKit
- **Database:** SQLite with Drizzle ORM
- **Image Processing:** Sharp
- **Styling:** Tailwind CSS
- **Auth:** Session-based with secure tokens

## License

MIT
