export class UserFacingError extends Error {}
export class HttpError extends UserFacingError {
  constructor(public readonly status: number, message: string) { super(message); }
}
export async function jsonRequest<T>(url: string, init: RequestInit = {}, signal?: AbortSignal, onHeaders?: (headers: Headers) => void): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401) throw new HttpError(401, new URL(url).hostname === 'api.github.com' ? 'GitHub credentials expired or were revoked. Reconnect GitHub.' : 'License service rejected the request. Your saved license is preserved.');
    if (response.status === 403 || response.status === 429) throw new UserFacingError('Access denied or request limit reached. Check permissions or retry later.');
    throw new UserFacingError('Service unavailable. Your saved data and license are preserved.');
  }
  if (Number(response.headers.get('content-length')) > 2_000_000) { await response.body?.cancel(); throw new UserFacingError('Response too large. Try a smaller repository selection.'); }
  onHeaders?.(response.headers);
  if (!response.body) throw new UserFacingError('Empty service response.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder(); let text = ''; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 2_000_000) { await reader.cancel(); throw new UserFacingError('Response too large. Try a smaller repository selection.'); }
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as T;
  } finally { reader.releaseLock(); }
}
