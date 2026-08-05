import { registerAuthHandlers } from './authHandlers.js';
import { registerDataHandlers } from './dataHandlers.js';
import { registerAdminHandlers } from './adminHandlers.js';
import { registerLockHandlers } from './lockHandlers.js';
import { registerCeptCreateHandlers } from './ceptCreateHandlers.js';
import { registerDocHandlers } from './docHandlers.js';

export function registerIpcHandlers() {
  registerAuthHandlers();
  registerDataHandlers();
  registerAdminHandlers();
  registerLockHandlers();
  registerCeptCreateHandlers();
  registerDocHandlers();
}
