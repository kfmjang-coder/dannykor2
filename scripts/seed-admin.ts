import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { db, sqlite } from '../src/db/client';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function prompt(rl: readline.Interface, q: string, def?: string): Promise<string> {
  const suffix = def ? ` [${def}]` : '';
  const ans = (await rl.question(`${q}${suffix}: `)).trim();
  return ans || def || '';
}

async function main() {
  const envEmail = process.env.ADMIN_EMAIL;
  const envName = process.env.ADMIN_NAME;
  const envPassword = process.env.ADMIN_PASSWORD;
  const allFromEnv = envEmail && envName && envPassword;

  let email: string;
  let name: string;
  let password: string;
  const rl = allFromEnv
    ? null
    : readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log('=== Tennis reservation: seed admin ===');
    if (allFromEnv) {
      email = envEmail!;
      name = envName!;
      password = envPassword!;
      console.log('Using ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD env vars.');
    } else {
      email = envEmail ?? (await prompt(rl!, 'Admin email', 'kfmjang@gmail.com'));
      name = envName ?? (await prompt(rl!, 'Admin name', '관리자'));
      password = envPassword ?? (await prompt(rl!, 'Password (min 8 chars)'));
    }

    if (!email || !email.includes('@')) throw new Error('Invalid email.');
    if (!name) throw new Error('Name required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    const existing = db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      console.log(`User with email ${email} already exists (id=${existing.id}). Aborting.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();
    const inserted = db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        role: 'admin',
        status: 'active',
        mustChangePassword: false,
        createdAt: now,
        approvedAt: now,
      })
      .returning()
      .get();

    console.log(`Admin created: id=${inserted.id}, email=${inserted.email}`);
  } finally {
    rl?.close();
    sqlite.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
