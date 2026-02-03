import { game } from "./state.js";

export const pastelColors = {
  blue: "#a8c8ff",     // パステルブルー
  red: "#ffb3b3",      // パステルレッド
  green: "#b3ffb3",    // パステルグリーン
  purple: "#d6b3ff"    // パステルパープル
};

export function createBoard(size) {
  game.board = [];
  for (let x = 0; x < size; x++) {
    game.board[x] = [];
    for (let y = 0; y < size; y++) {
      game.board[x][y] = { color: "none", treasure: false };
    }
  }
}

export function drawBoard() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  const size = game.board.length;
  const width = window.innerWidth - 40;
  game.tileSize = width / size;

  canvas.width = width;
  canvas.height = width;

  for (let x = 0; x < game.board.length; x++) {
    for (let y = 0; y < game.board.length; y++) {
      const cell = game.board[x][y];
      ctx.fillStyle = cell.color === "none" ? "#ddd" : cell.color;
      ctx.fillRect( x * game.tileSize, y * game.tileSize, game.tileSize, game.tileSize );

      // 宝箱を描く
      if (cell.treasure) {
        ctx.fillStyle = "gold";
        ctx.font = `${game.tileSize * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★",
          x * game.tileSize + game.tileSize / 2,
          y * game.tileSize + game.tileSize / 2
        );
      }
    }
  }
}
