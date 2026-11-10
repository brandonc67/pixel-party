const pile = document.querySelector('#prize-pile');
const claw = document.querySelector('#claw');
const grabbed = document.querySelector('#grabbed-prize');
const playCount = document.querySelector('#plays');
const message = document.querySelector('#machine-message');
const moveLeft = document.querySelector('#move-left');
const moveRight = document.querySelector('#move-right');
const lower = document.querySelector('#lower-claw');
const grab = document.querySelector('#grab-claw');

const PRIZES = [
  ['★', 'STAR STICKER', 10], ['●', 'PINK ORB', 15], ['◆', 'GEM TOKEN', 20],
  ['♥', 'HEART PLUSH', 25], ['✦', 'GOLDEN STAR', 50], ['●', 'BLUE ORB', 15],
  ['★', 'COMET PIN', 30], ['◆', 'CRYSTAL', 40], ['♥', 'HEART KEYCHAIN', 20],
  ['✦', 'MOON TOKEN', 35], ['●', 'CANDY BALL', 10], ['★', 'LUCKY BADGE', 45]
];

const prizeX = (index) => 8 + (index % 6) * 16;
let clawX = 50;
let clawY = 5;
let lowered = false;
let busy = false;
let prizes = [];
let statusText = '';

function readMeta() {
  try {
    const saved = JSON.parse(localStorage.getItem('pixelPartyTaskMeta')) || {};
    return { plays: 0, ...saved, plays: Math.max(0, Number(saved.plays) || 0) };
  } catch (_) {
    return { plays: 0 };
  }
}

function saveMeta(meta) {
  try { localStorage.setItem('pixelPartyTaskMeta', JSON.stringify(meta)); } catch (_) {}
}

function setStatus(text) {
  statusText = text;
  message.textContent = text;
}

function renderClaw() {
  claw.style.left = `${clawX}%`;
  claw.style.top = `${clawY}px`;
  claw.classList.toggle('lowered', lowered);
  claw.classList.toggle('closing', busy);
}

function renderControls() {
  const meta = readMeta();
  const hasPlay = meta.plays > 0;
  playCount.textContent = meta.plays;
  moveLeft.disabled = busy;
  moveRight.disabled = busy;
  lower.disabled = busy || !hasPlay;
  lower.textContent = lowered ? 'RAISE' : 'LOWER';
  lower.setAttribute('aria-pressed', String(lowered));
  grab.disabled = busy || !hasPlay || !lowered;
  if (!busy && !statusText) {
    setStatus(hasPlay
      ? 'Move the claw above a prize, lower it, then press GRAB.'
      : 'Finish a task to earn your first play.');
  }
}

function buildPrizes() {
  pile.innerHTML = '';
  prizes = PRIZES.map((prize, index) => {
    const item = document.createElement('span');
    item.className = 'machine-prize';
    item.textContent = prize[0];
    item.dataset.index = index;
    item.style.left = `${prizeX(index)}%`;
    item.style.bottom = `${10 + Math.floor(index / 6) * 18 + (index % 3) * 3}%`;
    item.style.background = ['#ffd166', '#f59caa', '#b2a4ef', '#8ee2c1'][index % 4];
    item.setAttribute('aria-hidden', 'true');
    pile.append(item);
    return item;
  });
}

function availableIndexes() {
  return prizes
    .map((item, index) => item.classList.contains('claimed') ? -1 : index)
    .filter((index) => index !== -1);
}

function nearestPrizeIndex() {
  return availableIndexes().reduce((nearest, index) => (
    nearest === null || Math.abs(prizeX(index) - clawX) < Math.abs(prizeX(nearest) - clawX)
      ? index
      : nearest
  ), null);
}

function move(amount) {
  if (busy) return;
  clawX = Math.max(8, Math.min(92, clawX + amount));
  if (lowered) {
    setStatus('The claw is down. Press GRAB to catch the nearest prize.');
  } else if (readMeta().plays) {
    setStatus('Positioned. Lower the claw when you are ready.');
  }
  renderClaw();
}

function finishGrab(index) {
  const meta = readMeta();
  if (!meta.plays || !prizes[index]) {
    busy = false;
    lowered = false;
    clawY = 5;
    renderClaw();
    renderControls();
    return;
  }

  meta.plays -= 1;
  saveMeta(meta);
  const prize = PRIZES[index];
  prizes[index].classList.add('claimed');
  grabbed.textContent = prize[0];
  grabbed.setAttribute('aria-label', `${prize[1]} prize won`);
  grabbed.classList.add('show');

  const earned = window.PixelParty ? window.PixelParty.awardPoints(prize[2], 'Claw Machine prize') : prize[2];
  busy = false;
  lowered = false;
  clawY = 5;
  statusText = '';
  renderClaw();
  renderControls();
  setStatus(`${prize[1]} is yours. You earned ${earned} points${meta.plays ? ` and have ${meta.plays} plays left.` : '.'}`);

  if (!availableIndexes().length) {
    buildPrizes();
  }
}

function play() {
  const meta = readMeta();
  if (busy) return;
  if (!meta.plays) {
    setStatus('Finish a task on the board before using the claw.');
    return;
  }
  if (!lowered) {
    setStatus('Lower the claw before you grab a prize.');
    return;
  }

  const index = nearestPrizeIndex();
  if (index === null) {
    buildPrizes();
  }
  const targetIndex = index === null ? nearestPrizeIndex() : index;
  busy = true;
  grabbed.classList.remove('show');
  setStatus('The claw is closing around the nearest prize…');
  renderControls();
  clawY = 260;
  renderClaw();

  window.setTimeout(() => {
    setStatus('Prize caught. Bringing it back up…');
    clawY = 60;
    renderClaw();
    window.setTimeout(() => finishGrab(targetIndex), 700);
  }, 900);
}

moveLeft.addEventListener('click', () => move(-8));
moveRight.addEventListener('click', () => move(8));
lower.addEventListener('click', () => {
  if (busy) return;
  if (!readMeta().plays) {
    setStatus('Finish a task to earn your first play.');
    return;
  }
  lowered = !lowered;
  clawY = lowered ? 260 : 5;
  setStatus(lowered ? 'The claw is down. Press GRAB to catch the nearest prize.' : 'The claw is raised. Move to another prize or lower it again.');
  renderClaw();
  renderControls();
});
grab.addEventListener('click', play);

document.addEventListener('keydown', (event) => {
  if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') { event.preventDefault(); move(-8); }
  if (key === 'arrowright' || key === 'd') { event.preventDefault(); move(8); }
  if (key === 'arrowdown' || key === 's') { event.preventDefault(); lower.click(); }
  if (key === ' ' || key === 'x') { event.preventDefault(); play(); }
});

buildPrizes();
renderClaw();
renderControls();
