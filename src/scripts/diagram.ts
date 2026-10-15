import { fetchStatus, formatCount, formatSince, type FilingBotStatus } from '../lib/status';

interface Step {
  node: string;
  state?: string;
  end?: 'fail';
  mark?: 'retry';
}

interface PathSpec {
  id: string;
  note: string;
  steps: Step[];
}

interface Point {
  x: number;
  y: number;
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CASCADE_MS = 170;
const HOP_MS = 400;
const HOLD_MS = 280;
const RETRY_MS = 800;
const REST_MS = 1200;
const MOVE_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';
const STATE_LABELS = { up: 'Running now', degraded: 'Degraded', unknown: 'No live reading right now' } as const;
const SAMPLE_LABEL = 'Example data';

function readPaths(figure: HTMLElement): PathSpec[] {
  return JSON.parse(figure.dataset.paths ?? '[]') as PathSpec[];
}

function lightPath(figure: HTMLElement, path: PathSpec | null, stepMs: number) {
  const nodes = [...figure.querySelectorAll<HTMLElement>('[data-node]')];
  const states = [...figure.querySelectorAll<HTMLElement>('[data-state-item]')];
  [...nodes, ...states].forEach((el) => {
    el.style.setProperty('--d', '0ms');
    el.classList.remove('is-lit', 'is-end-fail', 'is-current');
  });
  if (!path) {
    delete figure.dataset.active;
    return;
  }
  figure.dataset.active = path.id;
  void figure.offsetWidth;

  let lastState: HTMLElement | undefined;
  path.steps.forEach((step, index) => {
    const delay = `${index * stepMs}ms`;
    const node = nodes.find((candidate) => candidate.dataset.node === step.node);
    if (node && !node.classList.contains('is-lit')) {
      node.style.setProperty('--d', delay);
      node.classList.add('is-lit');
    }
    if (node && step.end === 'fail') node.classList.add('is-end-fail');
    const state = states.find((candidate) => candidate.dataset.stateItem === step.state);
    if (state) {
      state.style.setProperty('--d', delay);
      state.classList.add('is-lit');
      if (step.end === 'fail') state.classList.add('is-end-fail');
      lastState = state;
    }
  });
  lastState?.classList.add('is-current');
}

function initPaths(figure: HTMLElement) {
  const paths = readPaths(figure);
  const buttons = [...figure.querySelectorAll<HTMLButtonElement>('[data-path]')];
  const note = figure.querySelector<HTMLElement>('[data-note]')!;

  function show(id: string) {
    const path = paths.find((candidate) => candidate.id === id) ?? null;
    if (!path) return;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.path === id)));
    note.textContent = path.note;
    lightPath(figure, path, reduceMotion.matches ? 0 : CASCADE_MS);
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      show(paths[0].id);
    },
    { threshold: 0.35 },
  );
  observer.observe(figure);

  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      observer.disconnect();
      show(button.dataset.path!);
    }),
  );
}

function initLive(figure: HTMLElement) {
  const paths = readPaths(figure);
  const pathById = (id: string) => paths.find((candidate) => candidate.id === id)!;
  const grid = figure.querySelector<HTMLElement>('.grid')!;
  const nodes = [...figure.querySelectorAll<HTMLElement>('[data-node]')];
  const nodeById = (id: string) => nodes.find((candidate) => candidate.dataset.node === id)!;
  const packet = figure.querySelector<HTMLElement>('[data-packet]')!;
  const failSwitch = figure.querySelector<HTMLButtonElement>('[data-fail-switch]')!;
  const duplicateButton = figure.querySelector<HTMLButtonElement>('[data-duplicate]')!;
  const pauseButton = figure.querySelector<HTMLButtonElement>('[data-pause]')!;
  const note = figure.querySelector<HTMLElement>('[data-note]')!;
  const stateWrap = figure.querySelector<HTMLElement>('[data-status]')!;
  const stateLabel = figure.querySelector<HTMLElement>('[data-status-label]')!;
  const countWrap = figure.querySelector<HTMLElement>('[data-count-wrap]')!;
  const countEl = figure.querySelector<HTMLElement>('[data-count]')!;
  const sinceWrap = figure.querySelector<HTMLElement>('[data-since-wrap]')!;
  const sinceEl = figure.querySelector<HTMLElement>('[data-since]')!;
  const baseNote = note.textContent?.trim() ?? '';

  const configured = import.meta.env.PUBLIC_FILINGBOT_STATUS_URL as string | undefined;
  const statusUrl = configured || '/status.sample.json';
  const source = configured ? 'live' : 'sample';
  const defaultNote = source === 'sample' ? `${baseNote} The status above is example data.` : baseNote;
  note.textContent = defaultNote;

  let status: FilingBotStatus | null = null;
  let failMode = false;
  let paused = false;
  let inView = false;
  let looping = false;
  let pendingReal = 0;
  let pendingDuplicate = false;
  let runId = 0;
  let flight: Animation | null = null;
  let current: Point = { x: 0, y: 0 };

  const speed = () => (status?.state === 'degraded' ? 1.6 : 1);
  const motionAllowed = () => !reduceMotion.matches && !paused && inView && document.visibilityState === 'visible';
  const hasWork = () => pendingDuplicate || pendingReal > 0 || (status !== null && status.state !== 'unknown');

  function centerOf(node: HTMLElement): Point {
    const box = node.getBoundingClientRect();
    const frame = grid.getBoundingClientRect();
    return { x: box.left - frame.left + box.width / 2, y: box.top - frame.top + box.height / 2 };
  }

  function place(point: Point) {
    current = point;
    packet.style.transform = `translate(${point.x}px, ${point.y}px)`;
  }

  function interrupt() {
    runId++;
    flight?.cancel();
  }

  async function wait(ms: number, id: number) {
    const end = performance.now() + ms;
    while (performance.now() < end && id === runId) await sleep(40);
  }

  async function hop(to: Point, id: number) {
    const animation = packet.animate(
      [{ transform: `translate(${current.x}px, ${current.y}px)` }, { transform: `translate(${to.x}px, ${to.y}px)` }],
      { duration: HOP_MS * speed(), easing: MOVE_EASING, fill: 'forwards' },
    );
    flight = animation;
    await animation.finished.catch(() => {});
    animation.cancel();
    flight = null;
    if (id === runId) place(to);
  }

  function clearRun() {
    nodes.forEach((node) => node.classList.remove('is-active', 'is-retry', 'is-end-fail'));
  }

  async function travel(path: PathSpec, real: boolean, id: number) {
    clearRun();
    packet.classList.toggle('is-real', real);
    place(centerOf(nodeById(path.steps[0].node)));
    packet.classList.add('is-visible');
    note.textContent = real ? 'A new filing was just processed.' : path.id === 'valid' ? defaultNote : path.note;

    for (const [index, step] of path.steps.entries()) {
      const node = nodeById(step.node);
      if (index > 0) await hop(centerOf(node), id);
      if (id !== runId) break;
      nodes.forEach((candidate) => candidate.classList.toggle('is-active', candidate === node));
      if (step.mark === 'retry') {
        node.classList.add('is-retry');
        await wait(RETRY_MS * speed(), id);
      }
      if (step.end === 'fail') {
        node.classList.add('is-end-fail');
        await wait(HOLD_MS * 4, id);
        break;
      }
      await wait(HOLD_MS * speed(), id);
    }

    packet.classList.remove('is-visible');
    clearRun();
    if (id === runId) note.textContent = defaultNote;
  }

  async function loop() {
    if (looping) return;
    looping = true;
    while (motionAllowed() && hasWork()) {
      const id = runId;
      if (pendingDuplicate) {
        pendingDuplicate = false;
        await travel(pathById('duplicate'), false, id);
      } else if (pendingReal > 0) {
        pendingReal--;
        await travel(pathById('valid'), true, id);
      } else {
        await travel(pathById(failMode ? 'invalid' : 'valid'), false, id);
      }
      await wait(REST_MS, id);
    }
    looping = false;
  }

  function showStatic(id: string | null) {
    lightPath(figure, id ? pathById(id) : null, 0);
    note.textContent = id ? pathById(id).note : defaultNote;
  }

  failSwitch.addEventListener('click', () => {
    failMode = !failMode;
    failSwitch.setAttribute('aria-checked', String(failMode));
    if (reduceMotion.matches) showStatic(failMode ? 'invalid' : null);
    else {
      interrupt();
      loop();
    }
  });

  duplicateButton.addEventListener('click', () => {
    if (reduceMotion.matches) {
      failMode = false;
      failSwitch.setAttribute('aria-checked', 'false');
      showStatic('duplicate');
      return;
    }
    pendingDuplicate = true;
    interrupt();
    loop();
  });

  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Play animation' : 'Pause animation';
    if (!paused) loop();
  });

  function renderSince() {
    const at = status?.source === 'sample' ? null : (status?.lastFilingAt ?? null);
    sinceWrap.hidden = at === null;
    if (at) sinceEl.textContent = formatSince(at);
  }

  function render(next: FilingBotStatus) {
    const previous = status?.filingsProcessed ?? null;
    status = next;
    const isSample = next.source === 'sample' && next.state !== 'unknown';
    stateWrap.dataset.status = isSample ? 'sample' : next.state;
    stateLabel.textContent = isSample ? SAMPLE_LABEL : STATE_LABELS[next.state];
    countWrap.hidden = next.filingsProcessed === null;
    if (next.filingsProcessed !== null) {
      const text = formatCount(next.filingsProcessed);
      if (countEl.textContent && countEl.textContent !== text && !reduceMotion.matches) {
        countEl.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], {
          duration: 200,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        });
      }
      countEl.textContent = text;
    }
    renderSince();
    if (previous !== null && next.filingsProcessed !== null && next.filingsProcessed > previous) {
      pendingReal = Math.min(3, pendingReal + next.filingsProcessed - previous);
    }
    loop();
  }

  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    render(await fetchStatus(statusUrl, source));
  }

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) loop();
    },
    { threshold: 0.25 },
  ).observe(grid);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refresh();
      loop();
    }
  });
  reduceMotion.addEventListener('change', () => loop());

  refresh();
  setInterval(refresh, 60_000);
  setInterval(renderSince, 30_000);
}

document.querySelectorAll<HTMLElement>('[data-diagram]').forEach((figure) => {
  if (figure.dataset.mode === 'live') initLive(figure);
  else initPaths(figure);
});
