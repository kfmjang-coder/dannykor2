import { getIronSession, type IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  userId?: number;
  role?: 'user' | 'admin';
  mustChangePassword?: boolean;
};

const cookieName = 'tennis-session';

function getPassword(): string {
  const pw = process.env.SESSION_SECRET;
  if (!pw || pw.length < 32) {
    throw new Error(
      'SESSION_SECRET env var is required and must be at least 32 characters.',
    );
  }
  return pw;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), {
    password: getPassword(),
    cookieName,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    },
  });
}
