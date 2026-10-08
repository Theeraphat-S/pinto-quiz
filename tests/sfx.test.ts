import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEAT, beatHits, note, PENTATONIC, SAMPLE_NAMES, sampleName, vary } from '../web/sfx-score';
import { RATE, renderSample } from '../scripts/render-sfx';
const pitchClass = (name: string) => name.replace(/\d$/, '');
const peak = (samples: Float32Array, from = 0, to = samples.length) => samples.subarray(from, to).reduce((max, s) => Math.max(max, Math.abs(s)), 0);
test('notes are tuned to A440 equal temperament', () => {
  assert.equal(note('A4'), 440);
  assert.ok(Math.abs(note('F#4') - 369.99) < .01);
  assert.ok(Math.abs(note('C#6') - 1108.73) < .01);
  assert.throws(() => note('H2'));
});
test('every live tick stays in the theme key of F# major pentatonic', () => {
  for (let seconds = 1; seconds <= 30; seconds++) for (const preparing of [true, false]) for (const musicOn of [true, false])
    for (const hit of beatHits(seconds, preparing, musicOn)) assert.ok(PENTATONIC.includes(pitchClass(hit.note)), `${hit.note} at ${seconds}s`);
});
test('the 3-2-1 countdown climbs in pitch', () => {
  const pitch = (seconds: number) => note(beatHits(seconds, true, false)[0].note);
  assert.ok(pitch(3) < pitch(2) && pitch(2) < pitch(1));
});
test('the last five seconds double-tick half a beat apart, even over the theme', () => {
  const hits = beatHits(5, false, true);
  assert.equal(hits.length, 2);
  assert.ok(Math.abs(hits[1].at - hits[0].at - BEAT / 2) < 1e-9);
  assert.deepEqual(beatHits(6, false, true), []);
  assert.equal(beatHits(6, false, false).length, 1);
});
test('correct answers pick between three takes; other cues have one sample', () => {
  assert.equal(sampleName('correct', () => 0), 'correct-1');
  assert.equal(sampleName('correct', () => .999), 'correct-3');
  assert.equal(sampleName('wrong', () => .5), 'wrong');
  assert.equal(SAMPLE_NAMES.length, 8);
});
test('variation nudges pitch and volume within their bounds', () => {
  assert.deepEqual(vary(() => 0), { rate: .99, gain: .9 });
  const high = vary(() => 1);
  assert.ok(Math.abs(high.rate - 1.01) < 1e-9 && Math.abs(high.gain - 1.1) < 1e-9);
});
test('rendered cues start at once, stay short, never clip and end without a click', () => {
  for (const name of SAMPLE_NAMES) {
    const samples = renderSample(name), seconds = samples.length / RATE;
    assert.ok(samples.every(Number.isFinite), `${name} has NaN`);
    assert.ok(peak(samples) <= .95 && peak(samples) > .5, `${name} peak ${peak(samples)}`);
    assert.ok(peak(samples, 0, RATE * .015) > .05, `${name} starts late`);
    assert.ok(seconds <= (name === 'finish' ? 2.6 : name === 'answer' ? .35 : 1), `${name} lasts ${seconds}s`);
    assert.ok(peak(samples, samples.length - RATE * .01) < .01, `${name} ends with a click`);
  }
});
test('renders are reproducible and the correct takes differ', () => {
  assert.deepEqual(renderSample('go'), renderSample('go'));
  assert.notDeepEqual(renderSample('correct-1'), renderSample('correct-2'));
});
