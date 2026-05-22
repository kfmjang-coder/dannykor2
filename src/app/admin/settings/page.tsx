import { getSettings } from '@/lib/settings';
import SettingsForm from './settings-form';

export default function AdminSettingsPage() {
  const s = getSettings();
  return (
    <div>
      <h2 className="text-lg font-semibold">운영 설정</h2>
      <p className="mt-1 text-sm text-gray-500">
        모든 값은 즉시 반영됩니다. 코트 수를 줄일 때 미래 예약과 충돌하면 변경이 거절됩니다.
      </p>
      <div className="mt-4">
        <SettingsForm initial={s} />
      </div>
    </div>
  );
}
