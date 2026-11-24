import { describe, expect, it } from 'vitest';
import {
  createDatabase,
  createLink,
  deleteLinkByCode,
  getGlobalStats,
  getLinkAnalytics,
  getLinkByCode,
  isLinkExpired,
  listLinks,
  recordClick,
} from '@/lib/db';
import { extractReferrerHost, hashIp, parseUserAgent } from '@/lib/user-agent';
import { createLinkSchema } from '@/lib/validation';

describe('URL & Alias Validation', () => {
  it('accepts valid https URLs and custom aliases', () => {
    const result = createLinkSchema.safeParse({
      url: 'https://github.com/vercel/next.js',
      customCode: 'nextjs-repo',
      title: 'Next.js GitHub',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsafe protocols like javascript:', () => {
    const result = createLinkSchema.safeParse({
      url: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reserved aliases', () => {
    const result = createLinkSchema.safeParse({
      url: 'https://example.com',
      customCode: 'api',
    });
    expect(result.success).toBe(false);
  });
});

describe('User-Agent & Privacy Helpers', () => {
  it('parses mobile Safari on iOS', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(parsed).toEqual({ device: 'Mobile', browser: 'Safari', os: 'iOS' });
  });

  it('parses desktop Chrome on macOS', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    );
    expect(parsed).toEqual({ device: 'Desktop', browser: 'Chrome', os: 'macOS' });
  });

  it('extracts referrer hostnames cleanly', () => {
    expect(extractReferrerHost('https://www.reddit.com/r/webdev')).toBe('reddit.com');
    expect(extractReferrerHost(null)).toBe('Direct');
  });

  it('hashes IP addresses deterministically without storing raw IP', () => {
    const h1 = hashIp('203.0.113.10');
    const h2 = hashIp('203.0.113.10');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('203.0.113.10');
  });
});

describe('SQLite Repository & Analytics', () => {
  it('creates links, records clicks, computes analytics, and deletes links', () => {
    const db = createDatabase(':memory:');

    const link = createLink(db, {
      url: 'https://example.com/docs',
      customCode: 'docs',
      title: 'Documentation',
    });
    expect(link.code).toBe('docs');

    recordClick(db, {
      linkId: link.id,
      ipHash: 'hash-a',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
      referrer: 'github.com',
    });
    recordClick(db, {
      linkId: link.id,
      ipHash: 'hash-a',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
      referrer: 'Direct',
    });
    recordClick(db, {
      linkId: link.id,
      ipHash: 'hash-b',
      device: 'Mobile',
      browser: 'Safari',
      os: 'iOS',
      referrer: 'github.com',
    });

    const fetched = getLinkByCode(db, 'docs');
    expect(fetched?.click_count).toBe(3);

    const analytics = getLinkAnalytics(db, 'docs', 7);
    expect(analytics?.totalClicks).toBe(3);
    expect(analytics?.uniqueVisitors).toBe(2);
    expect(analytics?.clicksByDay).toHaveLength(7);
    expect(analytics?.devices[0]).toEqual({ name: 'Desktop', count: 2 });

    const stats = getGlobalStats(db);
    expect(stats.totalLinks).toBe(1);
    expect(stats.totalClicks).toBe(3);
    expect(stats.topLink?.code).toBe('docs');

    expect(listLinks(db, 'doc')).toHaveLength(1);
    expect(deleteLinkByCode(db, 'docs')).toBe(true);
    expect(getLinkByCode(db, 'docs')).toBeUndefined();

    db.close();
  });

  it('detects expired links accurately', () => {
    expect(isLinkExpired({ expires_at: null })).toBe(false);
    expect(isLinkExpired({ expires_at: '2020-01-01T00:00:00.000Z' })).toBe(true);
    expect(isLinkExpired({ expires_at: '2099-01-01T00:00:00.000Z' })).toBe(false);
  });
});
