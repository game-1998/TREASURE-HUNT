import { createBoard } from "./boad.js";
import { createPlayers } from "./player.js";
import { updateTreasureInfo, showScreen } from "./ui.js";

export const game = {
  boardSize: 7,
  board: [],
  players: [],
  treasures: [],
  remainingTreasures: 3,
  currentPlayerId: 0,
  remainingActions: 2,
  phase: "start",
  tileSize: 0,
  mode: "normal",
  highlight: null,
  animation: null,
  locked: false
};

// 色候補
export const ColorMap = {
  "#1A2BFF": "#b9a8ff", // 青 → 紫寄りパステル（青と水色の距離を最大化）
  "#FF7A00": "#fab380", // オレンジ → 赤寄りパステル（黄色と差が出る）
  "#00A86B": "#b5f5c9", // 緑 → 黄緑寄りパステル（青・水色と差が出る）
  "#ff0037": "#ff7895", // マゼンタ → 赤ピンク（暖色の中で独立）
  "#c24e9b": "#eba0d3",
  "#00C8FF": "#a8f0ff", // 水色 → 緑寄り水色（青と差が出る）
};

export const colorList = Object.keys(ColorMap);

export function initializeGame() {
  game.remainingTreasures = game.treasureCount;
  createBoard(game.boardSize);
  createPlayers();
  placeTreasures();
  updateTreasureInfo();
  setupCanvas(game.boardSize);

  // 初期位置を塗る
  for (const p of game.players) {
    const playerColor = p.color;   // 濃い色
    game.board[p.x][p.y].color = ColorMap[playerColor];
  }
  // 初期位置で光るかどうか判定
  updateGlowStates();
}

function setupCanvas(boardSize) {
  const canvas = document.getElementById("boardCanvas");

  const cellSize = 83; // 1マスの論理ピクセル数（ゲームの都合で決める）
  const size = cellSize * boardSize;

  // 内部解像度（論理座標）
  canvas.width = size;
  canvas.height = size;
}

export function placeTreasures() {
  const size = game.boardSize;
  const count = game.treasureCount; // 選択された数を使う

  let placed = 0;

  while (placed < count) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);

    // プレイヤー初期位置には置かない
    const occupied = game.players.some(p => p.x === x && p.y === y);
    if (occupied) continue;

    // すでに宝箱があるならスキップ
    if (game.board[x][y].treasure) continue;

    // 宝箱を置く
    const score = getRandomTreasureScore();
    game.board[x][y].treasure = { score };
    console.log(`宝箱生成: (${x}, ${y}) に ${score} 点の宝箱`);
    placed++;
  }
}

export function isNearTreasure(px, py) {
  for (let x = 0; x < game.boardSize; x++) {
    for (let y = 0; y < game.boardSize; y++) {
      if (game.board[x][y].treasure) {
        const dist = Math.abs(px - x) + Math.abs(py - y);
        if (dist <= 2) return true;
      }
    }
  }
  return false;
}

export function updateGlowStates() {
  for (const p of game.players) {
    p.isGlowing = isNearTreasure(p.x, p.y);
  }
}

const treasureWeights = [
  { score: 1, weight: 70 },
  { score: 2, weight: 20 },
  { score: 3, weight: 7 },
  { score: 5, weight: 3 }
];

function getRandomTreasureScore() {
  const totalWeight = treasureWeights.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * totalWeight;

  for (const t of treasureWeights) {
    if (r < t.weight) {
      return t.score;
    }
    r -= t.weight;
  }
}
