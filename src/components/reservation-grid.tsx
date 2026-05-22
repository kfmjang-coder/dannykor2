'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type GridReservation = {
  id: number;
  courtId: number;
  startHour: number;
  partySize: number;
  userName: string;
  userDong: string | null;
  userHo: string | null;
  mine: boolean;
};

export type GridProps = {
  date: string;
  today: string;
  hourStart: number;
  hourEnd: number;
  courtCount: number;
  partySizeMin: number;
  partySizeMax: number;
  reservations: GridReservation[];
};

type SelectedSlot = { courtId: number; startHour: number };

export default function ReservationGrid(props: GridProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [partySize, setPartySize] = useState(props.partySizeMin);
  const [error, setError] = useState<string | null>(null);

  const map = new Map<string, GridReservation>();
  for (const r of props.reservations) {
    map.set(`${r.courtId}-${r.startHour}`, r);
  }

  const hours: number[] = [];
  for (let h = props.hourStart; h < props.hourEnd; h++) hours.push(h);
  const courts: number[] = [];
  for (let c = 1; c <= props.courtCount; c++) courts.push(c);

  const isPast = (hour: number): boolean => {
    if (props.date > props.today) return false;
    if (props.date < props.today) return true;
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600 * 1000);
    return hour <= kst.getUTCHours();
  };

  async function submitReservation() {
    if (!selected) return;
    setError(null);
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courtId: selected.courtId,
        startHour: selected.startHour,
        date: props.date,
        partySize,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? '예약에 실패했습니다.');
      return;
    }
    setSelected(null);
    startTransition(() => router.refresh());
  }

  async function cancelReservation(id: number) {
    if (!confirm('이 예약을 취소하시겠습니까?')) return;
    const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? '취소에 실패했습니다.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4">
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[420px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-14 border bg-gray-100 px-1 py-1 text-xs sm:w-20 sm:px-2 sm:text-sm">
                시간
              </th>
              {courts.map((c) => (
                <th key={c} className="border bg-gray-100 px-1 py-1 text-xs sm:px-2 sm:text-sm">
                  코트 {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td className="border px-1 py-1 text-center text-xs text-gray-600 sm:px-2 sm:text-sm">
                  {String(h).padStart(2, '0')}:00
                </td>
                {courts.map((c) => {
                  const r = map.get(`${c}-${h}`);
                  const past = isPast(h);
                  if (r) {
                    const who = r.userDong && r.userHo ? `${r.userDong}-${r.userHo}` : r.userName;
                    return (
                      <td
                        key={c}
                        className={`border px-1 py-1.5 sm:px-2 sm:py-2 ${
                          r.mine ? 'bg-blue-50' : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="break-keep text-xs sm:text-sm">
                            {r.mine ? '내 예약' : who} ({r.partySize}명)
                          </span>
                          {r.mine && (
                            <button
                              type="button"
                              onClick={() => cancelReservation(r.id)}
                              disabled={pending}
                              className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c}
                      className={`border px-1 py-1.5 sm:px-2 sm:py-2 ${past ? 'bg-gray-100' : ''}`}
                    >
                      {past ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelected({ courtId: c, startHour: h });
                            setPartySize(props.partySizeMin);
                            setError(null);
                          }}
                          disabled={pending}
                          className="w-full rounded border border-dashed border-gray-300 px-1 py-1 text-xs text-gray-500 hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          + 예약
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">예약하기</h3>
            <p className="mt-1 text-sm text-gray-600">
              {props.date} · 코트 {selected.courtId} ·{' '}
              {String(selected.startHour).padStart(2, '0')}:00–
              {String(selected.startHour + 1).padStart(2, '0')}:00
            </p>
            <label className="mt-4 block text-sm font-medium" htmlFor="party">
              인원수 ({props.partySizeMin}–{props.partySizeMax}명)
            </label>
            <input
              id="party"
              type="number"
              min={props.partySizeMin}
              max={props.partySizeMax}
              className="mt-1 w-full rounded border px-3 py-2"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded border px-3 py-1 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitReservation}
                disabled={pending}
                className="rounded bg-gray-900 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {pending ? '저장 중…' : '예약'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
