import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const src = process.env.DATABASE_URL ?? './data/app.db';
const backupDir = process.env.BACKUP_DIR ?? './data/backups';
const keep = Number(process.env.BACKUP_KEEP ?? '30');

mkdirSync(backupDir, { recursive: true });

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const dest = join(backupDir, `app-${stamp()}.db`);

async function main() {
  const db = new Database(src, { readonly: true, fileMustExist: true });
  try {
    await db.backup(dest);
    console.log(`Backup saved: ${dest}`);
  } finally {
    db.close();
  }

  if (keep > 0) {
    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith('app-') && f.endsWith('.db'))
      .map((f) => ({ f, path: join(backupDir, f), mtime: statSync(join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const old of files.slice(keep)) {
      unlinkSync(old.path);
      console.log(`Removed old backup: ${old.f}`);
    }
  }
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
