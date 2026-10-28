import { Router } from 'express';
import { registerAuthHandlers } from './authHandlers.js';
import { registerDataHandlers } from './dataHandlers.js';
import { registerAdminHandlers } from './adminHandlers.js';
import { registerPlaywrightHandlers } from './playwrightHandlers.js';

export function createActionRouter() {
  const router = Router();
  registerAuthHandlers(router);
  registerDataHandlers(router);
  registerAdminHandlers(router);
  registerPlaywrightHandlers(router);
  return router;
}
