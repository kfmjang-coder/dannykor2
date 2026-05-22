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
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {canPrev ? (
        <Link href={`/?date=${prev}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
          ←
        </Link>
      ) : (
        <span className="rounded border px-3 py-1 text-sm text-gray-400">←</span>
      )}
      <span className="px-2 text-base font-medium sm:text-lg">{date}</span>
      {canNext ? (
        <Link href={`/?date=${next}`} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
          →
        </Link>
      ) : (
        <span className="rounded border px-3 py-1 text-sm text-gray-400">→</span>
      )}
      <Link
        href={`/?date=${today}`}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
      >
        오늘
      </Link>
      <span className="ml-auto whitespace-nowrap text-xs text-gray-500">
        예약: ~ {max}
      </span>
    </div>
  );
}
