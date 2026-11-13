import { jsonRequest } from './network';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });
it('bounds response bytes even without Content-Length', async () => {
  globalThis.fetch = jest.fn(async () => new Response(new Uint8Array(2_000_001)));
  await expect(jsonRequest('https://api.github.com/user')).rejects.toThrow('Response too large');
});
it('omits cookies, refuses redirects, and never returns error response text', async () => {
  const mock = jest.fn(async () => new Response('secret token leaked by upstream', { status: 403 })); globalThis.fetch = mock;
  await expect(jsonRequest('https://api.github.com/user')).rejects.toThrow('Access denied');
  expect(mock.mock.calls[0]).toEqual(['https://api.github.com/user', expect.objectContaining({ credentials: 'omit', redirect: 'error', cache: 'no-store' })]);
});
it('cancels oversized response streams before reading them', async () => {
  const cancel = jest.fn();
  globalThis.fetch = jest.fn(async () => new Response(new ReadableStream({ cancel }), { headers: { 'content-length': '2000001' } }));
  await expect(jsonRequest('https://api.github.com/user')).rejects.toThrow('Response too large');
  expect(cancel).toHaveBeenCalledTimes(1);
});
