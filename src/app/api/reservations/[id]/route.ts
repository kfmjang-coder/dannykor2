import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { canCancelNow } from '@/lib/reservation-rules';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const resId = Number(id);
  if (!Number.isFinite(resId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const row = db.select().from(reservations).where(eq(reservations.id, resId)).get();
  if (!row) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  if (row.userId !== me.id) {
    return NextResponse.json({ error: '본인의 예약만 취소할 수 있습니다.' }, { status: 403 });
  }
  if (row.status !== 'active') {
    return NextResponse.json({ error: '이미 취소된 예약입니다.' }, { status: 400 });
  }
  if (!canCancelNow(row.date, row.startHour)) {
    return NextResponse.json({ error: '취소 가능 시간이 지났습니다.' }, { status: 400 });
  }

  const now = Date.now();
  db.update(reservations)
    .set({ status: 'cancelled', cancelledAt: now, cancelledBy: me.id })
    .where(and(eq(reservations.id, resId), eq(reservations.status, 'active')))
    .run();

  return NextResponse.json({ ok: true });
}
