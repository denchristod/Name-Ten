let CATEGORIES = [];
let ALL_QUESTIONS = [];

async function loadData() {
  const res = await fetch('data.json');
  const data = await res.json();

  CATEGORIES = data.categories;
  ALL_QUESTIONS = data.questions;

  state.enabledCats = new Set(
  CATEGORIES
    .filter(c => c.default)
    .map(c => c.id)
);

  buildCatGrid(); // IMPORTANT: rebuild UI after loading data
}

const TEAM_COLORS = [
  '#7aa98a', // soft green
  '#7fa7d9', // soft blue
  '#7859ceff', // soft purple
  '#e0a36d', // soft orange
  '#d97a7a', // soft red
  '#a8a8a8'  // soft gray
];

let state = {
  rounds: 10,
  enabledCats: new Set(CATEGORIES.filter(c => c.default !== false).map(c => c.id)),
  team1: 'Team 1', team2: 'Team 2',
  team1Color: '#5f8f6b',
  team2Color: '#7aa98a',
  score1: 0, score2: 0,
  currentRound: 1,
  currentTeam: 1,
  timerInterval: null,
  timeLeft: 90,
  timerRunning: false,
  timerDone: false,
  usedQs: new Set(),
  currentItems: [],
  phase: 'handoff',
  handoffStep: 'pre',
  timePerRound: 90
};

let audioUnlocked = false;
let musicMuted = false;

const bgMusic = document.getElementById("bgMusic");
const clickSound = document.getElementById("clickSound");
const tickSound = document.getElementById("tickSound");
const alarmSound = document.getElementById("alarmSound");
const winSound = document.getElementById("winSound");

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  const sounds = [bgMusic, clickSound, tickSound, alarmSound, winSound];

  sounds.forEach(s => {
    if (!s) return;

    // preload ONLY — no play()
    try {
      s.preload = "auto";
      s.load();
    } catch {}
  });

  if (!musicMuted) startMusic();
}

document.addEventListener("pointerdown", unlockAudioOnce, { once: true })

tickSound.loop = false;
tickSound.preload = "auto";

function startMusic() {
  if (!audioUnlocked || musicMuted) return;

  bgMusic.loop = true;
  bgMusic.volume = 0.4;

  bgMusic.play().catch(() => {});
}

function stopMusic() {
  bgMusic.pause();
}

document.addEventListener('click', () => {
  startMusic();
}, { once: true });

function toggleMusic() {
  musicMuted = !musicMuted;

  const btn = document.getElementById("muteBtn");

  if (musicMuted) {
    stopMusic();
    btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } else {
    startMusic();
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

function playSound(id) {
  if (!audioUnlocked) return;

  const sound = document.getElementById(id);
  if (!sound) return;

  try {
    sound.pause();         
    sound.currentTime = 0;

    const p = sound.play();
    if (p) p.catch(() => {});
  } catch {}
}

function playClick() {
  if (!audioUnlocked) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

function fadeOutMusic(duration = 1000) {
  const music = document.getElementById('bgMusic');

  let volume = music.volume;
  const step = volume / (duration / 50);

  const fade = setInterval(() => {
    volume -= step;

    if (volume <= 0) {
      volume = 0;
      music.pause();
      clearInterval(fade);
    }

    music.volume = volume;
  }, 50);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectRounds(n, el) {
  state.rounds = n;
  document.querySelectorAll('.round-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function selectTime(n, el) {
  state.timePerRound = n;
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function setupColorPickers() {
  const pickers = [
    { id: 'team1colors', team: 1 },
    { id: 'team2colors', team: 2 }
  ];

  pickers.forEach(p => {
    const container = document.getElementById(p.id);

    const buttons = container.querySelectorAll('.color-btn');

    // 🔧 ensure state matches the selected button in HTML
    buttons.forEach(btn => {
      if (btn.classList.contains('selected')) {
        if (p.team === 1) state.team1Color = btn.dataset.color;
        else state.team2Color = btn.dataset.color;
      }
    });

    buttons.forEach(btn => {
      btn.onclick = () => {
        const chosenColor = btn.dataset.color;

        const otherColor = p.team === 1 ? state.team2Color : state.team1Color;

        // block duplicates
        if (chosenColor === otherColor) return;

        // remove selected in this picker
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // update state
        if (p.team === 1) state.team1Color = chosenColor;
        else state.team2Color = chosenColor;

        updateColorAvailability();
      };
    });
  });

  updateColorAvailability();
}

function updateColorAvailability() {
  // Team 1 picker
  document.querySelectorAll('#team1colors .color-btn').forEach(btn => {
    const isOtherTeamsColor = btn.dataset.color === state.team2Color;

    btn.disabled = isOtherTeamsColor;
    btn.style.opacity = isOtherTeamsColor ? 0.3 : 1;
  });

  // Team 2 picker
  document.querySelectorAll('#team2colors .color-btn').forEach(btn => {
    const isOtherTeamsColor = btn.dataset.color === state.team1Color;

    btn.disabled = isOtherTeamsColor;
    btn.style.opacity = isOtherTeamsColor ? 0.3 : 1;
  });
}

function buildCatGrid() {
  const g = document.getElementById('catGrid');
  g.innerHTML = '';

  CATEGORIES.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';

    const isOn = state.enabledCats.has(c.id);

    if (isOn) btn.classList.add('on');

    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="cat-icon">${c.icon}</span>${c.label}`;

    btn.onclick = () => {
      if (state.enabledCats.has(c.id)) {
        state.enabledCats.delete(c.id);
        btn.classList.remove('on');
      } else {
        state.enabledCats.add(c.id);
        btn.classList.add('on');
      }
    };

    g.appendChild(btn);
  });
}

function startGame() {
  fadeOutMusic(1200);
  state.team1 = document.getElementById('team1name').value || 'Team 1';
  state.team2 = document.getElementById('team2name').value || 'Team 2';
  if(state.enabledCats.size === 0) { alert('Please enable at least one category!'); return; }
  state.score1 = 0; state.score2 = 0;
  state.currentRound = 1; state.currentTeam = 1;
  state.usedQs = new Set();
  showHandoff('start');
}

function showHandoff(type) {
  state.phase = 'handoff';
  const t1 = state.team1, t2 = state.team2;
  const playing = state.currentTeam === 1 ? t1 : t2;
  const holding = state.currentTeam === 1 ? t2 : t1;

  if(type === 'start') {
    document.getElementById('handoffTitle').textContent = 'Game Start!';
    document.getElementById('handoffSub').innerHTML = `<strong style="color:var(--text)">${playing}</strong> goes first.<br><span style="color:var(--muted)">Round 1 of ${state.rounds}</span>`;
    document.getElementById('handoffBtn').textContent = `${playing} is Ready!`;
  } else if(type === 'pass') {
    document.getElementById('handoffTitle').textContent = 'Pass the Phone!';
    document.getElementById('handoffSub').innerHTML = `Hand the phone to <strong style="color:var(--text)">${holding}</strong>.<br><span style="color:var(--muted)">${playing} — no peeking! 👀</span>`;
    document.getElementById('handoffBtn').textContent = `${playing} is Ready!`;
  } else if(type === 'end') {
    document.getElementById('handoffTitle').textContent = 'Game Over!';
    document.getElementById('handoffSub').textContent = 'Tallying up the scores...';
    document.getElementById('handoffBtn').textContent = 'See Results!';
  }
  updateScoreDisplay();
  showScreen('handoffScreen');
}

function handoffContinue() {
  if(state.phase !== 'handoff') return;

  if(document.getElementById('handoffTitle').textContent === 'Game Over!') {
    showResults();
    return;
  }

  showRoundIntro(loadTurn);
}

function pickQuestion() {
  const pool = ALL_QUESTIONS.filter(q => state.enabledCats.has(q.cat) && !state.usedQs.has(q.q));
  if(pool.length === 0) { state.usedQs = new Set(); return pickQuestion(); }
  const q = pool[Math.floor(Math.random() * pool.length)];
  state.usedQs.add(q.q);
  return q;
}

function loadTurn() {
    console.log("LOAD TURN CALLED");
  clearInterval(state.timerInterval);
  state.timeLeft = state.timePerRound;
  state.timerRunning = false;
  state.timerDone = false;

  const q = pickQuestion();
  state.currentItems = q.items.map(it => ({...it, named: false}));

  updateScoreDisplay();
  document.getElementById('roundDisplay').textContent = `${state.currentRound} / ${state.rounds}`;

  const t = state.currentTeam === 1 ? state.team1 : state.team2;
  const banner = document.getElementById('turnBanner');
  banner.className = 'turn-banner ' + (state.currentTeam === 1 ? 'team1' : 'team2');
  document.getElementById('turnLabel').textContent = 'Now Playing';
  document.getElementById('turnName').textContent = t;

  const catObj = CATEGORIES.find(c => c.id === q.cat);
  document.getElementById('questionCat').textContent = (catObj ? catObj.icon + ' ' : '') + (catObj ? catObj.label.toUpperCase() : q.cat.toUpperCase());
  document.getElementById('questionText').textContent = q.q;

  renderItems(false);
  updateTimer(state.timePerRound);

  document.getElementById('startTimerBtn').style.display = '';
  document.getElementById('timerBtns').style.display = 'flex';
  document.getElementById('doneBtn').style.display = 'none';
  document.getElementById('confirmBtn').style.display = 'none';
  document.getElementById('timerRow').style.display = 'flex';

  showScreen('gameScreen');

  banner.style.borderColor = state.currentTeam === 1 ? state.team1Color : state.team2Color;
  banner.style.background = (state.currentTeam === 1 ? state.team1Color : state.team2Color) + '20';
}

function renderItems(interactive) {
  const list = document.getElementById('itemsList');
  list.innerHTML = '';
  state.currentItems.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row' + (item.named ? ' named' : '');
    row.innerHTML = `
      <div class="item-check"><svg class="item-check-icon" width="12" height="12" viewBox="0 0 12 12"><polyline points="1.5,6 5,9.5 10.5,2.5" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="item-name">${item.n}</div>
      <div class="item-pts pts-${item.p}">${item.p}pt${item.p>1?'s':''}</div>
    `;
    if(interactive) {
      row.onclick = () => { item.named = !item.named; renderItems(true); updateAllDoneButton();};
    } else if(state.timerDone) {
      row.onclick = () => { item.named = !item.named; renderItems(true); updateAllDoneButton();};
    } else if(state.timerRunning) {
      row.onclick = () => { item.named = !item.named; renderItems(false); renderItems(true); updateAllDoneButton();};
    }
    list.appendChild(row);
  });
  if(state.timerRunning || state.timerDone) {
    list.querySelectorAll('.item-row').forEach((row, i) => {
      row.onclick = () => { state.currentItems[i].named = !state.currentItems[i].named; renderItems(true); };
    });
  }

  updateAllDoneButton();
}

function updateTimer(secs) {
  const circ = 2 * Math.PI * 26;
  const offset = circ * (1 - secs/state.timePerRound);
  document.getElementById('timerRing').style.strokeDashoffset = offset;
  document.getElementById('timerText').textContent = secs;
  const pct = secs / state.timePerRound * 100;
  document.getElementById('timerBar').style.width = pct + '%';
  const col = pct > 50 ? 'var(--teal)' : pct > 20 ? 'var(--gold)' : 'var(--red)';
  document.getElementById('timerBar').style.background = col;
  document.getElementById('timerRing').style.stroke = col;
}

function startTimer() {
  state.timerRunning = true;
  document.getElementById('timerBtns').style.display = 'none';
  document.getElementById('allDoneBtn').style.display = 'block';
  renderItems(true);
  state.timerInterval = setInterval(() => {
    state.timeLeft--;

if (state.timeLeft === 10) {
  playSound('tickSound'); // plays ONCE
}

updateTimer(state.timeLeft);
    if(state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      if (!state.timerDone) timerEnd();
    }
  }, 1000);

  updateAllDoneButton();
}

function skipTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = 0;
  updateTimer(0);
  timerEnd();
}

function checkAllAnswered() {
  return state.currentItems.every(it => it.named);
}

function updateAllDoneButton() {
  const btn = document.getElementById('allDoneBtn');

  if (state.timerDone || !state.timerRunning) {
    btn.style.display = 'none';
    return;
  }

  if (checkAllAnswered()) {
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

function timerEnd() {
  playSound('alarmSound');
  state.timerRunning = false;
  state.timerDone = true;

  document.getElementById('timerBtns').style.display = 'none';
  document.getElementById('allDoneBtn').style.display = 'none';

  //  remove "review & correct" step entirely
  document.getElementById('doneBtn').style.display = 'none';

  //  go straight to confirm button
  document.getElementById('confirmBtn').style.display = 'block';
  document.getElementById('confirmBtn').textContent = 'Confirm & Pass Phone →';

  renderItems(true);
}

function doneTurn() {
  document.getElementById('doneBtn').style.display = 'none';
  document.getElementById('confirmBtn').style.display = 'block';
  renderItems(true);
}

function confirmTurn() {

  const pts = state.currentItems
    .filter(it => it.named)
    .reduce((s, it) => s + it.p, 0);

  console.log("PTS CALCULATED:", pts);

  if (state.currentTeam === 1) {
    state.score1 += pts;
  } else {
    state.score2 += pts;
  }

  updateScoreDisplay();

  if (state.currentTeam === 1) {
    state.currentTeam = 2;
    showHandoff('pass');
  } else {
    state.currentTeam = 1;

    if (state.currentRound >= state.rounds) {
      showHandoff('end');
    } else {
      state.currentRound++;
      showHandoff('pass');
    }
  }
}

function updateScoreDisplay() {
  document.getElementById('scoreLeftLabel').textContent = state.team1.toUpperCase().slice(0,10);
  document.getElementById('scoreRightLabel').textContent = state.team2.toUpperCase().slice(0,10);

  document.getElementById('scoreLeftVal').textContent = state.score1;
  document.getElementById('scoreRightVal').textContent = state.score2;

  document.getElementById('scoreLeftLabel').style.color = state.team1Color;
  document.getElementById('scoreRightLabel').style.color = state.team2Color;
  document.getElementById('scoreLeftVal').style.color = state.team1Color;
  document.getElementById('scoreRightVal').style.color = state.team2Color;
}

function allDone() {
  // stop timer immediately
  clearInterval(state.timerInterval);

  // simulate time running out
  state.timeLeft = 0;
  state.timerRunning = false;
  state.timerDone = true;

  updateTimer(0);

  document.getElementById('timerBtns').style.display = 'none';
  document.getElementById('allDoneBtn').style.display = 'none';
  document.getElementById('confirmBtn').style.display = 'none';

  renderItems(true);

  // go straight into review phase (same as natural end)
  document.getElementById('doneBtn').style.display = 'none';
  document.getElementById('confirmBtn').style.display = 'block';
  document.getElementById('confirmBtn').textContent = 'Confirm & Pass Phone →';
}

function showResults() {
  winSound.volume = 0.3;
  playSound('winSound');
  const s1 = state.score1, s2 = state.score2;
  let winName, winScore;
  if(s1 > s2) { winName = state.team1; winScore = s1; }
  else if(s2 > s1) { winName = state.team2; winScore = s2; }
  else { winName = 'It\'s a Tie!'; winScore = s1; }

  document.getElementById('winnerName').textContent = winName;
  document.getElementById('winnerScore').textContent = winScore + ' pts';

  const bd = document.getElementById('scoreBreakdown');
  bd.innerHTML = `
    <div class="score-row"><div class="score-row-name">${state.team1}</div><div class="score-row-val">${s1}</div></div>
    <div class="score-row"><div class="score-row-name">${state.team2}</div><div class="score-row-val" style="color:var(--purple)">${s2}</div></div>
  `;
  showScreen('resultsScreen');
}

function showRoundIntro(callback) {
    console.log("ROUND INTRO SHOWN");
  const intro = document.getElementById('roundIntro');

  const team = state.currentTeam === 1 ? state.team1 : state.team2;

  document.getElementById('roundIntroText').textContent =
    `Round ${state.currentRound}`;

  document.getElementById('roundIntroSub').textContent = team;

  intro.classList.remove('hidden');

  // delay BEFORE continuing game
  setTimeout(() => {
    intro.classList.add('hidden');
    callback();
  }, 1500);
}

function restartGame() {
  // reset state
  state.currentRound = 1;
  state.currentTeam = 1;
  state.score1 = 0;
  state.score2 = 0;
  state.usedQs = new Set();

  showScreen('menuScreen');
  startMusic();
}

window.onload = async () => {
  await loadData();

  setupColorPickers();
  buildCatGrid();

  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => playSound('clickSound'));
  });
};

 setupColorPickers();