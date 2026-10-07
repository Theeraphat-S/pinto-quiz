import { AccountStore, RateGuard } from './accounts';
import { QuizRoom } from './room';
import { assertOrigin, cookie, cookies, digest, emailAddress, HttpError, readJSON, safeEqual } from './security';
export { AccountStore, RateGuard, QuizRoom };
async function session(request: Request, env: Env) {
  const value = cookies(request).pt_session || ''; const [id, token] = value.split('.');
  if (!/^[a-f0-9]{64}$/.test(id || '') || !token) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
  const account = env.ACCOUNTS.getByName(id), user = await account.verify(token);
  if (!user) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ'); return { id, token, account, user };
}
async function guard(request: Request, env: Env, kind: string, limit: number, window: number) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (!await env.GUARDS.getByName(await digest(kind + ':' + ip)).allow(limit, window)) throw new HttpError(429, 'ลองใหม่อีกครั้งภายหลัง');
}
async function resetLoginLimits(request: Request, env: Env, id: string) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  await env.GUARDS.getByName('login:' + id).reset();
  await env.GUARDS.getByName(await digest('login-ip:' + ip)).reset();
}
function json(value: unknown, status = 200, extra?: HeadersInit): Response { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } }); }
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) throw new HttpError(405, 'Method not allowed');
  if (method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() === 'websocket') assertOrigin(request);
  if (path === '/api/health') return json({ ok: true, app: 'pinto-quiz' });
  if (path === '/api/accounts/change-login' && method === 'POST') {
    await guard(request, env, 'change-login', 10, 60000);
    if (!env.SETUP_TOKEN || !safeEqual(request.headers.get('Authorization') || '', 'Bearer ' + env.SETUP_TOKEN)) throw new HttpError(403, 'ไม่มีสิทธิ์เปลี่ยนบัญชี');
    const input = await readJSON(request), currentEmail = emailAddress(input.currentEmail), email = emailAddress(input.email);
    if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 128) throw new HttpError(400, 'รหัสผ่านต้องมี 8–128 ตัวอักษร');
    const currentId = await digest(currentEmail), id = await env.ACCOUNTS.getByName(currentId).loginTarget() || currentId;
    const account = env.ACCOUNTS.getByName(id);
    if (!await account.identity()) throw new HttpError(404, 'ไม่พบบัญชีผู้จัด');
    const emailId = await digest(email);
    // Email addresses are aliases; storage identity and room ownership stay stable.
    if (emailId !== id && !await env.ACCOUNTS.getByName(emailId).setLoginTarget(id)) throw new HttpError(409, 'อีเมลนี้มีบัญชีอยู่แล้ว');
    await account.updateLogin(email, input.password);
    await resetLoginLimits(request, env, id);
    return json({ ok: true, email });
  }
  if (path === '/api/accounts' && method === 'POST') {
    await guard(request, env, 'provision', 20, 60000);
    if (!env.SETUP_TOKEN || !safeEqual(request.headers.get('Authorization') || '', 'Bearer ' + env.SETUP_TOKEN)) throw new HttpError(403, 'ไม่มีสิทธิ์สร้างบัญชี');
    const input = await readJSON(request), email = emailAddress(input.email);
    if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) throw new HttpError(400, 'รหัสผ่านต้องมี 12–128 ตัวอักษร');
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 60) throw new HttpError(400, 'กรอกชื่อผู้จัด');
    const created = await env.ACCOUNTS.getByName(await digest(email)).provision(email, input.name.trim(), input.password);
    if (!created) throw new HttpError(409, 'บัญชีนี้มีอยู่แล้ว'); return json({ ok: true }, 201);
  }
  if (path === '/api/login' && method === 'POST') {
    await guard(request, env, 'login-ip', 20, 900000);
    const input = await readJSON(request), email = emailAddress(input.email);
    if (typeof input.password !== 'string' || input.password.length > 128) throw new HttpError(400, 'รหัสผ่านไม่ถูกต้อง');
    const emailId = await digest(email), id = await env.ACCOUNTS.getByName(emailId).loginTarget() || emailId;
    if (!await env.GUARDS.getByName('login:' + id).allow(10, 900000)) throw new HttpError(429, 'ลองใหม่อีกครั้งภายหลัง');
    const user = await env.ACCOUNTS.getByName(id).login(input.password, email);
    if (!user) throw new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    await resetLoginLimits(request, env, id);
    return json({ email: user.email, name: user.name }, 200, { 'Set-Cookie': cookie('pt_session', id + '.' + user.token, request) });
  }
  if (path === '/api/logout' && method === 'POST') { const s = await session(request, env); await s.account.logout(s.token); return json({ ok: true }, 200, { 'Set-Cookie': cookie('pt_session', '', request, 0) }); }
  if (path === '/api/me' && method === 'GET') return json((await session(request, env)).user);
  if (path === '/api/quizzes') {
    const s = await session(request, env);
    if (method === 'GET') return json(await s.account.list());
    if (method === 'POST') return json(await s.account.save(null, await readJSON(request)), 201);
  }
  const quizMatch = path.match(/^\/api\/quizzes\/([a-f0-9-]{36})$/);
  if (quizMatch) { const s = await session(request, env), id = quizMatch[1];
    if (method === 'GET') { const q = await s.account.get(id); if (!q) throw new HttpError(404, 'ไม่พบ Quiz'); return json(q); }
    if (method === 'PUT') return json(await s.account.save(id, await readJSON(request)));
    if (method === 'DELETE') { await s.account.remove(id); return json({ ok: true }); }
  }
  if (path === '/api/rooms' && method === 'POST') {
    const s = await session(request, env); await guard(request, env, 'create-room', 10, 60000); const input = await readJSON(request);
    const quiz = await s.account.get(String(input.quizId)); if (!quiz) throw new HttpError(404, 'ไม่พบ Quiz');
    for (let i = 0; i < 8; i++) { const pin = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000); if (await env.ROOMS.getByName(pin).initialize(s.id, pin, quiz)) return json({ pin }, 201); }
    throw new HttpError(503, 'เปิดห้องไม่ได้ ลองอีกครั้ง');
  }
  const roomMatch = path.match(/^\/api\/rooms\/(\d{6})(?:\/(join|command|ws))?$/);
  if (roomMatch) { const [, pin, action] = roomMatch, room = env.ROOMS.getByName(pin);
    if (!action && method === 'GET') return json(await room.info());
    if (action === 'join' && method === 'POST') { await guard(request, env, 'join', 600, 60000); const input = await readJSON(request);
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 24) throw new HttpError(400, 'ชื่อต้องมี 1–24 ตัวอักษร');
      const player = await room.join(input.name.trim(), cookies(request)['pt_player_' + pin] || '');
      return json({ id: player.id }, 200, { 'Set-Cookie': cookie('pt_player_' + pin, player.token, request) });
    }
    if (action === 'command' && method === 'POST') { const s = await session(request, env), input = await readJSON(request); await room.command(s.id, String(input.command)); return json({ ok: true }); }
    if (action === 'ws' && method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const headers = new Headers(request.headers); headers.delete('X-Pinto-Owner'); headers.delete('X-Pinto-Player');
      if (url.searchParams.get('role') === 'host') headers.set('X-Pinto-Owner', (await session(request, env)).id);
      else headers.set('X-Pinto-Player', cookies(request)['pt_player_' + pin] || '');
      // Upgrade responses carry WebSockets, which cannot be transported through RPC.
      return room.fetch(new Request(request, { headers }));
    }
  }
  throw new HttpError(404, 'ไม่พบหน้าที่ร้องขอ');
}
export default { async fetch(request: Request, env: Env): Promise<Response> {
  try { return await route(request, env); } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    // RPC transports preserve messages but may not preserve custom exception classes.
    const status = error instanceof HttpError ? error.status : /คุณไม่ได้|ไม่มีสิทธิ์/.test(message) ? 403 : /ไม่พบ|หมดอายุ/.test(message) ? 404 : /เกมเริ่ม|ห้องเต็ม|คำสั่งนี้/.test(message) ? 409 : /ต้องมี|ไม่ถูกต้อง|กรอก|ยาวเกิน|เลือกคำตอบ|เก็บได้/.test(message) ? 400 : 500;
    if (status === 500) console.error(JSON.stringify({ event: 'request_failed', path: new URL(request.url).pathname, message }));
    return json({ error: status === 500 ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : message }, status);
  }
} } satisfies ExportedHandler<Env>;
