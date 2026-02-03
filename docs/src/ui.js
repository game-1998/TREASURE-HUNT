import { game } from "./state.js";
import { drawBoard } from "./boad.js";
import { drawPlayers } from "./player.js";

export function showScreen(name) {
  document.getElementById("homeScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("resultScreen").style.display = "none";

  document.getElementById(name).style.display = "block";
}

function showMessage(text) {
  const msg = document.getElementById("message");
  msg.textContent = text;
  msg.style.opacity = 1;

  setTimeout(() => {
    msg.style.opacity = 0;
  }, 1000);
}

export function render() {
  drawBoard();
  drawPlayers();
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
