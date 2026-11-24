import { NextRequest, NextResponse } from 'next/server';
import { createLink, getDb, getGlobalStats, listLinks } from '@/lib/db';
import { createLinkSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('q') ?? undefined;
  const db = getDb();
  const links = listLinks(db, search);
  const stats = getGlobalStats(db);

  return NextResponse.json({ links, stats });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Invalid input',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const link = createLink(db, parsed.data);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'This custom alias is already taken. Please choose another.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create short link' },
      { status: 500 }
    );
  }
}
