import { CLIENT_ID, GITHUB_APP_CLIENT_ID } from '../src/mainProcess/keys';
import { jsonRequest, UserFacingError } from './network';
export class DeviceAuthorizationEnded extends UserFacingError {}
export type AuthMethod = 'oauth' | 'github-app' | 'pat';
export interface Credential { token: string; method: AuthMethod; refreshToken?: string; expiresAt?: number; refreshExpiresAt?: number }
export interface DeviceFlow { method: Exclude<AuthMethod, 'pat'>; deviceCode: string; userCode: string; expiresAt: number; interval: number; nextPoll: number; credential?: Credential }
interface Tokens { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; error?: string }
const clientId = (method: AuthMethod) => method === 'github-app' ? GITHUB_APP_CLIENT_ID : CLIENT_ID;
const post = <T>(path: string, body: Record<string, string>, signal?: AbortSignal) => jsonRequest<T>(`https://github.com/login/${path}`, {
  method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
}, signal);
export async function startDevice(method: DeviceFlow['method'], signal: AbortSignal): Promise<DeviceFlow> {
  const data = await post<{ device_code: string; user_code: string; expires_in: number; interval: number }>('device/code', {
    client_id: clientId(method), ...(method === 'oauth' ? { scope: 'repo' } : {}),
  }, signal);
  if (typeof data.device_code !== 'string' || !data.device_code || data.device_code.length > 1024 || !/^[A-Z0-9-]{4,20}$/.test(data.user_code) || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || (data.interval !== undefined && (!Number.isFinite(data.interval) || data.interval <= 0 || data.interval > 900))) throw new UserFacingError('GitHub sign-in unavailable. Check device flow is enabled.');
  const interval = Math.max(5, data.interval || 5) * 1000;
  return { method, deviceCode: data.device_code, userCode: data.user_code, expiresAt: Date.now() + Math.min(data.expires_in, 900) * 1000, interval, nextPoll: Date.now() + interval };
}
function credential(data: Tokens, method: AuthMethod): Credential {
  if (typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 512 || (data.expires_in !== undefined && (!Number.isFinite(data.expires_in) || data.expires_in <= 0)) || (data.refresh_token !== undefined && (typeof data.refresh_token !== 'string' || !data.refresh_token || data.refresh_token.length > 512)) || (data.refresh_token_expires_in !== undefined && (!Number.isFinite(data.refresh_token_expires_in) || data.refresh_token_expires_in <= 0))) throw new UserFacingError('GitHub sign-in expired or was denied. Reconnect GitHub.');
  return { method, token: data.access_token, refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    refreshExpiresAt: data.refresh_token_expires_in ? Date.now() + data.refresh_token_expires_in * 1000 : undefined };
}
export async function pollDevice(flow: DeviceFlow, signal: AbortSignal): Promise<Credential | DeviceFlow> {
  if (Date.now() >= flow.expiresAt) throw new DeviceAuthorizationEnded('GitHub sign-in code expired. Start again.');
  if (Date.now() < flow.nextPoll) return flow;
  const data = await post<Tokens>('oauth/access_token', { client_id: clientId(flow.method), device_code: flow.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }, signal);
  if (data.error === 'authorization_pending' || data.error === 'slow_down') {
    const interval = flow.interval + (data.error === 'slow_down' ? 5000 : 0);
    return { ...flow, interval, nextPoll: Date.now() + interval };
  }
  if (!data.access_token) throw new DeviceAuthorizationEnded('GitHub sign-in expired or was denied. Start again.');
  return credential(data, flow.method);
}
export async function rotate(saved: Credential, signal: AbortSignal): Promise<Credential> {
  if (!saved.refreshToken || (saved.refreshExpiresAt && saved.refreshExpiresAt <= Date.now())) throw new UserFacingError('GitHub session expired. Reconnect GitHub.');
  const data = await post<Tokens>('oauth/access_token', { client_id: clientId(saved.method), grant_type: 'refresh_token', refresh_token: saved.refreshToken }, signal);
  if (['bad_refresh_token', 'invalid_grant', 'expired_token'].includes(data.error ?? '')) throw new DeviceAuthorizationEnded('GitHub authorization expired. Start a fresh sign-in.');
  return credential(data, saved.method);
}
