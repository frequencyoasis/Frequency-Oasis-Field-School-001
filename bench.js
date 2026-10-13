/* Frequency Oasis — Sound bench: axial modes, reflection ledger, free-field level, speed of sound.
   Every figure comes straight from the lab's room and positions; each panel says what it leaves out. */
(() => {
  'use strict';
  const FO = window.FO;
  if (!FO) return;
  const $ = (id) => document.getElementById(id);
  const { S, C, clamp } = FO;
  const COL = { D: '#c9a84c', W: '#8db3c9', H: '#9bc7a6', red: '#df6252', ink: '#aeb6aa', line: '#2d3630' };

  function setup(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width) return null;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, r.width, r.height);
    return { g, w: r.width, h: r.height };
  }
  const label = (g, s, x, y, col = COL.ink, size = 9, align = 'center') => { g.fillStyle = col; g.font = `${size}px ui-monospace,monospace`; g.textAlign = align; g.fillText(s, x, y); };

  /* ───────── 1. axial modes ───────── */
  const FMAX = 300;
  let selected = null; // {lane, f, n}
  const lanes = () => [
    { key: 'D', name: 'Depth', L: S.d, col: COL.D },
    { key: 'W', name: 'Width', L: S.w, col: COL.W },
    { key: 'H', name: 'Height', L: S.h, col: COL.H },
  ].map((l) => ({ ...l, modes: Array.from({ length: Math.floor((FMAX * 2 * l.L) / C) }, (_, i) => ({ n: i + 1, f: ((i + 1) * C) / (2 * l.L) })).filter((m) => m.f <= FMAX) }));

  const geom = { padL: 54, padR: 24, top: 14, bottom: 26 };
  const fx = (f, w) => geom.padL + (f / FMAX) * (w - geom.padL - geom.padR);

  function drawModes() {
    const cv = $('modeCanvas'), c = setup(cv); if (!c) return;
    const { g, w, h } = c, ls = lanes(), laneH = (h - geom.top - geom.bottom) / 3;
    // coincident bands (different dimensions within 3 Hz, below 200 Hz)
    const co = coincidences(ls);
    co.forEach((k) => { g.fillStyle = 'rgba(223,98,82,.3)'; g.fillRect(fx(k.f, w) - 3, geom.top, 6, h - geom.top - geom.bottom); });
    // axis
    for (let f = 0; f <= FMAX; f += 50) {
      g.strokeStyle = '#2d363055'; g.beginPath(); g.moveTo(fx(f, w), geom.top); g.lineTo(fx(f, w), h - geom.bottom); g.stroke();
      label(g, f + ' Hz', fx(f, w), h - 9);
    }
    ls.forEach((l, i) => {
      const y0 = geom.top + i * laneH, base = y0 + laneH - 5;
      g.strokeStyle = COL.line; g.beginPath(); g.moveTo(geom.padL, base); g.lineTo(w - geom.padR, base); g.stroke();
      label(g, l.name, 6, y0 + laneH / 2 + 3, l.col, 10, 'left');
      l.modes.forEach((m) => {
        const x = fx(m.f, w), sel = selected && selected.key === l.key && selected.n === m.n;
        g.strokeStyle = l.col; g.lineWidth = sel ? 3 : 1.6; g.beginPath(); g.moveTo(x, base); g.lineTo(x, y0 + 6); g.stroke();
        g.fillStyle = l.col; g.beginPath(); g.arc(x, y0 + 6, sel ? 4 : 2.6, 0, 7); g.fill();
        if (m.n <= 2 || sel) label(g, m.f.toFixed(0), x, y0 + 2, l.col, 8);
      });
    });
    g.lineWidth = 1;
    // text summary
    const sorted = [...ls].sort((a, b) => a.L - b.L), min = sorted[0].L;
    const ratio = ls.map((l) => `${l.name} ${(l.L / min).toFixed(2)}`).join(' : ');
    const rows = ls.map((l) => `<b style="color:${l.col}">${l.name} ${l.L.toFixed(1)} m</b>: ${l.modes.slice(0, 4).map((m) => m.f.toFixed(1)).join(', ')} Hz…`).join('<br>');
    const co2 = co.length
      ? `<b class="warn">Coincident modes (within 3 Hz, below 200 Hz):</b> ${co.slice(0, 5).map((k) => `${k.f.toFixed(1)} Hz (${k.a} n=${k.na} &amp; ${k.b} n=${k.nb})`).join('; ')}. Two dimensions reinforcing the same frequency is a classic cause of one-note bass.`
      : 'No axial modes from different dimensions fall within 3 Hz of each other below 200 Hz.';
    const sel = selected ? `<br><b>Playing ${selected.f.toFixed(1)} Hz</b> (${selected.name} mode ${selected.n})${selected.f < 45 ? ' — many small speakers cannot reproduce this; you may hear only harmonics.' : ''}` : '';
    $('modeInfo').innerHTML = `${rows}<br>Ratios (smallest = 1): ${ratio}<br>${co2}${sel}`;
  }
  function coincidences(ls) {
    const out = [];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      ls[i].modes.forEach((a) => ls[j].modes.forEach((b) => {
        if (a.f <= 200 && Math.abs(a.f - b.f) <= 3) out.push({ f: (a.f + b.f) / 2, a: ls[i].name, na: a.n, b: ls[j].name, nb: b.n });
      }));
    }
    return out.sort((x, y) => x.f - y.f);
  }
  $('modeCanvas').addEventListener('pointerdown', (e) => {
    const cv = e.currentTarget, r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const ls = lanes(), laneH = (r.height - geom.top - geom.bottom) / 3;
    const lane = clamp(Math.floor((y - geom.top) / laneH), 0, 2);
    let best = null, bd = 12;
    [lane, ...[0, 1, 2].filter((i) => i !== lane)].forEach((li, rank) => {
      ls[li].modes.forEach((m) => { const d = Math.abs(fx(m.f, r.width) - x) + rank * 4; if (d < bd) { bd = d; best = { key: ls[li].key, name: ls[li].name, n: m.n, f: m.f }; } });
    });
    if (best) { selected = best; FO.tone(best.f); drawModes(); setTimeout(() => { if (selected === best) { selected = null; if (S.view === 'bench') drawModes(); } }, 2600); }
  });

  /* ───────── 2. reflection ledger ───────── */
  const COLORS = { Direct: '#c9a84c', 'Left wall': '#8db3c9', 'Right wall': '#b9a0d8', 'Front wall': '#df6252', 'Rear wall': '#e0a060', Floor: '#9bc7a6', Ceiling: '#7fd0c8' };
  const SHORT = { Direct: 'D', 'Left wall': 'L', 'Right wall': 'R', 'Front wall': 'F', 'Rear wall': 'B', Floor: 'Fl', Ceiling: 'C' };
  function emitterNames(n, film) { return film ? ['Talent'] : n > 1 ? ['Left source', 'Right source'] : ['Source']; }

  function renderLedger() {
    const { emitters, receiver, film } = FO.paths();
    const sel = $('ledgerSource'), names = emitterNames(emitters.length, film);
    if (sel.options.length !== names.length || sel.options[0].textContent !== names[0]) {
      const keep = sel.selectedIndex; sel.innerHTML = names.map((n, i) => `<option value="${i}">${n}</option>`).join(''); sel.selectedIndex = clamp(keep, 0, names.length - 1);
    }
    $('ledgerSrcH').disabled = $('ledgerEarH').disabled = film;
    const { ez, rz } = FO.heightsFor(film);
    const e = emitters[clamp(sel.selectedIndex, 0, emitters.length - 1)];
    const set = FO.pathSet(e, receiver, ez, rz), d0 = set[0].dist;
    const rows = set.map((p, i) => {
      const dt = ((p.dist - d0) / C) * 1000, dB = 20 * Math.log10(d0 / p.dist), early = i > 0 && dt <= 20;
      return { name: p.name, dist: p.dist, dt, dB, early, i };
    });
    $('ledgerTable').innerHTML = '<thead><tr><th>Path</th><th>Length</th><th>After direct</th><th>Spreading</th><th></th></tr></thead><tbody>' +
      rows.map((r) => `<tr class="${r.early ? 'early' : ''}"><td><i class="dot" style="background:${COLORS[r.name]}"></i>${r.name}</td><td>${r.dist.toFixed(2)} m</td><td>${r.i ? '+' + r.dt.toFixed(1) + ' ms' : '0.0 ms'}</td><td>${r.i ? r.dB.toFixed(1) + ' dB' : '0.0 dB'}</td><td>${r.early ? '≤ 20 ms' : ''}</td></tr>`).join('') + '</tbody>';
    // timeline
    const cv = $('timelineCanvas'), c = setup(cv); if (!c) return;
    const { g, w, h } = c, pl = 14, pr = 14, base = h - 22, T = 40, X = (t) => pl + (t / T) * (w - pl - pr);
    g.fillStyle = 'rgba(201,168,76,.07)'; g.fillRect(X(0), 6, X(20) - X(0), base - 6);
    label(g, 'EARLY WINDOW · 20 ms RULE OF THUMB', X(10), 16, '#c9a84c99', 8);
    for (let t = 0; t <= T; t += 10) { label(g, t + ' ms', X(t), h - 6); g.strokeStyle = '#2d363077'; g.beginPath(); g.moveTo(X(t), base); g.lineTo(X(t), base + 4); g.stroke(); }
    g.strokeStyle = COL.line; g.beginPath(); g.moveTo(pl, base); g.lineTo(w - pr, base); g.stroke();
    let beyond = 0;
    rows.forEach((r) => {
      if (r.dt > T) { beyond++; return; }
      const amp = Math.pow(10, r.dB / 20), top = base - (base - 28) * amp, x = X(r.dt);
      g.strokeStyle = COLORS[r.name]; g.lineWidth = r.i ? 2 : 3; g.beginPath(); g.moveTo(x, base); g.lineTo(x, top); g.stroke();
      label(g, SHORT[r.name], x, top - 4, COLORS[r.name], 9);
    });
    g.lineWidth = 1;
    if (beyond) label(g, `${beyond} later →`, w - pr, 16, COL.ink, 8, 'right');
  }
  $('ledgerSource').addEventListener('change', renderLedger);
  [['ledgerSrcH', 'src'], ['ledgerEarH', 'ear']].forEach(([id, k]) => $(id).addEventListener('input', (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) { FO.heights[k] = clamp(v, 0.2, 5); FO.update(); } }));

  /* ───────── 3. distance and level ───────── */
  function renderSpl() {
    const ref = Number($('splRef').value), dist = Number($('splDist').value);
    $('splRefOut').textContent = ref.toFixed(1) + ' m'; $('splDistOut').textContent = dist.toFixed(1) + ' m';
    const cv = $('splCanvas'), c = setup(cv); if (!c) return;
    const { g, w, h } = c, pl = 40, pr = 12, pt = 12, pb = 22, DMAX = 40, YMIN = -36, YMAX = 12;
    const X = (d) => pl + (d / DMAX) * (w - pl - pr), Y = (db) => pt + ((YMAX - db) / (YMAX - YMIN)) * (h - pt - pb);
    [12, 0, -12, -24, -36].forEach((db) => { g.strokeStyle = '#2d363077'; g.beginPath(); g.moveTo(pl, Y(db)); g.lineTo(w - pr, Y(db)); g.stroke(); label(g, db + ' dB', pl - 4, Y(db) + 3, COL.ink, 8, 'right'); });
    [0, 10, 20, 30, 40].forEach((d) => label(g, d + ' m', X(d), h - 7));
    g.strokeStyle = COL.D; g.lineWidth = 2; g.beginPath();
    for (let d = 0.5; d <= DMAX; d += 0.25) { const db = clamp(-20 * Math.log10(d / ref), YMIN, YMAX); d === 0.5 ? g.moveTo(X(d), Y(db)) : g.lineTo(X(d), Y(db)); }
    g.stroke(); g.lineWidth = 1;
    const dbAt = -20 * Math.log10(dist / ref);
    g.fillStyle = COL.W; g.beginPath(); g.arc(X(dist), Y(clamp(dbAt, YMIN, YMAX)), 5, 0, 7); g.fill();
    g.fillStyle = COL.D; g.beginPath(); g.arc(X(ref), Y(0), 4, 0, 7); g.fill();
    const dms = ((dist - ref) / C) * 1000;
    $('splInfo').innerHTML = `At <b>${dist.toFixed(1)} m</b> the free-field level is <b>${dbAt.toFixed(1)} dB</b> relative to ${ref.toFixed(1)} m, and the sound arrives <b>${dms.toFixed(1)} ms</b> later. Each doubling of distance costs about 6.02 dB.`;
  }
  $('splRef').addEventListener('input', renderSpl); $('splDist').addEventListener('input', renderSpl);

  /* ───────── 4. speed of sound ───────── */
  const speed = () => 331.3 + 0.606 * Number($('tempRange').value);
  function renderSpeed(from) {
    const c = speed(), T = Number($('tempRange').value);
    $('tempOut').textContent = T + ' °C'; $('cOut').textContent = c.toFixed(1) + ' m/s'; $('perMetre').textContent = (1000 / c).toFixed(2) + ' ms';
    if (from === 'ms') $('calcDist').value = ((Number($('calcMs').value) / 1000) * c).toFixed(2);
    else $('calcMs').value = ((Number($('calcDist').value) / c) * 1000).toFixed(1);
    const ms = Number($('calcMs').value);
    $('notchInfo').innerHTML = ms > 0
      ? `A copy arriving <b>${ms.toFixed(1)} ms</b> after the direct sound puts the first comb-filter notch near <b>${(500 / ms).toFixed(0)} Hz</b>, then again at odd multiples (${(1500 / ms).toFixed(0)} Hz, ${(2500 / ms).toFixed(0)} Hz…).`
      : 'Enter a delay to see where the first comb-filter notch falls.';
  }
  $('tempRange').addEventListener('input', () => renderSpeed());
  $('calcDist').addEventListener('input', () => renderSpeed('dist'));
  $('calcMs').addEventListener('input', () => renderSpeed('ms'));

  /* ───────── orchestration ───────── */
  function renderAll() {
    if (S.view !== 'bench') return;
    $('benchRoom').textContent = `Using the Spatial lab room: ${S.w.toFixed(1)} m wide × ${S.d.toFixed(1)} m deep × ${S.h.toFixed(1)} m high · ${FO.ENV[S.env].label}.`;
    drawModes(); renderLedger(); renderSpl();
  }
  FO.onUpdate(renderAll);
  FO.onView((v) => { if (v === 'bench') requestAnimationFrame(renderAll); });
  window.addEventListener('resize', () => requestAnimationFrame(renderAll));
  renderSpeed();
  renderAll();
})();
