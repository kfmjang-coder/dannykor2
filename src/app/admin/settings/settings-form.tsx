'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Settings = {
  operating_hour_start: number;
  operating_hour_end: number;
  court_count: number;
  party_size_min: number;
  party_size_max: number;
  reservation_horizon_days: number;
  cancel_deadline_hours: number;
  daily_reservation_limit_per_user: number;
};

const LABELS: Record<keyof Settings, string> = {
  operating_hour_start: '운영 시작 시 (0–23)',
  operating_hour_end: '운영 종료 시 (1–24)',
  court_count: '코트 수',
  party_size_min: '최소 인원',
  party_size_max: '최대 인원',
  reservation_horizon_days: '예약 가능 일수',
  cancel_deadline_hours: '취소 마감 시간 (예약 시작 기준 N시간 전)',
  daily_reservation_limit_per_user: '1인 1일 예약 수 한도',
};

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [values, setValues] = useState<Settings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<
    { id: number; date: string; startHour: number; courtId: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const dirty = (Object.keys(values) as (keyof Settings)[]).some((k) => values[k] !== initial[k]);

  async function save() {
    setError(null);
    setFieldErrors({});
    setConflicts([]);
    setSuccess(false);
    setLoading(true);
    try {
      const updates: Record<string, number> = {};
      for (const k of Object.keys(values) as (keyof Settings)[]) {
        if (values[k] !== initial[k]) updates[k] = values[k];
      }
      if (Object.keys(updates).length === 0) return;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '저장 실패');
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        if (data.conflicts) setConflicts(data.conflicts);
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <table className="w-full text-sm">
        <tbody>
          {(Object.keys(values) as (keyof Settings)[]).map((k) => (
            <tr key={k} className="border-b">
              <td className="py-2 pr-4 font-medium">{LABELS[k]}</td>
              <td className="py-2">
                <input
                  type="number"
                  className="w-24 rounded border px-2 py-1"
                  value={values[k]}
                  onChange={(e) => setValues({ ...values, [k]: Number(e.target.value) })}
                />
                {fieldErrors[k] && <span className="ml-2 text-xs text-red-600">{fieldErrors[k]}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {conflicts.length > 0 && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm">
          <p className="font-medium">충돌 예약 ({conflicts.length}건):</p>
          <ul className="mt-1 list-disc pl-5">
            {conflicts.slice(0, 10).map((c) => (
              <li key={c.id}>
                {c.date} {String(c.startHour).padStart(2, '0')}:00 — 코트 {c.courtId} (id={c.id})
              </li>
            ))}
            {conflicts.length > 10 && <li>… 외 {conflicts.length - 10}건</li>}
          </ul>
        </div>
      )}
      {success && <p className="mt-3 text-sm text-green-700">저장되었습니다.</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={loading || !dirty}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => {
            setValues(initial);
            setError(null);
            setFieldErrors({});
            setConflicts([]);
            setSuccess(false);
          }}
          disabled={!dirty || loading}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          되돌리기
        </button>
      </div>
    </div>
  );
}
