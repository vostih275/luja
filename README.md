# Luja — Secure Book Sharing & Access Control

Luja is a production-grade secure book-sharing web application built with Next.js 15, Prisma, and SQLite. It supports role-based access control (`ADMIN` / `READER`), private file storage, invitation-based onboarding, instant permission revocation, and a complete audit trail.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Database:** Prisma ORM with SQLite (zero external services for local development)
- **Authentication:** Email/password with `bcryptjs`, JWT sessions via `jose` in HTTP-only cookies
- **Testing:** Vitest with isolated SQLite test database

## Prerequisites

- Node.js 22+ and npm 10+
- Git

## Setup

1. Clone or navigate to the repository:
   ```bash
   cd Luja
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set a strong `JWT_SECRET` and `ADMIN_PASSWORD` (at least 12 characters).

4. Apply the Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

5. Seed the admin user:
   ```bash
   npm run db:seed
   ```
   This creates the admin account defined in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

6. Start the development server:
   ```bash
   npm run dev
   ```
   The server listens on `0.0.0.0:3000`, so you can access it via:
   - Local: `http://localhost:3000`
   - LAN: `http://<host-ip>:3000` (e.g., `http://192.168.100.38:3000`)

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Next.js dev server on all interfaces |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run the Vitest suite |
| `npx prisma migrate deploy` | Apply database migrations |
| `npm run db:seed` | Seed the admin user from `.env` |

## Security Model

### Zero-direct-access file delivery

Book binaries are stored in `storage/books/` outside the public root. The only way to fetch a file is through the server-side proxy endpoint `GET /api/books/[id]/file`. On every request this endpoint:

1. Authenticates the session.
2. Performs a fresh `Permission` database lookup for `READER` users (`ADMIN` users bypass).
3. Resolves the server-generated `fileStorageKey` safely and streams the file only after authorization succeeds.
4. Returns `403 Forbidden` immediately if the permission has been revoked.

Storage keys and filesystem paths are never exposed to clients, and permission state is not cached in JWTs.

### Invitation workflow

Invitations use cryptographically random tokens that are SHA-256 hashed before persistence. Claiming runs in a Prisma transaction that creates the user, creates the permission, marks the invitation as claimed, and writes the audit log atomically. A token cannot be used twice.

### Audit trail

All admin uploads, grants, revocations, invitations, logins, and book access events are written to `AuditLog`.

## Known Limitations

- **Rate limiting:** The current rate limiter is an in-memory sliding window. It resets when the server process restarts. For a multi-instance production deployment, replace it with a Redis-backed store.
- **Email delivery:** Invitation emails are not sent by the backend. The admin UI displays a shareable invitation link that can be sent through an external channel.
- **Cover images:** `coverImageUrl` is a plain string; cover uploads are not implemented in the current scope.
- **Production database:** SQLite is fine for local development and testing. For production, migrate to PostgreSQL or another managed database.
- **SWC fallback:** The native Next.js SWC binary was not usable in this Windows environment, so Next.js is using the WASM compiler fallback. Builds may be slower until the native binary is reinstalled.

## License

Internal / educational use. Do not commit `.env`, `*.db`, or `storage/books/` to version control.
