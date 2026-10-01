import { gsap } from 'gsap';
import { setupSignal } from './signal';

const MOTION_STORAGE_KEY = 'midnight-of-vein:motion';
const DESKTOP_QUERY = '(min-width: 900px)';

type MotionPreference = 'on' | 'off' | null;

/** All reveal elements remain visible without JavaScript. */
function setupExperience(): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const heroReveals = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-reveal]'));
  const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    .filter((element) => !heroReveals.includes(element));
  const magneticElements = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  const parallaxElements = hero
    ? Array.from(hero.querySelectorAll<HTMLElement>('[data-parallax]'))
    : [];
  const pointerElements = [...new Set([...magneticElements, ...parallaxElements])];
  const motionElements = [...new Set([...heroReveals, ...reveals, ...pointerElements])];
  const originalStyles = new Map(motionElements.map((element) => [element, {
    transform: element.style.transform,
    opacity: element.style.opacity,
    willChange: element.style.willChange,
  }]));
  const motionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('#motion-toggle, [data-motion-toggle]'));
  let revealObserver: IntersectionObserver | null = null;
  let pointerFrame: number | null = null;
  let pointerPosition = { x: 0, y: 0 };
  let motionEnabled: boolean | undefined;
  const signalExperience = setupSignal({ signal, isEnabled: () => motionEnabled === true, finePointer });

  const readPreference = (): MotionPreference => {
    try {
      const value = window.localStorage.getItem(MOTION_STORAGE_KEY);
      return value === 'on' || value === 'off' ? value : null;
    } catch {
      return null;
    }
  };
  let preference = readPreference();

  const restore = (elements: HTMLElement[]): void => {
    if (!elements.length) return;
    gsap.killTweensOf(elements);
    // Clear GSAP's cached transforms before restoring the author's inline values.
    gsap.set(elements, { clearProps: 'transform,opacity,willChange' });
    for (const element of elements) {
      const styles = originalStyles.get(element);
      if (!styles) continue;
      element.style.transform = styles.transform;
      element.style.opacity = styles.opacity;
      element.style.willChange = styles.willChange;
    }
  };

  const cancelPointerFrame = (): void => {
    if (pointerFrame !== null) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
  };

  const stopMotion = (): void => {
    signalExperience.stop();
    revealObserver?.disconnect();
    revealObserver = null;
    cancelPointerFrame();
    restore(motionElements);
  };

  const reveal = (elements: HTMLElement[], stagger = 0): void => {
    if (!elements.length) return;
    gsap.fromTo(elements, { opacity: 0, y: 22 }, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      stagger,
      ease: 'power3.out',
      overwrite: 'auto',
      force3D: false,
      onComplete: () => {
        for (const element of elements) {
          element.style.willChange = originalStyles.get(element)?.willChange ?? '';
        }
      },
    });
  };

  const startMotion = (): void => {
    signalExperience.start();
    reveal(heroReveals, 0.095);
    if (!('IntersectionObserver' in window) || !reveals.length) return;
    // Hiding is opt-in at runtime, after both motion and observer support are checked.
    gsap.set(reveals, { opacity: 0, y: 22 });
    revealObserver = new IntersectionObserver((entries) => {
      const entering: HTMLElement[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entering.push(entry.target as HTMLElement);
        revealObserver?.unobserve(entry.target);
      }
      if (motionEnabled) reveal(entering, 0.065);
    }, { threshold: 0.08, rootMargin: '0px 0px -16px 0px' });
    for (const element of reveals) revealObserver.observe(element);
  };

  const applyMotion = (enabled: boolean): void => {
    root.dataset.motion = enabled ? 'on' : 'off';
    for (const button of motionButtons) {
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? 'Desactivar animaciones' : 'Activar animaciones');
      const label = button.querySelector<HTMLElement>('[data-motion-label]');
      if (label) label.textContent = `Animaciones: ${enabled ? 'sí' : 'no'}`;
    }
    if (motionEnabled === enabled) return;
    stopMotion();
    motionEnabled = enabled;
    if (enabled) startMotion();
  };

  // An explicit choice wins; otherwise follow the OS, including live changes.
  const syncMotion = (): void => applyMotion(preference ? preference === 'on' : !reducedMotion.matches);

  for (const button of motionButtons) button.addEventListener('click', () => {
    preference = motionEnabled ? 'off' : 'on';
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, preference);
    } catch {
      // The control remains usable when storage is unavailable or blocked.
    }
    syncMotion();
  }, { signal });
  reducedMotion.addEventListener('change', syncMotion, { signal });
  window.addEventListener('storage', (event) => {
    if (event.key !== MOTION_STORAGE_KEY && event.key !== null) return;
    preference = readPreference();
    syncMotion();
  }, { signal });

  for (const element of magneticElements) {
    element.addEventListener('pointermove', (event) => {
      if (!motionEnabled || !finePointer.matches || event.pointerType === 'touch') return;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      gsap.to(element, {
        x: x * 3.5,
        y: y * 2.5,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }, { signal });
    const resetMagnet = (): void => {
      if (!motionEnabled) return;
      gsap.to(element, { x: 0, y: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
    };
    element.addEventListener('pointerleave', resetMagnet, { signal });
    element.addEventListener('pointercancel', resetMagnet, { signal });
    element.addEventListener('blur', resetMagnet, { signal });
  }

  const resetParallax = (): void => {
    cancelPointerFrame();
    if (!motionEnabled || !parallaxElements.length) return;
    gsap.to(parallaxElements, { x: 0, y: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
  };
  hero?.addEventListener('pointermove', (event) => {
    if (!motionEnabled || !finePointer.matches || event.pointerType === 'touch') return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (pointerFrame !== null) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = null;
      if (!motionEnabled || !hero) return;
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, (pointerPosition.x - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerPosition.y - bounds.top) / bounds.height * 2 - 1));
      for (const element of parallaxElements) {
        const rawDepth = Number.parseFloat(element.dataset.parallax ?? '8');
        const depth = Number.isFinite(rawDepth) ? Math.max(-24, Math.min(24, rawDepth)) : 8;
        gsap.to(element, { x: x * depth, y: y * depth * 0.6, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
      }
    });
  }, { signal, passive: true });
  hero?.addEventListener('pointerleave', resetParallax, { signal });
  hero?.addEventListener('pointercancel', resetParallax, { signal });
  finePointer.addEventListener('change', () => {
    if (finePointer.matches) return;
    cancelPointerFrame();
    restore(pointerElements);
  }, { signal });
  window.addEventListener('blur', () => {
    cancelPointerFrame();
    restore(pointerElements);
  }, { signal });

  const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const nav = document.querySelector<HTMLElement>('#site-nav');
  const galleryDialog = document.querySelector<HTMLDialogElement>('#gallery-dialog');
  let menuOpen = false;
  const setMenuOpen = (open: boolean): void => {
    menuOpen = open && !desktop.matches;
    menuButton?.setAttribute('aria-expanded', String(menuOpen));
    if (nav) {
      nav.dataset.open = String(menuOpen);
      nav.inert = !desktop.matches && !menuOpen;
    }
  };
  menuButton?.setAttribute('aria-controls', 'site-nav');
  menuButton?.addEventListener('click', () => setMenuOpen(!menuOpen), { signal });
  nav?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false);
  }, { signal });
  desktop.addEventListener('change', () => setMenuOpen(false), { signal });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menuOpen || galleryDialog?.open) return;
    event.preventDefault();
    setMenuOpen(false);
    menuButton?.focus({ preventScroll: true });
  }, { signal });
  setMenuOpen(false);

  const galleryLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-gallery]'));
  const galleryImage = galleryDialog?.querySelector<HTMLImageElement>('#gallery-image');
  const galleryCaption = galleryDialog?.querySelector<HTMLElement>('#gallery-caption');
  const galleryCounter = galleryDialog?.querySelector<HTMLElement>('#gallery-counter');
  const previousButton = galleryDialog?.querySelector<HTMLButtonElement>('#gallery-prev');
  const nextButton = galleryDialog?.querySelector<HTMLButtonElement>('#gallery-next');
  const closeButton = galleryDialog?.querySelector<HTMLButtonElement>('[data-gallery-close]');
  let galleryIndex = 0;
  let galleryTrigger: HTMLElement | null = null;

  if (galleryDialog && galleryImage && typeof galleryDialog.showModal === 'function') {
    const showImage = (index: number): void => {
      if (!galleryLinks.length) return;
      galleryIndex = (index + galleryLinks.length) % galleryLinks.length;
      const link = galleryLinks[galleryIndex];
      if (!link) return;
      const caption = link.dataset.caption || link.querySelector('img')?.alt || 'Captura del juego';
      galleryImage.src = link.href;
      galleryImage.alt = caption;
      if (galleryCaption) galleryCaption.textContent = caption;
      if (galleryCounter) galleryCounter.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryLinks.length).padStart(2, '0')}`;
    };
    galleryImage.draggable = false;
    if (previousButton) previousButton.disabled = galleryLinks.length < 2;
    if (nextButton) nextButton.disabled = galleryLinks.length < 2;
    for (const [index, link] of galleryLinks.entries()) {
      link.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        showImage(index);
        try {
          if (!galleryDialog.open) galleryDialog.showModal();
        } catch {
          // Preserve the original image link if the browser cannot open a dialog.
          return;
        }
        event.preventDefault();
        galleryTrigger = link;
        closeButton?.focus({ preventScroll: true });
      }, { signal });
    }
    closeButton?.addEventListener('click', () => galleryDialog.close(), { signal });
    previousButton?.addEventListener('click', () => showImage(galleryIndex - 1), { signal });
    nextButton?.addEventListener('click', () => showImage(galleryIndex + 1), { signal });
    galleryDialog.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      showImage(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }, { signal });
    galleryDialog.addEventListener('click', (event) => {
      if (event.target !== galleryDialog) return;
      const bounds = galleryDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) galleryDialog.close();
    }, { signal });
    galleryDialog.addEventListener('close', () => {
      if (galleryTrigger?.isConnected) galleryTrigger.focus({ preventScroll: true });
      galleryTrigger = null;
    }, { signal });
  }

  syncMotion();
  for (const button of motionButtons) button.hidden = false;
  if (menuButton) menuButton.hidden = false;

  return () => {
    controller.abort();
    stopMotion();
    if (galleryDialog?.open) galleryDialog.close();
    if (nav) nav.inert = false;
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let cleanup: (() => void) | undefined;
  const initialize = (): void => {
    cleanup?.();
    cleanup = setupExperience();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
  document.addEventListener('astro:page-load', initialize);
  document.addEventListener('astro:before-swap', () => {
    cleanup?.();
    cleanup = undefined;
  });
}
