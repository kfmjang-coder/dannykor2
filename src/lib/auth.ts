import { db } from '@/db/client';
import { users, type User } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from './session';

export type CurrentUser = Omit<User, 'passwordHash'>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const row = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!row || row.status !== 'active') return null;
  const { passwordHash: _omit, ...safe } = row;
  return safe;
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, 'Unauthorized');
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== 'admin') throw new HttpError(403, 'Forbidden');
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
