import multer from 'multer';


// BEST PRACTICE: Use MemoryStorage for parsing spreadsheets.
// This keeps the file completely in RAM (as a Buffer) so you can pass it straight to `xlsx` 
// without ever writing it to the server's hard drive. It's incredibly fast, requires no disk cleanup,
// and ensures your cloud server's storage doesn't get clogged with junk.
const storage = multer.memoryStorage();

// Validate that only Excel or CSV files can be uploaded
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max limit to prevent DDoS
  }
});
