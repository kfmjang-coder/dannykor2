import Link from 'next/link';
import { addDaysKst } from '@/lib/kst';

export default function DateNav({
  date,
  today,
  horizonDays,
}: {
  date: string;
  today: string;
  horizonDays: number;
}) {
  const prev = addDaysKst(date, -1);
  const next = addDaysKst(date, 1);
  const max = addDaysKst(today, horizonDays);
  const canPrev = prev >= today;
  const canNext = next <= max;

  return (
    <div className="mt-4 flex items-center gap-2">
      {canPrev ? (
        <Link href={`/?date=${prev}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
          ← 이전
        </Link>
      ) : (
        <span className="rounded border px-3 py-1 text-sm text-gray-400">← 이전</span>
      )}
      <span className="px-2 text-lg font-medium">{date}</span>
      {canNext ? (
        <Link href={`/?date=${next}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
          다음 →
        </Link>
      ) : (
        <span className="rounded border px-3 py-1 text-sm text-gray-400">다음 →</span>
      )}
      <Link
        href={`/?date=${today}`}
        className="ml-2 rounded border px-3 py-1 text-sm hover:bg-gray-100"
      >
        오늘
      </Link>
      <span className="ml-auto text-xs text-gray-500">
        예약 가능: {today} ~ {max}
      </span>
    </div>
  );
}
