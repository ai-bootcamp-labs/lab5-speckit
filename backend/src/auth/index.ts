import { Router } from 'express';
import bcrypt from 'bcrypt';
import type { Kysely } from 'kysely';
import type { DB } from './repositories/db-types.js';
import type { Clock } from './adapters/clock.port.js';
import type { EmailPort } from './adapters/email.port.js';
import type { AppConfig } from '../infra/config.js';
import { logger } from '../infra/logger.js';
import { UsersRepository } from './repositories/users.repo.js';
import { VerificationRepository } from './repositories/verification.repo.js';
import { SessionsRepository } from './repositories/sessions.repo.js';
import { RegistrationService } from './services/registration.service.js';
import { VerificationService } from './services/verification.service.js';
import { SessionService } from './services/session.service.js';
import { LoginService } from './services/login.service.js';
import { ThrottleService } from './services/throttle.service.js';
import { buildRegisterRouter } from './routes/register.route.js';
import { buildVerifyRouter } from './routes/verify.route.js';
import { buildLoginRouter, buildSessionRouter } from './routes/login.route.js';

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
  const isProduction = deps.config.NODE_ENV === 'production';

  // Repositories
  const usersRepo = new UsersRepository(deps.db);
  const verificationsRepo = new VerificationRepository(deps.db);
  const sessionsRepo = new SessionsRepository(deps.db);

  // Services
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

  const sessionService = new SessionService({
    sessions: sessionsRepo,
    clock: deps.clock,
    jwtSecret: deps.config.JWT_SECRET,
  });

  const throttleService = new ThrottleService(deps.clock);

  // Pre-compute a placeholder hash so unknown-email login takes equal time.
  const dummyHash = bcrypt.hashSync(
    'unused-timing-equaliser-placeholder',
    deps.config.PASSWORD_BCRYPT_COST,
  );

  const loginService = new LoginService({
    users: usersRepo,
    sessions: sessionService,
    throttle: throttleService,
    clock: deps.clock,
    logger,
    dummyHash,
  });

  // Routes
  router.use(buildRegisterRouter(registrationService));
  router.use(buildVerifyRouter(verificationService));
  router.use(buildLoginRouter(loginService, isProduction));
  router.use(buildSessionRouter(sessionService));
  // Future phases mount additional routers here:
  //   T082 — password reset
  //   T093 — logout
  //   T101 — account delete

  return router;
}
