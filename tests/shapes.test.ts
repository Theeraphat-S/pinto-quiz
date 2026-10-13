import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shape, SHAPE_NAMES } from '../web/shapes';

test('each answer has its own labelled shape in the text colour', () => {
  assert.equal(SHAPE_NAMES.length, 4);
  assert.equal(new Set(SHAPE_NAMES).size, 4);
  assert.equal(new Set([0, 1, 2, 3].map(shape)).size, 4);
  for (const [i, name] of SHAPE_NAMES.entries()) {
    const svg = shape(i);
    assert.ok(svg.includes(`role="img" aria-label="${name}"`), name);
    assert.ok(svg.includes('fill="currentColor"'), name);
    assert.ok(!/\sid=|#[0-9a-f]{3,6}/i.test(svg), name);
  }
});
