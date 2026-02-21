import { game } from "./state.js";
import { render, updateTurnInfo } from "./ui.js";
import { endTurn } from "./turn.js";

export function createBoard(size) {
  game.board = [];
  for (let x = 0; x < size; x++) {
    game.board[x] = [];
    for (let y = 0; y < size; y++) {
      game.board[x][y] = { color: null, treasure: false };
    }
  }
}

export function drawBoard() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  const size = game.board.length;
  const width = window.innerWidth - 40;
  game.tileSize = width / size;

  canvas.width = width;
  canvas.height = width;

  for (let x = 0; x < game.board.length; x++) {
    for (let y = 0; y < game.board.length; y++) {
      const cell = game.board[x][y];
      ctx.fillStyle = cell.color === null ? "#ddd" : cell.color;
      ctx.fillRect( x * game.tileSize, y * game.tileSize, game.tileSize, game.tileSize );

      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.strokeRect( x * game.tileSize, y * game.tileSize, game.tileSize, game.tileSize );
    }
  }
  // --- ハイライト描画 ---
  if (game.highlight) {
    const { x, y } = game.highlight;

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      x * game.tileSize,
      y * game.tileSize,
      game.tileSize,
      game.tileSize
    );
  }
}

export function handleBoardClick(x, y) {
  // --- ブレイクモード ---
  if (game.mode === "break") {
    // プレイヤーがいるマスはブレイク不可
    for (const other of game.players) {
      if (other.x === x && other.y === y) {
        alert("プレイヤーがいるマスは無色化できません");
        game.highlight = null;
        render();
        game.mode = "normal";
        return;
      }
    }

    const tile = game.board[x][y];
    const p = game.players[game.currentPlayerId];
    const playerColor = game.selectedColors[playerId];
    const myColor = ColorMap[playerColor];

    if (tile.color && tile.color !== myColor) {
      game.highlight = { x, y };
      render();
      setTimeout(() => {
        if (confirm("このマスを無色化しますか？")) {
          tile.color = null;
          game.remainingActions--;
          updateTurnInfo();
          if (game.remainingActions <= 0) {
            endTurn();
          }
        }
        game.highlight = null;
        render();
      }, 50);
      game.mode = "normal";
      return;
    }
  }

  // --- 通常クリック処理（必要なら追加） ---
}
