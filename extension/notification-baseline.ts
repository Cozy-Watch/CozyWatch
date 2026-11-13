import type { Snapshot } from './model';
export interface NotificationBaseline { login: string; startedAt?: number; sources: Record<string, number>; seen?: string[] }
export function notificationBatch(previous: NotificationBaseline | undefined, snapshot: Snapshot, startedAt: number) {
  const baseline = previous?.login === snapshot.login ? previous : undefined;
  const seen = new Set(baseline?.seen ?? []);
  const version = (item: Snapshot['activity'][number]) => `${item.id}@${item.updatedAt}:${item.reason}`;
  const changes = snapshot.activity.filter(item => {
    if (!baseline || !item.source || (seen.has(version(item)) || seen.has(item.id))) return false;
    const cutoff = baseline.sources[item.source] ?? baseline.startedAt;
    return cutoff !== undefined && Date.parse(item.updatedAt) >= cutoff;
  });
  const sources = Object.fromEntries(Object.entries({ ...(baseline?.sources ?? {}), ...Object.fromEntries((snapshot.activitySources ?? []).map(source => [source, startedAt])) }).sort((a,b) => b[1] - a[1]).slice(0, 200));
  const next: NotificationBaseline = { login: snapshot.login, startedAt, sources, seen: [...new Set([...(baseline?.seen ?? []).filter(id => id.includes('@')), ...snapshot.activity.map(version)])].slice(-500) };
  return { changes, next };
}
