import { db, sqlite } from './client';
import { settings } from './schema';
import { DEFAULT_SETTINGS } from '../lib/settings-defaults';

const now = Date.now();

const rows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
  key,
  value: String(value),
  updatedAt: now,
}));

db.insert(settings).values(rows).onConflictDoNothing().run();
console.log(`Seeded ${rows.length} setting keys (existing keys untouched).`);
sqlite.close();
