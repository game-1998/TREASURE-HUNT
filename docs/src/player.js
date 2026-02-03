import { game, updateGlowStates } from "./state.js";
import { render, updateTreasureInfo, updateTurnInfo } from "./ui.js";
import { endTurn, endGame } from "./turn.js";
import { pastelColors } from "./boad.js";

export const playerColors = ["blue", "red", "green", "purple"];

export function createPlayers() {
  game.players = [];
  const size = game.boardSize;

  const positions = [
    { x: 0, y: 0 },               // 左上
    { x: size - 1, y: size - 1 }, // 右下
    { x: size - 1, y: 0 },        // 右上
    { x: 0, y: size - 1 }         // 左下
  ];

  for (let i = 0; i < game.playerCount; i++) {
    game.players.push({
      x: positions[i].x,
      y: positions[i].y,
      color: playerColors[i],
      name: game.playerNames[i],
      isGlowing: false,
      collectedChests: []
    });
  }
}

export function drawPlayers() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  for (const p of game.players) {
    const cx = p.x * game.tileSize + game.tileSize / 2;
    const cy = p.y * game.tileSize + game.tileSize / 2;
    const r = game.tileSize * 0.3;
    
    // 光る演出（外側のオーラ）
    if (p.isGlowing) {
      ctx.save();
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 4;
      ctx.shadowColor = "yellow";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
}

export function movePlayer(dx, dy) {
  const p = game.players[game.currentPlayerId];

  const nx = p.x + dx;
  const ny = p.y + dy;

  // ボード外チェック
  if (nx < 0 || ny < 0 || nx >= game.board.length || ny >= game.board.length) {
    return; // 動かない
  }

  // 移動
  p.x = nx;
  p.y = ny;

  // 宝箱取得チェック
  if (game.board[nx][ny].treasure) {
    const chest = game.board[nx][ny].treasure;
    game.board[nx][ny].treasure = false;     // マスから消す
    p.collectedChests.push({ x: nx, y: ny, score: chest.score }); // プレイヤーに追加
    game.remainingTreasures--; // 残り宝箱数を減らす
    updateTreasureInfo();
  }

  // 全プレイヤーの光る状態を更新
  updateGlowStates();

  // 移動したマスを自分の色に塗る
  game.board[nx][ny].color = pastelColors[p.color];
  
  // アクション消費
  game.remainingActions--;
  updateTurnInfo();

  render();

  // 残り宝箱が0ならゲーム終了
  if (game.remainingTreasures === 0) {
    setTimeout(() => endGame(), 300);
    return; // これ以上処理しない
  }

  // アクションが尽きたらターン終了
  if (game.remainingActions <= 0) {
    endTurn();
  }
}
