let observer: ResizeObserver | null = null;
let frame = 0;
let cleanup: (() => void) | null = null;

export function stopStageFit(): void {
  observer?.disconnect(); observer = null;
  if (frame) cancelAnimationFrame(frame);
  cleanup?.(); cleanup = null;
  delete document.body.dataset.stageFit;
}

// Keep a complete host scene inside the projector viewport, including long content.
// Normal phone layouts remain at full text size and can scroll naturally.
export function fitStage(): void {
  const viewport = document.querySelector<HTMLElement>('.stage-viewport');
  const canvas = document.querySelector<HTMLElement>('.stage-canvas');
  if (!viewport || !canvas) return;
  const resize = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      const fitted = innerWidth >= 700 && innerHeight >= 500;
      document.body.dataset.stageFit = String(fitted);
      viewport.classList.toggle('fitted', fitted);
      if (!fitted) { viewport.style.height = ''; canvas.style.transform = ''; return; }
      const main = viewport.parentElement!;
      const padding = parseFloat(getComputedStyle(main).paddingBottom);
      const available = Math.max(100, innerHeight - viewport.getBoundingClientRect().top - padding - 12);
      viewport.style.height = `${available}px`;
      const scale = Math.min(1, available / Math.max(1, canvas.scrollHeight));
      canvas.style.transform = `translateX(-50%) scale(${scale})`;
      window.scrollTo(0, 0);
    });
  };
  observer = new ResizeObserver(resize); observer.observe(canvas);
  window.addEventListener('resize', resize); document.addEventListener('fullscreenchange', resize);
  cleanup = () => { window.removeEventListener('resize', resize); document.removeEventListener('fullscreenchange', resize); };
  resize();
}
