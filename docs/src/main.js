import { showScreen, render } from "./ui.js";
import { startGame } from "./turn.js";
import { game, initializeGame } from "./state.js";
import {movePlayer} from "./player.js"
import { handleBoardClick } from "./boad.js";
import { colorList } from "./state.js";

// パレット DOM を作る（最初は非表示）
const palette = document.createElement("div");
palette.id = "colorPalette";
palette.style.display = "none";
document.body.appendChild(palette);

let paletteOpenFor = null;
palette.addEventListener("click", (e) => e.stopPropagation());

document.addEventListener("DOMContentLoaded", () => {
  showScreen("homeScreen");
  const countSelect = document.getElementById("playerCount");
  const nameContainer = document.getElementById("playerNameContainer");

  function updatePlayerNameInputs() {
    const count = Number(countSelect.value);
    nameContainer.innerHTML = "";

    // state 初期化
    game.playerNames = new Array(count).fill("");
    game.selectedColors = new Array(count).fill(null);

    // 見出し行
    const header = document.createElement("div");
    header.className = "form-row headerRow";
    header.innerHTML = `
      <div class="headerCellPlayername">プレイヤー名</div>
      <div class="headerCellPiece">色</div>
    `;
    nameContainer.appendChild(header);
 
    for (let i = 0; i < count; i++) {
      const row = document.createElement("div");
      row.className = "form-row";

      // 名前入力欄
      const nameInput = document.createElement("input");
      nameInput.className = "nameInput"
      nameInput.type = "text";
      nameInput.placeholder = `プレイヤー${i + 1}`;
      nameInput.id = `playerName${i}`;
      nameInput.dataset.playerIndex = i;

      nameInput.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.playerIndex);
        game.playerNames[idx] = e.target.value;
      });

      // 色選択エリア
      const currentColorBox = document.createElement("div");
      currentColorBox.className = "currentColorBox";
      currentColorBox.dataset.playerIndex = i;

      // 初期色（未選択ならグレー）
      currentColorBox.style.background = "#ccc";

      // クリックでパレットを開く
      currentColorBox.addEventListener("click", (e) => {
        const idx = Number(e.target.dataset.playerIndex);
        openColorPalette(idx, currentColorBox);
      });

      row.appendChild(nameInput);
      row.appendChild(currentColorBox);
      nameContainer.appendChild(row);
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

  document.addEventListener("click", (e) => {
    // パレットが開いていないなら何もしない
    if (paletteOpenFor === null) return;

    // パレット自身 or currentColorBox をクリックした場合は閉じない
    if (palette.contains(e.target) || e.target.classList.contains("currentColorBox")) {
      return;
    }

    // それ以外をクリックしたら閉じる
    closePalette();
  });

  // ゲーム開始
  document.getElementById("startButton").onclick = () => {
    // 色が未選択のプレイヤーがいるかチェック
    if (game.selectedColors.some(c => c === null)) {
      alert("プレイヤー全員の色を選択してください");
      return; // ゲーム開始しない
    }

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

    document.body.style.overflow = "hidden";   // ← pull-to-refresh を封じる
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
    if (game.locked) return;
    game.mode = "break";
  };

  const canvas = document.getElementById("boardCanvas");

  canvas.addEventListener("pointermove", (e) => {
    if (game.mode !== "break") return;

    console.log("move", e.clientX, e.clientY);
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

function openColorPalette(playerIndex, anchorElement) {
  // すでに開いているパレットがあれば閉じる
  if (paletteOpenFor !== null) {
    closePalette();
  }

  paletteOpenFor = playerIndex;
  palette.innerHTML = "";

  const used = new Set(game.selectedColors);

  colorList.forEach(color => {
    const btn = document.createElement("div");
    btn.className = "paletteColor";
    btn.style.background = color;

    // 他プレイヤーが使っている色は選べない
    if (used.has(color) && game.selectedColors[playerIndex] !== color) {
      btn.classList.add("disabled");
      // バツ印を追加
      const xMark = document.createElement("div");
      xMark.className = "xMark";
      btn.appendChild(xMark);
    }

    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled")) return;

      game.selectedColors[playerIndex] = color;

      // 表示中の色ボックスを更新
      anchorElement.style.background = color;

      closePalette();
    });

    palette.appendChild(btn);
  });

  // パレットを表示（位置調整）
  const rect = anchorElement.getBoundingClientRect();
  palette.style.left = (rect.left + rect.width / 2 - 64) + "px";
  palette.style.top = rect.top - 28 + "px";
  palette.style.display = "grid";
}

function closePalette() {
  palette.style.display = "none";
  paletteOpenFor = null;
}
