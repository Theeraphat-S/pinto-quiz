// Renders the cue samples in web/public/sfx (`npm run sfx`, needs ffmpeg on PATH). Each cue is a short score for
// physically modelled marimba, kalimba pluck, woodblock, claps and shaker, all in the theme's key and tempo from
// web/sfx-score.ts. Randomness is seeded per sample, so a render is reproducible and only changes when the score does.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEAT, note, SAMPLE_NAMES, type SampleName, WOODBLOCK } from '../web/sfx-score';

export const RATE = 44100;
const TAU = Math.PI * 2, EIGHTH = BEAT / 2;
type Random = () => number;
function seeded(seed: number): Random {
  return () => { let t = seed += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const samplesFor = (seconds: number) => new Float32Array(Math.ceil(seconds * RATE));
function noise(seconds: number, decay: number, random: Random): Float32Array {
  const out = samplesFor(seconds);
  for (let i = 0; i < out.length; i++) out[i] = (random() * 2 - 1) * Math.exp(-i / RATE / decay);
  return out;
}
// RBJ cookbook biquad, enough to shape noise into mallet thumps, clicks, claps and shakers.
function filter(input: Float32Array, kind: 'lowpass' | 'highpass' | 'bandpass', frequency: number, q = .707): Float32Array {
  const w = TAU * Math.min(frequency, RATE * .45) / RATE, alpha = Math.sin(w) / (2 * q), cos = Math.cos(w);
  const [b0, b1, b2] = kind === 'lowpass' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : kind === 'highpass' ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2] : [alpha, 0, -alpha];
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha, out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const y = (b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = input[i]; y2 = y1; y1 = out[i] = y;
  }
  return out;
}
// A struck bar is a sum of exponentially decaying partials ([ratio, amplitude, decay seconds]) behind a short mallet contact.
function modes(frequency: number, partials: [number, number, number][], seconds: number, contact: number): Float32Array {
  const out = samplesFor(seconds);
  for (const [ratio, amplitude, decay] of partials) {
    const step = TAU * frequency * ratio / RATE;
    if (frequency * ratio > RATE * .45) continue;
    for (let i = 0; i < out.length; i++) out[i] += amplitude * Math.exp(-i / RATE / decay) * Math.sin(step * i);
  }
  for (let i = 0, n = contact * RATE; i < n && i < out.length; i++) out[i] *= .5 - .5 * Math.cos(Math.PI * i / n);
  return out;
}
function mix(into: Float32Array, at: number, voice: Float32Array, gain = 1): void {
  const start = Math.round(at * RATE);
  for (let i = 0; i < voice.length && start + i < into.length; i++) into[start + i] += voice[i] * gain;
}
// Bars are tuned 1:4:10 like a concert marimba; the slightly detuned twin mimics the resonator tube's slow beat.
function marimba(name: string, velocity: number, random: Random, damping = 1): Float32Array {
  const frequency = note(name), hardness = .4 + .6 * velocity, decay = Math.min(Math.max(.55 * Math.sqrt(440 / frequency), .18), 1.1) * damping;
  const out = modes(frequency, [[1, 1, decay], [1.0035, .12, decay * 1.4], [3.98, .3 * hardness, decay * .22], [9.85, .09 * hardness ** 2, decay * .07]], Math.min(decay * 6, 2.2), .0012 + (1 - hardness) * .0015);
  mix(out, 0, filter(noise(.015, .003, random), 'lowpass', 900 + 1500 * hardness), .25 * hardness);
  return out.map(sample => sample * velocity);
}
// Karplus-Strong string with a fractional delay so high notes stay in tune, plus the tine's inharmonic overtone.
function kalimba(name: string, velocity: number, random: Random): Float32Array {
  const frequency = note(name), period = RATE / frequency - .5, out = samplesFor(1.4);
  const pluck = filter(noise(period / RATE + .001, 1, random), 'lowpass', frequency * 5);
  const at = (position: number) => { const i = Math.floor(position), f = position - i; return i < 0 ? 0 : out[i] * (1 - f) + (out[i + 1] ?? 0) * f; };
  for (let i = 0; i < out.length; i++) out[i] = (pluck[i] ?? 0) + .997 * .5 * (at(i - period) + at(i - period - 1));
  mix(out, 0, modes(frequency, [[5.4, .25, .05]], .3, .0005));
  return out.map(sample => sample * velocity);
}
// Damping below 1 shortens the ring and softens the click for a duller knock.
function wood(name: string, velocity: number, random: Random, damping = 1): Float32Array {
  const frequency = note(name), { click } = WOODBLOCK, out = modes(frequency, WOODBLOCK.partials.map(([ratio, amplitude, decay]) => [ratio, amplitude, decay * damping]), .3, .0004);
  mix(out, 0, filter(noise(.008, click.decay, random), 'bandpass', frequency * click.ratio * damping, click.q), click.gain * damping);
  return out.map(sample => sample * velocity);
}
// A hand clap is a few noise bursts a handful of milliseconds apart, the last one ringing out a little longer.
function clap(velocity: number, random: Random): Float32Array {
  const out = samplesFor(.25), centre = 1100 + random() * 400;
  [0, .009 + random() * .004, .019 + random() * .006].forEach((at, i) => mix(out, at, filter(noise(i === 2 ? .2 : .02, i === 2 ? .05 : .004, random), 'bandpass', centre, .9)));
  return out.map(sample => sample * velocity);
}
function shaker(velocity: number, random: Random): Float32Array {
  const out = filter(noise(.15, 1, random), 'highpass', 5500);
  return out.map((sample, i) => { const t = i / RATE; return sample * velocity * (t < .02 ? t / .02 : Math.exp(-(t - .02) / .035)); });
}
// A small mono Schroeder room so the voices share one space instead of sounding pasted together.
function room(dry: Float32Array, wet: number): Float32Array {
  const verb = new Float32Array(dry.length);
  for (const delay of [614, 653, 702, 746, 782, 820]) {
    const line = new Float32Array(delay); let store = 0;
    for (let i = 0; i < dry.length; i++) { const y = line[i % delay]; store = y * .7 + store * .3; line[i % delay] = dry[i] * .1 + store * .74; verb[i] += y / 6; }
  }
  for (const delay of [306, 243, 188]) {
    const line = new Float32Array(delay);
    for (let i = 0; i < verb.length; i++) { const buffered = line[i % delay], input = verb[i]; verb[i] = buffered - input * .5; line[i % delay] = input + buffered * .5; }
  }
  return dry.map((sample, i) => sample + verb[i] * wet);
}
interface Score { length: number; level: number; play(track: Float32Array, random: Random): void }
const human = (random: Random, spread = .006) => (random() * 2 - 1) * spread;
const correct = (grace: string, main: string, top: string, bass: string, sparkle: [string, string]): Score => ({
  length: 1, level: .9,
  play(track, random) {
    mix(track, 0, marimba(grace, .45, random));
    mix(track, .05 + human(random, .004), marimba(main, .9, random));
    const land = .18 + human(random, .008);
    mix(track, land, marimba(top, 1, random)); mix(track, land + .003, marimba(bass, .4, random));
    mix(track, land + .004, kalimba(sparkle[0], .4, random)); mix(track, land + .12 + human(random), kalimba(sparkle[1], .22, random));
  },
});
const SCORES: Record<SampleName, Score> = {
  ready: { length: .6, level: .75, play(track, random) { mix(track, 0, wood('C#6', .9, random)); mix(track, .004, marimba('F#3', .7, random)); mix(track, .006, marimba('F#4', .3, random)); } },
  // A swung sixteenth at the theme's tempo: the pickup takes two thirds of an eighth.
  go: { length: .9, level: .89, play(track, random) {
    const land = EIGHTH * 2 / 3;
    mix(track, 0, marimba('C#5', .6, random)); mix(track, land, marimba('F#5', 1, random)); mix(track, land + .005, marimba('F#4', .5, random));
  } },
  answer: { length: .32, level: .7, play(track, random) { mix(track, 0, wood('D#6', .8, random)); mix(track, .003, marimba('A#5', .45, random, .35)); } },
  wrong: { length: .55, level: .8, play(track, random) {
    mix(track, 0, wood('G#4', .85, random, .6)); mix(track, .14 + human(random, .004), wood('D#4', .6, random, .6)); mix(track, .145, marimba('D#3', .7, random, .25));
  } },
  'correct-1': correct('C#5', 'F#5', 'A#5', 'F#4', ['F#6', 'C#7']),
  'correct-2': correct('D#5', 'G#5', 'C#6', 'G#4', ['G#6', 'D#7']),
  'correct-3': correct('A#4', 'C#5', 'F#5', 'F#4', ['A#6', 'F#6']),
  finish: { length: 2.5, level: .89, play(track, random) {
    ['F#5', 'A#5', 'C#6', 'A#5', 'D#6', 'C#6'].forEach((name, i) => mix(track, i * EIGHTH + (i ? human(random) : 0), marimba(name, i % 2 ? .7 : .9, random)));
    [['F#3', 0], ['C#4', 2], ['D#3', 4]].forEach(([name, step]) => mix(track, Number(step) * EIGHTH + .004, marimba(String(name), .6, random)));
    for (let i = 0; i < 6; i++) mix(track, i * EIGHTH, shaker(i % 2 ? .2 : .14, random));
    const land = 6 * EIGHTH;
    ['F#3', 'F#4', 'A#4', 'C#5', 'F#5'].forEach((name, i) => mix(track, land + i * .02 + human(random, .003), marimba(name, i ? .65 : .7, random)));
    mix(track, land + .1, marimba('F#6', .9, random));
    ['C#7', 'A#6', 'F#7'].forEach((name, i) => mix(track, land + .1 + i * .08 + human(random), kalimba(name, .3 - i * .05, random)));
    // Three friends clapping a few times, not a stadium.
    for (let clapper = 0; clapper < 3; clapper++) for (let at = land + .05 + random() * .1, claps = 0; claps < 3; at += .13 + random() * .05, claps++) mix(track, at, clap(.2 + random() * .1, random));
  } },
};
export function renderSample(name: SampleName): Float32Array {
  const score = SCORES[name], random = seeded([...name].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261));
  const track = samplesFor(score.length);
  score.play(track, random);
  let previousIn = 0, previousOut = 0;
  const out = room(track, .35).map(sample => { previousOut = sample - previousIn + .995 * previousOut; previousIn = sample; return previousOut; });
  const peak = out.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  // Long notes still ring at the score's length, so the tail closes with a raised-cosine fade rather than a cut.
  const fade = Math.max(RATE * .06, out.length * .2);
  return out.map((sample, i) => { const left = out.length - 1 - i; return sample / peak * score.level * (left >= fade ? 1 : .5 - .5 * Math.cos(Math.PI * left / fade)); });
}
function wav(samples: Float32Array): Buffer {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + samples.length * 2, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 2));
  return out;
}
function main(): void {
  const scratch = mkdtempSync(join(tmpdir(), 'pinto-sfx-')), target = resolve(fileURLToPath(import.meta.url), '../../web/public/sfx');
  try {
    let total = 0;
    for (const name of SAMPLE_NAMES) {
      const source = join(scratch, `${name}.wav`), output = join(target, `${name}.mp3`);
      writeFileSync(source, wav(renderSample(name)));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-codec:a', 'libmp3lame', '-b:a', '96k', output]);
      const { size } = statSync(output);
      total += size; console.log(`${name}.mp3 ${(size / 1024).toFixed(1)} KB`);
    }
    console.log(`total ${(total / 1024).toFixed(1)} KB`);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
