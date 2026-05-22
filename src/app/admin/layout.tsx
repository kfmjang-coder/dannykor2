import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from '@/components/logout-button';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (me.role !== 'admin') redirect('/');

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">관리자</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="rounded border px-3 py-1 hover:bg-gray-100">
            ← 예약 화면
          </Link>
          <span className="text-gray-600">{me.name}</span>
          <LogoutButton />
        </div>
      </header>
      <nav className="mt-4 flex flex-wrap gap-3 border-b pb-2 text-sm sm:gap-4">
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
