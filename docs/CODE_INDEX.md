# CEPT code index

Generated from active source. Recheck line numbers after edits. See ../PROJECT_MAP.md.

## API registrations

| File | Line | Endpoint |
| --- | --- | --- |
| `server/src/app.js` | 35 | `/api/health` |
| `server/src/app.js` | 40 | `/api/test` |
| `server/src/app.js` | 68 | `/api/*` |
| `server/src/controllers/adminHandlers.js` | 8 | `/api/admin-list-backups` |
| `server/src/controllers/adminHandlers.js` | 9 | `/api/admin-preview-backup` |
| `server/src/controllers/adminHandlers.js` | 10 | `/api/admin-restore-backup` |
| `server/src/controllers/adminHandlers.js` | 12 | `/api/admin-get-users` |
| `server/src/controllers/adminHandlers.js` | 32 | `/api/admin-create-user` |
| `server/src/controllers/adminHandlers.js` | 74 | `/api/admin-edit-user` |
| `server/src/controllers/adminHandlers.js` | 137 | `/api/admin-delete-user` |
| `server/src/controllers/adminHandlers.js` | 175 | `/api/admin-get-log-filters` |
| `server/src/controllers/adminHandlers.js` | 201 | `/api/admin-get-logs` |
| `server/src/controllers/adminHandlers.js` | 258 | `/api/get-dashboard-stats` |
| `server/src/controllers/adminHandlers.js` | 302 | `/api/get-dashboard-details` |
| `server/src/controllers/adminHandlers.js` | 358 | `/api/get-dashboard-filters` |
| `server/src/controllers/adminHandlers.js` | 403 | `/api/admin-export-db` |
| `server/src/controllers/authHandlers.js` | 14 | `/api/auth-session` |
| `server/src/controllers/authHandlers.js` | 15 | `/api/auth-logout` |
| `server/src/controllers/authHandlers.js` | 21 | `/api/auth-login` |
| `server/src/controllers/authHandlers.js` | 44 | `/api/auth-sso-login` |
| `server/src/controllers/dataHandlers.js` | 11 | `/api/get-week-operations` |
| `server/src/controllers/dataHandlers.js` | 21 | `/api/toggle-not-needed` |
| `server/src/controllers/dataHandlers.js` | 35 | `/api/log-frontend-action` |
| `server/src/controllers/playwrightHandlers.js` | 7 | `/api/test-automation` |
| `server/src/routes/batchRoutes.js` | 15 | `/api/list-batches` |
| `server/src/routes/batchRoutes.js` | 23 | `/api/get-batch` |
| `server/src/routes/batchRoutes.js` | 24 | `/api/batch-upload` |
| `server/src/routes/ceptCreateRoutes.js` | 28 | `/api/log-cept-table` |
| `server/src/routes/ceptCreateRoutes.js` | 29 | `/api/log-login-pdfs` |
| `server/src/routes/studentRoutes.js` | 8 | `/api/login-student-details` |
| `server/src/routes/studentRoutes.js` | 28 | `/api/admin-get-students` |
| `server/src/routes/studentRoutes.js` | 117 | `/api/admin-next-registration-numbers` |
| `server/src/routes/uploadRoutes.js` | 9 | `/api/upload-master-data` |
| `server/src/routes/uploadRoutes.js` | 17 | `/api/upload-master-data-chunk` |
| `server/src/routes/uploadRoutes.js` | 18 | `/api/preview-ids` |
| `server/src/routes/uploadRoutes.js` | 19 | `/api/preview-scores` |
| `server/src/routes/uploadRoutes.js` | 20 | `/api/commit-import` |
| `server/src/routes/uploadRoutes.js` | 21 | `/api/discard-import` |
| `server/src/routes/uploadRoutes.js` | 22 | `/api/check-ids` |

## Function entry points

| File | Line | Function |
| --- | --- | --- |
| `scripts/dev.mjs` | 9 | `stop` |
| `server/src/controllers/adminHandlers.js` | 7 | `registerAdminHandlers` |
| `server/src/controllers/authHandlers.js` | 12 | `registerAuthHandlers` |
| `server/src/controllers/dataHandlers.js` | 5 | `defaultOperation` |
| `server/src/controllers/dataHandlers.js` | 10 | `registerDataHandlers` |
| `server/src/controllers/index.js` | 7 | `createActionRouter` |
| `server/src/controllers/playwrightHandlers.js` | 6 | `registerPlaywrightHandlers` |
| `server/src/db/connect.js` | 8 | `connectDB` |
| `server/src/db/upgrade.js` | 5 | `ensureBatchSchema` |
| `server/src/generated/postgresql/index-browser.js` | 29 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 34 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 39 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 44 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 49 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 54 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 64 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 69 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 74 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 79 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 89 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 94 | `runtimeName` |
| `server/src/generated/postgresql/index-browser.js` | 254 | `runtime` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 1 | `a` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 2 | `nu` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 3 | `Tr` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 4 | `cu` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 5 | `pt` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 6 | `Fe` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 8 | `ws` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 11 | `L` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 12 | `Qe` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 13 | `Et` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 20 | `Yn` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 25 | `t` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 29 | `na` |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 30 | `ia` |
| `server/src/generated/postgresql/runtime/edge.js` | 1 | `a` |
| `server/src/generated/postgresql/runtime/edge.js` | 2 | `pu` |
| `server/src/generated/postgresql/runtime/edge.js` | 3 | `Ar` |
| `server/src/generated/postgresql/runtime/edge.js` | 4 | `wu` |
| `server/src/generated/postgresql/runtime/edge.js` | 5 | `dt` |
| `server/src/generated/postgresql/runtime/edge.js` | 6 | `Fe` |
| `server/src/generated/postgresql/runtime/edge.js` | 8 | `vs` |
| `server/src/generated/postgresql/runtime/edge.js` | 11 | `L` |
| `server/src/generated/postgresql/runtime/edge.js` | 12 | `Qe` |
| `server/src/generated/postgresql/runtime/edge.js` | 13 | `Hr` |
| `server/src/generated/postgresql/runtime/edge.js` | 20 | `ti` |
| `server/src/generated/postgresql/runtime/edge.js` | 25 | `t` |
| `server/src/generated/postgresql/runtime/edge.js` | 29 | `la` |
| `server/src/generated/postgresql/runtime/edge.js` | 30 | `ua` |
| `server/src/generated/postgresql/runtime/index-browser.js` | 1 | `Ce` |
| `server/src/generated/postgresql/runtime/library.js` | 1 | `ei` |
| `server/src/generated/postgresql/runtime/library.js` | 3 | `ci` |
| `server/src/generated/postgresql/runtime/library.js` | 4 | `Ao` |
| `server/src/generated/postgresql/runtime/library.js` | 5 | `Lu` |
| `server/src/generated/postgresql/runtime/library.js` | 6 | `Bu` |
| `server/src/generated/postgresql/runtime/library.js` | 9 | `rs` |
| `server/src/generated/postgresql/runtime/library.js` | 10 | `sc` |
| `server/src/generated/postgresql/runtime/library.js` | 18 | `ns` |
| `server/src/generated/postgresql/runtime/library.js` | 20 | `cc` |
| `server/src/generated/postgresql/runtime/library.js` | 21 | `dc` |
| `server/src/generated/postgresql/runtime/library.js` | 25 | `Ep` |
| `server/src/generated/postgresql/runtime/library.js` | 26 | `Tp` |
| `server/src/generated/postgresql/runtime/library.js` | 27 | `pn` |
| `server/src/generated/postgresql/runtime/library.js` | 28 | `kp` |
| `server/src/generated/postgresql/runtime/library.js` | 29 | `Ot` |
| `server/src/generated/postgresql/runtime/library.js` | 30 | `ya` |
| `server/src/generated/postgresql/runtime/library.js` | 31 | `yd` |
| `server/src/generated/postgresql/runtime/library.js` | 33 | `Ua` |
| `server/src/generated/postgresql/runtime/library.js` | 35 | `Kd` |
| `server/src/generated/postgresql/runtime/library.js` | 37 | `Qa` |
| `server/src/generated/postgresql/runtime/library.js` | 42 | `kn` |
| `server/src/generated/postgresql/runtime/library.js` | 43 | `Dn` |
| `server/src/generated/postgresql/runtime/library.js` | 45 | `Ja` |
| `server/src/generated/postgresql/runtime/library.js` | 52 | `Wa` |
| `server/src/generated/postgresql/runtime/library.js` | 57 | `Ha` |
| `server/src/generated/postgresql/runtime/library.js` | 64 | `za` |
| `server/src/generated/postgresql/runtime/library.js` | 66 | `tl` |
| `server/src/generated/postgresql/runtime/library.js` | 110 | `Nt` |
| `server/src/generated/postgresql/runtime/library.js` | 111 | `ct` |
| `server/src/generated/postgresql/runtime/library.js` | 113 | `hm` |
| `server/src/generated/postgresql/runtime/library.js` | 114 | `Fn` |
| `server/src/generated/postgresql/runtime/library.js` | 121 | `po` |
| `server/src/generated/postgresql/runtime/library.js` | 126 | `t` |
| `server/src/generated/postgresql/runtime/library.js` | 130 | `Ql` |
| `server/src/generated/postgresql/runtime/library.js` | 131 | `Jl` |
| `server/src/generated/postgresql/runtime/react-native.js` | 1 | `a` |
| `server/src/generated/postgresql/runtime/react-native.js` | 2 | `Ai` |
| `server/src/generated/postgresql/runtime/react-native.js` | 6 | `vu` |
| `server/src/generated/postgresql/runtime/react-native.js` | 7 | `Ru` |
| `server/src/generated/postgresql/runtime/react-native.js` | 8 | `br` |
| `server/src/generated/postgresql/runtime/react-native.js` | 9 | `_u` |
| `server/src/generated/postgresql/runtime/react-native.js` | 10 | `gt` |
| `server/src/generated/postgresql/runtime/react-native.js` | 11 | `Qo` |
| `server/src/generated/postgresql/runtime/react-native.js` | 12 | `xc` |
| `server/src/generated/postgresql/runtime/react-native.js` | 14 | `hs` |
| `server/src/generated/postgresql/runtime/react-native.js` | 16 | `vs` |
| `server/src/generated/postgresql/runtime/react-native.js` | 60 | `Br` |
| `server/src/generated/postgresql/runtime/react-native.js` | 61 | `rp` |
| `server/src/generated/postgresql/runtime/react-native.js` | 62 | `jr` |
| `server/src/generated/postgresql/runtime/react-native.js` | 69 | `Jn` |
| `server/src/generated/postgresql/runtime/react-native.js` | 74 | `t` |
| `server/src/generated/postgresql/runtime/react-native.js` | 78 | `ta` |
| `server/src/generated/postgresql/runtime/react-native.js` | 79 | `ra` |
| `server/src/generated/postgresql/runtime/wasm.js` | 1 | `gr` |
| `server/src/generated/postgresql/runtime/wasm.js` | 2 | `Rs` |
| `server/src/generated/postgresql/runtime/wasm.js` | 3 | `Ms` |
| `server/src/generated/postgresql/runtime/wasm.js` | 4 | `Ls` |
| `server/src/generated/postgresql/runtime/wasm.js` | 5 | `Ye` |
| `server/src/generated/postgresql/runtime/wasm.js` | 6 | `Te` |
| `server/src/generated/postgresql/runtime/wasm.js` | 8 | `Yi` |
| `server/src/generated/postgresql/runtime/wasm.js` | 11 | `Zi` |
| `server/src/generated/postgresql/runtime/wasm.js` | 12 | `ja` |
| `server/src/generated/postgresql/runtime/wasm.js` | 14 | `ur` |
| `server/src/generated/postgresql/runtime/wasm.js` | 21 | `Xr` |
| `server/src/generated/postgresql/runtime/wasm.js` | 26 | `t` |
| `server/src/generated/postgresql/runtime/wasm.js` | 30 | `Mo` |
| `server/src/generated/postgresql/runtime/wasm.js` | 31 | `Io` |
| `server/src/generated/postgresql/wasm.js` | 29 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 34 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 39 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 44 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 49 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 54 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 64 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 69 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 74 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 79 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 89 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 94 | `runtimeName` |
| `server/src/generated/postgresql/wasm.js` | 254 | `runtime` |
| `server/src/middlewares/session.js` | 10 | `cookieOptions` |
| `server/src/middlewares/session.js` | 11 | `tokenFrom` |
| `server/src/middlewares/session.js` | 15 | `endSession` |
| `server/src/middlewares/session.js` | 20 | `clearSessions` |
| `server/src/middlewares/session.js` | 21 | `startSession` |
| `server/src/middlewares/session.js` | 28 | `allowedOrigin` |
| `server/src/middlewares/session.js` | 33 | `protectApi` |
| `server/src/middlewares/writeGate.js` | 8 | `cloudGate` |
| `server/src/middlewares/writeGate.js` | 29 | `writeGate` |
| `server/src/routes/actions.js` | 2 | `registerAction` |
| `server/src/routes/batchRoutes.js` | 6 | `id` |
| `server/src/routes/batchRoutes.js` | 10 | `getBatch` |
| `server/src/routes/ceptCreateRoutes.js` | 5 | `count` |
| `server/src/routes/ceptCreateRoutes.js` | 9 | `recordCreation` |
| `server/src/services/backup.js` | 16 | `snapshot` |
| `server/src/services/backup.js` | 21 | `buildBackup` |
| `server/src/services/backup.js` | 25 | `serverKey` |
| `server/src/services/backup.js` | 38 | `passwordKey` |
| `server/src/services/backup.js` | 42 | `encryptBackup` |
| `server/src/services/backup.js` | 52 | `decryptBackup` |
| `server/src/services/backup.js` | 75 | `validateBackup` |
| `server/src/services/backup.js` | 128 | `executeSilentBackup` |
| `server/src/services/backup.js` | 145 | `listBackups` |
| `server/src/services/backup.js` | 152 | `previewRestore` |
| `server/src/services/backup.js` | 165 | `restoreBackup` |
| `server/src/services/imports.js` | 13 | `fail` |
| `server/src/services/imports.js` | 14 | `text` |
| `server/src/services/imports.js` | 20 | `optionalText` |
| `server/src/services/imports.js` | 21 | `numeric` |
| `server/src/services/imports.js` | 26 | `array` |
| `server/src/services/imports.js` | 27 | `date` |
| `server/src/services/imports.js` | 28 | `unique` |
| `server/src/services/imports.js` | 29 | `sessionDraft` |
| `server/src/services/imports.js` | 34 | `studentState` |
| `server/src/services/imports.js` | 35 | `keepDraft` |
| `server/src/services/imports.js` | 41 | `validateMasterRows` |
| `server/src/services/imports.js` | 57 | `previewMaster` |
| `server/src/services/imports.js` | 65 | `stageMasterChunk` |
| `server/src/services/imports.js` | 90 | `previewIds` |
| `server/src/services/imports.js` | 97 | `previewScores` |
| `server/src/services/imports.js` | 116 | `recordDaily` |
| `server/src/services/imports.js` | 132 | `commitImport` |
| `server/src/services/imports.js` | 170 | `discardImport` |
| `server/src/services/registrationBatches.js` | 5 | `fail` |
| `server/src/services/registrationBatches.js` | 6 | `cell` |
| `server/src/services/registrationBatches.js` | 15 | `refineRegistration` |
| `server/src/services/registrationBatches.js` | 25 | `prepareBatchFiles` |
| `server/src/services/registrationBatches.js` | 96 | `cairoDate` |
| `server/src/services/registrationBatches.js` | 99 | `saveBatch` |
| `server/src/services/runtimeStore.js` | 4 | `runtimeStore` |
| `server/src/services/studentNames.js` | 9 | `nameFields` |
| `server/src/services/studentNames.js` | 21 | `groupFamilies` |
| `server/src/services/studentNames.js` | 30 | `canonicalFamilyNames` |
| `server/src/services/studentNames.js` | 42 | `namePatches` |
| `server/src/services/studentNames.js` | 54 | `synchronizeStudentNames` |
| `server/src/services/studentNames.js` | 62 | `namesFromSavedBatches` |
| `server/src/services/studentNames.js` | 81 | `applyNamePatches` |
| `server/src/utils/batchFiles.js` | 2 | `validBatchFiles` |
| `server/src/utils/nextRegistration.js` | 1 | `registrationBase` |
| `server/src/utils/nextRegistration.js` | 5 | `nextRegistrationNumber` |
| `server/test/batches.test.js` | 9 | `filesFor` |
| `server/test/batches.test.js` | 32 | `client` |
| `server/test/batches.test.js` | 185 | `browserCheck` |
| `server/test/browserMigration.test.js` | 83 | `checkBrowser` |
| `server/test/names.test.js` | 28 | `post` |
| `server/test/names.test.js` | 35 | `master` |
| `server/test/postgresql.test.js` | 17 | `server` |
| `server/test/postgresql.test.js` | 28 | `post` |
| `server/test/safety.test.js` | 28 | `client` |
| `server/test/safety.test.js` | 145 | `browserSafety` |
| `src/App.jsx` | 19 | `ProtectedRoute` |
| `src/App.jsx` | 27 | `TokenRedirector` |
| `src/App.jsx` | 40 | `AppContent` |
| `src/App.jsx` | 72 | `App` |
| `src/components/AdminDashboard.jsx` | 10 | `AdminDashboard` |
| `src/components/AdminDashboard.jsx` | 33 | `handleCreateUser` |
| `src/components/AdminDashboard.jsx` | 61 | `handleEditUser` |
| `src/components/AdminDashboard.jsx` | 105 | `handleDeleteUserClick` |
| `src/components/BackupRecovery.jsx` | 6 | `BackupRecovery` |
| `src/components/BackupRecovery.jsx` | 16 | `run` |
| `src/components/BackupRecovery.jsx` | 21 | `download` |
| `src/components/BackupRecovery.jsx` | 29 | `readFile` |
| `src/components/BackupRecovery.jsx` | 39 | `review` |
| `src/components/BackupRecovery.jsx` | 46 | `restore` |
| `src/components/BatchesModal.jsx` | 9 | `BatchDetails` |
| `src/components/BatchesModal.jsx` | 13 | `download` |
| `src/components/BatchesModal.jsx` | 35 | `BatchList` |
| `src/components/BatchesModal.jsx` | 43 | `BatchesModal` |
| `src/components/CeptCreate.jsx` | 13 | `CeptCreate` |
| `src/components/CeptCreate.jsx` | 46 | `handlePreviewLayout` |
| `src/components/CeptCreate.jsx` | 70 | `handleFileSelectTokens` |
| `src/components/CeptCreate.jsx` | 78 | `handleCreateTable` |
| `src/components/CeptCreate.jsx` | 139 | `handleFileSelectPdf` |
| `src/components/CeptCreate.jsx` | 146 | `handleGeneratePdf` |
| `src/components/CeptData.jsx` | 39 | `CeptData` |
| `src/components/CeptData.jsx` | 54 | `handlePrevWeek` |
| `src/components/CeptData.jsx` | 62 | `handleNextWeek` |
| `src/components/CeptData.jsx` | 70 | `handleJumpToCurrent` |
| `src/components/CeptData.jsx` | 108 | `handleToggleSkip` |
| `src/components/CustomSelect.jsx` | 4 | `CustomSelect` |
| `src/components/ErrorPage.jsx` | 3 | `ErrorPage` |
| `src/components/HomePage.jsx` | 8 | `HomePage` |
| `src/components/HomePage.jsx` | 47 | `fetchStats` |
| `src/components/HomePage.jsx` | 64 | `fetchFilters` |
| `src/components/HomePage.jsx` | 82 | `fetchDetails` |
| `src/components/HomePage.jsx` | 96 | `handleBotFileUpload` |
| `src/components/HomePage.jsx` | 118 | `runPlaywrightTest` |
| `src/components/IdsModal.jsx` | 10 | `IdsModal` |
| `src/components/IdsModal.jsx` | 18 | `upload` |
| `src/components/IdsModal.jsx` | 29 | `keepEntry` |
| `src/components/IdsModal.jsx` | 41 | `save` |
| `src/components/IdsModal.jsx` | 47 | `discard` |
| `src/components/IdsModal.jsx` | 50 | `close` |
| `src/components/IdsModal.jsx` | 51 | `replace` |
| `src/components/Layout.jsx` | 7 | `Page` |
| `src/components/Layout.jsx` | 8 | `Layout` |
| `src/components/Loader.jsx` | 3 | `Loader` |
| `src/components/LoginPage.jsx` | 7 | `LoginPage` |
| `src/components/LoginPage.jsx` | 11 | `submit` |
| `src/components/MasterDatabase.jsx` | 9 | `MasterDatabase` |
| `src/components/MasterDatabase.jsx` | 14 | `handleUploadMasterData` |
| `src/components/QuickLogins.jsx` | 7 | `QuickLogins` |
| `src/components/QuickLogins.jsx` | 21 | `upload` |
| `src/components/QuickLogins.jsx` | 47 | `continueSelection` |
| `src/components/QuickLogins.jsx` | 54 | `updateStudent` |
| `src/components/QuickLogins.jsx` | 57 | `download` |
| `src/components/review/reviewData.js` | 1 | `registrationReviewFiles` |
| `src/components/review/reviewData.js` | 13 | `scoreReviewFiles` |
| `src/components/review/ReviewDialog.jsx` | 5 | `ReviewDialog` |
| `src/components/review/ReviewDialog.jsx` | 32 | `ReviewMetrics` |
| `src/components/review/ReviewDialog.jsx` | 35 | `ReviewNotice` |
| `src/components/review/ReviewDialog.jsx` | 38 | `ReviewError` |
| `src/components/review/ReviewDialog.jsx` | 39 | `ReviewBusy` |
| `src/components/review/ReviewDialog.jsx` | 40 | `ReviewSuccess` |
| `src/components/review/ReviewFiles.jsx` | 4 | `IdChange` |
| `src/components/review/ReviewFiles.jsx` | 11 | `SheetPreview` |
| `src/components/review/ReviewFiles.jsx` | 28 | `ReviewFiles` |
| `src/components/review/ReviewUpload.jsx` | 4 | `ReviewUpload` |
| `src/components/review/ReviewUpload.jsx` | 7 | `select` |
| `src/components/ScoresModal.jsx` | 14 | `ScoresModal` |
| `src/components/ScoresModal.jsx` | 30 | `handleUploadScoresData` |
| `src/components/ScoresModal.jsx` | 145 | `handleExport` |
| `src/components/ScoresModal.jsx` | 216 | `discard` |
| `src/components/ScoresModal.jsx` | 217 | `close` |
| `src/components/ScoresModal.jsx` | 218 | `replace` |
| `src/components/Sidebar.jsx` | 6 | `Sidebar` |
| `src/components/SSOHandler.jsx` | 7 | `SSOHandler` |
| `src/components/StudentDatabase.jsx` | 11 | `StudentDatabase` |
| `src/components/StudentDatabase.jsx` | 47 | `toggleStudent` |
| `src/components/StudentDatabase.jsx` | 50 | `togglePage` |
| `src/components/StudentDatabase.jsx` | 55 | `exportNumbers` |
| `src/components/ThemeToggle.jsx` | 3 | `ThemeToggle` |
| `src/components/UserLogs.jsx` | 8 | `UserLogs` |
| `src/components/UserLogs.jsx` | 122 | `handleClearFilters` |
| `src/components/WorkspaceUI.jsx` | 1 | `Icon` |
| `src/components/WorkspaceUI.jsx` | 5 | `Brand` |
| `src/context/AuthContext.jsx` | 10 | `AuthProvider` |
| `src/context/useAuth.js` | 3 | `useAuth` |
| `src/features/batches/BatchFiles.jsx` | 2 | `Sheet` |
| `src/features/batches/BatchFiles.jsx` | 19 | `BatchFiles` |
| `src/features/batches/files.js` | 3 | `readBatchFiles` |
| `src/features/batches/masterTable.js` | 2 | `batchMasterFiles` |
| `src/features/documents/generate.js` | 9 | `readRegistrationFiles` |
| `src/features/documents/generate.js` | 23 | `readTokenFile` |
| `src/features/documents/generate.js` | 31 | `buildRosterArchive` |
| `src/features/documents/generate.js` | 170 | `buildLoginArchive` |
| `src/features/documents/generate.js` | 192 | `buildLoginArchiveFromStudents` |
| `src/features/documents/templates.js` | 5 | `generateRosterPdfHtml` |
| `src/features/documents/templates.js` | 100 | `generateLoginPdfHtml` |
| `src/features/scores/export.js` | 4 | `cleanScoreWorkbook` |
| `src/hooks/useApiQuery.js` | 6 | `useApiQuery` |
| `src/hooks/useImportDraft.js` | 3 | `useImportDraft` |
| `src/hooks/useImportDraft.js` | 6 | `prepare` |
| `src/hooks/useImportDraft.js` | 7 | `commit` |
| `src/utils/download.js` | 2 | `createDownloadTarget` |
| `src/utils/download.js` | 12 | `downloadBlob` |
| `src/utils/download.js` | 22 | `saveBlob` |
| `src/utils/spreadsheetHeaders.js` | 2 | `validateHeaders` |

## Active source inventory

| File | Bytes |
| --- | --- |
| `scripts/dev.mjs` | 815 |
| `scripts/migrate-accounts.mjs` | 1778 |
| `scripts/update-code-index.py` | 1966 |
| `server/src/app.js` | 2812 |
| `server/src/config.js` | 164 |
| `server/src/controllers/adminHandlers.js` | 16426 |
| `server/src/controllers/authHandlers.js` | 4930 |
| `server/src/controllers/dataHandlers.js` | 2420 |
| `server/src/controllers/index.js` | 515 |
| `server/src/controllers/playwrightHandlers.js` | 7297 |
| `server/src/db/connect.js` | 643 |
| `server/src/db/upgrade.js` | 2116 |
| `server/src/generated/postgresql/default.d.ts` | 23 |
| `server/src/generated/postgresql/default.js` | 36 |
| `server/src/generated/postgresql/edge.d.ts` | 25 |
| `server/src/generated/postgresql/edge.js` | 26827 |
| `server/src/generated/postgresql/index-browser.js` | 8716 |
| `server/src/generated/postgresql/index.d.ts` | 423744 |
| `server/src/generated/postgresql/index.js` | 27505 |
| `server/src/generated/postgresql/package.json` | 2601 |
| `server/src/generated/postgresql/query_engine-windows.dll.node` | 19261952 |
| `server/src/generated/postgresql/runtime/edge-esm.js` | 166095 |
| `server/src/generated/postgresql/runtime/edge.js` | 166370 |
| `server/src/generated/postgresql/runtime/index-browser.d.ts` | 11850 |
| `server/src/generated/postgresql/runtime/index-browser.js` | 34709 |
| `server/src/generated/postgresql/runtime/library.d.ts` | 117585 |
| `server/src/generated/postgresql/runtime/library.js` | 191178 |
| `server/src/generated/postgresql/runtime/react-native.js` | 174707 |
| `server/src/generated/postgresql/runtime/wasm.js` | 124187 |
| `server/src/generated/postgresql/schema.prisma` | 2886 |
| `server/src/generated/postgresql/wasm.d.ts` | 23 |
| `server/src/generated/postgresql/wasm.js` | 8716 |
| `server/src/generated/prisma/browser.ts` | 764 |
| `server/src/generated/prisma/client.ts` | 1730 |
| `server/src/generated/prisma/commonInputTypes.ts` | 8401 |
| `server/src/generated/prisma/enums.ts` | 336 |
| `server/src/generated/prisma/internal/class.ts` | 10762 |
| `server/src/generated/prisma/internal/prismaNamespace.ts` | 22866 |
| `server/src/generated/prisma/internal/prismaNamespaceBrowser.ts` | 2705 |
| `server/src/generated/prisma/models/TestUser.ts` | 39767 |
| `server/src/generated/prisma/models.ts` | 358 |
| `server/src/middlewares/session.js` | 3646 |
| `server/src/middlewares/upload.js` | 1039 |
| `server/src/middlewares/writeGate.js` | 2847 |
| `server/src/routes/actions.js` | 377 |
| `server/src/routes/batchRoutes.js` | 2193 |
| `server/src/routes/ceptCreateRoutes.js` | 2289 |
| `server/src/routes/studentRoutes.js` | 6524 |
| `server/src/routes/uploadRoutes.js` | 1856 |
| `server/src/server.js` | 292 |
| `server/src/services/backup.js` | 14874 |
| `server/src/services/imports.js` | 12962 |
| `server/src/services/registrationBatches.js` | 7951 |
| `server/src/services/runtimeStore.js` | 1796 |
| `server/src/services/studentNames.js` | 4625 |
| `server/src/utils/batchFiles.js` | 1237 |
| `server/src/utils/nextRegistration.js` | 564 |
| `server/test/batches.test.js` | 26735 |
| `server/test/browserMigration.test.js` | 10388 |
| `server/test/names.test.js` | 10695 |
| `server/test/nextRegistration.test.js` | 795 |
| `server/test/postgresql.test.js` | 4586 |
| `server/test/reviewModals.test.js` | 11306 |
| `server/test/safety.test.js` | 15896 |
| `server/test/spreadsheetHeaders.test.js` | 1609 |
| `src/api.js` | 455 |
| `src/App.jsx` | 2899 |
| `src/assets/login-template-1.png` | 125783 |
| `src/components/AdminDashboard.jsx` | 14293 |
| `src/components/BackupRecovery.jsx` | 6150 |
| `src/components/BatchesModal.jsx` | 5079 |
| `src/components/CeptCreate.jsx` | 26213 |
| `src/components/CeptData.jsx` | 10757 |
| `src/components/CustomSelect.jsx` | 3897 |
| `src/components/ErrorBoundary.jsx` | 1041 |
| `src/components/ErrorPage.jsx` | 952 |
| `src/components/HomePage.jsx` | 24389 |
| `src/components/IdsModal.jsx` | 5634 |
| `src/components/Layout.jsx` | 1658 |
| `src/components/Loader.jsx` | 1308 |
| `src/components/LoginPage.jsx` | 3074 |
| `src/components/MasterDatabase.jsx` | 7836 |
| `src/components/QuickLogins.jsx` | 10345 |
| `src/components/review/reviewData.js` | 1547 |
| `src/components/review/ReviewDialog.jsx` | 3146 |
| `src/components/review/ReviewFiles.jsx` | 5658 |
| `src/components/review/ReviewUpload.jsx` | 1563 |
| `src/components/ScoresModal.jsx` | 11229 |
| `src/components/Sidebar.jsx` | 1992 |
| `src/components/SSOHandler.jsx` | 2408 |
| `src/components/StudentDatabase.jsx` | 9831 |
| `src/components/ThemeToggle.jsx` | 649 |
| `src/components/UserLogs.jsx` | 11018 |
| `src/components/WorkspaceUI.jsx` | 1467 |
| `src/context/AuthContext.jsx` | 3281 |
| `src/context/useAuth.js` | 160 |
| `src/features/batches/BatchFiles.jsx` | 2027 |
| `src/features/batches/files.js` | 958 |
| `src/features/batches/masterTable.js` | 826 |
| `src/features/documents/generate.js` | 9537 |
| `src/features/documents/templates.js` | 11088 |
| `src/features/scores/export.js` | 756 |
| `src/hooks/useApiQuery.js` | 1259 |
| `src/hooks/useImportDraft.js` | 664 |
| `src/main.jsx` | 390 |
| `src/styles/_AdminDashboard.scss` | 2834 |
| `src/styles/_App.scss` | 5014 |
| `src/styles/_base.scss` | 624 |
| `src/styles/_Batches.scss` | 10408 |
| `src/styles/_CeptCreate.scss` | 8952 |
| `src/styles/_CeptData.scss` | 11265 |
| `src/styles/_components.scss` | 3687 |
| `src/styles/_CustomSelect.scss` | 3008 |
| `src/styles/_HomePage.scss` | 11406 |
| `src/styles/_Layout.scss` | 3592 |
| `src/styles/_Loader.scss` | 2710 |
| `src/styles/_LoginPage.scss` | 882 |
| `src/styles/_RegistrationExport.scss` | 784 |
| `src/styles/_ReviewModal.scss` | 20724 |
| `src/styles/_ThemeToggle.scss` | 3938 |
| `src/styles/_UserLogs.scss` | 7597 |
| `src/styles/_variables.scss` | 5794 |
| `src/styles/_VersionBadge.scss` | 1500 |
| `src/styles/_Workspace.scss` | 32250 |
| `src/styles/index.scss` | 320 |
| `src/styles/tailwind.css` | 23 |
| `src/utils/download.js` | 1099 |
| `src/utils/spreadsheetHeaders.js` | 1031 |
