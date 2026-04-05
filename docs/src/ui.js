import { game, SkillMap, allPlayersOpened } from "./state.js";
import { drawBoard } from "./boad.js";
import { clearBoardAbility, drawPlayers, drawWarpAnimation, drawPaintAnimation, drawTornadoAnimation } from "./player.js";
import { effectSound, rollSound, stopSound} from "./soundManager.js";

const chestImg = new Image();
chestImg.src = "./src/images/chest_close.png";
export const chestImages = {
  1: "./src/images/chest_1p.png",
  2: "./src/images/chest_2p.png",
  3: "./src/images/chest_3p.png",
  5: "./src/images/chest_5p.png"
};


export function showScreen(name) {
  document.getElementById("homeScreen").style.display = "none";
  document.getElementById("skillScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "none";

  document.getElementById(name).style.display = "block";
}

export function render() {
  console.log("call render");
  drawBoard();
  drawPlayers();

  if (game.animationType === "warp") {
    drawWarpAnimation();
    requestAnimationFrame(render);
    return;
  }

  if (game.animationType === "paintRandom") {
    drawPaintAnimation();
    requestAnimationFrame(render);
    return;
  }

  if (game.animationType === "randomMove") {
    drawTornadoAnimation();
    requestAnimationFrame(render);
    return;
  }
  
  if (game.animationType === "treasure") {
    drawTreasureAnimation();
    requestAnimationFrame(render);
    return;
  }
}

export function updateTurnInfo() {
  const div = document.getElementById("turnInfo");
  const current = game.players[game.currentPlayerId];

  div.innerHTML = `ターン: <strong>${current.name}</strong>　残り回数: <strong>${game.remainingActions}回</strong>`;
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

  const max = game.treasureCount;
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
  area.innerHTML = "";

  game.players.forEach((player, i) => {
    const box = document.createElement("div");
    box.className = "resultPlayerBox";
    box.dataset.playerIndex = i;

    // ★ プレイヤー名の横に合計点を表示
    box.innerHTML = `
      <div class="resultPlayerHeader">
        <div></div> <!-- 左スペース -->
        <div class="center">
          <span class="resultColorDot" style="background:${player.color};"></span>
          ${player.name}
        </div>
        <div class="resultTotalScore">（${player.score}点）</div>
      </div>
      <div class="resultChests" id="resultChests${i}">
        <div class="tapToOpen">tap to open</div>
      </div>    
    `;

    const totalScoreEl = box.querySelector(".resultTotalScore");

    // 宝箱ゼロのプレイヤーは最初から表示
    if (player.collectedChests.length === 0) {
      totalScoreEl.classList.add("show");
      player.openedTreasure = true;
    }

    // タップで開封開始
    box.addEventListener("click", () => {
      startChestAnimationForPlayer(i);
    });

    area.appendChild(box);

    // リザルト画面に切り替わった瞬間に閉じた宝箱を並べる
    const chestArea = box.querySelector(".resultChests");

    // tapToOpen を退避（innerHTML="" で消えないようにする）
    const tap = chestArea.querySelector(".tapToOpen");

    // 宝箱だけ消す（tapToOpen は残す）
    chestArea.innerHTML = "";

    player.collectedChests.forEach((chest) => {
      const wrapper = document.createElement("div");
      wrapper.className = "chestWithScore";

      const img = document.createElement("img");
      img.src = "./src/images/chest_close.png";
      img.className = "resultChest";

      // ★ 点数ラベル（最初は非表示）
      const label = document.createElement("div");
      label.className = "chestScoreLabel hidden";
      label.textContent = `${chest.score}点`;

      wrapper.appendChild(img);
      wrapper.appendChild(label);
      chestArea.appendChild(wrapper);
    });

    chestArea.appendChild(tap);

    if (player.collectedChests.length === 0) {
      const tap = box.querySelector(".tapToOpen");
      tap.classList.add("hide");
    }
  });

  document.getElementById("resultScreen").style.display = "block";
}

function startChestAnimationForPlayer(playerIndex) {
  const player = game.players[playerIndex];
  const chestArea = document.getElementById(`resultChests${playerIndex}`);

  // すでに開封済みなら何もしない
  if (chestArea.dataset.opened === "true") return;
  chestArea.dataset.opened = "true";

  const box = document.querySelector(
    `.resultPlayerBox[data-player-index="${playerIndex}"]`
  );
  const tap = box.querySelector(".tapToOpen");
  tap.classList.add("hide");

  // 開封アニメ開始
  player.collectedChests.forEach((chest, index) => {
    const wrapper = chestArea.children[index];
    const img = wrapper.querySelector("img");
    const label = wrapper.querySelector(".chestScoreLabel");

    setTimeout(() => {
      img.style.transition = "transform 0.20s ease-out";
      img.style.transform = "scale(0.75)";

      setTimeout(() => {
        requestAnimationFrame(() => {
          img.src = chestImages[chest.score];

          img.onload = () => {
            requestAnimationFrame(() => {
              img.classList.add("open");

              label.classList.remove("hidden");
              label.classList.add("show");

              // 合計点を表示
              if (index === player.collectedChests.length - 1) {
                const total = document.querySelector(
                  `.resultPlayerBox[data-player-index="${playerIndex}"] .resultTotalScore`
                );
                player.openedTreasure = true;
                total.classList.add("show");

                if (allPlayersOpened()) {
                  setTimeout(() => {
                    showRanking();
                  }, 1500);
                }
              }
            });
          };
        });
      }, 200);
    }, index * 850);
  });
}

export function triggerTreasureAnimation(x, y) {
  game.animation = {
    x,
    y,
    progress: 0, // 0 → 1 で進む
    particles: [],
    sound1: false,
    sound2:false
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
    if (!game.animation.sound1) {
      effectSound("treasure_1", 1);
      game.animation.sound1 = true;
    }
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
    if (!game.animation.sound2) {
      effectSound("treasure_2", 1);
      game.animation.sound2 = true;
    }
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

  if (game.animation.progress > 3.0) {
    game.animation = null;
    game.animationType = null;
    if (game.onAnimationEnd) {
      game.onAnimationEnd();
      game.onAnimationEnd = null;
    }
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
  Object.values(boxes).forEach(b => {
    b.innerHTML = "";
    b.classList.remove("pos-top", "pos-bottom", "pos-left", "pos-right");
  });

  // プレイヤー順に4隅へ固定配置（位置は後で決める）
  const order = ["top-left", "bottom-right", "top-right", "bottom-left"];

  game.players.forEach((p, i) => {
    const box = boxes[order[i]];

    box.innerHTML = `
      <div class="playerInfoWrapper">
        <div class="playerInfoRow">
          <div style="width:16px; height:16px; border-radius:50%; background:${p.color};"></div>
          <span>${p.name}</span>
          <div class="playerSkillRow">
            ${p.specialUsed ? "" : getskillIcon(p.specialType)}
          </div>
        </div>

        <div class="playerChestRow">
          <span>宝箱</span>
          <span>:</span>
           <div class="chestIcons">
           ${chestIcons(p.collectedChests.length)}
          </div>
        </div>
      </div>
    `;

    if (i === 0) box.classList.add("pos-top", "pos-left");     // 左上
    if (i === 1) box.classList.add("pos-bottom", "pos-right"); // 右下
    if (i === 2) box.classList.add("pos-top", "pos-right");    // 右上
    if (i === 3) box.classList.add("pos-bottom", "pos-left");  // 左下
  });

  // HTML が入って高さが決まった後に位置を決める
  positionPlayerInfoBoxes();
  attachSkillTooltipEvents();
}


function positionPlayerInfoBoxes() {
  const canvas = document.getElementById("boardCanvas");
  const rect = canvas.getBoundingClientRect();

  // 左上
  const tl = document.getElementById("playerInfoTopLeft");
  const tlH = tl.offsetHeight;
  const tlX = rect.left;
  const tlY = rect.top - tlH - 4;
  tl.style.left = tlX + "px";
  tl.style.top = tlY + "px";

  // 右上
  const tr = document.getElementById("playerInfoTopRight");
  const trW = tr.offsetWidth;
  const trH = tr.offsetHeight;
  const trX = rect.right - trW;
  const trY = rect.top - trH - 4;
  tr.style.left = trX + "px";
  tr.style.top = trY + "px";

  // 右下
  const br = document.getElementById("playerInfoBottomRight");
  const brW = br.offsetWidth;
  const brX = rect.right - brW;
  const brY = rect.bottom + 6;
  br.style.left = brX + "px";
  br.style.top = brY + "px";

  // 左下
  const bl = document.getElementById("playerInfoBottomLeft");
  const blX = rect.left;
  const blY = rect.bottom + 6;
  bl.style.left = blX + "px";
  bl.style.top = blY + "px";
}

function chestIcons(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `<img src="./src/images/chest_close.png" style="width:20px; height:20px;">`;
  }
  return html;
}

export function runSkillRouletteAnimation() {
  const btn = document.getElementById("skillConfirmBtn");
  btn.disabled = true;
  btn.textContent = "抽選中…";

  const abilities = ["warp", "clearBoard", "paintRandom", "randomMove"];
  const slots = document.getElementById("skillSlots");
  slots.innerHTML = "";

  // スロットを作る
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i];

    const div = document.createElement("div");
    div.className = "slot";

    div.innerHTML = `
      <div class="slotPlayer">
        <div class="playerNameWrapper">
          <div class="playerColor" style="background:${p.color}"></div>
          <span class="playerName">${p.name}</span>
        </div>

        <div class="skillIconWrapper">
          <img class="skillIconSelect" src="./src/images/uncertainty.svg">
          <span class="skillLabel">???</span>
        </div>
      </div>
    `;

    slots.appendChild(div);
  }

  // 演出：1人ずつ止まる
  let index = 0;

  function spinNext() {
    if (index >= game.players.length) {
      // ★ 全員決定したのでボタンを有効化
      btn.disabled = false;
      btn.textContent = "OK!";
      return;
    }

    const slot = slots.children[index];
    const skillIcon = slot.querySelector(".skillIconSelect");
    const skillLabel = slot.querySelector(".skillLabel");

    let t = 0;
    let prevR = 5;

    rollSound("roll", 1);

    const interval = setInterval(() => {
      let r = Math.floor(Math.random() * abilities.length);
      if (r === prevR) r = (r + 1) % abilities.length;
      prevR = r;
      skillIcon.src = `./src/images/${abilities[r]}.svg`;
      skillLabel.textContent = SkillMap[abilities[r]];
      t++;

      if (t > 20 + Math.random() * 20) {
        stopSound("roll");
        rollSound("stop", 1);
        clearInterval(interval);

        // 最終決定
        const final = Math.floor(Math.random() * abilities.length);
        skillIcon.src = `./src/images/${abilities[final]}.svg`;
        skillLabel.textContent = SkillMap[abilities[final]];
        game.players[index].specialType = abilities[final];
        game.players[index].specialUsed = false;
        
        index++;
        setTimeout(spinNext, 300);
      }
    }, 50);
  }

  spinNext();
}

function getskillIcon(type) {
  const label = SkillMap[type]; // 表示したい日本語名に変換するならここで
  return `
    <div class="skillIcon">
      <img src="./src/images/${type}.svg">
      <div class="nameBubble">${label}</div>
    </div>
  `;
}

function createRanking() {
  const sorted = [...game.players].sort((a, b) => b.score - a.score);

  let lastScore = null;
  let lastRank = 0;
  let index = 0;

  return sorted.map(p => {
    index++;
    if (p.score !== lastScore) {
      lastRank = index;
      lastScore = p.score;
    }
    return { rank: lastRank, name: p.name, score: p.score };
  });
}

function showRanking() {
  const ranking = createRanking(); // スコア順＋同着処理済み
  const panel = document.getElementById("ranking");
  panel.innerHTML = "";

  ranking.forEach(r => {
    const row = document.createElement("div");
    row.className = "rankRow";

    // 順位
    const rankCell = document.createElement("div");
    rankCell.textContent = `${r.rank}位`;

    // 名前
    const nameCell = document.createElement("div");
    nameCell.textContent = r.name;

    // スコア
    const scoreCell = document.createElement("div");
    scoreCell.textContent = `${r.score}点`;

    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(scoreCell);

    panel.appendChild(row);
  });

  document.getElementById("rankingOverlay").style.display = "flex";
}

function attachSkillTooltipEvents() {
  document.querySelectorAll(".skillIcon").forEach(icon => {
    icon.addEventListener("click", () => {
      const bubble = icon.querySelector(".nameBubble");
      if (!bubble) return;

      const rect = icon.getBoundingClientRect();
      const screenMidX = window.innerWidth / 2;
      const screenMidY = window.innerHeight / 2;

      // 画面の上下・左右にあるアイコンを識別
      if (rect.left > screenMidX) {
        bubble.classList.add("right");
      } else {
        bubble.classList.remove("right");
      }

      if (rect.top > screenMidY) {
        bubble.classList.add("bottom");
      } else {
        bubble.classList.remove("bottom");
      }

      bubble.style.opacity = 1;

      clearTimeout(bubble.hideTimer);
      bubble.hideTimer = setTimeout(() => {
        bubble.style.opacity = 0;
      }, 2000);
    });
  });
}

export function playAllClearEffect() {
  game.locked = true;
  const flash = document.getElementById("clearFlash");
  const canvas = document.getElementById("boardCanvas");
  const rect = canvas.getBoundingClientRect();

  // サイズと位置を canvas に合わせる
  flash.style.width = rect.width + "px";
  flash.style.height = rect.height + "px";
  flash.style.left = rect.left + "px";
  flash.style.top = rect.top + "px";

  effectSound("allclear", 1);

  // 光を点灯
  setTimeout(() => {
    flash.style.opacity = 1;
    flash.style.setProperty("--r", "100%");
  }, 300);

  // 光が消えるタイミングで盤面を無色化
  setTimeout(() => {
    clearBoardAbility();
  }, 3000);

  // 少し待ってから光を消す
  setTimeout(() => {
    flash.style.transition = "opacity 1s ease-out";
    flash.style.opacity = 0;
  }, 3500);

  // 光が消えた後に scale をリセット
  setTimeout(() => {
    game.locked = false;
    flash.style.setProperty("--r", "0%");
    flash.style.transition = "--r 3s ease-out";
  }, 4600);
}
