import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String, // Will store the secure bcrypt hash
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'], // Restricts roles to these exact two strings
    default: 'user'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const logSchema = new mongoose.Schema({
  username: {
    type: String, // We use username instead of raw user ID to make it instantly readable for mods
    required: true
  },
  action: {
    type: String,
    required: true // e.g., 'Login', 'Check IDs', 'Export'
  },
  details: {
    type: String,
    default: '' // Additional context, e.g., 'Checked 10 IDs'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Flexible payload for analytics (e.g. file lists, error codes)
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Export the compiled models
export const User = mongoose.model('User', userSchema);
export const Log = mongoose.model('Log', logSchema);

const dailyOperationSchema = new mongoose.Schema({
  date: {
    type: String, // Stored as YYYY-MM-DD
    required: true,
    unique: true
  },
  idsUploaded: {
    type: Boolean,
    default: false
  },
  scoresUploaded: {
    type: Boolean,
    default: false
  },
  idsNotNeeded: {
    type: Boolean,
    default: false
  },
  scoresNotNeeded: {
    type: Boolean,
    default: false
  }
});

export const DailyOperation = mongoose.model('DailyOperation', dailyOperationSchema);

const fileLockSchema = new mongoose.Schema({
  lockId: {
    type: String,
    required: true,
    unique: true, // e.g. "masterData"
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: String,
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockExpiresAt: {
    type: Date,
    default: null
  }
});

export const FileLock = mongoose.model('FileLock', fileLockSchema);
