import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePin, PREVIEW_SECONDS, promoTagline, PROMO_TAGLINES, readQuiz, scoreAnswer, validateQuiz } from '../src/shared';
const quiz = () => ({ title: 'Quiz', music: true, questions: [{ text: 'Question?', options: ['A','B','C','D'], correct: 0, explanation: 'Because A', duration: 20, maxScore: 1000 }] });
test('correct answers reward server-measured speed and reject deadline answers', () => {
  assert.equal(scoreAnswer(true, 0, 20, 1000), 1000);
  assert.equal(scoreAnswer(true, 3200, 20, 1000), 920);
  assert.equal(scoreAnswer(false, 0, 20, 1000), 0);
  assert.equal(scoreAnswer(true, 20000, 20, 1000), 0);
  assert.equal(scoreAnswer(true, -1, 20, 1000), 0);
  assert.ok(scoreAnswer(true, 1000, 20, 1000) > scoreAnswer(true, 19000, 20, 1000));
});
test('quiz validation bounds questions and rejects invalid choices and timings', () => {
  assert.equal(validateQuiz(quiz()).questions.length, 1);
  const q = quiz(); q.questions[0].correct = 4; assert.throws(() => validateQuiz(q));
  q.questions[0].correct = 0; q.questions[0].duration = 999; assert.throws(() => validateQuiz(q));
  assert.throws(() => validateQuiz({ title: 'Empty', questions: [] }));
  assert.throws(() => validateQuiz({ ...quiz(), questions: new Array(101).fill(quiz().questions[0]) }));
});
test('Pinto app promo stays on unless the host explicitly turns it off', () => {
  assert.equal(validateQuiz(quiz()).promo, true);
  assert.equal(validateQuiz({ ...quiz(), promo: true }).promo, true);
  assert.equal(validateQuiz({ ...quiz(), promo: false }).promo, false);
  assert.equal(validateQuiz({ ...quiz(), promo: 'no' }).promo, true);
});
test('quizzes stored before the promo flag existed read back with the promo on', () => {
  const stored = { id: 'q', title: 'Old', music: true, questions: [], updatedAt: 1 };
  assert.equal(readQuiz(JSON.stringify(stored)).promo, true);
  assert.equal(readQuiz(JSON.stringify({ ...stored, promo: false })).promo, false);
});
test('promo taglines are stable for a seed and cycle through every line', () => {
  assert.equal(promoTagline(7), promoTagline(7));
  assert.deepEqual(PROMO_TAGLINES.map((_, i) => promoTagline(i)), PROMO_TAGLINES);
  assert.equal(promoTagline(PROMO_TAGLINES.length), PROMO_TAGLINES[0]);
  assert.equal(promoTagline(-1), PROMO_TAGLINES[PROMO_TAGLINES.length - 1]);
});
test('pasted PINs keep only six digits', () => {
  assert.equal(normalizePin('115 695'), '115695');
  assert.equal(normalizePin('115-695'), '115695');
  assert.equal(normalizePin(' 115 695 '), '115695');
  assert.equal(normalizePin('๑๑๕๖๙๕'), '115695');
  assert.equal(normalizePin('PIN: 115 695 7'), '115695');
  assert.equal(normalizePin('11 5'), '115');
});
test('reading time before the options is a fixed 30 seconds', () => {
  assert.equal(PREVIEW_SECONDS, 30);
});
