import { startDevice, pollDevice, rotate } from './auth';
import { jsonRequest } from './network';
jest.mock('./network', () => ({ ...jest.requireActual('./network'), jsonRequest: jest.fn() }));
const request = jest.mocked(jsonRequest);
const signal = new AbortController().signal;
beforeEach(() => request.mockReset());
it.each(['oauth', 'github-app'] as const)('supports %s device flow without any app secret and respects polling/backoff', async method => {
  request.mockResolvedValueOnce({ device_code: 'private-device-code', user_code: 'ABCD-EFGH', expires_in: 900, interval: 5 });
  const flow = await startDevice(method, signal);
  const body = String(request.mock.calls[0][1]?.body);
  expect(body).not.toContain('secret');
  expect(body).not.toContain('notifications');
  expect(body.includes('scope=repo')).toBe(method === 'oauth');
  await pollDevice(flow, signal); expect(request).toHaveBeenCalledTimes(1);
  request.mockResolvedValueOnce({ error: 'slow_down' });
  const pending = await pollDevice({ ...flow, nextPoll: 0 }, signal);
  expect('interval' in pending && pending.interval).toBe(10000);
});
it('refreshes the token pair using device-flow client identifiers only', async () => {
  request.mockResolvedValue({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 28800 });
  const result = await rotate({ method: 'github-app', token: 'old', refreshToken: 'old-refresh' }, signal);
  expect(result.refreshToken).toBe('new-refresh');
  expect(result.expiresAt).toBeGreaterThan(Date.now());
  expect(String(request.mock.calls[0][1]?.body)).not.toContain('client_secret');
});
it('does not expose raw error payloads from GitHub', async () => {
  request.mockResolvedValue({ error: 'private server data' });
  await expect(rotate({ method: 'oauth', token: 'old', refreshToken: 'refresh' }, signal)).rejects.toThrow('Reconnect GitHub');
});
it('expires device codes locally without another GitHub request', async () => {
  await expect(pollDevice({ method: 'oauth', deviceCode: 'private-device', userCode: 'ABCD-EFGH', expiresAt: Date.now() - 1, interval: 5000, nextPoll: 0 }, signal)).rejects.toThrow('code expired');
  expect(request).not.toHaveBeenCalled();
});
it('distinguishes denied device authorization from temporary transport failures', async () => {
  request.mockResolvedValueOnce({ error: 'access_denied', error_description: 'untrusted upstream text' });
  await expect(pollDevice({ method: 'github-app', deviceCode: 'private-device', userCode: 'ABCD-EFGH', expiresAt: Date.now() + 900000, interval: 5000, nextPoll: 0 }, signal)).rejects.toThrow('expired or was denied');
});
it.each([Infinity, -1, 0, 1000])('rejects malformed device polling intervals: %s', async interval => {
  request.mockResolvedValue({ device_code: 'private', user_code: 'ABCD-EFGH', expires_in: 900, interval });
  await expect(startDevice('oauth', signal)).rejects.toThrow('sign-in unavailable');
});
it('treats a rejected refresh grant as a terminal authorization error', async () => {
  const { DeviceAuthorizationEnded } = await import('./auth');
  request.mockResolvedValue({ error: 'bad_refresh_token' });
  await expect(rotate({ token: 'old', method: 'oauth', refreshToken: 'bad' }, signal)).rejects.toBeInstanceOf(DeviceAuthorizationEnded);
});
