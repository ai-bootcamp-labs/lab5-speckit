import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { VerificationService } from '../services/verification.service.js';
import { resendVerificationHandler, verifyEmailHandler } from '../handlers/verify.handler.js';

/**
 * Build the verification routes (`POST /verify-email`, `POST /verify-email/resend`).
 *
 * Resend is rate-limited per IP (3 req/min) to throttle abuse without
 * leaking enumeration signals.
 * @param service - Verification service.
 * @returns Express router.
 */
export function buildVerifyRouter(service: VerificationService): Router {
  const router = Router();
  const resendLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  router.post('/verify-email', verifyEmailHandler(service));
  router.post('/verify-email/resend', resendLimiter, resendVerificationHandler(service));
  return router;
}
