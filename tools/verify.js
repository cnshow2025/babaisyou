// 驗證每一關都能過關：用引擎實際執行 solutions.json 中的解法。
// 用法：node tools/verify.js        驗證全部關卡
//       node tools/verify.js 7 -v   逐步印出第 7 關的盤面
'use strict';
const Engine = require('../js/engine.js');
const { LEVELS, OBJECTS, WORDS, parseLevel } = require('../js/levels.js');
const SOLUTIONS = require('./solutions.json');

const MOVES = { U: 'up', D: 'down', L: 'left', R: 'right', W: null };
const objChar = Object.fromEntries(Object.entries(OBJECTS).map(([c, t]) => [t, c]));
const wordChar = Object.fromEntries(Object.entries(WORDS).map(([c, t]) => [t, c]));

function render(state) {
  const rows = [];
  for (let y = 0; y < state.h; y++) {
    let r = '';
    for (let x = 0; x < state.w; x++) {
      const here = state.objs.filter(o => o.x === x && o.y === y);
      if (!here.length) r += '.';
      else {
        const o = here[here.length - 1];
        r += o.type === 'text' ? wordChar[o.word] : objChar[o.type];
      }
    }
    rows.push(r);
  }
  return rows.join('\n');
}

function verify(index, verbose) {
  const level = LEVELS[index];
  const widths = new Set(level.map.map(r => r.length));
  if (widths.size !== 1) return `地圖每列長度不一致：${[...widths].join(', ')}`;
  const sol = SOLUTIONS[index];
  if (!sol) return '缺少解法';
  const def = parseLevel(level);
  let state = Engine.createState(def.w, def.h, def.objs);
  const start = Engine.step(state, null);
  if (start.win) return '一開始就已經過關';
  for (let i = 0; i < sol.length; i++) {
    const ch = sol[i];
    if (!(ch in MOVES)) return `解法含有未知字元 '${ch}'`;
    const res = Engine.step(state, MOVES[ch]);
    state = res.state;
    if (verbose) {
      console.log(`--- 第 ${i + 1} 步：${ch}`);
      console.log(render(state));
      console.log('規則：' + res.ctx.rules.map(Engine.ruleToText).join(' / '));
    }
    if (res.win) {
      if (i !== sol.length - 1) return `在第 ${i + 1} 步就提早過關（解法太長）`;
      return null;
    }
  }
  return '走完解法仍未過關\n' + render(state);
}

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const only = args.find(a => /^\d+$/.test(a));
const targets = only ? [Number(only) - 1] : LEVELS.map((_, i) => i);
let failed = 0;
for (const i of targets) {
  const err = verify(i, verbose);
  const label = `第 ${String(i + 1).padStart(2)} 關「${LEVELS[i].name}」`;
  if (err) { failed++; console.log(`✗ ${label}：${err}`); }
  else console.log(`✓ ${label}（${SOLUTIONS[i].length} 步）`);
}
if (LEVELS.length !== SOLUTIONS.length) {
  console.log(`關卡數 ${LEVELS.length} 與解法數 ${SOLUTIONS.length} 不符`);
  failed++;
}
process.exitCode = failed ? 1 : 0;
