/* ===============================
   화면 참조
================================ */
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

/* ===============================
   상태 관리
================================ */
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
};

/* ===============================
   유틸
================================ */
function randomPlayerName() {
  return `Player${Math.floor(1000 + Math.random() * 9000)}`;
}

function randomRoomId() {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

function switchScreen(target) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[target].classList.add('active');
}

/* ===============================
   싱글 플레이
================================ */
function setupSingle() {
  state.mode = 'single';
  state.players = [
    { name: state.myName, pos: 0, ready: true, isBot: false, isHost: true, color: '#4ecfff' },
    { name: 'Bot', pos: 0, ready: true, isBot: true, isHost: false, color: '#ff7b72' },
  ];
  enterGame();
}

/* ===============================
   로비 / 방
================================ */
function openLobby() {
  state.mode = 'multi';
  state.activeRoomId = null;
  renderLobby();
  el.roomPanel.classList.add('hidden');
  el.lobbyPanel.classList.remove('hidden');
  switchScreen('room');
}

function createRoom() {
  const room = {
    id: randomRoomId(),
    name: `${state.myName.toLowerCase()}의 방`,
    hostName: state.myName,
    players: [
      { name: state.myName, ready: false, isHost: true, isBot: false, color: '#4ecfff' },
    ],
  };
  state.rooms.push(room);
  enterRoom(room.id);
}

function quickJoinRoom() {
  const room = state.rooms.find((r) => r.players.length < 4 && r.hostName !== state.myName);
  if (!room) {
    el.lobbyMsg.textContent = '입장 가능한 방이 없습니다.';
    return;
  }
  joinRoom(room.id);
}

function joinRoom(roomId) {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return;

  if (!room.players.some((p) => p.name === state.myName)) {
    room.players.push({
      name: state.myName,
      ready: false,
      isHost: false,
      isBot: false,
      color: '#ffd166',
    });
  }
  enterRoom(roomId);
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
  if (!room) return;

  room.players = room.players.filter((p) => p.name !== state.myName);
  if (room.players.length === 0) {
    state.rooms = state.rooms.filter((r) => r.id !== room.id);
  }

  state.activeRoomId = null;
  state.players = [];
  renderLobby();
  el.roomPanel.classList.add('hidden');
  el.lobbyPanel.classList.remove('hidden');
}

function getActiveRoom() {
  return state.rooms.find((r) => r.id === state.activeRoomId);
}

function isMeHost() {
  const room = getActiveRoom();
  return room && room.hostName === state.myName;
}

function renderLobby() {
  el.lobbyList.innerHTML = '';

  if (state.rooms.length === 0) {
    el.lobbyMsg.textContent = '생성된 방이 없습니다.';
    return;
  }

  el.lobbyMsg.textContent = '입장할 방을 선택하세요.';
  state.rooms.forEach((room) => {
    const card = document.createElement('article');
    card.className = 'lobby-card';
    card.innerHTML = `
      <h3>${room.name}</h3>
      <p>👤 ${room.players.length}/4</p>
      <button class="primary">입장</button>
    `;
    card.querySelector('button').onclick = () => joinRoom(room.id);
    el.lobbyList.appendChild(card);
  });
}

function renderRoom() {
  const room = getActiveRoom();
  if (!room) return;

  const amHost = isMeHost();
  const me = room.players.find((p) => p.name === state.myName);

  el.roomTitle.textContent = room.name;
  el.playerList.innerHTML = '';

  room.players.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'player-card';
    card.innerHTML = `
      <strong>${p.name}</strong>
      <div>${p.ready ? '준비 완료' : '대기 중'}</div>
      <span>${p.isHost ? 'HOST' : 'GUEST'}</span>
    `;
    el.playerList.appendChild(card);
  });

  const allReady = room.players.length > 1 &&
    room.players.every((p) => p.ready || p.isHost);

  el.startGameBtn.disabled = !(amHost && allReady);
  el.startGameBtn.style.display = amHost ? 'inline-flex' : 'none';
  el.leaveRoomBtn.style.display = 'inline-flex';
  el.readyBtn.textContent = me?.ready ? '준비 취소' : '준비';

  el.roomHint.textContent = amHost
    ? '모든 플레이어 준비 완료 시 시작 가능'
    : '준비 버튼을 눌러주세요';
}

/* ===============================
   게임
================================ */
function buildPath() {
  const path = [];
  for (let i = 0; i < state.boardCells; i++) {
    path.push({ x: 80 + (i % 8) * 48, y: 80 + Math.floor(i / 8) * 48 });
  }
  state.path = path;
}

function drawBoard() {
  ctx.clearRect(0, 0, el.board.width, el.board.height);

  state.path.forEach((c, i) => {
    ctx.fillStyle = i % 2 ? '#1a2a42' : '#223451';
    ctx.fillRect(c.x - 18, c.y - 18, 36, 36);
  });

  state.players.forEach((p, i) => {
    const pos = state.path[p.pos];
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(pos.x + i * 10 - 5, pos.y - 22, 9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderTurn() {
  el.turnDisplay.innerHTML = `[ 🎲 ${state.players.map((p, i) =>
    `<span class="${i === state.currentTurn ? 'active' : ''}">${p.name}</span>`
  ).join(' | ')} ]`;

  const current = state.players[state.currentTurn];
  el.diceBtn.disabled = current.name !== state.myName || state.isRolling;
}

async function rollDice() {
  const player = state.players[state.currentTurn];
  if (player.name !== state.myName || state.isRolling) return;

  state.isRolling = true;
  const value = Math.floor(Math.random() * 6) + 1;
  el.diceResult.textContent = `결과: ${value}`;

  for (let i = 0; i < value; i++) {
    await new Promise((r) => setTimeout(r, 200));
    player.pos = Math.min(player.pos + 1, state.boardCells - 1);
    drawBoard();
  }

  state.currentTurn = (state.currentTurn + 1) % state.players.length;
  state.isRolling = false;
  renderTurn();
}

function enterGame() {
  buildPath();
  state.players.forEach((p) => (p.pos = 0));
  state.currentTurn = 0;
  drawBoard();
  renderTurn();
  switchScreen('game');
}

/* ===============================
   이벤트 바인딩
================================ */
el.singleBtn.onclick = setupSingle;
el.multiBtn.onclick = openLobby;
el.createRoomBtn.onclick = createRoom;
el.quickJoinBtn.onclick = quickJoinRoom;
el.leaveRoomBtn.onclick = leaveRoom;
el.startGameBtn.onclick = enterGame;
el.diceBtn.onclick = rollDice;

el.readyBtn.onclick = () => {
  const room = getActiveRoom();
  const me = room?.players.find((p) => p.name === state.myName);
  if (!me) return;
  me.ready = !me.ready;
  renderRoom();
};
