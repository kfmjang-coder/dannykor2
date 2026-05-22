import { copyFileSync, existsSync, renameSync } from 'node:fs';
import { argv, exit } from 'node:process';

const backupFile = argv[2];
if (!backupFile) {
  console.error('Usage: tsx scripts/restore.ts <backup-file>');
  exit(1);
}
if (!existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  exit(1);
}

const target = process.env.DATABASE_URL ?? './data/app.db';

if (existsSync(target)) {
  const safetyCopy = `${target}.before-restore-${Date.now()}`;
  renameSync(target, safetyCopy);
  console.log(`Existing DB moved aside: ${safetyCopy}`);
}

copyFileSync(backupFile, target);
console.log(`Restored ${backupFile} -> ${target}`);
console.log('Restart the app to pick up the restored database.');
