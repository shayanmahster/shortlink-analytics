import { NextRequest, NextResponse } from 'next/server';
import { deleteLinkByCode, getDb, getLinkAnalytics } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? '14');
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 7), 90) : 14;

  const db = getDb();
  const analytics = getLinkAnalytics(db, code, days);

  if (!analytics) {
    return NextResponse.json({ error: 'Short link not found' }, { status: 404 });
  }

  return NextResponse.json(analytics);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const db = getDb();
  const deleted = deleteLinkByCode(db, code);

  if (!deleted) {
    return NextResponse.json({ error: 'Short link not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, code });
}
