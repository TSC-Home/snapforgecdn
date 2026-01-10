# SnapForgeCDN - Projekt TODO

## Projekt-Uberblick

Ein minimalistisches, selbst-gehostetes Bild-CDN mit Admin-Dashboard, Gallery-Management und flexibler Speicherung (lokal oder S3).

**Tech Stack:** SvelteKit, TypeScript, SQLite, Drizzle ORM, Tailwind CSS

---

## Design-Richtlinien

### Grundprinzipien
- **Minimalistisch & Eckig**: Keine runden Ecken (außer bei Tags/Badges), klare Linien
- **Farbpalette**: Weiß-Grau mit schwarzen Akzenten, keine bunten Primary-Farben
- **Schatten**: Subtil oder keine, Tiefe durch Borders erzeugen
- **Spacing**: Großzügig, Luft lassen

### Komponenten-Patterns

#### Expandable Panels (wie SMTP-Settings)
Für optionale/erweiterte Inhalte - nicht einfach `{#if}` toggle, sondern:
```svelte
<div class="border border-gray-200 bg-white rounded-lg overflow-hidden">
  <!-- Header mit Icon, Titel und Close-Button -->
  <div class="p-4 bg-gray-50 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg>...</svg>
        <span class="text-sm font-medium text-gray-700">Panel Titel</span>
      </div>
      <button class="p-1 text-gray-400 hover:text-gray-600">✕</button>
    </div>
  </div>
  <!-- Content -->
  <div class="p-4">
    ...
  </div>
</div>
```

#### Buttons
- **Primary**: `bg-gray-900 text-white hover:bg-gray-800`
- **Secondary**: `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`
- **Ghost**: `text-gray-600 hover:bg-gray-100`
- **Danger**: `bg-red-600 text-white hover:bg-red-700`
- **Icon-Button**: `p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100`

#### Cards
- Border: `border border-gray-200`
- Background: `bg-white`
- Header (optional): `bg-gray-50 border-b border-gray-200`

#### Form-Elemente in Panels
Verschachtelte Konfiguration (wie S3 oder SMTP):
```svelte
<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
  <div class="flex items-center gap-2 text-sm font-medium text-gray-700">
    <svg>...</svg>
    Konfigurations-Titel
  </div>
  <!-- Form fields -->
</div>
```

### Animationen
```css
/* Fade-In für Content */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Slide-In für Drawers (von rechts) */
@keyframes slide-in {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

/* Slide-Up für Bottom-Bars */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Typography
- **Headings**: `font-semibold text-gray-900`
- **Body**: `text-gray-600` oder `text-gray-700`
- **Muted**: `text-gray-400` oder `text-gray-500`
- **Labels**: `text-xs font-medium text-gray-400 uppercase tracking-wide`
- **Code/Mono**: `font-mono text-sm bg-gray-50 border border-gray-200`

### Icons
- Stroke-Width: `1.5` oder `2`
- Farbe: `text-gray-400` default, `text-gray-600` bei hover
- Größe: `w-4 h-4` (small), `w-5 h-5` (medium)

### UI-Komponenten Bibliothek
Alle Komponenten in `src/lib/components/ui/`:
- Button, Input, Select, Card, Modal, Toast
- Table, Th, Td, Pagination
- Upload, TagBadge, TagSelector, TagManager
- LocationPicker, Dropdown, DropdownItem

---

## Architektur

```
src/
├── lib/
│   ├── components/          # Wiederverwendbare UI-Komponenten
│   │   ├── ui/              # Basis-UI (Button, Input, Card, etc.)
│   │   ├── layout/          # Layout-Komponenten (Header, Sidebar, etc.)
│   │   ├── gallery/         # Gallery-spezifische Komponenten
│   │   └── image/           # Bild-spezifische Komponenten
│   ├── server/              # Server-seitige Logik
│   │   ├── db/              # Drizzle Schema & Migrations
│   │   ├── services/        # Business-Logik (auth, gallery, image, storage)
│   │   └── utils/           # Server-Utilities
│   └── utils/               # Shared Utilities
├── routes/
│   ├── (app)/               # Authentifizierte Routen (Dashboard)
│   │   ├── dashboard/
│   │   ├── galleries/
│   │   └── settings/
│   ├── (auth)/              # Auth-Routen (Login, Register)
│   ├── api/                 # API Endpoints
│   │   └── images/
│   └── i/                   # Public CDN Route
└── hooks.server.ts          # Auth Middleware
```

---

## API Endpoints

| Methode | Endpoint           | Auth | Response          | Beschreibung                     |
| ------- | ------------------ | ---- | ----------------- | -------------------------------- |
| POST    | /api/images/upload | Ja   | JSON + URLs       | Upload + compress (adjustable)   |
| GET     | /api/images/:id    | Ja   | JSON Infos + URLs | GetOne mit size/thumbnail Params |
| GET     | /api/images        | Ja   | JSON Array        | GetAll IDs (Gallery, paginiert)  |
| DELETE  | /api/images/:id    | Ja   | 204               | Delete single image              |
| DELETE  | /api/images        | Ja   | JSON count        | Delete batch {ids: []}           |
| GET     | /i/:id             | Nein | Bild Binary       | Public CDN (cached 1 Jahr)       |

**CDN Query-Parameter (`/i/:id`):**
- `size` - Groesse im Format `WxH`, `W` oder `xH` (z.B. `size=1080x1020`, `size=800`, `size=x600`)
- `thumb` - Wenn gesetzt: extrem komprimierte Mini-Version fuer Forschau Bilder

---

## Datenbank-Schema (Drizzle ORM)

### Users
- id (UUID, PK)
- email (unique)
- password_hash
- role (admin | user)
- max_galleries (default: 10)
- created_at
- updated_at

### Galleries
- id (UUID, PK)
- user_id (FK)
- name
- access_token (unique, fuer API auth)
- created_at
- updated_at

### Images
- id (UUID, PK)
- gallery_id (FK)
- filename
- original_filename
- mime_type
- size_bytes
- width
- height
- storage_path
- created_at

### Settings (Key-Value fuer Admin-Einstellungen)
- key (PK)
- value (JSON)

---

## TODOs

### Phase 1: Grundlagen & Setup
- [x] 1.1 Dependencies installieren (drizzle-orm, @libsql/client, sharp, nanoid, oslojs)
- [x] 1.2 Drizzle ORM konfigurieren mit SQLite
- [x] 1.3 Datenbank-Schema erstellen (users, galleries, images, settings)
- [x] 1.4 Migration-System aufsetzen
- [x] 1.5 Config mit Defaults erstellen (src/lib/server/config.ts)
- [x] 1.6 SQLite-Datenbank erstellen


### Phase 2: UI-Komponenten Bibliothek
- [x] 2.1 Design-System definieren (Farben, Spacing, Typography)
- [x] 2.2 Button-Komponente (Varianten: primary, secondary, ghost, danger)
- [x] 2.3 Input-Komponente (Text, Password, mit Validierung)
- [x] 2.4 Card-Komponente
- [x] 2.5 Modal/Dialog-Komponente
- [x] 2.6 Toast/Notification-Komponente
- [x] 2.7 Table-Komponente (mit Th, Td, Pagination)
- [x] 2.8 Dropdown/Select-Komponente
- [x] 2.9 Sidebar-Komponente
- [x] 2.10 Header-Komponente + AppShell

### Phase 3: Authentifizierung
- [x] 3.1 Auth-Service erstellen (login, register, logout, session)
- [x] 3.2 Password-Hashing mit oslojs (PBKDF2-SHA512)
- [x] 3.3 Session-Management (secure tokens mit oslojs)
- [x] 3.4 Auth-Hook (hooks.server.ts)
- [x] 3.5 Login-Seite
- [x] 3.6 Register-Seite (nur wenn keine User existieren)
- [x] 3.7 Auth-Guards fuer geschuetzte Routen

### Phase 4: Dashboard & Gallery-Management
- [x] 4.1 Dashboard-Layout (Sidebar + Header + Content)
- [x] 4.2 Dashboard-Startseite (Statistiken-Uebersicht)
- [x] 4.3 Gallery-Liste mit Erstellen/Loeschen
- [x] 4.4 Gallery-Detail-Ansicht mit Bild-Grid
- [x] 4.5 Access-Token-Management (anzeigen, regenerieren, kopieren)
- [x] 4.6 Gallery umbenennen

### Phase 5: Bild-Upload & Verarbeitung
- [x] 5.1 Storage-Service (lokales Dateisystem)
- [x] 5.2 S3-Storage-Integration (optional, Admin-Setting)
- [x] 5.3 Image-Processing mit Sharp (resize, compress, thumbnails)
- [x] 5.4 Upload-Komponente (Drag & Drop)
- [x] 5.5 Bild-Grid-Komponente
- [x] 5.6 Bild-Detail-Modal (mit Metadaten)
- [x] 5.7 Batch-Delete-Funktion

### Phase 6: API Endpoints
- [x] 6.1 API-Auth-Middleware (Gallery Access Token)
- [x] 6.2 POST /api/images/upload
- [x] 6.3 GET /api/images/:id
- [x] 6.4 GET /api/images (paginiert)
- [x] 6.5 DELETE /api/images/:id
- [x] 6.6 DELETE /api/images (batch)
- [x] 6.7 GET /i/:id (Public CDN mit Caching)
### Phase 7: Admin-Einstellungen
- [x] 7.1 Settings-Seite Layout
- [x] 7.2 Allgemeine Einstellungen (Max Galleries pro User)
- [x] 7.3 Storage-Einstellungen (Lokal vs S3)
- [x] 7.4 S3-Konfiguration UI
- [x] 7.5 Bild-Komprimierung Einstellungen

### Phase 8: User and Image Management
- [x] 8.1 Gallery Collaboration System
  - [x] Collaborators einladen (per Email oder Link)
  - [x] Invitation-System mit Token
  - [x] Email-Service für Einladungen (SMTP konfigurierbar)
  - [x] Collaborator-Rollen (viewer, editor)
- [x] 8.2 Image Metadata
  - [x] Tags-System (erstellen, bearbeiten, löschen)
  - [x] Tag-Filter in Gallery-Ansicht
  - [x] Location/GPS-Daten (Latitude, Longitude, Name)
  - [x] LocationPicker-Komponente mit Karte
  - [x] Image Detail Drawer mit Tabs (Info, Tags, Location)
- [x] 8.3 Erweiterte Bildoptimierung (wie Squoosh)
  - [x] Format-Auswahl (JPEG, WebP, AVIF, PNG) - via Gallery Settings
  - [x] Qualitäts-Slider - via Gallery Settings
  - [x] Resize-Optionen - via CDN params (?w=, ?h=)
  - [x] CDN Query-Params: ?f=webp, ?q=80, ?auto
- [x] 8.4 Format-Konvertierung
  - [x] Auto-Konvertierung basierend auf Browser-Support (?auto param)
  - [x] Manuelle Format-Auswahl per CDN (?f=webp/avif/png/jpeg)
  - [x] Gallery-weite Format-Einstellung in Settings

### Phase 9: Docker & Deployment
- [x] 9.1 Dockerfile erstellen
- [x] 9.2 docker-compose.yml
- [x] 9.3 Volume-Mapping fuer Bilder und Datenbank
- [x] 9.4 Environment-Variablen Dokumentation
- [x] 9.5 README.md mit Setup-Anleitung

### Phase 10: Auto-Update System
- [ ] 10.1 Version-Check Service (prueft GitHub main Branch)
- [ ] 10.2 Aktuelle Version in package.json/DB speichern
- [ ] 10.3 Periodischer Check auf neue Releases (z.B. alle 6 Stunden)
- [ ] 10.4 Admin-Banner "Neue Version verfuegbar - Klicke zum Update"
- [ ] 10.5 Update-Endpoint der Docker Container neu baut/pullt
- [ ] 10.6 Update-Prozess mit Backup-Mechanismus
- [ ] 10.7 Update-Log/History anzeigen

---

## Notizen

### Bildgroessen (On-Demand Resizing)
Keine festen Groessen - alles wird per `size` Parameter gesteuert:
- `/i/:id` - Original
- `/i/:id?size=800` - Breite 800px, Hoehe proportional
- `/i/:id?size=x600` - Hoehe 600px, Breite proportional
- `/i/:id?size=1080x1020` - Exakt 1080x1020 (cropped von Mitte)
- `/i/:id?thumb` - Extrem komprimierte Mini-Version (~100-150px, hohe Kompression)

**Crop-Verhalten:**
- `size=800` (nur Breite): Proportionales Skalieren
- `size=x600` (nur Hoehe): Proportionales Skalieren
- `size=1080x1020` (Breite x Hoehe): Crop von der Mitte, exakte Groesse
- `thumb`: Automatisch klein + stark komprimiert (fuer Galerie-Kacheln)

### Auth-Flow
1. Erster Besuch: Wenn keine User -> Registrierung aktiviert
2. Admin registriert sich -> Ist automatisch Admin
3. Admin kann weitere User erstellen
4. Registrierung standardmaessig deaktiviert

### Caching-Strategie
- `/i/:id` - Cache-Control: public, max-age=31536000 (1 Jahr)
- API-Responses - kein Cache (oder kurz)

### Sicherheit
- API-Auth via `Authorization: Bearer <gallery-token>`
- Session-Cookies httpOnly, secure, sameSite
- CORS fuer API konfigurierbar
- Rate-Limiting (optional)

### Auto-Update System
**Ablauf:**
1. Server prueft periodisch GitHub API auf neue Tags/Releases
2. Vergleicht mit aktueller Version (aus package.json)
3. Wenn neue Version: Banner im Admin-Dashboard anzeigen
4. Admin klickt "Update" -> Server fuehrt Update-Script aus:
   - Backup der Datenbank erstellen
   - `git pull` oder neues Image pullen
   - Container neu starten (via Docker API oder Watchtower-Style)
5. Nach Neustart: Update-Log aktualisieren

**Technische Umsetzung:**
- GitHub API: `GET /repos/{owner}/{repo}/releases/latest`
- Update via Docker: Container muss Zugriff auf Docker Socket haben
- Alternative: Watchtower-Integration oder eigenes Update-Script

---

## Dependencies (zu installieren)

```bash
pnpm add drizzle-orm @libsql/client sharp nanoid @oslojs/crypto @oslojs/encoding
pnpm add -D drizzle-kit
```

**Auth:** oslojs (@oslojs/crypto, @oslojs/encoding) - Password-Hashing, sichere Token-Generierung

## Konfiguration

Alle ENV-Variablen sind **optional** - sinnvolle Defaults im Code (`src/lib/server/config.ts`):
- `DATABASE_URL` - Default: `file:./data/snapforge.db`
- `STORAGE_TYPE` - Default: `local`
- `STORAGE_PATH` - Default: `./data/uploads`
- S3-Variablen nur wenn `STORAGE_TYPE=s3`

**Kein SESSION_SECRET noetig** - oslojs generiert sichere Token ohne shared secret.
**Keine PUBLIC_URL noetig** - wird aus Request-Header ermittelt.
