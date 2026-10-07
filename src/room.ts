import { DurableObject } from 'cloudflare:workers';
import { digest, HttpError, randomToken } from './security';
import { type Quiz, type Player, type Phase, type RoomView, scoreAnswer } from './shared';
type Room = { owner: string; pin: string; quiz: Quiz; phase: Phase; index: number; started: number; deadline: number; expires: number };
type AnswerRow = { choice: number; points: number; elapsed: number };
type Attachment = { role: 'host' | 'player'; id?: string };
export class QuizRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room(id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, score INTEGER NOT NULL DEFAULT 0)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS answers(player TEXT, question INTEGER, choice INTEGER, points INTEGER, elapsed INTEGER, PRIMARY KEY(player, question))');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  private room(): Room | null { const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM room WHERE id=1').toArray()[0]; return row ? JSON.parse(row.data) as Room : null; }
  private requireRoom(): Room { const room = this.room(); if (!room || room.expires <= Date.now()) throw new HttpError(404, 'ห้องหมดอายุหรือไม่พบห้อง'); return room; }
  private save(room: Room): void { this.ctx.storage.sql.exec('INSERT INTO room VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', JSON.stringify(room)); }
  async initialize(owner: string, pin: string, quiz: Quiz): Promise<boolean> {
    if (this.room()) return false;
    const room: Room = { owner, pin, quiz, phase: 'lobby', index: -1, started: 0, deadline: 0, expires: Date.now() + 86400000 };
    this.save(room); await this.ctx.storage.setAlarm(room.expires); return true;
  }
  info(): { title: string; phase: Phase } { const r = this.requireRoom(); return { title: r.quiz.title, phase: r.phase }; }
  private playerId(token: string): string | undefined { return this.ctx.storage.sql.exec<{ id: string }>('SELECT id FROM players WHERE token=?', token).toArray()[0]?.id; }
  async join(name: string, previousToken: string): Promise<{ token: string; id: string }> {
    const r = this.requireRoom();
    if (previousToken) { const id = this.playerId(await digest(previousToken)); if (id) return { id, token: previousToken }; }
    if (r.phase !== 'lobby') throw new HttpError(409, 'เกมเริ่มแล้ว เข้าร่วมใหม่ไม่ได้');
    const count = this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM players').one().n;
    if (count >= 300) throw new HttpError(409, 'ห้องเต็มแล้ว (300 คน)');
    const token = randomToken(), id = crypto.randomUUID(), tokenHash = await digest(token);
    // Recheck after async hashing, so simultaneous joins cannot exceed capacity or join after start.
    if (this.requireRoom().phase !== 'lobby') throw new HttpError(409, 'เกมเริ่มแล้ว');
    if (this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM players').one().n >= 300) throw new HttpError(409, 'ห้องเต็มแล้ว');
    this.ctx.storage.sql.exec('INSERT INTO players(id,name,token) VALUES(?,?,?)', id, name, tokenHash);
    this.broadcast(); return { id, token };
  }
  async command(owner: string, command: string): Promise<void> {
    const r = this.requireRoom(); if (r.owner !== owner) throw new HttpError(403, 'คุณไม่ได้เป็นผู้จัดห้องนี้');
    if (command === 'start' && r.phase === 'lobby') { r.index = 0; r.phase = 'countdown'; }
    else if (command === 'reveal' && r.phase === 'question') r.phase = 'reveal';
    else if (command === 'leaderboard' && r.phase === 'reveal') r.phase = 'leaderboard';
    else if (command === 'next' && (r.phase === 'reveal' || r.phase === 'leaderboard')) { r.index++; r.phase = r.index >= r.quiz.questions.length ? 'finished' : 'countdown'; }
    else if (command === 'close') r.phase = 'closed';
    else throw new HttpError(409, 'คำสั่งนี้ใช้ไม่ได้ในช่วงเกมปัจจุบัน');
    if (r.phase === 'countdown') { r.started = 0; r.deadline = Date.now() + 3000; }
    this.save(r); await this.ctx.storage.setAlarm(r.phase === 'countdown' ? r.deadline : r.expires); this.broadcast();
  }
  private view(a: Attachment): RoomView {
    const r = this.requireRoom(); const q = r.quiz.questions[r.index];
    const players = this.ctx.storage.sql.exec<Player>('SELECT id,name,score FROM players ORDER BY score DESC,name ASC,id ASC').toArray();
    const answeredCount = this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM answers WHERE question=?', r.index).one().n;
    const reveal = ['reveal', 'leaderboard', 'finished'].includes(r.phase);
    const v: RoomView = { pin: r.pin, title: r.quiz.title, music: r.quiz.music, phase: r.phase, questionIndex: r.index, questionCount: r.quiz.questions.length, serverTime: Date.now(), deadline: r.deadline, players: a.role === 'host' || reveal ? players : [], playerCount: players.length, answeredCount, ...(a.role === 'host' ? { quizId: r.quiz.id } : {}) };
    // Do not publish question contents or accept answers during the shared 3-2-1 countdown.
    if (q && r.phase !== 'countdown') { v.question = { id: q.id, text: q.text, options: q.options, duration: q.duration, maxScore: q.maxScore }; if (reveal) { v.question.correct = q.correct; v.question.explanation = q.explanation; v.distribution = q.options.map((_, i) => this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM answers WHERE question=? AND choice=?', r.index, i).one().n); } }
    if (a.id) { const player = players.find(p => p.id === a.id); const answer = this.ctx.storage.sql.exec<AnswerRow>('SELECT choice,points,elapsed FROM answers WHERE player=? AND question=?', a.id, r.index).toArray()[0]; if (player) v.me = { ...player, score: player.score - (!reveal && answer ? answer.points : 0), answered: !!answer, ...(answer ? { choice: answer.choice } : {}), ...(answer && reveal ? { points: answer.points, elapsed: answer.elapsed } : {}) }; }
    return v;
  }
  private broadcast(): void { for (const ws of this.ctx.getWebSockets()) { try { ws.send(JSON.stringify({ type: 'state', state: this.view(ws.deserializeAttachment() as Attachment) })); } catch { ws.close(1011, 'Connection error'); } } }
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Not found', { status: 404 });
    return this.openSocket(request.headers.get('X-Pinto-Owner'), request.headers.get('X-Pinto-Player') || '');
  }
  private async openSocket(owner: string | null, token: string): Promise<Response> {
    const r = this.requireRoom(); let attachment: Attachment;
    if (owner) { if (r.owner !== owner) throw new HttpError(403, 'คุณไม่ได้เป็นผู้จัดห้องนี้'); attachment = { role: 'host' }; }
    else { const id = this.playerId(await digest(token)); if (!id) throw new HttpError(401, 'กรุณาเข้าห้องก่อน'); attachment = { role: 'player', id }; }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair); this.ctx.acceptWebSocket(server); server.serializeAttachment(attachment);
    server.send(JSON.stringify({ type: 'state', state: this.view(attachment) })); return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const a = ws.deserializeAttachment() as Attachment;
    try {
      if (typeof message !== 'string' || message.length > 512) throw new Error('ข้อความไม่ถูกต้อง');
      const input = JSON.parse(message) as { type: string; questionId: string; choice: number };
      if (input.type !== 'answer' || a.role !== 'player' || !a.id) throw new Error('คำสั่งไม่ถูกต้อง');
      const r = this.requireRoom(), q = r.quiz.questions[r.index];
      if (r.phase !== 'question' || !q || input.questionId !== q.id || Date.now() >= r.deadline) throw new Error('ปิดรับคำตอบแล้ว');
      if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice > 3) throw new Error('ตัวเลือกไม่ถูกต้อง');
      if (this.ctx.storage.sql.exec('SELECT player FROM answers WHERE player=? AND question=?', a.id, r.index).toArray().length) throw new Error('คุณตอบข้อนี้แล้ว');
      const elapsed = Date.now() - r.started, points = scoreAnswer(input.choice === q.correct, elapsed, q.duration, q.maxScore);
      let complete = false;
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec('INSERT INTO answers VALUES(?,?,?,?,?)', a.id!, r.index, input.choice, points, elapsed);
        this.ctx.storage.sql.exec('UPDATE players SET score=score+? WHERE id=?', points, a.id!);
        const answered = this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM answers WHERE question=?', r.index).one().n;
        const players = this.ctx.storage.sql.exec<{ n: number }>('SELECT count(*) AS n FROM players').one().n;
        complete = players > 0 && answered === players;
        if (complete) { r.phase = 'reveal'; this.save(r); }
      });
      if (complete) {
        await this.ctx.storage.setAlarm(r.expires);
        this.broadcast(); return;
      }
      // Only the submitting player and hosts need an update. No N² broadcast for answer bursts.
      for (const socket of this.ctx.getWebSockets()) { const target = socket.deserializeAttachment() as Attachment; if (target.role === 'host' || target.id === a.id) { try { socket.send(JSON.stringify({ type: 'state', state: this.view(target) })); } catch { socket.close(1011, 'Connection error'); } } }
    } catch (error) { ws.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'ส่งคำตอบไม่ได้' })); }
  }
  webSocketClose(ws: WebSocket): void {
    // A client may omit a close code, reported as reserved code 1005.
    // Acknowledge with a valid normal closure instead of echoing reserved codes.
    ws.close(1000, 'Connection closed');
  }
  async alarm(): Promise<void> {
    const r = this.room(); if (!r) return;
    if (Date.now() >= r.expires) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room expired');
      // Preserve the schema for subsequent requests to this still-live instance.
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec('DELETE FROM answers');
        this.ctx.storage.sql.exec('DELETE FROM players');
        this.ctx.storage.sql.exec('DELETE FROM room');
      });
      return;
    }
    if (r.phase === 'countdown' && Date.now() >= r.deadline) {
      r.phase = 'question'; r.started = Date.now();
      r.deadline = r.started + r.quiz.questions[r.index].duration * 1000;
      this.save(r); this.broadcast();
    } else if (r.phase === 'question' && Date.now() >= r.deadline) { r.phase = 'reveal'; this.save(r); this.broadcast(); }
    await this.ctx.storage.setAlarm(r.phase === 'question' || r.phase === 'countdown' ? r.deadline : r.expires);
  }
}
