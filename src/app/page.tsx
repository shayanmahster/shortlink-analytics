import DashboardClient from '@/components/DashboardClient';
import { getDb, getGlobalStats, listLinks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const db = getDb();
  const links = listLinks(db);
  const stats = getGlobalStats(db);

  return <DashboardClient initialLinks={links} initialStats={stats} />;
}
