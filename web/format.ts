import type { Player } from '../src/shared';
// Library facts: what a teacher needs to tell quizzes apart at a glance.
export function durationLabel(questions: { duration: number }[]) {
  if (!questions.length) return '';
  const times = questions.map(q => q.duration), low = Math.min(...times), high = Math.max(...times);
  return low === high ? `${low} วินาที` : `${low}–${high} วินาที`;
}
export const shortDate = (time: number, timeZone?: string) => new Date(time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone });
export const editedLabel = (time: number, timeZone?: string) => 'แก้ไข ' + shortDate(time, timeZone);
// Six digits are easier to read off a projector, and to type, as two groups of three.
export const splitPin = (pin: string) => `${pin.slice(0, 3)} ${pin.slice(3)}`;
// The nearest player with a different score: the one just ahead, or for a leader the one just behind.
// Ties share a rank, so the rival is the closest distinct score, never a player level with you.
export type Rival = { ahead: boolean; name: string; gap: number; rank: number };
export function rival(players: Player[], meId: string): Rival | null {
  const mine = players.find(p => p.id === meId); if (!mine) return null;
  const rankOf = (score: number) => players.findIndex(p => p.score === score) + 1;
  const above = players.filter(p => p.score > mine.score).at(-1);
  if (above) return { ahead: false, name: above.name, gap: above.score - mine.score, rank: rankOf(above.score) };
  const below = players.find(p => p.score < mine.score);
  return below ? { ahead: true, name: below.name, gap: mine.score - below.score, rank: rankOf(below.score) } : null;
}
