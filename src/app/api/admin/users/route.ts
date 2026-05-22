import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  const rows = db
    .select({
      id: users.id,
      dong: users.dong,
      ho: users.ho,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      approvedAt: users.approvedAt,
    })
    .from(users)
    .where(status && ['pending', 'active', 'suspended'].includes(status) ? eq(users.status, status as 'pending' | 'active' | 'suspended') : undefined)
    .orderBy(desc(users.createdAt))
    .all();

  return NextResponse.json({ users: rows });
}

const createSchema = z
  .object({
    dong: z.string().regex(/^\d+$/).optional(),
    ho: z.string().min(1).optional(),
    email: z.string().email().optional(),
    name: z.string().min(1),
    phone: z.string().optional(),
    password: z.string().min(MIN_PASSWORD_LENGTH),
    role: z.enum(['user', 'admin']).default('user'),
  })
  .refine((v) => (v.dong && v.ho) || v.email, {
    message: '동/호수 또는 이메일이 필요합니다.',
  });

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  if (parsed.data.dong && parsed.data.ho) {
    const dup = db
      .select()
      .from(users)
      .where(and(eq(users.dong, parsed.data.dong), eq(users.ho, parsed.data.ho)))
      .get();
    if (dup) {
      return NextResponse.json({ error: '이미 등록된 동/호수입니다.' }, { status: 409 });
    }
  }
  if (parsed.data.email) {
    const dup = db
      .select()
      .from(users)
      .where(and(eq(users.email, parsed.data.email), isNotNull(users.email)))
      .get();
    if (dup) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 });
    }
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = Date.now();
  const inserted = db
    .insert(users)
    .values({
      dong: parsed.data.dong ?? null,
      ho: parsed.data.ho ?? null,
      email: parsed.data.email ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      passwordHash,
      role: parsed.data.role,
      status: 'active',
      mustChangePassword: true,
      createdAt: now,
      approvedAt: now,
    })
    .returning()
    .get();

  const { passwordHash: _omit, ...safe } = inserted;
  return NextResponse.json({ user: safe });
}
