// 以廣度優先搜尋找出關卡的最短解法，用來檢查關卡有沒有意外的捷徑。
// 用法：node tools/solver.js 25              搜尋第 25 關
//       node tools/solver.js 25 --max 800000  指定最多搜尋的狀態數
// 若在上限內找不到解法，會回報已確認「至少需要幾步」。
'use strict';
const Engine = require('../js/engine.js');
const { LEVELS, parseLevel } = require('../js/levels.js');

const MOVES = [['U', 'up'], ['D', 'down'], ['L', 'left'], ['R', 'right'], ['W', null]];

function solve(index, maxStates) {
  const def = parseLevel(LEVELS[index]);
  const start = Engine.createState(def.w, def.h, def.objs);
  const seen = new Set([Engine.stateKey(start)]);
  let frontier = [{ state: start, path: '' }];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      for (const [ch, dir] of MOVES) {
        const res = Engine.step(node.state, dir);
        const path = node.path + ch;
        if (res.win) return { found: true, path, states: seen.size };
        if (!res.hasYou) continue;
        const key = Engine.stateKey(res.state);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ state: res.state, path });
      }
      if (seen.size > maxStates) return { found: false, depth: depth + 1, states: seen.size };
    }
    frontier = next;
    depth++;
  }
  return { found: false, depth, states: seen.size, exhausted: true };
}

const args = process.argv.slice(2);
const level = Number(args[0]);
const maxIdx = args.indexOf('--max');
const maxStates = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 500000;
if (!level || level < 1 || level > LEVELS.length) {
  console.log(`請指定關卡編號 1～${LEVELS.length}`);
  process.exit(1);
}
const t = Date.now();
const r = solve(level - 1, maxStates);
const sec = ((Date.now() - t) / 1000).toFixed(1);
if (r.found) console.log(`第 ${level} 關最短解法 ${r.path.length} 步：${r.path}（搜尋 ${r.states} 個狀態，${sec} 秒）`);
else if (r.exhausted) console.log(`第 ${level} 關無解（已搜尋全部 ${r.states} 個狀態）`);
else console.log(`第 ${level} 關在 ${r.states} 個狀態內找不到解法：至少需要 ${r.depth} 步（${sec} 秒）`);
