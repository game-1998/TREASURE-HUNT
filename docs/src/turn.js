import { render, renderResultScreen, updateTurnInfo, showScreen } from "./ui.js";
import { game } from "./state.js";

export function startGame() {
  game.currentPlayerId = 0;
  game.remainingActions = 2;
  game.phase = "playing";

  startTurn();
  render();
}

export function startTurn() {
  game.remainingActions = 2;
  updateTurnInfo();
}

export function endTurn() {
  game.currentPlayerId = (game.currentPlayerId + 1) % game.players.length;
  startTurn();
  render();
}

export function endGame() {
  alert("宝箱をすべて回収しました！ゲーム終了！");
  // 必要なら画面遷移など
  showScreen("resultScreen");
  renderResultScreen();
}