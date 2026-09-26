// Baba Is You 風格遊戲引擎：規則解析、移動與互動判定。
// 本檔案不依賴 DOM，可同時在瀏覽器與 Node.js 中執行（方便自動驗證關卡）。
(function (root) {
  'use strict';

  const NOUNS = ['baba', 'keke', 'flag', 'wall', 'rock', 'water', 'skull',
    'lava', 'key', 'door', 'grass', 'text'];
  const PROPS = ['you', 'win', 'stop', 'push', 'pull', 'defeat', 'sink', 'hot',
    'melt', 'open', 'shut', 'move', 'float', 'weak', 'tele', 'shift'];
  const CONDS = ['on', 'near', 'facing'];
  const VERBS = ['is', 'has'];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  // 文字方塊在畫面上顯示的繁體中文名稱（程式內部仍使用英文代號）。
  const LABELS = {
    baba: '巴巴', keke: '可可', flag: '旗子', wall: '牆', rock: '石頭', water: '水',
    skull: '骷髏', lava: '熔岩', key: '鑰匙', door: '門', grass: '草', text: '文字',
    is: '是', and: '和', not: '非', has: '有', on: '站在', near: '靠近', facing: '面向',
    you: '你', win: '贏', stop: '停', push: '推', pull: '拉', defeat: '擊敗',
    sink: '沉', hot: '燙', melt: '融化', open: '開', shut: '關', move: '移動',
    float: '漂浮', weak: '弱', tele: '傳送', shift: '輸送',
  };
  const label = word => LABELS[word] || word;
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  const CATEGORY = new Map([
    ...NOUNS.map(w => [w, 'noun']), ...PROPS.map(w => [w, 'prop']),
    ...CONDS.map(w => [w, 'cond']), ...VERBS.map(w => [w, 'verb']),
    ['not', 'not'], ['and', 'and'],
  ]);

  function category(word) {
    return CATEGORY.get(word) || null;
  }

  // ---------- 狀態 ----------

  function createState(w, h, objs) {
    const state = { w, h, objs: [], nextId: 1 };
    for (const o of objs) addObj(state, o.type, o.x, o.y, o.dir, o.word);
    return state;
  }

  function addObj(state, type, x, y, dir, word) {
    const o = { id: state.nextId++, type, x, y, dir: dir || 'right' };
    if (type === 'text') o.word = word;
    state.objs.push(o);
    return o;
  }

  function cloneState(state) {
    return {
      w: state.w,
      h: state.h,
      nextId: state.nextId,
      objs: state.objs.map(o => Object.assign({}, o)),
    };
  }

  function objsAt(state, x, y) {
    return state.objs.filter(o => o.x === x && o.y === y);
  }

  function inBounds(state, x, y) {
    return x >= 0 && y >= 0 && x < state.w && y < state.h;
  }

  // ---------- 規則解析 ----------

  // 解析一串連續的文字方塊，從索引 i 開始嘗試組成一個句子。
  function parseSentence(t, i) {
    const w = k => (t[k] ? t[k].word : null);
    const skipNots = k => {
      let neg = false;
      while (w(k) === 'not') { neg = !neg; k++; }
      return { k, neg };
    };

    // 主詞：[NOT]* 名詞 (AND [NOT]* 名詞)*
    let p = i;
    const subjects = [];
    for (;;) {
      const s = skipNots(p);
      if (category(w(s.k)) !== 'noun') {
        if (!subjects.length) return null;
        break;
      }
      subjects.push({ noun: w(s.k), neg: s.neg });
      p = s.k + 1;
      if (w(p) === 'and' && category(w(skipNots(p + 1).k)) === 'noun') {
        p++;
        continue;
      }
      break;
    }

    // 條件：[NOT]* (ON|NEAR|FACING) [NOT]* 名詞 (AND [NOT]* 名詞)* ...
    const conds = [];
    for (;;) {
      const c = skipNots(p);
      if (category(w(c.k)) !== 'cond') break;
      const ctype = w(c.k);
      let q = c.k + 1;
      const targets = [];
      for (;;) {
        const n = skipNots(q);
        if (category(w(n.k)) !== 'noun') break;
        targets.push({ noun: w(n.k), neg: n.neg });
        q = n.k + 1;
        if (w(q) === 'and' && category(w(skipNots(q + 1).k)) === 'noun') {
          q++;
          continue;
        }
        break;
      }
      if (!targets.length) break;
      for (const tg of targets) {
        conds.push({ type: ctype, neg: c.neg, noun: tg.noun, nounNeg: tg.neg });
      }
      p = q;
      if (w(p) === 'and' && category(w(skipNots(p + 1).k)) === 'cond') {
        p++;
        continue;
      }
      break;
    }
    const preVerbEnd = p;

    // 述語：(IS|HAS) 目標 (AND 目標)* (AND (IS|HAS) 目標 ...)*
    const preds = [];
    let end = -1;
    const validTarget = (verb, word) => {
      const c = category(word);
      return verb === 'is' ? (c === 'noun' || c === 'prop') : c === 'noun';
    };
    for (;;) {
      if (category(w(p)) !== 'verb') break;
      const verb = w(p);
      let q = p + 1;
      let got = false;
      for (;;) {
        const n = skipNots(q);
        if (!validTarget(verb, w(n.k))) break;
        preds.push({ verb, obj: w(n.k), neg: n.neg });
        got = true;
        q = n.k + 1;
        end = q;
        if (w(q) === 'and' && validTarget(verb, w(skipNots(q + 1).k))) {
          q++;
          continue;
        }
        break;
      }
      if (!got) break;
      if (w(q) === 'and' && category(w(q + 1)) === 'verb') {
        p = q + 1;
        continue;
      }
      break;
    }
    if (!preds.length) return null;

    const rules = [];
    for (const s of subjects) {
      for (const pr of preds) {
        rules.push({
          subj: s.noun, subjNeg: s.neg, conds,
          verb: pr.verb, obj: pr.obj, objNeg: pr.neg,
        });
      }
    }
    return { rules, end, preVerbEnd };
  }

  function parseLine(tokens, out) {
    const covered = new Set();
    for (let i = 0; i < tokens.length; i++) {
      if (covered.has(i)) continue;
      const res = parseSentence(tokens, i);
      if (!res) continue;
      for (let k = i; k < res.preVerbEnd; k++) covered.add(k);
      for (let k = i; k < res.end; k++) out.active.add(tokens[k].id);
      for (const r of res.rules) {
        const key = ruleKey(r);
        if (!out.keys.has(key)) {
          out.keys.add(key);
          out.rules.push(r);
        }
      }
    }
  }

  function ruleKey(r) {
    const c = r.conds.map(c => `${c.neg ? '!' : ''}${c.type}:${c.nounNeg ? '!' : ''}${c.noun}`).join(',');
    return `${r.subjNeg ? '!' : ''}${r.subj}|${c}|${r.verb}|${r.objNeg ? '!' : ''}${r.obj}`;
  }

  function parseRules(state) {
    const grid = new Array(state.w * state.h);
    for (const o of state.objs) {
      if (o.type !== 'text') continue;
      const key = o.y * state.w + o.x;
      const prev = grid[key];
      if (!prev || prev.id < o.id) grid[key] = o;
    }
    const out = { rules: [], keys: new Set(), active: new Set() };
    const at = (x, y) => grid[y * state.w + x];
    for (let y = 0; y < state.h; y++) {
      let seg = [];
      for (let x = 0; x <= state.w; x++) {
        const t = x < state.w ? at(x, y) : null;
        if (t) seg.push(t);
        else { if (seg.length >= 3) parseLine(seg, out); seg = []; }
      }
    }
    for (let x = 0; x < state.w; x++) {
      let seg = [];
      for (let y = 0; y <= state.h; y++) {
        const t = y < state.h ? at(x, y) : null;
        if (t) seg.push(t);
        else { if (seg.length >= 3) parseLine(seg, out); seg = []; }
      }
    }
    return { rules: out.rules, active: out.active };
  }

  // ---------- 規則套用 ----------

  function matchesNoun(o, noun, neg) {
    if (!neg) return noun === 'text' ? o.type === 'text' : o.type === noun;
    if (noun === 'text') return o.type !== 'text';
    return o.type !== 'text' && o.type !== noun;
  }

  function condHolds(state, o, c) {
    let found = false;
    const match = p => p !== o && matchesNoun(p, c.noun, c.nounNeg);
    if (c.type === 'on') {
      found = state.objs.some(p => p.x === o.x && p.y === o.y && match(p));
    } else if (c.type === 'near') {
      found = state.objs.some(p => Math.abs(p.x - o.x) <= 1 && Math.abs(p.y - o.y) <= 1 && match(p));
    } else if (c.type === 'facing') {
      const [dx, dy] = DIRS[o.dir];
      found = state.objs.some(p => p.x === o.x + dx && p.y === o.y + dy && match(p));
    }
    return c.neg ? !found : found;
  }

  function ruleApplies(state, r, o) {
    if (!matchesNoun(o, r.subj, r.subjNeg)) return false;
    for (const c of r.conds) if (!condHolds(state, o, c)) return false;
    return true;
  }

  // 分析目前狀態：解析規則並計算每個物體的屬性。
  function analyze(state) {
    const parsed = parseRules(state);
    const propRules = parsed.rules.filter(r => r.verb === 'is' && category(r.obj) === 'prop');
    const props = new Map();
    for (const o of state.objs) {
      const pos = new Set();
      const neg = new Set();
      if (o.type === 'text') pos.add('push');
      for (const r of propRules) {
        if (!ruleApplies(state, r, o)) continue;
        (r.objNeg ? neg : pos).add(r.obj);
      }
      for (const n of neg) pos.delete(n);
      props.set(o.id, pos);
    }
    return {
      rules: parsed.rules,
      active: parsed.active,
      has: (o, p) => { const s = props.get(o.id); return !!s && s.has(p); },
    };
  }

  // ---------- 移動 ----------

  function canMove(state, ctx, o, dir, depth) {
    if ((depth || 0) > 64) return false;
    const [dx, dy] = DIRS[dir];
    const nx = o.x + dx, ny = o.y + dy;
    if (!inBounds(state, nx, ny)) return false;
    for (const p of objsAt(state, nx, ny)) {
      if (p === o) continue;
      if (ctx.has(p, 'push')) {
        if (!canMove(state, ctx, p, dir, (depth || 0) + 1)) return false;
      } else if (ctx.has(p, 'stop') && !opensWith(ctx, o, p)) {
        return false;
      }
    }
    return true;
  }

  // OPEN 碰到 SHUT 時不會被 STOP 擋住，兩者會在互動階段一起消失。
  function opensWith(ctx, a, b) {
    return (ctx.has(a, 'open') && ctx.has(b, 'shut')) || (ctx.has(a, 'shut') && ctx.has(b, 'open'));
  }

  function doMove(state, ctx, o, dir, moved) {
    const [dx, dy] = DIRS[dir];
    const nx = o.x + dx, ny = o.y + dy;
    for (const p of objsAt(state, nx, ny)) {
      if (p !== o && ctx.has(p, 'push') && !moved.has(p.id)) doMove(state, ctx, p, dir, moved);
    }
    const ox = o.x, oy = o.y;
    o.x = nx;
    o.y = ny;
    moved.add(o.id);
    for (const q of objsAt(state, ox - dx, oy - dy)) {
      if (!moved.has(q.id) && ctx.has(q, 'pull') && canMove(state, ctx, q, dir)) {
        doMove(state, ctx, q, dir, moved);
      }
    }
  }

  // 依移動方向排序，讓最前面的物體先移動。
  function frontFirst(list, dirOf) {
    return list.slice().sort((a, b) => {
      const [dxa, dya] = DIRS[dirOf(a)];
      const [dxb, dyb] = DIRS[dirOf(b)];
      return (dxb * b.x + dyb * b.y) - (dxa * a.x + dya * a.y);
    });
  }

  function youPhase(state, ctx, dir) {
    const yous = state.objs.filter(o => ctx.has(o, 'you'));
    const moved = new Set();
    for (const o of frontFirst(yous, () => dir)) {
      if (moved.has(o.id)) continue;
      o.dir = dir;
      if (canMove(state, ctx, o, dir)) doMove(state, ctx, o, dir, moved);
    }
    return yous.length > 0;
  }

  function movePhase(state, ctx) {
    const movers = state.objs.filter(o => ctx.has(o, 'move'));
    const moved = new Set();
    for (const o of frontFirst(movers, o => o.dir)) {
      if (moved.has(o.id)) continue;
      if (canMove(state, ctx, o, o.dir)) {
        doMove(state, ctx, o, o.dir, moved);
      } else {
        o.dir = OPPOSITE[o.dir];
        if (canMove(state, ctx, o, o.dir)) doMove(state, ctx, o, o.dir, moved);
      }
    }
    return movers.length > 0;
  }

  const floatOf = (ctx, o) => ctx.has(o, 'float');

  function shiftPhase(state, ctx) {
    const plans = [];
    for (const s of state.objs) {
      if (!ctx.has(s, 'shift')) continue;
      for (const p of objsAt(state, s.x, s.y)) {
        if (p !== s && floatOf(ctx, p) === floatOf(ctx, s)) plans.push([p, s.dir]);
      }
    }
    const moved = new Set();
    for (const [p, dir] of plans) {
      if (moved.has(p.id)) continue;
      p.dir = dir;
      if (canMove(state, ctx, p, dir)) doMove(state, ctx, p, dir, moved);
    }
    return plans.length > 0;
  }

  // ---------- 變形 ----------

  function transformPhase(state, ctx) {
    const result = [];
    let changed = false;
    for (const o of state.objs) {
      const ownNoun = o.type === 'text' ? 'text' : o.type;
      const targets = [];
      let blocked = false;
      for (const r of ctx.rules) {
        if (r.verb !== 'is' || category(r.obj) !== 'noun') continue;
        if (r.objNeg || !ruleApplies(state, r, o)) continue;
        if (r.obj === ownNoun) { blocked = true; continue; }
        if (!targets.includes(r.obj)) targets.push(r.obj);
      }
      // X IS NOT Y 會阻止 X 變成 Y
      for (const r of ctx.rules) {
        if (r.verb === 'is' && r.objNeg && category(r.obj) === 'noun' && ruleApplies(state, r, o)) {
          const idx = targets.indexOf(r.obj);
          if (idx >= 0) targets.splice(idx, 1);
        }
      }
      if (blocked || !targets.length) { result.push(o); continue; }
      changed = true;
      for (const t of targets) {
        if (t === 'text') {
          if (o.type === 'text') continue;
          result.push({ id: state.nextId++, type: 'text', word: o.type, x: o.x, y: o.y, dir: o.dir });
        } else {
          result.push({ id: state.nextId++, type: t, x: o.x, y: o.y, dir: o.dir });
        }
      }
    }
    if (changed) state.objs = result;
    return changed;
  }

  // ---------- 傳送 ----------

  // 只有這回合「移動到」傳送點上的物體才會被傳送（停在上面不動的不會一直來回傳送）。
  function telePhase(state, ctx, before) {
    const startPos = new Map(before.objs.map(o => [o.id, o]));
    const teles = state.objs.filter(o => ctx.has(o, 'tele'));
    const byType = new Map();
    for (const t of teles) {
      const k = t.type === 'text' ? 'text:' + t.word : t.type;
      if (!byType.has(k)) byType.set(k, []);
      byType.get(k).push(t);
    }
    const plans = [];
    for (const list of byType.values()) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.id - b.id);
      list.forEach((t, i) => {
        const dest = list[(i + 1) % list.length];
        for (const p of objsAt(state, t.x, t.y)) {
          if (ctx.has(p, 'tele')) continue;
          if (floatOf(ctx, p) !== floatOf(ctx, t)) continue;
          const from = startPos.get(p.id);
          if (!from || (from.x === p.x && from.y === p.y)) continue;
          plans.push([p, dest.x, dest.y]);
        }
      });
    }
    const done = new Set();
    for (const [p, x, y] of plans) {
      if (done.has(p.id)) continue;
      done.add(p.id);
      p.x = x;
      p.y = y;
    }
    return plans.length > 0;
  }

  // ---------- 摧毀與互動 ----------

  function interactionPhase(state, ctx) {
    const cells = new Map();
    for (const o of state.objs) {
      const k = o.x + ',' + o.y + ',' + (floatOf(ctx, o) ? 1 : 0);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(o);
    }
    const destroyed = new Set();
    const events = new Set();
    for (const group of cells.values()) {
      const any = p => group.some(o => ctx.has(o, p));
      // SINK：沉入並一起消失
      if (group.length >= 2 && any('sink')) {
        group.forEach(o => destroyed.add(o.id));
        events.add('sink');
      }
      // DEFEAT：摧毀 YOU
      if (any('defeat')) {
        for (const o of group) {
          if (ctx.has(o, 'you')) { destroyed.add(o.id); events.add('defeat'); }
        }
      }
      // HOT / MELT：熔化
      if (any('hot')) {
        for (const o of group) {
          if (ctx.has(o, 'melt')) { destroyed.add(o.id); events.add('melt'); }
        }
      }
      // OPEN / SHUT：開門
      const opens = group.filter(o => ctx.has(o, 'open') && !destroyed.has(o.id));
      const shuts = group.filter(o => ctx.has(o, 'shut') && !destroyed.has(o.id));
      for (const o of opens) {
        if (ctx.has(o, 'shut')) { destroyed.add(o.id); events.add('open'); }
      }
      const po = opens.filter(o => !destroyed.has(o.id));
      const ps = shuts.filter(o => !destroyed.has(o.id));
      const n = Math.min(po.length, ps.length);
      for (let i = 0; i < n; i++) {
        destroyed.add(po[i].id);
        destroyed.add(ps[i].id);
        events.add('open');
      }
      // WEAK：碰到任何東西就壞掉
      if (group.length >= 2) {
        for (const o of group) {
          if (ctx.has(o, 'weak')) { destroyed.add(o.id); events.add('weak'); }
        }
      }
    }
    if (!destroyed.size) return events;

    const spawned = [];
    for (const o of state.objs) {
      if (!destroyed.has(o.id)) continue;
      const ownNoun = o.type === 'text' ? 'text' : o.type;
      const gives = [];
      for (const r of ctx.rules) {
        if (r.verb !== 'has' || !ruleApplies(state, r, o)) continue;
        if (r.objNeg) continue;
        if (!gives.includes(r.obj)) gives.push(r.obj);
      }
      for (const r of ctx.rules) {
        if (r.verb === 'has' && r.objNeg && ruleApplies(state, r, o)) {
          const idx = gives.indexOf(r.obj);
          if (idx >= 0) gives.splice(idx, 1);
        }
      }
      for (const g of gives) {
        if (g === 'text') {
          if (ownNoun !== 'text') spawned.push({ type: 'text', word: o.type, x: o.x, y: o.y, dir: o.dir });
        } else {
          spawned.push({ type: g, x: o.x, y: o.y, dir: o.dir });
        }
      }
    }
    state.objs = state.objs.filter(o => !destroyed.has(o.id));
    for (const s of spawned) addObj(state, s.type, s.x, s.y, s.dir, s.word);
    return events;
  }

  function checkWin(state, ctx) {
    for (const o of state.objs) {
      if (!ctx.has(o, 'you')) continue;
      for (const p of objsAt(state, o.x, o.y)) {
        if (ctx.has(p, 'win') && floatOf(ctx, p) === floatOf(ctx, o)) return true;
      }
    }
    return false;
  }

  // ---------- 一個回合 ----------

  // dir 為 'up' | 'down' | 'left' | 'right'，或 null 表示等待。
  // 每個階段只有在真的有物體移動或改變時，才重新分析規則。
  function step(state, dir) {
    const s = cloneState(state);
    let ctx = analyze(s);
    if (dir && youPhase(s, ctx, dir)) ctx = analyze(s);
    if (movePhase(s, ctx)) ctx = analyze(s);
    if (shiftPhase(s, ctx)) ctx = analyze(s);
    if (transformPhase(s, ctx)) ctx = analyze(s);
    if (telePhase(s, ctx, state)) ctx = analyze(s);
    const events = interactionPhase(s, ctx);
    if (events.size) ctx = analyze(s);
    const win = checkWin(s, ctx);
    const hasYou = s.objs.some(o => ctx.has(o, 'you'));
    return { state: s, ctx, win, hasYou, events: [...events] };
  }

  function stateKey(state) {
    return state.objs
      .map(o => `${o.type}${o.word ? ':' + o.word : ''}@${o.x},${o.y},${o.dir[0]}`)
      .sort()
      .join(';');
  }

  // 將規則轉成可讀文字（顯示在畫面上的規則列表）。
  function ruleToText(r) {
    const n = (neg, w) => (neg ? 'NOT ' : '') + w.toUpperCase();
    let s = n(r.subjNeg, r.subj);
    for (const c of r.conds) s += ' ' + (c.neg ? 'NOT ' : '') + c.type.toUpperCase() + ' ' + n(c.nounNeg, c.noun);
    s += ' ' + r.verb.toUpperCase() + ' ' + n(r.objNeg, r.obj);
    return s;
  }

  const api = {
    NOUNS, PROPS, CONDS, VERBS, DIRS, LABELS,
    category, label, createState, cloneState, analyze, step, stateKey, ruleToText,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BabaEngine = api;
})(this);
