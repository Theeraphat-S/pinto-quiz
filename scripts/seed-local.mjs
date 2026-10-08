// Seeds the local wrangler dev database with demo manager accounts and sample quizzes.
// Localhost only; safe to re-run (existing accounts and quiz titles are skipped).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const base = (process.env.SEED_URL || 'http://localhost:8787').replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Seed data is for the local dev database only.');
if (!existsSync('.dev.vars')) {
  writeFileSync('.dev.vars', `SETUP_TOKEN=${randomBytes(32).toString('hex')}\n`);
  console.log('Created .dev.vars with a random SETUP_TOKEN — restart `npm run dev`, then run this again.');
  process.exit(1);
}
const setup = readFileSync('.dev.vars', 'utf8').match(/^SETUP_TOKEN=(.+)$/m)?.[1].trim();
if (!setup) throw new Error('SETUP_TOKEN missing from .dev.vars');
async function request(path, method = 'GET', body, cookie = '', setupToken = false) {
  const response = await fetch(base + path, { method, headers: { Origin: base, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(setupToken ? { Authorization: 'Bearer ' + setup } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, cookie: (response.headers.get('Set-Cookie') || '').split(';')[0], data: await response.json() };
}
const q = (text, options, correct, explanation, duration = 20, maxScore = 1000) => ({ text, options, correct, explanation, duration, maxScore });
const accounts = [
  { email: 'demo@pinto.local', name: 'ครูพินโต', password: 'pinto-demo-2026', quizzes: [
    { title: 'ความรู้รอบตัวประเทศไทย', music: true, questions: [
      q('เมืองหลวงของประเทศไทยคือเมืองใด?', ['เชียงใหม่', 'กรุงเทพมหานคร', 'ขอนแก่น', 'ภูเก็ต'], 1, 'กรุงเทพมหานครเป็นเมืองหลวงของไทยตั้งแต่ พ.ศ. 2325'),
      q('แม่น้ำสายใดไหลผ่านกรุงเทพมหานคร?', ['แม่น้ำโขง', 'แม่น้ำปิง', 'แม่น้ำเจ้าพระยา', 'แม่น้ำมูล'], 2, 'แม่น้ำเจ้าพระยาไหลผ่านใจกลางกรุงเทพฯ ลงสู่อ่าวไทย'),
      q('ดอกไม้ประจำชาติไทยคือดอกอะไร?', ['ดอกบัว', 'ดอกมะลิ', 'ดอกกุหลาบ', 'ดอกราชพฤกษ์'], 3, 'ดอกราชพฤกษ์หรือดอกคูนเป็นดอกไม้ประจำชาติไทย', 15),
      q('ยอดเขาที่สูงที่สุดในประเทศไทยคือ?', ['ดอยอินทนนท์', 'ดอยสุเทพ', 'ภูกระดึง', 'เขาใหญ่'], 0, 'ดอยอินทนนท์ จ.เชียงใหม่ สูงประมาณ 2,565 เมตร', 20, 2000),
      q('สัตว์ประจำชาติไทยคือ?', ['เสือ', 'ช้าง', 'นกยูง', 'ม้า'], 1, 'ช้างไทยเป็นสัตว์ประจำชาติ', 10),
    ] },
    { title: 'คณิตคิดเร็ว', music: true, questions: [
      q('12 × 8 = ?', ['86', '96', '108', '92'], 1, '12 × 8 = 96', 15),
      q('รากที่สองของ 144 คือ?', ['11', '14', '12', '13'], 2, '12 × 12 = 144', 15),
      q('25% ของ 360 คือ?', ['90', '80', '72', '100'], 0, '360 ÷ 4 = 90', 20),
      q('จำนวนเฉพาะในข้อใด?', ['21', '27', '33', '29'], 3, '29 หารลงตัวด้วย 1 และตัวมันเองเท่านั้น', 20, 2000),
    ] },
    { title: 'วิทยาศาสตร์น่ารู้', music: false, questions: [
      q('ดาวเคราะห์ที่ใหญ่ที่สุดในระบบสุริยะคือ?', ['โลก', 'ดาวเสาร์', 'ดาวพฤหัสบดี', 'ดาวเนปจูน'], 2, 'ดาวพฤหัสบดีมีมวลมากกว่าดาวเคราะห์ดวงอื่นรวมกัน'),
      q('น้ำเดือดที่อุณหภูมิเท่าใด (ที่ระดับน้ำทะเล)?', ['90 °C', '100 °C', '110 °C', '120 °C'], 1, 'ที่ความดัน 1 บรรยากาศ น้ำเดือดที่ 100 °C', 15),
      q('สัญลักษณ์ทางเคมีของทองคำคือ?', ['Au', 'Ag', 'Go', 'Gd'], 0, 'Au มาจากภาษาละติน aurum', 15),
      q('อวัยวะใดสูบฉีดเลือดไปทั่วร่างกาย?', ['ปอด', 'ตับ', 'ไต', 'หัวใจ'], 3, 'หัวใจทำหน้าที่สูบฉีดเลือด', 10),
    ] },
  ] },
  { email: 'host2@pinto.local', name: 'ผู้จัดทดสอบ', password: 'pinto-host2-2026', quizzes: [
    { title: 'ภาษาอังกฤษพื้นฐาน', music: true, questions: [
      q('"Apple" แปลว่าอะไร?', ['ส้ม', 'แอปเปิล', 'กล้วย', 'องุ่น'], 1, 'Apple = แอปเปิล', 10),
      q('Past tense ของ "go" คือ?', ['goed', 'gone', 'went', 'going'], 2, 'go → went → gone', 15),
      q('ข้อใดเป็นคำนาม (noun)?', ['happy', 'quickly', 'run', 'teacher'], 3, 'teacher เป็นคำนาม', 15),
    ] },
  ] },
];
try {
  if ((await request('/api/health').catch(() => null))?.status !== 200) throw new Error(`Dev server is not reachable at ${base} — run \`npm run dev\` first.`);
  for (const account of accounts) {
    const created = await request('/api/accounts', 'POST', { email: account.email, name: account.name, password: account.password }, '', true);
    if (created.status === 403) throw new Error('SETUP_TOKEN rejected — restart `npm run dev` so it loads .dev.vars.');
    if (![201, 409].includes(created.status)) throw new Error(created.data.error);
    const login = await request('/api/login', 'POST', { email: account.email, password: account.password });
    if (login.status !== 200) throw new Error(`${account.email}: ${login.data.error} (password changed?)`);
    const existing = new Set((await request('/api/quizzes', 'GET', undefined, login.cookie)).data.map(x => x.title));
    let added = 0;
    for (const quiz of account.quizzes) {
      if (existing.has(quiz.title)) continue;
      const saved = await request('/api/quizzes', 'POST', quiz, login.cookie);
      if (saved.status !== 201) throw new Error(`${quiz.title}: ${saved.data.error}`);
      added++;
    }
    await request('/api/logout', 'POST', {}, login.cookie);
    console.log(`${created.status === 201 ? 'created' : 'exists '}  ${account.email} / ${account.password}  (+${added} quiz)`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
