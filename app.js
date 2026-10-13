/* Frequency Oasis — core app: spatial lab, lessons, missions, assessment, field log.
   Build 03. All lab/lesson/mission/quiz behaviour from Build 02 is kept; additions are marked NEW. */
(() => {
  'use strict';

  const C = 343; // speed of sound used by the lab readout (m/s)
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE_KEY = 'frequency-oasis:v3';
  const VIEWS = ['lab', 'lessons', 'missions', 'assessment', 'bench', 'log'];

  /* Environment copy is unchanged from Build 02. */
  const ENV = {
    studio: { label: 'Music studio', title: 'Control room / stereo geometry', type: 'PERSPECTIVE ROOM MODEL', tag: 'STUDIO / FIELD 01', room: 'CONTROL ROOM', lesson: 1 },
    film: { label: 'Film / dialogue', title: 'Film set / dialogue capture', type: 'TOP-DOWN SET MODEL', tag: 'FILM / FIELD 05', room: 'FILM SET', lesson: 4 },
    cinema: { label: 'Cinema / surround', title: 'Cinema / listener coverage', type: 'CONCEPTUAL CHANNEL MAP', tag: 'CINEMA / FIELD 07', room: 'CINEMA PLAYBACK', lesson: 6 },
    live: { label: 'Live sound', title: 'Live venue / coverage geometry', type: 'CONCEPTUAL VENUE MAP', tag: 'LIVE / FIELD 08', room: 'LIVE VENUE', lesson: 7 },
  };

  const LIMITS = {
    w: [3, 12], d: [3, 14], h: [2.2, 6], srcY: [0.4, 4], lisY: [1, 10], lisX: [-2.5, 2.5], spacing: [0.8, 4],
  };
  const DEFAULTS = { w: 5, d: 6, h: 2.7, srcY: 1, lisY: 3.2, lisX: 0, spacing: 1.8 };
  const OVERLAY_OFF = { direct: false, reflections: false, coverage: false, labels: false, waves: false, loop: false };

  const S = {
    ...DEFAULTS,
    env: 'studio',
    module: 1,
    checked: false,
    plan: false,
    view: 'lab',
    overlay: { ...OVERLAY_OFF, direct: true },
    drag: null,
    explored: new Set(),
    notes: [],
    missions: new Set(),
    best: null, // best assessment percentage
  };

  /* ───────────── tiny pub/sub so audio.js and bench.js can follow the lab ───────────── */
  const hooks = { update: [], view: [], env: [] };
  const emit = (name, ...a) => hooks[name].forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } });

  /* ───────────── persistence (always try/catch: private windows can throw) ───────────── */
  let saveTimer = 0;
  let noSave = false;
  function persist() {
    if (noSave) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 3,
        geo: Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, S[k]])),
        env: S.env, plan: S.plan, overlay: S.overlay, module: S.module,
        explored: [...S.explored], missions: [...S.missions], notes: S.notes, best: S.best,
      }));
    } catch (e) { /* storage unavailable: the app still works */ }
  }
  const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250); };
  function restore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      Object.keys(DEFAULTS).forEach((k) => {
        const v = Number(d.geo && d.geo[k]);
        if (Number.isFinite(v)) S[k] = clamp(v, LIMITS[k][0], LIMITS[k][1]);
      });
      if (ENV[d.env]) S.env = d.env;
      S.plan = !!d.plan;
      if (d.overlay) Object.keys(OVERLAY_OFF).forEach((k) => { S.overlay[k] = !!d.overlay[k]; });
      if (Number.isInteger(d.module) && lessons[d.module]) S.module = d.module;
      (d.explored || []).forEach((i) => { if (lessons[i]) S.explored.add(i); });
      (d.missions || []).forEach((i) => { if (missions[i]) S.missions.add(i); });
      if (Array.isArray(d.notes)) {
        S.notes = d.notes.filter((n) => n && typeof n.text === 'string').slice(0, 200);
      }
      if (Number.isFinite(d.best)) S.best = d.best;
    } catch (e) { /* corrupted storage: start fresh */ }
  }

  /* ───────────── scene model ───────────── */
  const listenerX = () => S.w / 2 + S.lisX + (S.env === 'film' ? 0.35 : 0);

  function sceneEntities() {
    const out = [];
    const gold = '#c9a84c', blue = '#8db3c9', red = '#df6252', violet = '#b9a0d8';
    if (S.env === 'studio') {
      out.push({ id: 'srcL', x: S.w / 2 - S.spacing / 2, y: S.srcY, z: 0.45, color: gold, label: 'MONITOR L', drag: true });
      out.push({ id: 'srcR', x: S.w / 2 + S.spacing / 2, y: S.srcY, z: 0.45, color: gold, label: 'MONITOR R', drag: true });
      out.push({ id: 'listener', x: listenerX(), y: S.lisY, z: 0.25, color: blue, label: 'LISTENER', drag: true });
    } else if (S.env === 'film') {
      out.push({ id: 'srcL', x: S.w / 2, y: S.srcY, z: 1.3, color: gold, label: 'BOOM MIC', drag: true });
      out.push({ id: 'listener', x: listenerX(), y: S.lisY, z: 0.5, color: blue, label: 'TALENT', drag: true });
    } else if (S.env === 'cinema') {
      out.push({ id: 'srcL', x: S.w * 0.2, y: 0.3, z: 0.5, color: gold, label: 'FRONT L' });
      out.push({ id: 'srcR', x: S.w * 0.8, y: 0.3, z: 0.5, color: gold, label: 'FRONT R' });
      out.push({ id: 'listener', x: listenerX(), y: S.lisY, z: 0.25, color: blue, label: 'SEATING', drag: true });
      /* NEW: reference channels, decorative only */
      out.push({ id: 'ctr', x: S.w / 2, y: 0.3, z: 0.5, color: gold, label: 'CENTER', ref: true });
      out.push({ id: 'surL', x: 0.2, y: S.d * 0.6, z: 1.2, color: gold, label: 'SURR L', ref: true });
      out.push({ id: 'surR', x: S.w - 0.2, y: S.d * 0.6, z: 1.2, color: gold, label: 'SURR R', ref: true });
    } else {
      out.push({ id: 'srcL', x: S.w * 0.25, y: 0.6, z: 1.0, color: gold, label: 'MAIN L' });
      out.push({ id: 'srcR', x: S.w * 0.75, y: 0.6, z: 1.0, color: gold, label: 'MAIN R' });
      out.push({ id: 'listener', x: listenerX(), y: S.lisY, z: 0.25, color: blue, label: 'AUDIENCE', drag: true });
      out.push({ id: 'monitor', x: S.w / 2, y: 1.7, z: 0.25, color: red, label: 'STAGE MONITOR', ref: true });
      out.push({ id: 'mic', x: S.w / 2, y: 1.2, z: 1.4, color: violet, label: 'VOCAL MIC', ref: true }); /* NEW */
    }
    return out;
  }
  function geo() {
    const ents = sceneEntities();
    return { ents, L: ents.find((e) => e.id === 'srcL'), R: ents.find((e) => e.id === 'srcR'), lis: ents.find((e) => e.id === 'listener') };
  }
  /* For audio and the bench: who radiates, who receives. In film mode the talent speaks to the boom. */
  function paths() {
    const { L, R, lis } = geo();
    return S.env === 'film' ? { emitters: [lis], receiver: L, film: true } : { emitters: [L, R].filter(Boolean), receiver: lis, film: false };
  }

  /* ───────────── projection ───────────── */
  function cam() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (S.plan) {
      const s = Math.min((w - 70) / S.w, (h - 136) / S.d);
      return { plan: true, w, h, s, ox: w / 2, oy: 70 };
    }
    const floorY = h * 0.79;
    const sFitX = (w - 24) / (S.w * 0.88 + S.d * 0.34);
    const sFitY = (floorY - 30) / (S.d * 0.48 + S.h * 0.9 + S.w * 0.065);
    return { plan: false, w, h, s: Math.min(w / 11, h / 8, sFitX, sFitY), cx: w * 0.5, floorY };
  }
  function project(x, y, z = 0, c = cam()) {
    if (c.plan) return { x: c.ox + (x - S.w / 2) * c.s, y: c.oy + y * c.s };
    const s = c.s;
    return { x: c.cx + (x - S.w / 2) * s * 0.88 + (y - S.d / 2) * s * 0.34, y: c.floorY + (x - S.w / 2) * s * 0.13 - y * s * 0.48 - z * s * 0.9 };
  }
  /* exact inverse of project() for a known height z (replaces Build 02's grid search) */
  function unproject(px, py, z = 0) {
    const c = cam();
    if (c.plan) return { x: (px - c.ox) / c.s + S.w / 2, y: (py - c.oy) / c.s };
    const s = c.s;
    const u = (px - c.cx) / s + (0.34 * S.d) / 2;
    const v = (py - c.floorY + z * s * 0.9) / s;
    const det = 0.88 * -0.48 - 0.34 * 0.13;
    return { x: (u * -0.48 - 0.34 * v) / det + S.w / 2, y: (0.88 * v - 0.13 * u) / det };
  }

  /* ───────────── drawing helpers ───────────── */
  function line(a, b, color, width = 1, dash = []) {
    ctx.beginPath(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  function poly(points, fill, stroke) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function text(str, p, color = '#aeb6aa', size = 10, align = 'center') {
    ctx.fillStyle = color; ctx.font = `${size}px ui-monospace,monospace`; ctx.textAlign = align; ctx.fillText(str, p.x, p.y);
  }
  function arrow(a, b, color, dash) {
    line(a, b, color, 1.3, dash);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.beginPath(); ctx.fillStyle = color;
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 9 * Math.cos(ang - 0.4), b.y - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(b.x - 9 * Math.cos(ang + 0.4), b.y - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  /* true 2-D image-source reflection point on a wall (used in plan view) */
  function wallBounce(src, lis, wall) {
    let img;
    if (wall === 'front') img = { x: src.x, y: -src.y };
    else if (wall === 'back') img = { x: src.x, y: 2 * S.d - src.y };
    else if (wall === 'left') img = { x: -src.x, y: src.y };
    else img = { x: 2 * S.w - src.x, y: src.y };
    let t;
    if (wall === 'front') t = lis.y / (lis.y - img.y);
    else if (wall === 'back') t = (S.d - lis.y) / (img.y - lis.y);
    else if (wall === 'left') t = lis.x / (lis.x - img.x);
    else t = (S.w - lis.x) / (img.x - lis.x);
    return { x: lis.x + t * (img.x - lis.x), y: lis.y + t * (img.y - lis.y) };
  }

  function draw() {
    const c = cam();
    const { w, h } = c;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#121916'); g.addColorStop(1, '#080b09');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const P = (x, y, z = 0) => project(x, y, z, c);
    let capY = 38;
    const caption = (str, col) => { text(str, { x: w / 2, y: capY }, col, 9); capY += 11; };

    const a = P(0, 0), b = P(S.w, 0), cc = P(S.w, S.d), d = P(0, S.d);
    poly([a, b, cc, d], '#111714', '#59645a');
    if (!c.plan) {
      const backA = P(0, 0, S.h), backB = P(S.w, 0, S.h), backD = P(0, S.d, S.h);
      poly([a, b, backB, backA], '#151c18', '#39453b');
      poly([a, d, backD, backA], '#0f1512', '#39453b');
    }
    // architectural grid on floor
    for (let x = 0.5; x < S.w; x += 0.5) line(P(x, 0, 0.015), P(x, S.d, 0.015), '#9aa58d12');
    for (let y = 0.5; y < S.d; y += 0.5) line(P(0, y, 0.015), P(S.w, y, 0.015), '#9aa58d12');
    // rear wall warning stripe
    line(P(0.15, 0.08, 0.06), P(S.w - 0.15, 0.08, 0.06), '#df6252', 3);

    // room dimension arrows
    if (S.overlay.labels) {
      line(P(0, S.d + 0.18), P(S.w, S.d + 0.18), '#c9a84c', 1);
      text(`${S.w.toFixed(1)} m width`, P(S.w / 2, S.d + 0.38), '#c9a84c', 10);
      line(P(-0.18, 0), P(-0.18, S.d), '#c9a84c', 1);
      const dl = P(-0.5, S.d / 2);
      if (c.plan) { ctx.save(); ctx.translate(dl.x + 8, dl.y); ctx.rotate(-Math.PI / 2); text(`${S.d.toFixed(1)} m depth`, { x: 0, y: 0 }, '#c9a84c', 10); ctx.restore(); }
      else text(`${S.d.toFixed(1)} m depth`, dl, '#c9a84c', 10);
    }

    const ents = sceneEntities();
    const byId = Object.fromEntries(ents.map((e) => [e.id, e]));
    const srcs = ents.filter((e) => e.id.startsWith('src'));
    const lis = byId.listener;

    // NEW: ideal equilateral apex guide (studio, with labels on)
    if (S.overlay.labels && S.env === 'studio' && byId.srcL && byId.srcR) {
      const apex = { x: S.w / 2, y: S.srcY + S.spacing * Math.sin(Math.PI / 3) };
      const pa = P(apex.x, apex.y, 0.25);
      line(P(byId.srcL.x, byId.srcL.y, 0.25), pa, '#c9a84c55', 1, [2, 4]);
      line(P(byId.srcR.x, byId.srcR.y, 0.25), pa, '#c9a84c55', 1, [2, 4]);
      line(P(byId.srcL.x, byId.srcL.y, 0.25), P(byId.srcR.x, byId.srcR.y, 0.25), '#c9a84c55', 1, [2, 4]);
      ctx.beginPath(); ctx.arc(pa.x, pa.y, 11, 0, Math.PI * 2); ctx.strokeStyle = '#c9a84c99'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      text('EQUILATERAL APEX', { x: pa.x, y: pa.y + 24 }, '#c9a84c99', 8);
    }

    if (S.overlay.direct && lis) {
      srcs.forEach((e) => {
        const p = P(e.x, e.y, e.z), l = P(lis.x, lis.y, lis.z);
        line(p, l, '#c9a84cbb', 1.5, [5, 4]);
        if (S.overlay.labels) {
          const dist = Math.hypot(e.x - lis.x, e.y - lis.y);
          text(`${dist.toFixed(2)} m`, { x: (p.x + l.x) / 2 + 14, y: (p.y + l.y) / 2 }, '#d9d5c8', 9);
        }
      });
    }

    if (S.overlay.reflections && lis) {
      if (c.plan) {
        // true 2-D first-order paths in plan view
        srcs.forEach((e) => {
          ['front', 'left', 'right', 'back'].forEach((wall) => {
            const q = wallBounce(e, lis, wall);
            const alpha = wall === 'back' ? '77' : 'cc';
            line(P(e.x, e.y), P(q.x, q.y), `#df6252${alpha}`, 1.3, [4, 3]);
            line(P(q.x, q.y), P(lis.x, lis.y), `#df6252${alpha}`, 1.3, [4, 3]);
          });
        });
      } else {
        srcs.forEach((e) => {
          const p = P(e.x, e.y, e.z), l = P(lis.x, lis.y, lis.z);
          const wall = P(e.x, 0.05, e.z * 0.7), mirror = P(lis.x, 0.05, lis.z * 0.7);
          line(p, wall, '#df6252', 1.5, [4, 3]); line(wall, mirror, '#df6252', 1.5, [4, 3]); line(mirror, l, '#df6252', 1.5, [4, 3]);
        });
      }
    }

    if (S.overlay.coverage) {
      srcs.forEach((e) => {
        const p = P(e.x, e.y, e.z);
        if (c.plan && lis) {
          // conceptual ±30° cone aimed at the listener
          const ang = Math.atan2(lis.y - e.y, lis.x - e.x), len = Math.max(Math.hypot(lis.x - e.x, lis.y - e.y) * 1.3, 2);
          const p1 = P(e.x + len * Math.cos(ang - Math.PI / 6), e.y + len * Math.sin(ang - Math.PI / 6));
          const p2 = P(e.x + len * Math.cos(ang + Math.PI / 6), e.y + len * Math.sin(ang + Math.PI / 6));
          poly([p, p1, p2], '#8db3c914', null);
          line(p, p1, '#8db3c988', 1, [4, 4]); line(p, p2, '#8db3c988', 1, [4, 4]);
        } else {
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 30, 70, 24, -0.15, 0, Math.PI * 2);
          ctx.strokeStyle = '#8db3c988'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
      });
    }

    // NEW: slowed-down wavefronts
    if (S.overlay.waves) {
      const t = reduceMotion ? 0.3 : performance.now() / 1000;
      const gap = 0.8, maxR = Math.max(S.w, S.d) * 1.15;
      srcs.forEach((e) => {
        for (let r = (t * 0.9) % gap; r < maxR; r += gap) {
          ctx.beginPath();
          let pen = false;
          for (let k = 0; k <= 72; k++) {
            const ang = (k / 72) * Math.PI * 2, x = e.x + r * Math.cos(ang), y = e.y + r * Math.sin(ang);
            if (x < 0 || x > S.w || y < 0 || y > S.d) { pen = false; continue; }
            const p = P(x, y, c.plan ? 0 : 0.02);
            if (pen) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); pen = true; }
          }
          ctx.strokeStyle = `rgba(201,168,76,${(0.55 * (1 - r / maxR)).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.stroke();
        }
      });
      caption('WAVEFRONTS · SLOWED FOR VIEWING', '#c9a84c99');
    }

    // NEW: feedback loop (live sound)
    if (S.overlay.loop && S.env === 'live' && byId.mic) {
      const m = P(byId.mic.x, byId.mic.y, byId.mic.z);
      ['srcL', 'srcR', 'monitor'].forEach((id) => {
        const e = byId[id]; if (!e) return;
        arrow(P(e.x, e.y, e.z), m, '#b9a0d8cc', [6, 4]);
      });
      caption('FEEDBACK LOOP: MIC → AMP → LOUDSPEAKER → AIR → MIC', '#b9a0d8');
    } else if (S.overlay.loop) {
      caption('FEEDBACK LOOP OVERLAY IS FOR LIVE SOUND', '#9aa198');
    }

    // markers
    ents.forEach((e) => {
      const p = P(e.x, e.y, e.z);
      ctx.save(); ctx.globalAlpha = e.ref ? 0.78 : 1;
      ctx.shadowColor = e.color; ctx.shadowBlur = 12; ctx.fillStyle = e.color;
      if (e.id === 'listener') {
        if (c.plan) { // NEW: facing wedge toward the front wall
          ctx.beginPath(); ctx.moveTo(p.x, p.y - 17); ctx.lineTo(p.x - 7, p.y - 6); ctx.lineTo(p.x + 7, p.y - 6); ctx.closePath(); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#d7e8ef'; ctx.stroke();
      } else if (e.id === 'mic') {
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(p.x - 8, p.y - 9, 16, 18, 2); ctx.fill();
        ctx.fillStyle = '#141714'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      text(e.label, { x: p.x, y: p.y - 15 }, e.color, 9);
      e.screen = p;
    });
    cachedScreens = ents;

    text(ENV[S.env].room + (c.plan ? ' · PLAN' : ''), { x: w / 2, y: 22 }, '#c9a84c', 10);
    if (S.overlay.reflections) caption(c.plan ? 'FIRST-ORDER WALL PATHS (2-D GEOMETRY)' : 'CONCEPTUAL REFLECTION PATHS', '#df6252');
  }
  let cachedScreens = [];

  /* ───────────── readout ───────────── */
  const fmt = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : '—');
  const deg = (r) => (r * 180) / Math.PI;

  function update() {
    [['widthRange', 'w', 'widthOut', ' m'], ['depthRange', 'd', 'depthOut', ' m'], ['sourceRange', 'srcY', 'sourceOut', ' m'],
      ['listenerRange', 'lisY', 'listenerOut', ' m'], ['spacingRange', 'spacing', 'spacingOut', ' m'],
      ['offsetRange', 'lisX', 'offsetOut', ' m'], ['heightRange', 'h', 'heightOut', ' m']].forEach(([input, k, out, suffix]) => {
      if ($(input)) { $(input).value = S[k]; $(out).textContent = Number(S[k]).toFixed(1) + suffix; }
    });
    const { L, R, lis } = geo();
    const dist = Math.hypot(L.x - lis.x, L.y - lis.y);
    const ratio = (S.lisY - S.srcY) / Math.max(0.1, S.spacing);
    const freq = C / (2 * S.w);
    const sym = S.spacing < S.w - 0.6;
    $('distanceMetric').textContent = dist.toFixed(2) + ' m';
    $('delayMetric').textContent = ((dist / C) * 1000).toFixed(2) + ' ms';
    $('ratioMetric').textContent = ratio.toFixed(2);
    $('modeMetric').textContent = freq.toFixed(1) + ' Hz';
    $('symMetric').textContent = sym ? 'PLAUSIBLE' : 'REVIEW';
    $('symMetric').className = sym ? 'good' : 'warn';
    if (!S.checked) {
      $('resultMetric').textContent = 'GEOMETRY'; $('resultMetric').className = ''; $('resultSub').textContent = 'Not a room measurement';
    }

    // NEW metrics
    const hasPair = !!R;
    if (S.env === 'film') {
      ['toeMetric', 'angMetric', 'lrTimeMetric', 'lrLevelMetric', 'dspMetric'].forEach((id) => { $(id).textContent = '—'; $(id).className = ''; });
      $('lrTimeHint').textContent = 'needs two sources'; $('lrLevelHint').textContent = 'needs two sources';
    } else if (hasPair) {
      const toe = deg(Math.atan2(Math.abs(lis.x - L.x), lis.y - L.y));
      const va = { x: L.x - lis.x, y: L.y - lis.y }, vb = { x: R.x - lis.x, y: R.y - lis.y };
      const ang = deg(Math.acos(clamp((va.x * vb.x + va.y * vb.y) / (Math.hypot(va.x, va.y) * Math.hypot(vb.x, vb.y)), -1, 1)));
      const dL = Math.hypot(L.x - lis.x, L.y - lis.y), dR = Math.hypot(R.x - lis.x, R.y - lis.y);
      const dt = ((dL - dR) / C) * 1000, dB = 20 * Math.log10(dR / dL);
      $('toeMetric').textContent = fmt(toe, 1) + '°';
      $('angMetric').textContent = fmt(ang, 1) + '°';
      $('lrTimeMetric').textContent = (dt > 0 ? '+' : '') + fmt(dt, 2) + ' ms';
      $('lrLevelMetric').textContent = (dB > 0 ? '+' : '') + fmt(dB, 2) + ' dB';
      const off = Math.abs(dt) > 0.02 || Math.abs(dB) > 0.2;
      const side = dt > 0 ? 'R' : 'L';
      $('lrTimeHint').textContent = off ? `${side} arrives first (L − R)` : 'centred';
      $('lrLevelHint').textContent = off ? `${dB > 0 ? 'L' : 'R'} louder · image may pull ${dB > 0 ? 'left' : 'right'}` : 'balanced';
      $('lrTimeMetric').className = $('lrLevelMetric').className = off ? 'warn' : 'good';
      $('dspMetric').textContent = fmt(dL / Math.max(0.1, S.env === 'studio' ? S.spacing : R.x - L.x), 2);
      $('toeMetric').className = $('angMetric').className = '';
    }
    $('wallMetric').textContent = Math.min(lis.x, S.w - lis.x, lis.y, S.d - lis.y).toFixed(2) + ' m';
    $('progressPill').textContent = `${S.explored.size} / ${lessons.length} modules explored`;
    draw();
    emit('update');
    scheduleSave();
  }

  /* ───────────── environments and lessons ───────────── */
  function applyEnvUI() {
    const cfg = ENV[S.env];
    $('scenarioSelect').value = S.env;
    $('sceneTitle').textContent = cfg.title;
    $('sceneType').textContent = S.plan ? 'PLAN VIEW · TOP-DOWN' : cfg.type;
    $('scenarioTag').textContent = cfg.tag;
    $('viewTag').textContent = S.plan ? 'PLAN VIEW' : 'MODEL VIEW';
    $('spacingRange').disabled = S.env !== 'studio';
    $('viewToggle').classList.toggle('active', S.plan);
    $('viewToggle').setAttribute('aria-pressed', String(S.plan));
    $('viewToggle').textContent = S.plan ? 'Perspective view' : 'Plan view';
  }
  function setEnv(env, keepLesson) {
    S.env = env; S.checked = false;
    applyEnvUI();
    if (!keepLesson) loadLesson(ENV[env].lesson, false);
    update();
    emit('env');
  }
  function loadLesson(i, redraw = true, syncEnv = true) {
    const m = lessons[i];
    S.module = i; S.explored.add(i); S.checked = false;
    $('lessonKicker').textContent = m.kicker;
    $('lessonTitle').textContent = m.h;
    $('lessonText').textContent = m.p;
    $('lessonRule').textContent = m.rule;
    if (syncEnv && S.env !== m.env) { S.env = m.env; applyEnvUI(); emit('env'); }
    renderChallenge();
    renderModules();
    if (redraw) update();
  }
  function renderChallenge() {
    const ch = challenges[S.module];
    $('challengeText').textContent = ch ? ch.text : '';
    $('challengeBtn').parentElement.classList.toggle('hidden', !ch);
  }

  /* apply a bundle of geometry / overlay / view settings (NEW) */
  function applyPreset(p, opts = {}) {
    if (p.env && p.env !== S.env) { S.env = p.env; emit('env'); if (opts.envLesson) loadLesson(ENV[p.env].lesson, false, false); }
    Object.keys(DEFAULTS).forEach((k) => { if (typeof p[k] === 'number') S[k] = clamp(p[k], LIMITS[k][0], LIMITS[k][1]); });
    if (p.overlay) S.overlay = { ...OVERLAY_OFF, ...p.overlay };
    if (typeof p.plan === 'boolean') S.plan = p.plan;
    S.checked = false;
    syncOverlayButtons(); applyEnvUI(); update();
    if (p.go) go(p.go);
    if (p.focusNotes) { go('lab'); setTimeout(() => $('fieldNotes').focus(), 60); }
  }
  const QUICK = {
    equilateral: { spacing: 1.8, srcY: 1, lisY: 1 + 1.8 * Math.sin(Math.PI / 3), lisX: 0 },
    wide: { spacing: 3.4, srcY: 1, lisY: 2.6, lisX: 0 },
    narrow: { spacing: 0.9, srcY: 1, lisY: 3.2, lisX: 0 },
    offcentre: { lisX: 1.0 },
    wall: { lisY: 5.8, lisX: 0 },
  };

  function runCheck() {
    S.checked = true;
    const { lis } = geo();
    if (S.env === 'studio') {
      const ratio = (S.lisY - S.srcY) / S.spacing;
      const issues = [];
      if (!(ratio >= 0.8 && ratio <= 1.25)) issues.push('the triangle ratio is outside 0.80–1.25');
      if (!(S.spacing < S.w - 0.6)) issues.push('the monitor spacing is wide for this room width');
      if (!(S.lisY < S.d - 0.25)) issues.push('the listener is very close to the rear wall');
      if (Math.abs(lis.x - S.w / 2) > 0.15) issues.push('the listener is off the centre line');
      const plausible = issues.length === 0;
      $('resultMetric').textContent = plausible ? 'PLAUSIBLE' : 'REVIEW';
      $('resultMetric').className = plausible ? 'good' : 'warn';
      $('resultSub').textContent = plausible ? 'Basic geometry only' : 'Review spacing and boundaries';
      $('lessonRule').textContent = plausible
        ? 'Basic geometry is plausible. Next verify aiming, manufacturer guidance, boundary interaction, and real room response.'
        : `One or more simple geometric checks need review: ${issues.join('; ')}. This is a heuristic, not an acoustic pass/fail test. Adjust and verify in the real room.`;
    } else {
      $('resultMetric').textContent = 'GEOMETRY'; $('resultMetric').className = '';
      $('resultSub').textContent = 'Stereo-pair check is for Music studio';
      $('lessonRule').textContent = 'The placement check reviews stereo-pair geometry in the Music studio environment. Here, read the distances, arrival offsets and wall clearance in the readout, then verify against the format guidance and by measurement.';
    }
    draw();
  }
  function reset() {
    Object.assign(S, DEFAULTS); S.checked = false; update();
  }

  /* ───────────── lab controls ───────────── */
  $('scenarioSelect').addEventListener('change', (e) => setEnv(e.target.value));
  [['widthRange', 'w'], ['depthRange', 'd'], ['sourceRange', 'srcY'], ['listenerRange', 'lisY'], ['spacingRange', 'spacing'], ['offsetRange', 'lisX'], ['heightRange', 'h']]
    .forEach(([id, k]) => $(id).addEventListener('input', (e) => { S[k] = Number(e.target.value); S.checked = false; update(); }));
  $('runCheck').addEventListener('click', runCheck);
  $('resetScenario').addEventListener('click', reset);
  $('resetPosition').addEventListener('click', reset);
  $('challengeBtn').addEventListener('click', () => { const ch = challenges[S.module]; if (ch) applyPreset(ch.preset); });
  document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => applyPreset(QUICK[b.dataset.preset])));
  function syncOverlayButtons() {
    document.querySelectorAll('[data-overlay]').forEach((b) => {
      b.classList.toggle('active', !!S.overlay[b.dataset.overlay]);
      b.setAttribute('aria-pressed', String(!!S.overlay[b.dataset.overlay]));
    });
  }
  document.querySelectorAll('[data-overlay]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.overlay; S.overlay[k] = !S.overlay[k]; syncOverlayButtons(); draw(); ensureAnim(); scheduleSave();
  }));
  $('viewToggle').addEventListener('click', togglePlan);
  function togglePlan() { S.plan = !S.plan; applyEnvUI(); update(); }

  /* pointer + keyboard control of markers */
  function hit(px, py) {
    let best = null, bd = 28;
    for (const e of cachedScreens) {
      if (!e.drag || !e.screen) continue;
      const dd = Math.hypot(px - e.screen.x, py - e.screen.y);
      if (dd < bd) { best = e; bd = dd; }
    }
    return best;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const ent = hit(e.clientX - r.left, e.clientY - r.top);
    if (ent) { S.drag = ent.id; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!S.drag) { canvas.classList.toggle('canhit', !!hit(x, y)); return; }
    const ent = cachedScreens.find((m) => m.id === S.drag); if (!ent) return;
    const q = unproject(x, y, ent.z);
    if (S.drag === 'listener') {
      S.lisY = clamp(q.y, LIMITS.lisY[0], Math.min(LIMITS.lisY[1], S.d - 0.25));
      S.lisX = clamp(q.x - S.w / 2 - (S.env === 'film' ? 0.35 : 0), LIMITS.lisX[0], LIMITS.lisX[1]);
    } else if (S.drag === 'srcL' || S.drag === 'srcR') {
      S.srcY = clamp(q.y, LIMITS.srcY[0], LIMITS.srcY[1]);
      if (S.env === 'studio') S.spacing = clamp(Math.abs(q.x - S.w / 2) * 2, LIMITS.spacing[0], LIMITS.spacing[1]);
    }
    S.checked = false; update();
  });
  const endDrag = () => { S.drag = null; canvas.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', (e) => {
    const step = (e.shiftKey ? 0.5 : 0.1);
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    if (e.altKey) {
      if (S.env === 'studio') S.spacing = clamp(S.spacing + dir[0] * step * 2, ...LIMITS.spacing);
      S.srcY = clamp(S.srcY + dir[1] * step, ...LIMITS.srcY);
    } else {
      S.lisX = clamp(S.lisX + dir[0] * step, ...LIMITS.lisX);
      S.lisY = clamp(S.lisY + dir[1] * step, LIMITS.lisY[0], Math.min(LIMITS.lisY[1], S.d - 0.25));
    }
    S.checked = false; update();
  });

  /* animation only runs while wavefronts are visible */
  let raf = 0;
  function frame() { raf = 0; if (S.overlay.waves && S.view === 'lab' && !document.hidden && !reduceMotion) { draw(); raf = requestAnimationFrame(frame); } }
  function ensureAnim() { if (!raf && S.overlay.waves && S.view === 'lab' && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', ensureAnim);

  /* ───────────── lessons ───────────── */
  function renderModules() {
    const root = $('moduleList'); root.innerHTML = '';
    lessons.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'module' + (S.module === i ? ' active' : '');
      b.innerHTML = `<div class="n">FIELD MODULE ${String(i + 1).padStart(2, '0')}</div><h4>${m.title}</h4><p>${m.desc}</p><div class="state">${S.explored.has(i) ? '✓ EXPLORED' : 'OPEN MODULE ↗'}</div>`;
      b.addEventListener('click', () => { loadLesson(i); go('lab'); });
      root.appendChild(b);
    });
  }
  function renderGlossary(filter = '') {
    const q = filter.trim().toLowerCase(), root = $('glossary'); root.innerHTML = '';
    const rows = glossary.filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q));
    if (!rows.length) { root.innerHTML = '<p class="fine">No terms match.</p>'; return; }
    rows.forEach(([t, d]) => {
      const el = document.createElement('div'); el.className = 'term';
      el.innerHTML = '<h4></h4><p></p>'; el.firstChild.textContent = t; el.lastChild.textContent = d; root.appendChild(el);
    });
  }
  $('glossSearch').addEventListener('input', (e) => renderGlossary(e.target.value));
  $('openLesson').addEventListener('click', () => go('lessons'));

  /* ───────────── missions ───────────── */
  function renderMissions() {
    const root = $('missionList'); root.innerHTML = '';
    missions.forEach((m, i) => {
      const label = document.createElement('label'); label.className = 'mission';
      label.innerHTML = `<input type="checkbox" ${S.missions.has(i) ? 'checked' : ''}><div><strong>${String(i + 1).padStart(2, '0')} / ${m[0]}</strong><span>${m[1]}</span><button type="button" class="linkbtn">Open in lab →</button></div>`;
      label.querySelector('input').addEventListener('change', (e) => {
        e.target.checked ? S.missions.add(i) : S.missions.delete(i);
        updateMissionCount(); scheduleSave();
      });
      label.querySelector('.linkbtn').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const p = missionPresets[i]; if (p) { applyPreset(p, { envLesson: true }); if (!p.go && !p.focusNotes) go('lab'); }
      });
      root.appendChild(label);
    });
    updateMissionCount();
  }
  function updateMissionCount() { $('missionCount').textContent = `${S.missions.size} / ${missions.length} · SELF-REPORTED PRACTICE`; }

  /* ───────────── field notes ───────────── */
  function setupSnapshot() {
    const { lis } = geo();
    return `${ENV[S.env].label} · ${S.w.toFixed(1)}×${S.d.toFixed(1)}×${S.h.toFixed(1)} m · source ${S.srcY.toFixed(1)} m` +
      (S.env === 'studio' ? ` · spacing ${S.spacing.toFixed(1)} m` : '') + ` · listener ${S.lisY.toFixed(1)} m deep, ${(lis.x - S.w / 2).toFixed(1)} m off-centre`;
  }
  const when = (t) => { try { return new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return new Date(t).toISOString(); } };
  $('saveNote').addEventListener('click', () => {
    const val = $('fieldNotes').value.trim(); if (!val) return;
    S.notes.unshift({ t: Date.now(), text: val, setup: setupSnapshot() });
    $('fieldNotes').value = ''; renderNotes(); scheduleSave(); toast('Note saved with a snapshot of this setup');
  });
  $('clearNote').addEventListener('click', () => { $('fieldNotes').value = ''; });
  function noteEl(n, withDelete, idx) {
    const d = document.createElement('div'); d.className = 'note';
    const head = document.createElement('div'); head.className = 'note-head';
    head.textContent = when(n.t);
    if (withDelete) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'linkbtn'; x.textContent = 'Delete';
      x.addEventListener('click', () => { S.notes.splice(idx, 1); renderNotes(); renderLog(); scheduleSave(); });
      head.appendChild(x);
    }
    const body = document.createElement('div'); body.className = 'note-body'; body.textContent = n.text;
    const set = document.createElement('div'); set.className = 'note-setup'; set.textContent = n.setup || '';
    d.append(head, body, set); return d;
  }
  function renderNotes() {
    $('noteCount').textContent = S.notes.length + ' SAVED';
    const root = $('savedNotes'); root.innerHTML = '';
    S.notes.slice(0, 4).forEach((n) => root.appendChild(noteEl(n, false)));
  }

  /* ───────────── assessment ───────────── */
  let qi = 0, score = 0, chosen = null, locked = false, missed = [];
  function renderQ() {
    chosen = null; locked = false;
    const q = quiz[qi];
    $('quizKicker').textContent = `ASSESSMENT ${String(qi + 1).padStart(2, '0')} / ${quiz.length}`;
    $('quizTitle').textContent = 'Choose the defensible move.';
    $('quizQuestion').textContent = q ? q.q : '';
    $('answers').innerHTML = '';
    $('quizFeedback').classList.add('hidden');
    $('quizRevisit').classList.add('hidden');
    $('submitAnswer').classList.remove('hidden'); $('submitAnswer').disabled = false;
    $('nextQuestion').classList.add('hidden'); $('restartQuiz').classList.add('hidden');
    $('quizProgress').style.width = (qi / quiz.length) * 100 + '%';
    if (!q) { showResults(); return; }
    q.a.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'answer'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      b.textContent = String.fromCharCode(65 + i) + '. ' + a;
      b.addEventListener('click', () => choose(i));
      $('answers').appendChild(b);
    });
  }
  function choose(i) {
    if (locked) return; chosen = i;
    document.querySelectorAll('.answer').forEach((x, j) => { x.classList.toggle('selected', j === i); x.setAttribute('aria-checked', String(j === i)); });
  }
  function submitQ() {
    if (chosen === null || locked) return;
    locked = true;
    const q = quiz[qi], correct = chosen === q.c;
    if (correct) score++; else missed.push(qi);
    document.querySelectorAll('.answer').forEach((b, i) => { if (i === q.c) b.classList.add('correct'); if (i === chosen && i !== q.c) b.classList.add('wrong'); });
    const f = $('quizFeedback'); f.classList.remove('hidden'); f.className = 'feedback ' + (correct ? 'good' : 'warn');
    f.textContent = (correct ? 'Correct. ' : 'Review this. ') + q.e;
    $('submitAnswer').classList.add('hidden'); $('nextQuestion').classList.remove('hidden');
    $('nextQuestion').textContent = qi === quiz.length - 1 ? 'View results' : 'Next question';
  }
  function showResults() {
    $('quizProgress').style.width = '100%';
    const pct = Math.round((score / quiz.length) * 100);
    $('quizKicker').textContent = 'ASSESSMENT COMPLETE';
    $('quizTitle').textContent = pct >= 75 ? 'Field judgement / pass' : 'Field judgement / review';
    $('quizQuestion').textContent = `Score: ${score} / ${quiz.length} (${pct}%). ${pct >= 75 ? 'You met the prototype threshold. Revisit weak areas and test your reasoning in the lab.' : 'Review the relevant lessons, then retake the assessment.'}`;
    $('answers').innerHTML = '';
    $('quizFeedback').classList.add('hidden');
    $('submitAnswer').classList.add('hidden'); $('nextQuestion').classList.add('hidden'); $('restartQuiz').classList.remove('hidden');
    $('scoreHistory').textContent = `Latest attempt: ${score}/${quiz.length} (${pct}%). Prototype training result only — not accredited certification.`;
    if (S.best === null || pct > S.best) S.best = pct;
    scheduleSave();
    // NEW: send the learner back to the lessons behind each missed question
    const lessonsToRevisit = [...new Set(missed.map((m) => quizLessonMap[m]))];
    const box = $('quizRevisit'); box.innerHTML = '';
    if (lessonsToRevisit.length) {
      box.classList.remove('hidden');
      const t = document.createElement('div'); t.className = 'eyebrow'; t.textContent = 'Revisit these modules'; box.appendChild(t);
      lessonsToRevisit.forEach((li) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = lessons[li].title;
        b.addEventListener('click', () => { loadLesson(li); go('lab'); }); box.appendChild(b);
      });
    }
  }
  $('submitAnswer').addEventListener('click', submitQ);
  $('nextQuestion').addEventListener('click', () => { if (qi < quiz.length - 1) { qi++; renderQ(); } else { qi = quiz.length; showResults(); } });
  $('restartQuiz').addEventListener('click', () => { qi = 0; score = 0; chosen = null; locked = false; missed = []; renderQ(); });

  /* ───────────── field log ───────────── */
  function renderLog() {
    const mods = S.explored.size, miss = S.missions.size;
    const assess = S.best === null ? 0 : Math.min(1, S.best / 75);
    const pct = (mods / lessons.length + miss / missions.length + assess) / 3;
    $('ringFill').style.strokeDashoffset = String(326.7 * (1 - pct));
    $('ringPct').textContent = Math.round(pct * 100) + '%';
    $('pMods').textContent = `${mods} / ${lessons.length}`;
    $('pMiss').textContent = `${miss} / ${missions.length}`;
    $('pBest').textContent = S.best === null ? '—' : S.best + '%';
    $('pNotes').textContent = String(S.notes.length);
    $('logNoteCount').textContent = S.notes.length + ' SAVED';
    const root = $('logNotes'); root.innerHTML = '';
    if (!S.notes.length) root.innerHTML = '<p class="fine" style="padding:0 12px 8px">No notes yet. Save one from the Spatial lab; each keeps a snapshot of the setup.</p>';
    S.notes.forEach((n, i) => root.appendChild(noteEl(n, true, i)));
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  $('exportNotes').addEventListener('click', () => {
    const lines = ['# Frequency Oasis — field notes', '', `Exported ${when(Date.now())}`, '',
      `- Modules explored: ${S.explored.size} / ${lessons.length}`, `- Missions ticked: ${S.missions.size} / ${missions.length}`, `- Best assessment: ${S.best === null ? 'not attempted' : S.best + '%'}`, ''];
    if (!S.notes.length) lines.push('_No notes saved._');
    S.notes.forEach((n) => { lines.push(`## ${when(n.t)}`, '', n.text, '', `> Setup: ${n.setup || 'n/a'}`, ''); });
    download('frequency-oasis-notes.md', lines.join('\n'), 'text/markdown');
  });
  $('exportJson').addEventListener('click', () => {
    persist();
    let raw = '{}'; try { raw = localStorage.getItem(STORE_KEY) || '{}'; } catch (e) { /* ignore */ }
    download('frequency-oasis-progress.json', JSON.stringify(JSON.parse(raw), null, 2), 'application/json');
  });
  $('resetAll').addEventListener('click', () => {
    if (!window.confirm('Reset all modules, missions, notes and scores on this device?')) return;
    noSave = true; clearTimeout(saveTimer);
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  /* ───────────── navigation ───────────── */
  function showView(v) {
    if (!VIEWS.includes(v)) v = 'lab';
    S.view = v;
    document.querySelectorAll('.nav button').forEach((x) => { const on = x.dataset.view === v; x.classList.toggle('active', on); if (on) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
    VIEWS.forEach((id) => $(id + 'View').classList.toggle('hidden', id !== v));
    if (v === 'lessons') renderModules();
    if (v === 'missions') renderMissions();
    if (v === 'log') renderLog();
    resize(); ensureAnim();
    emit('view', v);
  }
  function go(v) { if (location.hash.slice(1) === v) showView(v); else location.hash = v; }
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'lab'));
  document.querySelectorAll('.nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
  document.addEventListener('keydown', (e) => {
    const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (typing || e.ctrlKey || e.metaKey) return;
    if (/^[1-6]$/.test(e.key)) { go(VIEWS[Number(e.key) - 1]); return; }
    if (S.view === 'assessment') {
      const k = e.key.toLowerCase();
      if (['a', 'b', 'c'].includes(k)) { const i = k.charCodeAt(0) - 97; if (quiz[qi] && i < quiz[qi].a.length) choose(i); }
      else if (e.key === 'Enter' && t.tagName !== 'BUTTON') { if (!locked) submitQ(); else if (!$('nextQuestion').classList.contains('hidden')) $('nextQuestion').click(); }
    }
    if (S.view === 'lab') {
      if (e.key.toLowerCase() === 'p') togglePlan();
      else if (e.key === ' ' && (t === document.body || t === canvas)) { e.preventDefault(); const b = $('audioPlay'); if (b) b.click(); }
    }
  });

  /* tiny toast used by notes, install and update prompts */
  let toastTimer = 0;
  function toast(msg, ms = 2600, action) {
    const el = $('toast'); el.innerHTML = ''; el.append(document.createTextNode(msg));
    if (action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'linkbtn'; b.textContent = action.label; b.addEventListener('click', action.run); el.append(b); }
    el.classList.remove('hidden'); clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  /* ───────────── boot ───────────── */
  restore();
  applyEnvUI();
  syncOverlayButtons();
  loadLesson(S.module, false, false);
  renderNotes(); renderMissions(); renderQ(); renderGlossary();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(canvas);
  window.addEventListener('pagehide', persist);
  update();
  showView(location.hash.slice(1) || 'lab');

  window.FO = { S, C, ENV, clamp, update, draw, geo, paths, sceneEntities, go, toast, persist, hooks, applyPreset,
    onUpdate: (fn) => hooks.update.push(fn), onView: (fn) => hooks.view.push(fn), onEnv: (fn) => hooks.env.push(fn) };
})();
