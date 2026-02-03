import { pastelColors, createBoard } from "./boad.js";
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
  tileSize: 0
};

export function initializeGame() {
  game.remainingTreasures = game.treasureCount;
  createBoard(game.boardSize);
  createPlayers();
  placeTreasures();
  updateTreasureInfo();

  // 初期位置を塗る
  for (const p of game.players) {
    game.board[p.x][p.y].color = pastelColors[p.color];
  }
  // 初期位置で光るかどうか判定
  updateGlowStates();
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
