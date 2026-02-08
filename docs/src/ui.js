import { game } from "./state.js";
import { drawBoard } from "./boad.js";
import { drawPlayers } from "./player.js";

const chestImg = new Image();
chestImg.src = "./src/images/chest_close.png";

export function showScreen(name) {
  document.getElementById("homeScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "none";

  document.getElementById(name).style.display = "block";
}

export function render() {
  drawBoard();
  drawPlayers();
  if (game.animation) {
    drawTreasureAnimation();
    requestAnimationFrame(render);
  }
}

export function updateTurnInfo() {
  const div = document.getElementById("turnInfo");
  const current = game.players[game.currentPlayerId];

  div.textContent = `ターン: ${current.name}　残りアクション: ${game.remainingActions}回`;
}

export function updateTreasureInfo() {
  const el = document.getElementById("treasureInfo");
  el.textContent = `残り宝箱: ${game.remainingTreasures}`;
}

export function renderResultScreen() {
  const area = document.getElementById("resultArea");
  area.innerHTML = ""; // 初期化

  for (const player of game.players) {
    let total = 0;

    const chestLines = player.collectedChests.map(c => {
      total += c.score;
      return `・${c.score} 点`;
    }).join("<br>");

    area.innerHTML += `
      <div class="playerResult">
        <h3>${player.name}</h3>
        <p>宝箱: ${player.collectedChests.length} 個</p>
        <p>${chestLines}</p>
        <p><strong>合計: ${total} 点</strong></p>
        <hr>
      </div>
    `;
  }
}

export function triggerTreasureAnimation(x, y) {
  game.animation = {
    x,
    y,
    progress: 0, // 0 → 1 で進む
    particles: []
  };
}

export function drawTreasureAnimation() {
  console.log("drawTreasureAnimation 呼び出し", game.animation.progress);

  const canvas = document.getElementById("boardCanvas");
  const ctx = canvas.getContext("2d");

  const { x, y, progress } = game.animation;
  const t = progress;

  // タイル中央
  const baseX = x * game.tileSize + game.tileSize / 2;
  const baseY = y * game.tileSize + game.tileSize / 2;

  let scale = 1;
  let alpha = 1;
  let offsetY = 0;

  // --- 出現（0〜0.4秒） ---
  if (t < 0.6) {
    const p = t / 0.6;
    scale = 0.6 + p * 0.6; // 0.6 → 1.2
    alpha = p;            // 0 → 1
    offsetY = 0;
  }
  // --- 余韻（0.4〜2.4秒） ---
  else if (t < 2.4) {
    scale = 1.0;
    alpha = 1.0;
    offsetY = 0;
  }
  // --- 上にスライドしながらフェードアウト（2.4〜3.0秒） ---
  else {
    const p = (t - 2.4) / 0.6; // 0 → 1
    scale = 1.0;
    alpha = 1 - p;            // 1 → 0
    offsetY = -20 * p;        // 0 → -20px（固定距離）
  }

  // --- 後光（光のリング） ---
  if (t > 0.6 && t < 1.8) {
    console.log("後光描画中 t=", t);
    const p = (t - 0.6) / 1.2; // 0 → 1
    const radius = game.tileSize * 2 * p;
    const alpha = 0.6 * (1 - p);

    const grad = ctx.createRadialGradient(
      baseX, baseY, 0,
      baseX, baseY, radius
    );
    grad.addColorStop(0, `rgba(255,255,200,${alpha})`);
    grad.addColorStop(1, `rgba(255,255,200,0)`);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(baseX, baseY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  console.log("粒子数:", game.animation.particles.length);
  // --- キラキラ粒子 ---
  if (t > 0.6 && t < 2) {
    const particleSize = game.tileSize * 0.035;
    for (const p of game.animation.particles) {
      // 進行
      p.dist = p.maxDist * ((t - 0.6) / 1.4);
      p.alpha = 1 - ((t - 0.6) / 1.4);

      const px = baseX + Math.cos(p.angle) * p.dist;
      const py = baseY + Math.sin(p.angle) * p.dist;

      console.log("粒子描画 px,py=", px, py, "alpha=", p.alpha);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  const size = game.tileSize * 0.85 * scale;
  ctx.drawImage(
    chestImg,
    baseX - size / 2,
    baseY - size / 2 + offsetY,
    size,
    size
  );

  ctx.restore();

  // 3秒で progress が 3.0 になるように進める
  game.animation.progress += 1 / 60; // 60fps → 1秒で1進む

  if (game.animation.progress >= 3.0) {
    game.animation = null;
  }
}

