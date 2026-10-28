# Official names and retake families — 2026-10-28

The original registration (123) is the name anchor for 123-R1, 123-R2 and every other attempt in that exact family. An official checked-ID file can correct the name; committing it updates the original and all retakes together, without altering their scores. Score names are never a basis for identifying/merging students.

## Sources

- Official ID file: authoritative. Whitespace is normalized, supplied spelling/case is preserved, and the whole family is marked nameVerified.
- Bulk master/results import: updates scores and values without replacing existing names. New identities get provisional names; a verified family name takes precedence for new retakes.
- Daily score import: matches the complete attempt ID and updates results only. Student-entered names in that sheet are ignored for database naming; downloaded score sheets remain otherwise unchanged.
- Conflicting official names for the same family in one upload: reject the preview for review rather than choosing silently.

The canonical full name is stored in Student.name and displayed/searched in Student Database alongside ID confirmed / Needs ID check. All siblings also share consistent firstName/lastName fields. When an existing split agrees with the official full name, its boundary is retained and casing follows the official file. Otherwise no split is guessed: the full name is retained in the legacy lastName column and firstName is empty.

## Existing data and recovery

The startup upgrade adds nameVerified and unifies existing families in a transaction. Historical checked-ID batches provide authoritative evidence when their family name is unambiguous. Families without official evidence use the original row's existing name provisionally. If the original row is absent, the policy uses known family evidence without inserting an artificial unscored base attempt.

Saved batch snapshots are historical and are not rewritten when a name is corrected later. Current database records and future batches use the newly confirmed name.

Backup payload version 3 includes provenance. Earlier complete backups remain readable and recover official names from their saved batches before family normalization. Current backups also enforce family consistency when restored. Retake numbers, individual scores and result values are not changed by name synchronization.

## Focused verification

Temporary-database checks cover original/retake aliases, master imports with misleading names, new provisional identities, authoritative corrections, all-attempt propagation, exact family boundaries (123 versus 1234), zero changes to prior scores, future retakes inheriting confirmed names, ignored daily-score names, conflicting official uploads, canonical-name searching, backup recovery and historical provenance migration. Existing batch and safety regression tests also passed. The real database is not used by the tests; restart the backend to apply its additive schema/name upgrade.

Validation completed: active-source lint and production build passed. Name-policy, batch and safety suites passed (13 reported checks), and the final focused name-policy suite passed again after recovery normalization was tightened. Temporary databases were cleaned up. No live student import or recovery was performed.
