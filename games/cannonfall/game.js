const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.getElementById('score'), credits: document.getElementById('credits'), wave: document.getElementById('wave'),
  integrity: document.getElementById('integrity'), threat: document.getElementById('threat-label'), feed: document.getElementById('feed'),
  waveBanner: document.getElementById('wave-banner'), gameOver: document.getElementById('game-over'), finalWave: document.getElementById('final-wave'),
  finalScore: document.getElementById('final-score'), finalCredits: document.getElementById('final-credits'), cannonButton: document.getElementById('cannon-button'), chargeValue: document.getElementById('charge-value'),
  chargeBar: document.getElementById('charge-bar'), weaponName: document.getElementById('weapon-name'), level: document.getElementById('level-label'),
  damageBar: document.getElementById('damage-bar'), rofBar: document.getElementById('rof-bar'), spreadBar: document.getElementById('spread-bar'),
  damagePrice: document.getElementById('damage-price'), ratePrice: document.getElementById('rate-price'), spreadPrice: document.getElementById('spread-price')
};

const keys = {};
const pointer = { x: W / 2, y: H / 2, inside: false, down: false };
const state = {
  score: 0, credits: 120, wave: 1, integrity: 100, kills: 0, cannon: 0, running: true,
  waveKills: 0, waveTarget: 7, spawnTimer: 0, nextWaveTimer: 0, shake: 0, lastTime: 0, feedTimer: 0,
  upgrades: { damage: 0, rate: 0, spread: 0 }, prices: { damage: 50, rate: 70, spread: 120 },
};
const player = { x: W / 2, y: H - 54, w: 42, h: 26, speed: 390, cooldown: 0, muzzle: 0 };
const bullets = [], enemies = [], particles = [], floaters = [], stars = [], shockwaves = [];

for (let i = 0; i < 100; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, speed: Math.random() * 16 + 4, alpha: Math.random() * .6 + .15 });

function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }
function formatMoney(value) { return `$${Math.max(0, Math.floor(value))}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function addFeed(text) {
  const p = document.createElement('p'); p.textContent = `> ${text}`; ui.feed.prepend(p);
  while (ui.feed.children.length > 3) ui.feed.lastElementChild.remove();
}
function burst(x, y, color, count = 10, speed = 100) {
  for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2; const s = Math.random() * speed + speed * .3; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .7), max: .7, size: rand(1, 3), color }); }
}
function floater(text, x, y, color = '#ffffff') { floaters.push({ text, x, y, color, life: 1 }); }

function updateUI() {
  ui.score.textContent = formatScore(state.score); ui.credits.textContent = formatMoney(state.credits); ui.wave.textContent = String(state.wave).padStart(2, '0');
  ui.integrity.textContent = `${Math.ceil(state.integrity)}%`; ui.integrity.style.color = state.integrity < 35 ? '#ff5cba' : '';
  const danger = enemies.length + (state.wave > 3 ? 1 : 0);
  ui.threat.textContent = `THREAT: ${danger > 8 ? 'CRITICAL' : danger > 3 ? 'ELEVATED' : 'LOW'}`;
  ui.threat.style.color = danger > 8 ? '#ff5cba' : danger > 3 ? '#ffc857' : '#77f2b0';
  ui.chargeValue.textContent = `${Math.floor(state.cannon)}%`; ui.chargeBar.style.width = `${state.cannon}%`; ui.cannonButton.disabled = state.cannon < 100 || !state.running;
  const d = 27 + state.upgrades.damage * 12, r = 30 + state.upgrades.rate * 13, s = 20 + state.upgrades.spread * 25;
  ui.damageBar.style.width = `${Math.min(100, d)}%`; ui.rofBar.style.width = `${Math.min(100, r)}%`; ui.spreadBar.style.width = `${Math.min(100, s)}%`;
  ui.level.textContent = `LVL ${1 + state.upgrades.damage + state.upgrades.rate + state.upgrades.spread}`;
  ui.weaponName.textContent = state.upgrades.spread >= 6 ? 'SEPTUPLE ARRAY' : state.upgrades.spread >= 4 ? 'QUINT ARRAY' : state.upgrades.spread >= 3 ? 'QUAD ARRAY' : state.upgrades.spread >= 2 ? 'TRIPLE ARRAY' : state.upgrades.damage >= 2 ? 'PLASMA RIFLE' : 'PULSE RIFLE';
  ui.damagePrice.textContent = formatMoney(state.prices.damage); ui.ratePrice.textContent = formatMoney(state.prices.rate); ui.spreadPrice.textContent = formatMoney(state.prices.spread);
  document.querySelectorAll('.shop-item').forEach(button => { const type = button.dataset.upgrade; button.disabled = state.credits < state.prices[type] || !state.running; });
}

function newWave() {
  state.waveKills = 0; state.waveTarget = 5 + state.wave * 2; state.spawnTimer = .2; state.nextWaveTimer = 0;
  ui.waveBanner.querySelector('strong').textContent = `WAVE ${String(state.wave).padStart(2, '0')}`;
  ui.waveBanner.classList.remove('show'); void ui.waveBanner.offsetWidth; ui.waveBanner.classList.add('show');
  addFeed(`Wave ${state.wave} inbound. Keep firing.`); burst(W / 2, 85, '#66edff', 16, 110);
}
function spawnEnemy() {
  const roll = Math.random();
  let type = roll < Math.min(.15 + state.wave * .015, .3) ? 'tank' : roll < .44 ? 'charger' : 'drone';
  const specs = {
    drone: { r: 15, hp: 1, speed: rand(43, 64) + state.wave * 2, color: '#ff5cba', value: 12, damage: 8 },
    charger: { r: 12, hp: 1, speed: rand(70, 93) + state.wave * 3, color: '#ffc857', value: 18, damage: 12 },
    tank: { r: 23, hp: 3 + Math.floor(state.wave / 4), speed: rand(25, 35) + state.wave, color: '#9f7bff', value: 35, damage: 22 }
  }[type];
  enemies.push({ x: rand(specs.r + 8, W - specs.r - 8), y: -specs.r - 10, type, phase: Math.random() * 8, ...specs, maxHp: specs.hp, hit: 0 });
}

function fire() {
  if (!state.running || player.cooldown > 0) return;
  const spread = state.upgrades.spread;
  const count = Math.min(7, 1 + spread);
  const damage = 1 + state.upgrades.damage;
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * 0.13;
    bullets.push({ x: player.x + (i - (count - 1) / 2) * 10, y: player.y - 19, vx: Math.sin(offset) * 310, vy: -Math.cos(offset) * 550, r: 4, damage, life: 1.7 });
  }
  player.cooldown = Math.max(.035, .24 - state.upgrades.rate * .045); player.muzzle = .11; burst(player.x, player.y - 17, '#66edff', 3, 45);
}
function fireCannon() {
  if (state.cannon < 100 || !state.running) return;
  state.cannon = 0; state.shake = 25; shockwaves.push({ x: player.x, y: player.y, radius: 0, life: 1 }); burst(player.x, player.y - 50, '#ff5cba', 100, 360);
  let destroyed = 0;
  enemies.splice(0).forEach(enemy => { destroyed++; state.score += enemy.value * 2; state.credits += enemy.value; state.kills++; state.waveKills++; floater(`+${enemy.value * 2}`, enemy.x, enemy.y, '#ffb3e0'); burst(enemy.x, enemy.y, enemy.color, 22, 190); });
  addFeed(`ORBITAL CANNON fired. ${destroyed} targets erased.`);
  updateUI();
}

function hitEnemy(enemy, bullet) {
  enemy.hp -= bullet.damage; enemy.hit = .12; burst(bullet.x, bullet.y, enemy.color, 4, 55);
  if (enemy.hp <= 0) {
    state.score += enemy.value; state.credits += enemy.value; state.kills++; state.waveKills++; state.cannon = clamp(state.cannon + (enemy.type === 'tank' ? 18 : 11), 0, 100);
    floater(`+$${enemy.value}`, enemy.x, enemy.y - enemy.r, '#ffc857'); burst(enemy.x, enemy.y, enemy.color, enemy.type === 'tank' ? 26 : 13, enemy.type === 'tank' ? 200 : 120);
    state.shake = Math.min(7, state.shake + 1.5); enemies.splice(enemies.indexOf(enemy), 1);
  }
}

function update(dt) {
  if (!state.running) return;
  state.feedTimer += dt; if (state.feedTimer > 4) { state.feedTimer = 0; addFeed(`${enemies.length} hostiles in sector. Fire at will.`); }
  const left = keys.a || keys.ArrowLeft, right = keys.d || keys.ArrowRight;
  if (left) player.x -= player.speed * dt; if (right) player.x += player.speed * dt; player.x = clamp(player.x, 30, W - 30);
  if (pointer.down || keys[' ']) fire(); player.cooldown = Math.max(0, player.cooldown - dt); player.muzzle = Math.max(0, player.muzzle - dt); state.shake *= .9;
  if (state.waveKills >= state.waveTarget && enemies.length === 0) { state.nextWaveTimer += dt; if (state.nextWaveTimer > 1.1) { state.wave++; newWave(); } }
  else { state.spawnTimer -= dt; const maxOnScreen = Math.min(5 + state.wave, 13); if (state.waveKills < state.waveTarget && state.spawnTimer <= 0 && enemies.length < maxOnScreen) { spawnEnemy(); state.spawnTimer = Math.max(.28, .88 - state.wave * .035); } }
  for (const bullet of bullets) { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; for (const enemy of enemies.slice()) { if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.r + bullet.r) { hitEnemy(enemy, bullet); bullet.life = -1; break; } } }
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0 || bullets[i].y < -30 || bullets[i].x < -30 || bullets[i].x > W + 30) bullets.splice(i, 1);
  for (const enemy of enemies) { enemy.y += enemy.speed * dt; enemy.x += Math.sin(performance.now() / 700 + enemy.phase) * (enemy.type === 'charger' ? 28 : 10) * dt; enemy.hit = Math.max(0, enemy.hit - dt); if (enemy.y > H - 28) { state.integrity -= enemy.damage; state.shake = 10; burst(enemy.x, H - 32, '#ff5cba', 20, 130); enemies.splice(enemies.indexOf(enemy), 1); addFeed(`Impact! Base integrity -${enemy.damage}%.`); } }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.life -= dt; }
  for (const f of floaters) { f.y -= 28 * dt; f.life -= dt; } for (const s of stars) { s.y += s.speed * dt; if (s.y > H) s.y = 0; } for (const shock of shockwaves) { shock.radius += 900 * dt; shock.life -= dt; }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1); for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1); for (let i = shockwaves.length - 1; i >= 0; i--) if (shockwaves[i].life <= 0) shockwaves.splice(i, 1);
  if (state.integrity <= 0) endGame(); updateUI();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, '#0a1220'); gradient.addColorStop(1, '#070b14'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(80,128,175,.12)'; ctx.lineWidth = 1; const offset = (performance.now() / 35) % 48; for (let x = -48; x < W + 48; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = offset - 48; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (const s of stars) { ctx.globalAlpha = s.alpha; ctx.fillStyle = '#d8efff'; ctx.fillRect(s.x, s.y, s.r, s.r); } ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(102,237,255,.05)'; ctx.fillRect(0, H - 75, W, 75); ctx.strokeStyle = 'rgba(102,237,255,.25)'; ctx.beginPath(); ctx.moveTo(0, H - 28); ctx.lineTo(W, H - 28); ctx.stroke();
}
function drawPlayer() {
  ctx.save(); ctx.translate(player.x, player.y); ctx.shadowBlur = 17; ctx.shadowColor = '#66edff'; ctx.fillStyle = '#66edff'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(19, 19); ctx.lineTo(0, 13); ctx.lineTo(-19, 19); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#13263c'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#eff4ff'; ctx.fillRect(-2, -26, 4, 8); if (player.muzzle > 0) { ctx.fillStyle = '#fff2ba'; ctx.shadowBlur = 24; ctx.shadowColor = '#ffc857'; ctx.beginPath(); ctx.arc(0, -30, player.muzzle * 65, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
}
function drawEnemy(enemy) {
  ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.globalAlpha = enemy.hit > 0 ? .55 : 1; ctx.shadowBlur = 15; ctx.shadowColor = enemy.color; ctx.strokeStyle = enemy.color; ctx.fillStyle = enemy.type === 'tank' ? '#241d46' : '#19162b'; ctx.lineWidth = 2;
  if (enemy.type === 'tank') { ctx.rotate(Math.PI / 4); ctx.fillRect(-enemy.r * .7, -enemy.r * .7, enemy.r * 1.4, enemy.r * 1.4); ctx.strokeRect(-enemy.r * .7, -enemy.r * .7, enemy.r * 1.4, enemy.r * 1.4); } else if (enemy.type === 'charger') { ctx.beginPath(); ctx.moveTo(0, -enemy.r); ctx.lineTo(enemy.r, enemy.r); ctx.lineTo(0, enemy.r * .45); ctx.lineTo(-enemy.r, enemy.r); ctx.closePath(); ctx.fill(); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(0, 0, enemy.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-enemy.r * .9, 0); ctx.lineTo(enemy.r * .9, 0); ctx.moveTo(0, -enemy.r * .9); ctx.lineTo(0, enemy.r * .9); ctx.stroke(); }
  ctx.shadowBlur = 0; ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill(); if (enemy.hp < enemy.maxHp) { ctx.fillStyle = '#242a3b'; ctx.fillRect(-enemy.r, -enemy.r - 9, enemy.r * 2, 3); ctx.fillStyle = enemy.color; ctx.fillRect(-enemy.r, -enemy.r - 9, enemy.r * 2 * enemy.hp / enemy.maxHp, 3); } ctx.restore();
}
function draw() {
  ctx.save(); if (state.shake > .2) ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake)); drawBackground();
  for (const bullet of bullets) { ctx.save(); ctx.strokeStyle = '#b9f9ff'; ctx.shadowBlur = 12; ctx.shadowColor = '#66edff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(bullet.x - bullet.vx * .035, bullet.y - bullet.vy * .035); ctx.stroke(); ctx.restore(); }
  for (const enemy of enemies) drawEnemy(enemy); drawPlayer(); for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); } ctx.globalAlpha = 1;
  for (const f of floaters) { ctx.globalAlpha = f.life; ctx.fillStyle = f.color; ctx.font = '700 12px Space Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y); } ctx.globalAlpha = 1;
  for (const s of shockwaves) { ctx.globalAlpha = s.life; ctx.strokeStyle = '#ff5cba'; ctx.lineWidth = 5; ctx.shadowBlur = 30; ctx.shadowColor = '#ff5cba'; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
}
function endGame() { state.running = false; ui.finalWave.textContent = state.wave; ui.finalScore.textContent = formatScore(state.score); ui.finalCredits.textContent = formatMoney(state.credits); ui.gameOver.classList.remove('hidden'); addFeed('Defense network offline.'); if (window.PixelParty) PixelParty.awardPoints(Math.max(5, state.wave * 5), 'Cannonfall'); updateUI(); }
function restart() { state.score = 0; state.credits = 120; state.wave = 1; state.integrity = 100; state.kills = 0; state.cannon = 0; state.running = true; state.waveKills = 0; state.upgrades = { damage: 0, rate: 0, spread: 0 }; state.prices = { damage: 50, rate: 70, spread: 120 }; bullets.length = 0; enemies.length = 0; particles.length = 0; floaters.length = 0; shockwaves.length = 0; player.x = W / 2; ui.gameOver.classList.add('hidden'); newWave(); updateUI(); }

function canvasPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height }; }
canvas.addEventListener('pointermove', event => { const p = canvasPoint(event); pointer.x = p.x; pointer.y = p.y; pointer.inside = true; });
canvas.addEventListener('pointerenter', () => pointer.inside = true); canvas.addEventListener('pointerleave', () => { pointer.inside = false; pointer.down = false; });
canvas.addEventListener('pointerdown', event => { pointer.down = true; canvas.setPointerCapture(event.pointerId); fire(); }); canvas.addEventListener('pointerup', () => pointer.down = false);
window.addEventListener('keydown', event => { keys[event.key] = true; if (event.key.toLowerCase() === 'e') fireCannon(); if (event.key === ' ') event.preventDefault(); }); window.addEventListener('keyup', event => keys[event.key] = false);
document.querySelectorAll('.shop-item').forEach(button => button.addEventListener('click', () => { const type = button.dataset.upgrade; if (state.credits < state.prices[type]) return; state.credits -= state.prices[type]; state.upgrades[type]++; state.prices[type] = Math.ceil(state.prices[type] * 1.75 / 10) * 10; addFeed(`${type.toUpperCase()} upgrade installed. Level ${state.upgrades[type]}.`); burst(player.x, player.y, '#66edff', 18, 100); updateUI(); }));
ui.cannonButton.addEventListener('click', fireCannon); document.getElementById('restart-button').addEventListener('click', restart);
function loop(time) { const dt = Math.min(.033, (time - state.lastTime) / 1000 || 0); state.lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
newWave(); updateUI(); requestAnimationFrame(loop);
