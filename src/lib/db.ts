import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

export interface LinkRecord {
  id: number;
  code: string;
  original_url: string;
  title: string | null;
  created_at: string;
  expires_at: string | null;
  click_count: number;
}

export interface ClickEventInput {
  linkId: number;
  ipHash: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
}

export interface BreakdownItem {
  name: string;
  count: number;
}

export interface DailyClicksItem {
  date: string;
  clicks: number;
}

export interface LinkAnalytics {
  link: LinkRecord;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDay: DailyClicksItem[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  referrers: BreakdownItem[];
  recentClicks: Array<{
    id: number;
    clicked_at: string;
    device: string;
    browser: string;
    os: string;
    referrer: string;
  }>;
}

export interface GlobalStats {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  topLink: { code: string; title: string | null; click_count: number } | null;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_hash TEXT NOT NULL,
    device TEXT NOT NULL,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    referrer TEXT NOT NULL,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_links_code ON links(code);
  CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
  CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);
`;

export function createDatabase(dbPath?: string): Database.Database {
  const resolvedPath =
    dbPath ?? process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'shortlink.db');

  if (resolvedPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

let singletonDb: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!singletonDb) {
    singletonDb = createDatabase();
  }
  return singletonDb;
}

export function createLink(
  db: Database.Database,
  params: { url: string; customCode?: string; title?: string; expiresAt?: string }
): LinkRecord {
  const code = params.customCode || nanoid(6);
  const expiresAtIso = params.expiresAt ? new Date(params.expiresAt).toISOString() : null;

  const stmt = db.prepare(`
    INSERT INTO links (code, original_url, title, expires_at)
    VALUES (@code, @original_url, @title, @expires_at)
  `);

  const result = stmt.run({
    code,
    original_url: params.url,
    title: params.title ?? null,
    expires_at: expiresAtIso,
  });

  const created = db
    .prepare(
      `SELECT l.*, 0 AS click_count FROM links l WHERE l.id = ?`
    )
    .get(result.lastInsertRowid) as LinkRecord;

  return created;
}

export function getLinkByCode(db: Database.Database, code: string): LinkRecord | undefined {
  return db
    .prepare(
      `
      SELECT l.*, COUNT(c.id) AS click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      WHERE l.code = ?
      GROUP BY l.id
      `
    )
    .get(code) as LinkRecord | undefined;
}

export function listLinks(db: Database.Database, search?: string): LinkRecord[] {
  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    return db
      .prepare(
        `
        SELECT l.*, COUNT(c.id) AS click_count
        FROM links l
        LEFT JOIN clicks c ON c.link_id = l.id
        WHERE l.code LIKE ? OR l.original_url LIKE ? OR l.title LIKE ?
        GROUP BY l.id
        ORDER BY l.created_at DESC, l.id DESC
        `
      )
      .all(pattern, pattern, pattern) as LinkRecord[];
  }

  return db
    .prepare(
      `
      SELECT l.*, COUNT(c.id) AS click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at DESC, l.id DESC
      `
    )
    .all() as LinkRecord[];
}

export function deleteLinkByCode(db: Database.Database, code: string): boolean {
  const result = db.prepare(`DELETE FROM links WHERE code = ?`).run(code);
  return result.changes > 0;
}

export function recordClick(db: Database.Database, input: ClickEventInput): void {
  db.prepare(
    `
    INSERT INTO clicks (link_id, ip_hash, device, browser, os, referrer)
    VALUES (@linkId, @ipHash, @device, @browser, @os, @referrer)
    `
  ).run(input);
}

export function isLinkExpired(link: Pick<LinkRecord, 'expires_at'>): boolean {
  if (!link.expires_at) return false;
  return new Date(link.expires_at).getTime() <= Date.now();
}

export function getLinkAnalytics(
  db: Database.Database,
  code: string,
  days = 14
): LinkAnalytics | null {
  const link = getLinkByCode(db, code);
  if (!link) return null;

  const uniqueRow = db
    .prepare(`SELECT COUNT(DISTINCT ip_hash) AS count FROM clicks WHERE link_id = ?`)
    .get(link.id) as { count: number };

  const rawDaily = db
    .prepare(
      `
      SELECT substr(clicked_at, 1, 10) AS date, COUNT(*) AS clicks
      FROM clicks
      WHERE link_id = ? AND clicked_at >= datetime('now', ?)
      GROUP BY substr(clicked_at, 1, 10)
      ORDER BY date ASC
      `
    )
    .all(link.id, `-${days - 1} days`) as DailyClicksItem[];

  const dailyMap = new Map(rawDaily.map((d) => [d.date, d.clicks]));
  const clicksByDay: DailyClicksItem[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const isoDate = d.toISOString().slice(0, 10);
    clicksByDay.push({
      date: isoDate,
      clicks: dailyMap.get(isoDate) ?? 0,
    });
  }

  const devices = db
    .prepare(
      `SELECT device AS name, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY device ORDER BY count DESC`
    )
    .all(link.id) as BreakdownItem[];

  const browsers = db
    .prepare(
      `SELECT browser AS name, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY browser ORDER BY count DESC`
    )
    .all(link.id) as BreakdownItem[];

  const referrers = db
    .prepare(
      `SELECT referrer AS name, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY referrer ORDER BY count DESC LIMIT 8`
    )
    .all(link.id) as BreakdownItem[];

  const recentClicks = db
    .prepare(
      `SELECT id, clicked_at, device, browser, os, referrer FROM clicks WHERE link_id = ? ORDER BY id DESC LIMIT 15`
    )
    .all(link.id) as LinkAnalytics['recentClicks'];

  return {
    link,
    totalClicks: link.click_count,
    uniqueVisitors: uniqueRow.count,
    clicksByDay,
    devices,
    browsers,
    referrers,
    recentClicks,
  };
}

export function getGlobalStats(db: Database.Database): GlobalStats {
  const counts = db
    .prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM links) AS totalLinks,
        (SELECT COUNT(*) FROM clicks) AS totalClicks,
        (SELECT COUNT(*) FROM links WHERE expires_at IS NULL OR expires_at > datetime('now')) AS activeLinks
      `
    )
    .get() as { totalLinks: number; totalClicks: number; activeLinks: number };

  const topLink = db
    .prepare(
      `
      SELECT l.code, l.title, COUNT(c.id) AS click_count
      FROM links l
      LEFT JOIN clicks c ON c.link_id = l.id
      GROUP BY l.id
      ORDER BY click_count DESC, l.id DESC
      LIMIT 1
      `
    )
    .get() as { code: string; title: string | null; click_count: number } | undefined;

  return {
    ...counts,
    topLink: topLink ?? null,
  };
}
