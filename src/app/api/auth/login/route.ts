import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import { getSession } from '@/lib/session';

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { identifier, password } = parsed.data;

  const user = identifier.includes('@')
    ? db
        .select()
        .from(users)
        .where(and(eq(users.email, identifier), isNotNull(users.email)))
        .get()
    : (() => {
        const m = identifier.match(/^(\d+)\s*[-\s/]\s*(\w+)$/);
        if (!m) return undefined;
        const [, dong, ho] = m;
        return db
          .select()
          .from(users)
          .where(and(eq(users.dong, dong), eq(users.ho, ho)))
          .get();
      })();

  if (!user) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  if (user.status !== 'active') {
    return NextResponse.json(
      { error: '계정이 활성화되지 않았습니다. 관리자 승인을 기다려주세요.' },
      { status: 403 },
    );
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.mustChangePassword = !!user.mustChangePassword;
  await session.save();

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, mustChangePassword: !!user.mustChangePassword },
  });
}
