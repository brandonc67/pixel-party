const TASK_KEY = 'pixelPartyTasks';
const TASK_META = 'pixelPartyTaskMeta';
const STREAK_KEY = 'pixelPartyTaskStreak';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const offsetDay = (amount) => {
  const d = new Date();
  d.setDate(d.getDate() + amount);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (_) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
};

const readTasks = () => readJson(TASK_KEY, []);
const writeTasks = (value) => writeJson(TASK_KEY, value);
const readMeta = () => {
  const saved = readJson(TASK_META, {});
  return {
    date: saved.date || todayKey(),
    completed: Math.max(0, Number(saved.completed) || 0),
    plays: Math.max(0, Number(saved.plays) || 0),
    dailyBonus: Boolean(saved.dailyBonus)
  };
};
const writeMeta = (value) => writeJson(TASK_META, value);

let tasks = readTasks();
let meta = readMeta();
let streak = readJson(STREAK_KEY, { count: 0, lastDay: null });
let flashMessage = '';

if (meta.date !== todayKey()) {
  // Plays are earned currency, so they carry over. Only the daily board payout resets.
  meta = { ...meta, date: todayKey(), completed: 0, dailyBonus: false };
  tasks = tasks.map((task) => ({ ...task, done: false }));
  writeMeta(meta);
  writeTasks(tasks);
}

const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty-tasks');
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const progress = document.querySelector('#progress-count');
const progressBar = document.querySelector('#progress-bar');
const status = document.querySelector('#task-status');
const completedCount = document.querySelector('#completed-count');
const playsCount = document.querySelector('#plays-count');
const dailyBonus = document.querySelector('#daily-bonus');

const retentionStyle = document.createElement('style');
retentionStyle.textContent = `
  .retention-strip{display:flex;align-items:center;gap:14px;margin:0 0 22px;padding:16px 18px;border:1px solid rgba(124,244,196,.32);border-radius:18px;background:linear-gradient(110deg,rgba(29,66,82,.9),rgba(25,38,65,.92));box-shadow:0 14px 28px rgba(0,0,0,.18)}
  .retention-mark{display:grid;place-items:center;width:40px;height:40px;border:1px solid #8ff5ca;border-radius:50%;color:#8ff5ca;font-size:.72rem;font-weight:800;letter-spacing:.08em}
  .retention-copy{display:grid;gap:3px;min-width:145px}.retention-copy .tiny-label{font-size:.68rem;letter-spacing:.16em;color:#8ff5ca;font-weight:800}.retention-copy strong{font-size:1.18rem;color:#fff}
  .retention-strip p{margin:0;color:#c9d8e8;flex:1;font-size:.92rem}.retention-next{padding-left:16px;border-left:1px solid rgba(255,255,255,.16);color:#9db2c7;font-size:.68rem;letter-spacing:.1em;line-height:1.45}.retention-next b{color:#ffd477;font-size:.8rem;letter-spacing:0}
  @media(max-width:650px){.retention-strip{align-items:flex-start;flex-wrap:wrap}.retention-strip p{flex-basis:calc(100% - 58px)}.retention-next{width:100%;border-left:0;border-top:1px solid rgba(255,255,255,.16);padding:12px 0 0 58px}}
`;
document.head.append(retentionStyle);

const taskLayout = document.querySelector('.task-layout');
if (taskLayout) {
  const strip = document.createElement('section');
  strip.className = 'retention-strip';
  strip.innerHTML = '<span class="retention-mark" aria-hidden="true">RUN</span><div class="retention-copy"><span class="tiny-label">COMPLETION STREAK</span><strong id="task-streak-count">0 days</strong></div><p id="task-streak-message">Complete one task today to start your streak.</p><span class="retention-next">FIRST TASK BONUS<br><b>+20 pts +1 play</b></span>';
  taskLayout.before(strip);
}

function currentStreak() {
  if (!streak.lastDay || (streak.lastDay !== todayKey() && streak.lastDay !== offsetDay(-1))) return 0;
  return streak.count;
}

function renderStreak() {
  const count = currentStreak();
  const countElement = document.querySelector('#task-streak-count');
  const messageElement = document.querySelector('#task-streak-message');
  if (!countElement || !messageElement) return;
  countElement.textContent = `${count} ${count === 1 ? 'day' : 'days'}`;
  messageElement.textContent = count
    ? `You are on a ${count}-day run. Finish one task tomorrow to keep it alive.`
    : 'Complete one task today to start your streak.';
}

function updateStreak() {
  const today = todayKey();
  if (streak.lastDay === today) return;
  streak = { count: streak.lastDay === offsetDay(-1) ? streak.count + 1 : 1, lastDay: today };
  writeJson(STREAK_KEY, streak);
}

function render() {
  list.innerHTML = '';
  empty.hidden = tasks.length > 0;
  const done = tasks.filter((task) => task.done).length;
  progress.textContent = `${done} / ${tasks.length}`;
  progressBar.style.width = tasks.length ? `${done / tasks.length * 100}%` : '0%';
  completedCount.textContent = meta.completed;
  playsCount.textContent = meta.plays;
  dailyBonus.textContent = meta.dailyBonus ? 'CLAIMED' : 'READY';
  status.textContent = flashMessage || (tasks.length ? `${done} finished · ${meta.plays} claw ${meta.plays === 1 ? 'play' : 'plays'} ready.` : 'Add a task to start your run.');
  tasks.forEach((task) => {
    const row = document.createElement('div');
    row.className = `task-row${task.done ? ' done' : ''}`;
    row.innerHTML = `<button class="task-check" type="button" aria-label="${task.done ? 'Completed' : 'Mark'} ${task.text} ${task.done ? '' : 'done'}" ${task.done ? 'disabled' : ''}>${task.done ? '✓' : ''}</button><span class="task-text"></span><div class="task-actions"><button class="edit-task" type="button" aria-label="Edit ${task.text}">EDIT</button><button class="delete-task" type="button" aria-label="Delete ${task.text}">×</button></div>`;
    row.querySelector('.task-text').textContent = task.text;
    row.querySelector('.task-check').onclick = () => toggleTask(task.id);
    row.querySelector('.edit-task').onclick = () => editTask(task.id);
    row.querySelector('.delete-task').onclick = () => deleteTask(task.id);
    list.append(row);
  });
  renderStreak();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task || task.done) return;
  task.done = true;
  updateStreak();
  meta.completed++;
  meta.plays++;
  let earned = 10;
  if (!meta.dailyBonus) { meta.dailyBonus = true; meta.plays++; earned += 20; }
  if (window.PixelParty) window.PixelParty.awardPoints(earned, 'Completed task');
  writeTasks(tasks);
  writeMeta(meta);
  flashMessage = `Quest complete. You earned ${earned} points and a claw play.`;
  render();
}

function editTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  const next = prompt('Edit your task:', task.text);
  if (next && next.trim()) {
    task.text = next.trim();
    writeTasks(tasks);
    flashMessage = 'Task updated.';
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  writeTasks(tasks);
  flashMessage = 'Task removed from today\'s board.';
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, done: false });
  input.value = '';
  flashMessage = 'Task added. Check it off when it is complete.';
  writeTasks(tasks);
  render();
  input.focus();
});

render();
