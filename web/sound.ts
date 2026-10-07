// Small original synthesised cues: no downloaded music, autoplay or audio files.
let context: AudioContext | null = null;
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
export function cue(kind: 'ready' | 'go' | 'answer' | 'correct' | 'wrong' | 'finish'): void {
  const notes = { ready: [392], go: [523, 659, 784], answer: [440, 587], correct: [523, 659, 784, 1047], wrong: [294, 220], finish: [523, 659, 784, 659, 784, 1047] }[kind];
  notes.forEach((n, i) => tone(n, i * .12, .2, .04));
}
export function beat(seconds: number, preparing: boolean): void {
  if (preparing) { tone(440 + (3 - seconds) * 110, 0, .17, .055, 'sine'); return; }
  tone([262, 330, 392, 330][seconds % 4], 0, .14, .025);
  tone(130, .12, .1, .015, 'sine');
  if (seconds <= 5) { tone(880, .02, .08, .04); tone(880, .45, .08, .04); }
}
