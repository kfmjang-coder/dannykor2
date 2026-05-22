import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from '@/components/logout-button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (me.role !== 'admin') redirect('/');

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">관리자</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="rounded border px-3 py-1 hover:bg-gray-100">
            ← 예약 화면
          </Link>
          <span className="text-gray-600">{me.name}</span>
          <LogoutButton />
        </div>
      </header>
      <nav className="mt-4 flex gap-4 border-b pb-2 text-sm">
        <Link href="/admin" className="hover:underline">
          대시보드
        </Link>
        <Link href="/admin/users" className="hover:underline">
          회원
        </Link>
        <Link href="/admin/reservations" className="hover:underline">
          예약
        </Link>
        <Link href="/admin/settings" className="hover:underline">
          설정
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
