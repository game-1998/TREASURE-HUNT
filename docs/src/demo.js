import { darken, lighten } from "./player.js";
import { ColorMap } from "./state.js";
import { wait } from "./utils.js";
const demo = {
  board: [],
  players: [],
  tileSize: 0,
  animationType: null,
  animation: null,
  canvas: null,
  ctx: null,
};

const demoPaintPattern = [
  { x: 3, y: 1 },
  { x: 5, y: 3 },
  { x: 2, y: 5 },
  { x: 4, y: 2 },
  { x: 6, y: 0 },
  { x: 3, y: 6 },
  { x: 0, y: 4 },
];

let allClearCancelToken = 0;
let paintCancelToken = 0;

function startDemoRenderLoop() {
  function loop() {
    if (!demo.animationType) return; // ← これで終了できる

    demo.ctx.clearRect(0, 0, demo.canvas.width, demo.canvas.height);

    drawDemoBoard();
    drawDemoPlayers();

    if (demo.animationType === "tornado") drawDemoTornado();
    if (demo.animationType === "warp") {
        updateDemoWarp(performance.now());
        drawDemoWarp();
    }
    if (demo.animationType === "paint") drawDemoPaint();

    demoLoopId = requestAnimationFrame(loop);
  }

  // ★ ここを1回だけにする
  demoLoopId = requestAnimationFrame(loop);
}

// ------------------------------
// デモ用ステート（本編と完全に独立）
// ------------------------------
let demoLoopId = null;

// ------------------------------
// デモ初期化
// ------------------------------
function initDemoState() {
  demo.board = [];
  demo.players = [];
  demo.tileSize = 0;
  demo.animationType = null;
  demo.animation = null;
  demo.canvas = null;
  demo.ctx = null;
}

// ------------------------------
// ボード生成（7×7・宝箱なし）
// ------------------------------
function createDemoBoard() {
  const size = 7;
  demo.board = [];
  for (let x = 0; x < size; x++) {
    demo.board[x] = [];
    for (let y = 0; y < size; y++) {
      demo.board[x][y] = { color: null };
    }
  }
}

// ------------------------------
// プレイヤー生成（2人）
// ------------------------------
function createDemoPlayers(x1, y1, x2, y2) {
  demo.players = [
    { x: x1, y: y1, color: "#1A2BE6", isGlowing: false },
    { x: x2, y: y2, color: "#E62057", isGlowing: false }
  ];
}

// ------------------------------
// ボード描画（本編の軽量版）
// ------------------------------
function drawDemoBoard() {
  const ctx = demo.ctx;
  const size = demo.board.length;
  const cell = demo.tileSize;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const tile = demo.board[x][y];

      ctx.fillStyle = tile.color || "#ddd";
      ctx.fillRect(x * cell, y * cell, cell, cell);

      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cell, y * cell, cell, cell);
    }
  }
}

function drawDemoPlayer(ctx, p) {
  const cell = demo.tileSize;

  const cx = p.x * cell + cell / 2;
  const cy = p.y * cell + cell / 2;

  const r = demo.tileSize * 0.3;
  
  // --- インナーグロー（中心が少し明るい） ---
  const grad = ctx.createRadialGradient(cx, cy, 0.1, cx, cy, r);
  grad.addColorStop(0, lighten(p.color, 0.1));  // 中心を明るく
  grad.addColorStop(0.4, p.color);              // 中間はそのまま
  grad.addColorStop(1, darken(p.color, 0.15));  // 外側を暗く
  
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ------------------------------
// プレイヤー描画（本編そのまま）
// ------------------------------
function drawDemoPlayers() {
  const ctx = demo.ctx;
  const anim = demo.animation;

  demo.players.forEach((p, i) => {
    // ワープ中の駒はここでは描かない（warp 専用で描く）
    if (demo.animationType === "warp" && anim && anim.playerId === i) return;
    if (demo.animationType === "tornado"
            && i === 1
            && ((demo.animation.progress > 0.25 && demo.animation.phase === "out")
            || demo.animation.phase === "in"))
        {
          return;
        }
    drawDemoPlayer(ctx, p);
  });
}

// ------------------------------
// デモ停止
// ------------------------------
function stopDemoAnimation() {
  if (demoLoopId) cancelAnimationFrame(demoLoopId);
  demoLoopId = null;

  allClearCancelToken++;
  paintCancelToken++;

  const flash = document.getElementById("demoClearFlash");
  if (flash) flash.style.display = "none";

}

// ------------------------------
// ★ スキル説明アニメ起動（7×7・2人対応版）
// ------------------------------
export function startDemoSkillAnimation(index, canvas) {
  stopDemoAnimation();     // 前のデモを完全停止
  initDemoState();         // 新しいデモステートを作成

  // Canvas セットアップ
  demo.canvas = canvas;
  demo.ctx = canvas.getContext("2d");

  const width = canvas.clientWidth || canvas.offsetWidth || 300;
  canvas.width = width;
  canvas.height = width;

  demo.tileSize = width / 7; // ← 7×7固定

  // デモ用ボードとプレイヤーを生成
  createDemoBoard();

  // スキルごとのアニメ開始
  switch (index) {
    case 0:
      createDemoPlayers(1, 1, 5, 5);
      startDemoWarp();
      break;
    case 1:
      createDemoPlayers(4, 2, 3, 5);
      startDemoAllClear();
      break;
    case 2:
      createDemoPlayers(1, 1, 5, 5);
      startDemoPaint();
      break;
    case 3:
      createDemoPlayers(4, 2, 3, 5);
      startDemoRandomMove();
      break;
  }

  // レンダーループ開始
  startDemoRenderLoop();
}

function startDemoWarp() {
  demo.animationType = "warp";
  const area_1P = [{ x:0, y:0 }, { x:1, y:0 }, { x:1, y:1 }];
  const area_2P = [{ x:6, y:6 }, { x:6, y:5 }, { x:5, y:5 }];
  
  for (let i = 0; i < 3; i++) {
    demo.board[area_1P[i].x][area_1P[i].y].color = ColorMap[demo.players[0].color];
    demo.board[area_2P[i].x][area_2P[i].y].color = ColorMap[demo.players[1].color];
  }

  demo.animation = {
    phase: "stay0",
    progress: 0,
    duration: 600,
    start: null,

    playerId: 0,     // デモでは1Pをワープ対象にする
    fromX: demo.players[0].x,
    fromY: demo.players[0].y,
    toX: 3,          // デモ用ワープ先（中央付近）
    toY: 3,
  };
}

function drawDemoWarp() {
  const ctx = demo.ctx;
  const anim = demo.animation;
  if (!anim) return;

  const piece = demo.players[anim.playerId];
  const progress = anim.progress;
  const cellSize = demo.tileSize;

  const t = (anim.phase === "out") ? progress : (1 - progress);

  const cx = piece.x * cellSize + cellSize / 2;
  const cy = piece.y * cellSize + cellSize / 2;

  const particleCount = 8;
  const minSize = 2.4;
  const maxSize = 6.4;
  const radiusMax = cellSize * 0.5;
  const spiralTime = 0.6;

  let radius = 0;
  if (anim.phase === "out") {
    radius = radiusMax * (1 - progress / spiralTime);
    if (progress > spiralTime) radius = 0;
    if (progress > spiralTime + 0.1) {
      const explodeT = (progress - spiralTime - 0.1) / (1 - spiralTime - 0.1);
      radius = radiusMax * explodeT;
    }
  } else if (anim.phase === "in") {
    radius = radiusMax * progress;
  }

  const particleSize = minSize + (maxSize - minSize) * (radius / radiusMax);

  let particleAlpha = 0, pieceAlpha = 1;
  if (anim.phase === "out") {
    if (progress < spiralTime + 0.1) {
      particleAlpha = 1;
      pieceAlpha = 1;
    } else {
      const fadeT = ((progress - spiralTime) / (1 - spiralTime)) ** 2;
      particleAlpha = 1 - fadeT;
      pieceAlpha = 1 - fadeT;
    }
  } else if (anim.phase === "stay1") {
    pieceAlpha = 0;
  } else if (anim.phase === "in") {
    pieceAlpha = progress;
    particleAlpha = progress / 0.9;
    if (progress > 0.9) {
      particleAlpha = (1 - progress) / 0.1;
    }
  }

  const coreColor = `rgba(255,255,255,${particleAlpha})`;

  ctx.save();
  ctx.globalAlpha = pieceAlpha;
  drawDemoPlayer(ctx, piece);

  for (let i = 0; i < particleCount; i++) {
    let angleBase = (i / particleCount) * Math.PI * 2;
    let angle;

    if (anim.phase === "out") {
      if (progress < spiralTime) {
        angle = angleBase + (progress / spiralTime * Math.PI * 2) ** 1.4;
      } else {
        angle = angleBase;
      }
    } else if (anim.phase === "in") {
      if (progress < 0.1) {
        angle = angleBase;
      } else {
        angle = angleBase + (progress - 0.1) * 6;
      }
    }

    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    const rotation = angle * 1.2 + t * 4;

    drawDemoShuriken(ctx, px, py, particleSize, rotation, coreColor);
  }

  ctx.restore();
}

function drawDemoShuriken(ctx, x, y, size, rotation, coreColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const armLength = size;
  const baseWidth = size * 0.45;
  const tipWidth  = size * 0.15;
  const innerR    = size * 0.35;

  ctx.beginPath();

  ctx.moveTo(-baseWidth/2, -innerR);
  ctx.lineTo(-tipWidth/2, -armLength);
  ctx.lineTo( tipWidth/2, -armLength);
  ctx.lineTo( baseWidth/2, -innerR);

  ctx.quadraticCurveTo(innerR, -innerR, innerR, -baseWidth/2);
  ctx.lineTo(armLength, -tipWidth/2);
  ctx.lineTo(armLength,  tipWidth/2);
  ctx.lineTo(innerR,  baseWidth/2);

  ctx.quadraticCurveTo(innerR, innerR, baseWidth/2, innerR);
  ctx.lineTo( tipWidth/2, armLength);
  ctx.lineTo(-tipWidth/2, armLength);
  ctx.lineTo(-baseWidth/2, innerR);

  ctx.quadraticCurveTo(-innerR, innerR, -innerR, baseWidth/2);
  ctx.lineTo(-armLength,  tipWidth/2);
  ctx.lineTo(-armLength, -tipWidth/2);
  ctx.lineTo(-innerR, -baseWidth/2);

  ctx.closePath();

  ctx.shadowColor = coreColor;
  ctx.shadowBlur = size * 0.8;

  ctx.fillStyle = coreColor;
  ctx.fill();

  ctx.restore();
}

function updateDemoWarp(now) {
  const anim = demo.animation;
  if (!anim) return;

  if (!anim.start) anim.start = now;
  const elapsed = now - anim.start;
  anim.progress = elapsed / anim.duration;

  if (anim.progress < 1) return;

  anim.progress = 1;

  if (anim.phase === "stay0") {
    anim.phase = "out";
    anim.duration = 2000;   // デモ用に短めでもOK
    anim.progress = 0;
    anim.start = null;
    return;
  }

  if (anim.phase === "out") {
    anim.phase = "stay1";
    anim.duration = 600;   // デモ用に短めでもOK
    anim.progress = 0;
    anim.start = null;
    return;
  }

  if (anim.phase === "stay1") {
    const p = demo.players[anim.playerId];
    p.x = anim.toX;
    p.y = anim.toY;
    demo.board[p.x][p.y].color = ColorMap[p.color];

    anim.phase = "in";
    anim.duration = 2000;
    anim.progress = 0;
    anim.start = null;
    return;
  }

  if (anim.phase === "in") {
    anim.phase = "stay2";
    anim.duration = 700;
    anim.progress = 0;
    anim.start = null;

    return;
  }

  if (anim.phase === "stay2") {
    // 位置更新
    const p = demo.players[anim.playerId];
    demo.board[p.x][p.y].color = null;
    p.x = anim.fromX;
    p.y = anim.fromY;

    // ★ 再スタート（ループ）
    anim.phase = "stay0";
    anim.duration = 600;
    anim.progress = 0;
    anim.start = null;

    return;
  }
}

async function startDemoAllClear() {
  const token = ++allClearCancelToken;
  demo.animationType = "allclear";

  const area_1P = [{ x:0, y:0 }, { x:1, y:0 }, { x:1, y:1 }, { x:2, y:1 }, { x:3, y:1 }, { x:3, y:2 }, { x:4, y:2 }];
  const area_2P = [{ x:6, y:6 }, { x:5, y:6 }, { x:5, y:5 }, { x:5, y:4 }, { x:4, y:4 }, { x:3, y:4 }, { x:3, y:5 }];
  
  for (let i = 0; i < 7; i++) {
    demo.board[area_1P[i].x][area_1P[i].y].color = ColorMap[demo.players[0].color];
    demo.board[area_2P[i].x][area_2P[i].y].color = ColorMap[demo.players[1].color];
  }
  
  const flash = document.getElementById("demoClearFlash");
  const rect = demo.canvas.getBoundingClientRect();
  flash.style.display = "block";
  flash.style.transition = "none";
  flash.style.opacity = 0;
  flash.style.setProperty("--r", "0%");

  // 強制リフロー（transition を確実に無効化する）
  void flash.offsetWidth;
  flash.style.transition = "--r 2.4s ease-out";

  // Canvas の位置に合わせる
  flash.style.width = rect.width + "px";
  flash.style.height = rect.height + "px";
  flash.style.left = rect.left + "px";
  flash.style.top = rect.top + "px";

  // 光を点灯（広がる）
  await wait(900);
  if (token !== allClearCancelToken) return;
  flash.style.opacity = 1;
  flash.style.setProperty("--r", "100%");

  // 光が広がりきったら盤面を全消し
  await wait(2200);
  if (token !== allClearCancelToken) return;
  for (let x = 0; x < demo.board.length; x++) {
    for (let y = 0; y < demo.board.length; y++) {
      demo.board[x][y].color = null;
    }
  }

  // 光を消す
  await wait(500);
  if (token !== allClearCancelToken) return;
  flash.style.transition = "opacity 1s ease-out";
  flash.style.opacity = 0;

  await wait(1500);
  if (token !== allClearCancelToken) return;
  startDemoAllClear();
}

async function startDemoPaint() {
  const area_1P = [{ x:0, y:0 }, { x:1, y:0 }, { x:1, y:1 }];
  const area_2P = [{ x:6, y:6 }, { x:6, y:5 }, { x:5, y:5 }];
  
  for (let i = 0; i < 3; i++) {
    demo.board[area_1P[i].x][area_1P[i].y].color = ColorMap[demo.players[0].color];
    demo.board[area_2P[i].x][area_2P[i].y].color = ColorMap[demo.players[1].color];
  }

  const token = ++paintCancelToken;
  demo.animationType = "paint";

  await wait(900);
  if (token !== paintCancelToken) return;

  // デモ用固定パターンを本編と同じ形式に変換
  const targets = demoPaintPattern.map((t, i) => ({
    x: t.x,
    y: t.y,
    offset: i * 200,   // 本編と同じ
    duration: 1000,    // 本編と同じ
    colored: false,
    sound: false
  }));

  demo.animation = {
    targets,
    playerColor: ColorMap[demo.players[0].color], // デモは1P色で統一
    base: null,
    token
  };

  requestAnimationFrame(loopDemoPaint);
}

function loopDemoPaint(now) {
  const anim = demo.animation;
  if (!anim) return;
  if (anim.token !== paintCancelToken) return; // タブ切り替えで停止
  if (demo.animationType !== "paint") return;

  if (anim.base === null) anim.base = now;

  let allDone = true;

  for (const t of anim.targets) {
    const start = anim.base + t.offset;
    const end   = start + t.duration;

    // 色を付けるタイミング（本編と同じ）
    if (!t.colored && now >= start) {
      demo.board[t.x][t.y].color = anim.playerColor;
      t.colored = true;
    }

    // 光が残っているか？
    if (now < end) allDone = false;
  }

  if (!allDone) {
    requestAnimationFrame(loopDemoPaint);
    return;
  }

  // 完了
  finishDemoPaint(anim.token);
}

function drawDemoPaint() {
  const anim = demo.animation;
  if (!anim) return;

  const ctx = demo.ctx;
  const cell = demo.tileSize;
  const now = performance.now();

  for (const t of anim.targets) {
    const start = anim.base + t.offset;
    const end   = start + t.duration;

    if (now < start || now > end) continue;

    const progress = (now - start) / t.duration;
    const px = t.x * cell;
    const py = t.y * cell;

    const d = cell * progress / 5;
    ctx.strokeStyle = `rgba(235,250,100,${(1 - progress) ** 2})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(px - d, py - d, cell + 2 * d, cell + 2 * d);
  }
}

async function finishDemoPaint(token) {
  // 500ms の間を置く
  await wait(800);
  if (token !== paintCancelToken) return;

  // 塗ったマスを無色に戻す
  for (const t of demoPaintPattern) {
    demo.board[t.x][t.y].color = null;
  }

  // 再スタート
  if (token === paintCancelToken && demo.animationType === "paint") {
    startDemoPaint();
  }
}

function startDemoRandomMove() {
  demo.animationType = "tornado";

  const area_1P = [{ x:0, y:0 }, { x:1, y:0 }, { x:1, y:1 }, { x:2, y:1 }, { x:3, y:1 }, { x:3, y:2 }, { x:4, y:2 }];
  const area_2P = [{ x:6, y:6 }, { x:5, y:6 }, { x:5, y:5 }, { x:5, y:4 }, { x:4, y:4 }, { x:3, y:4 }, { x:3, y:5 }];
  
  for (let i = 0; i < 7; i++) {
    demo.board[area_1P[i].x][area_1P[i].y].color = ColorMap[demo.players[0].color];
    demo.board[area_2P[i].x][area_2P[i].y].color = ColorMap[demo.players[1].color];
  }

  //const p = demo.players[1]; // デモでは2Pを動かす

  demo.animation = {
    phase: "stay0",
    progress: 0,
    duration: 600, // 本編と同じ
    playerId: 1,
    toX: 5,
    toY: 6,
    passed: false,
    start: null
  };

  requestAnimationFrame(loopDemoTornado);
}

function loopDemoTornado(now) {
  const anim = demo.animation;
  if (!anim) return;

  if (!anim.start) anim.start = now;
  const elapsed = now - anim.start;
  anim.progress = elapsed / anim.duration;

  if (anim.progress < 1) {
    requestAnimationFrame(loopDemoTornado);
    return;
  }

  anim.progress = 1;
  const p = demo.players[anim.playerId];

  if (anim.phase === "stay0") {
    // out フェーズへ
    anim.phase = "out";
    anim.progress = 0;
    anim.start = null;
    anim.duration = 3000;
    requestAnimationFrame(loopDemoTornado);
    return;
  }

  if (anim.phase === "out") {
    // 位置更新
    p.x = anim.toX;
    p.y = anim.toY;

    // in フェーズへ
    anim.phase = "in";
    anim.progress = 0;
    anim.start = null;
    anim.duration = 2500;

    requestAnimationFrame(loopDemoTornado);
    return;
  }

  if (anim.phase === "in") {
    // in フェーズへ
    anim.phase = "stay1";
    anim.progress = 0;
    anim.start = null;
    anim.duration = 700;

    requestAnimationFrame(loopDemoTornado);
    return;
  }

  if (anim.phase === "stay1") {
    // in フェーズへ
    anim.phase = "stay0";
    anim.progress = 0;
    anim.start = null;
    anim.duration = 600;
    demo.players[anim.playerId].x = 3;
    demo.players[anim.playerId].y = 5;

    requestAnimationFrame(loopDemoTornado);
    return;
  }

  if (demo.animationType === "tornado") {
    startDemoRandomMove();
  }
}

function drawDemoTornado() {
  const anim = demo.animation;
  if (!anim) return;

  const ctx = demo.ctx;
  const piece = demo.players[anim.playerId];
  const cell = demo.tileSize;

  // in フェーズは tornado の中では描かず、プレイヤーだけ描く
  if (anim.phase !== "out") {
    drawDemoTornadoPlayer(ctx, piece);
    return;
  }

  // 横移動（左→右）
  const moveDist = cell * 2; 
  const ease = anim.progress - 0.5;
  const offsetX = moveDist * ease;

  // あなたが調整した位置（0.9）＋ 横移動
  const cx = piece.x * cell + cell / 2 + offsetX;
  const cy = piece.y * cell + cell * 0.9;

  ctx.save();
  ctx.translate(cx, cy);

  const layers = 14;
  const maxR = cell * 0.5;
  const minR = cell * 0.05;
  const height = cell * 1.1;

  const tAnim = anim.progress;

  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0:上, 1:下
    const r = maxR * (1 - t) + minR * t;
    const yPos = -height * (1 - t);

    // 揺れプロファイル（真ん中最大・上軽く・下ゼロ）
    let base = 1 - Math.abs(t - 0.3) / 0.7;
    base = Math.max(0, base);

    const maxAmp = 8;
    let swayAmp = maxAmp * base;

    if (t > 0.85) swayAmp = 0; // 下は固定

    const sway = Math.sin(tAnim * Math.PI * 6 + t * 5) * swayAmp;

    ctx.save();
    ctx.translate(sway, 0);

    // フェードイン・フェードアウト
    let fade = 1;
    if (anim.progress < 0.15) {
      fade *= anim.progress / 0.15;
    } else if (anim.progress > 0.9) {
      fade *= (1 - anim.progress) / 0.1;
    }

    const alpha = (0.30 + (1 - t) * 0.18) * fade;

    ctx.beginPath();
    ctx.ellipse(0, yPos, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();

    ctx.restore();
  }

  // プレイヤーを最後に描く
  drawDemoTornadoPlayer(ctx, piece);

  ctx.restore();
}

function drawDemoTornadoPlayer(ctx, piece) {
  const anim = demo.animation;
  const p = anim.progress;
  const cell = demo.tileSize;

  ctx.save();

  if (anim.phase === "out") {
    // ★ 張り付きアニメ（0.25〜1）
    if (p > 0.25 && p < 1) {
      const t = (p - 0.25) / 0.75; // 0→1

      const maxR = cell * 0.45;
      const radius = maxR * t;

      const angle = t * Math.PI * 6;

      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(-t * Math.PI / 2) * cell;

      ctx.translate(tx, ty);

      const flip = Math.sin(t * Math.PI * 6);
      ctx.scale(flip, 1);

      const depth = (flip + 1) / 2;
      const scale = 1 - depth * 0.3;
      ctx.scale(scale, scale);
      ctx.globalAlpha = 1 - depth * 0.4;

      const r = cell * 0.3;
      const grad = ctx.createRadialGradient(0, 0, 0.1, 0, 0, r);
      grad.addColorStop(0, lighten(piece.color, 0.1));
      grad.addColorStop(0.4, piece.color);
      grad.addColorStop(1, darken(piece.color, 0.15));

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
      return;
    }
  }

  if (anim.phase === "in") {
    const cx = piece.x * cell + cell / 2;
    const cy = piece.y * cell + cell / 2;

    ctx.translate(cx, cy);

    if (p < 0.1) {
      const fall = (0.1 - p) * 5;
      ctx.translate(0, -fall * cell);
      ctx.globalAlpha = p / 0.1;
    } else {
      ctx.globalAlpha = 1;
      const tt = (p - 0.1) / 0.9;

      const spin = 10 * Math.PI * tt ** 1.5;
      ctx.rotate(spin);

      const squash = 1 - Math.abs(Math.cos(10 * Math.PI * tt ** 1.5)) * 0.4 * (1 - tt);
      ctx.scale(1, squash);
    }

    const r = cell * 0.3;
    const grad = ctx.createRadialGradient(0, 0, 0.1, 0, 0, r);
    grad.addColorStop(0, lighten(piece.color, 0.1));
    grad.addColorStop(0.4, piece.color);
    grad.addColorStop(1, darken(piece.color, 0.15));

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
    return;
  }

  ctx.restore();
}
