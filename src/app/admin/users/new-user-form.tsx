'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewUserForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'dong-ho' | 'email'>('dong-ho');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name, password, role };
      if (mode === 'dong-ho') {
        body.dong = dong;
        body.ho = ho;
      } else {
        body.email = email;
      }
      if (phone) body.phone = phone;
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '생성 실패');
        return;
      }
      setDong('');
      setHo('');
      setEmail('');
      setName('');
      setPhone('');
      setPassword('');
      setRole('user');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 rounded border bg-gray-50 p-4 text-sm">
      <div className="col-span-2 flex gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === 'dong-ho'}
            onChange={() => setMode('dong-ho')}
          />
          동/호수
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === 'email'} onChange={() => setMode('email')} />
          이메일
        </label>
      </div>
      {mode === 'dong-ho' ? (
        <>
          <input
            placeholder="동 (예: 101)"
            className="rounded border px-2 py-1"
            value={dong}
            onChange={(e) => setDong(e.target.value)}
            required
          />
          <input
            placeholder="호 (예: 1502)"
            className="rounded border px-2 py-1"
            value={ho}
            onChange={(e) => setHo(e.target.value)}
            required
          />
        </>
      ) : (
        <input
          placeholder="이메일"
          type="email"
          className="col-span-2 rounded border px-2 py-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      )}
      <input
        placeholder="이름"
        className="rounded border px-2 py-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        placeholder="전화 (선택)"
        className="rounded border px-2 py-1"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        placeholder="임시 비밀번호 (8자 이상)"
        type="password"
        minLength={8}
        className="rounded border px-2 py-1"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <select
        className="rounded border px-2 py-1"
        value={role}
        onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
      >
        <option value="user">주민</option>
        <option value="admin">관리자</option>
      </select>
      {error && <p className="col-span-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="col-span-2 rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? '추가 중…' : '회원 추가'}
      </button>
    </form>
  );
}
