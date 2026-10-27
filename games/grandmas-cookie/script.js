const STORAGE_KEY = 'grandmas-cookie-counter-v1';
const ITEMS = [['Grandma', 'The family recipe begins here.'], ['Mixing Bowl', 'More hands, smoother dough.'], ['Cookie Cart', 'Fresh cookies on every corner.'], ['Brick Oven', 'A hotter oven means bigger batches.'], ['Bakery', 'The neighborhood comes back for seconds.'], ['Cookie Truck', 'Rolling sweetness across town.'], ['Factory', 'Industrial-sized cookie power.'], ['Time Portal', 'Borrow recipes from tomorrow.'], ['Cookie Moon', 'A whole moon made of cookies.'], ['Cookie Galaxy', 'The bakery has become cosmic.']];
const state = { cookies: 0, totalClicks: 0, tiers: Array(ITEMS.length).fill(0), lifetime: 0, lastTick: Date.now() };
const $ = id => document.getElementById(id);
const format = n => n >= 1e6 ? n.toExponential(2).replace('+','') : Math.floor(n).toLocaleString('en-US');
const costFor = tier => Math.pow(10, tier + 1);
const powerFor = tier => Math.pow(10, tier);
const totalPerSecond = () => state.tiers.reduce((sum, amount, tier) => sum + amount * powerFor(tier), 0);

function save() { state.lastTick = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); $('saveStatus').textContent = 'SAVED LOCALLY'; }
function load() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved) Object.assign(state, saved); } catch (_) {}
  if (!Array.isArray(state.tiers)) state.tiers = [state.grandmas || 0, 0, 0, 0, 0];
  while (state.tiers.length < ITEMS.length) state.tiers.push(0);
  const awaySeconds = Math.min(3600, Math.max(0, (Date.now() - state.lastTick) / 1000));
  if (awaySeconds > 2 && totalPerSecond()) state.cookies += awaySeconds * totalPerSecond();
  state.lastTick = Date.now();
}
function log(message) { const row = document.createElement('p'); row.innerHTML = `<span>NOW</span> ${message}`; $('eventLog').prepend(row); while ($('eventLog').children.length > 3) $('eventLog').lastElementChild.remove(); }
function render() {
  $('cookieCount').textContent = format(state.cookies); $('perSecond').textContent = format(totalPerSecond()); $('clickCount').textContent = format(state.totalClicks);
  const level = state.tiers.findLastIndex(amount => amount > 0) + 1; $('grandmaLevel').textContent = `LV ${Math.max(0, level)}`;
  const tierList = $('tierList'); tierList.innerHTML = '';
  state.tiers.forEach((amount, tier) => {
    const cost = costFor(tier); const card = document.createElement('div'); card.className = 'upgrade-card';
    card.innerHTML = `<div class="upgrade-icon">${tier + 1}</div><div class="upgrade-info"><strong>${ITEMS[tier][0]}</strong><span>${ITEMS[tier][1]} · +${format(powerFor(tier))}/sec · owned: ${format(amount)}</span></div><button class="buy-button" data-tier="${tier}" ${state.cookies < cost ? 'disabled' : ''}><span>BUY INFINITE</span><strong>${format(cost)}</strong></button>`;
    tierList.appendChild(card);
  });
  tierList.querySelectorAll('.buy-button').forEach(button => button.addEventListener('click', () => buyTier(Number(button.dataset.tier))));
}
function addCookies(amount, message) { state.cookies += amount; state.lifetime += amount; if (message) log(message); render(); }
function buyTier(tier) { const cost = costFor(tier); if (state.cookies < cost) return; state.cookies -= cost; state.tiers[tier]++; log(`${ITEMS[tier][0]} added another +${format(powerFor(tier))}/sec. There is no limit.`); render(); save(); }
$('cookieButton').addEventListener('click', event => { state.totalClicks++; addCookies(1); const burst = $('clickBurst'); burst.textContent = '+1'; burst.style.left = `${event.offsetX + 30}px`; burst.style.top = `${event.offsetY + 40}px`; burst.classList.remove('show'); void burst.offsetWidth; burst.classList.add('show'); if (state.totalClicks % 10 === 0) { log(`Nice rhythm. ${state.totalClicks.toLocaleString()} manual clicks in the books.`); if (window.PixelParty) PixelParty.awardPoints(1, 'Grandma’s Cookie Counter'); } });
$('resetButton').addEventListener('click', () => { if (!confirm('Reset your bakery and start over?')) return; localStorage.removeItem(STORAGE_KEY); Object.assign(state, {cookies:0,totalClicks:0,tiers:Array(ITEMS.length).fill(0),lifetime:0,lastTick:Date.now()}); $('eventLog').innerHTML = '<p><span>NOW</span> Fresh apron, fresh start.</p>'; render(); });
load(); render();
setInterval(() => { if (totalPerSecond()) addCookies(totalPerSecond()); }, 1000);
setInterval(save, 5000);
