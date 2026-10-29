document.documentElement.classList.add('js');
document.getElementById('year').textContent = new Date().getFullYear();

const entries = document.querySelectorAll('.entry');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (item.isIntersecting) {
        item.target.classList.add('visible');
        io.unobserve(item.target);
      }
    });
  }, { threshold: 0.12 });
  entries.forEach((e) => io.observe(e));
} else {
  entries.forEach((e) => e.classList.add('visible'));
}

const root = document.documentElement;
const body = document.body;
const rail = document.querySelector('.rail');
const progress = document.querySelector('.rail-progress');
const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

// The fill tip starts at 60% of the viewport and glides to wherever the rail ends
// on screen at the bottom of the page, so the rail is exactly full at max scroll.
function updateProgress() {
  const y = window.scrollY, max = maxScroll(), vh = window.innerHeight;
  const s = max > 0 && y < max - 1 ? Math.max(0, y / max) : 1;
  const r = rail.getBoundingClientRect();
  const top = r.top + y, bottom = r.bottom + y;
  const tip = y + vh * 0.6 + s * (bottom - max - vh * 0.6);
  const pct = Math.min(1, Math.max(0, (tip - top) / (bottom - top)));
  progress.style.height = (pct * 100) + '%';
}

// The fill is solid in each node's accent for a short band around that node and
// blends into the next accent between nodes. Uses offsetTop so the entries' reveal
// transform doesn't shift the color stops.
function paintRail() {
  const railTop = rail.offsetTop;
  const ys = [...entries].map((entry) => {
    const m = entry.querySelector('.marker');
    return entry.offsetTop + m.offsetTop + m.offsetHeight / 2 - railTop;
  });
  const parts = [...entries].map((entry, i) => {
    const color = getComputedStyle(entry).getPropertyValue('--accent').trim();
    const gaps = [ys[i] - ys[i - 1], ys[i + 1] - ys[i]].filter((g) => g > 0);
    const band = Math.min(56, ...gaps.map((g) => g / 4));
    const from = i === 0 ? '0px' : `${ys[i] - band}px`;
    const to = i === ys.length - 1 ? '100%' : `${ys[i] + band}px`;
    return `${color} ${from} ${to}`;
  });
  progress.style.backgroundImage = `linear-gradient(to bottom, ${parts.join(', ')})`;
  progress.style.backgroundSize = `100% ${rail.offsetHeight}px`;
}

function layoutRail() { paintRail(); updateProgress(); }
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', layoutRail);
window.addEventListener('load', layoutRail);
if (document.fonts) document.fonts.ready.then(layoutRail);
layoutRail();

// Squish against the top/bottom edge on overscroll, then spring back.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let edge = 0, pushed = 0, releaseTimer;

function squish(dir, dist) {
  if (reduceMotion.matches) return;
  edge = dir; pushed = dist;
  const q = dist / (dist + 400);
  const bodyTop = body.getBoundingClientRect().top;
  const originY = (dir < 0 ? 0 : window.innerHeight) - bodyTop;
  body.style.transition = 'none';
  body.style.transformOrigin = `50% ${originY}px`;
  body.style.transform = `scaleY(${1 - 0.12 * q})`;
}

function release() {
  if (!edge) return;
  edge = 0; pushed = 0;
  body.style.transition = 'transform .6s cubic-bezier(.3, 1.8, .5, 1)';
  body.style.transform = '';
}

function edgeFor(delta) {
  if (delta < 0 && window.scrollY <= 0) return -1;
  if (delta > 0 && window.scrollY >= maxScroll() - 1) return 1;
  return 0;
}

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) return;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  const d = e.deltaY * unit;
  const dir = edgeFor(d);
  clearTimeout(releaseTimer);
  if (!dir) { release(); return; }
  squish(dir, (dir === edge ? pushed : 0) + Math.abs(d));
  releaseTimer = setTimeout(release, 120);
}, { passive: true });

let lastTouchY = null, touchStartY = 0, touchEdge = 0;
window.addEventListener('touchstart', (e) => {
  lastTouchY = e.touches[0].clientY; touchEdge = 0;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 1 || lastTouchY === null) return;
  const cy = e.touches[0].clientY, dy = cy - lastTouchY;
  lastTouchY = cy;
  if (!touchEdge) {
    touchEdge = edgeFor(-dy);
    if (!touchEdge) return;
    touchStartY = cy - dy;
  }
  const dist = (touchStartY - cy) * touchEdge;
  if (dist <= 0) { touchEdge = 0; release(); return; }
  squish(touchEdge, dist);
}, { passive: true });
const endTouch = () => { lastTouchY = null; touchEdge = 0; release(); };
window.addEventListener('touchend', endTouch);
window.addEventListener('touchcancel', endTouch);
