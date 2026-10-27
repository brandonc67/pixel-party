const items = [
  { id: 'neon-theme', cost: 40, icon: '▦', art: 'theme-neon-art', name: 'Neon Grid', description: 'Switches the whole hub to a cool mint-and-purple arcade theme.', theme: 'neon' },
  { id: 'sunset-theme', cost: 40, icon: '☼', art: 'theme-sunset-art', name: 'Sunset Mode', description: 'Turns the hub warm and orange for a different after-school mood.', theme: 'sunset' },
  { id: 'star-badge', cost: 65, icon: '★', art: 'badge-art', name: 'Star Badge', description: 'Changes the player badge on the homepage from B to a gold star.', badge: '★' },
  { id: 'double-points', cost: 100, icon: '×2', art: 'boost-art', name: 'Double Payout', description: 'Doubles future game rewards. The more you play, the faster it pays back.', multiplier: 2 }
];
const grid = document.querySelector('#shop-grid');
const note = document.querySelector('#shop-note');
function renderShop() { const profile = PixelParty.read(); grid.innerHTML = ''; items.forEach(item => { const owned = profile.purchases.includes(item.id); const card = document.createElement('article'); card.className = 'shop-item'; card.innerHTML = `<div class="item-art ${item.art}">${item.icon}</div><h2>${item.name}</h2><p>${item.description}</p><button class="shop-buy" ${owned || profile.points < item.cost ? 'disabled' : ''} data-id="${item.id}">${owned ? 'OWNED ✓' : `BUY · ${item.cost} pts`}</button>`; grid.append(card); }); grid.querySelectorAll('.shop-buy').forEach(button => button.addEventListener('click', () => { const item = items.find(entry => entry.id === button.dataset.id); if (PixelParty.buy(item)) { note.textContent = `${item.name} equipped. Head back to the games to see it.`; renderShop(); } })); }
renderShop();
