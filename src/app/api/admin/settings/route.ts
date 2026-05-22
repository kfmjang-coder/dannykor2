import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, gt, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, settings } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_SETTINGS, type SettingKey } from '@/lib/settings-defaults';
import { getSettings } from '@/lib/settings';
import { todayKst } from '@/lib/kst';

const KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

const bodySchema = z.object({
  updates: z.record(z.string(), z.number().int().nonnegative()),
});

const validators: Record<SettingKey, (n: number, all: Partial<Record<SettingKey, number>>) => string | null> = {
  operating_hour_start: (n, all) => {
    if (n < 0 || n > 23) return '0~23 사이여야 합니다.';
    const end = all.operating_hour_end ?? getSettings().operating_hour_end;
    if (n >= end) return '시작 시각은 종료 시각보다 작아야 합니다.';
    return null;
  },
  operating_hour_end: (n, all) => {
    if (n < 1 || n > 24) return '1~24 사이여야 합니다.';
    const start = all.operating_hour_start ?? getSettings().operating_hour_start;
    if (n <= start) return '종료 시각은 시작 시각보다 커야 합니다.';
    return null;
  },
  court_count: (n) => (n >= 1 && n <= 20 ? null : '1~20 사이여야 합니다.'),
  party_size_min: (n, all) => {
    if (n < 1) return '1 이상이어야 합니다.';
    const max = all.party_size_max ?? getSettings().party_size_max;
    if (n > max) return '최소 인원은 최대 인원보다 클 수 없습니다.';
    return null;
  },
  party_size_max: (n, all) => {
    if (n < 1 || n > 50) return '1~50 사이여야 합니다.';
    const min = all.party_size_min ?? getSettings().party_size_min;
    if (n < min) return '최대 인원은 최소 인원보다 작을 수 없습니다.';
    return null;
  },
  reservation_horizon_days: (n) => (n >= 1 && n <= 365 ? null : '1~365일 사이여야 합니다.'),
  cancel_deadline_hours: (n) => (n >= 0 && n <= 168 ? null : '0~168시간 사이여야 합니다.'),
  daily_reservation_limit_per_user: (n) => (n >= 1 && n <= 20 ? null : '1~20 사이여야 합니다.'),
};

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const updates = parsed.data.updates as Partial<Record<SettingKey, number>>;
  const unknown = Object.keys(updates).filter((k) => !KEYS.includes(k as SettingKey));
  if (unknown.length) {
    return NextResponse.json({ error: `Unknown keys: ${unknown.join(', ')}` }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    const err = validators[k as SettingKey](v as number, updates);
    if (err) errors[k] = err;
  }
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: '입력값 검증 실패', fieldErrors: errors }, { status: 400 });
  }

  // court_count reduction safety: refuse if future active reservations target removed courts
  if (typeof updates.court_count === 'number') {
    const today = todayKst();
    const conflicts = db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'active'),
          gte(reservations.date, today),
          gt(reservations.courtId, updates.court_count),
        ),
      )
      .all();
    if (conflicts.length) {
      return NextResponse.json(
        {
          error: `코트 수를 줄이려면 먼저 ${conflicts.length}건의 예약을 정리해야 합니다.`,
          conflicts: conflicts.map((c) => ({
            id: c.id,
            date: c.date,
            startHour: c.startHour,
            courtId: c.courtId,
          })),
        },
        { status: 409 },
      );
    }
  }

  const now = Date.now();
  db.transaction((tx) => {
    for (const [k, v] of Object.entries(updates)) {
      tx.insert(settings)
        .values({ key: k, value: String(v), updatedAt: now, updatedBy: me.id })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(v), updatedAt: now, updatedBy: me.id },
        })
        .run();
    }
  });

  return NextResponse.json({ settings: getSettings() });
}
