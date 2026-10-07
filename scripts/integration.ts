import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WebSocket } from 'ws';
import type { RoomView } from '../src/shared';
const base = process.env.TEST_URL || 'http://localhost:8787';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Integration creates disposable accounts and only runs locally.');
const setup = readFileSync('.dev.vars', 'utf8').match(/^SETUP_TOKEN=(.+)$/m)![1].trim();
const password = 'integration-only-password-2026', suffix = crypto.randomUUID();
async function request(path: string, method = 'GET', body?: unknown, cookie = '', setupToken = false) {
  const response = await fetch(base + path, { method, headers: { Origin: base, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(setupToken ? { Authorization: 'Bearer ' + setup } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, cookie: (response.headers.get('Set-Cookie') || '').split(';')[0], data: await response.json() as Record<string, unknown> };
}
class Client {
  ws: WebSocket; states: RoomView[] = []; errors: string[] = [];
  constructor(pin: string, cookie: string, host = false) { this.ws = new WebSocket(base.replace('http','ws') + `/api/rooms/${pin}/ws${host ? '?role=host' : ''}`, { headers: { Origin: base, Cookie: cookie } }); this.ws.on('error', () => {}); this.ws.on('message', raw => { const v = JSON.parse(raw.toString()); if (v.type === 'state') this.states.push(v.state); else if (v.type === 'error') this.errors.push(v.error); }); }
  async state(phase: string, predicate: (s: RoomView) => boolean = () => true) { const end = Date.now() + 5000; while (Date.now() < end) { const value = [...this.states].reverse().find(s => s.phase === phase && predicate(s)); if (value) return value; await new Promise(r => setTimeout(r, 20)); } throw new Error('Timed out waiting for ' + phase); }
  answer(id: string, choice: number) { this.ws.send(JSON.stringify({ type: 'answer', questionId: id, choice })); }
  close() { this.ws.close(); }
}
const clients: Client[] = [];
try {
  const email = `host-${suffix}@example.com`, other = `other-${suffix}@example.com`;
  assert.equal((await request('/api/quizzes')).status, 401);
  assert.equal((await request('/api/accounts', 'POST', { email, name: 'Host', password })).status, 403);
  assert.equal((await request('/api/accounts', 'POST', { email, name: 'Host', password }, '', true)).status, 201);
  assert.equal((await request('/api/accounts', 'POST', { email: other, name: 'Other', password }, '', true)).status, 201);
  assert.equal((await request('/api/login', 'POST', { email, password: 'wrong' })).status, 401);
  const hostLogin = await request('/api/login', 'POST', { email, password }); assert.equal(hostLogin.status, 200);
  const otherLogin = await request('/api/login', 'POST', { email: other, password });
  const question = { id: 'ignored', text: 'Planet?', options: ['Jupiter','Saturn','Earth','Neptune'], correct: 0, explanation: 'Jupiter is the largest.', duration: 10, maxScore: 1000 };
  const saved = await request('/api/quizzes', 'POST', { title: 'Integration Quiz', music: true, questions: [question, { ...question, text: 'Second?', correct: 1 }] }, hostLogin.cookie); assert.equal(saved.status, 201);
  assert.equal((await request('/api/quizzes/' + saved.data.id, 'GET', undefined, otherLogin.cookie)).status, 404);
  const room = await request('/api/rooms', 'POST', { quizId: saved.data.id }, hostLogin.cookie); assert.equal(room.status, 201); const pin = String(room.data.pin);
  assert.equal((await request(`/api/rooms/${pin}/command`, 'POST', { command: 'start' }, otherLogin.cookie)).status, 403);
  const join = await request(`/api/rooms/${pin}/join`, 'POST', { name: 'Beer' }); assert.equal(join.status, 200);
  const host = new Client(pin, hostLogin.cookie, true), player = new Client(pin, join.cookie); clients.push(host,player);
  await host.state('lobby'); await player.state('lobby');
  assert.equal((await request(`/api/rooms/${pin}/command`, 'POST', { command: 'start' }, hostLogin.cookie)).status, 200);
  const before = await player.state('question'); assert.equal(before.question?.correct, undefined); assert.equal(before.question?.explanation, undefined);
  player.answer(before.question!.id, 0); const answered = await player.state('question', s => s.me?.answered === true); assert.equal(answered.me?.points, undefined); assert.equal(answered.me?.score, 0, 'Answer correctness must not leak via total before reveal');
  player.answer(before.question!.id, 1); await new Promise(r=>setTimeout(r,100)); assert.ok(player.errors.includes('คุณตอบข้อนี้แล้ว'));
  assert.equal((await request(`/api/rooms/${pin}/join`, 'POST', { name: 'Late' })).status, 409);
  await request(`/api/rooms/${pin}/command`, 'POST', { command: 'reveal' }, hostLogin.cookie);
  const reveal = await player.state('reveal'); assert.equal(reveal.question?.correct, 0); assert.ok(reveal.me!.points! > 500); assert.equal(reveal.distribution?.[0], 1);
  player.close(); const resumed = new Client(pin, join.cookie); clients.push(resumed); assert.equal((await resumed.state('reveal')).me?.score, reveal.me?.score);
  await request(`/api/rooms/${pin}/command`, 'POST', { command: 'next' }, hostLogin.cookie);
  const second = await resumed.state('question', s => s.questionIndex === 1); resumed.answer(before.question!.id, 1); await new Promise(r=>setTimeout(r,100)); assert.ok(resumed.errors.includes('ปิดรับคำตอบแล้ว'));
  resumed.answer(second.question!.id, 0); await resumed.state('question', s=>s.questionIndex===1&&s.me?.answered===true);
  // An alarm automatically reveals the second question after its deadline.
  await new Promise(r=>setTimeout(r,10100)); const timed = await resumed.state('reveal', s=>s.questionIndex===1); assert.equal(timed.me?.points, 0); assert.equal(timed.question?.correct, 1);
  await request(`/api/rooms/${pin}/command`, 'POST', { command: 'next' }, hostLogin.cookie); assert.equal((await resumed.state('finished')).players.length, 1);
  const crossOrigin = await fetch(base + '/api/logout', { method:'POST',headers:{Origin:'https://evil.example',Cookie:hostLogin.cookie} }); assert.equal(crossOrigin.status,403);
  await request('/api/logout','POST',undefined,hostLogin.cookie); assert.equal((await request('/api/me','GET',undefined,hostLogin.cookie)).status,401);
  console.log('PASS: login, per-account quiz isolation, host permissions, join, realtime answers, duplicate/stale rejection, no early reveal, reconnect, deadline alarm, final score, CSRF and logout.');
} finally { clients.forEach(c=>c.close()); }
