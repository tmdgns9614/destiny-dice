const screens = {
  start: document.getElementById('start-screen'),
  room: document.getElementById('room-screen'),
  game: document.getElementById('game-screen'),
};

const el = {
  singleBtn: document.getElementById('single-btn'),
  multiBtn: document.getElementById('multi-btn'),
  createRoomBtn: document.getElementById('create-room-btn'),
  quickJoinBtn: document.getElementById('quick-join-btn'),
  lobbyList: document.getElementById('lobby-list'),
  lobbyMsg: document.getElementById('lobby-msg'),
  lobbyPanel: document.getElementById('lobby-panel'),
  roomPanel: document.getElementById('room-panel'),
  roomTitle: document.getElementById('room-title'),
  playerList: document.getElementById('player-list'),
  readyBtn: document.getElementById('ready-btn'),
  startGameBtn: document.getElementById('start-game-btn'),
  leaveRoomBtn: document.getElementById('leave-room-btn'),
  roomHint: document.getElementById('room-hint'),
  turnDisplay: document.getElementById('turn-display'),
  diceBtn: document.getElementById('dice-btn'),
  diceResult: document.getElementById('dice-result'),
  eventLog: document.getElementById('event-log'),
  board: document.getElementById('board'),
};

const ctx = el.board.getContext('2d');

const CELL_EVENTS = [
  { label: ['이벤트', '1칸 전진'], type: 'forward', value: 1, kind: 'event' },
  { label: ['이벤트', '2칸 전진'], type: 'forward', value: 2, kind: 'event' },
  { label: ['이벤트', '보너스 턴'], type: 'bonus', value: 0, kind: 'event' },
  { label: ['벌칙', '1칸 뒤로'], type: 'backward', value: 1, kind: 'penalty' },
  { label: ['벌칙', '2칸 뒤로'], type: 'backward', value: 2, kind: 'penalty' },
  { label: ['벌칙', '한 턴 휴식'], type: 'skip', value: 1, kind: 'penalty' },
  { label: ['이벤트', '안전지대'], type: 'none', value: 0, kind: 'event' },
];

const state = {
  myName: randomPlayerName(),
  mode: null,
  rooms: [],
  activeRoomId: null,
  currentTurn: 0,
  isRolling: false,
  boardCells: 16,
  players: [],
  path: [],
  boardEvents: [],
};

function randomPlayerName() {
  return `Player${Math.floor(1000 + Math.random() * 9000)}`;
}

function randomRoomId() {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

function switchScreen(target) {
  Object.values(screens).forEach((screen) => screen.classList.remove('active'));
  screens[target].classList.add('active');
}

function setupSingle() {
  state.mode = 'single';
  state.players = [
    { name: state.myName, pos: 0, ready: true, isBot: false, isHost: true, color: '#4ecfff', skipTurns: 0 },
    { name: 'Bot', pos: 0, ready: true, isBot: true, isHost: false, color: '#ff7b72', skipTurns: 0 },
  ];
  enterGame();
}

function openLobby() {
  state.mode = 'multi';
  state.activeRoomId = null;
  renderLobby();
  el.roomPanel.classList.add('hidden');
  el.lobbyPanel.classList.remove('hidden');
  switchScreen('room');
}

function createRoom() {
  const hostName = state.myName;
  const room = {
    id: randomRoomId(),
    name: `${hostName.toLowerCase()}의 방`,
    hostName,
    players: [{ name: hostName, ready: false, isHost: true, isBot: false, color: '#4ecfff', skipTurns: 0 }],
  };

  state.rooms.push(room);
  enterRoom(room.id);
}

function quickJoinRoom() {
  const room = state.rooms.find((item) => item.players.length < 4 && item.hostName !== state.myName);
  if (!room) {
    el.lobbyMsg.textContent = '빠른 입장 가능한 방이 없습니다. (봇 방은 생성되지 않습니다)';
    return;
  }
  joinRoom(room.id);
}

function joinRoom(roomId) {
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room) return;

  const alreadyIn = room.players.some((player) => player.name === state.myName);
  if (!alreadyIn && room.players.length < 4) {
    room.players.push({ name: state.myName, ready: false, isHost: false, isBot: false, color: '#ffd166', skipTurns: 0 });
  }

  enterRoom(room.id);
}

function enterRoom(roomId) {
  state.activeRoomId = roomId;
  state.players = getActiveRoom().players;
  renderRoom();
  renderLobby();
  el.lobbyPanel.classList.add('hidden');
  el.roomPanel.classList.remove('hidden');
}

function leaveRoom() {
  const room = getActiveRoom();
  if (room) {
    room.players = room.players.filter((player) => player.name !== state.myName);
    if (room.players.length === 0) {
      state.rooms = state.rooms.filter((item) => item.id !== room.id);
    }
  }

  state.activeRoomId = null;
  state.players = [];
  renderLobby();
  el.roomPanel.classList.add('hidden');
  el.lobbyPanel.classList.remove('hidden');
}

function getActiveRoom() {
  return state.rooms.find((room) => room.id === state.activeRoomId);
}

function isMeHost() {
  const room = getActiveRoom();
  if (!room) return false;
  return room.hostName === state.myName;
}

function renderLobby() {
  el.lobbyList.innerHTML = '';

  if (state.rooms.length === 0) {
    el.lobbyMsg.textContent = '생성된 방이 없습니다. 먼저 방을 만들어 주세요.';
    return;
  }

  el.lobbyMsg.textContent = '아래 방 목록에서 입장할 방을 선택하세요.';

  state.rooms.forEach((room) => {
    const card = document.createElement('article');
    card.className = 'lobby-card';
    card.innerHTML = `
      <div class="lobby-title-row">
        <h3>${room.name}</h3>
        <span class="lobby-count">👤 [${room.players.length}/4] 접속</span>
      </div>
      <p>${room.hostName}</p>
      <button class="primary" data-room-id="${room.id}">입장</button>
    `;

    const joinBtn = card.querySelector('button');
    joinBtn.addEventListener('click', () => joinRoom(room.id));

    el.lobbyList.appendChild(card);
  });
}

function renderRoom() {
  const room = getActiveRoom();
  if (!room) return;

  const amHost = isMeHost();
  const me = room.players.find((player) => player.name === state.myName);

  el.roomTitle.textContent = room.name;
  el.playerList.innerHTML = '';

  room.players.forEach((player, index) => {
    const card = document.createElement('article');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-top">
        <strong>${player.name}</strong>
        <span>${player.isHost ? 'HOST' : 'GUEST'}</span>
      </div>
      <div class="${player.ready ? 'status-ready' : 'status-wait'}">${player.ready ? '준비 완료' : '대기 중'}</div>
      <div class="hint">👤 [${index + 1}/4] 접속</div>
    `;
    el.playerList.appendChild(card);
  });

  const allReady = room.players.length > 1 && room.players.every((player) => player.ready || player.isHost);
  el.startGameBtn.disabled = !(amHost && allReady);
  el.startGameBtn.style.display = amHost ? 'inline-flex' : 'none';
  el.leaveRoomBtn.style.display = 'inline-flex';
  el.readyBtn.style.display = me && !me.isHost ? 'inline-flex' : 'none';
  el.readyBtn.textContent = me && me.ready ? '준비 취소' : '준비';

  el.roomHint.textContent = amHost
    ? '방장입니다. 모든 플레이어 준비 완료 시 게임을 시작할 수 있습니다.'
    : '게스트입니다. 준비 버튼으로 상태를 변경하세요.';
}

function buildPath() {
  const startX = 82;
  const startY = 132;
  const spacing = 98;
  const widthCount = 8;
  const path = [];

  for (let i = 0; i < state.boardCells; i += 1) {
    const row = Math.floor(i / widthCount);
    const col = row % 2 === 0 ? i % widthCount : widthCount - 1 - (i % widthCount);
    path.push({ x: startX + col * spacing, y: startY + row * 200 });
  }

  state.path = path;
}

function createBoardEvents() {
  state.boardEvents = Array.from({ length: state.boardCells }, (_, index) => {
    if (index === 0) return { label: ['START'], type: 'none', value: 0, kind: 'start' };
    if (index === state.boardCells - 1) return { label: ['GOAL'], type: 'goal', value: 0, kind: 'goal' };
    return CELL_EVENTS[Math.floor(Math.random() * CELL_EVENTS.length)];
  });
}

function drawCellLabel(lines, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = '700 13px A2z, sans-serif';
  ctx.textAlign = 'center';

  if (lines.length === 1) {
    ctx.fillText(lines[0], x, y + 5);
    return;
  }

  ctx.fillText(lines[0], x, y - 8);
  ctx.fillText(lines[1], x, y + 14);
}

function drawBoard() {
  ctx.clearRect(0, 0, el.board.width, el.board.height);

  state.path.forEach((cell, i) => {
    const event = state.boardEvents[i];
    const fill = event.kind === 'penalty' ? '#3e2a3c' : event.kind === 'start' || event.kind === 'goal' ? '#274653' : '#1f3a62';
    const stroke = event.kind === 'penalty' ? '#ff8080' : event.kind === 'start' || event.kind === 'goal' ? '#59d7cc' : '#62aeff';

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.fillRect(cell.x - 45, cell.y - 42, 90, 84);
    ctx.strokeRect(cell.x - 45, cell.y - 42, 90, 84);

    const labelColor = event.kind === 'start' || event.kind === 'goal' ? '#b6eaf1' : '#cedbf4';
    drawCellLabel(event.label, cell.x, cell.y, labelColor);
  });

  state.players.forEach((player, idx) => {
    const pos = state.path[player.pos];
    const offset = idx * 18 - 9;
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.strokeStyle = '#0f182b';
    ctx.lineWidth = 2;
    ctx.arc(pos.x + offset, pos.y - 52, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function renderTurn() {
  const chips = state.players
    .map((p, i) => `<span class="turn-chip ${i === state.currentTurn ? 'active' : ''}">${p.name}</span>`)
    .join(' | ');
  el.turnDisplay.innerHTML = `[ 🎲 ${chips} ]`;

  const current = state.players[state.currentTurn];
  const myTurn = current?.name === state.myName;
  el.diceBtn.disabled = !myTurn || state.isRolling || (current?.skipTurns ?? 0) > 0;
}

function advanceTurn() {
  state.currentTurn = (state.currentTurn + 1) % state.players.length;
  const next = state.players[state.currentTurn];

  if (next.skipTurns > 0) {
    next.skipTurns -= 1;
    el.eventLog.textContent = `⏸️ ${next.name}은(는) 한 턴 휴식 상태입니다.`;
    renderTurn();
    setTimeout(() => advanceTurn(), 650);
    return;
  }

  renderTurn();

  if (next?.isBot) {
    setTimeout(() => {
      rollDice();
    }, 700);
  }
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
  const event = state.boardEvents[player.pos];

  if (event.type === 'goal') {
    el.eventLog.textContent = `🏆 ${player.name} 골인! 출발점으로 돌아갑니다.`;
    player.pos = 0;
  } else if (event.type === 'forward') {
    player.pos = Math.min(state.boardCells - 1, player.pos + event.value);
    el.eventLog.textContent = `✨ ${player.name} ${event.label.join(' ')} 발동!`;
  } else if (event.type === 'backward') {
    player.pos = Math.max(0, player.pos - event.value);
    el.eventLog.textContent = `💥 ${player.name} ${event.label.join(' ')} 발동!`;
  } else if (event.type === 'skip') {
    player.skipTurns += event.value;
    el.eventLog.textContent = `🛑 ${player.name} ${event.label.join(' ')}!`;
  } else if (event.type === 'bonus') {
    el.eventLog.textContent = `🎁 ${player.name} ${event.label.join(' ')}! 다시 굴립니다.`;
    drawBoard();
    return 'bonus';
  } else {
    el.eventLog.textContent = `📌 ${player.name} ${event.label.join(' ')} 칸 도착`;
  }

  drawBoard();
  return 'normal';
}

async function rollDice() {
  if (state.isRolling) return;
  const player = state.players[state.currentTurn];
  if (!player || player.skipTurns > 0) return;

  const myTurn = player.name === state.myName;
  if (!myTurn && !player.isBot) return;

  state.isRolling = true;
  renderTurn();

  el.diceBtn.classList.add('rolling');
  const value = Math.floor(Math.random() * 6) + 1;

  await new Promise((resolve) => setTimeout(resolve, 550));
  el.diceBtn.classList.remove('rolling');
  el.diceResult.textContent = `결과: ${value}`;

  await animateMove(state.currentTurn, value);
  const eventResult = processCellEvent(state.currentTurn);

  state.isRolling = false;
  if (eventResult === 'bonus') {
    renderTurn();
    if (player.isBot) {
      setTimeout(() => rollDice(), 750);
    }
    return;
  }

  advanceTurn();
}

function enterGame() {
  state.players = structuredClone(getActiveRoom()?.players || state.players);
  buildPath();
  createBoardEvents();
  state.players.forEach((player) => {
    player.pos = 0;
    player.skipTurns = 0;
  });
  state.currentTurn = 0;
  el.diceResult.textContent = '결과: -';
  el.eventLog.textContent = '게임 시작! 자신의 턴에 주사위를 굴리세요.';
  drawBoard();
  renderTurn();
  switchScreen('game');
}

el.singleBtn.addEventListener('click', setupSingle);
el.multiBtn.addEventListener('click', openLobby);
el.createRoomBtn.addEventListener('click', createRoom);
el.quickJoinBtn.addEventListener('click', quickJoinRoom);
el.leaveRoomBtn.addEventListener('click', leaveRoom);
el.readyBtn.addEventListener('click', () => {
  const room = getActiveRoom();
  if (!room) return;

  const me = room.players.find((player) => player.name === state.myName);
  if (!me || me.isHost) return;

  me.ready = !me.ready;
  renderRoom();
});
el.startGameBtn.addEventListener('click', enterGame);
el.diceBtn.addEventListener('click', rollDice);

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    if (screens.game.classList.contains('active')) {
      drawBoard();
    }
  });
}
