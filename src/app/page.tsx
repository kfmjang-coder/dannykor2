import { redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { addDaysKst, todayKst } from '@/lib/kst';
import DateNav from '@/components/date-nav';
import LogoutButton from '@/components/logout-button';
import ReservationGrid, { type GridReservation } from '@/components/reservation-grid';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  if (session.mustChangePassword) redirect('/password/change');

  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const s = getSettings();
  const today = todayKst();
  const max = addDaysKst(today, s.reservation_horizon_days);

  const params = await searchParams;
  let date = params.date ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;
  if (date < today) date = today;
  if (date > max) date = max;

  const rows = db
    .select({
      id: reservations.id,
      courtId: reservations.courtId,
      startHour: reservations.startHour,
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

  const gridReservations: GridReservation[] = rows.map((r) => ({
    id: r.id,
    courtId: r.courtId,
    startHour: r.startHour,
    partySize: r.partySize,
    userName: r.userName,
    userDong: r.userDong,
    userHo: r.userHo,
    mine: r.userId === me.id,
  }));

  const displayId = me.dong && me.ho ? `${me.dong}동 ${me.ho}호` : (me.email ?? '');

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">아파트 테니스장 예약</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="order-last w-full text-xs text-gray-600 sm:order-none sm:w-auto sm:text-sm">
            {me.name} ({displayId})
          </span>
          <Link href="/me/reservations" className="rounded border px-3 py-1 hover:bg-gray-100">
            내 예약
          </Link>
          {me.role === 'admin' && (
            <Link href="/admin" className="rounded border px-3 py-1 hover:bg-gray-100">
              관리자
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>
      <DateNav date={date} today={today} horizonDays={s.reservation_horizon_days} />
      <ReservationGrid
        date={date}
        today={today}
        hourStart={s.operating_hour_start}
        hourEnd={s.operating_hour_end}
        courtCount={s.court_count}
        partySizeMin={s.party_size_min}
        partySizeMax={s.party_size_max}
        reservations={gridReservations}
      />
      <p className="mt-4 text-xs text-gray-500">
        취소는 시작 {s.cancel_deadline_hours}시간 전까지 가능합니다. 같은 날 최대{' '}
        {s.daily_reservation_limit_per_user}개까지 예약할 수 있습니다.
      </p>
    </main>
  );
}
