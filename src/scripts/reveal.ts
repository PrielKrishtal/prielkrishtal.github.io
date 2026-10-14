const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

function showAll() {
  targets.forEach((target) => target.classList.add('is-in'));
}

if (!('IntersectionObserver' in window)) {
  showAll();
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );
  targets.forEach((target) => observer.observe(target));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((target) => {
      const box = target.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) target.classList.add('is-in');
    });
  }, 2500));
}
