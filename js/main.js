// 遊戲流程：關卡選單、鍵盤／觸控輸入、復原、過關判定與進度儲存。
(function () {
  'use strict';

  const Engine = window.BabaEngine;
  const { LEVELS, parseLevel } = window.BabaLevels;
  const { createRenderer, PROP_COLORS } = window.BabaRender;
  const STORAGE_KEY = 'baba-web-progress';

  const $ = id => document.getElementById(id);
  const menuEl = $('menu');
  const gameEl = $('game');
  const overlayEl = $('overlay');
  const statusEl = $('status');
  const renderer = createRenderer($('board'));

  let current = -1;
  let state = null;
  let history = [];
  let won = false;

  // ---------- 進度 ----------

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveProgress(done) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
    } catch (e) {
      // 無法儲存時忽略（例如私密瀏覽模式）
    }
  }

  let completed = loadProgress();

  // ---------- 選單 ----------

  function showMenu() {
    current = -1;
    gameEl.classList.add('hidden');
    menuEl.classList.remove('hidden');
    const wrap = $('level-grid');
    wrap.innerHTML = '';
    // 沒有難度星等的是基礎篇，有星等的是進階篇
    const sections = [
      { title: '基礎篇', levels: LEVELS.map((lv, i) => i).filter(i => !LEVELS[i].stars) },
      { title: '進階篇', levels: LEVELS.map((lv, i) => i).filter(i => LEVELS[i].stars) },
    ];
    for (const sec of sections) {
      if (!sec.levels.length) continue;
      const first = sec.levels[0] + 1, last = sec.levels[sec.levels.length - 1] + 1;
      const h = document.createElement('h3');
      h.className = 'section-title';
      h.textContent = `${sec.title}（第 ${first}～${last} 關）`;
      wrap.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'level-grid';
      for (const i of sec.levels) {
        const lv = LEVELS[i];
        const btn = document.createElement('button');
        btn.className = 'level-btn' + (completed.has(i) ? ' done' : '');
        btn.dataset.level = i + 1;
        btn.innerHTML = `<span class="num">${i + 1}</span><span class="name"></span>`;
        btn.querySelector('.name').textContent = lv.name;
        if (lv.stars) {
          const st = document.createElement('span');
          st.className = 'stars';
          st.textContent = '★'.repeat(lv.stars);
          st.title = `難度 ${lv.stars} 顆星`;
          btn.appendChild(st);
        }
        btn.addEventListener('click', () => startLevel(i));
        grid.appendChild(btn);
      }
      wrap.appendChild(grid);
    }
    $('progress').textContent = `已完成 ${completed.size} / ${LEVELS.length}`;
  }

  // ---------- 關卡 ----------

  function startLevel(i) {
    current = i;
    const lv = LEVELS[i];
    const def = parseLevel(lv);
    menuEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    $('level-title').textContent = `第 ${i + 1} 關：${lv.name}` + (lv.stars ? '　' + '★'.repeat(lv.stars) : '');
    $('level-hint').textContent = lv.hint;
    history = [];
    won = false;
    overlayEl.classList.add('hidden');
    state = Engine.createState(def.w, def.h, def.objs);
    show(Engine.analyze(state), false);
    renderer.resize();
  }

  function show(ctx, animate) {
    renderer.setState(state, ctx, animate);
    updateRules(ctx);
    const hasYou = state.objs.some(o => ctx.has(o, 'you'));
    statusEl.textContent = !won && !hasYou ? '現在沒有任何東西是 YOU。按 Z 復原或 R 重來。' : '';
  }

  function updateRules(ctx) {
    const list = $('rule-list');
    list.innerHTML = '';
    if (!ctx.rules.length) {
      const li = document.createElement('li');
      li.textContent = '（沒有任何規則）';
      list.appendChild(li);
      return;
    }
    for (const r of ctx.rules) {
      const li = document.createElement('li');
      for (const word of Engine.ruleToText(r).split(' ')) {
        const span = document.createElement('span');
        const w = word.toLowerCase();
        const cat = Engine.category(w);
        if (cat === 'noun') span.className = 'w-noun';
        else if (cat === 'prop') span.style.color = PROP_COLORS[w];
        else span.className = 'w-op';
        span.textContent = Engine.label(w) + ' ';
        li.appendChild(span);
      }
      list.appendChild(li);
    }
  }

  function doMove(dir) {
    if (current < 0 || won) return;
    const res = Engine.step(state, dir);
    // 什麼都沒改變（包含方向）就不記錄這一步
    if (Engine.stateKey(res.state) === Engine.stateKey(state)) return;
    history.push(state);
    state = res.state;
    if (res.win) won = true;
    show(res.ctx, true);
    if (won) onWin();
  }

  function undo() {
    if (current < 0 || !history.length) return;
    state = history.pop();
    won = false;
    overlayEl.classList.add('hidden');
    show(Engine.analyze(state), true);
  }

  function restart() {
    if (current < 0) return;
    startLevel(current);
  }

  function onWin() {
    completed.add(current);
    saveProgress(completed);
    const last = current === LEVELS.length - 1;
    $('overlay-text').textContent = last ? `恭喜！全部 ${LEVELS.length} 關都過關了！` : '過關！';
    $('btn-next').classList.toggle('hidden', last);
    setTimeout(() => {
      overlayEl.classList.remove('hidden');
      (last ? $('btn-overlay-menu') : $('btn-next')).focus();
    }, 150);
  }

  function nextLevel() {
    if (current >= 0 && current < LEVELS.length - 1) startLevel(current + 1);
    else showMenu();
  }

  // ---------- 輸入 ----------

  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  document.addEventListener('keydown', e => {
    if (current < 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (won) {
      if (e.key === 'Enter') { e.preventDefault(); nextLevel(); }
      else if (e.key === 'Escape') { e.preventDefault(); showMenu(); }
      else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); }
      return;
    }
    if (KEYS[e.key]) { e.preventDefault(); doMove(KEYS[e.key]); }
    else if (e.key === ' ') { e.preventDefault(); doMove(null); }
    else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    else if (e.key === 'Escape') { e.preventDefault(); showMenu(); }
  });

  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.move;
      doMove(m === 'wait' ? null : m);
    });
  });

  // 在棋盤上滑動也能移動（手機）
  let touchStart = null;
  const board = $('board');
  board.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = [t.clientX, t.clientY];
  }, { passive: true });
  board.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart[0], dy = t.clientY - touchStart[1];
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  });

  $('btn-menu').addEventListener('click', showMenu);
  $('btn-undo').addEventListener('click', undo);
  $('btn-restart').addEventListener('click', restart);
  $('btn-next').addEventListener('click', nextLevel);
  $('btn-overlay-menu').addEventListener('click', showMenu);

  // 屬性色塊（說明表格）
  document.querySelectorAll('.chip[data-p]').forEach(el => {
    el.style.background = PROP_COLORS[el.dataset.p];
  });

  showMenu();

  // ---------- 安裝（PWA） ----------

  const installBtn = $('btn-install');
  const installTip = $('install-tip');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Chrome／Edge／Android：瀏覽器確認可以安裝時才顯示按鈕
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    installBtn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installBtn.classList.add('hidden');
    installTip.classList.add('hidden');
  });

  // iPhone／iPad 沒有安裝事件，改為顯示手動加入主畫面的說明
  if (isIOS && !standalone && location.protocol !== 'file:') {
    installBtn.classList.remove('hidden');
  }

  installBtn.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') installBtn.classList.add('hidden');
      installPrompt = null;
    } else if (isIOS) {
      installTip.textContent = '在 Safari 下方點「分享」按鈕（方框加向上箭頭），再選「加入主畫面」即可安裝。';
      installTip.classList.toggle('hidden');
    }
  });
})();
