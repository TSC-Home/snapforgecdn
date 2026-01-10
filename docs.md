# SnapForge CDN API Documentation

## Authentication

All API endpoints require authentication via a **Bearer Token**. Each gallery has its own unique access token.

```
Authorization: Bearer <gallery_access_token>
```

You can find your gallery's access token in the web UI under the gallery settings.

---

## Base URL

All API endpoints are relative to your SnapForge instance:
```
https://your-snapforge-instance.com
```

---

## Endpoints

### Health Check

Check if the API is running.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T12:00:00.000Z"
}
```

---

## Images

### Upload Image

Upload a new image to a gallery.

```http
POST /api/images/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The image file to upload |

**Example (curl):**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  https://your-instance.com/api/images/upload
```

**Success Response (200):**
```json
{
  "success": true,
  "image": {
    "id": "abc123",
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "size": 1024000,
    "width": 1920,
    "height": 1080,
    "createdAt": 1704801600000
  },
  "urls": {
    "original": "https://your-instance.com/i/abc123",
    "thumb": "https://your-instance.com/i/abc123?thumb"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Keine Datei hochgeladen"
}
```

---

### List Images

Get a paginated list of all images in a gallery.

```http
GET /api/images
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `perPage` | integer | 50 | Items per page (max 100) |

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-instance.com/api/images?page=1&perPage=20"
```

**Response:**
```json
{
  "images": [
    {
      "id": "abc123",
      "filename": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 1024000,
      "width": 1920,
      "height": 1080,
      "createdAt": 1704801600000,
      "location": {
        "latitude": 47.3769,
        "longitude": 8.5417,
        "altitude": 408,
        "name": "Zurich, Switzerland"
      },
      "takenAt": "2024-01-09T12:00:00.000Z",
      "tags": [
        { "id": "tag1", "name": "Nature", "color": "#22c55e" },
        { "id": "tag2", "name": "Summer", "color": "#eab308" }
      ],
      "urls": {
        "original": "https://your-instance.com/i/abc123",
        "thumb": "https://your-instance.com/i/abc123?thumb"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Get Single Image

Get metadata for a specific image.

```http
GET /api/images/{id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "abc123",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 1024000,
  "width": 1920,
  "height": 1080,
  "createdAt": 1704801600000,
  "location": {
    "latitude": 47.3769,
    "longitude": 8.5417,
    "altitude": 408,
    "name": "Zurich, Switzerland"
  },
  "takenAt": "2024-01-09T12:00:00.000Z",
  "tags": [
    { "id": "tag1", "name": "Nature", "color": "#22c55e" },
    { "id": "tag2", "name": "Summer", "color": "#eab308" }
  ],
  "urls": {
    "original": "https://your-instance.com/i/abc123",
    "thumb": "https://your-instance.com/i/abc123?thumb"
  }
}
```

**Note:** `location` fields may be `null` if no GPS data is available. `takenAt` may be `null` if no date was extracted from EXIF. `tags` will be an empty array if no tags are assigned.

---

### Delete Single Image

Delete a specific image.

```http
DELETE /api/images/{id}
Authorization: Bearer <token>
```

**Response:** `204 No Content`

---

### Bulk Delete Images

Delete multiple images at once.

```http
DELETE /api/images
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": ["abc123", "def456", "ghi789"]
}
```

**Response:**
```json
{
  "deleted": 3
}
```

---

## Serving Images

Images can be accessed publicly (no authentication required) via the `/i/` path:

```
https://your-instance.com/i/{image_id}
```

### Query Parameters for Image Transformation

| Parameter | Example | Description |
|-----------|---------|-------------|
| `thumb` | `?thumb` | Returns thumbnail version |
| `size` | `?size=800x600` | Resize to exact dimensions |
| `w` | `?w=800` | Resize width (maintains aspect ratio) |
| `h` | `?h=600` | Resize height (maintains aspect ratio) |
| `q` | `?q=80` | Quality (1-100, for lossy formats) |
| `f` or `format` | `?f=webp` | Output format (jpeg, webp, avif, png) |
| `auto` | `?auto` | Auto-select best format based on browser |

### Examples

```bash
# Original image
https://your-instance.com/i/abc123

# Thumbnail
https://your-instance.com/i/abc123?thumb

# Resize to 800px width
https://your-instance.com/i/abc123?w=800

# Resize to exact dimensions
https://your-instance.com/i/abc123?size=800x600

# Convert to WebP with 80% quality
https://your-instance.com/i/abc123?f=webp&q=80

# Resize + auto format (serves AVIF/WebP if browser supports)
https://your-instance.com/i/abc123?w=800&auto

# Combine multiple parameters
https://your-instance.com/i/abc123?w=400&f=webp&q=75
```

### Supported Output Formats

- `jpeg` / `jpg` - JPEG format
- `webp` - WebP format (smaller file sizes)
- `avif` - AVIF format (best compression, modern browsers)
- `png` - PNG format (lossless)

### Caching

All served images include aggressive caching headers:
```
Cache-Control: public, max-age=31536000, immutable
```

---

## Code Examples

### JavaScript / Node.js

```javascript
const TOKEN = 'your_gallery_token';
const BASE_URL = 'https://your-instance.com';

// Upload image
async function uploadImage(filePath) {
  const formData = new FormData();
  formData.append('file', await fs.openAsBlob(filePath));

  const response = await fetch(`${BASE_URL}/api/images/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    },
    body: formData
  });

  return response.json();
}

// List images
async function listImages(page = 1) {
  const response = await fetch(`${BASE_URL}/api/images?page=${page}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });

  return response.json();
}

// Delete image
async function deleteImage(imageId) {
  await fetch(`${BASE_URL}/api/images/${imageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });
}
```

### Python

```python
import requests

TOKEN = 'your_gallery_token'
BASE_URL = 'https://your-instance.com'
HEADERS = {'Authorization': f'Bearer {TOKEN}'}

# Upload image
def upload_image(file_path):
    with open(file_path, 'rb') as f:
        response = requests.post(
            f'{BASE_URL}/api/images/upload',
            headers=HEADERS,
            files={'file': f}
        )
    return response.json()

# List images
def list_images(page=1, per_page=50):
    response = requests.get(
        f'{BASE_URL}/api/images',
        headers=HEADERS,
        params={'page': page, 'perPage': per_page}
    )
    return response.json()

# Delete image
def delete_image(image_id):
    requests.delete(
        f'{BASE_URL}/api/images/{image_id}',
        headers=HEADERS
    )

# Bulk delete
def delete_images(image_ids):
    response = requests.delete(
        f'{BASE_URL}/api/images',
        headers=HEADERS,
        json={'ids': image_ids}
    )
    return response.json()
```

### cURL

```bash
# Set your token
export TOKEN="your_gallery_token"
export BASE="https://your-instance.com"

# Upload image
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.jpg" \
  "$BASE/api/images/upload"

# List images
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/images?page=1&perPage=20"

# Get single image metadata
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/images/abc123"

# Delete single image
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/images/abc123"

# Bulk delete
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["abc123", "def456"]}' \
  "$BASE/api/images"
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (e.g., after upload) |
| 204 | No Content (successful delete) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (no permission for this resource) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limits

Currently, there are no enforced rate limits. However, be mindful of upload sizes and request frequency to ensure good performance for all users.

---

## Image Upload Limits

- Supported formats: JPEG, PNG, WebP, AVIF, GIF
- Maximum file size: Configured by server administrator
- Images are automatically processed and optimized upon upload
