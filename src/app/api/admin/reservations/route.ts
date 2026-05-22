import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const userId = url.searchParams.get('userId');
  const courtId = url.searchParams.get('courtId');
  const status = url.searchParams.get('status');

  const filters: SQL[] = [];
  if (from && DATE_PATTERN.test(from)) filters.push(gte(reservations.date, from));
  if (to && DATE_PATTERN.test(to)) filters.push(lte(reservations.date, to));
  if (userId && Number.isFinite(Number(userId))) filters.push(eq(reservations.userId, Number(userId)));
  if (courtId && Number.isFinite(Number(courtId))) filters.push(eq(reservations.courtId, Number(courtId)));
  if (status === 'active' || status === 'cancelled') filters.push(eq(reservations.status, status));

  const rows = db
    .select({
      id: reservations.id,
      userId: reservations.userId,
      userName: users.name,
      userDong: users.dong,
      userHo: users.ho,
      userEmail: users.email,
      courtId: reservations.courtId,
      date: reservations.date,
      startHour: reservations.startHour,
      endHour: reservations.endHour,
      partySize: reservations.partySize,
      status: reservations.status,
      note: reservations.note,
      createdAt: reservations.createdAt,
      cancelledAt: reservations.cancelledAt,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(reservations.date), desc(reservations.startHour))
    .limit(500)
    .all();

  return NextResponse.json({ reservations: rows });
}

const createSchema = z.object({
  userId: z.number().int(),
  courtId: z.number().int().min(1),
  date: z.string().regex(DATE_PATTERN),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24).optional(),
  partySize: z.number().int().min(1),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const target = db.select().from(users).where(eq(users.id, parsed.data.userId)).get();
  if (!target) return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });

  const startHour = parsed.data.startHour;
  const endHour = parsed.data.endHour ?? startHour + 1;
  if (endHour <= startHour) {
    return NextResponse.json({ error: 'endHour는 startHour보다 커야 합니다.' }, { status: 400 });
  }

  const now = Date.now();
  try {
    const inserted = db
      .insert(reservations)
      .values({
        userId: parsed.data.userId,
        courtId: parsed.data.courtId,
        date: parsed.data.date,
        startHour,
        endHour,
        partySize: parsed.data.partySize,
        status: 'active',
        note: parsed.data.note ?? null,
        createdAt: now,
        createdBy: me.id,
      })
      .returning()
      .get();
    return NextResponse.json({ reservation: inserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed/i.test(msg)) {
      return NextResponse.json(
        { error: '같은 코트·날짜·시작 시각에 이미 활성 예약이 있습니다. 먼저 기존 예약을 취소하세요.' },
        { status: 409 },
      );
    }
    throw e;
  }
}
