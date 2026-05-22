import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import ChangePasswordForm from './change-form';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  return <ChangePasswordForm />;
}
