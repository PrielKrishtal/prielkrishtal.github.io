const pending = new Set(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const REVEAL_LINE = 0.92;
let scheduled = false;

function check() {
  scheduled = false;
  const line = innerHeight * REVEAL_LINE;
  const due = [...pending].filter((target) => target.getBoundingClientRect().top < line);
  for (const target of due) {
    target.classList.add('is-in');
    pending.delete(target);
  }
  if (pending.size === 0) {
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(check);
}

if (pending.size > 0) {
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  schedule();
}
