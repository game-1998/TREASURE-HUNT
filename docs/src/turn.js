import { render, renderResultScreen, updateTurnInfo, showScreen, renderPlayerInfo } from "./ui.js";
import { game } from "./state.js";

export function startGame() {
  game.currentPlayerId = 0;
  game.remainingActions = 2;

  startTurn();
  render();
  requestAnimationFrame(() => {
    const canvas = document.getElementById("boardCanvas");
    const overlay = document.getElementById("turnOverlay");
    const rect = canvas.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    overlay.style.left = centerX + "px";
    overlay.style.top = centerY + "px";

    renderPlayerInfo();
    showTurnChange(game.players[game.currentPlayerId].name);
  });
}

export function startTurn() {
  game.remainingActions = 2;
  updateTurnInfo();
}

export function endTurn() {
  game.locked = true;

  // 演出中なら、演出終了後にもう一度 endTurn を呼ぶ
  if (game.animationType) {
    game.onAnimationEnd = () => {
      setTimeout(() => {
        endTurn();
      }, 200); // ← 余韻の時間
    };
    return;
  }

  game.currentPlayerId = (game.currentPlayerId + 1) % game.players.length;
  
  startTurn();
  showTurnChange(game.players[game.currentPlayerId].name);
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

  overlay.innerHTML = `NEXT PLAYER<br>${name}`;

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
  }, 2300);

  setTimeout(() => {
    game.locked = false;
  }, 2600);
}
