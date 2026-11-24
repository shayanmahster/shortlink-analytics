import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getDb, getLinkByCode } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const db = getDb();
  const link = getLinkByCode(db, code);

  if (!link) {
    return NextResponse.json({ error: 'Short link not found' }, { status: 404 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || request.nextUrl.origin;
  const shortUrl = `${baseUrl}/${link.code}`;

  const pngBuffer = await QRCode.toBuffer(shortUrl, {
    type: 'png',
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="qr-${link.code}.png"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
