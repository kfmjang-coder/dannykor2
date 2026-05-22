'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: number;
  dong: string | null;
  ho: string | null;
  email: string | null;
  name: string;
  phone: string | null;
  role: 'user' | 'admin';
  status: 'pending' | 'active' | 'suspended';
  mustChangePassword: boolean;
  createdAt: number;
  approvedAt: number | null;
};

export default function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function patch(id: number, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  async function resetPassword(id: number) {
    const newPassword = prompt('새 임시 비밀번호 (8자 이상):');
    if (!newPassword) return;
    if (newPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '실패');
        return;
      }
      alert('비밀번호가 초기화되었습니다. 사용자의 첫 로그인 시 변경이 강제됩니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-gray-50 text-left">
          <th className="px-2 py-2">식별자</th>
          <th className="px-2 py-2">이름</th>
          <th className="px-2 py-2">권한</th>
          <th className="px-2 py-2">상태</th>
          <th className="px-2 py-2">전화</th>
          <th className="px-2 py-2 text-right">작업</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => {
          const ident = u.dong && u.ho ? `${u.dong}-${u.ho}` : (u.email ?? '—');
          const isSelf = u.id === currentUserId;
          return (
            <tr key={u.id} className="border-b align-top">
              <td className="px-2 py-2 font-mono">{ident}</td>
              <td className="px-2 py-2">
                {u.name}
                {u.mustChangePassword && (
                  <span className="ml-1 rounded bg-yellow-100 px-1 text-xs">PW 변경 필요</span>
                )}
              </td>
              <td className="px-2 py-2">{u.role === 'admin' ? '관리자' : '주민'}</td>
              <td className="px-2 py-2">
                <span
                  className={
                    u.status === 'active'
                      ? 'text-green-700'
                      : u.status === 'pending'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                  }
                >
                  {u.status === 'active' ? '활성' : u.status === 'pending' ? '대기' : '정지'}
                </span>
              </td>
              <td className="px-2 py-2 text-gray-600">{u.phone ?? '—'}</td>
              <td className="px-2 py-2 text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {u.status === 'pending' && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { status: 'active' })}
                    >
                      승인
                    </button>
                  )}
                  {u.status === 'active' && !isSelf && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { status: 'suspended' })}
                    >
                      정지
                    </button>
                  )}
                  {u.status === 'suspended' && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { status: 'active' })}
                    >
                      복구
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                    disabled={busy === u.id}
                    onClick={() => resetPassword(u.id)}
                  >
                    PW 초기화
                  </button>
                  {u.role === 'user' && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { role: 'admin' })}
                    >
                      관리자로
                    </button>
                  )}
                  {u.role === 'admin' && !isSelf && (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100"
                      disabled={busy === u.id}
                      onClick={() => patch(u.id, { role: 'user' })}
                    >
                      주민으로
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
        {users.length === 0 && (
          <tr>
            <td colSpan={6} className="px-2 py-6 text-center text-sm text-gray-500">
              회원이 없습니다.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
