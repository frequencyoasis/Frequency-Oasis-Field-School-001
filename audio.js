/* Frequency Oasis — "Hear the geometry".
   Web Audio rendering of the lab: per-speaker direct-path delay, distance level and
   left/right pan, plus (optionally) six first-order wall paths at a fixed illustrative
   strength. It is a teaching aid for timing and level cues, not a room simulation. */
(() => {
  'use strict';
  const FO = window.FO;
  if (!FO) return;
  const $ = (id) => document.getElementById(id);
  const { S, C, clamp } = FO;

  /* Physical heights used for 3-D path lengths. bench.js lets the learner edit them. */
  FO.heights = FO.heights || { src: 1.1, ear: 1.2 };
  const FILM = { talent: 1.6, boom: 2.2 };

  const A = { ctx: null, master: null, comp: null, src: null, chains: [], playing: false, nEmit: 0 };
  const Ctx = window.AudioContext || window.webkitAudioContext;

  /* ── geometry: direct + six image-source paths for one emitter ── */
  function pathSet(e, r, ez, rz) {
    const W = S.w, D = S.d, H = S.h;
    const imgs = [
      ['Direct', e.x, e.y, ez],
      ['Left wall', -e.x, e.y, ez],
      ['Right wall', 2 * W - e.x, e.y, ez],
      ['Front wall', e.x, -e.y, ez],
      ['Rear wall', e.x, 2 * D - e.y, ez],
      ['Floor', e.x, e.y, -ez],
      ['Ceiling', e.x, e.y, 2 * H - ez],
    ];
    return imgs.map(([name, x, y, z]) => ({
      name, x, y, z,
      dist: Math.hypot(x - r.x, y - r.y, z - rz),
      // azimuth from the receiver, facing the front wall (toward y = 0)
      az: Math.atan2(x - r.x, r.y - y),
    }));
  }
  /* shared by the readout and the bench */
  FO.pathSet = pathSet;

  function heightsFor(film) {
    return film ? { ez: FILM.talent, rz: FILM.boom } : { ez: FO.heights.src, rz: FO.heights.ear };
  }

  FO.heightsFor = heightsFor;

  /* ── signals ── */
  function pinkBuffer(ctx) {
    const sr = ctx.sampleRate, len = Math.floor(sr * 0.8), burst = Math.floor(sr * 0.16);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < burst; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      const fade = Math.min(1, i / (sr * 0.006), (burst - i) / (sr * 0.012));
      d[i] = pink * fade;
    }
    return buf;
  }
  function clickBuffer(ctx) {
    const sr = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(sr * 0.5), sr), d = buf.getChannelData(0);
    d[0] = 0.9; d[1] = -0.7; d[2] = 0.4; d[3] = -0.2;
    return buf;
  }
  function makeSource() {
    const ctx = A.ctx, kind = $('audioSignal').value;
    if (kind === 'tone') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = clamp(Number($('audioFreq').value) || 440, 40, 2000);
      const g = ctx.createGain(); g.gain.value = 0.5; o.connect(g); o.start();
      return { node: g, stop: () => o.stop(), osc: o };
    }
    const s = ctx.createBufferSource(); s.buffer = kind === 'click' ? clickBuffer(ctx) : pinkBuffer(ctx); s.loop = true; s.start();
    return { node: s, stop: () => s.stop() };
  }

  /* ── graph ── */
  function ensureCtx() {
    if (!Ctx) return false;
    if (!A.ctx) {
      A.ctx = new Ctx();
      A.comp = A.ctx.createDynamicsCompressor(); A.comp.threshold.value = -18; A.comp.ratio.value = 12;
      A.master = A.ctx.createGain(); A.master.gain.value = 0;
      A.master.connect(A.comp); A.comp.connect(A.ctx.destination);
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return true;
  }
  function teardownChains() {
    A.chains.forEach((c) => { try { c.d.disconnect(); c.g.disconnect(); c.p && c.p.disconnect(); } catch (e) { /* already gone */ } });
    A.chains = [];
    if (A.src) { try { A.src.stop(); } catch (e) { /* already stopped */ } try { A.src.node.disconnect(); } catch (e) { /* ok */ } A.src = null; }
  }
  function build() {
    teardownChains();
    const ctx = A.ctx, { emitters } = FO.paths();
    A.nEmit = emitters.length;
    A.src = makeSource();
    emitters.forEach((e, ei) => {
      for (let pi = 0; pi < 7; pi++) {
        const d = ctx.createDelay(0.5), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        g.gain.value = 0;
        A.src.node.connect(d); d.connect(g);
        if (p) { g.connect(p); p.connect(A.master); } else g.connect(A.master);
        A.chains.push({ ei, pi, d, g, p });
      }
    });
    apply(false);
  }

  /* push current geometry into the running graph */
  function apply(smooth = true) {
    if (!A.ctx) return;
    const now = A.ctx.currentTime, tc = smooth ? 0.03 : 0.001;
    const { emitters, receiver, film } = FO.paths();
    if (emitters.length !== A.nEmit && A.playing) { build(); return; }
    const { ez, rz } = heightsFor(film);
    const solo = $('audioSolo').value, refl = $('audioRefl').checked;
    const sets = emitters.map((e) => pathSet(e, receiver, ez, rz));
    const dMin = Math.min(...sets.map((s) => s[0].dist));
    A.chains.forEach((c) => {
      const p = sets[c.ei] && sets[c.ei][c.pi]; if (!p) return;
      const muted = (solo === 'L' && c.ei !== 0) || (solo === 'R' && c.ei !== 1) || (c.pi > 0 && !refl);
      const gain = muted ? 0 : (c.pi === 0 ? 1 : 0.5) * (1 / Math.max(0.3, p.dist));
      c.d.delayTime.setTargetAtTime(clamp((p.dist - dMin) / C, 0, 0.49), now, tc);
      c.g.gain.setTargetAtTime(gain, now, tc);
      if (c.p) c.p.pan.setTargetAtTime(film ? 0 : clamp(Math.sin(p.az), -1, 1), now, tc);
    });
    A.master.gain.setTargetAtTime(A.playing ? Number($('audioVol').value) / 100 : 0, now, 0.05);
    readout(sets, emitters, film);
  }

  function readout(sets, emitters, film) {
    const box = $('audioReadout'); if (!box) return;
    box.textContent = sets.map((s, i) => {
      const name = film ? 'Talent → boom' : (emitters.length > 1 ? (i === 0 ? 'Left' : 'Right') : 'Source');
      const d = s[0].dist;
      return `${name}: ${d.toFixed(2)} m · ${((d / C) * 1000).toFixed(2)} ms · ${(20 * Math.log10(1 / d)).toFixed(1)} dB re 1 m · pan ${film ? '0.00' : Math.sin(s[0].az).toFixed(2)}`;
    }).join('   |   ');
  }

  /* ── transport ── */
  function start() {
    if (!ensureCtx()) { FO.toast('Web Audio is not available in this browser'); return; }
    A.playing = true; build();
    const now = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(now); A.master.gain.setValueAtTime(0, now);
    A.master.gain.linearRampToValueAtTime(Number($('audioVol').value) / 100, now + 0.08);
    setBtn();
  }
  function stop() {
    if (!A.playing || !A.ctx) { A.playing = false; setBtn(); return; }
    A.playing = false;
    const now = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(now); A.master.gain.setValueAtTime(A.master.gain.value, now);
    A.master.gain.linearRampToValueAtTime(0, now + 0.08);
    setTimeout(() => { if (!A.playing) teardownChains(); }, 160);
    setBtn();
  }
  function setBtn() {
    const b = $('audioPlay'); b.textContent = A.playing ? '■ Stop' : '▶ Play'; b.setAttribute('aria-pressed', String(A.playing));
    b.classList.toggle('playing', A.playing);
  }

  /* a short sine for the bench's mode chart */
  FO.tone = (freq, seconds = 2.4) => {
    if (!ensureCtx()) return;
    const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = freq;
    const peak = clamp(Number($('audioVol').value) / 100, 0.02, 0.3);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(peak, now + 0.12);
    g.gain.setValueAtTime(peak, now + seconds - 0.2); g.gain.linearRampToValueAtTime(0, now + seconds);
    o.connect(g); g.connect(A.comp); o.start(now); o.stop(now + seconds + 0.05);
  };

  /* ── UI ── */
  const ro = document.createElement('div'); ro.id = 'audioReadout'; ro.className = 'audio-readout';
  document.querySelector('#audioPanel .audio-note').before(ro);
  $('audioPlay').addEventListener('click', () => (A.playing ? stop() : start()));
  $('audioSignal').addEventListener('change', () => {
    $('audioFreqWrap').classList.toggle('hidden', $('audioSignal').value !== 'tone');
    if (A.playing) build();
  });
  $('audioFreq').addEventListener('input', () => { if (A.playing && A.src && A.src.osc) A.src.osc.frequency.setTargetAtTime(clamp(Number($('audioFreq').value) || 440, 40, 2000), A.ctx.currentTime, 0.02); });
  ['audioSolo', 'audioRefl', 'audioVol'].forEach((id) => $(id).addEventListener('input', () => apply()));
  $('audioFreqWrap').classList.add('hidden');
  FO.onUpdate(() => { if (A.playing) apply(); else if (A.ctx) apply(); else readoutOnly(); });
  FO.onEnv(() => { if (A.playing) build(); });
  FO.onView((v) => { if (v !== 'lab' && A.playing) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && A.playing) stop(); });

  function readoutOnly() {
    const { emitters, receiver, film } = FO.paths(); const { ez, rz } = heightsFor(film);
    readout(emitters.map((e) => pathSet(e, receiver, ez, rz)), emitters, film);
  }
  readoutOnly();
  FO.audio = { start, stop, get playing() { return A.playing; } };
})();
