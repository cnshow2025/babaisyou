// Canvas 繪圖：物體、文字方塊與移動動畫。
(function (root) {
  'use strict';

  const COLORS = {
    bg: '#15181f',
    grid: '#1b1f28',
    baba: '#f4f4f4',
    keke: '#e5533d',
    flag: '#ede285',
    wall: '#3b3f4a',
    wallEdge: '#4d5260',
    rock: '#c29e6a',
    water: '#5f9ddf',
    skull: '#b3263b',
    lava: '#e49950',
    key: '#ede285',
    door: '#c0392b',
    grass: '#4c8a3f',
    noun: '#d9396a',
    op: '#f4f4f4',
  };

  const PROP_COLORS = {
    you: '#d9396a', win: '#ede285', stop: '#4b8f3c', push: '#90673e',
    pull: '#90673e', defeat: '#b3263b', sink: '#5f9ddf', hot: '#e49950',
    melt: '#5f9ddf', open: '#ede285', shut: '#c0392b', move: '#83c8e5',
    float: '#83c8e5', weak: '#9c9c9c', tele: '#8e5bd1', shift: '#5f9ddf',
  };

  // 繪製順序：地面類物體在下，角色與文字在上。
  const LAYER = {
    water: 0, lava: 0, grass: 0, wall: 1, door: 2, skull: 3, rock: 3,
    key: 3, flag: 4, keke: 5, baba: 5, text: 6,
  };

  const ANIM_MS = 90;

  function createRenderer(canvas) {
    const g = canvas.getContext('2d');
    let state = null;
    let ctx = null;
    let from = new Map();
    let animStart = 0;
    let tile = 32;
    let offX = 0, offY = 0;
    let frame = 0;

    function resize() {
      if (!state) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const maxW = rect.width;
      const maxH = Math.max(200, Math.min(window.innerHeight * 0.7, 720));
      tile = Math.max(12, Math.floor(Math.min(maxW / state.w, maxH / state.h)));
      const cw = tile * state.w, ch = tile * state.h;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      offX = 0;
      offY = 0;
    }

    function setState(next, nextCtx, animate) {
      from = new Map();
      if (animate && state) {
        for (const o of state.objs) from.set(o.id, [o.x, o.y]);
      }
      const sizeChanged = !state || state.w !== next.w || state.h !== next.h;
      state = next;
      ctx = nextCtx;
      animStart = performance.now();
      if (sizeChanged) resize();
    }

    function posOf(o, now) {
      const f = from.get(o.id);
      if (!f) return [o.x, o.y];
      const t = Math.min(1, (now - animStart) / ANIM_MS);
      const e = 1 - (1 - t) * (1 - t);
      return [f[0] + (o.x - f[0]) * e, f[1] + (o.y - f[1]) * e];
    }

    function draw(now) {
      frame = Math.floor(now / 380) % 3;
      if (!state) return;
      const W = state.w * tile, H = state.h * tile;
      g.fillStyle = COLORS.bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = COLORS.grid;
      g.lineWidth = 1;
      for (let x = 1; x < state.w; x++) {
        g.beginPath(); g.moveTo(x * tile + 0.5, 0); g.lineTo(x * tile + 0.5, H); g.stroke();
      }
      for (let y = 1; y < state.h; y++) {
        g.beginPath(); g.moveTo(0, y * tile + 0.5); g.lineTo(W, y * tile + 0.5); g.stroke();
      }
      const list = state.objs.slice().sort((a, b) => {
        const la = (LAYER[a.type] ?? 3) + (ctx && ctx.has(a, 'you') ? 0.5 : 0);
        const lb = (LAYER[b.type] ?? 3) + (ctx && ctx.has(b, 'you') ? 0.5 : 0);
        return la - lb || a.id - b.id;
      });
      for (const o of list) {
        const [x, y] = posOf(o, now);
        const px = offX + x * tile, py = offY + y * tile;
        const floating = ctx && ctx.has(o, 'float');
        const bob = floating ? Math.sin(now / 300 + o.id) * tile * 0.06 - tile * 0.06 : 0;
        g.save();
        g.translate(px, py + bob);
        if (o.type === 'text') drawText(o);
        else drawObject(o);
        g.restore();
      }
    }

    // 小小的抖動，讓畫面有原作那種手繪感。
    function jitter(i) {
      const seeds = [[0, 0], [0.6, -0.4], [-0.5, 0.5]];
      return seeds[(frame + i) % 3].map(v => v * tile / 32);
    }

    function drawText(o) {
      const s = tile;
      const cat = BabaEngine.category(o.word);
      const color = cat === 'noun' ? COLORS.noun : cat === 'prop' ? PROP_COLORS[o.word] : COLORS.op;
      const active = ctx && ctx.active.has(o.id);
      g.globalAlpha = active ? 1 : 0.42;
      const label = o.word.toUpperCase();
      const [jx, jy] = jitter(o.id);
      if (cat === 'prop') {
        g.fillStyle = color;
        roundRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88, s * 0.12);
        g.fill();
        g.fillStyle = COLORS.bg;
      } else {
        g.fillStyle = color;
      }
      let size = s * 0.36;
      g.font = `800 ${size}px "Trebuchet MS", "Arial Black", sans-serif`;
      const maxW = s * 0.84;
      const w = g.measureText(label).width;
      if (w > maxW) {
        size *= maxW / w;
        g.font = `800 ${size}px "Trebuchet MS", "Arial Black", sans-serif`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, s / 2 + jx, s / 2 + jy + size * 0.05);
      g.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    function eyes(o, color) {
      const s = tile;
      const dir = o.dir;
      const dx = dir === 'left' ? -0.08 : dir === 'right' ? 0.08 : 0;
      const dy = dir === 'up' ? -0.06 : dir === 'down' ? 0.04 : 0;
      g.fillStyle = color;
      for (const ex of [0.38, 0.62]) {
        g.fillRect(s * (ex + dx) - s * 0.04, s * (0.42 + dy), s * 0.08, s * 0.14);
      }
    }

    function drawObject(o) {
      const s = tile;
      const [jx, jy] = jitter(o.id);
      g.translate(jx, jy);
      switch (o.type) {
        case 'baba': {
          g.fillStyle = COLORS.baba;
          roundRect(s * 0.16, s * 0.3, s * 0.68, s * 0.5, s * 0.2);
          g.fill();
          g.fillRect(s * 0.22, s * 0.74, s * 0.1, s * 0.12);
          g.fillRect(s * 0.68, s * 0.74, s * 0.1, s * 0.12);
          // 耳朵
          g.fillRect(s * 0.24, s * 0.16, s * 0.08, s * 0.18);
          g.fillRect(s * 0.66, s * 0.16, s * 0.08, s * 0.18);
          eyes(o, COLORS.bg);
          break;
        }
        case 'keke': {
          g.fillStyle = COLORS.keke;
          roundRect(s * 0.2, s * 0.18, s * 0.6, s * 0.62, s * 0.22);
          g.fill();
          g.fillRect(s * 0.26, s * 0.76, s * 0.1, s * 0.12);
          g.fillRect(s * 0.64, s * 0.76, s * 0.1, s * 0.12);
          eyes(o, COLORS.bg);
          break;
        }
        case 'flag': {
          g.fillStyle = COLORS.flag;
          g.fillRect(s * 0.28, s * 0.14, s * 0.07, s * 0.72);
          g.beginPath();
          g.moveTo(s * 0.35, s * 0.16);
          g.lineTo(s * 0.8, s * 0.3);
          g.lineTo(s * 0.35, s * 0.46);
          g.closePath();
          g.fill();
          g.fillRect(s * 0.2, s * 0.82, s * 0.24, s * 0.06);
          break;
        }
        case 'wall': {
          g.translate(-jx, -jy);
          g.fillStyle = COLORS.wall;
          g.fillRect(1, 1, s - 2, s - 2);
          g.strokeStyle = COLORS.wallEdge;
          g.lineWidth = Math.max(1, s * 0.05);
          g.beginPath();
          g.moveTo(1, s * 0.5); g.lineTo(s - 1, s * 0.5);
          g.moveTo(s * 0.5, 1); g.lineTo(s * 0.5, s * 0.5);
          g.moveTo(s * 0.25, s * 0.5); g.lineTo(s * 0.25, s - 1);
          g.moveTo(s * 0.75, s * 0.5); g.lineTo(s * 0.75, s - 1);
          g.stroke();
          break;
        }
        case 'rock': {
          g.fillStyle = COLORS.rock;
          g.beginPath();
          g.moveTo(s * 0.18, s * 0.78);
          g.lineTo(s * 0.24, s * 0.4);
          g.lineTo(s * 0.46, s * 0.2);
          g.lineTo(s * 0.72, s * 0.3);
          g.lineTo(s * 0.84, s * 0.62);
          g.lineTo(s * 0.76, s * 0.8);
          g.closePath();
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.18)';
          g.fillRect(s * 0.5, s * 0.5, s * 0.2, s * 0.08);
          break;
        }
        case 'water': {
          g.translate(-jx, -jy);
          g.fillStyle = COLORS.water;
          g.fillRect(0, 0, s, s);
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.lineWidth = Math.max(1, s * 0.05);
          const shift = frame * s * 0.08;
          for (const yy of [0.35, 0.7]) {
            g.beginPath();
            g.moveTo(s * 0.1 + shift, s * yy);
            g.quadraticCurveTo(s * 0.3 + shift, s * (yy - 0.08), s * 0.5 + shift, s * yy);
            g.stroke();
          }
          break;
        }
        case 'lava': {
          g.translate(-jx, -jy);
          g.fillStyle = COLORS.lava;
          g.fillRect(0, 0, s, s);
          g.fillStyle = 'rgba(255,230,120,0.5)';
          const b = frame * 0.1;
          g.beginPath(); g.arc(s * (0.3 + b), s * 0.35, s * 0.08, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(s * (0.7 - b), s * 0.7, s * 0.06, 0, Math.PI * 2); g.fill();
          break;
        }
        case 'grass': {
          g.translate(-jx, -jy);
          g.fillStyle = '#23331f';
          g.fillRect(0, 0, s, s);
          g.strokeStyle = COLORS.grass;
          g.lineWidth = Math.max(1, s * 0.07);
          for (const [bx, by] of [[0.25, 0.4], [0.6, 0.3], [0.4, 0.75], [0.78, 0.7]]) {
            g.beginPath();
            g.moveTo(s * bx, s * by + s * 0.1);
            g.lineTo(s * bx - s * 0.05, s * by - s * 0.05);
            g.moveTo(s * bx, s * by + s * 0.1);
            g.lineTo(s * bx + s * 0.06, s * by - s * 0.04);
            g.stroke();
          }
          break;
        }
        case 'skull': {
          g.fillStyle = COLORS.skull;
          g.beginPath();
          g.arc(s * 0.5, s * 0.42, s * 0.28, 0, Math.PI * 2);
          g.fill();
          g.fillRect(s * 0.32, s * 0.55, s * 0.36, s * 0.24);
          g.fillStyle = COLORS.bg;
          g.beginPath(); g.arc(s * 0.39, s * 0.44, s * 0.07, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(s * 0.61, s * 0.44, s * 0.07, 0, Math.PI * 2); g.fill();
          g.fillRect(s * 0.42, s * 0.66, s * 0.05, s * 0.1);
          g.fillRect(s * 0.53, s * 0.66, s * 0.05, s * 0.1);
          break;
        }
        case 'key': {
          g.strokeStyle = COLORS.key;
          g.fillStyle = COLORS.key;
          g.lineWidth = Math.max(2, s * 0.09);
          g.beginPath(); g.arc(s * 0.32, s * 0.5, s * 0.14, 0, Math.PI * 2); g.stroke();
          g.fillRect(s * 0.44, s * 0.46, s * 0.38, s * 0.08);
          g.fillRect(s * 0.66, s * 0.54, s * 0.07, s * 0.12);
          g.fillRect(s * 0.76, s * 0.54, s * 0.07, s * 0.09);
          break;
        }
        case 'door': {
          g.translate(-jx, -jy);
          g.fillStyle = COLORS.door;
          g.fillRect(s * 0.1, s * 0.06, s * 0.8, s * 0.88);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(s * 0.2, s * 0.16, s * 0.25, s * 0.3);
          g.fillRect(s * 0.55, s * 0.16, s * 0.25, s * 0.3);
          g.fillStyle = COLORS.key;
          g.beginPath(); g.arc(s * 0.7, s * 0.6, s * 0.05, 0, Math.PI * 2); g.fill();
          break;
        }
        default: {
          g.fillStyle = '#888';
          g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
        }
      }
    }

    function loop(now) {
      draw(now);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return { setState, resize };
  }

  root.BabaRender = { createRenderer, PROP_COLORS, COLORS };
})(this);
