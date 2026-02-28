import { render, renderResultScreen, updateTurnInfo, showScreen, renderPlayerInfo } from "./ui.js";
import { game } from "./state.js";

export function startGame() {
  game.currentPlayerId = 0;
  game.remainingActions = 2;
  game.phase = "playing";

  startTurn();
  render();
  requestAnimationFrame(() => {
    renderPlayerInfo();
  });
}

export function startTurn() {
  game.remainingActions = 2;
  updateTurnInfo();
}

export function endTurn() {
  game.currentPlayerId = (game.currentPlayerId + 1) % game.players.length;
  game.locked = true;
  startTurn();
  if (!game.animation) {
    showTurnChange(game.players[game.currentPlayerId].name);
  } else {
    setTimeout(() => {
      showTurnChange(game.players[game.currentPlayerId].name);
  }, 3000);
  }
  
}

export function endGame() {
  document.body.style.overflow = "";
  alert("宝箱をすべて回収しました！ゲーム終了！");
  // 必要なら画面遷移など
  showScreen("resultScreen");
  renderResultScreen();
}

export function showTurnChange(name) {
  const overlay = document.getElementById("turnOverlay");
  const dimmer = document.getElementById("turnDimmer");

  overlay.textContent = `${name}　のターン！`;

  // 暗転
  dimmer.style.opacity = 1;

  // テキスト表示
  setTimeout(() => {
    overlay.style.opacity = 1;
  }, 100);

  // フェードアウト
  setTimeout(() => {
    overlay.style.opacity = 0;
    dimmer.style.opacity = 0;
    game.locked = false;
  }, 1700);
}
