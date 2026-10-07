import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswer, validateQuiz } from '../src/shared';
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
