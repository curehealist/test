# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based Tetris game built with vanilla HTML, CSS, and JavaScript — no build tools, no dependencies, no bundler.

## Running the Game

Open `index.html` directly in a browser. There is no server, build step, or install required.

## Architecture

Three files, each with a single responsibility:

- **`index.html`** — DOM structure: game board canvas (`#board`), next-piece preview canvas (`#next`), score/level/lines display, side-panel controls, and the overlay screen (start/pause/game-over).
- **`style.css`** — Dark-themed UI. The `.overlay` / `.overlay.hidden` toggle controls the start/pause/game-over screen visibility.
- **`game.js`** — All game logic lives in a single `Tetris` class instantiated once at the bottom (`const game = new Tetris()`).

### Key constants in `game.js`
- `COLS / ROWS / CELL` — board dimensions and pixel size per cell.
- `TETROMINOES` — index-1 array of piece matrices (index 0 is `null` so cell values map directly to color).
- `COLORS` — parallel index-1 array mapping piece type → hex color.
- `LEVEL_SPEED` — drop interval in ms per level (index 0 = level 1).
- `SCORES` — points awarded for 1–4 simultaneous line clears.

### Game loop
`loop(timestamp)` runs via `requestAnimationFrame`. It accumulates elapsed time in `dropCounter` and calls `dropPiece()` when the threshold for the current level is reached.

### Piece lifecycle
`randomPiece()` → stored in `nextPiece` → `spawnPiece()` moves it to `piece` and generates a new `nextPiece`. On lock, `lock()` writes the piece into `this.grid`, then `clearLines()` scans and collapses full rows.

### Collision
`collides(piece, dx, dy, matrix?)` accepts an optional override matrix, used by `rotatePiece()` to test the rotated shape before committing.

### Rendering
`render()` clears the canvas, redraws the settled grid, draws a ghost piece (semi-transparent outline at the hard-drop destination), then draws the active piece on top.
