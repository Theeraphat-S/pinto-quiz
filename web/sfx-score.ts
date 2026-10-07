// Pitch, rhythm and variation shared by the live ticks (web/sound.ts) and the rendered cues (scripts/render-sfx.ts).
// Everything sits in F# major pentatonic at the theme's ~118 BPM so no cue clashes with pinto-vibe.mp3.
const BPM = 118;
export const BEAT = 60 / BPM;
export const PENTATONIC = ['F#', 'G#', 'A#', 'C#', 'D#'];
const SEMITONE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function note(name: string): number {
  const [, pitch, octave] = /^([A-G]#?)(\d)$/.exec(name) ?? [];
  if (!pitch) throw new Error(`Unknown note ${name}`);
  return 440 * 2 ** ((SEMITONE[pitch] + (Number(octave) + 1) * 12 - 69) / 12);
}
export interface Hit { note: string; at: number; gain: number }
const COUNTDOWN = ['C#5', 'D#5', 'F#5'], TICKS = ['C#6', 'G#5', 'A#5', 'G#5'];
export function beatHits(seconds: number, preparing: boolean, musicOn: boolean): Hit[] {
  if (preparing) return [{ note: COUNTDOWN[Math.min(Math.max(3 - seconds, 0), COUNTDOWN.length - 1)], at: 0, gain: .9 }];
  if (seconds <= 5) return [{ note: 'F#6', at: .02, gain: .8 }, { note: 'F#6', at: .02 + BEAT / 2, gain: .55 }];
  // The ticking pattern would fight the theme's own groove, so it plays only without music.
  return musicOn ? [] : [{ note: TICKS[seconds % 4], at: 0, gain: seconds % 4 === 0 ? .5 : .35 }];
}
export type Cue = 'ready' | 'go' | 'answer' | 'correct' | 'wrong' | 'finish';
export const SAMPLE_NAMES = ['ready', 'go', 'answer', 'wrong', 'finish', 'correct-1', 'correct-2', 'correct-3'] as const;
export type SampleName = typeof SAMPLE_NAMES[number];
export function sampleName(kind: Cue, random = Math.random): SampleName {
  return kind === 'correct' ? `correct-${1 + Math.floor(random() * 3) as 1 | 2 | 3}` : kind;
}
// One woodblock voice for the rendered cues and the live ticks: [ratio, amplitude, decay seconds] partials over a
// band-passed noise click centred on a multiple of the pitch.
export const WOODBLOCK = { partials: [[1, 1, .05], [2.71, .45, .022], [4.6, .2, .01]] as [number, number, number][], click: { ratio: 2.2, q: 1.2, gain: .6, decay: .0012 } };
export interface Variation { rate: number; gain: number }
// Every cue drifts at most ±1% (about 17 cents) in pitch, any more and it would sour against the theme.
export function vary(random = Math.random): Variation {
  return { rate: 1 + (random() * 2 - 1) * .01, gain: 1 + (random() * 2 - 1) * .1 };
}
