'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  id: number;
  userId: number;
  userName: string;
  userDong: string | null;
  userHo: string | null;
  userEmail: string | null;
  courtId: number;
  date: string;
  startHour: number;
  endHour: number;
  partySize: number;
  status: 'active' | 'cancelled';
  note: string | null;
};

type UserOption = {
  id: number;
  label: string;
};

export default function ReservationsAdmin({
  rows,
  userOptions,
  filter,
}: {
  rows: Row[];
  userOptions: UserOption[];
  filter: { from?: string; to?: string; status?: string; courtId?: string; userId?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  function applyFilter(form: HTMLFormElement) {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s) params.set(k, s);
    }
    router.push(`/admin/reservations${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function cancel(id: number) {
    if (!confirm('이 예약을 취소하시겠습니까?')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '실패');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function edit(row: Row) {
    const dateStr = prompt('날짜 (YYYY-MM-DD)', row.date);
    if (!dateStr) return;
    const hStr = prompt('시작 시각 (0-23)', String(row.startHour));
    if (!hStr) return;
    const cStr = prompt('코트', String(row.courtId));
    if (!cStr) return;
    const pStr = prompt('인원', String(row.partySize));
    if (!pStr) return;
    const note = prompt('비고 (선택)', row.note ?? '') ?? '';
    const startHour = Number(hStr);
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/reservations/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          startHour,
          endHour: startHour + 1,
          courtId: Number(cStr),
          partySize: Number(pStr),
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '실패');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createManual(form: HTMLFormElement) {
    const fd = new FormData(form);
    const userId = Number(fd.get('userId'));
    const date = String(fd.get('date'));
    const startHour = Number(fd.get('startHour'));
    const courtId = Number(fd.get('courtId'));
    const partySize = Number(fd.get('partySize'));
    const note = String(fd.get('note') ?? '');
    const res = await fetch('/api/admin/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        date,
        startHour,
        endHour: startHour + 1,
        courtId,
        partySize,
        note: note || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? '실패');
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <div>
      <details className="mb-4 rounded border bg-gray-50 p-3" open={false}>
        <summary className="cursor-pointer text-sm font-medium">+ 수기 대장 입력</summary>
        <form
          className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            createManual(e.currentTarget);
          }}
        >
          <select name="userId" required className="col-span-2 rounded border px-2 py-1">
            <option value="">사용자 선택</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
          <input
            name="date"
            type="date"
            required
            className="col-span-2 rounded border px-2 py-1 sm:col-span-1"
          />
          <input
            name="startHour"
            type="number"
            min={0}
            max={23}
            placeholder="시"
            required
            className="rounded border px-2 py-1"
          />
          <input
            name="courtId"
            type="number"
            min={1}
            placeholder="코트"
            required
            className="rounded border px-2 py-1"
          />
          <input
            name="partySize"
            type="number"
            min={1}
            placeholder="인원"
            required
            className="col-span-2 rounded border px-2 py-1 sm:col-span-1"
          />
          <input
            name="note"
            placeholder="비고 (선택)"
            className="col-span-2 rounded border px-2 py-1 sm:col-span-4"
          />
          <button
            type="submit"
            className="col-span-2 rounded bg-gray-900 px-3 py-1 text-white"
          >
            입력
          </button>
        </form>
      </details>

      <form
        className="mb-4 flex flex-wrap items-end gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilter(e.currentTarget);
        }}
      >
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">시작일</span>
          <input
            type="date"
            name="from"
            defaultValue={filter.from ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">종료일</span>
          <input
            type="date"
            name="to"
            defaultValue={filter.to ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">상태</span>
          <select name="status" defaultValue={filter.status ?? ''} className="rounded border px-2 py-1">
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="cancelled">취소</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">코트</span>
          <input
            type="number"
            name="courtId"
            defaultValue={filter.courtId ?? ''}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">사용자 ID</span>
          <input
            type="number"
            name="userId"
            defaultValue={filter.userId ?? ''}
            className="w-24 rounded border px-2 py-1"
          />
        </label>
        <button type="submit" className="rounded border px-3 py-1 hover:bg-gray-100">
          검색
        </button>
      </form>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-2 py-2">id</th>
            <th className="px-2 py-2">날짜</th>
            <th className="px-2 py-2">시간</th>
            <th className="px-2 py-2">코트</th>
            <th className="px-2 py-2">예약자</th>
            <th className="px-2 py-2">인원</th>
            <th className="px-2 py-2">상태</th>
            <th className="px-2 py-2">비고</th>
            <th className="px-2 py-2 text-right">작업</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="px-2 py-2 text-gray-500">{r.id}</td>
              <td className="px-2 py-2">{r.date}</td>
              <td className="px-2 py-2">
                {String(r.startHour).padStart(2, '0')}:00–{String(r.endHour).padStart(2, '0')}:00
              </td>
              <td className="px-2 py-2">{r.courtId}</td>
              <td className="px-2 py-2">
                {r.userName}
                <br />
                <span className="text-xs text-gray-500">
                  {r.userDong && r.userHo ? `${r.userDong}-${r.userHo}` : (r.userEmail ?? '—')}
                </span>
              </td>
              <td className="px-2 py-2">{r.partySize}명</td>
              <td className="px-2 py-2">
                <span className={r.status === 'active' ? 'text-green-700' : 'text-gray-400'}>
                  {r.status === 'active' ? '활성' : '취소'}
                </span>
              </td>
              <td className="px-2 py-2 text-xs text-gray-600">{r.note ?? ''}</td>
              <td className="px-2 py-2 text-right">
                {r.status === 'active' && (
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => edit(r)}
                      disabled={busy === r.id}
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => cancel(r.id)}
                      disabled={busy === r.id}
                      className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      취소
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-2 py-6 text-center text-sm text-gray-500">
                예약이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
