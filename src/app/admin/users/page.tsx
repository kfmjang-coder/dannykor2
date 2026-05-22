import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import NewUserForm from './new-user-form';
import UsersTable from './users-table';

export default async function AdminUsersPage() {
  const me = (await getCurrentUser())!;
  const rows = db.select().from(users).orderBy(desc(users.createdAt)).all();
  const safe = rows.map(({ passwordHash: _omit, ...rest }) => rest);
  const pending = safe.filter((u) => u.status === 'pending').length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">회원 관리</h2>
        {pending > 0 && <span className="text-sm text-yellow-700">승인 대기: {pending}건</span>}
      </div>
      <details className="mt-4" open={false}>
        <summary className="cursor-pointer text-sm font-medium">+ 새 회원 추가</summary>
        <div className="mt-2">
          <NewUserForm />
        </div>
      </details>
      <div className="mt-6">
        <UsersTable users={safe} currentUserId={me.id} />
      </div>
    </div>
  );
}
