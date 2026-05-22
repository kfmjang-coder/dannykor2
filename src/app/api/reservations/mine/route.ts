import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { todayKst } from '@/lib/kst';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = db
    .select()
    .from(reservations)
    .where(and(eq(reservations.userId, me.id), eq(reservations.status, 'active')))
    .orderBy(desc(reservations.date), desc(reservations.startHour))
    .all();

  const today = todayKst();
  const upcoming = rows.filter((r) => r.date >= today);
  const past = rows.filter((r) => r.date < today);
  return NextResponse.json({ upcoming, past });
}
