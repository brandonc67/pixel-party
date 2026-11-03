const search = document.querySelector('#game-search');
const cards = [...document.querySelectorAll('.game-card')];
const empty = document.querySelector('#empty-state');

const storageGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
const today = new Date();
const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayKey = localDateKey(today);
const previousDay = new Date(today);
previousDay.setDate(today.getDate() - 1);
const yesterdayKey = localDateKey(previousDay);
const quests = [
  ['DAILY QUEST · +100 XP', 'Try something new', 'Play Pixel Dodge or Flip Match and add a fresh badge to your shelf.'],
  ['DAILY QUEST · +100 XP', 'Chase a high score', 'Play any game and try to beat your best run before you leave.'],
  ['DAILY QUEST · +100 XP', 'Do one more round', 'Pick the game you played last time and see if you can improve.'],
  ['DAILY QUEST · +100 XP', 'Mix up your loadout', 'Try a game you have not opened yet. Variety earns the points today.']
];

function updateReturnLoop() {
  const savedLastVisit = storageGet('gameBreakLastVisit');
  let streak = Number(storageGet('gameBreakStreak') || 0);
  if (savedLastVisit !== dayKey) {
    streak = savedLastVisit === yesterdayKey ? streak + 1 : 1;
    storageSet('gameBreakStreak', streak);
    storageSet('gameBreakLastVisit', dayKey);
  }

  const streakCount = document.querySelector('#streak-count');
  const questTitle = document.querySelector('#quest-title');
  const questCopy = document.querySelector('#quest-copy');
  const questKicker = document.querySelector('#quest-kicker');
  const claimButton = document.querySelector('#claim-quest');
  const questStatus = document.querySelector('#quest-status');
  const quest = quests[today.getDay() % quests.length];
  const claimed = storageGet('gameBreakQuestClaimed') === dayKey;

  if (streakCount) streakCount.textContent = `${streak} day${streak === 1 ? '' : 's'}`;
  if (questKicker) questKicker.textContent = quest[0];
  if (questTitle) questTitle.textContent = quest[1];
  if (questCopy) questCopy.textContent = quest[2];
  if (claimed) {
    claimButton.disabled = true;
    claimButton.textContent = 'XP claimed ✓';
    questStatus.textContent = 'Come back tomorrow for a new quest.';
  }

  claimButton?.addEventListener('click', () => {
    storageSet('gameBreakQuestClaimed', dayKey);
    claimButton.disabled = true;
    claimButton.textContent = 'XP claimed ✓';
    questStatus.textContent = 'Nice. Your streak is still alive tomorrow.';
  });
}

function filterGames() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const haystack = `${card.dataset.title} ${card.dataset.tags}`.toLowerCase();
    const match = !query || haystack.includes(query);
    card.hidden = !match;
    if (match) visible += 1;
  });
  empty.hidden = visible !== 0;
}

search.addEventListener('input', filterGames);
updateReturnLoop();

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    document.body.classList.add('has-navigated');
    window.setTimeout(() => document.body.classList.remove('has-navigated'), 500);
  });
});
