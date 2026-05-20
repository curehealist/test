const COLS = 10;
const ROWS = 20;
const CELL = 30;
const COLORS = [
  null,
  '#00cfff', // I - 시안
  '#ffd700', // O - 노랑
  '#a020f0', // T - 보라
  '#00e050', // S - 초록
  '#ff3030', // Z - 빨강
  '#ff8c00', // J - 주황
  '#1e90ff', // L - 파랑
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

class Tetris {
  constructor() {
    this.board = document.getElementById('board');
    this.ctx = this.board.getContext('2d');
    this.nextCanvas = document.getElementById('next');
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.scoreEl = document.getElementById('score');
    this.levelEl = document.getElementById('level');
    this.linesEl = document.getElementById('lines');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlayTitle');
    this.overlayMessage = document.getElementById('overlayMessage');
    this.overlayScore = document.getElementById('overlayScore');
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');

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

    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    document.addEventListener('keydown', (e) => this.handleKey(e));

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
    this.pauseBtn.disabled = false;
    this.pauseBtn.textContent = '일시정지';
    cancelAnimationFrame(this.animationId);
    this.lastTime = 0;
    this.dropCounter = 0;
    this.loop(0);
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseBtn.textContent = '계속하기';
      this.showOverlay('일시정지', '계속하려면 P 또는 버튼을 누르세요', '');
    } else {
      this.pauseBtn.textContent = '일시정지';
      this.overlay.classList.add('hidden');
      this.lastTime = 0;
      this.loop(0);
    }
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
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          this.drawCell(ctx, c, r, COLORS[cell]);
        } else {
          ctx.strokeStyle = '#1a1a2e';
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
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4);
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
    ctx.clearRect(0, 0, 120, 120);
    const m = this.nextPiece.matrix;
    const size = 24;
    const offsetX = Math.floor((120 - m[0].length * size) / 2);
    const offsetY = Math.floor((120 - m.length * size) / 2);
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
    this.pauseBtn.disabled = true;
    this.showOverlay('게임 오버', '다시 시작하려면 시작을 누르세요', `최종 점수: ${this.score.toLocaleString()}`);
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

  handleKey(e) {
    if (!this.running) return;
    if (e.key === 'p' || e.key === 'P') { this.togglePause(); return; }
    if (this.paused) return;
    switch (e.key) {
      case 'ArrowLeft':
        if (!this.collides(this.piece, -1, 0)) this.piece.x--;
        e.preventDefault(); break;
      case 'ArrowRight':
        if (!this.collides(this.piece, 1, 0)) this.piece.x++;
        e.preventDefault(); break;
      case 'ArrowDown':
        this.dropPiece();
        this.score += 1;
        this.updateUI();
        this.dropCounter = 0;
        e.preventDefault(); break;
      case 'ArrowUp':
        this.rotatePiece();
        e.preventDefault(); break;
      case ' ':
        this.hardDrop();
        e.preventDefault(); break;
    }
    this.render();
  }
}

const game = new Tetris();
