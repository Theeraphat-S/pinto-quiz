import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durationLabel, editedLabel } from '../web/format';

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
