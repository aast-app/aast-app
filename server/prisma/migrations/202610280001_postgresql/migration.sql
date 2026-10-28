-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "email" TEXT,
    "avatarUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOperation" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "idsUploaded" BOOLEAN NOT NULL DEFAULT false,
    "scoresUploaded" BOOLEAN NOT NULL DEFAULT false,
    "idsNotNeeded" BOOLEAN NOT NULL DEFAULT false,
    "scoresNotNeeded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetaData" (
    "id" SERIAL NOT NULL,
    "activityDate" TEXT NOT NULL,
    "ceptData" TEXT NOT NULL DEFAULT '[]',
    "ceptCreate" TEXT NOT NULL DEFAULT '{"tablesGenerated":0,"loginPdfsGenerated":0,"contributors":[]}',

    CONSTRAINT "DailyMetaData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "nameVerified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "examDate" TEXT NOT NULL DEFAULT '',
    "examTime" TEXT NOT NULL DEFAULT '',
    "registrationData" TEXT NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION,
    "value" TEXT,
    "idsNotNeeded" BOOLEAN NOT NULL DEFAULT false,
    "scoresNotNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadHistory" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationBatch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "testDate" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentCount" INTEGER NOT NULL,
    "fileCount" INTEGER NOT NULL,
    "files" TEXT NOT NULL,

    CONSTRAINT "RegistrationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuntimeState" (
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuntimeState_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ServerBackup" (
    "fileName" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "safety" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerBackup_pkey" PRIMARY KEY ("fileName")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DailyOperation_date_key" ON "DailyOperation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetaData_activityDate_key" ON "DailyMetaData"("activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "Student_registrationNumber_key" ON "Student"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationBatch_name_key" ON "RegistrationBatch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationBatch_date_sequence_key" ON "RegistrationBatch"("date", "sequence");

-- CreateIndex
CREATE INDEX "RuntimeState_namespace_expiresAt_idx" ON "RuntimeState"("namespace", "expiresAt");
