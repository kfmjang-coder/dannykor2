'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CancelReservationButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm('이 예약을 취소하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '취소에 실패했습니다.');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={loading}
      className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? '…' : '취소'}
    </button>
  );
}
