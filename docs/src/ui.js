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

  div.innerHTML = `ターン: ${current.name}　残り回数: ${game.remainingActions}回`;
}

export function updateTreasureInfo() {
  const container = document.getElementById("treasureInfo");
  container.innerHTML = "";

  const label = document.createElement("div");
  label.textContent = "残り宝箱：";
  container.appendChild(label);

  const grid = document.createElement("div");
  grid.id = "treasureGrid";
  container.appendChild(grid);

  const max = 10;
  const count = game.remainingTreasures;

  for (let i = 0; i < max; i++) {
    if (i < count) {
      const img = document.createElement("img");
      img.src = "./src/images/chest_close.png";
      img.alt = "treasure";
      grid.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "empty";
      grid.appendChild(empty);
    }
  }
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

  // --- キラキラ粒子 ---
  if (t > 0.6 && t < 2) {
    const particleSize = game.tileSize * 0.05;
    for (const p of game.animation.particles) {
      // 進行
      p.dist = p.maxDist * ((t - 0.6) / 1.4);
      p.alpha = 1 - ((t - 0.6) / 1.4);

      const px = baseX + Math.cos(p.angle) * p.dist;
      const py = baseY + Math.sin(p.angle) * p.dist;

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

export function renderPlayerInfo() {
  const boxes = {
    "top-left": document.getElementById("playerInfoTopLeft"),
    "top-right": document.getElementById("playerInfoTopRight"),
    "bottom-right": document.getElementById("playerInfoBottomRight"),
    "bottom-left": document.getElementById("playerInfoBottomLeft")
  };

  // 一旦全部クリア
  Object.values(boxes).forEach(b => b.innerHTML = "");

  // プレイヤー順に4隅へ固定配置（位置は後で決める）
  const order = ["top-left", "bottom-right", "top-right", "bottom-left"];

  game.players.forEach((p, i) => {
    const box = boxes[order[i]];

    const isRightSide = (i === 1 || i === 2); // ★ 右側だけ反転

    if (isRightSide) {
      // ★ 右側は左右反転レイアウト
      box.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          gap:6px;
          justify-content:flex-end;
        ">
          <span style="text-align:right;">${p.name}</span>
          <div style="width:16px; height:16px; border-radius:50%; background:${p.color};"></div>
          </div>
          <div style="text-align:right;">
            ${p.collectedChests.length} :宝箱
          </div>
      `;
    } else {
      // ★ 左側は従来の並び
      box.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:16px; height:16px; border-radius:50%; background:${p.color};"></div>
          <span>${p.name}</span>
        </div>
        <div style="text-align:left;">
          宝箱: ${p.collectedChests.length}
        </div>
      `;
    }
  });

  // HTML が入って高さが決まった後に位置を決める
  positionPlayerInfoBoxes();
}


function positionPlayerInfoBoxes() {
  const canvas = document.getElementById("boardCanvas");
  const rect = canvas.getBoundingClientRect();

  console.log("=== Canvas rect ===");
  console.log("left:", rect.left, "top:", rect.top);
  console.log("right:", rect.right, "bottom:", rect.bottom);
  console.log("width:", rect.width, "height:", rect.height);

  // 左上
  const tl = document.getElementById("playerInfoTopLeft");
  const tlH = tl.offsetHeight;
  const tlX = rect.left;
  const tlY = rect.top - tlH;
  tl.style.left = tlX + "px";
  tl.style.top = tlY + "px";
  console.log("TopLeft placed at:", tlX, tlY);

  // 右上
  const tr = document.getElementById("playerInfoTopRight");
  const trW = tr.offsetWidth;
  const trH = tr.offsetHeight;
  const trX = rect.right - trW;
  const trY = rect.top - trH;
  tr.style.left = trX + "px";
  tr.style.top = trY + "px";
  console.log("TopRight placed at:", trX, trY);

  // 右下
  const br = document.getElementById("playerInfoBottomRight");
  const brW = br.offsetWidth;
  const brX = rect.right - brW;
  const brY = rect.bottom;
  br.style.left = brX + "px";
  br.style.top = brY + "px";
  console.log("BottomRight placed at:", brX, brY);

  // 左下
  const bl = document.getElementById("playerInfoBottomLeft");
  const blX = rect.left;
  const blY = rect.bottom;
  bl.style.left = blX + "px";
  bl.style.top = blY + "px";
  console.log("BottomLeft placed at:", blX, blY);
}


