# CEPT working context

Read `PROJECT_MAP.md` first for project orientation; use `docs/CODE_INDEX.md` for exact API and function locations. These describe the local working tree as reviewed on 2026-10-27.

- The active application is React/Vite plus Express/Prisma/SQLite. `archive/` is historical reference and must stay outside active imports.
- README.md describes current browser setup; docs/INITIAL_REVIEW.md is a historical snapshot.
- Existing modified, deleted, and untracked files predate the navigation documentation. Preserve this work.
- Database files and environment values may contain private data. Do not copy records or secrets into documentation. Determine the actual DATABASE_URL before operating on either SQLite file.
- Keep the navigation documents current when changing architecture, routes, file contracts, or feature ownership. Verify relevant source rather than assuming the snapshot is still accurate.
