const sounds = {
  allclear: new Audio("src/sounds/allclear.mp3"),
  move: new Audio("src/sounds/move.mp3"),
  paint: new Audio("src/sounds/paint.mp3"),
  roll: new Audio("src/sounds/roll.mp3"),
  stop: new Audio("src/sounds/stop.mp3"),
  tornado_1: new Audio("src/sounds/tornado_1.mp3"),
  tornado_2: new Audio("src/sounds/tornado_2.mp3"),
  tornado_3: new Audio("src/sounds/tornado_3.mp3"),
  treasure_1: new Audio("src/sounds/treasure_1.mp3"),
  treasure_2: new Audio("src/sounds/treasure_2.mp3"),
  turnchange: new Audio("src/sounds/turnchange.mp3"),
  warp_1: new Audio("src/sounds/warp_1.mp3"),
  warp_2: new Audio("src/sounds/warp_2.mp3"),
  warp_3: new Audio("src/sounds/warp_3.mp3"),
};

export function effectSound(name, volume) {
  const s = sounds[name];
  if (!s) return;

  // 再生位置をリセット（連打対応）
  const clone = s.cloneNode();
  clone.volume = volume;
  clone.play();
}

export function rollSound(name, volume) {
  const s = sounds[name];
  if (!s) return;

  // 再生位置をリセット（連打対応）
  s.currentTime = 0;
  s.volume = volume;
  s.play();
}

export function stopSound(name) {
  const s = sounds[name];
  if (!s) return;

  s.pause();
  s.currentTime = 0;
}
