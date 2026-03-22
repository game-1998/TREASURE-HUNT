import { game, updateGlowStates } from "./state.js";
import { playAllClearEffect, render, renderPlayerInfo, triggerTreasureAnimation,
         updateTreasureInfo, updateTurnInfo } from "./ui.js";
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

export function drawSinglePlayer(ctx, p) {
  const cx = p.x * game.tileSize + game.tileSize / 2;
  const cy = p.y * game.tileSize + game.tileSize / 2;
  const r = game.tileSize * 0.3;

  // --- インナーグロー（中心が少し明るい） ---
  const grad = ctx.createRadialGradient(cx, cy, 0.1, cx, cy, r);
  grad.addColorStop(0, lighten(p.color, 0.1));  // 中心を明るく
  grad.addColorStop(0.4, p.color);              // 中間はそのまま
  grad.addColorStop(1, darken(p.color, 0.15));  // 外側を暗く

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 光る演出（外側のオーラ）
  if (p.isGlowing) {
    ctx.save();
    ctx.strokeStyle = "#e5ff00";
    ctx.lineWidth = r * 0.17;
    ctx.shadowColor = "#e5ff00";
    ctx.shadowBlur = r * 0.51;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawPlayers() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  for (let p of game.players) {
    //ワープ中のプレイヤーは描かない
    if (game.animationType === "warp" && game.animation.playerId === game.players.indexOf(p)) {
      continue;
    }
    drawSinglePlayer(ctx, p);
  }
}

// 色を明るくする
function lighten(hex, amount) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) + Math.floor(255 * amount);
  let g = ((c >> 8) & 0xff) + Math.floor(255 * amount);
  let b = (c & 0xff) + Math.floor(255 * amount);
  return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
}

// 色を暗くする
function darken(hex, amount) {
  const c = parseInt(hex.slice(1), 16);
  let r = (c >> 16) - Math.floor(255 * amount);
  let g = ((c >> 8) & 0xff) - Math.floor(255 * amount);
  let b = (c & 0xff) - Math.floor(255 * amount);
  return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

export function movePlayer(dx, dy) {
  if (game.animation || game.animationType || game.locked || !game.mode == "normal") {
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
    //const playerColor = p.color;

    setTimeout(() => {
      if (confirm("このマスにワープしますか？")) {

        // ★ ワープアニメーション開始
        game.animationType = "warp";
        game.animation = {
          phase: "out",
          progress: 0,
          duration: 2000,
          fromX: p.x,
          fromY: p.y,
          toX: x,
          toY: y,
          playerId
        };

        triggerWarpAnimation();

        // ★ 位置はまだ変えない（ここが重要）
        game.highlight = null;
        p.specialUsed = true;
        render();
      } else {
        game.highlight = null;
        render();
      }
    }, 50);
    game.mode = "normal";
  }
}

export function drawWarpAnimation() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  const anim = game.animation;
  const piece = game.players[anim.playerId];
  const progress = anim.progress;
  const cellSize = game.tileSize;

  // out: progress 0→1（消える）
  // in : progress 0→1（現れる）
  const t = (anim.phase === "out") ? progress : (1 - progress);

  // プレイヤーの中心座標
  const cx = piece.x * cellSize + cellSize / 2;
  const cy = piece.y * cellSize + cellSize / 2;

  // -----------------------------
  // 3. スパイラルパーティクル設定
  // -----------------------------
  const particleCount = 8;

  // 手裏剣サイズ（中心に近いほど小さく）
  const minSize = 3;   // 中心付近の最小サイズ
  const maxSize = 8;  // 外側の最大サイズ
  const radiusMax = cellSize * 0.5;

  let radius;
  const spiralTime = 0.6

  if (anim.phase === "out") {
    // 吸い込み：外 → 中央
    radius = radiusMax * (1 - progress / spiralTime);

    if (progress > spiralTime) {
      radius = 0;
    }
    // 弾け：progress が 0.9 を超えたら外へ飛ぶ
    if (progress > spiralTime + 0.1) {
      const explodeT = (progress - spiralTime - 0.1) / (1 - spiralTime - 0.1); // 0→1
      radius = radiusMax * explodeT;
    }
  } else {
    // ---- IN：OUT の逆再生（中央 → 外） ----
    // progress は 0→1 なので、OUT の (1-progress) を再生する
    radius = radiusMax * progress;
  }

  // radius はすでに計算済みなので、それを使う
  const particleSize = minSize + (maxSize - minSize) * (radius / radiusMax);

  let particleAlpha, pieceAlpha;

  if (anim.phase === "out") {
    if (progress < spiralTime + 0.1) {
      // 吸い込み中：濃いまま
      particleAlpha = 1;
      pieceAlpha = 1;
    } else {
      // 弾けた後：だんだん透明になる
      const fadeT = ((progress - spiralTime) / (1 - spiralTime)) ** 2; // 0→1
      particleAlpha = 1 - fadeT;           // 1→0
      pieceAlpha = 1 - fadeT;
    }
  } else {
    // IN は今まで通り（逆再生）
    pieceAlpha = progress;
    particleAlpha = progress / 0.9;
    if (progress > 0.9) {
      particleAlpha = (1 - progress) /0.1;
    }
  }

  const coreColor = `rgba(255,255,255,${particleAlpha})`;

  // -----------------------------
  // 5. コマ本体の描画（グリッチ＋フェード）
  // -----------------------------
  ctx.save();
  ctx.globalAlpha = pieceAlpha;
  drawSinglePlayer(ctx, piece);
  
  // -----------------------------
  // 4. パーティクル描画
  // -----------------------------
  for (let i = 0; i < particleCount; i++) {
    let angleBase = (i / particleCount) * Math.PI * 2;
    let angle;

    if (anim.phase === "out") {
      if (progress < spiralTime) {
        // 吸い込み中はスパイラルでOK
        angle = angleBase + (progress / spiralTime * Math.PI * 2) ** 1.4;
      } else {
        // ★ 弾けるときは角度固定（直線）
        angle = angleBase;
      }
    } else {
      // IN は OUT の逆再生
      if (progress < 0.1) {
        // 弾け逆再生（外→中心）
        angle = angleBase;
      } else {
        // 吸い込み逆再生（中心→外）
        angle = angleBase + (progress - 0.1) * 6;
      }
    }
    
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;

    const rotation = angle * 1.2 + t * 4;

    drawRoundedShuriken(ctx, px, py, particleSize, rotation, coreColor);
  }



  ctx.restore();
}

function drawRoundedShuriken(ctx, x, y, size, rotation, coreColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const armLength = size;
  const baseWidth = size * 0.45;   // 根本（太い）
  const tipWidth  = size * 0.15;   // 先端（細い）
  const innerR    = size * 0.35;   // 中心の“反る”丸み

  ctx.beginPath();

  // ---- 上の刃（Yマイナス方向） ----
  ctx.moveTo(-baseWidth/2, -innerR);
  ctx.lineTo(-tipWidth/2, -armLength);
  ctx.lineTo( tipWidth/2, -armLength);
  ctx.lineTo( baseWidth/2, -innerR);

  // ---- 右の刃（Xプラス方向） ----
  ctx.quadraticCurveTo(innerR, -innerR, innerR, -baseWidth/2);
  ctx.lineTo(armLength, -tipWidth/2);
  ctx.lineTo(armLength,  tipWidth/2);
  ctx.lineTo(innerR,  baseWidth/2);

  // ---- 下の刃（Yプラス方向） ----
  ctx.quadraticCurveTo(innerR, innerR, baseWidth/2, innerR);
  ctx.lineTo( tipWidth/2, armLength);
  ctx.lineTo(-tipWidth/2, armLength);
  ctx.lineTo(-baseWidth/2, innerR);

  // ---- 左の刃（Xマイナス方向） ----
  ctx.quadraticCurveTo(-innerR, innerR, -innerR, baseWidth/2);
  ctx.lineTo(-armLength,  tipWidth/2);
  ctx.lineTo(-armLength, -tipWidth/2);
  ctx.lineTo(-innerR, -baseWidth/2);

  ctx.closePath();

  // ★ 外側の光（グロー）
  ctx.shadowColor = coreColor;      // 光の色
  ctx.shadowBlur = size * 0.8;      // 光の強さ（調整可）
  
  // ---- コアの色で塗り直し（内側の光） ----
  ctx.fillStyle = coreColor;
  ctx.fill();

  ctx.restore();
}

export function triggerWarpAnimation() {
  const anim = game.animation;
  const start = performance.now();

  function loop(now) {
    const elapsed = now - start;
    anim.progress = elapsed / anim.duration;

    if (anim.progress < 1) {
      requestAnimationFrame(loop);
      return;
    }

    // --- progress が 1 に到達 ---
    anim.progress = 1;

    if (anim.phase === "out") {
      // ★ ここで位置を変える
      const p = game.players[anim.playerId];
      p.x = anim.toX;
      p.y = anim.toY;
      

      // ★ in フェーズへ切り替え
      anim.phase = "in";
      anim.progress = 0;
      game.board[p.x][p.y].color = ColorMap[p.color];

      // ★ in フェーズのアニメーションを開始
      triggerWarpAnimation();
      return;
    }

    // --- in フェーズが終わったらアニメーション完了 ---
    game.animationType = null;
    game.animation = null;

    setTimeout (() => {
      // 完了処理（宝箱方式と同じ）
      const p = game.players[anim.playerId];

      treasureJudge(p.x, p.y);
      updateGlowStates();

      game.remainingActions--;
      updateTurnInfo();
      renderPlayerInfo();
      render();

      if (game.remainingTreasures === 0) {
        game.locked = true;
        setTimeout(() => endGame(), 3200);
        return;
      }

      if (game.remainingActions <= 0) {
        endTurn();
      }
    }, 300);
  }

  requestAnimationFrame(loop);
}

// 宝箱取得判定
function treasureJudge (nx, ny) {
  if (game.board[nx][ny].treasure) {
    game.animationType = "treasure";
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

  // 0.3s 間隔で光が始まるように startTime を付ける
  //const now = performance.now();
  const targets = candidates.slice(0, count).map((t, i) => ({
    x: t.x,
    y: t.y,
    offset: i * 200,  // 0.15秒ずつ遅らせる
    duration: 1000     // 光の長さ
  }));

  game.animation = {
    targets,
    playerColor: myColor
  };
  console.log("drawPaintAnimation start", game.animation);

  triggerPaintAnimation();

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
}

export function triggerPaintAnimation() {
  const anim = game.animation;
  anim.base = null;

  function loop(now) {
    let allDone = true;
    if (anim.base === null) anim.base = now;  // ← ここで基準時間を確定

    for (const t of anim.targets) {
      const start = anim.base + t.offset;
      const end   = start + t.duration;

      // 色を付けるタイミング
      if (!t.colored && now >= start) {
        game.board[t.x][t.y].color = anim.playerColor;
        t.colored = true;
      }

      // 光がまだ残っているか？
      if (now < end) {
        allDone = false;
      }
    }

    if (!allDone) {
      requestAnimationFrame(loop);
      return;
    }

    // 全部終わったら終了
    game.animationType = null;
    game.animation = null;
    updateGlowStates();
    render();
    
    // ターン終了判定
    if (game.remainingActions <= 0) {
      endTurn();
    }
  }
  requestAnimationFrame(loop);
}

export function drawPaintAnimation() {
  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  const anim = game.animation;
  const cell = game.tileSize;
  const now = performance.now();

  for (const t of anim.targets) {
    const start = anim.base + t.offset;
    const end   = start + t.duration;

    if (now < start || now > end) continue;
    
    const progress = (now - start) / t.duration;
    const px = t.x * cell;
    const py = t.y * cell;

    // 枠線光
    const d = cell * progress / 5;
    ctx.strokeStyle = `rgba(235,250,100,${(1 - progress) ** 2})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(px - d, py - d, cell + 2 * d, cell + 2 * d);
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
