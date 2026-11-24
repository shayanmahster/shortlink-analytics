# ShortLink Analytics

A full-stack URL shortener with QR code generation and real-time click analytics, built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **SQLite (`better-sqlite3`)**, and **Recharts**.

## Features

- **URL Shortening** — Auto-generated 6-character codes (`nanoid`) or custom aliases with strict URL validation (`zod`).
- **Link Expiration** — Optional expiration timestamps returning HTTP `410 Gone` once expired.
- **QR Code Generation** — Instant PNG QR codes generated on the fly (`/api/links/:code/qr`) with one-click download.
- **Privacy-Friendly Analytics** — Tracks total clicks, unique visitors (via salted SHA-256 IP hashes), 14-day click trends, device types, browsers, OS, and top referrers.
- **Production-Ready Setup** — Multi-stage `Dockerfile`, `docker-compose.yml` with persistent SQLite volume, unit tests with `vitest`, and GitHub Actions CI.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Lucide Icons
- **Database:** SQLite (`better-sqlite3`, WAL mode)
- **Charts & QR:** Recharts + `qrcode`
- **Validation & Testing:** Zod + Vitest

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy environment variables
cp .env.example .env.local

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Run with Docker

```bash
docker compose up --build
```

The SQLite database is persisted in the `shortlink_data` Docker volume.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/links?q=` | List all links (with optional search query) and global stats |
| `POST` | `/api/links` | Create a new short link (`{ url, customCode?, title?, expiresAt? }`) |
| `GET` | `/api/links/:code?days=14` | Fetch detailed analytics for a short link |
| `DELETE` | `/api/links/:code` | Delete a short link and its click history |
| `GET` | `/api/links/:code/qr` | Generate a PNG QR code for the short link |
| `GET` | `/:code` | Redirect (`302`) to the destination URL and record a click event |
| `GET` | `/api/health` | Health check endpoint |

## Scripts

```bash
npm run dev        # Start development server
npm run typecheck  # Run TypeScript compiler checks
npm test           # Run unit tests (Vitest)
npm run build      # Build for production
```

## License

MIT
