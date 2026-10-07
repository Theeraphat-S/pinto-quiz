// Synthesised cues for every device, plus the PiN TO! theme looped on the host stage only.
let context: AudioContext | null = null;
let music: HTMLAudioElement | null = null, musicGain: GainNode | null = null, musicOn = false, pauseTimer: ReturnType<typeof setTimeout> | null = null;
const MUSIC_VOLUME = .4, DUCKED_VOLUME = .15, FADE = .3;
export async function enableSound(): Promise<void> {
  context ||= new AudioContext();
  await context.resume();
}
function tone(frequency: number, delay = 0, duration = .13, volume = .035, type: OscillatorType = 'triangle'): void {
  if (!context || context.state !== 'running' || document.hidden) return;
  const start = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .008);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(start); oscillator.stop(start + duration + .01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
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
export function cue(kind: 'ready' | 'go' | 'answer' | 'correct' | 'wrong' | 'finish'): void {
  const notes = { ready: [392], go: [523, 659, 784], answer: [440, 587], correct: [523, 659, 784, 1047], wrong: [294, 220], finish: [523, 659, 784, 659, 784, 1047] }[kind];
  duck(); notes.forEach((n, i) => tone(n, i * .12, .2, .04));
}
export function beat(seconds: number, preparing: boolean): void {
  if (preparing) { tone(440 + (3 - seconds) * 110, 0, .17, .055, 'sine'); return; }
  // The looping melody would clash with the theme, so only the urgent ticks play over it.
  if (!musicOn) { tone([262, 330, 392, 330][seconds % 4], 0, .14, .025); tone(130, .12, .1, .015, 'sine'); }
  if (seconds <= 5) { tone(880, .02, .08, .04); tone(880, .45, .08, .04); }
}
