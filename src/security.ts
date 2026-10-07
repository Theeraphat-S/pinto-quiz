import { timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const randomToken = () => crypto.randomUUID() + crypto.randomUUID();
export async function digest(value: string): Promise<string> { return Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))).toString('hex'); }
export function safeEqual(a: string, b: string): boolean { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return Buffer.from(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256)).toString('hex');
}
export function cookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').flatMap(part => { const i = part.indexOf('='); return i < 0 ? [] : [[part.slice(0, i).trim(), part.slice(i + 1).trim()]]; }));
}
export function cookie(name: string, value: string, request: Request, maxAge = 86400): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function assertOrigin(request: Request): void {
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'คำขอนี้ไม่ได้มาจากเว็บไซต์ของเรา');
}
export async function readJSON(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, 'ต้องส่งข้อมูล JSON');
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, 'ไม่มีข้อมูล');
  let length = 0; const chunks: Uint8Array[] = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 131072) { await reader.cancel(); throw new HttpError(413, 'ข้อมูลใหญ่เกินไป'); } chunks.push(value); }
  try { const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, unknown>; } catch { throw new HttpError(400, 'ข้อมูล JSON ไม่ถูกต้อง'); }
}
export function emailAddress(value: unknown): string { if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new HttpError(400, 'อีเมลไม่ถูกต้อง'); return value.trim().toLowerCase(); }
