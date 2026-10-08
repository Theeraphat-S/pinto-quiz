import { DurableObject } from 'cloudflare:workers';
import { digest, hashPassword, HttpError, randomToken, safeEqual } from './security';
import { type Quiz, validateQuiz, readQuiz } from './shared';
type Profile = { email: string; name: string; salt: string; hash: string };
export class AccountStore extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS login_target (id INTEGER PRIMARY KEY, target TEXT NOT NULL)');
  }
  private profile(): Profile | undefined { const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM profile WHERE id = 1').toArray()[0]; return row ? JSON.parse(row.data) as Profile : undefined; }
  async provision(email: string, name: string, password: string): Promise<boolean> {
    if (this.profile() || this.loginTarget()) return false;
    const salt = randomToken(), hash = await hashPassword(password, salt);
    // Conditional insert is atomic even if another provisioning call finished while hashing.
    this.ctx.storage.transactionSync(() => {
      if (!this.loginTarget()) this.ctx.storage.sql.exec('INSERT OR IGNORE INTO profile(id, data) VALUES(1, ?)', JSON.stringify({ email, name, salt, hash }));
    });
    return this.profile()?.salt === salt;
  }
  loginTarget(): string | null { return this.ctx.storage.sql.exec<{ target: string }>('SELECT target FROM login_target WHERE id=1').toArray()[0]?.target || null; }
  setLoginTarget(target: string): boolean {
    if (this.profile()) return false;
    const current = this.loginTarget(); if (current) return current === target;
    this.ctx.storage.sql.exec('INSERT INTO login_target VALUES(1, ?)', target); return true;
  }
  identity(): { email: string; name: string } | null { const p = this.profile(); return p ? { email: p.email, name: p.name } : null; }
  async updateLogin(email: string, password: string): Promise<void> {
    const p = this.profile(); if (!p) throw new HttpError(404, 'ไม่พบบัญชีผู้จัด');
    const salt = randomToken(), hash = await hashPassword(password, salt);
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('UPDATE profile SET data=? WHERE id=1', JSON.stringify({ ...p, email, salt, hash }));
      this.ctx.storage.sql.exec('DELETE FROM sessions');
    });
  }
  async login(password: string, email: string): Promise<{ token: string; email: string; name: string } | null> {
    const p = this.profile();
    const hash = await hashPassword(password, p?.salt || 'pinto-nonexistent-account');
    if (!p || !safeEqual(hash, p.hash) || p.email !== email) return null;
    const token = randomToken(), key = await digest(token);
    // A credential change may have occurred while password/token hashing yielded.
    if (this.profile()?.salt !== p.salt) return null;
    this.ctx.storage.sql.exec('DELETE FROM sessions WHERE expires < ?', Date.now());
    this.ctx.storage.sql.exec('INSERT INTO sessions(token, expires) VALUES(?, ?)', key, Date.now() + 86400000);
    return { token, email: p.email, name: p.name };
  }
  async verify(token: string): Promise<{ email: string; name: string } | null> {
    if (token.length > 150) return null;
    const row = this.ctx.storage.sql.exec<{ expires: number }>('SELECT expires FROM sessions WHERE token = ?', await digest(token)).toArray()[0];
    const p = this.profile(); return row && row.expires > Date.now() && p ? { email: p.email, name: p.name } : null;
  }
  async logout(token: string): Promise<void> { this.ctx.storage.sql.exec('DELETE FROM sessions WHERE token = ?', await digest(token)); }
  list(): Quiz[] { return this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM quizzes ORDER BY updated DESC').toArray().map(r => readQuiz(r.data)); }
  get(id: string): Quiz | null { const row = this.ctx.storage.sql.exec<{ data: string }>('SELECT data FROM quizzes WHERE id = ?', id).toArray()[0]; return row ? readQuiz(row.data) : null; }
  save(id: string | null, input: unknown): Quiz {
    if (id && !this.get(id)) throw new HttpError(404, 'ไม่พบ Quiz นี้');
    const data = validateQuiz(input); const quiz: Quiz = { ...data, id: id || crypto.randomUUID(), updatedAt: Date.now() };
    if (!id && this.list().length >= 100) throw new HttpError(400, 'เก็บได้สูงสุด 100 Quiz ต่อบัญชี');
    this.ctx.storage.sql.exec('INSERT INTO quizzes(id, data, updated) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated', quiz.id, JSON.stringify(quiz), quiz.updatedAt);
    return quiz;
  }
  remove(id: string): void { this.ctx.storage.sql.exec('DELETE FROM quizzes WHERE id = ?', id); }
}
export class RateGuard extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) { super(ctx, env); ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY, start INTEGER, count INTEGER)'); }
  async allow(limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now(); const row = this.ctx.storage.sql.exec<{ start: number; count: number }>('SELECT start, count FROM attempts WHERE id=1').toArray()[0];
    if (!row || now - row.start >= windowMs) { this.ctx.storage.sql.exec('INSERT INTO attempts VALUES(1, ?, 1) ON CONFLICT(id) DO UPDATE SET start=excluded.start, count=1', now); await this.ctx.storage.setAlarm(now + windowMs); return true; }
    if (row.count >= limit) return false;
    this.ctx.storage.sql.exec('UPDATE attempts SET count=count+1 WHERE id=1'); return true;
  }
  async reset(): Promise<void> { this.ctx.storage.sql.exec('DELETE FROM attempts'); await this.ctx.storage.deleteAlarm(); }
  async alarm(): Promise<void> { this.ctx.storage.sql.exec('DELETE FROM attempts'); }
}
