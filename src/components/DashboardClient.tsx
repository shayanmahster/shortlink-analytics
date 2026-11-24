'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  MousePointerClick,
  QrCode,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { GlobalStats, LinkRecord } from '@/lib/db';
import AnalyticsModal from './AnalyticsModal';

interface DashboardClientProps {
  initialLinks: LinkRecord[];
  initialStats: GlobalStats;
}

export default function DashboardClient({
  initialLinks,
  initialStats,
}: DashboardClientProps) {
  const [links, setLinks] = useState<LinkRecord[]>(initialLinks);
  const [stats, setStats] = useState<GlobalStats>(initialStats);
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function refreshData(query = search) {
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const res = await fetch(`/api/links${qs}`);
    if (res.ok) {
      const json = (await res.json()) as { links: LinkRecord[]; stats: GlobalStats };
      setLinks(json.links);
      setStats(json.stats);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customCode: customCode || undefined,
          title: title || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      const json = (await res.json()) as { link?: LinkRecord; error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Failed to shorten URL');
        return;
      }

      setUrl('');
      setCustomCode('');
      setTitle('');
      setExpiresAt('');
      await refreshData();
    } catch {
      setError('Network error while creating link');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(code: string) {
    const res = await fetch(`/api/links/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await refreshData();
    }
  }

  async function handleCopy(code: string) {
    const shortUrl = `${origin}/${code}`;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  }

  async function handleSearchChange(val: string) {
    setSearch(val);
    await refreshData(val);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ShortLink Analytics
            </h1>
            <p className="text-sm text-slate-500">
              Shorten URLs, generate QR codes, and monitor real-time click insights.
            </p>
          </div>
        </div>
      </header>

      {/* Global Stats */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Links</span>
            <Link2 className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalLinks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Clicks</span>
            <MousePointerClick className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalClicks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Active Links</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.activeLinks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Top Performer</span>
            <BarChart3 className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 truncate text-xl font-bold text-slate-900">
            {stats.topLink ? `/${stats.topLink.code}` : '—'}
          </p>
          {stats.topLink && (
            <p className="text-xs text-slate-500">{stats.topLink.click_count} clicks</p>
          )}
        </div>
      </section>

      {/* Create Link Form */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Create a Short Link</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Destination URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/very/long/article-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Custom Alias (optional)
              </label>
              <input
                type="text"
                placeholder="my-launch"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Label / Title (optional)
              </label>
              <input
                type="text"
                placeholder="Product Launch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Expiration Date (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
            >
              {submitting ? 'Creating...' : 'Shorten URL'}
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
        </form>
      </section>

      {/* Links List */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <h2 className="text-base font-semibold text-slate-900">Your Links</h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by alias, title, or URL..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {links.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No links found. Create your first short link above!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {links.map((link) => {
              const expired =
                Boolean(link.expires_at) &&
                new Date(link.expires_at!).getTime() <= Date.now();
              const shortUrl = `${origin}/${link.code}`;

              return (
                <div
                  key={link.id}
                  className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/70 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/${link.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        {shortUrl}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {link.title && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {link.title}
                        </span>
                      )}
                      {expired && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {link.original_url}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                      <MousePointerClick className="h-3.5 w-3.5 text-slate-500" />
                      {link.click_count}
                    </span>

                    <button
                      onClick={() => handleCopy(link.code)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Copy short link"
                    >
                      {copiedCode === link.code ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>

                    <a
                      href={`/api/links/${encodeURIComponent(link.code)}/qr`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Open QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR
                    </a>

                    <button
                      onClick={() => setSelectedCode(link.code)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Analytics
                    </button>

                    <button
                      onClick={() => handleDelete(link.code)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete link"
                      aria-label={`Delete ${link.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedCode && (
        <AnalyticsModal
          code={selectedCode}
          origin={origin}
          onClose={() => {
            setSelectedCode(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
