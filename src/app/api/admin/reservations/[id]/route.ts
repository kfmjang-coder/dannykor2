import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  courtId: z.number().int().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(1).max(24).optional(),
  partySize: z.number().int().min(1).optional(),
  status: z.enum(['active', 'cancelled']).optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const resId = Number(id);
  if (!Number.isFinite(resId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const target = db.select().from(reservations).where(eq(reservations.id, resId)).get();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (parsed.data.courtId !== undefined) update.courtId = parsed.data.courtId;
  if (parsed.data.date !== undefined) update.date = parsed.data.date;
  if (parsed.data.startHour !== undefined) update.startHour = parsed.data.startHour;
  if (parsed.data.endHour !== undefined) update.endHour = parsed.data.endHour;
  if (parsed.data.partySize !== undefined) update.partySize = parsed.data.partySize;
  if (parsed.data.note !== undefined) update.note = parsed.data.note;
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    if (parsed.data.status === 'cancelled' && target.status !== 'cancelled') {
      update.cancelledAt = Date.now();
      update.cancelledBy = me.id;
    }
  }

  // Sanity: derived endHour
  const newStart = (update.startHour as number | undefined) ?? target.startHour;
  const newEnd = (update.endHour as number | undefined) ?? target.endHour;
  if (newEnd <= newStart) {
    return NextResponse.json({ error: 'endHour는 startHour보다 커야 합니다.' }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경 사항이 없습니다.' }, { status: 400 });
  }

  try {
    db.update(reservations).set(update).where(eq(reservations.id, resId)).run();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed/i.test(msg)) {
      return NextResponse.json(
        { error: '변경하려는 코트·날짜·시간에 이미 활성 예약이 있습니다.' },
        { status: 409 },
      );
    }
    throw e;
  }
  const updated = db.select().from(reservations).where(eq(reservations.id, resId)).get();
  return NextResponse.json({ reservation: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const resId = Number(id);
  if (!Number.isFinite(resId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const target = db.select().from(reservations).where(eq(reservations.id, resId)).get();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.status === 'cancelled') {
    return NextResponse.json({ error: '이미 취소된 예약입니다.' }, { status: 400 });
  }

  db.update(reservations)
    .set({ status: 'cancelled', cancelledAt: Date.now(), cancelledBy: me.id })
    .where(eq(reservations.id, resId))
    .run();
  return NextResponse.json({ ok: true });
}
