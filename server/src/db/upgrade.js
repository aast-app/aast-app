import { namesFromSavedBatches, synchronizeStudentNames } from '../services/studentNames.js';

// Additive SQLite upgrade only: no table resets, renames, or record deletions.
// Existing installations are upgraded before the HTTP server begins accepting work.
export async function ensureBatchSchema(db) {
  await db.$transaction(async tx => {
    const columns = await tx.$queryRawUnsafe('PRAGMA table_info("Student")');
    if (!columns.length) throw new Error('Student table not found. Check DATABASE_URL or initialize a new empty database with Prisma.');
    for (const name of ['name', 'email', 'mobile', 'examDate', 'examTime', 'registrationData']) {
      if (!columns.some(column => column.name === name)) {
        const fallback = name === 'registrationData' ? '{}' : '';
        await tx.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN "${name}" TEXT NOT NULL DEFAULT '${fallback}'`);
      }
    }
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "RegistrationBatch" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL, "date" TEXT NOT NULL, "sequence" INTEGER NOT NULL,
      "testDate" TEXT NOT NULL, "createdBy" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "studentCount" INTEGER NOT NULL, "fileCount" INTEGER NOT NULL, "files" TEXT NOT NULL
    )`);
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationBatch_name_key" ON "RegistrationBatch"("name")');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationBatch_date_sequence_key" ON "RegistrationBatch"("date", "sequence")');
    const addedNameFlag = !columns.some(column => column.name === 'nameVerified');
    if (addedNameFlag) await tx.$executeRawUnsafe('ALTER TABLE "Student" ADD COLUMN "nameVerified" BOOLEAN NOT NULL DEFAULT false');
    const officialNames = addedNameFlag ? namesFromSavedBatches(await tx.registrationBatch.findMany({ orderBy: { id: 'asc' } })) : new Map();
    await synchronizeStudentNames(tx, officialNames);
  }, { timeout: 120000, maxWait: 10000 });
}
