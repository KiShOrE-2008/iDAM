/**
 * Where to send someone after they sign in: the `next` page they came from, if it is a page
 * on this site. Anything else (absolute URLs, protocol-relative `//host`, backslash tricks)
 * falls back to the home page, so `/login?next=` cannot be used as an open redirect.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/^\/(login|signup)(\/|\?|$)/.test(value)) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** `/login?next=<current page>` for sending a signed-out user to sign in and back. */
export function loginUrlReturningTo(path: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(path))}`;
}
