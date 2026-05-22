import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db, sqlite } from '../src/db/client';
import { users } from '../src/db/schema';

type Row = { dong: string; ho: string; name: string; phone?: string; email?: string };

function parseCsv(text: string): Row[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    dong: header.indexOf('dong'),
    ho: header.indexOf('ho'),
    name: header.indexOf('name'),
    phone: header.indexOf('phone'),
    email: header.indexOf('email'),
  };
  if (idx.dong < 0 || idx.ho < 0 || idx.name < 0) {
    throw new Error('CSV must have columns: dong, ho, name (phone, email optional)');
  }
  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Row = {
      dong: cols[idx.dong] ?? '',
      ho: cols[idx.ho] ?? '',
      name: cols[idx.name] ?? '',
    };
    if (idx.phone >= 0 && cols[idx.phone]) row.phone = cols[idx.phone];
    if (idx.email >= 0 && cols[idx.email]) row.email = cols[idx.email];
    if (!row.dong || !row.ho || !row.name) {
      throw new Error(`Row ${i + 2}: dong/ho/name required`);
    }
    return row;
  });
}

function genPassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npm run import:users -- <path/to/users.csv>');
    console.error('CSV columns: dong, ho, name, phone (opt), email (opt)');
    process.exit(1);
  }
  const resolved = resolve(csvPath);
  const text = readFileSync(resolved, 'utf8');
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows from ${resolved}`);

  const created: Array<{ dong: string; ho: string; name: string; tempPassword: string }> = [];
  const skipped: Array<{ dong: string; ho: string; reason: string }> = [];

  for (const r of rows) {
    const dup = db
      .select()
      .from(users)
      .where(and(eq(users.dong, r.dong), eq(users.ho, r.ho)))
      .get();
    if (dup) {
      skipped.push({ dong: r.dong, ho: r.ho, reason: `already exists (id=${dup.id})` });
      continue;
    }
    if (r.email) {
      const dupEmail = db.select().from(users).where(eq(users.email, r.email)).get();
      if (dupEmail) {
        skipped.push({ dong: r.dong, ho: r.ho, reason: `email taken (id=${dupEmail.id})` });
        continue;
      }
    }
    const tempPassword = genPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const now = Date.now();
    db.insert(users).values({
      dong: r.dong,
      ho: r.ho,
      name: r.name,
      phone: r.phone ?? null,
      email: r.email ?? null,
      passwordHash,
      role: 'user',
      status: 'active',
      mustChangePassword: true,
      createdAt: now,
      approvedAt: now,
    }).run();
    created.push({ dong: r.dong, ho: r.ho, name: r.name, tempPassword });
  }

  console.log(`\nCreated: ${created.length}, Skipped: ${skipped.length}`);
  if (skipped.length) {
    console.log('\n--- Skipped ---');
    skipped.forEach((s) => console.log(`  ${s.dong}-${s.ho}: ${s.reason}`));
  }
  if (created.length) {
    const outPath = resolve(csvPath.replace(/\.csv$/i, '') + '.passwords.csv');
    const header = 'dong,ho,name,temp_password\n';
    const body = created.map((c) => `${c.dong},${c.ho},${c.name},${c.tempPassword}`).join('\n');
    writeFileSync(outPath, header + body + '\n', 'utf8');
    console.log(`\nTemp passwords written to: ${outPath}`);
    console.log('  Distribute these to residents. They will be forced to change on first login.');
  }
  sqlite.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
