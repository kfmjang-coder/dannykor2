import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, users } from '@/db/schema';
import ReservationsAdmin from './reservations-admin';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
    courtId?: string;
    userId?: string;
  }>;
}) {
  const p = await searchParams;
  const filters: SQL[] = [];
  if (p.from && DATE_PATTERN.test(p.from)) filters.push(gte(reservations.date, p.from));
  if (p.to && DATE_PATTERN.test(p.to)) filters.push(lte(reservations.date, p.to));
  if (p.userId && Number.isFinite(Number(p.userId))) filters.push(eq(reservations.userId, Number(p.userId)));
  if (p.courtId && Number.isFinite(Number(p.courtId))) filters.push(eq(reservations.courtId, Number(p.courtId)));
  if (p.status === 'active' || p.status === 'cancelled') filters.push(eq(reservations.status, p.status));

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
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(reservations.date), desc(reservations.startHour))
    .limit(500)
    .all();

  const userOptions = db
    .select({ id: users.id, name: users.name, dong: users.dong, ho: users.ho, email: users.email })
    .from(users)
    .where(eq(users.status, 'active'))
    .all()
    .map((u) => ({
      id: u.id,
      label: `${u.name} (${u.dong && u.ho ? `${u.dong}-${u.ho}` : (u.email ?? `id=${u.id}`)})`,
    }));

  return (
    <div>
      <h2 className="text-lg font-semibold">예약 관리</h2>
      <p className="mt-1 text-sm text-gray-500">
        모든 검증 우회 가능 (수기 대장 마이그레이션 포함). 슬롯 중복은 여전히 차단됩니다.
      </p>
      <div className="mt-4">
        <ReservationsAdmin rows={rows} userOptions={userOptions} filter={p} />
      </div>
    </div>
  );
}
