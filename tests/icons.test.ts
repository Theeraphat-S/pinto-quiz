import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon, ICON_NAMES } from '../web/icons';

test('every bundled icon inherits the text colour and hides from screen readers', () => {
  for (const name of ICON_NAMES) {
    const svg = icon(name);
    assert.match(svg, /^<svg class="i" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">/, name);
    assert.ok(svg.includes('currentColor'), name);
    assert.ok(!/white|#[0-9a-f]{3,6}/i.test(svg), `${name} carries a fixed colour`);
  }
});

test('icons carry no ids, so many copies can share one page', () => {
  for (const name of ICON_NAMES) assert.ok(!/\sid=|url\(#/.test(icon(name)), name);
});
