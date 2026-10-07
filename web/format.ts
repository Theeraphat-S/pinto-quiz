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
