import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

// Sonde de santé : indique seulement « ok » ou « dégradé », jamais le détail de la panne.
export async function GET() {
  try {
    getServerEnv();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503 });
  }
}
