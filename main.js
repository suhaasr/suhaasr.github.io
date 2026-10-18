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

const timeline = document.getElementById('timeline');
const progress = document.querySelector('.rail-progress');
function updateProgress() {
  const rect = timeline.getBoundingClientRect();
  const viewMid = window.innerHeight * 0.6;
  const pct = Math.min(1, Math.max(0, (viewMid - rect.top) / rect.height));
  progress.style.height = (pct * 100) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
