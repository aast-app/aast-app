# Browser migration validation — 2026-10-27

- Active-source ESLint: passed, no warnings/errors.
- Production Vite build: passed. Spreadsheet/PDF library chunks still trigger a bundle-size advisory.
- Isolated Node tests: 2 passed. The API integration covers password login, user create/edit/delete, calendar overrides, logging, imports, scores, student search, next-registration export, dashboard data, manual JSON export, server-side audit export, and production HTML serving.
- Opt-in headless Edge check: passed within the same temporary fixture. Checked browser login, navigation, candidate PDF preview, candidate login PDF ZIP download, and roster XLSX/PDF ZIP download, with no uncaught page errors. External network requests were blocked.
- Static API comparison: every literal frontend request URL has a registered backend endpoint.
- Frontend/backend package manifests agree with their lockfiles.

Real databases and existing environment values were untouched. Temporary test databases, backups, downloads, browser, and HTTP server were cleaned up. Existing user changes were preserved; no commit was created.

Live portal SSO and real enrollment were not exercised. The enrollment helper still requires an interactive desktop on the backend computer. Auth/session redesign, retake rule unification, import transaction redesign, full backup recovery, and analytics semantics remain deferred.

The installed Node version was 22.12.0; checks passed, but Node 22.13+ is declared/documented to satisfy the existing ESLint 10 dependency requirements. Old desktop sources are preserved in archive/ and excluded from runtime/lint.
