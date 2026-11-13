import { isLifetime, validateLicense, type LicenseResult } from './license';
import { jsonRequest } from './network';
jest.mock('./network', () => ({ ...jest.requireActual('./network'), jsonRequest: jest.fn() }));
const valid: LicenseResult = { valid: true, license_key: { status: 'active', test_mode: false, expires_at: null }, meta: { store_id: 173903, product_id: 583215 } };
it('accepts the existing lifetime product without consuming a Mac instance', async () => {
  jest.mocked(jsonRequest).mockResolvedValue(valid);
  expect((await validateLicense('synthetic-key', new AbortController().signal)).status).toBe('licensed');
  const [url, options] = jest.mocked(jsonRequest).mock.calls.at(-1)!;
  expect(url).toMatch(/\/validate$/); expect(String(options?.body)).not.toContain('instance');
});
it('rejects other products, test keys, annual keys, disabled keys, and malformed data', () => {
  expect(isLifetime(valid)).toBe(true);
  expect(isLifetime({ ...valid, meta: { store_id: 173903, product_id: 123 } })).toBe(false);
  for (const patch of [{ test_mode: true }, { expires_at: '2027-01-01' }, { status: 'disabled' }]) {
    expect(isLifetime({ ...valid, license_key: { ...valid.license_key!, ...patch } })).toBe(false);
  }
  expect(isLifetime({} as LicenseResult)).toBe(false);
});
it('treats malformed success as an outage, not a revocation', async () => {
  jest.mocked(jsonRequest).mockResolvedValue({});
  await expect(validateLicense('synthetic', new AbortController().signal)).rejects.toThrow('saved license is preserved');
});
it.each([null, [], { valid: true, meta: {}, license_key: {} }, { ...valid, license_key: { ...valid.license_key, test_mode: undefined } }, { ...valid, license_key: { ...valid.license_key, expires_at: 'not-a-date' } }, { valid: false }])('preserves entitlement for incomplete or malformed licensing data: %j', async response => {
  jest.mocked(jsonRequest).mockResolvedValue(response);
  await expect(validateLicense('synthetic-key', new AbortController().signal)).rejects.toThrow('saved license is preserved');
});
it('recognizes an authoritative disabled license with complete product metadata', async () => {
  jest.mocked(jsonRequest).mockResolvedValue({ ...valid, valid: false, license_key: { ...valid.license_key, status: 'disabled' } });
  expect((await validateLicense('synthetic-key', new AbortController().signal)).status).toBe('revoked');
});
