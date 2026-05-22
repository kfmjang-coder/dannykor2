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

  function row(r: (typeof all)[number], showCancel: boolean) {
    return (
      <tr key={r.id} className="border-b">
        <td className="px-3 py-2">{r.date}</td>
        <td className="px-3 py-2">
          {String(r.startHour).padStart(2, '0')}:00–{String(r.endHour).padStart(2, '0')}:00
        </td>
        <td className="px-3 py-2">코트 {r.courtId}</td>
        <td className="px-3 py-2">{r.partySize}명</td>
        <td className="px-3 py-2 text-right">
          {showCancel && canCancelNow(r.date, r.startHour) ? (
            <CancelReservationButton id={r.id} />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 예약</h1>
        <Link href="/" className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
          ← 예약 화면으로
        </Link>
      </header>

      <section className="mt-6">
        <h2 className="font-semibold">다가오는 예약 ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">예정된 예약이 없습니다.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">시간</th>
                <th className="px-3 py-2">코트</th>
                <th className="px-3 py-2">인원</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>{upcoming.map((r) => row(r, true))}</tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">지난 예약 ({past.length})</h2>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">지난 예약이 없습니다.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">시간</th>
                <th className="px-3 py-2">코트</th>
                <th className="px-3 py-2">인원</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>{past.map((r) => row(r, false))}</tbody>
          </table>
        )}
      </section>
    </main>
  );
}
