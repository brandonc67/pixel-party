(function () {
  const KEY = 'pixelPartyProfile';
  const defaults = { points: 0, purchases: [], theme: 'classic', badge: 'B', multiplier: 1 };
  const read = () => { try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (_) { return { ...defaults }; } };
  const write = profile => localStorage.setItem(KEY, JSON.stringify(profile));
  function renderWallet() { const wallet = document.querySelector('#party-wallet'); if (wallet) wallet.textContent = `◈ ${read().points} pts`; }
  function applyProfile() { const profile = read(); document.body.dataset.partyTheme = profile.theme; document.body.dataset.partyBadge = profile.badge; document.querySelectorAll('[data-party-points]').forEach(el => { el.textContent = `${profile.points} pts`; }); document.querySelectorAll('[data-party-badge]').forEach(el => { el.textContent = profile.badge; }); renderWallet(); }
  function awardPoints(baseAmount, label = 'Game reward') { const profile = read(); const earned = Math.max(1, Math.round(baseAmount * profile.multiplier)); profile.points += earned; write(profile); renderWallet(); window.dispatchEvent(new CustomEvent('pixelparty:points', { detail: { earned, label, total: profile.points } })); return earned; }
  function has(id) { return read().purchases.includes(id); }
  function buy(item) { const profile = read(); if (profile.purchases.includes(item.id) || profile.points < item.cost) return false; profile.points -= item.cost; profile.purchases.push(item.id); if (item.theme) profile.theme = item.theme; if (item.badge) profile.badge = item.badge; if (item.multiplier) profile.multiplier = item.multiplier; write(profile); applyProfile(); return true; }
  window.PixelParty = { read, write, awardPoints, has, buy, applyProfile, renderWallet };
  document.addEventListener('DOMContentLoaded', () => { const shopHref = location.pathname.includes('/games/') ? '../../shop.html' : 'shop.html'; const wallet = document.createElement('a'); wallet.id = 'party-wallet'; wallet.className = 'party-wallet'; wallet.href = shopHref; wallet.textContent = `◈ ${read().points} pts`; document.body.append(wallet); applyProfile(); });
})();
