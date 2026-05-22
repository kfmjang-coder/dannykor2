import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations, users } from '@/db/schema';
import { getSettings } from '@/lib/settings';
import { todayKst } from '@/lib/kst';

export default function AdminDashboard() {
  const today = todayKst();
  const s = getSettings();

  const todays = db
    .select({
      id: reservations.id,
      courtId: reservations.courtId,
      startHour: reservations.startHour,
      partySize: reservations.partySize,
      userName: users.name,
      userDong: users.dong,
      userHo: users.ho,
    })
    .from(reservations)
    .innerJoin(users, eq(users.id, reservations.userId))
    .where(and(eq(reservations.date, today), eq(reservations.status, 'active')))
    .all();

  const pendingUsers = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.status, 'pending'))
    .all().length;

  const byCourt = new Map<number, typeof todays>();
  for (let c = 1; c <= s.court_count; c++) byCourt.set(c, []);
  for (const r of todays) {
    const arr = byCourt.get(r.courtId);
    if (arr) arr.push(r);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">대시보드</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">오늘 ({today}) 활성 예약</p>
          <p className="mt-1 text-2xl font-bold">{todays.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">승인 대기 회원</p>
          <p className="mt-1 text-2xl font-bold">{pendingUsers}</p>
          {pendingUsers > 0 && (
            <Link href="/admin/users?status=pending" className="text-xs text-blue-700 hover:underline">
              회원 페이지로 →
            </Link>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">운영 시간 / 코트 수</p>
          <p className="mt-1 text-2xl font-bold">
            {s.operating_hour_start}–{s.operating_hour_end} · {s.court_count}면
          </p>
        </div>
      </div>

      <h3 className="mt-8 font-semibold">오늘의 예약 (코트별)</h3>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {[...byCourt.entries()].map(([court, list]) => (
          <div key={court} className="rounded-lg border bg-white p-4">
            <p className="font-medium">코트 {court}</p>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">예약 없음</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {list
                  .slice()
                  .sort((a, b) => a.startHour - b.startHour)
                  .map((r) => (
                    <li key={r.id}>
                      {String(r.startHour).padStart(2, '0')}:00 — {r.userName} (
                      {r.userDong && r.userHo ? `${r.userDong}-${r.userHo}` : '—'}, {r.partySize}명)
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
