import { getSettings } from '@/lib/settings';

export default function Home() {
  const s = getSettings();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">아파트 테니스장 예약</h1>
      <p className="mt-2 text-gray-600">
        M1 스캐폴딩 완료. 로그인 및 예약 화면은 M2/M3 단계에서 구현 예정입니다.
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
