import { showScreen, render } from "./ui.js";
import { startGame } from "./turn.js";
import { game, initializeGame } from "./state.js";
import {movePlayer} from "./player.js"
import { handleBoardClick } from "./boad.js";

document.addEventListener("DOMContentLoaded", () => {
  showScreen("homeScreen");
  const countSelect = document.getElementById("playerCount");
  const nameContainer = document.getElementById("playerNameContainer");
  function updatePlayerNameInputs() {
    const count = Number(countSelect.value);
    nameContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const div = document.createElement("div");
      div.className = "form-row";
      div.innerHTML = `
      <label>プレイヤー${i + 1} 名前：</label>
      <input type="text" id="playerName${i}">
      `;
      nameContainer.appendChild(div);
    }
  }
  const boardSizeSelect = document.getElementById("boardSize");
  const treasureSelect = document.getElementById("treasureCount");

  const treasureOptionsBySize = {
    7: [3, 4, 5],
    9: [4, 6, 8],
    11: [6, 8, 10],
  };

  function updateTreasureOptions() {
    const size = Number(boardSizeSelect.value);
    const options = treasureOptionsBySize[size];

    treasureSelect.innerHTML = "";

    options.forEach(num => {
      const opt = document.createElement("option");
      opt.value = num;
      opt.textContent = `${num} 個`;
      treasureSelect.appendChild(opt);
    });
  }

  // 初期表示
  updateTreasureOptions();
  updatePlayerNameInputs();

  // ボードサイズ変更時に宝箱数を更新
  boardSizeSelect.addEventListener("change", updateTreasureOptions);

  // 人数変更時に更新
  countSelect.addEventListener("change", updatePlayerNameInputs);

  // ゲーム開始
  document.getElementById("startButton").onclick = () => {
    const count = Number(countSelect.value);
    game.playerCount = count;
    game.boardSize = Number(boardSizeSelect.value);
    game.treasureCount = Number(treasureSelect.value);

    // ボードサイズを保存
    const size = Number(document.getElementById("boardSize").value);
    game.boardSize = size;

    // ★ 宝箱数を保存
    const treasureCount = Number(document.getElementById("treasureCount").value);
    game.treasureCount = treasureCount;

    // 名前を state に保存
    game.playerNames = [];
    for (let i = 0; i < count; i++) {
      const name = document.getElementById(`playerName${i}`).value || `P${i+1}`;
      game.playerNames.push(name);
    }

    initializeGame();
    startGame();
    showScreen("gameScreen");
  };

  document.getElementById("restartButton").onclick = () => {
    showScreen("homeScreen");
  };

  document.getElementById("btnUp").onclick = () => movePlayer(0, -1);
  document.getElementById("btnDown").onclick = () => movePlayer(0, 1);
  document.getElementById("btnLeft").onclick = () => movePlayer(-1, 0);
  document.getElementById("btnRight").onclick = () => movePlayer(1, 0);

  document.getElementById("breakButton").onclick = () => {
    game.mode = "break";
  };

  const canvas = document.getElementById("boardCanvas");

  canvas.addEventListener("pointermove", (e) => {
    if (game.mode !== "break") return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / game.tileSize);
    const y = Math.floor((e.clientY - rect.top) / game.tileSize);

    // 範囲外ならハイライト消す
    if (x < 0 || y < 0 || x >= game.board.length || y >= game.board.length) {
      game.highlight = null;
      render();
      return;
    }

    // プレイヤーがいるマスはハイライトしない
    for (const p of game.players) {
      if (p.x === x && p.y === y) {
        game.highlight = null;
        render();
        return;
      }
    }

    // ハイライト更新
    game.highlight = { x, y };
    render();
  });

  canvas.addEventListener("pointerup", (e) => {
    if (game.mode !== "break") return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / game.tileSize);
    const y = Math.floor((e.clientY - rect.top) / game.tileSize);

    handleBoardClick(x, y);
  });

});
