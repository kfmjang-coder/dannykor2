import { db } from '@/db/client';
import { settings } from '@/db/schema';

export async function GET() {
  try {
    db.select({ k: settings.key }).from(settings).limit(1).all();
    return Response.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
