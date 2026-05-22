import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

const schema = z.object({
  newPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` },
      { status: 400 },
    );
  }

  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hash = await hashPassword(parsed.data.newPassword);
  db.update(users).set({ passwordHash: hash, mustChangePassword: true }).where(eq(users.id, userId)).run();

  return NextResponse.json({ ok: true });
}
