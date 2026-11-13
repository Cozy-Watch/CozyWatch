import type { AuthMethod } from './auth';
export interface PullSummary {
  id: number; number: number; title: string; repository: string; url: string;
  updatedAt: string; draft: boolean; author?: string; comments?: number; labels?: string[]; details?: PullDetails;

}
export interface PullDetails {
  checkedAt: number; head: string; base: string; additions: number; deletions: number; files: number;
  reviewers: string[]; approvals?: number; changesRequested?: number; reviewsPartial: boolean;
  discussionComments?: number; reviewComments?: number; mergeConflict?: boolean | null;
  ci: 'passing' | 'failed' | 'pending' | 'none' | 'unavailable';
}
export interface Activity { id: string; source?: string; title: string; reason: string; url: string; updatedAt: string }
export interface Snapshot { login: string; mine: PullSummary[]; reviews: PullSummary[]; activity: Activity[]; checkedAt: string; truncated: boolean; reviewsTruncated?: boolean; activityLoading?: boolean; activitySources?: string[] }
export interface Diagnostic { at: string; code: 'connected' | 'disconnected' | 'refresh-failed' | 'license-unavailable' }
export interface PublicState {
  diagnostics?: Diagnostic[];
  connected: boolean; notifications: boolean; snapshot?: Snapshot; error?: string;
  auth?: { verifying?: boolean; method: AuthMethod; userCode: string; expiresAt: number; interval: number };
  license?: { status: 'trial' | 'trial-ended' | 'licensed' | 'revoked'; trialEnd?: number; checkedAt?: number };
}
export type Command = { type: 'state' | 'refresh' | 'disconnect' | 'cancel-auth' | 'poll-auth' | 'clear-cache' | 'reset-vault' } |
  { type: 'connect'; token: string } | { type: 'start-auth'; method: 'oauth' | 'github-app' } |
  { type: 'pull-details'; id: number } | { type: 'license'; key: string } | { type: 'notifications'; enabled: boolean };
export type Reply = { ok: true; state: PublicState } | { ok: false; error: string };
export function githubUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
