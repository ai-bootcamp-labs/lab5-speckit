import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { DB } from './repositories/db-types.js';
import type { Clock } from './adapters/clock.port.ts';
import type { EmailPort } from './adapters/email.port.ts';
import type { AppConfig } from '../infra/config.js';

/**
 * Bag of dependencies the auth router needs. User-story phases will widen
 * this type as they introduce services.
 */
export interface AuthDependencies {
  config: AppConfig;
  db: Kysely<DB>;
  clock: Clock;
  email: EmailPort;
}

/**
 * Composition root for the `/auth` router. User-story phases register their
 * routes onto the returned router by extending this function.
 * @param _deps - Wired dependencies.
 * @returns Express router rooted at `/auth`.
 */
export function buildAuthRouter(_deps: AuthDependencies): Router {
  const router = Router();
  // User-story routes will be mounted here:
  //   T044 — register, verify
  //   T068 — login, session
  //   T082 — password-reset request/confirm
  //   T093 — logout
  //   T101 — account delete
  return router;
}
