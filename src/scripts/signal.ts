import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Decorative motion has one lifecycle, shared with the site's motion preference. */
export function setupSignal({ signal, isEnabled, finePointer }: {
  signal: AbortSignal;
  isEnabled: () => boolean;
  finePointer: MediaQueryList;
}): { start: () => void; stop: () => void } {
  const root = document.documentElement;
  const feed = document.querySelector<HTMLImageElement>('[data-camera-image]');
  const channels = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-camera]'));
  const status = document.querySelector<HTMLElement>('[data-camera-status]');
  const osd = document.querySelector<HTMLElement>('[data-camera-osd]');
  const controls = document.querySelector<HTMLElement>('[data-camera-controls]');
  const tiltElements = Array.from(document.querySelectorAll<HTMLElement>('[data-tilt], .download-card'));
  const tilts = new Map<HTMLElement, { x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> }>();
  let context: gsap.Context | undefined;
  let media: gsap.MatchMedia | undefined;
  let observer: IntersectionObserver | undefined;
  let feedTimeline: gsap.core.Timeline | undefined;
  let orbit: gsap.core.Tween | undefined;
  let orbitVisible = false;
  let screenVisible = false;
  let requestId = 0;

  const syncVisibility = (): void => {
    root.toggleAttribute('data-page-hidden', document.hidden);
    orbit?.paused(document.hidden || !orbitVisible);
    if (document.hidden || !screenVisible) feedTimeline?.pause();
    else feedTimeline?.resume();
  };
  document.addEventListener('visibilitychange', syncVisibility, { signal });

  for (const element of tiltElements) {
    element.addEventListener('pointermove', (event) => {
      if (!isEnabled() || !finePointer.matches || event.pointerType === 'touch') return;
      const bounds = element.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      tilts.get(element)?.x(-y * 4);
      tilts.get(element)?.y(x * 5);
    }, { signal, passive: true });
    const reset = (): void => {
      tilts.get(element)?.x(0);
      tilts.get(element)?.y(0);
    };
    element.addEventListener('pointerleave', reset, { signal });
    element.addEventListener('pointercancel', reset, { signal });
    window.addEventListener('blur', reset, { signal });
  }

  for (const [index, channel] of channels.entries()) {
    channel.addEventListener('click', async () => {
      if (!feed) return;
      const currentRequest = ++requestId;
      const name = channel.dataset.cameraName ?? '';
      if (channel.getAttribute('aria-pressed') === 'true') {
        if (status) status.textContent = `Cámara ${index + 1}: ${name.toLowerCase()}. Señal recuperada.`;
        return;
      }
      if (status) status.textContent = `Sintonizando cámara ${index + 1}…`;
      const image = new Image();
      image.src = `/media/${channel.dataset.camera}-1280.webp`;
      try {
        await image.decode();
      } catch {
        if (currentRequest === requestId && !signal.aborted && status) status.textContent = 'No se pudo recuperar la señal. Inténtalo de nuevo.';
        return;
      }
      if (signal.aborted || currentRequest !== requestId) return;
      feedTimeline?.kill();
      feed.src = image.src;
      feed.srcset = `/media/${channel.dataset.camera}-640.webp 640w, ${image.src} 1280w`;
      feed.alt = channel.dataset.cameraAlt ?? name;
      channels.forEach((button) => button.setAttribute('aria-pressed', String(button === channel)));
      if (osd) osd.textContent = `CH ${String(index + 1).padStart(2, '0')} / ${name}`;
      if (status) status.textContent = `Cámara ${index + 1}: ${name.toLowerCase()}. Señal recuperada.`;
      if (!isEnabled()) return;
      feedTimeline = gsap.timeline({ onComplete: () => { gsap.set(feed, { clearProps: 'transform,filter,opacity' }); } })
        .fromTo(feed, { scaleY: 0.96, x: -7, opacity: 0.65, filter: 'sepia(.5) hue-rotate(235deg)' }, { scaleY: 1, x: 4, opacity: 1, duration: 0.14, ease: 'steps(2)' })
        .to(feed, { x: 0, filter: 'sepia(0) hue-rotate(0deg)', duration: 0.3, ease: 'power2.out' });
    }, { signal });
  }
  if (controls) controls.hidden = false;

  const stop = (): void => {
    observer?.disconnect();
    observer = undefined;
    feedTimeline?.kill();
    feedTimeline = undefined;
    media?.revert();
    media = undefined;
    context?.revert();
    context = undefined;
    orbit = undefined;
    orbitVisible = false;
    screenVisible = false;
    tilts.clear();
    if (feed) gsap.set(feed, { clearProps: 'transform,filter,opacity' });
    document.querySelectorAll('[data-signal-visible]').forEach((element) => element.removeAttribute('data-signal-visible'));
  };

  const start = (): void => {
    stop();
    context = gsap.context(() => {
      if (feed) {
        feedTimeline = gsap.timeline({ delay: 0.2, paused: true })
          .fromTo(feed, { scaleY: 0.006, scaleX: 0.6, opacity: 0.4 }, { scaleX: 1, scaleY: 0.006, opacity: 0.8, duration: 0.2, ease: 'power2.out' })
          .to(feed, { scaleY: 1, opacity: 1, duration: 0.65, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
      const rotor = document.querySelector('.sigil-rotor');
      if (rotor) orbit = gsap.to(rotor, { rotation: 360, svgOrigin: '300 330', duration: 100, repeat: -1, ease: 'none', paused: true });
      if (document.querySelector('.escape-orbit')) {
        gsap.fromTo('.escape-orbit', { rotation: -15, scale: 0.82 }, {
          rotation: 20, scale: 1.12, ease: 'none',
          scrollTrigger: { trigger: '.escape-section', start: 'top bottom', end: 'bottom top', scrub: 1.2 },
        });
      }
      for (const row of document.querySelectorAll('.gameplay-row')) {
        const number = row.querySelector('.mechanic-number');
        const image = row.querySelector('.mechanic-image');
        if (!number || !image) continue;
        gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } })
          .from(number, { x: -20, opacity: 0, duration: 0.7, ease: 'power3.out' })
          .fromTo(image, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.inOut' }, 0.05);
      }
      const stamp = document.querySelector('.prison-stamp');
      if (stamp) gsap.from(stamp, {
        scale: 1.25, opacity: 0, rotation: -8, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: '.story-art', start: 'top 80%', once: true },
      });
      media = gsap.matchMedia();
      media.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
        for (const element of tiltElements) {
          gsap.set(element, { transformPerspective: 1000 });
          tilts.set(element, {
            x: gsap.quickTo(element, 'rotationX', { duration: 0.65, ease: 'power3.out' }),
            y: gsap.quickTo(element, 'rotationY', { duration: 0.65, ease: 'power3.out' }),
          });
        }
        if (document.querySelector('.hero-environment')) gsap.to('.hero-environment', {
          yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
        });
        if (document.querySelector('.story-image > img')) gsap.fromTo('.story-image > img', { scale: 1.18, yPercent: -7 }, {
          yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.story-art', start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
        return () => tilts.clear();
      });
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          entry.target.toggleAttribute('data-signal-visible', entry.isIntersecting);
          if (entry.target.classList.contains('hero-visual')) orbitVisible = entry.isIntersecting;
          if (entry.target.classList.contains('monitor-screen')) screenVisible = entry.isIntersecting;
        }
        syncVisibility();
      }, { threshold: 0 });
      document.querySelectorAll('.hero-visual, .monitor-screen, .ticker, .escape-section').forEach((element) => observer?.observe(element));
    } else {
      orbitVisible = true;
      screenVisible = true;
    }
    syncVisibility();
  };
  signal.addEventListener('abort', () => { ++requestId; stop(); root.removeAttribute('data-page-hidden'); }, { once: true });
  return { start, stop };
}
