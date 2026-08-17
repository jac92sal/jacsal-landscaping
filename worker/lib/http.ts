/** Small HTTP helpers shared by every route. */

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers ?? {}) },
  })
}

export function ok(data: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...data })
}

/**
 * Error responses carry a stable machine-readable `error` code plus a human
 * `message`. The client switches on the code; the message is what a person
 * reads. Never put internal detail in `message` — that goes to the log.
 */
export function fail(status: number, error: string, message: string): Response {
  return json({ ok: false, error, message }, { status })
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
  toResponse(): Response {
    return fail(this.status, this.code, this.message)
  }
}

export const badRequest = (message: string) => new HttpError(400, 'bad_request', message)
export const unauthorized = (message = 'Sign in to continue.') =>
  new HttpError(401, 'unauthorized', message)
export const forbidden = (message = 'You do not have access to this.') =>
  new HttpError(403, 'forbidden', message)
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message)

/** Parse a JSON body, turning malformed input into a clean 400. */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw badRequest('Request body was not valid JSON.')
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 256-bit URL-safe opaque token. */
export function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Constant-time compare of two equal-length hex strings. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const nowS = () => Math.floor(Date.now() / 1000)

/** JSON round-trips for the TEXT columns that hold arrays (SQLite has no array type). */
export function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}
