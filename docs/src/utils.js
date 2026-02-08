export function wait(ms) { // 使い方：await wait();
  return new Promise(resolve => setTimeout(resolve, ms));
}