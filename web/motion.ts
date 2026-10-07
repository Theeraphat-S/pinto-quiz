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

// Numbers in the markup are final; this replays them from `from` (zero by default).
export function countUp(el: Element | null, to: number, format: (n: number) => string, delay = 0, from = 0): void {
  if (!el || to === from || reduced.matches) return;
  el.textContent = format(from);
  track(animate(from, to, { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1], onUpdate: v => { el.textContent = format(Math.round(v)); } }), () => { if (el.isConnected) el.textContent = format(to); });
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

// Each new answer bumps the count and the track grows from where it was.
export function answeredIn(root: ParentNode, from: number): void {
  const bar = root.querySelector<HTMLElement>('.answered-track > div');
  play(bar, { scaleX: [from, Number(bar?.style.getPropertyValue('--ratio') || 0)] }, { ...springs.snappy, duration: 0.5 });
  play(root.querySelector('.answered strong'), { scale: [1.18, 1] }, springs.celebrate);
}

// Where each player stood, and with how many points, before the question being ranked.
export type Standing = { rank: Map<string, number>; score: Map<string, number> };
const placeOf = (e: Element) => Number(/place-(\d)/.exec(e.className)?.[1] || 3);
const points = (n: number) => `${n.toLocaleString()} คะแนน`;

// Standings: the podium rises 3 → 2 → 1, listed rows slide from their old slot, and scores climb from their old totals.
// The finale takes its time and counts every score from zero.
export function standingsIn(root: ParentNode, before: Standing | null, finale: boolean): void {
  const delays = finale ? { 3: 0.3, 2: 1.1, 1: 2 } : { 3: 0.1, 2: 0.2, 1: 0.3 };
  all(root, '.podium-place').forEach(place => {
    const rank = placeOf(place) as 1 | 2 | 3, delay = delays[rank], id = place.getAttribute('data-player') || '';
    play(place, { opacity: [0, 1], y: [48, 0] }, { ...(rank === 1 && finale ? springs.celebrate : springs.snappy), duration: finale ? 0.8 : 0.5, delay });
    const score = place.querySelector('p');
    countUp(score, Number.parseInt((score?.textContent || '0').replace(/,/g, '')), points, delay + 0.2, finale ? 0 : before?.score.get(id) ?? 0);
  });
  if (finale) play(root.querySelector('.place-1 .medal'), { scale: [0, 1], rotate: [-30, 0] }, { ...springs.celebrate, delay: 2.4 });
  const rows = all(root, '.rest .rankrow') as HTMLElement[];
  rows.forEach((row, j) => {
    const id = row.dataset.player || '', was = before?.rank.get(id), now = 3 + j, delay = 0.25 + j * 0.05;
    if (was !== undefined && was !== now && rows[was - 3]) play(row, { y: [rows[was - 3].offsetTop - row.offsetTop, 0] }, { ...springs.snappy, duration: 0.6, delay: 0.2 });
    else if (was !== undefined && was !== now) play(row, { opacity: [0, 1], y: [was < now ? -40 : 40, 0] }, { ...springs.snappy, delay });
    else rise([row], delay, 0, 12);
    const score = row.querySelector('strong:last-child');
    countUp(score, Number.parseInt((score?.textContent || '0').replace(/,/g, '')), n => n.toLocaleString(), delay, finale ? 0 : before?.score.get(id) ?? 0);
  });
}

// The player's own rank climbs (or slips) from where they stood after the last question, then the move chip pops.
export function myRankIn(root: ParentNode, before: { rank: number; score: number } | null): void {
  const label = root.querySelector('.resultpoints strong'), total = root.querySelector('.resultpoints > span'), text = label?.textContent || '';
  if (before && /^#\d+$/.test(text)) countUp(label, Number(text.slice(1)), n => `#${n}`, 0.1, before.rank);
  const rest = (total?.textContent || '').replace(/^[\d,]+/, '');
  if (before) countUp(total, Number.parseInt((total?.textContent || '0').replace(/,/g, '')), n => n.toLocaleString() + rest, 0.1, before.score);
  play(root.querySelector('.rank-move'), { opacity: [0, 1], scale: [0.6, 1] }, { ...springs.celebrate, delay: 0.7 });
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
