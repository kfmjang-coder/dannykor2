import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { DEFAULT_SETTINGS, type SettingKey } from './settings-defaults';

export type AppSettings = { [K in SettingKey]: number };

export function getSettings(): AppSettings {
  const rows = db.select().from(settings).all();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result = {} as AppSettings;
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    const raw = map.get(key);
    result[key] = raw !== undefined ? Number(raw) : DEFAULT_SETTINGS[key];
  }
  return result;
}
