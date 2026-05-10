/**
 * Aggregate Kysely DB schema. User-story phases extend this interface by
 * adding their table types here (T033, T056, T078, T098). Keeping the shape
 * empty initially satisfies the foundational compose step.
 */
export interface DB {
  // Populated by user-story tasks:
  //   T033 — auth.users, auth.email_verifications
  //   T056 — auth.sessions
  //   T078 — auth.password_resets
  //   T098 — auth.security_events
}
