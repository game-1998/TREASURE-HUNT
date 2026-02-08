import { game, updateGlowStates } from "./state.js";
import { render, triggerTreasureAnimation, updateTreasureInfo, updateTurnInfo } from "./ui.js";
import { endTurn, endGame } from "./turn.js";
import { drawBoard, pastelColors } from "./boad.js";

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
      ctx.lineWidth = r * 0.17;
      ctx.shadowColor = "yellow";
      ctx.shadowBlur = r * 0.51;
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
  if (game.animation) {
    return;
  }
  const p = game.players[game.currentPlayerId];

  const nx = p.x + dx;
  const ny = p.y + dy;

  // ボード外チェック
  if (nx < 0 || ny < 0 || nx >= game.board.length || ny >= game.board.length) {
    return; // 動かない
  }

  // 他プレイヤーがいるマスには入れない
  for (const other of game.players) {
    if (other !== p && other.x === nx && other.y === ny) {
      return; // 動かない
    }
  }

  // 他人の色のマスには入れない
  const tileColor = game.board[nx][ny].color;
  if (tileColor && tileColor !== pastelColors[p.color]) {

    // ハイライトセット
    game.highlight = { x: nx, y: ny };
    render();

    setTimeout(() => {
      if (confirm("このマスを無色化しますか？")) {
        game.board[nx][ny].color = null;
        game.remainingActions--;
        updateTurnInfo();
        game.highlight = null; // ハイライト解除
        render();
        // アクションが尽きたらターン終了
        if (game.remainingActions <= 0) {
          endTurn();
        }
      } else {
        game.highlight = null; // キャンセル時も解除
        render();
      }
    }, 50);
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

    triggerTreasureAnimation(nx, ny);

    const spreadMin = game.tileSize * 0.8;
    const spreadMax = game.tileSize * 1.4;
    for (let i = 0; i < 10; i++) {
      game.animation.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0,
        maxDist: spreadMin + Math.random() * (spreadMax - spreadMin),
        alpha: 1
      });
    }

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
    setTimeout(() => endGame(), 3500);
    return; // これ以上処理しない
  }

  // アクションが尽きたらターン終了
  if (game.remainingActions <= 0) {
    endTurn();
  }
}
