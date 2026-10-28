# CEPT Helper

Browser workspace for AAST CEPT registration processing, scores, student records, lab rosters, candidate login documents, and activity reports.

## Setup

Use Node.js 22.13+ (or a current Node 24 release) and npm. Install both packages:

```powershell
npm ci
npm ci --prefix server
```

Schema updates for existing installations are additive: the backend adds the batch table and registration-detail columns before accepting requests, preserving existing student records. After updating the schema, regenerate Prisma Client with the command below and restart the backend.

Create `server/.env` from `server/.env.example` only if it does not already exist. Preserve existing environment values and database files. The SQLite URL is resolved relative to the Prisma schema (`server/prisma/schema.prisma`), so `file:./dev.db` targets `server/prisma/dev.db`, not `server/dev.db`.

For an existing database, generate the client without changing data:

```powershell
cd server
npx prisma generate
```

Only for a new, empty development database, create its tables using `npx prisma db push`. Do not reset or overwrite the existing student database.

## Run locally

From the project root, run `npm run dev:all`, or double-click `start_all.bat`. The frontend opens at http://localhost:5174; `/api` is proxied to the backend on port 3000. Both services stop with Ctrl+C. Prisma Studio is optional: run `npx prisma studio --port 5556` from `server/`.

For production, run `npm run build`, then `npm start --prefix server`. Express serves both the built website and `/api` on the same origin. If the API is hosted separately, set `VITE_API_URL` before building; configure the API origin and hosting environment appropriately.

## Sign-in and permissions

The server verifies every request using an HttpOnly session cookie. Browser-stored usernames and roles are never trusted. Sessions last eight hours and end on logout or backend restart. Password changes and deleted accounts revoke existing access; role changes take effect on the next request. Admin-only operations include accounts, student browsing, master imports, detailed logs/reports and backup/recovery. Regular staff can process daily IDs/scores and generate documents.

Production hosting must use HTTPS (`NODE_ENV=production` enables Secure cookies). For a trusted reverse proxy set `TRUST_PROXY=1`. Keep the browser and API on the same origin where possible. If using a separate origin, set `ALLOWED_ORIGINS` explicitly and keep cookie site restrictions in mind. Portal SSO requires the configured SSO_JWT_SECRET and valid exp/jti claims; no built-in fallback secret is accepted.

## Safe imports and saves

Uploads create previews only. Master files stage in batches of 500, then show how many records will be added/updated. Confirm Save all records to apply the complete file. Daily registration previews save with Save batch, creating a named database batch instead of downloading registration files. Scores still use Save records & export. Canceling before confirmation leaves the database unchanged.

Each confirmed import saves student changes, calendar flags, activity and history together or rolls all of them back. A complete safety backup is required first. Invalid rows, duplicate registrations, incomplete batches, expired previews and student changes since preview prevent saving. Previews expire after 15 minutes; staging allows up to 100,000 rows and 32 MB. Registration attempts reuse an unscored number or advance to the next numeric -R suffix when prior attempts are scored. Existing attempts and scores are preserved.

Saving records and downloading a browser file are separate operations. If a download fails after saving, retry the same preview; a confirmed commit is not applied twice. In browsers without a native save dialog, a normal download is used. Browser parsing does not depend on desktop APIs.

## Registration batches

In CEPT Data, choose Upload IDs, select the registration files, review the server-adjusted attempts, then choose Save batch. Previewing does not save. File groups, worksheet names, headers, extra columns, row order and displayed cell data are preserved in the saved batch. New attempts retain student details with no score; old attempts remain intact.

In CEPT Create, open Batches at the top right. Choose a dated batch to inspect its separate files/sheets, or download `upload.xlsx`: all refined registration numbers in one text column, no header. Names use today's Cairo date (`27-10-2026`), with `— 2`, `— 3`, etc. for additional batches on the same day. The selected exam date is recorded separately.

The original registration and all retakes share one canonical name. Official ID files confirm/correct it across the whole family; student-written names from bulk/daily score imports cannot replace it. Names for new students remain temporary until an official ID check. Student Database displays ID confirmed or Needs ID check. Existing saved batch names remain historical snapshots.

Score sheets must contain the full attempt ID, such as `123-R2`. Scores update that exact database row. The downloaded workbook removes only the trailing retake suffix (`123-R2` → `123`), keeping the full ID in the database. Original XLSX cells, formatting, formulas and other sheets are retained by the XLSX export path; XLS/CSV are converted to XLSX as before.

## Complete backups and recovery

Open People & records → Backups & recovery. Download a complete encrypted file using a passphrase of at least 12 characters. Keep the passphrase separately: the file cannot be recovered without it. Files include all accounts/password hashes, students, saved registration batches, logs, calendar operations, daily metadata and upload history.

To recover, choose a downloaded file and enter its passphrase, or select a server snapshot. Preview the replacement counts, then type RESTORE. Recovery saves an encrypted safety copy first and replaces all application records in one transaction. Everyone is signed out; use the accounts/passwords in the restored backup. The current administrator must exist in the backup to prevent lockout. A changed database requires a fresh preview.

Server snapshots are taken before confirmed imports, on logout, and on admin request. They are stored in `server/backups` or BACKUP_DIR and encrypted with `.backup-key` in that directory. Preserve the entire directory, including this private key, on separate protected storage; copied server snapshots need the original key. Passphrase-protected downloads are portable without that server key. Twenty normal snapshots are retained; before_restore safety copies are not rotated automatically. Settings in .env stay separate. The current recoverable plaintext size limit is 32 MB. Older audit-only JSON exports cannot be used for complete recovery. Earlier complete encrypted backups (versions 1 and 2) remain supported and upgrade name provenance. Version 1 has no batches and defaults the added student-detail fields; version 2 retains its batches and recovers confirmed names from their official ID snapshots. Recovery preview shows the resulting counts.

The enrollment helper still runs on the backend computer and requires an interactive desktop/manual portal login. It uses installed Edge by default on Windows; configure AUTOMATION_BROWSER_CHANNEL otherwise. Real enrollment is not part of automated tests.

## Focused checks

```powershell
npm run lint
npm run build
npm test --prefix server
```

The API integration and safety tests create temporary SQLite databases and backup folders, then remove them. They never read real student rows or contact the AAST portal. For the focused safety checks only, run `node --test server/test/safety.test.js` from the root. To add checks of the new preview/backup controls in headless Edge:

```powershell
$env:CEPT_SAFETY_BROWSER='1'
node --test server/test/safety.test.js
```

Set `TEST_BROWSER_CHANNEL` if using a different installed browser. Run the build first. Browser automation is opt-in to keep routine checks small.

For the batch-specific browser check, build first, then run:

```powershell
$env:CEPT_BATCH_BROWSER='1'
node --test server/test/batches.test.js
```

## Code navigation

Read [PROJECT_MAP.md](PROJECT_MAP.md) for architecture, workflow contracts, deferred issues, and feature ownership. [docs/CODE_INDEX.md](docs/CODE_INDEX.md) lists current endpoints and file/function locations. `archive/` retains original desktop sources and one-off migration scripts for reference; it is outside the active runtime and lint scope.

## Vercel + Neon production

Vercel serves the Vite build and forwards /api to api/index.js. The deployment build generates the PostgreSQL Prisma client and applies checked-in migrations from server/prisma/postgresql.prisma. Node 22 is pinned. Keep DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct) in Vercel environment variables. BACKUP_ENCRYPTION_KEY must be a stable random 32-byte key encoded as 64 hex characters; keep it private and backed up. Set NODE_ENV=production and TRUST_PROXY=1. Neon integration supplies the database URLs.

Production sessions, import staging/previews/receipts, single-writer leases and SSO replay markers use RuntimeState in PostgreSQL. Encrypted server backups use ServerBackup, retaining 20 normal snapshots plus restore safety copies. These replace local memory/disk on hosted PostgreSQL. Local SQLite and its additive upgrades remain available for existing offline installs and isolated tests; they are never deployed. Only user accounts are migrated for the initial hosted launch; students/batches/activity start empty. scripts/migrate-accounts.mjs refuses to overwrite a populated destination.

The interactive portal-enrollment helper needs a local browser for manual sign-in and remains local-only. Hosted sheet processing, document generation, accounts and records work through the web app. Vercel request/response size limits also apply; split unusually large sheets into smaller files if the platform rejects a request. Configure any portal SSO secret separately using the portal's real shared secret.

Never push .env files, local databases, backups, account exports or archived desktop code. Preview deployments must use a separate Neon branch/database before testing with data.
