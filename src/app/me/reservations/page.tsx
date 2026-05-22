import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { todayKst } from '@/lib/kst';
import { canCancelNow } from '@/lib/reservation-rules';
import CancelReservationButton from '@/components/cancel-reservation-button';

export default async function MyReservationsPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  if (session.mustChangePassword) redirect('/password/change');

  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const all = db
    .select()
    .from(reservations)
    .where(and(eq(reservations.userId, me.id), eq(reservations.status, 'active')))
    .orderBy(desc(reservations.date), desc(reservations.startHour))
    .all();

  const today = todayKst();
  const upcoming = all.filter((r) => r.date >= today);
  const past = all.filter((r) => r.date < today);

  function card(r: (typeof all)[number], showCancel: boolean) {
    return (
      <li
        key={r.id}
        className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="font-medium">{r.date}</span>
          <span className="text-gray-700">
            {String(r.startHour).padStart(2, '0')}:00–{String(r.endHour).padStart(2, '0')}:00
          </span>
          <span className="text-gray-700">코트 {r.courtId}</span>
          <span className="text-gray-700">{r.partySize}명</span>
        </div>
        <div className="sm:text-right">
          {showCancel && canCancelNow(r.date, r.startHour) ? (
            <CancelReservationButton id={r.id} />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">내 예약</h1>
        <Link href="/" className="self-start rounded border px-3 py-1 text-sm hover:bg-gray-100">
          ← 예약 화면으로
        </Link>
      </header>

      <section className="mt-6">
        <h2 className="font-semibold">다가오는 예약 ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">예정된 예약이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">{upcoming.map((r) => card(r, true))}</ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">지난 예약 ({past.length})</h2>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">지난 예약이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">{past.map((r) => card(r, false))}</ul>
        )}
      </section>
    </main>
  );
}
