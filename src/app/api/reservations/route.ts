import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { validateCreateReservation } from '@/lib/reservation-rules';

const createSchema = z.object({
  courtId: z.number().int(),
  date: z.string(),
  startHour: z.number().int(),
  partySize: z.number().int(),
});

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  if (!date || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ error: 'date(YYYY-MM-DD) required' }, { status: 400 });
  }

  const rows = db
    .select({
      id: reservations.id,
      courtId: reservations.courtId,
      date: reservations.date,
      startHour: reservations.startHour,
      endHour: reservations.endHour,
      partySize: reservations.partySize,
      userId: reservations.userId,
      userName: users.name,
      userDong: users.dong,
      userHo: users.ho,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(and(eq(reservations.date, date), eq(reservations.status, 'active')))
    .all();

  return NextResponse.json({
    date,
    reservations: rows.map((r) => ({
      ...r,
      mine: r.userId === me.id,
    })),
  });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 });
  }

  const failure = validateCreateReservation({ userId: me.id, ...parsed.data });
  if (failure) {
    return NextResponse.json({ error: failure.message, field: failure.field }, { status: 400 });
  }

  const now = Date.now();
  try {
    const inserted = db
      .insert(reservations)
      .values({
        userId: me.id,
        courtId: parsed.data.courtId,
        date: parsed.data.date,
        startHour: parsed.data.startHour,
        endHour: parsed.data.startHour + 1,
        partySize: parsed.data.partySize,
        status: 'active',
        createdAt: now,
        createdBy: me.id,
      })
      .returning()
      .get();
    return NextResponse.json({ reservation: inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed/i.test(msg)) {
      return NextResponse.json({ error: '이미 예약된 슬롯입니다.' }, { status: 409 });
    }
    throw e;
  }
}
