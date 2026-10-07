import { animate, type AnimationOptions, type AnimationPlaybackControls, type DOMKeyframesDefinition } from 'motion';

// Hybrid rule: ambient loops (floating mascots, ready dots, pulses, confetti) stay in style.css.
// Motion runs the one-off moments that need sequencing or live numbers.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export const springs = {
  // UI settling into place: quick, no overshoot.
  snappy: { type: 'spring', duration: 0.35, bounce: 0 },
  // Moments worth cheering: a visible bounce.
  celebrate: { type: 'spring', duration: 0.6, bounce: 0.4 },
} satisfies Record<string, AnimationOptions>;

const running = new Set<AnimationPlaybackControls>();
const track = (controls: AnimationPlaybackControls, done = () => {}) => {
  running.add(controls);
  const settle = () => { running.delete(controls); done(); };
  controls.finished.then(settle, settle);
};
const transformKeys = new Set(['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate']);

// Every animation goes through here so reduced motion is handled once. The markup already holds each final
// state, so skipping is enough, and finished animations hand their properties back to the stylesheet.
export function play(target: Element | Element[] | null | undefined, keyframes: DOMKeyframesDefinition, options?: AnimationOptions): void {
  const elements = (Array.isArray(target) ? target : [target]).filter((e): e is HTMLElement => e instanceof HTMLElement);
  if (reduced.matches || !elements.length) return;
  const props = [...new Set(Object.keys(keyframes).map(k => transformKeys.has(k) ? 'transform' : k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())))];
  // Motion commits the final WAAPI values after `finished` settles, so hand back a frame later.
  track(animate(elements, keyframes, options), () => requestAnimationFrame(() => elements.forEach(e => props.forEach(p => e.style.removeProperty(p)))));
}

// Fade from nothing to whatever opacity the stylesheet gives each element (disabled buttons, faded answers).
export function rise(elements: Element[], startDelay = 0, step = 0.06, distance = 16): void {
  elements.forEach((e, i) => play(e, { opacity: [0, Number(getComputedStyle(e).opacity)], y: [distance, 0] }, { ...springs.snappy, delay: startDelay + i * step }));
}

// Numbers in the markup are final; this replays them from zero.
export function countUp(el: Element | null, to: number, format: (n: number) => string, delay = 0): void {
  if (!el || !to || reduced.matches) return;
  el.textContent = format(0);
  track(animate(0, to, { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1], onUpdate: v => { el.textContent = format(Math.round(v)); } }), () => { if (el.isConnected) el.textContent = format(to); });
}

// The host can advance at any moment: whatever is still moving stops so the next scene takes over at once.
export function stopAll(): void {
  running.forEach(c => c.stop());
  running.clear();
}

// Kept short because the server, not the animation, decides when the next scene starts.
export function leave(el: Element | null): Promise<void> {
  stopAll();
  if (!(el instanceof HTMLElement) || reduced.matches) return Promise.resolve();
  return animate(el, { opacity: 0, y: -8 }, { duration: 0.15, ease: 'easeIn' }).finished.then(() => {}, () => {});
}

const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));

export function enterScene(el: Element | null): void {
  play(el, { opacity: [0, 1], y: [12, 0] }, springs.snappy);
}

// Question first, then the four answers one by one.
export function questionIn(root: ParentNode): void {
  rise(all(root, '.stage-question, .player-main > h2'), 0.05, 0, 10);
  rise(all(root, '.stageanswer, [data-answer]'), 0.15);
}

// The right answer lands with the reveal sound; then the tallies fill and count up in A–D order.
export function revealIn(root: ParentNode): void {
  play(root.querySelector('.correctpill'), { opacity: [0, 1], scale: [0.8, 1] }, springs.celebrate);
  all(root, '.reveal-responses .stageanswer').forEach((answer, i) => {
    const delay = 0.35 + i * 0.08, tally = answer.querySelector<HTMLElement>('.tally'), count = answer.querySelector('.count');
    if (answer.classList.contains('correct')) play(answer, { scale: [0.94, 1.02] }, springs.celebrate);
    else { const style = getComputedStyle(answer); play(answer, { opacity: [1, Number(style.opacity)], filter: ['saturate(1)', style.filter] }, { duration: 0.4 }); }
    const ratio = Number(tally?.style.getPropertyValue('--ratio') || 0);
    play(tally, { scaleX: [0, ratio] }, { ...springs.snappy, duration: 0.7, delay });
    countUp(count, Number.parseInt(count?.textContent || '0'), n => `${n} คน`, delay);
  });
}

// Player's own result: the stamp bounces in, then the points count up.
export function resultIn(root: ParentNode, points: number): void {
  play(root.querySelector('.result-stamp'), { opacity: [0, 1], scale: [0.3, 1], rotate: [-25, 0] }, springs.celebrate);
  countUp(root.querySelector('.resultpoints strong'), points, n => `+${n.toLocaleString()}`, 0.25);
}

export function joinIn(names: Element[]): void {
  names.forEach((e, i) => play(e, { opacity: [0, 1], scale: [0.6, 1] }, { ...springs.celebrate, delay: Math.min(i, 12) * 0.04 }));
}

// The tapped answer bounces back; the rest fade to their disabled look; the confirmation slides up.
export function pickAnswer(root: ParentNode, choice: number): void {
  all(root, '[data-answer]').forEach(button => {
    if (button.getAttribute('data-answer') === String(choice)) play(button, { scale: [0.9, 1] }, springs.celebrate);
    else play(button, { opacity: [1, Number(getComputedStyle(button).opacity)] }, { duration: 0.25 });
  });
  rise(all(root, '.waiting'), 0.1, 0, 10);
}
