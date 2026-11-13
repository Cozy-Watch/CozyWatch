import { jsonRequest, UserFacingError } from './network';
export interface License { key: string; checkedAt: number; status: 'licensed' | 'revoked' }
export interface LicenseResult { valid: boolean; error?: string; license_key?: { status: string; test_mode: boolean; expires_at: string | null }; meta?: { store_id: number; product_id: number } }
export function isLifetime(data: LicenseResult): boolean {
  return data.valid === true && data.meta?.store_id === 173903 && data.meta.product_id === 583215 &&
    data.license_key?.test_mode === false && data.license_key.expires_at === null && ['active', 'inactive'].includes(data.license_key.status);
}
export async function validateLicense(key: string, signal: AbortSignal): Promise<License> {
  const data = await jsonRequest<LicenseResult>('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ license_key: key }),
  }, signal);
  const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
  const validEnvelope = record(data) && typeof data.valid === 'boolean' && record(data.meta) &&
    Number.isSafeInteger(data.meta.store_id) && Number.isSafeInteger(data.meta.product_id) && record(data.license_key) &&
    typeof data.license_key.test_mode === 'boolean' && typeof data.license_key.status === 'string' &&
    ['active', 'inactive', 'disabled', 'expired'].includes(data.license_key.status) &&
    (data.license_key.expires_at === null || (typeof data.license_key.expires_at === 'string' && Number.isFinite(Date.parse(data.license_key.expires_at))));
  if (!validEnvelope) throw new UserFacingError('Licensing service returned an incomplete or unexpected response. Your saved license is preserved.');
  // Browser entitlement check intentionally creates no instance and consumes no Mac seat.
  if (!isLifetime(data)) return { key, checkedAt: Date.now(), status: 'revoked' };
  return { key, checkedAt: Date.now(), status: 'licensed' };
}
