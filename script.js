const screens = {
  start: document.getElementById('start-screen'),
  room: document.getElementById('room-screen'),
  game: document.getElementById('game-screen'),
};

const el = {
  singleBtn: document.getElementById('single-btn'),
  multiBtn: document.getElementById('multi-btn'),
  roomTitle: document.getElementById('room-title'),
  playerList: document.getElementById('player-list'),
  readyBtn: document.getElementById('ready-btn'),
  startGameBtn: document.getElementById('start-game-btn'),
  turnDisplay: document.getElementById('turn-display'),
  diceBtn: document.getElementById('dice-btn'),
  diceResult: document.getElementById('dice-result'),
  eventLog: document.getElementById('event-log'),
  board: document.getElementById('board'),
};

const ctx = el.board.getContext('2d');

const state = {
  mode: null,
  currentTurn: 0,
  isRolling: false,
  boardCells: 16,
  players: [],
  path: [],
};

function randomPlayerName() {
  return `Player${String(Math.floor(1000 + Math.random() * 9000))}`;
}

function switchScreen(target) {
  Object.values(screens).forEach((screen) => screen.classList.remove('active'));
  screens[target].classList.add('active');
}

function setupSingle() {
  state.mode = 'single';
  state.players = [
    { name: randomPlayerName(), pos: 0, ready: true, isBot: false, color: '#4ecfff' },
    { name: 'Bot', pos: 0, ready: true, isBot: true, color: '#ff7b72' },
  ];
  enterGame();
}

function setupMultiRoom() {
  state.mode = 'multi';
  const hostName = randomPlayerName();
  const guestName = randomPlayerName();

  state.players = [
    { name: hostName, pos: 0, ready: false, isBot: false, color: '#4ecfff', isHost: true },
    { name: guestName, pos: 0, ready: false, isBot: false, color: '#9bdb5a', isHost: false },
  ];

  el.roomTitle.textContent = `${hostName.toLowerCase()}의 방`;
  renderRoom();
  switchScreen('room');
}

function renderRoom() {
  el.playerList.innerHTML = '';
  state.players.forEach((player, index) => {
    const card = document.createElement('article');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-top">
        <strong>👤 [${index + 1}/4] 접속</strong>
        <span>${player.isHost ? 'HOST' : 'GUEST'}</span>
      </div>
      <div>${player.name}</div>
      <div class="${player.ready ? 'status-ready' : 'status-wait'}">${player.ready ? '준비 완료' : '대기 중'}</div>
    `;
    el.playerList.appendChild(card);
  });

  const allReady = state.players.every((p) => p.ready);
  el.startGameBtn.disabled = !allReady;
}

function buildPath() {
  const startX = 80;
  const startY = 80;
  const spacing = 48;
  const widthCount = 8;
  const path = [];

  for (let i = 0; i < state.boardCells; i += 1) {
    const row = Math.floor(i / widthCount);
    const col = row % 2 === 0 ? i % widthCount : widthCount - 1 - (i % widthCount);
    path.push({ x: startX + col * spacing, y: startY + row * spacing });
  }

  state.path = path;
}

function drawBoard() {
  ctx.clearRect(0, 0, el.board.width, el.board.height);

  state.path.forEach((cell, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#223451' : '#1a2a42';
    ctx.fillRect(cell.x - 18, cell.y - 18, 36, 36);
    ctx.strokeStyle = '#38527a';
    ctx.strokeRect(cell.x - 18, cell.y - 18, 36, 36);
    ctx.fillStyle = '#9fb0cf';
    ctx.font = '12px sans-serif';
    ctx.fillText(String(i), cell.x - 5, cell.y + 4);
  });

  state.players.forEach((player, idx) => {
    const pos = state.path[player.pos];
    const offset = idx * 11 - 8;
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(pos.x + offset, pos.y - 22, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderTurn() {
  const chips = state.players
    .map((p, i) => `<span class="turn-chip ${i === state.currentTurn ? 'active' : ''}">${p.name}</span>`)
    .join(' | ');
  el.turnDisplay.innerHTML = `[ 🎲 ${chips} ]`;

  const myTurn = state.currentTurn === 0;
  el.diceBtn.disabled = !myTurn || state.isRolling;
}

async function animateMove(playerIndex, steps) {
  const player = state.players[playerIndex];

  for (let i = 0; i < steps; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 220));
    player.pos = Math.min(player.pos + 1, state.boardCells - 1);
    drawBoard();
  }
}

function processCellEvent(playerIndex) {
  const player = state.players[playerIndex];
  if (player.pos === state.boardCells - 1) {
    el.eventLog.textContent = `🏆 ${player.name} 승리! 다시 굴려도 됩니다.`;
    player.pos = 0;
  } else if (Math.random() < 0.25) {
    const backStep = 1;
    player.pos = Math.max(0, player.pos - backStep);
    el.eventLog.textContent = `⚡ 이벤트! ${player.name} 뒤로 ${backStep}칸 이동.`;
  } else {
    el.eventLog.textContent = `${player.name}의 위치: ${player.pos}칸`;
  }
  drawBoard();
}

async function rollDice() {
  if (state.isRolling) return;
  const player = state.players[state.currentTurn];
  if (state.currentTurn !== 0 && !player.isBot) return;

  state.isRolling = true;
  renderTurn();

  el.diceBtn.classList.add('rolling');
  const value = Math.floor(Math.random() * 6) + 1;

  await new Promise((resolve) => setTimeout(resolve, 550));
  el.diceBtn.classList.remove('rolling');
  el.diceResult.textContent = `결과: ${value}`;

  await animateMove(state.currentTurn, value);
  processCellEvent(state.currentTurn);

  state.currentTurn = (state.currentTurn + 1) % state.players.length;
  state.isRolling = false;
  renderTurn();

  const next = state.players[state.currentTurn];
  if (next.isBot) {
    setTimeout(() => {
      rollDice();
    }, 750);
  }
}

function enterGame() {
  buildPath();
  state.players.forEach((p) => {
    p.pos = 0;
  });
  state.currentTurn = 0;
  el.diceResult.textContent = '결과: -';
  el.eventLog.textContent = '게임 시작! 자신의 턴에 주사위를 굴리세요.';
  drawBoard();
  renderTurn();
  switchScreen('game');
}

el.singleBtn.addEventListener('click', setupSingle);
el.multiBtn.addEventListener('click', setupMultiRoom);
el.readyBtn.addEventListener('click', () => {
  const me = state.players[0];
  me.ready = !me.ready;
  if (!state.players[1].ready) {
    state.players[1].ready = Math.random() > 0.2;
  }
  el.readyBtn.textContent = me.ready ? '준비 취소' : '준비';
  renderRoom();
});
el.startGameBtn.addEventListener('click', enterGame);
el.diceBtn.addEventListener('click', rollDice);
