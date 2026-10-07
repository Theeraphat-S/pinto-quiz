import './style.css';
import QRCode from 'qrcode';
import { enableSound, cue, beat, setMusic } from './sound';
import { fitStage, stopStageFit } from './stage';
import { answeredIn, enterScene, joinIn, leave, myRankIn, pickAnswer, questionIn, resultIn, revealIn, standingsIn, stopAll, type Standing } from './motion';
import { normalizePin, promoTagline, type Quiz, type Question, type RoomView } from '../src/shared';
const app = document.querySelector<HTMLDivElement>('#app')!;
const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const letters = ['A', 'B', 'C', 'D'];
let user: { name: string; email: string } | null = null;
let draft: Quiz | null = null, editIndex = 0, socket: WebSocket | null = null, state: RoomView | null = null, socketKey = '', reconnect: ReturnType<typeof setTimeout> | null = null, attempts = 0, disconnected = false, offset = 0, submitting = false;
// Each page load needs a user gesture to unlock browser audio.
let muted = true, lastBeat = -1, lastCue = '';
let qrCache: { url: string; data: string } | null = null, roomRoute = '', renderVersion = 0, picked = -1;
// Sister-app cross-promo: only in idle moments (lobbies, standings, finale, admin), never during countdown, questions or reveals.
type PromoSpot = 'lobby' | 'finale' | 'player' | 'player-lobby' | 'admin';
const pintoAppUrl = (medium: PromoSpot) => `https://pinto-app.com/?lang=th&amp;utm_source=pinto-quiz&amp;utm_medium=${medium}`;
const promoLine = (medium: PromoSpot) => `<a class="promo-line" href="${pintoAppUrl(medium)}" target="_blank" rel="noopener"><img src="/pinto-app-mark.webp" alt="" width="40" height="40"><span>จากครอบครัว PiN TO! · ชุมชนรีวิวของคนไทย → <b>pinto-app.com</b></span></a>`;
const promoCard = (medium: PromoSpot, { text = 'ชอบ PiN TO! ไหม? มาเจอกันต่อที่ <b>Pinto</b> แอปรีวิวไลฟ์สไตล์ของคนไทย', dismissible = false } = {}) => `<aside class="promo-card" aria-label="แอป Pinto">${dismissible ? '<button class="promo-close quiet" data-action="dismiss-promo" aria-label="ซ่อนการแนะนำแอป Pinto">×</button>' : ''}<img src="/pinto-app.webp" alt="โลโก้แอป Pinto" width="64" height="64"><div><p>${text}</p>${dismissible ? '<p class="small">ไม่อยากให้แสดงในห้องเกม? ปิดได้ที่ "แนะนำแอป Pinto" ในหน้าแก้ไขแต่ละ Quiz</p>' : ''}<a class="promo-link" href="${pintoAppUrl(medium)}" target="_blank" rel="noopener" aria-label="ดูแอป Pinto (เปิดแท็บใหม่)">ดูแอป Pinto</a></div></aside>`;
// Mid-game standings on phones: awareness only, no link, so nobody leaves the tab and misses the next countdown.
const promoNote = (seed: number) => `<p class="promo-note"><img src="/pinto-app.webp" alt="" width="28" height="28">${promoTagline(seed)}</p>`;
const PROMO_DISMISSED = 'pinto-promo-dismissed';
const promoDismissed = () => { try { return localStorage.getItem(PROMO_DISMISSED) === '1'; } catch { return false; } };
function toast(message: string) { document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'alert'); el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 5000); }
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด'); return data;
}
function header() { return `<header class="header"><a href="/" data-nav class="brand"><img src="/logo.png" alt="PiN TO!"><div><strong>PiN TO<span>! / QUIZ</span></strong><small>PLAY · THINK · WIN</small></div></a><div class="controls">${user ? `<span>${escape(user.name)}</span><button data-action="library">คลัง Quiz</button><button data-action="logout">ออกจากระบบ</button>` : '<a href="/login" data-nav>สำหรับผู้จัดเกม</a>'}</div></header>`; }
// Room screens are keyed by scene (role:pin:phase:question). Entrance motion plays only when the key changes;
// re-renders inside a scene swap just their live parts, or the whole frame without replaying the entrance.
type Paint = 'enter' | 'replace' | 'patch' | 'same';
let paintedScene = '', paintedFrame = '', paintedLive: string[] = [], liveParts: string[] = [];
// Marks an element (carrying data-live="name") that changes while its scene is on screen.
const live = (html: string) => (liveParts.push(html), html);
function paint(scene: string, html: string): Paint {
  const parts = liveParts, before = paintedLive; liveParts = [];
  const frame = parts.reduce((rest, part) => rest.replace(part, ''), html);
  if (scene && scene === paintedScene && frame === paintedFrame && parts.length === before.length) {
    const changed = parts.flatMap((part, i) => part === before[i] ? [] : [{ el: app.querySelector(`[data-live="${/data-live="([^"]+)"/.exec(part)?.[1]}"]`), part }]);
    if (changed.every(c => c.el)) { changed.forEach(c => c.el!.outerHTML = c.part); paintedLive = parts; return changed.length ? 'patch' : 'same'; }
  }
  const entering = scene !== paintedScene;
  stopAll(); app.toggleAttribute('data-entering', entering); app.innerHTML = html;
  paintedScene = scene; paintedFrame = frame; paintedLive = parts;
  return entering ? 'enter' : 'replace';
}
function shell(content: string) { stopStageFit(); document.body.dataset.view = location.pathname.startsWith('/host') ? 'host' : 'site'; paint('', `<div class="shell">${header()}<main class="main">${content}</main></div>`); }
function playerShell(content: string, scene = '') { const html = `<div class="player-shell"><header class="player-header"><strong>PiN TO! / PLAY</strong><button data-action="sound" aria-pressed="${!muted}">${soundLabel()}</button></header>${disconnected ? '<div class="connection" role="status">กำลังเชื่อมต่อใหม่…</div>' : ''}<main class="player-main">${content}</main></div>`; const painted = paint(scene, html); if (painted === 'enter' || painted === 'replace') { stopStageFit(); document.body.dataset.view = 'player'; } return painted; }
function go(path: string) { history.pushState(null, '', path); void route().catch(e => toast(e.message)); }
function stopSocket() { setMusic(false); socketKey = ''; socket?.close(); socket = null; if (reconnect) clearTimeout(reconnect); reconnect = null; state = null; attempts = 0; disconnected = false; lastCue = ''; delete document.body.dataset.phase; }
async function needUser() { if (!user) { try { user = await api('/api/me'); } catch { go('/login?return=' + encodeURIComponent(location.pathname)); return false; } } return true; }
function makeQuestion(): Question { return { id: crypto.randomUUID(), text: '', options: ['', '', '', ''], correct: 0, explanation: '', duration: 20, maxScore: 1000 }; }
async function route() {
  let path = location.pathname;
  const loose = path.match(/^\/(host|play)\/([^/]+)$/);
  if (loose) { let raw = loose[2]; try { raw = decodeURIComponent(raw); } catch { /* keep as typed */ } const pin = normalizePin(raw); if (pin.length === 6 && pin !== loose[2]) { path = `/${loose[1]}/${pin}`; history.replaceState(null, '', path + location.search + location.hash); } }
  const room = path.match(/^\/(host|play)\/(\d{6})$/);
  if (room) { const [, role, pin] = room; if (roomRoute !== path) { stopSocket(); roomRoute = path; } if (role === 'host' && !await needUser()) return; if (role === 'host') { shell('<div class="loading">กำลังเปิดห้อง…</div>'); connect(pin, true); } else { playerShell('<div class="loading">กำลังเปิดห้อง…</div>'); try { const info = await api<{ title: string; phase: string }>('/api/rooms/' + pin); const joined = sessionStorage.getItem('pinto-joined-' + pin); if (joined) connect(pin, false); else joinForm(pin, info.title); } catch (e) { playerShell(`<h1>เข้าห้องไม่ได้</h1><p>${escape((e as Error).message)}</p><button class="primary" data-action="home">กลับหน้าแรก</button>`); } } return; }
  stopSocket(); roomRoute = '';
  if (path === '/login') { if (await api('/api/me').then(u => { user = u as typeof user; return true; }).catch(() => false)) { go('/admin'); return; } shell(`<div class="loginlayout"><div class="intro"><div class="kicker">HOST ACCESS</div><h1>จัดควิซของคุณ<br>ให้เป็นเรื่องสนุก</h1><p>เข้าสู่ระบบเพื่อสร้าง Quiz และเปิดห้องเล่น</p><div class="hero-mascot"><span class="float-badge badge-one">⚡ THINK FAST!</span><img src="/mascot-v2.webp" alt="มาสคอต PiN TO!"><span class="float-badge badge-two">✦ LET’S PLAY</span></div></div><form id="login-form" class="formpanel"><h2>เข้าสู่ระบบผู้จัด</h2><div class="field"><label for="email">อีเมล</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254"></div><div class="field"><label for="password">รหัสผ่าน</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128"></div><button class="primary" type="submit">เข้าสู่ระบบ</button><p class="small">สำหรับบัญชีที่ได้รับอนุญาตเท่านั้น<br>การสมัครใช้งานยังไม่เปิดให้บริการ</p></form></div>`); return; }
  if (path === '/admin') { if (!await needUser()) return; shell('<div class="loading">กำลังโหลด Quiz…</div>'); const quizzes = await api<Quiz[]>('/api/quizzes'); shell(`<div class="headrow"><div><div class="kicker">YOUR QUIZ COLLECTION</div><h1>เลือกชุด แล้วเปิดเกม</h1><p>Quiz ของคุณ / ${quizzes.length} ชุด</p></div><button class="primary" data-action="new">＋ สร้าง Quiz</button></div><div class="arena-banner"><div><span class="live-label">● YOUR PLAYGROUND</span><h2>เปลี่ยนทุกคำถาม<br>ให้เป็นโมเมนต์สนุก!</h2><p>สแกนเข้าห้อง · คิดให้ไว · พุ่งขึ้นอันดับ</p><div class="featurechips"><span>⚡ ตอบเร็ว ได้แต้มเยอะ</span><span>♫ จังหวะเร้าใจ</span><span>✦ เฉลยพร้อมกัน</span></div></div><div class="mascot-orbit"><img src="/mascot-v2.webp" alt="มาสคอต PiN TO! รุ่นใหม่"></div></div>${quizzes.length ? `<div class="collection">${quizzes.map((q, i) => `<article class="quizcard"><div class="cover"><img src="/mascot-v2.webp" alt="" class="card-mascot"><span>QUIZ / ${String(i + 1).padStart(2, '0')}</span><strong>คิดไว<br>ได้แต้ม!</strong></div><div class="qdetails"><h2>${escape(q.title)}</h2><p>${q.questions.length} คำถาม · ${q.music ? 'เปิด' : 'ปิด'}เสียงนับถอยหลัง</p><div class="controls"><button data-action="edit" data-id="${q.id}">แก้ไข</button><button class="primary" data-action="host" data-id="${q.id}">เปิดห้อง</button><button class="quiet danger" data-action="delete" data-id="${q.id}" aria-label="ลบ Quiz ${escape(q.title)}">ลบ</button></div></div></article>`).join('')}</div>` : '<div class="empty"><img src="/mascot-v2.webp" alt="PiN TO! พร้อมเล่น"><h2>เริ่มจาก Quiz ชุดแรก</h2><p>เพิ่มคำถาม กำหนดคำตอบ แล้วเปิดห้องให้ทุกคนเข้าร่วม</p><button class="primary" data-action="new">＋ สร้าง Quiz</button></div>'}${promoDismissed() ? '' : promoCard('admin', { dismissible: true })}<div class="footer"><span>ตอบถูก ยิ่งเร็ว ยิ่งได้คะแนน</span><span>เฉพาะ Quiz ของบัญชีคุณ</span></div>`); return; }
  if (path === '/admin/new' || /^\/admin\/quiz\/[a-f0-9-]{36}$/.test(path)) { if (!await needUser()) return; draft = path === '/admin/new' ? { id: '', title: '', music: true, promo: true, questions: [makeQuestion()], updatedAt: 0 } : await api<Quiz>('/api/quizzes/' + path.split('/').pop()); editIndex = 0; renderEditor(); return; }
  shell(`<div class="loginlayout"><div class="intro"><div class="kicker">PiN TO! QUIZ ARENA</div><h1>คิดไว กดไว<br>ได้แต้มเต็ม!</h1><p>เข้าห้องด้วย PIN หรือสแกน QR บนจอผู้จัด</p><div class="hero-mascot"><span class="float-badge badge-one">⚡ THINK FAST!</span><img src="/mascot-v2.webp" alt="มาสคอต PiN TO!"><span class="float-badge badge-two">✦ LET’S PLAY</span></div></div><form id="pin-form" class="formpanel"><div class="kicker">JOIN THE FUN</div><h2>เข้าร่วมเกม</h2><div class="field"><label for="pin">PIN ห้อง 6 หลัก</label><input id="pin" name="pin" inputmode="numeric" pattern="[0-9]{6}" minlength="6" required placeholder="482916" autocomplete="off"></div><button class="primary" type="submit">เข้าห้อง</button><p class="small">ผู้เล่นไม่ต้องสมัครสมาชิก</p></form></div>`);
}
function renderEditor() { if (!draft) return; const q = draft.questions[editIndex]; shell(`<div class="headrow"><div><div class="kicker">QUIZ BUILDER</div><h1>${draft.id ? 'แก้ไข Quiz' : 'สร้าง Quiz ใหม่'}</h1></div><div class="controls"><button data-action="library">กลับคลัง Quiz</button><button class="primary" data-action="save">บันทึก Quiz</button></div></div><div class="editorgrid"><aside class="questionnav">${draft.questions.map((_, i) => `<button class="${i === editIndex ? 'active' : ''}" data-action="edit-question" data-index="${i}">ข้อ ${String(i + 1).padStart(2, '0')}</button>`).join('')}<button data-action="add-question">＋ เพิ่มคำถาม</button></aside><div><div class="field"><label for="quiz-title">ชื่อ Quiz</label><input id="quiz-title" value="${escape(draft.title)}" maxlength="120" placeholder="ความรู้รอบตัวฉบับไว"></div><div class="field"><label for="question-text">คำถาม</label><textarea id="question-text" maxlength="500" placeholder="พิมพ์คำถาม…">${escape(q.text)}</textarea></div><div class="editchoices">${q.options.map((a, i) => `<label class="editchoice"><input type="radio" name="correct" value="${i}" ${q.correct === i ? 'checked' : ''} aria-label="${letters[i]} เป็นคำตอบที่ถูก"><span>${letters[i]}</span><input type="text" data-option="${i}" value="${escape(a)}" maxlength="200" aria-label="คำตอบ ${letters[i]}" placeholder="ตัวเลือก ${letters[i]}"></label>`).join('')}</div><p class="small" style="margin-bottom:20px">เลือกวงกลมหน้าคำตอบที่ถูกต้อง</p><div class="field"><label for="explanation">คำอธิบายสำหรับหน้าเฉลย</label><textarea id="explanation" maxlength="1500" placeholder="อธิบายว่าทำไมข้อนี้จึงถูก…">${escape(q.explanation)}</textarea></div><div class="settings"><div><label for="duration">เวลาตอบ</label><select id="duration">${[10, 15, 20, 30, 60, 90, 120].map(n => `<option value="${n}" ${q.duration === n ? 'selected' : ''}>${n} วินาที</option>`).join('')}</select></div><div><label for="max-score">คะแนนสูงสุด</label><select id="max-score"><option value="1000" ${q.maxScore === 1000 ? 'selected' : ''}>1,000 คะแนน</option><option value="2000" ${q.maxScore === 2000 ? 'selected' : ''}>2,000 คะแนน</option></select></div></div><label class="check"><input id="music" type="checkbox" ${draft.music ? 'checked' : ''}>เปิดเสียงจังหวะนับถอยหลัง</label><label class="check"><input id="promo" type="checkbox" ${draft.promo ? 'checked' : ''}>แนะนำแอป Pinto (จอใหญ่และมือถือนักเรียน ช่วงรอ)</label>${draft.questions.length > 1 ? '<button class="quiet danger" style="margin-top:20px" data-action="remove-question">ลบคำถามนี้</button>' : ''}</div></div>`); }
function syncDraft() { if (!draft) return; const q = draft.questions[editIndex]; const value = (id: string) => document.querySelector<HTMLInputElement>('#' + id)!.value; draft.title = value('quiz-title'); q.text = value('question-text'); q.explanation = value('explanation'); q.options = Array.from(document.querySelectorAll<HTMLInputElement>('[data-option]')).map(e => e.value); q.correct = Number(document.querySelector<HTMLInputElement>('[name="correct"]:checked')!.value); q.duration = Number(value('duration')); q.maxScore = Number(value('max-score')); draft.music = document.querySelector<HTMLInputElement>('#music')!.checked; draft.promo = document.querySelector<HTMLInputElement>('#promo')!.checked; }
function joinForm(pin: string, title: string) { playerShell(`<img class="mascot" src="/mascot-v2.webp" alt="PiN TO! ต้อนรับผู้เล่น"><h1>พร้อมแข่งหรือยัง?</h1><p style="text-align:center;margin-bottom:22px">${escape(title)} · PIN ${escape(pin)}</p><form id="join-form" data-pin="${pin}"><label for="player-name">ชื่อของคุณ</label><input id="player-name" name="name" maxlength="24" required autocomplete="nickname" placeholder="ตั้งชื่อก่อนเข้าเล่น" value="${escape(localStorage.getItem('pinto-name') || '')}"><button class="primary" type="submit">เข้าร่วมเกม</button></form>`); }
function connect(pin: string, host: boolean) {
  const key = `${host ? 'host' : 'player'}:${pin}`; if (socketKey === key && socket?.readyState === WebSocket.OPEN) { renderRoom(host); return; }
  socketKey = key; const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/rooms/${pin}/ws${host ? '?role=host' : ''}`); socket = ws;
  ws.onopen = () => { if (socket !== ws) return; attempts = 0; disconnected = false; if (state) renderRoom(host); };
  ws.onmessage = e => { if (socket !== ws || e.data === 'pong') return; try { const data = JSON.parse(e.data) as { type: string; state: RoomView; error: string }; if (data.type === 'error') { submitting = false; toast(data.error); if (state) renderRoom(host); return; } const next = data.state; if (!next) return; if (state?.question?.id !== next.question?.id) { lastBeat = -1; submitting = false; picked = -1; } state = next; offset = next.serverTime - Date.now(); submitting = next.me?.answered || false; renderRoom(host); } catch { toast('ข้อมูลจากห้องไม่ถูกต้อง'); } };
  ws.onclose = () => { if (socket !== ws || socketKey !== key) return; disconnected = true; if (state) renderRoom(host); attempts++; if (attempts > 8) { toast('เชื่อมต่อห้องไม่ได้ กรุณาเข้าห้องใหม่'); if (!host) { sessionStorage.removeItem('pinto-joined-' + pin); void api<{ title: string }>('/api/rooms/' + pin).then(i => joinForm(pin, i.title)).catch(e => playerShell(`<h1>ห้องสิ้นสุดแล้ว</h1><p>${escape(e.message)}</p><button class="primary" data-action="home">กลับหน้าแรก</button>`)); } return; } reconnect = setTimeout(() => { if (socketKey === key) connect(pin, host); }, Math.min(1000 * 2 ** (attempts - 1), 15000)); };
  ws.onerror = () => ws.close();
}
// Competition ranking: equal scores share a rank ("=1"), the next distinct score skips ahead.
const rankNumber = (players: RoomView['players'], i: number) => players.findIndex(p => p.score === players[i].score) + 1;
function rankLabel(players: RoomView['players'], i: number) { const score = players[i].score, rank = players.findIndex(p => p.score === score) + 1; return (players.filter(p => p.score === score).length > 1 ? '=' : '') + rank; }
function ranks(s: RoomView, limit = 10, from = 0) { return s.players.slice(from, limit).map((p, j) => `<div class="rankrow" data-player="${escape(p.id)}"><strong>${rankLabel(s.players, from + j)}</strong><span>${escape(p.name)}${s.me?.id === p.id ? '<small>คุณ</small>' : ''}</span><strong>${p.score.toLocaleString()}</strong></div>`).join(''); }
function countdownView(s: RoomView) { return `<section class="ready-stage"><span class="qpill">ข้อ ${s.questionIndex + 1} จาก ${s.questionCount}</span><h1>เตรียมตัวให้พร้อม!</h1><div class="ready-row"><img class="ready-mascot" src="/mascot-v2.webp" alt="PiN TO! พร้อมลุย"><div class="ready-orbit"><div class="countdown-digit" data-countdown role="timer" aria-label="นับถอยหลังก่อนเริ่ม"></div></div></div><p>ตอบถูก + ตอบไว = แต้มพุ่ง ⚡</p><div class="ready-dots"><i></i><i></i><i></i></div></section>`; }
function timerView() { return `<div class="clock-wrap"><div class="timer" data-timer role="timer" aria-label="เวลาที่เหลือ"><div><span data-seconds></span><small>วินาที</small></div></div><div class="time-track"><div data-timebar></div></div><div class="speed-hint">⚡ ตอบถูกตอนนี้ <strong data-potential></strong> คะแนนโดยประมาณ</div></div>`; }
function confetti() { return `<div class="confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 7) * .11}s;--turn:${i * 41}deg;--color:${['#25c76a','#f9cf65','#7bd8e2','#f997ac'][i % 4]}"></i>`).join('')}</div>`; }
function podium(s: RoomView) { return `<div class="podium">${[1, 0, 2].filter(i => s.players[i]).map(i => { const rank = rankLabel(s.players, i), place = Math.min(3, Number(rank.replace('=', ''))); return `<div class="podium-place place-${place}" data-player="${escape(s.players[i].id)}"><span class="medal">${['♛', '★', '✦'][place - 1]}</span><h2>${escape(s.players[i].name)}</h2><p>${s.players[i].score.toLocaleString()} คะแนน</p><div class="podium-step">${rank}</div></div>`; }).join('')}</div>`; }
const soundLabel = () => muted ? 'เสียง: ปิด' : 'เสียง: เปิด';
// The projected stage carries no manager chrome: only the quiz, how to join, and a small control tray.
function stageShell(s: RoomView, content: string, scene: string) {
  const join = ['countdown', 'question', 'reveal', 'leaderboard'].includes(s.phase) ? `<div class="stage-join">เข้าเล่น <b>${escape(location.host)}/play</b> · PIN <b>${s.pin.slice(0, 3)} ${s.pin.slice(3)}</b></div>` : '';
  const html = `<div class="stage-app"><header class="stage-bar"><div class="stage-brand"><img src="/logo.png" alt="PiN TO!"><span>${escape(s.title)}</span></div>${join}${muted && s.music && s.phase !== 'closed' ? '<div class="sound-hint" role="status">กด M เพื่อเปิดเพลง</div>' : ''}<div class="stage-tray"><button data-action="sound" aria-pressed="${!muted}">${soundLabel()}</button><button data-action="fullscreen">${document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</button>${['closed', 'finished'].includes(s.phase) ? '' : '<button class="quiet" data-command="close">ปิดห้อง</button>'}</div></header>${disconnected ? '<div class="connection" role="status">กำลังเชื่อมต่อใหม่…</div>' : ''}<main class="stage-viewport"><div class="stage-canvas">${content}</div></main></div>`;
  const painted = paint(scene, html);
  if (painted === 'enter' || painted === 'replace') { stopStageFit(); document.body.dataset.view = 'host'; fitStage(); }
  return painted;
}
let leaving = false, rosterSeen = new Set<string>();
// Rank changes are measured against the standings before the question: hosts snapshot them at the countdown
// (nobody has answered yet); players keep their own rank from each reveal.
let standingsBefore: { pin: string; standing: Standing } | null = null;
const myRanks = new Map<string, { rank: number; score: number }>();
function renderRoom(host: boolean) { if (!state || leaving) return; const s = state, q = s.question, room = `${host ? 'host' : 'player'}:${s.pin}:`, scene = room + `${s.phase}:${s.questionIndex}`;
  // The old scene steps out before the next one comes in; renders arriving meanwhile fold into the one after.
  if (paintedScene.startsWith(room) && paintedScene !== scene) { const old = app.querySelector(host ? '.stage-canvas > *' : '.player-main'); if (old) { leaving = true; void leave(old).then(() => { leaving = false; paintedScene = ''; renderRoom(host); }); return; } }
  renderVersion++; document.body.dataset.phase = s.phase; let painted: Paint;
  if (host) {
    const last = s.questionIndex + 1 === s.questionCount, shown = 24, lengthy = (text: string, n: number) => text.length > n ? ' long' : '';
    let body: string;
    if (s.phase === 'countdown') standingsBefore = { pin: s.pin, standing: { rank: new Map(s.players.map((p, i) => [p.id, i])), score: new Map(s.players.map(p => [p.id, p.score])) } };
    const answeredFrom = Number(app.querySelector<HTMLElement>('[data-live="answered"] .answered-track > div')?.style.getPropertyValue('--ratio') || 0);
    if (s.phase === 'lobby') body = `<section class="scene scene-lobby"><div class="join-card"><p class="join-label">สแกน QR หรือเข้า <b>${escape(location.host)}/play</b><br>แล้วกรอก PIN</p><div class="pin" aria-label="PIN ${s.pin}">${s.pin.slice(0, 3)} ${s.pin.slice(3)}</div><div class="join-row"><img id="join-qr" alt="QR Code สำหรับเข้าห้อง ${s.pin}" hidden><div class="lobbymascot"><img src="/mascot-v2.webp" alt="มาสคอต PiN TO!"><p>PiN TO! พร้อมแล้ว<br>คุณล่ะ พร้อมไหม?</p></div></div>${s.promo ? promoLine('lobby') : ''}</div>${live(`<div class="roster" data-live="roster"><div class="roster-head"><h2>ผู้เล่นพร้อมแล้ว</h2><strong class="roster-count" aria-label="${s.playerCount} คน">${s.playerCount}</strong></div>${s.playerCount ? `<div class="names">${s.players.slice(0, shown).map(p => `<span data-player="${escape(p.id)}">${escape(p.name)}</span>`).join('')}${s.playerCount > shown ? `<span class="more">+${s.playerCount - shown} คน</span>` : ''}</div>` : '<p class="roster-empty">รอผู้เล่นสแกน QR หรือกรอก PIN</p>'}<button class="primary" data-command="start" data-primary ${s.playerCount ? '' : 'disabled'}>เริ่มเกม</button><p class="keys">คีย์ลัด <kbd>Space</kbd> ไปต่อ · <kbd>M</kbd> เสียง · <kbd>F</kbd> เต็มจอ</p></div>`)}</section>`;
    else if (s.phase === 'countdown') body = countdownView(s);
    else if (s.phase === 'question' && q) body = `<section class="scene scene-question"><div class="q-top"><span class="qpill">ข้อ ${s.questionIndex + 1} / ${s.questionCount}</span>${timerView()}${live(`<div class="answered" data-live="answered" role="status"><strong>${s.answeredCount}<small>/ ${s.playerCount}</small></strong><span>ตอบแล้ว</span><div class="answered-track"><div style="--ratio:${s.playerCount ? s.answeredCount / s.playerCount : 0}"></div></div></div>`)}</div><h2 class="stage-question${lengthy(q.text, 140)}">${escape(q.text)}</h2><div class="stageanswers${q.options.some(a => a.length > 60) ? ' long' : ''}">${q.options.map((a, i) => `<div class="stageanswer answer-${i}"><span class="letter">${letters[i]}</span><span>${escape(a)}</span></div>`).join('')}</div><div class="hostbottom"><p>เฉลยอัตโนมัติเมื่อทุกคนตอบครบ หรือหมดเวลา</p><button class="primary" data-command="reveal" data-primary>ปิดรับคำตอบและเฉลย</button></div></section>`;
    else if (s.phase === 'reveal' && q) {
      const counts = s.distribution!, right = counts[q.correct!], missing = s.playerCount - s.answeredCount, exp = q.explanation || '';
      body = `<section class="scene scene-reveal">${s.answeredCount && right * 2 >= s.answeredCount ? confetti() : ''}<div class="reveal-layout"><section class="reveal-story"><div class="revealhero"><div><div class="correctpill">✓ คำตอบที่ถูกต้อง · ข้อ ${s.questionIndex + 1}</div><h1 class="revealtitle"><span class="letter swatch-${q.correct}">${letters[q.correct!]}</span><span>${escape(q.options[q.correct!])}</span></h1><p class="reveal-q">${escape(q.text)}</p></div><img src="/mascot-v2.webp" alt="PiN TO! ช่วยเฉลย"></div>${exp ? `<div class="explanation${exp.length > 320 ? ' long' : exp.length > 140 ? ' medium' : ''}"><h2>ทำไมข้อนี้ถึงถูก?</h2><p>${escape(exp)}</p></div>` : ''}</section><section class="reveal-responses" aria-label="จำนวนผู้เล่นที่เลือกแต่ละคำตอบ">${q.options.map((a, i) => `<div class="stageanswer answer-${i} ${i === q.correct ? 'correct' : 'wrong'}"><span class="letter">${letters[i]}</span><span>${escape(a)}${i === q.correct ? '<em class="caption">✓ ถูกต้อง</em>' : ''}</span><span class="count">${counts[i]} คน</span><i class="tally" aria-hidden="true" style="--ratio:${s.answeredCount ? counts[i] / s.answeredCount : 0}"></i></div>`).join('')}</section></div><div class="hostbottom"><p>ตอบถูก ${right} จาก ${s.answeredCount} คน${missing > 0 ? ` · ไม่ได้ตอบ ${missing} คน` : ''}</p><div class="controls">${last ? '<button class="primary" data-command="next" data-primary>ดูผลสุดท้าย</button>' : '<button data-command="next">ข้ามไปข้อถัดไป</button><button class="primary" data-command="leaderboard" data-primary>ดูอันดับ</button>'}</div></div></section>`;
    }
    else if (s.phase === 'leaderboard' || s.phase === 'finished') {
      const finale = s.phase === 'finished', rest = s.players.length > 3;
      const standings = s.playerCount ? `<div class="standings-layout${rest ? '' : ' solo'}">${podium(s)}${rest ? `<div class="rest">${ranks(s, 8, 3)}</div>` : ''}</div>` : '<p class="empty-standings">ไม่มีผู้เล่นในเกมนี้</p>';
      body = finale
        ? `<section class="scene scene-finale">${s.playerCount ? confetti() : ''}<div class="standings-head"><div><h1>แชมป์ของเกมนี้!</h1><p>${s.playerCount} ผู้เล่น · ${s.questionCount} คำถาม · ขอบคุณที่เล่นด้วยกัน!</p></div><div class="champ"><span class="float-badge">✦ CHAMPION!</span><img src="/mascot-v2.webp" alt="PiN TO! ฉลองแชมป์"></div></div>${standings}<div class="hostbottom"><p>ห้องนี้จบเกมแล้ว${s.promo ? promoLine('finale') : ''}</p><div class="controls"><button data-action="library">กลับคลัง Quiz</button>${s.quizId ? `<button class="primary" data-action="host" data-id="${escape(s.quizId)}" data-primary>เล่นอีกครั้ง</button>` : ''}</div></div></section>`
        : `<section class="scene scene-standings"><div class="standings-head"><div><h1>ใครไว ใครนำ</h1><p>หลังข้อ ${s.questionIndex + 1} จาก ${s.questionCount}</p></div><img src="/mascot-v2.webp" alt="PiN TO! ลุ้นอันดับ"></div>${standings}<div class="hostbottom"><p>${s.playerCount} ผู้เล่น</p><button class="primary" data-command="next" data-primary>${last ? 'ดูผลสุดท้าย' : 'ข้อถัดไป'}</button></div></section>`;
    }
    else body = '<section class="scene"><div class="empty"><h1>ห้องนี้ปิดแล้ว</h1><button class="primary" data-action="library" data-primary>กลับคลัง Quiz</button></div></section>';
    painted = stageShell(s, body, scene);
    if (s.phase === 'lobby') {
      if (painted === 'enter' || painted === 'replace') void renderQR(s.pin);
      if (painted === 'enter') rosterSeen = new Set();
      const names = Array.from(app.querySelectorAll<HTMLElement>('[data-player]'));
      if (painted !== 'replace') joinIn(names.filter(e => !rosterSeen.has(e.dataset.player!)));
      rosterSeen = new Set(names.map(e => e.dataset.player!));
    }
    if (s.phase === 'question' && painted === 'patch') answeredIn(app, answeredFrom);
    if ((s.phase === 'leaderboard' || s.phase === 'finished') && painted === 'enter') standingsIn(app, standingsBefore?.pin === s.pin ? standingsBefore.standing : null, s.phase === 'finished');
  } else {
    const info = `<div class="gameinfo"><span>${escape(s.me?.name)}</span><span>PIN ${s.pin}</span></div>`;
    let body = info;
    if (s.phase === 'lobby') body += `<img class="mascot" src="/mascot-v2.webp" alt="PiN TO! รอเริ่มเกม"><h1>เข้าห้องแล้ว!</h1>${live(`<p data-live="lobby-count" style="text-align:center">${escape(s.title)}<br>รอผู้จัดเริ่มเกม · ${s.playerCount} คนพร้อมเล่น</p>`)}${s.promo ? promoCard('player-lobby', { text: promoTagline(Number(s.pin)) }) : ''}`;
    else if (s.phase === 'countdown') body += countdownView(s);
    else if (s.phase === 'question' && q) body += `<div class="gameinfo"><span>ข้อ ${s.questionIndex + 1} / ${s.questionCount}</span><span>${s.me?.score.toLocaleString()} คะแนน</span></div>${timerView()}<h2>${escape(q.text)}</h2><div class="gameanswers">${q.options.map((a, i) => `<button class="answer-${i} ${s.me?.choice === i || picked === i ? 'selected' : ''}" data-answer="${i}" ${s.me?.answered || submitting || disconnected ? 'disabled' : ''}><b>${letters[i]}</b>${escape(a)}</button>`).join('')}</div>${s.me?.answered || submitting ? '<p class="waiting" style="text-align:center" role="status"><span class="sent-check">✓</span>ส่งคำตอบแล้ว!<br>รอดูเฉลยพร้อมกัน</p>' : '<p class="small" style="text-align:center">ตอบได้ครั้งเดียว ยิ่งเร็ว ยิ่งได้คะแนน</p>'}`;
    else if (s.phase === 'reveal' && q) { const correct = s.me?.choice === q.correct; body += `${correct && s.me?.answered ? confetti() : ''}<div class="result-stamp">${correct && s.me?.answered ? '✦' : '♡'}</div><h1>${s.me?.answered ? correct ? 'ตอบถูกแล้ว!' : 'ยังไม่ถูก ลองข้อหน้า!' : 'หมดเวลาแล้ว'}</h1><div class="answer-correct"><span>✓ คำตอบที่ถูกต้อง</span><h2 style="text-align:left;margin:8px 0 0">${letters[q.correct!]} · ${escape(q.options[q.correct!])}</h2></div>${s.me?.answered && !correct ? `<p>คุณเลือก ${letters[s.me.choice!]} · ${escape(q.options[s.me.choice!])}</p>` : ''}<div class="resultpoints"><strong>+${(s.me?.points || 0).toLocaleString()}</strong><span>${s.me?.answered ? `ตอบใน ${((s.me.elapsed || 0) / 1000).toFixed(1)} วินาที` : 'ไม่ได้ส่งคำตอบ'}</span></div>${q.explanation ? `<div class="explanation"><h2>เฉลยจาก PiN TO!</h2><p>${escape(q.explanation)}</p></div>` : ''}<p style="text-align:center">รวม ${s.me?.score.toLocaleString()} คะแนน<br>รอผู้จัดไปข้อถัดไป</p>`; }
    else if (s.phase === 'leaderboard' || s.phase === 'finished') { const mine = s.players.findIndex(p => p.id === s.me?.id), rank = mine < 0 ? '-' : rankLabel(s.players, mine), was = myRanks.get(`${s.pin}:${s.questionIndex - 1}`), moved = s.phase === 'leaderboard' && was && mine >= 0 ? was.rank - rankNumber(s.players, mine) : null; body += `<img class="mascot" src="/mascot-v2.webp" alt="PiN TO! ฉลองคะแนน"><h1>${s.phase === 'finished' ? 'จบเกมแล้ว!' : 'อันดับของคุณ'}</h1><div class="resultpoints"><strong>#${rank}</strong><span>${s.me?.score.toLocaleString()} คะแนน / ${s.playerCount} ผู้เล่น</span>${moved === null ? '' : `<em class="rank-move ${moved > 0 ? 'up' : moved < 0 ? 'down' : 'same'}">${moved > 0 ? `▲ ขึ้น ${moved} อันดับ` : moved < 0 ? `▼ ลง ${-moved} อันดับ` : '● อันดับเดิม'}</em>`}</div>${ranks(s, 3)}<p style="text-align:center;margin-top:22px">${s.phase === 'finished' ? 'ขอบคุณที่เล่นด้วยกัน!' : 'รอผู้จัดไปข้อถัดไป'}</p>${s.phase === 'leaderboard' && s.promo ? promoNote(s.questionIndex) : ''}${s.phase === 'finished' ? `${s.promo ? promoCard('player') : ''}<button class="primary" data-action="home">กลับหน้าแรก</button>` : ''}`; }
    else body += '<h1>ห้องนี้ปิดแล้ว</h1><button class="primary" data-action="home">กลับหน้าแรก</button>';
    painted = playerShell(body, scene);
    const mine = s.players.findIndex(p => p.id === s.me?.id);
    if ((s.phase === 'leaderboard' || s.phase === 'finished') && painted === 'enter') { const was = myRanks.get(`${s.pin}:${s.questionIndex - 1}`); myRankIn(app, s.phase === 'leaderboard' && was ? { rank: was.rank, score: (s.me?.score || 0) - (s.me?.points || 0) } : null); }
    if ((s.phase === 'reveal' || s.phase === 'leaderboard') && mine >= 0) myRanks.set(`${s.pin}:${s.questionIndex}`, { rank: rankNumber(s.players, mine), score: s.players[mine].score });
  }
  setMusic(host && !muted && s.music && s.phase !== 'closed');
  const cueKey = `${s.pin}:${s.phase}:${s.questionIndex}`;
  if (cueKey !== lastCue) {
    lastCue = cueKey; lastBeat = -1;
    if (!muted && s.music) {
      if (s.phase === 'question') cue('go');
      if (s.phase === 'reveal') cue(host || s.me?.choice === q?.correct && s.me?.answered ? 'correct' : 'wrong');
      if (s.phase === 'finished') cue('finish');
    }
  }
  if (painted === 'enter') {
    enterScene(app.querySelector(host ? '.stage-canvas > *' : '.player-main'));
    if (s.phase === 'question') questionIn(app);
    if (s.phase === 'reveal' && host) revealIn(app);
    if (s.phase === 'reveal' && !host) resultIn(app, s.me?.points || 0);
  }
  updateTimer();
}
async function renderQR(pin: string) { const version = renderVersion; const url = location.origin + '/play/' + pin; if (!qrCache || qrCache.url !== url) qrCache = { url, data: await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1b1e50', light: '#fffdeb' } }) }; if (renderVersion !== version) return; const img = document.querySelector<HTMLImageElement>('#join-qr'); if (img) { img.src = qrCache.data; img.hidden = false; } }
function updateTimer() {
  if (!state || !['countdown', 'question'].includes(state.phase)) return;
  const remaining = Math.max(0, state.deadline - (Date.now() + offset)), sec = Math.ceil(remaining / 1000);
  if (state.phase === 'countdown') {
    const digit = document.querySelector<HTMLElement>('[data-countdown]');
    if (digit && digit.textContent !== String(sec)) { digit.textContent = sec > 0 ? String(sec) : 'GO!'; digit.classList.remove('pop'); void digit.offsetWidth; digit.classList.add('pop'); }
  } else {
    document.querySelectorAll('[data-seconds]').forEach(e => e.textContent = String(sec));
    const ratio = Math.min(1, remaining / ((state.question?.duration || 20) * 1000));
    document.querySelectorAll<HTMLElement>('[data-timer]').forEach(e => { e.classList.toggle('urgent', sec <= 5); e.style.setProperty('--progress', `${ratio * 360}deg`); });
    document.querySelectorAll<HTMLElement>('[data-timebar]').forEach(e => { e.style.transform = `scaleX(${ratio})`; e.classList.toggle('urgent', sec <= 5); });
    document.querySelectorAll('[data-potential]').forEach(e => e.textContent = Math.round((state!.question?.maxScore || 1000) * (.5 + .5 * ratio)).toLocaleString());
    // Freeze input when the server deadline passes, even while the reveal message is in transit.
    if (!remaining) document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(e => e.disabled = true);
  }
  if (sec !== lastBeat) { lastBeat = sec; if (!muted && state.music && sec > 0) beat(sec, state.phase === 'countdown'); }
}
setInterval(updateTimer, 200);
setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send('ping'); }, 25000);
app.addEventListener('click', e => { const target = (e.target as HTMLElement).closest<HTMLElement>('button, a[data-nav]'); if (!target) return; if (target instanceof HTMLAnchorElement) { e.preventDefault(); go(target.pathname); return; } void (async () => {
  const action = target.dataset.action;
  if (action === 'home') go('/'); if (action === 'library') go('/admin'); if (action === 'new') go('/admin/new'); if (action === 'edit') go('/admin/quiz/' + target.dataset.id);
  if (action === 'dismiss-promo') { try { localStorage.setItem(PROMO_DISMISSED, '1'); } catch { /* private mode: hides until next render */ } target.closest('.promo-card')?.remove(); }
  if (action === 'logout') { await api('/api/logout', 'POST'); user = null; go('/login'); }
  if (action === 'save' && draft) { syncDraft(); target.setAttribute('disabled', ''); await api<Quiz>('/api/quizzes' + (draft.id ? '/' + draft.id : ''), draft.id ? 'PUT' : 'POST', draft); toast('บันทึก Quiz แล้ว'); go('/admin'); }
  if (action === 'delete' && confirm('ลบ Quiz นี้หรือไม่?')) { await api('/api/quizzes/' + target.dataset.id, 'DELETE'); await route(); }
  if (action === 'host') { target.setAttribute('disabled', ''); const room = await api<{ pin: string }>('/api/rooms', 'POST', { quizId: target.dataset.id }); go('/host/' + room.pin); }
  if (action === 'add-question' && draft) { syncDraft(); if (draft.questions.length >= 100) throw new Error('เพิ่มได้สูงสุด 100 คำถาม'); draft.questions.push(makeQuestion()); editIndex = draft.questions.length - 1; renderEditor(); }
  if (action === 'edit-question') { syncDraft(); editIndex = Number(target.dataset.index); renderEditor(); }
  if (action === 'remove-question' && draft && confirm('ลบคำถามนี้หรือไม่?')) { syncDraft(); draft.questions.splice(editIndex, 1); editIndex = Math.min(editIndex, draft.questions.length - 1); renderEditor(); }
  if (action === 'sound') { if (muted) { await enableSound(); muted = false; cue('ready'); } else muted = true; lastBeat = -1; if (state) renderRoom(location.pathname.startsWith('/host')); else { target.textContent = soundLabel(); target.setAttribute('aria-pressed', String(!muted)); } }
  if (action === 'fullscreen') { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  if (target.dataset.command && state) { if (target.dataset.command === 'close' && !confirm('ปิดห้องและหยุดเกมนี้หรือไม่?')) return; target.setAttribute('disabled', ''); await api('/api/rooms/' + state.pin + '/command', 'POST', { command: target.dataset.command }); }
  if (target.dataset.answer !== undefined && state?.question && !state.me?.answered && !submitting) { if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('กำลังเชื่อมต่อ กรุณารอสักครู่'); submitting = true; if (!muted && state.music) cue('answer'); picked = Number(target.dataset.answer); socket.send(JSON.stringify({ type: 'answer', questionId: state.question.id, choice: picked })); renderRoom(false); pickAnswer(app, picked); }
})().catch(error => { target.removeAttribute('disabled'); toast((error as Error).message); }); });
app.addEventListener('input', e => { const input = e.target as HTMLInputElement; if (input.id !== 'pin') return; const clean = normalizePin(input.value); if (clean === input.value) return; const caret = normalizePin(input.value.slice(0, input.selectionStart ?? input.value.length)).length; input.value = clean; input.setSelectionRange(caret, caret); });
app.addEventListener('submit', e => { e.preventDefault(); const form = e.target as HTMLFormElement; const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; button.disabled = true; const fields = new FormData(form); void (async () => {
  if (form.id === 'login-form') { user = await api('/api/login', 'POST', { email: fields.get('email'), password: fields.get('password') }); const destination = new URLSearchParams(location.search).get('return') || '/admin'; go(/^\/host\/\d{6}$/.test(destination) ? destination : '/admin'); }
  if (form.id === 'pin-form') go('/play/' + normalizePin(String(fields.get('pin'))));
  if (form.id === 'join-form') { const name = String(fields.get('name')).trim(), pin = form.dataset.pin!; await api('/api/rooms/' + pin + '/join', 'POST', { name }); localStorage.setItem('pinto-name', name); sessionStorage.setItem('pinto-joined-' + pin, '1'); connect(pin, false); }
})().catch(error => { button.disabled = false; toast((error as Error).message); }); });
// Host shortcuts: the teacher drives the projected game from the laptop keyboard.
document.addEventListener('keydown', e => {
  if (!location.pathname.startsWith('/host/') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const focus = e.target as HTMLElement; if (focus.closest('input, textarea, select')) return;
  const key = e.key.toLowerCase(), advance = key === ' ' || key === 'enter' || key === 'arrowright';
  if (advance && focus.closest('button') && key !== 'arrowright') return;
  // Physical key codes keep M/F working when the Thai keyboard layout is active.
  const button = document.querySelector<HTMLButtonElement>(advance ? '[data-primary]' : e.code === 'KeyM' ? '[data-action="sound"]' : e.code === 'KeyF' ? '[data-action="fullscreen"]' : 'nothing');
  if (button && !button.disabled) { e.preventDefault(); button.click(); }
});
document.addEventListener('fullscreenchange', () => { if (state && location.pathname.startsWith('/host/')) renderRoom(true); });
window.addEventListener('popstate', () => void route().catch(e => toast(e.message)));
void route().catch(e => { shell(`<h1>เปิดหน้าไม่ได้</h1><p>${escape(e.message)}</p><button class="primary" data-action="home">กลับหน้าแรก</button>`); });
