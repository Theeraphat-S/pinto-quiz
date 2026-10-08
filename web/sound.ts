// Rendered cue samples (scripts/render-sfx.ts) and live woodblock ticks for every device, plus the PiN TO! theme
// looped on the host stage only. Cues and ticks share the theme's key, so they sit inside the music rather than on top.
import { beatHits, type Cue, type Hit, note, SAMPLE_NAMES, sampleName, type Variation, vary, WOODBLOCK } from './sfx-score';
let context: AudioContext | null = null, loading: Promise<void> | null = null, noise: AudioBuffer | null = null;
let music: HTMLAudioElement | null = null, musicGain: GainNode | null = null, musicOn = false, pauseTimer: ReturnType<typeof setTimeout> | null = null;
const MUSIC_VOLUME = .4, DUCKED_VOLUME = .15, FADE = .3, CUE_VOLUME = .3, TICK_VOLUME = .1, LOAD_WAIT = 800;
const samples = new Map<string, AudioBuffer>();
async function loadSamples(audio: AudioContext): Promise<void> {
  await Promise.all(SAMPLE_NAMES.filter(name => !samples.has(name)).map(async name => {
    try { const response = await fetch(`/sfx/${name}.mp3`); if (response.ok) samples.set(name, await audio.decodeAudioData(await response.arrayBuffer())); } catch { /* a missing cue stays silent */ }
  }));
  if (samples.size < SAMPLE_NAMES.length) loading = null;
}
// Waits briefly so the first cue can play, but a slow network must not hold up the sound button.
export async function enableSound(): Promise<void> {
  context ||= new AudioContext();
  await context.resume();
  await Promise.race([loading ||= loadSamples(context), new Promise(done => setTimeout(done, LOAD_WAIT))]);
}
function audible(): AudioContext | null { return context && context.state === 'running' && !document.hidden ? context : null; }
// The live twin of wood() in the render script, built from the same WOODBLOCK partials and click.
function knock(hit: Hit, { rate, gain: volume }: Variation): void {
  const audio = audible(); if (!audio) return;
  const start = audio.currentTime + hit.at, frequency = note(hit.note) * rate, out = audio.createGain(), { click: shape } = WOODBLOCK;
  out.gain.value = TICK_VOLUME * hit.gain * volume; out.connect(audio.destination);
  for (const [ratio, amplitude, decay] of WOODBLOCK.partials) {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.frequency.value = frequency * ratio; gain.gain.setValueAtTime(amplitude, start); gain.gain.setTargetAtTime(0, start, decay);
    oscillator.connect(gain).connect(out); oscillator.start(start); oscillator.stop(start + decay * 8);
    // The fundamental rings longest, so it releases the shared output too.
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); if (ratio === 1) out.disconnect(); };
  }
  if (!noise) { noise = audio.createBuffer(1, audio.sampleRate * .01, audio.sampleRate); noise.getChannelData(0).forEach((_, i, data) => { data[i] = Math.random() * 2 - 1; }); }
  const click = audio.createBufferSource(), band = audio.createBiquadFilter(), gain = audio.createGain();
  click.buffer = noise; band.type = 'bandpass'; band.frequency.value = frequency * shape.ratio; band.Q.value = shape.q;
  gain.gain.setValueAtTime(shape.gain, start); gain.gain.setTargetAtTime(0, start, shape.decay);
  click.connect(band).connect(gain).connect(out); click.start(start);
  click.onended = () => { click.disconnect(); band.disconnect(); gain.disconnect(); };
}
// The music element keeps playing in hidden tabs; its gain node lets cues duck it and toggles fade.
export function setMusic(on: boolean): void {
  if (on === musicOn) return;
  musicOn = on;
  if (on && !context) { musicOn = false; return; }
  if (!music || !musicGain) {
    if (!on) return;
    music = new Audio('/music/pinto-vibe.mp3'); music.loop = true; music.preload = 'auto';
    musicGain = context!.createGain(); musicGain.gain.value = 0;
    context!.createMediaElementSource(music).connect(musicGain); musicGain.connect(context!.destination);
  }
  const gain = musicGain.gain, now = context!.currentTime;
  gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
  if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
  if (on) { gain.linearRampToValueAtTime(MUSIC_VOLUME, now + FADE); void music.play().catch(() => { musicOn = false; }); }
  else { gain.linearRampToValueAtTime(0, now + FADE); const element = music; pauseTimer = setTimeout(() => element.pause(), FADE * 1000 + 50); }
}
function duck(): void {
  if (!musicOn || !musicGain || !context) return;
  const gain = musicGain.gain, now = context.currentTime;
  gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(DUCKED_VOLUME, now + .08); gain.setValueAtTime(DUCKED_VOLUME, now + .9); gain.linearRampToValueAtTime(MUSIC_VOLUME, now + 1.5);
}
export function cue(kind: Cue): void {
  const audio = audible(), buffer = samples.get(sampleName(kind));
  if (!audio || !buffer) return;
  duck();
  const { rate, gain } = vary(), source = audio.createBufferSource(), level = audio.createGain();
  source.buffer = buffer; source.playbackRate.value = rate; level.gain.value = CUE_VOLUME * gain;
  source.connect(level).connect(audio.destination); source.start();
  source.onended = () => { source.disconnect(); level.disconnect(); };
}
export function beat(seconds: number, preparing: boolean): void {
  for (const hit of beatHits(seconds, preparing, musicOn)) knock(hit, vary());
}
