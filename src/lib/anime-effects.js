import { animate, stagger, svg } from 'animejs';

const initialized = new WeakSet();

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function toElements(targets, root = document) {
  if (typeof targets === 'string') return [...root.querySelectorAll(targets)];
  if (targets instanceof Element) return [targets];
  return targets ? [...targets] : [];
}

function settle(elements) {
  elements.forEach((element) => {
    element.style.opacity = '1';
    element.style.transform = 'none';
  });
  return null;
}

export function reveal(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return settle(elements);
  return animate(elements, {
    opacity: { from: 0 },
    y: { from: options.distance ?? 24 },
    duration: options.duration ?? 720,
    delay: options.delay ?? 0,
    ease: options.ease ?? 'outExpo',
  });
}

export function staggerReveal(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return settle(elements);
  return animate(elements, {
    opacity: { from: 0 },
    y: { from: options.distance ?? 18 },
    duration: options.duration ?? 680,
    delay: stagger(options.gap ?? 70, { from: options.from ?? 'first' }),
    ease: options.ease ?? 'outExpo',
  });
}

export function hoverLift(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return () => {};
  const cleanups = elements.map((element) => {
    const enter = () => animate(element, {
      y: -(options.distance ?? 6),
      scale: options.scale ?? 1.02,
      duration: options.duration ?? 240,
      ease: options.ease ?? 'outExpo',
    });
    const leave = () => animate(element, {
      y: 0,
      scale: 1,
      duration: options.duration ?? 240,
      ease: options.ease ?? 'outExpo',
    });
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

export function rotateLoop(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return settle(elements);
  return animate(elements, {
    rotate: options.degrees ?? 360,
    duration: options.duration ?? 4000,
    ease: options.ease ?? 'linear',
    alternate: options.alternate ?? false,
    loop: options.loop ?? true,
  });
}

export function revealOnScroll(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return settle(elements);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target, options);
      if (options.once ?? true) observer.unobserve(entry.target);
    });
  }, { threshold: options.threshold ?? 0.18 });
  elements.forEach((element) => observer.observe(element));
  return observer;
}

export function drawSvg(targets, options = {}) {
  const elements = toElements(targets, options.root);
  if (!elements.length || reducedMotion()) return settle(elements);
  const drawables = elements.flatMap((element) => svg.createDrawable(element));
  return animate(drawables, {
    draw: options.draw ?? ['0 0', '0 1'],
    duration: options.duration ?? 1400,
    delay: options.delay ?? 0,
    ease: options.ease ?? 'inOutQuad',
  });
}

export function scanPerimeter(targets, options = {}) {
  const paths = toElements(targets, options.root).filter(
    (element) => typeof element.getTotalLength === 'function',
  );
  if (!paths.length || reducedMotion()) return settle(paths);
  return paths.map((path) => {
    const length = path.getTotalLength();
    const visible = Math.max(1, length * (options.segment ?? 0.08));
    path.style.strokeDasharray = `${visible} ${length + visible}`;
    path.style.strokeDashoffset = '0';
    return animate(path, {
      strokeDashoffset: -length,
      duration: options.duration ?? 3200,
      ease: options.ease ?? 'linear',
      loop: options.loop ?? true,
    });
  });
}

export function soundBars(targets, options = {}) {
  const bars = toElements(targets, options.root);
  if (!bars.length || reducedMotion()) return settle(bars);
  bars.forEach((bar) => { bar.style.transformOrigin = '50% 50%'; });
  return animate(bars, {
    scaleY: (_, index) => 0.3 + ((index * 7) % 8) * 0.09,
    duration: options.duration ?? 520,
    delay: stagger(options.gap ?? 28, { from: options.from ?? 'center' }),
    ease: options.ease ?? 'inOutQuad',
    alternate: true,
    loop: true,
  });
}

function numberAttribute(element, name, fallback) {
  const value = Number(element.dataset[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function initAnimeEffects(root = document) {
  const nodes = [...root.querySelectorAll('[data-anime]')];
  nodes.forEach((node) => {
    if (initialized.has(node)) return;
    initialized.add(node);
    const duration = numberAttribute(node, 'duration', undefined);
    const options = duration ? { duration } : {};
    switch (node.dataset.anime) {
      case 'reveal':
        revealOnScroll(node, options);
        break;
      case 'stagger':
        staggerReveal(node.querySelectorAll(':scope > *'), options);
        break;
      case 'hover':
        hoverLift(node, options);
        break;
      case 'rotate':
        rotateLoop(node, options);
        break;
      case 'svg-draw':
        drawSvg(node, options);
        break;
      case 'perimeter-scan':
        scanPerimeter(node, options);
        break;
      case 'sound-bars':
        soundBars(node.querySelectorAll(':scope > *'), options);
        break;
      default:
        initialized.delete(node);
    }
  });
}
