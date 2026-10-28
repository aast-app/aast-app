# Access, import and recovery changes — 2026-10-27

Implemented the user's selected areas 1, 3 and 4. Retake rules, report definitions and a full exam-day walkthrough remain deferred.

- Identity is server-verified, cookie-backed and checked against the current account/role on every protected request. UI tampering and supplied administrator names do not grant access. Password/deletion revocation, CSRF request/origin checks, login throttling and signed one-use SSO are covered by focused tests.
- Uploads are temporary, session-owned previews. Incomplete or invalid files do not save. Confirmation applies all changes, history and calendar/activity updates in one transaction after a complete safety snapshot. Stale previews are rejected and successful retries are idempotent during the draft lifetime.
- Complete encrypted backups cover all six data models and protected password hashes. Recovery validates/decrypts the file, previews counts, requires explicit confirmation, preserves a safety snapshot, rejects intervening changes and replaces data atomically. Sessions are revoked after recovery.
- Backups & recovery is available in the admin screen. Detailed setup, retention, key/passphrase handling and size limits are in README.md.

Checks use freshly created temporary databases and block external browser requests. Real student data, live portal enrollment, existing .env files and existing databases are not modified. No schema migration is needed. Sessions/previews are held in a single backend process; restarting it signs users out and discards uncommitted previews.

## Verification completed

- Active-source lint and production build passed.
- The focused API safety test passed permission/identity spoofing, origin/header rejection, deletion/password revocation, role refresh, one-use signed SSO, staged/canceled imports, invalid-row rejection, transaction rollback, stale-preview rejection and retry idempotency.
- Complete recovery was verified against a temporary database: all six model collections, password hashes, IDs, dates, flags and metadata were preserved; a recovery audit entry and encrypted safety copy were created. Wrong passphrases, damaged files, invalid data, missing confirmation and intervening writes were rejected. Existing sessions were invalidated.
- The updated API regression fixture also passed after write serialization was tightened.
- An opt-in headless Edge check passed with external requests blocked: a forged browser identity did not grant access, a master preview could be discarded without saving, an encrypted backup downloaded, and recovery required the typed confirmation. No real UI recovery was performed; replacement was tested against the temporary API fixture.
- No full exam-day walkthrough, live portal enrollment or live portal SSO was performed. Retake/report business rules were not changed.

A temporary automatic-approval usage-limit failure delayed one local check; the same approved command later ran successfully. No verification remains blocked.
