'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, ExternalLink, MousePointerClick, Users, X } from 'lucide-react';
import type { BreakdownItem, LinkAnalytics } from '@/lib/db';

interface AnalyticsModalProps {
  code: string;
  origin: string;
  onClose: () => void;
}

function BreakdownList({ title, items }: { title: string; items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No data yet</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-slate-700">{item.name}</span>
                  <span className="text-slate-500">
                    {item.count} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsModal({ code, origin, onClose }: AnalyticsModalProps) {
  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/links/${encodeURIComponent(code)}?days=14`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return (await res.json()) as LinkAnalytics;
      })
      .then((json) => {
        if (active) {
          setData(json);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  const shortUrl = `${origin}/${code}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">
              Analytics: /{code}
            </h3>
            {data && (
              <a
                href={data.link.original_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <span className="max-w-md truncate">{data.link.original_url}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close analytics"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading analytics...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Clicks</p>
                    <p className="text-2xl font-bold text-slate-900">{data.totalClicks}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Unique Visitors</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {data.uniqueVisitors}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">QR Code</p>
                    <a
                      href={`/api/links/${encodeURIComponent(code)}/qr`}
                      download={`qr-${code}.png`}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PNG
                    </a>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/links/${encodeURIComponent(code)}/qr`}
                    alt={`QR code for ${shortUrl}`}
                    className="h-14 w-14 rounded-md border border-slate-200"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-sm font-semibold text-slate-800">
                  Clicks Over Last 14 Days
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.clicksByDay}>
                      <defs>
                        <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(d: string) => d.slice(5)}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#clicksFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <BreakdownList title="Devices" items={data.devices} />
                <BreakdownList title="Browsers" items={data.browsers} />
                <BreakdownList title="Top Referrers" items={data.referrers} />
              </div>

              {data.recentClicks.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">
                    Recent Clicks
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="py-2 pr-4 font-medium">Time (UTC)</th>
                          <th className="py-2 pr-4 font-medium">Device</th>
                          <th className="py-2 pr-4 font-medium">Browser</th>
                          <th className="py-2 pr-4 font-medium">OS</th>
                          <th className="py-2 font-medium">Referrer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.recentClicks.map((click) => (
                          <tr key={click.id}>
                            <td className="py-2 pr-4 whitespace-nowrap">{click.clicked_at}</td>
                            <td className="py-2 pr-4">{click.device}</td>
                            <td className="py-2 pr-4">{click.browser}</td>
                            <td className="py-2 pr-4">{click.os}</td>
                            <td className="py-2">{click.referrer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
