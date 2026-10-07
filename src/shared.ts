export type Question = { id: string; text: string; options: string[]; correct: number; explanation: string; duration: number; maxScore: number };
export type Quiz = { id: string; title: string; music: boolean; questions: Question[]; updatedAt: number };
export type Player = { id: string; name: string; score: number };
export type Phase = 'lobby' | 'countdown' | 'question' | 'reveal' | 'leaderboard' | 'finished' | 'closed';
export type RoomView = { pin: string; title: string; phase: Phase; music: boolean; questionIndex: number; questionCount: number; serverTime: number; deadline: number; players: Player[]; playerCount: number; answeredCount: number; question?: Omit<Question, 'correct' | 'explanation'> & { correct?: number; explanation?: string }; me?: Player & { answered: boolean; choice?: number; points?: number; elapsed?: number }; distribution?: number[] };
export function scoreAnswer(correct: boolean, elapsedMs: number, durationSeconds: number, maximum: number): number {
  if (!correct || elapsedMs < 0 || elapsedMs >= durationSeconds * 1000) return 0;
  return Math.round(maximum * (1 - .5 * elapsedMs / (durationSeconds * 1000)));
}
export function validateQuiz(value: unknown): Omit<Quiz, 'id' | 'updatedAt'> {
  if (!value || typeof value !== 'object') throw new Error('ข้อมูล Quiz ไม่ถูกต้อง');
  const data = value as Record<string, unknown>;
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 120) throw new Error('ชื่อ Quiz ต้องมี 1–120 ตัวอักษร');
  if (!Array.isArray(data.questions) || data.questions.length < 1 || data.questions.length > 100) throw new Error('Quiz ต้องมี 1–100 คำถาม');
  const questions = data.questions.map((raw: unknown): Question => {
    if (!raw || typeof raw !== 'object') throw new Error('คำถามไม่ถูกต้อง');
    const q = raw as Record<string, unknown>;
    if (typeof q.text !== 'string' || !q.text.trim() || q.text.length > 500) throw new Error('คำถามต้องมี 1–500 ตัวอักษร');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(x => typeof x !== 'string' || !x.trim() || x.length > 200)) throw new Error('กรอกตัวเลือกทั้ง 4 ข้อ');
    if (!Number.isInteger(q.correct) || Number(q.correct) < 0 || Number(q.correct) > 3) throw new Error('เลือกคำตอบที่ถูกต้อง');
    if (![10, 15, 20, 30, 60, 90, 120].includes(Number(q.duration))) throw new Error('เวลาไม่ถูกต้อง');
    if (![1000, 2000].includes(Number(q.maxScore))) throw new Error('คะแนนไม่ถูกต้อง');
    if (typeof q.explanation !== 'string' || q.explanation.length > 1500) throw new Error('คำอธิบายยาวเกินไป');
    return { id: crypto.randomUUID(), text: q.text.trim(), options: q.options.map(x => String(x).trim()), correct: Number(q.correct), explanation: q.explanation.trim(), duration: Number(q.duration), maxScore: Number(q.maxScore) };
  });
  return { title: data.title.trim(), music: data.music === true, questions };
}
