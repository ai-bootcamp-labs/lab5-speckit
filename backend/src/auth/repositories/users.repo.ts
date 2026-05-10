import type { Kysely } from 'kysely';
import type { DB } from './db-types.js';
import type { User, UserId, UserStatus } from '../domain/user.js';

/**
 * Map a Kysely row to the domain `User` aggregate.
 * @param row - Raw database row.
 * @returns Domain user.
 */
function rowToUser(row: {
  id: string;
  email: string;
  password_hash: string;
  status: UserStatus;
  verified_at: Date | null;
  deleted_at: Date | null;
  anonymized_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): User {
  return {
    id: row.id as UserId,
    email: row.email,
    passwordHash: row.password_hash,
    status: row.status,
    verifiedAt: row.verified_at,
    deletedAt: row.deleted_at,
    anonymizedAt: row.anonymized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Repository over `auth.users`.
 */
export class UsersRepository {
  /**
   * @param db - Active Kysely instance.
   */
  constructor(private readonly db: Kysely<DB>) {}

  /**
   * Look up a user by case-insensitive email (citext column).
   * @param email - Email address.
   * @returns User domain object or `null` when no live match exists.
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('auth.users')
      .selectAll()
      .where('email', '=', email)
      .where('anonymized_at', 'is', null)
      .executeTakeFirst();
    return row ? rowToUser(row) : null;
  }

  /**
   * Look up a user by id.
   * @param id - User id.
   * @returns User or `null`.
   */
  async findById(id: UserId): Promise<User | null> {
    const row = await this.db
      .selectFrom('auth.users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToUser(row) : null;
  }

  /**
   * Insert a new pending user.
   * @param input - Required columns for the new row.
   * @returns The inserted user (id assigned by the database).
   */
  async insertPending(input: { email: string; passwordHash: string }): Promise<User> {
    const row = await this.db
      .insertInto('auth.users')
      .values({
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        status: 'pending',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToUser(row);
  }

  /**
   * Flip a pending user to active and stamp `verified_at`.
   * @param id - User id to activate.
   * @param now - Timestamp for the activation event.
   * @returns Promise that resolves once the row is updated.
   */
  async markVerified(id: UserId, now: Date): Promise<void> {
    await this.db
      .updateTable('auth.users')
      .set({ status: 'active', verified_at: now, updated_at: now })
      .where('id', '=', id)
      .execute();
  }

  /**
   * Quick existence check used by timing-equalised registration paths.
   * @param email - Email to test.
   * @returns `true` when a live row matches.
   */
  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('auth.users')
      .select(['id'])
      .where('email', '=', email)
      .where('anonymized_at', 'is', null)
      .executeTakeFirst();
    return row !== undefined;
  }
}
