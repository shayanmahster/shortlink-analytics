import { NextRequest, NextResponse } from 'next/server';
import { getDb, getLinkByCode, isLinkExpired, recordClick } from '@/lib/db';
import { extractReferrerHost, hashIp, parseUserAgent } from '@/lib/user-agent';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const db = getDb();
  const link = getLinkByCode(db, code);

  if (!link) {
    return NextResponse.json(
      { error: 'Short link not found' },
      { status: 404 }
    );
  }

  if (isLinkExpired(link)) {
    return NextResponse.json(
      { error: 'This short link has expired' },
      { status: 410 }
    );
  }

  const ua = parseUserAgent(request.headers.get('user-agent'));
  const referrer = extractReferrerHost(request.headers.get('referer'));
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'local';

  recordClick(db, {
    linkId: link.id,
    ipHash: hashIp(ip),
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
    referrer,
  });

  return NextResponse.redirect(link.original_url, { status: 302 });
}
