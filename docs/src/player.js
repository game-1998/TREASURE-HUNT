import { game, updateGlowStates } from "./state.js";
import { render, renderPlayerInfo, triggerTreasureAnimation, updateTreasureInfo, updateTurnInfo } from "./ui.js";
import { endTurn, endGame } from "./turn.js";
import { ColorMap } from "./state.js";

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
      color: game.selectedColors[i],
      name: game.playerNames[i],
      isGlowing: false,
      specialUsed: false,
      openedTreasure: false,
      collectedChests: [],
      score: 0
    });
  }
  
  shuffle(game.players);

  for (let i = 0; i < game.playerCount; i++) {
    game.players[i].x = positions[i].x
    game.players[i].y = positions[i].y
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
  if (game.animation || game.locked || !game.mode == "normal") {
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
  const playerId = game.currentPlayerId;
  const playerColor = game.players[playerId].color;   // 濃い色
  const myColor = ColorMap[playerColor];              // パステル色

  if (tileColor && tileColor !== myColor) {

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
  treasureJudge(nx, ny);

  // 全プレイヤーの光る状態を更新
  updateGlowStates();

  // 移動したマスを自分の色に塗る
  game.board[nx][ny].color = ColorMap[playerColor];
  
  // アクション消費
  game.remainingActions--;
  updateTurnInfo();

  render();

  // 残り宝箱が0ならゲーム終了
  if (game.remainingTreasures === 0) {
    game.locked = true;
    setTimeout(() => endGame(), 3500);
    return; // これ以上処理しない
  }

  // アクションが尽きたらターン終了
  if (game.remainingActions <= 0) {
    endTurn();
  }
}

export function warp (x, y) {
  if (game.board[x][y].color === null) {
    const playerId = game.currentPlayerId;
    const p = game.players[playerId];
    const playerColor = p.color;
    setTimeout(() => {
      if (confirm("このマスにワープしますか？")) {
        p.x = x;
        p.y = y;

        // 宝箱取得チェック
        treasureJudge(x, y);

        // 全プレイヤーの光る状態を更新
        updateGlowStates();

        // 移動したマスを自分の色に塗る
        game.board[x][y].color = ColorMap[playerColor];
        game.highlight = null; // ハイライト解除
        render();

        game.remainingActions--;
        updateTurnInfo();
        
        game.mode = "normal"; 
        p.specialUsed = true;

        renderPlayerInfo();

        // 残り宝箱が0ならゲーム終了
        if (game.remainingTreasures === 0) {
          game.locked = true;
          setTimeout(() => endGame(), 3500);
          return; // これ以上処理しない
        }

        // アクションが尽きたらターン終了
        if (game.remainingActions <= 0) {
          endTurn();
        }
      } else {
        game.highlight = null;
        render();        
      }
    }, 50);
    game.mode = "normal";
  }
}

// 宝箱取得判定
function treasureJudge (nx, ny) {
  if (game.board[nx][ny].treasure) {
    const chest = game.board[nx][ny].treasure;
    game.board[nx][ny].treasure = false;     // マスから消す
    const playerId = game.currentPlayerId;
    const p = game.players[playerId];
    p.collectedChests.push({ x: nx, y: ny, score: chest.score }); // プレイヤーに追加
    p.score += chest.score;
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
    renderPlayerInfo();
  }
}

export function clearBoardAbility() {
  const size = game.boardSize;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      game.board[x][y].color = null;
    }
  }

  updateGlowStates();

  const p = game.players[game.currentPlayerId];
  p.specialUsed = true;
  renderPlayerInfo();

  game.remainingActions--;
  updateTurnInfo();

  render();

  if (game.remainingActions <= 0) {
    endTurn();
  }
}

export function paintRandomAbility() {
  const size = game.boardSize;
  const p = game.players[game.currentPlayerId];
  const myColor = ColorMap[p.color];

  // 全マス（宝箱ありも含む）から「塗ってよいマス」を集める
  const candidates = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const tile = game.board[x][y];
      // すでに色がついているマスは対象外
      if (tile.color === null) {
        candidates.push({ x, y });
      }
    }
  }

  // 塗る数（1辺ぶん）
  const count = size;

  // シャッフル
  shuffle(candidates);

  // 先頭 count 個を塗る
  const targets = candidates.slice(0, count);
  for (const t of targets) {
    game.board[t.x][t.y].color = myColor;
  }

  // 光る状態更新
  updateGlowStates();

  // 使用済みにする
  p.specialUsed = true;
  renderPlayerInfo();

  // アクション消費
  game.remainingActions--;
  updateTurnInfo();

  // 描画
  render();

  // ターン終了判定
  if (game.remainingActions <= 0) {
    endTurn();
  }
}

export function randomMoveAbility(targetId) {
  const size = game.boardSize;
  const target = game.players[targetId];
  const targetColor = ColorMap[target.color];

  // 対象プレイヤーの色のマスを全部集める
  const candidates = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (game.board[x][y].color === targetColor) {
        candidates.push({ x, y });
      }
    }
  }

  // 移動先がない場合
  if (candidates.length === 0) {
    // スキル消費
    const p = game.players[game.currentPlayerId];
    p.specialUsed = true;
    renderPlayerInfo();

    game.highlight = null;
    game.remainingActions--;
    updateTurnInfo();
    render();

    if (game.remainingActions <= 0) {
      endTurn();
    }

    game.mode = "normal";
    return;
  }

  // ランダムに1つ選ぶ
  const pos = candidates[Math.floor(Math.random() * candidates.length)];

  // 移動
  target.x = pos.x;
  target.y = pos.y;

  // 宝箱取得判定（移動先に宝箱があれば）
  treasureJudge(pos.x, pos.y);

  // スキル消費
  const p = game.players[game.currentPlayerId];
  p.specialUsed = true;
  renderPlayerInfo();

  // アクション消費
  game.remainingActions--;
  updateTurnInfo();

  game.highlight = null;
  // 描画
  render();

  // ターン終了判定
  if (game.remainingActions <= 0) {
    endTurn();
  }

  // モード解除
  game.mode = "normal";
}

export function getPlayerAt(x, y) {
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i];
    if (p.x === x && p.y === y) {
      return i; // プレイヤーID（インデックス）を返す
    }
  }
  return null; // 誰もいない
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

