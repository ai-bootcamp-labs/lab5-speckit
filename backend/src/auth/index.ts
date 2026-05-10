import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { DB } from './repositories/db-types.js';
import type { Clock } from './adapters/clock.port.js';
import type { EmailPort } from './adapters/email.port.js';
import type { AppConfig } from '../infra/config.js';
import { logger } from '../infra/logger.js';
import { UsersRepository } from './repositories/users.repo.js';
import { VerificationRepository } from './repositories/verification.repo.js';
import { RegistrationService } from './services/registration.service.js';
import { VerificationService } from './services/verification.service.js';
import { buildRegisterRouter } from './routes/register.route.js';
import { buildVerifyRouter } from './routes/verify.route.js';

/**
 * Bag of dependencies the auth router needs. User-story phases widen this
 * type as they introduce services.
 */
export interface AuthDependencies {
  config: AppConfig;
  db: Kysely<DB>;
  clock: Clock;
  email: EmailPort;
  publicBaseUrl?: string;
}

/**
 * Composition root for the `/auth` router. Wires repositories, services, and
 * routes from the supplied dependencies.
 * @param deps - Wired dependencies.
 * @returns Express router rooted at `/auth`.
 */
export function buildAuthRouter(deps: AuthDependencies): Router {
  const router = Router();
  const publicBaseUrl =
    deps.publicBaseUrl ?? `http://${deps.config.COOKIE_DOMAIN}:${String(deps.config.PORT)}`;

  const usersRepo = new UsersRepository(deps.db);
  const verificationsRepo = new VerificationRepository(deps.db);

  const registrationService = new RegistrationService({
    users: usersRepo,
    verifications: verificationsRepo,
    email: deps.email,
    clock: deps.clock,
    logger,
    bcryptCost: deps.config.PASSWORD_BCRYPT_COST,
    publicBaseUrl,
  });

  const verificationService = new VerificationService({
    users: usersRepo,
    verifications: verificationsRepo,
    email: deps.email,
    clock: deps.clock,
    logger,
    publicBaseUrl,
  });

  router.use(buildRegisterRouter(registrationService));
  router.use(buildVerifyRouter(verificationService));
  // Future phases mount additional routers here:
  //   T068 — login + session
  //   T082 — password reset
  //   T093 — logout
  //   T101 — account delete

  return router;
}
