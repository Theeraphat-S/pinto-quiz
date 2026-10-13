import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durationLabel, editedLabel, rival, splitPin } from '../web/format';

test('a quiz with one answer time shows that time', () => {
  assert.equal(durationLabel([{ duration: 20 }, { duration: 20 }]), '20 วินาที');
});

test('a quiz with mixed answer times shows the range', () => {
  assert.equal(durationLabel([{ duration: 30 }, { duration: 15 }, { duration: 20 }]), '15–30 วินาที');
});

test('a quiz with no questions shows no time', () => {
  assert.equal(durationLabel([]), '');
});

test('the last edit reads as a short Thai date', () => {
  assert.equal(editedLabel(Date.UTC(2026, 9, 5, 3), 'Asia/Bangkok'), 'แก้ไข 5 ต.ค.');
});

test('a room PIN reads as two groups of three', () => {
  assert.equal(splitPin('482916'), '482 916');
});

const standings = [{ id: 'a', name: 'Ann', score: 900 }, { id: 'b', name: 'Ben', score: 700 }, { id: 'c', name: 'Cat', score: 700 }, { id: 'd', name: 'Dan', score: 400 }];
test('a trailing player sees the gap to the nearest player ahead', () => {
  assert.deepEqual(rival(standings, 'd'), { ahead: false, name: 'Cat', gap: 300, rank: 2 });
  assert.deepEqual(rival(standings, 'b'), { ahead: false, name: 'Ann', gap: 200, rank: 1 }, 'A tied player is not a rival');
});
test('the leader sees their lead over the next distinct score', () => {
  assert.deepEqual(rival(standings, 'a'), { ahead: true, name: 'Ben', gap: 200, rank: 2 });
});
test('no rival when everyone is level, alone, or missing', () => {
  assert.equal(rival([{ id: 'a', name: 'Ann', score: 0 }, { id: 'b', name: 'Ben', score: 0 }], 'a'), null);
  assert.equal(rival([{ id: 'a', name: 'Ann', score: 10 }], 'a'), null);
  assert.equal(rival(standings, 'zz'), null);
});
