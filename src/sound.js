// 합성 환경음: 모닥불 타닥, 귀뚜라미, 부엉이, 물결 (외부 파일 없이 Web Audio)
export function createSound() {
  let ctx = null, master = null, fireG = null, waterG = null, crickG = null, iv = 0, nightAmt = 1;
  const state = { fireDist: 10, lakeDist: 30 };
  function noiseBuf(sec, brown) {
    const len = ctx.sampleRate * sec, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function pop() {
    const n = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.03)), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5);
    const s = ctx.createBufferSource(); s.buffer = b; const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 900 + Math.random() * 3500; hp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = (0.15 + Math.random() * 0.6); s.connect(hp).connect(g).connect(fireG); s.start();
  }
  function chirp() {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 4300 + Math.random() * 500;
    g.gain.value = 0; o.connect(g).connect(crickG); o.start(t);
    const pulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) { g.gain.setValueAtTime(0, t + i * 0.045); g.gain.linearRampToValueAtTime(0.05, t + i * 0.045 + 0.01); g.gain.linearRampToValueAtTime(0, t + i * 0.045 + 0.035); }
    o.stop(t + pulses * 0.05 + 0.05);
  }
  function hoot() {
    const t = ctx.currentTime; [0, 0.55, 0.85].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      o.type = 'sine'; o.frequency.setValueAtTime(390 - i * 15, t + d); o.frequency.linearRampToValueAtTime(350, t + d + 0.35);
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.05, t + d + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + d + (i === 0 ? 0.45 : 0.3));
      o.connect(f).connect(g).connect(master); o.start(t + d); o.stop(t + d + 0.6);
    });
  }
  return {
    get on() { return !!ctx; },
    start() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      fireG = ctx.createGain(); fireG.connect(master);
      const rumble = loop(noiseBuf(3, true)); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const rg = ctx.createGain(); rg.gain.value = 0.6; rumble.connect(lp).connect(rg).connect(fireG);
      waterG = ctx.createGain(); waterG.connect(master);
      const wn = loop(noiseBuf(4, true)); const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18; const lg = ctx.createGain(); lg.gain.value = 0.25; const wg = ctx.createGain(); wg.gain.value = 0.35;
      lfo.connect(lg).connect(wg.gain); lfo.start(); wn.connect(wf).connect(wg).connect(waterG);
      crickG = ctx.createGain(); crickG.gain.value = 0.5; crickG.connect(master);
      const wind = loop(noiseBuf(5, true)); const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 260; const wgain = ctx.createGain(); wgain.gain.value = 0.1; wind.connect(wl).connect(wgain).connect(master);
      iv = setInterval(() => {
        const fd = state.fireDist;
        fireG.gain.value = Math.max(0, 1 - fd / 22) * 0.9;
        waterG.gain.value = Math.max(0, 1 - state.lakeDist / 18) * 0.7;
        crickG.gain.value = 0.45 * nightAmt;
        if (Math.random() < 0.3) pop();
        if (Math.random() < 0.25 * nightAmt) chirp();
        if (Math.random() < 0.0025 * nightAmt) hoot();
      }, 90);
    },
    stop() { if (!ctx) return; clearInterval(iv); ctx.close(); ctx = null; },
    set(fireDist, lakeDist, night) { state.fireDist = fireDist; state.lakeDist = lakeDist; nightAmt = night; },
  };
}
