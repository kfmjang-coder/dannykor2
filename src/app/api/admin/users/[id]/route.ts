import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  role: z.enum(['user', 'admin']).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (userId === me.id && parsed.data.role === 'user') {
    return NextResponse.json({ error: '본인 계정의 관리자 권한은 스스로 해제할 수 없습니다.' }, { status: 400 });
  }
  if (userId === me.id && parsed.data.status && parsed.data.status !== 'active') {
    return NextResponse.json({ error: '본인 계정은 비활성화할 수 없습니다.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.status) {
    update.status = parsed.data.status;
    if (parsed.data.status === 'active' && !target.approvedAt) {
      update.approvedAt = Date.now();
    }
  }
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경 사항이 없습니다.' }, { status: 400 });
  }

  db.update(users).set(update).where(eq(users.id, userId)).run();
  const updated = db.select().from(users).where(eq(users.id, userId)).get()!;
  const { passwordHash: _omit, ...safe } = updated;
  return NextResponse.json({ user: safe });
}
