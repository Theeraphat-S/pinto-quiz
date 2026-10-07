let observer: ResizeObserver | null = null;
let frame = 0;
let cleanup: (() => void) | null = null;
// Scenes are authored on a fixed canvas so type sizes mean the same thing on every projector.
const DESIGN_WIDTH = 1280, DESIGN_HEIGHT = 640;

export function stopStageFit(): void {
  observer?.disconnect(); observer = null;
  if (frame) cancelAnimationFrame(frame);
  cleanup?.(); cleanup = null;
  delete document.body.dataset.stageFit;
}

// Scale the whole host scene up or down to fill the viewport below the stage bar.
// Phone-sized host windows keep the normal flowing layout and can scroll.
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
      const available = Math.max(100, innerHeight - viewport.getBoundingClientRect().top);
      viewport.style.height = `${available}px`;
      const height = Math.max(DESIGN_HEIGHT, canvas.scrollHeight);
      const scale = Math.min(viewport.clientWidth / DESIGN_WIDTH, available / height);
      canvas.style.transform = `translate(-50%, ${Math.max(0, (available - height * scale) / 2)}px) scale(${scale})`;
      window.scrollTo(0, 0);
    });
  };
  observer = new ResizeObserver(resize); observer.observe(canvas);
  window.addEventListener('resize', resize); document.addEventListener('fullscreenchange', resize);
  cleanup = () => { window.removeEventListener('resize', resize); document.removeEventListener('fullscreenchange', resize); };
  resize();
}
