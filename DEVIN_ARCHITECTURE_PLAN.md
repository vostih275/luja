# Luja — Secure Book-Sharing & Access-Control Application
## Architecture Plan (Phase 1 Deliverable)

---

## 1. Discovered Stack

**Repository state:** Empty workspace (`C:\Users\carol\desktop\Luja`). No existing code, package
manager config, or conventions. Available toolchain: Node.js v22.18.0, npm 10.9.3, Python 3.9.13,
Git on Windows. This is a **greenfield build** — the stack below is chosen for this assignment.

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React + TypeScript** | Single codebase for UI + API route handlers; conventional production baseline |
| Backend API | **Next.js Route Handlers** (`app/api/**`, Node.js runtime) | Server-enforced authz on every request; no direct file exposure |
| Database | **SQLite via Prisma ORM** | Zero external service dependency; real migrations; easy isolated test DB per run |
| Auth | **Email + password**, `bcryptjs` hashing, **JWT session in HTTP-only cookie** (`jose`) | Stateless sessions; bcryptjs avoids native builds on Windows |
| File storage | **Private server directory** (`STORAGE_DIR`, default `./storage/books`) — never under `public/` | Files only reachable through an authorized proxy stream endpoint |
| Validation | `zod` schemas on all inputs | Type-safe input validation |
| Rate limiting | Custom in-memory sliding-window limiter | Auth + file-access throttling without external infra |
| Styling | Tailwind CSS v4 | Fast, clean dashboard UI |
| Tests | **Vitest** (node env), invoking route handlers directly against a throwaway SQLite DB | True integration coverage of authz rules |

**Windows-safety notes:** no native modules (`bcryptjs` not `bcrypt`, no `sharp`); Prisma ships
prebuilt engines; all file paths resolved via `path.resolve` + containment checks.

---

## 2. Database Schema (Prisma → SQLite)

```prisma
enum Role { ADMIN  READER }

model User {
  id           String   @id @default(cuid())
  email        String   @unique              // normalized: trim + lowercase, unique index
  passwordHash String
  role         Role     @default(READER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  permissions  Permission[]
  // relations to AuditLog as adminId / targetUserId
}

model Book {
  id              String    @id @default(cuid())
  title           String
  author          String
  description     String
  coverImageKey   String?   // private storage key — never a public URL
  fileStorageKey  String    // private storage key — never a public URL
  fileMimeType    String
  fileSizeBytes   Int
  publicationDate DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  permissions     Permission[]
  invitations     Invitation[]
}

model Permission {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  grantedBy String?            // admin user id
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  @@unique([userId, bookId])   // prevents duplicate grants
  @@index([userId])            // "my library" lookup
  @@index([bookId])            // "who has access" lookup
}

model Invitation {
  id        String    @id @default(cuid())
  email     String                        // normalized; indexed
  bookId    String
  tokenHash String    @unique             // SHA-256 of bearer token — raw token never stored
  expiresAt DateTime                      // default now + 7 days
  claimedAt DateTime?                     // set on claim → single-use enforcement
  createdBy String?                       // admin id
  createdAt DateTime  @default(now())
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
  @@index([email])
  @@index([bookId])
}

model AuditLog {
  id           String   @id @default(cuid())
  actionType   String                     // BOOK_CREATE|BOOK_UPDATE|BOOK_DELETE|ACCESS_GRANT|
                                          // ACCESS_REVOKE|INVITE_CREATE|INVITE_CLAIM|AUTH_LOGIN_FAIL
  adminId      String?
  targetUserId String?
  targetBookId String?
  ipAddress    String?
  metadata     String?                    // JSON blob (e.g. invite email, filename)
  createdAt    DateTime @default(now())
  @@index([createdAt])
  @@index([adminId])
  @@index([targetBookId])
}
```

**Key design decisions**
- `Book.fileStorageKey` / `coverImageKey` are server-generated UUID keys. Clients **never** see or
  supply them — no client-controllable path exists, killing IDOR/path-traversal at the model layer.
- `Invitation.tokenHash` stores only `SHA-256(token)`; the raw 256-bit token goes only into the
  invite link. Token theft from a DB leak yields nothing usable.
- `Permission @@unique([userId, bookId])` makes re-grants idempotent.
- Cascade deletes keep permissions/invitations consistent with users and books.

**Seeding:** `prisma/seed.ts` creates the bootstrap `ADMIN` user from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` env vars. Readers are only ever created via the invitation-claim flow — there is
no open registration.

---

## 3. Security Strategy

### 3.1 Authentication & sessions
- Login: `POST /api/auth/login` → bcrypt compare → issue HS256 JWT (`jose`) in cookie
  `luja_session` — `httpOnly`, `sameSite=lax`, `secure` in production, 7-day expiry, `path=/`.
- `middleware.ts` gates page routes: `/admin/**` requires role `ADMIN`; `/library` requires any
  valid session; unauthenticated users redirect to `/login`.
- Every API handler independently re-verifies the session server-side via `requireAuth()` /
  `requireAdmin()` helpers — middleware is a UX gate, not the security boundary.

### 3.2 Authorization (the critical layer)
- **Fresh DB permission check on every request.** `GET /api/books`, `GET /api/books/[id]`,
  `GET /api/books/[id]/file`, `GET /api/books/[id]/cover` all query `Permission` per request —
  revocation takes effect immediately (no caching, no token-embedded permission lists).
- Unauthorized access returns **403 with a clear JSON error**, unauthenticated returns **401**.
- No endpoint accepts a storage key, path, or filename from the client.

### 3.3 Secure file delivery — authorized proxy stream
Chosen over signed URLs because local private storage (not S3) is the deployment target.

```
GET /api/books/[id]/file
  1. verify session cookie → user
  2. rate-limit check (per IP+user)
  3. SELECT Permission WHERE userId=? AND bookId=?  → 403 if absent
  4. resolve STORAGE_DIR/<fileStorageKey>, verify resolved path is inside STORAGE_DIR
  5. fs.createReadStream → stream response with real Content-Type + Content-Disposition
```
- Files live **outside `public/`** — Next.js will never serve them statically. The only route to
  bytes is the permission-checked proxy.
- Cover images get the same treatment (`/api/books/[id]/cover`) so the library UI can render
  covers without exposing storage.
- Audit-log `ACCESS_*` events record adminId, target ids, and request IP.

### 3.4 Upload hardening
- `multipart/form-data` parsing server-side; filename discarded, storage key =
  `crypto.randomUUID()`.
- MIME allowlist enforced by **magic-byte sniffing**, not the client header:
  `application/pdf` (`%PDF-`), `application/epub+zip` (ZIP `PK\x03\x04`); covers: PNG/JPEG/WebP.
- Size cap (e.g. 50 MB books / 5 MB covers); rejects before write.

### 3.5 Rate limiting & misc hardening
- In-memory sliding-window limiter: `/api/auth/login` (5/min/IP), `/api/invitations/claim`
  (10/min/IP), `/api/books/*/file` (30/min/user). Documented single-process limitation.
- `zod` validation on every body/query; emails normalized (trim + lowercase) before lookup.
- Security headers via `next.config`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`.
- Invitation tokens: `crypto.randomBytes(32)` hex, 7-day TTL, single-use (`claimedAt` set inside
  the same transaction that creates the user + permission).
- Email is **simulated**: `lib/email.ts` logs the invite link server-side (and exposes it in the
  admin UI for the demo). Swappable for a real provider via env config later.

---

## 4. API Surface

| Route | Role | Purpose |
|---|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | any | session lifecycle |
| `GET /api/books` | reader | my library (permitted books only) |
| `GET /api/books/[id]` | reader | book metadata — 403 without permission |
| `GET /api/books/[id]/file` · `/cover` | reader | authorized stream — 403 without permission |
| `GET/POST /api/admin/books` · `PATCH/DELETE /api/admin/books/[id]` | admin | book CRUD + file/cover upload |
| `GET /api/admin/users` | admin | list readers + their permissions |
| `POST /api/admin/access` `{email, bookId}` | admin | grant → existing user gets `Permission`, else `Invitation` + logged link |
| `DELETE /api/admin/permissions/[id]` | admin | revoke — effective immediately |
| `GET /api/admin/invitations` · `DELETE /api/admin/invitations/[id]` | admin | list/revoke pending invites |
| `GET /api/admin/audit-logs` | admin | audit trail |
| `GET /api/invitations/[token]` | public | validate token → {email, book title} |
| `POST /api/invitations/claim` `{token, password}` | public | create user + permission + consume token (one transaction) |

**Pages:** `/login`, `/invite/[token]`, `/library`, `/admin` (books, upload, access management,
readers, invitations, audit log). Reader states: loading / error / empty / 403 handled explicitly.

---

## 5. Implementation Phases Checklist

- [x] **Phase 1** — Discovery & this plan
- [ ] **Phase 2** — Scaffold Next.js app; Prisma schema + migration; seed admin
- [ ] **Phase 3** — Auth (login/logout/me, session helpers, middleware); rate limiter; private
      storage layer + authorized stream endpoints
- [ ] **Phase 4** — Admin APIs + dashboard UI; grant/revoke; invitation workflow; audit logging
- [ ] **Phase 5** — Reader library UI; file/cover viewing; loading/error/empty/403 states
- [ ] **Phase 6** — Vitest suite: cross-reader access denied, unauthenticated file access denied,
      revoke→immediate 403, invite token single-use, admin-route denial for readers; run lint +
      typecheck + tests, fix all failures
- [ ] **Phase 7** — `.env.example`, run instructions in README, security review, known-limitations
      writeup

### Planned file layout
```
app/                     # pages: login, invite/[token], library, admin
app/api/**               # route handlers per table above
lib/auth.ts              # session sign/verify, requireAuth/requireAdmin
lib/permissions.ts       # canAccessBook(userId, bookId)
lib/rateLimit.ts         # sliding-window limiter
lib/storage.ts           # safe private-dir read/write, magic-byte MIME sniff
lib/email.ts             # simulated invite email (logs link)
lib/audit.ts             # audit log writer
prisma/schema.prisma, prisma/seed.ts
tests/                   # vitest integration tests
.env.example
```
