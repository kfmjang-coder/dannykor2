import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import LogoutButton from '@/components/logout-button';

export default async function Home() {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  if (session.mustChangePassword) redirect('/password/change');

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const s = getSettings();
  const displayId =
    user.dong && user.ho ? `${user.dong}동 ${user.ho}호` : (user.email ?? '');

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">아파트 테니스장 예약</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            {user.name} ({displayId}){user.role === 'admin' && ' · 관리자'}
          </span>
          {user.role === 'admin' && (
            <Link href="/admin" className="rounded border px-3 py-1 hover:bg-gray-100">
              관리자
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>
      <p className="mt-4 text-gray-600">
        예약 화면(코트 × 시간 격자)은 M3 단계에서 구현 예정입니다.
      </p>
      <section className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">현재 운영 설정</h2>
        <ul className="mt-2 text-sm text-gray-700">
          <li>운영 시간: {s.operating_hour_start}:00 – {s.operating_hour_end}:00</li>
          <li>코트 수: {s.court_count}면</li>
          <li>예약 인원: {s.party_size_min} – {s.party_size_max}명</li>
          <li>예약 가능 기간: 오늘 + {s.reservation_horizon_days}일</li>
          <li>취소 마감: 시작 {s.cancel_deadline_hours}시간 전</li>
          <li>1인 1일 한도: {s.daily_reservation_limit_per_user}슬롯</li>
        </ul>
      </section>
    </main>
  );
}
