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
  async state(phase: string, predicate: (s: RoomView) => boolean = () => true, wait = 5000) { const end = Date.now() + wait; while (Date.now() < end) { const value = [...this.states].reverse().find(s => s.phase === phase && predicate(s)); if (value) return value; await new Promise(r => setTimeout(r, 20)); } throw new Error('Timed out waiting for ' + phase); }
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
  const joinTwo = await request(`/api/rooms/${pin}/join`, 'POST', { name: 'Second player' }); assert.equal(joinTwo.status, 200);
  const host = new Client(pin, hostLogin.cookie, true), player = new Client(pin, join.cookie), playerTwo = new Client(pin, joinTwo.cookie); clients.push(host,player,playerTwo);
  await host.state('lobby'); await player.state('lobby'); await playerTwo.state('lobby');
  assert.equal((await request(`/api/rooms/${pin}/command`, 'POST', { command: 'start' }, hostLogin.cookie)).status, 200);
  const countdown = await player.state('countdown'); assert.equal(countdown.question, undefined, 'Question must stay hidden until countdown ends');
  assert.equal((await request(`/api/rooms/${pin}/join`, 'POST', { name: 'During countdown' })).status, 409);
  player.answer('not-yet-open', 0); await new Promise(r=>setTimeout(r,100)); assert.ok(player.errors.includes('ปิดรับคำตอบแล้ว'));
  const countdownHost = await host.state('countdown'); assert.equal(countdownHost.deadline, countdown.deadline, 'Host and players share a countdown deadline');
  const preview = await player.state('preview'); assert.equal(preview.question?.text, 'Planet?'); assert.deepEqual(preview.question?.options, [], 'Options stay hidden while players read the question');
  const reading = preview.deadline - preview.serverTime; assert.ok(reading > 29000 && reading <= 30000, 'Reading time is a fixed 30 seconds');
  player.answer(preview.question!.id, 0); await new Promise(r=>setTimeout(r,100)); assert.equal(player.errors.filter(e => e === 'ปิดรับคำตอบแล้ว').length, 2, 'No answers while reading');
  assert.equal((await request(`/api/rooms/${pin}/command`, 'POST', { command: 'open' }, hostLogin.cookie)).status, 200);
  const before = await player.state('question', () => true, 8000); assert.equal(before.question?.options.length, 4); assert.equal(before.question?.correct, undefined); assert.equal(before.question?.explanation, undefined);
  assert.ok(before.deadline - before.serverTime > 9500, 'Full answer time starts when answers open');
  player.answer(before.question!.id, 0); const answered = await player.state('question', s => s.me?.answered === true); assert.equal(answered.me?.points, undefined); assert.equal(answered.me?.score, 0, 'Answer correctness must not leak via total before reveal');
  player.answer(before.question!.id, 1); await new Promise(r=>setTimeout(r,100)); assert.ok(player.errors.includes('คุณตอบข้อนี้แล้ว'));
  assert.equal((await request(`/api/rooms/${pin}/join`, 'POST', { name: 'Late' })).status, 409);
  assert.equal(host.states.at(-1)?.phase, 'question', 'Keep accepting answers until everyone answers');
  playerTwo.answer(before.question!.id, 1);
  const reveal = await player.state('reveal'); assert.equal(reveal.question?.correct, 0); assert.ok(reveal.me!.points! > 500); assert.equal(reveal.distribution?.[0], 1);
  assert.ok(reveal.serverTime < before.deadline, 'Reveal immediately before the original deadline');
  assert.equal((await playerTwo.state('reveal')).me?.points, 0);
  assert.equal((await host.state('reveal')).answeredCount, 2);
  playerTwo.answer(before.question!.id, 0); await new Promise(r=>setTimeout(r,100)); assert.ok(playerTwo.errors.includes('ปิดรับคำตอบแล้ว'));
  player.close(); const resumed = new Client(pin, join.cookie); clients.push(resumed); assert.equal((await resumed.state('reveal')).me?.score, reveal.me?.score);
  await request(`/api/rooms/${pin}/command`, 'POST', { command: 'next' }, hostLogin.cookie);
  await resumed.state('preview', s => s.questionIndex === 1, 5000); assert.equal((await request(`/api/rooms/${pin}/command`, 'POST', { command: 'open' }, hostLogin.cookie)).status, 200);
  const second = await resumed.state('question', s => s.questionIndex === 1, 10000); resumed.answer(before.question!.id, 1); await new Promise(r=>setTimeout(r,100)); assert.ok(resumed.errors.includes('ปิดรับคำตอบแล้ว'));
  resumed.answer(second.question!.id, 0); await resumed.state('question', s=>s.questionIndex===1&&s.me?.answered===true);
  // An alarm automatically reveals the second question after its deadline.
  await new Promise(r=>setTimeout(r,10100)); const timed = await resumed.state('reveal', s=>s.questionIndex===1); assert.equal(timed.me?.points, 0); assert.equal(timed.question?.correct, 1);
  await request(`/api/rooms/${pin}/command`, 'POST', { command: 'next' }, hostLogin.cookie); assert.equal((await resumed.state('finished')).players.length, 2);
  // A solo player also completes a question; the host can still end an incomplete question manually.
  const soloRoom = await request('/api/rooms', 'POST', { quizId: saved.data.id }, hostLogin.cookie), soloPin = String(soloRoom.data.pin);
  const soloJoin = await request(`/api/rooms/${soloPin}/join`, 'POST', { name: 'Solo' });
  const solo = new Client(soloPin, soloJoin.cookie); clients.push(solo); await solo.state('lobby');
  await request(`/api/rooms/${soloPin}/command`, 'POST', { command: 'start' }, hostLogin.cookie);
  await solo.state('preview', () => true, 5000); assert.equal((await request(`/api/rooms/${soloPin}/command`, 'POST', { command: 'open' }, hostLogin.cookie)).status, 200);
  const soloQuestion = await solo.state('question'); assert.ok(soloQuestion.deadline - soloQuestion.serverTime > 9500, 'Opening early still gives the full answer time'); solo.answer(soloQuestion.question!.id, 0);
  const soloReveal = await solo.state('reveal'); assert.equal(soloReveal.answeredCount, 1); assert.ok(soloReveal.serverTime < soloQuestion.deadline);
  await request(`/api/rooms/${soloPin}/command`, 'POST', { command: 'next' }, hostLogin.cookie); await solo.state('preview', s=>s.questionIndex===1, 5000); assert.equal((await request(`/api/rooms/${soloPin}/command`, 'POST', { command: 'open' }, hostLogin.cookie)).status, 200); await solo.state('question', s=>s.questionIndex===1, 10000);
  await request(`/api/rooms/${soloPin}/command`, 'POST', { command: 'reveal' }, hostLogin.cookie);
  assert.equal((await solo.state('reveal', s=>s.questionIndex===1)).answeredCount, 0);
  const crossOrigin = await fetch(base + '/api/logout', { method:'POST',headers:{Origin:'https://evil.example',Cookie:hostLogin.cookie} }); assert.equal(crossOrigin.status,403);
  const newEmail = `renamed-${suffix}@example.com`, newPassword = 'Test@2026';
  assert.equal((await request('/api/accounts/change-login','POST',{currentEmail:email,email:newEmail,password:newPassword},hostLogin.cookie)).status,403);
  assert.equal((await request('/api/accounts/change-login','POST',{currentEmail:email,email:other,password:newPassword},'',true)).status,409);
  for (let i = 0; i < 12; i++) {
    const repeat = await request('/api/login','POST',{email,password});
    assert.equal(repeat.status,200,'Successful sign-ins must not exhaust the account limit');
    await request('/api/logout','POST',undefined,repeat.cookie);
  }
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/login','POST',{email,password:'wrong'})).status,401);
  assert.equal((await request('/api/login','POST',{email,password})).status,429,'Repeated failed attempts lock the account');
  assert.equal((await request('/api/accounts/change-login','POST',{currentEmail:email,email:newEmail,password:newPassword},'',true)).status,200);
  assert.equal((await request('/api/me','GET',undefined,hostLogin.cookie)).status,401, 'Changing credentials revokes old sessions');
  assert.equal((await request('/api/login','POST',{email,password})).status,401);
  assert.equal((await request('/api/login','POST',{email,password:newPassword})).status,401);
  assert.equal((await request('/api/login','POST',{email:newEmail,password})).status,401);
  const renamed = await request('/api/login','POST',{email:newEmail,password:newPassword}); assert.equal(renamed.status,200); assert.equal(renamed.data.email,newEmail);
  assert.deepEqual((await request('/api/quizzes/'+saved.data.id,'GET',undefined,renamed.cookie)).data,saved.data,'Quiz IDs and contents survive credential changes');
  assert.equal((await request(`/api/rooms/${soloPin}/command`,'POST',{command:'close'},renamed.cookie)).status,200,'Existing room ownership survives email changes');
  assert.equal((await request('/api/accounts','POST',{email:newEmail,name:'Duplicate',password},'',true)).status,409,'Login aliases cannot be provisioned as a second account');
  await request('/api/logout','POST',undefined,renamed.cookie); assert.equal((await request('/api/me','GET',undefined,renamed.cookie)).status,401);
  console.log('PASS: login, quiz isolation, host permissions, countdown, realtime answers, immediate reveal, deadline/manual reveal, CSRF, credential changes preserve quizzes/rooms, old credentials/sessions revoked, alias collisions rejected and logout.');
} finally { clients.forEach(c=>c.close()); }
