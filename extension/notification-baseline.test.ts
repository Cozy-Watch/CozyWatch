import { notificationBatch, type NotificationBaseline } from './notification-baseline';
import type { Snapshot } from './model';
const source = 'new-conversation';
const snapshot = (time: number): Snapshot => ({ login: 'dev', mine: [], reviews: [], checkedAt: '', truncated: false, activitySources: [source], activity: [{ id: 'comment', source, title: 'mention', reason: 'mention', url: 'https://github.com/o/r/pull/1', updatedAt: new Date(time).toISOString() }] });
it('silences initial history and account changes', () => {
  const first = notificationBatch(undefined, snapshot(1000), 2000);
  expect(first.changes).toHaveLength(0);
  expect(notificationBatch({ ...first.next, login: 'other' }, snapshot(3000), 4000).changes).toHaveLength(0);
});
it('alerts for first mentions in new conversations without replaying old history', () => {
  const previous: NotificationBaseline = { login: 'dev', startedAt: 1000, sources: {}, seen: [] };
  expect(notificationBatch(previous, snapshot(1500), 2000).changes).toHaveLength(1);
  expect(notificationBatch(previous, snapshot(500), 2000).changes).toHaveLength(0);
});
it('does not lose comments created during the prior refresh or replay unchanged events', () => {
  const first = notificationBatch(undefined, { ...snapshot(0), activity: [] }, 1000);
  const second = notificationBatch(first.next, snapshot(1500), 3000);
  expect(second.changes).toHaveLength(1);
  expect(notificationBatch(second.next, snapshot(1500), 4000).changes).toHaveLength(0);
});
it('alerts once for an edited mention and never replays the unchanged version', () => {
  const first = notificationBatch(undefined, snapshot(1000), 1000);
  const updated = notificationBatch(first.next, snapshot(2000), 2000);
  expect(updated.changes).toHaveLength(1);
  expect(notificationBatch(updated.next, snapshot(2000), 3000).changes).toHaveLength(0);
});

it('does not replay a known mention when only its display summary improves', () => {
  const original = snapshot(1000);
  const first = notificationBatch(undefined, original, 2000);
  const updated = { ...original, activity: original.activity.map(item => ({ ...item, title: 'Vercel deployment is waiting for team authorization' })) };
  expect(notificationBatch(first.next, updated, 3000).changes).toHaveLength(0);
});
