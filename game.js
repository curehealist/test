const COLS = 10;
const ROWS = 20;
const CELL = 30;
const COLORS = [
  null,
  '#00f5ff', // I - 네온 시안
  '#ffe600', // O - 비비드 옐로우
  '#cc00ff', // T - 네온 퍼플
  '#00ff88', // S - 네온 그린
  '#ff1744', // Z - 비비드 레드
  '#ff6d00', // J - 네온 오렌지
  '#2979ff', // L - 비비드 블루
];

const TETROMINOES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const SCORES = [0, 100, 300, 500, 800];
const LEVEL_SPEED = [800, 700, 600, 500, 400, 320, 250, 190, 140, 100];
const CLEAR_DURATION = 180;

class Tetris {
  /**
   * @param {Object} opts
   * @param {string} opts.boardId      - canvas ID for main board
   * @param {string} opts.nextId       - canvas ID for next piece preview
   * @param {string} opts.scoreId      - element ID for score display
   * @param {string} opts.levelId      - element ID for level display
   * @param {string} opts.linesId      - element ID for lines display
   * @param {string} opts.overlayId    - board-level overlay container ID
   * @param {string} opts.overlayTitleId
   * @param {string} opts.overlayMessageId
   * @param {string} opts.overlayScoreId
   * @param {string} opts.startBtnId   - sidebar start button ID
   * @param {string} opts.overlayStartBtnId
   * @param {string} opts.playerLabel  - "P1 패배!" / "P2 패배!" 등
   * @param {Object} opts.keyMap       - key string → action string mapping
   */
  constructor(opts) {
    this.board = document.getElementById(opts.boardId);
    this.ctx = this.board.getContext('2d');
    this.nextCanvas = document.getElementById(opts.nextId);
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.scoreEl = document.getElementById(opts.scoreId);
    this.levelEl = document.getElementById(opts.levelId);
    this.linesEl = document.getElementById(opts.linesId);
    this.overlay = document.getElementById(opts.overlayId);
    this.overlayTitle = document.getElementById(opts.overlayTitleId);
    this.overlayMessage = document.getElementById(opts.overlayMessageId);
    this.overlayScore = document.getElementById(opts.overlayScoreId);
    this.playerLabel = opts.playerLabel;
    this.keyMap = opts.keyMap;

    this.grid = this.createGrid();
    this.piece = null;
    this.nextPiece = null;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.running = false;
    this.paused = false;
    this.animationId = null;
    this.lastTime = 0;
    this.dropCounter = 0;

    document.getElementById(opts.startBtnId).addEventListener('click', () => this.start());
    document.getElementById(opts.overlayStartBtnId).addEventListener('click', () => this.start());

    this.showOverlay(this.playerLabel, '시작 버튼을 누르세요', '');
    this.drawGrid();
  }

  createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  start() {
    this.grid = this.createGrid();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.updateUI();
    this.nextPiece = this.randomPiece();
    this.spawnPiece();
    this.running = true;
    this.paused = false;
    this.overlay.classList.add('hidden');
    cancelAnimationFrame(this.animationId);
    this.lastTime = 0;
    this.dropCounter = 0;
    this.loop(0);
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    this.showOverlay(this.playerLabel, '일시정지 — P를 눌러 계속', '');
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.overlay.classList.add('hidden');
    this.lastTime = 0;
    this.loop(0);
  }

  randomPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    const matrix = TETROMINOES[type].map(row => [...row]);
    return { type, matrix, x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2), y: 0 };
  }

  spawnPiece() {
    this.piece = this.nextPiece;
    this.piece.x = Math.floor(COLS / 2) - Math.ceil(this.piece.matrix[0].length / 2);
    this.piece.y = 0;
    this.nextPiece = this.randomPiece();
    this.drawNext();
    if (this.collides(this.piece, 0, 0)) {
      this.gameOver();
    }
  }

  loop(timestamp) {
    if (this.paused) return;
    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.dropCounter += delta;
    const speed = LEVEL_SPEED[Math.min(this.level - 1, LEVEL_SPEED.length - 1)];
    if (this.dropCounter >= speed) {
      this.dropPiece();
      this.dropCounter = 0;
    }
    this.render();
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  collides(piece, dx, dy, matrix) {
    const m = matrix || piece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && this.grid[ny][nx]) return true;
      }
    }
    return false;
  }

  dropPiece() {
    if (!this.collides(this.piece, 0, 1)) {
      this.piece.y++;
    } else {
      this.lock();
    }
  }

  hardDrop() {
    let drop = 0;
    while (!this.collides(this.piece, 0, drop + 1)) drop++;
    this.piece.y += drop;
    this.score += drop * 2;
    this.updateUI();
    this.lock();
    this.dropCounter = 0;
  }

  rotate(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        rotated[c][rows - 1 - r] = matrix[r][c];
    return rotated;
  }

  rotatePiece() {
    const rotated = this.rotate(this.piece.matrix);
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
      if (!this.collides(this.piece, kick, 0, rotated)) {
        this.piece.matrix = rotated;
        this.piece.x += kick;
        return;
      }
    }
  }

  lock() {
    const { matrix, x, y } = this.piece;
    for (let r = 0; r < matrix.length; r++)
      for (let c = 0; c < matrix[r].length; c++)
        if (matrix[r][c] && y + r >= 0)
          this.grid[y + r][x + c] = matrix[r][c];
    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== 0)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      this.score += SCORES[cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.updateUI();
    }
  }

  ghostY() {
    let drop = 0;
    while (!this.collides(this.piece, 0, drop + 1)) drop++;
    return this.piece.y + drop;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.board.width, this.board.height);
    this.drawGrid();
    if (this.piece) {
      this.drawGhost();
      this.drawPiece(ctx, this.piece.matrix, this.piece.x, this.piece.y, COLORS[this.piece.type]);
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          this.drawCell(ctx, c, r, COLORS[cell]);
        } else {
          ctx.strokeStyle = '#1a1a2e';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    }
  }

  drawCell(ctx, col, row, color) {
    const x = col * CELL;
    const y = row * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x + 1, y + 1, CELL - 2, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 1, y + 1, 4, CELL - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  drawPiece(ctx, matrix, px, py, color) {
    for (let r = 0; r < matrix.length; r++)
      for (let c = 0; c < matrix[r].length; c++)
        if (matrix[r][c])
          this.drawCell(ctx, px + c, py + r, color);
  }

  drawGhost() {
    const gy = this.ghostY();
    const ctx = this.ctx;
    for (let r = 0; r < this.piece.matrix.length; r++) {
      for (let c = 0; c < this.piece.matrix[r].length; c++) {
        if (!this.piece.matrix[r][c]) continue;
        const x = (this.piece.x + c) * CELL;
        const y = (gy + r) * CELL;
        ctx.strokeStyle = COLORS[this.piece.type];
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawNext() {
    const ctx = this.nextCtx;
    const canvasW = this.nextCanvas.width;
    const canvasH = this.nextCanvas.height;
    ctx.clearRect(0, 0, canvasW, canvasH);
    const m = this.nextPiece.matrix;
    const size = 22;
    const offsetX = Math.floor((canvasW - m[0].length * size) / 2);
    const offsetY = Math.floor((canvasH - m.length * size) / 2);
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const x = offsetX + c * size;
        const y = offsetY + r * size;
        ctx.fillStyle = COLORS[this.nextPiece.type];
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + 1, y + 1, size - 2, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 1, y + size - 4, size - 2, 3);
      }
    }
  }

  gameOver() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    if (typeof globalPaused !== 'undefined' && globalPaused) {
      globalPaused = false;
      if (typeof updatePauseBtn === 'function') updatePauseBtn();
    }
    this.showOverlay(`${this.playerLabel} 패배!`, '다시 시작하려면 시작을 누르세요', `최종 점수: ${this.score.toLocaleString()}`);
  }

  showOverlay(title, message, score) {
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlayScore.textContent = score;
    this.overlay.classList.remove('hidden');
  }

  updateUI() {
    this.scoreEl.textContent = this.score.toLocaleString();
    this.levelEl.textContent = this.level;
    this.linesEl.textContent = this.lines;
  }

  /**
   * 이 인스턴스의 키맵에 해당하는 키 이벤트를 처리한다.
   * 전역 pause 토글(P키)은 호출부에서 처리.
   */
  handleKey(key, e) {
    const action = this.keyMap[key];
    if (!action) return false;

    if (!this.running) return true;
    if (this.paused) {
      e.preventDefault();
      return true;
    }

    switch (action) {
      case 'left':
        if (!this.collides(this.piece, -1, 0)) this.piece.x--;
        break;
      case 'right':
        if (!this.collides(this.piece, 1, 0)) this.piece.x++;
        break;
      case 'rotate':
        this.rotatePiece();
        break;
      case 'softDrop':
        this.dropPiece();
        this.score += 1;
        this.updateUI();
        this.dropCounter = 0;
        break;
      case 'hardDrop':
        this.hardDrop();
        break;
    }
    e.preventDefault();
    this.render();
    return true;
  }
}

// ── 인스턴스 생성 ──────────────────────────────────────────────

const game1 = new Tetris({
  boardId: 'board1',
  nextId: 'next1',
  scoreId: 'score1',
  levelId: 'level1',
  linesId: 'lines1',
  overlayId: 'overlay1',
  overlayTitleId: 'overlayTitle1',
  overlayMessageId: 'overlayMessage1',
  overlayScoreId: 'overlayScore1',
  startBtnId: 'startBtn1',
  overlayStartBtnId: 'overlayStartBtn1',
  playerLabel: 'P1',
  keyMap: {
    'a': 'left',
    'A': 'left',
    'd': 'right',
    'D': 'right',
    'w': 'rotate',
    'W': 'rotate',
    's': 'softDrop',
    'S': 'softDrop',
    'q': 'hardDrop',
    'Q': 'hardDrop',
  },
});

const game2 = new Tetris({
  boardId: 'board2',
  nextId: 'next2',
  scoreId: 'score2',
  levelId: 'level2',
  linesId: 'lines2',
  overlayId: 'overlay2',
  overlayTitleId: 'overlayTitle2',
  overlayMessageId: 'overlayMessage2',
  overlayScoreId: 'overlayScore2',
  startBtnId: 'startBtn2',
  overlayStartBtnId: 'overlayStartBtn2',
  playerLabel: 'P2',
  keyMap: {
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'rotate',
    'ArrowDown': 'softDrop',
    ' ': 'hardDrop',
  },
});

// ── 전역 키 핸들러 ─────────────────────────────────────────────

let globalPaused = false;

const pauseBtn = document.getElementById('pauseBtn');

function updatePauseBtn() {
  const eitherRunning = game1.running || game2.running;
  pauseBtn.disabled = !eitherRunning;
  pauseBtn.textContent = globalPaused ? '계속하기' : '일시정지';
}

function toggleGlobalPause() {
  const eitherRunning = game1.running || game2.running;
  if (!eitherRunning) return;

  globalPaused = !globalPaused;

  if (globalPaused) {
    game1.pause();
    game2.pause();
  } else {
    game1.resume();
    game2.resume();
  }
  updatePauseBtn();
}

pauseBtn.addEventListener('click', toggleGlobalPause);

document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    toggleGlobalPause();
    e.preventDefault();
    return;
  }

  const gameKeys = new Set(['a','A','d','D','w','W','s','S','q','Q',
    'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ']);
  if (gameKeys.has(e.key)) e.preventDefault();

  game1.handleKey(e.key, e);
  game2.handleKey(e.key, e);
});
