# Registration batches and exact scores

Implemented 2026-10-27 from the agreed workflow.

## Registration

CEPT Data → Upload IDs → select files → review all adjusted IDs and data → Save batch. Preview is temporary; save atomically creates the dated RegistrationBatch, adds/reuses unscored student attempts, and updates daily activity. There is no registration Excel/ZIP download in this step.

The server checks exact registration families. An unscored requested attempt is reused; otherwise the most recent unscored family attempt is reused. If every prior attempt is scored, the next numeric suffix is allocated. Score 0 is scored. Existing scored rows are never renamed or cleared. New attempts copy profile/registration details and start with score/value null.

Batch snapshots retain separate source files, worksheet names, headers, displayed cell values, row order, auxiliary worksheets, and original/refined registration numbers. Extra registration fields are also retained in the main student's registrationData JSON. Creating multiple batches on one Cairo date gives distinct names. The test/exam date remains a separate field.

## CEPT Create

The top-right Batches button opens a keyboard-accessible modal. All dated batches are available through pagination. Selecting one shows creator, creation/exam dates, student/file counts and the grouped sheet data. Rows paginate for large files.

Download upload.xlsx returns precisely one text column of the batch's refined IDs, without a header, preserving original file/student order and leading zeros. It does not strip retake suffixes.

## Scores

Full uploaded IDs match the main database exactly. A score for 123-R2 never falls back to 123, 123-R1 or 123-R20. The preview lists unknown IDs. Confirming saves matched scores atomically, then downloads the cleaned Excel as before. Only the exported trailing -R<number> suffix is removed. Main records and batch snapshots keep their full IDs.

XLSX score output uses the original workbook with only affected registration cell values changed; other cell values, styles, formulas and worksheets are preserved. XLS/CSV continue through the existing XLSX conversion.

## Installation and backups

The generated Prisma client has been updated. connectDB runs a transactional, idempotent additive upgrade before starting HTTP: six defaulted Student columns plus RegistrationBatch and its indexes. No existing tables or student rows are reset. Tests verify upgrading an old table twice preserves its record and score.

Complete backups now include batches and added student data (payload version 2). Previous version-1 complete backups remain readable, defaulting added fields and restoring an empty batch collection. Recovery preview shows those counts before confirmation. No real database reset or real recovery was performed during tests.

## Validation

Focused tests cover ten students (five retakes/five new), numeric suffixes including R10 → R11, unscored reuse, zero-score handling, grouped data/extra worksheets, copied profile fields, atomic rollback, retry idempotency, exact-score matching, text-only headerless upload.xlsx, score-workbook styles/formulas, batch backup/restore, legacy-backup compatibility, and additive schema upgrades. The optional browser check exercises the actual save-without-download flow and CEPT Create batch modal/download, including a narrow viewport and Escape dismissal.

Completed checks: active-source lint passed; production build passed; batch, safety and API regression tests passed (10 reported checks). The batch suite also passed with CEPT_BATCH_BROWSER=1: two-file registration preview/save, no registration download, batch browsing, grouped detail display, headerless upload.xlsx, narrow viewport and Escape close. All test databases and downloads were temporary and cleaned up. Every literal frontend API URL has a registered endpoint. The Prisma client was regenerated; restart an already-running backend to load the updated client and apply the additive upgrade before serving requests.
