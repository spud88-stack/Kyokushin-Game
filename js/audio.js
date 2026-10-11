'use strict';
// All sound is synthesized with WebAudio; the referee uses the system Japanese voice when one exists.
KY.audio = (function () {
  let ac = null, out = null, nb = null, mus = null, step = 0, crowdG = null;
  const opt = { voice: true, music: true };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = .8; out.connect(ac.destination);
    nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (window.speechSynthesis) speechSynthesis.getVoices();
  }
  function tone(f0, f1, dur, vol, type, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .03);
  }
  function noise(dur, f0, q, vol, type, delay, f1) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; s.loop = true; f.type = type || 'lowpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .03);
  }
  const A = {
    init, opt,
    hit(p, zone, blocked) {
      const v = KY.clamp(.25 + p / 28, .2, 1);
      if (blocked) { noise(.07, 1700, 1.2, v * .5, 'bandpass'); tone(210, 110, .07, v * .3, 'triangle'); return; }
      tone(zone === 'head' ? 180 : 125, 36, .15 + p * .005, v, 'sine');
      noise(.1, zone === 'legs' ? 3200 : 1500, .8, v * .9, 'lowpass', 0, 300);
      if (zone === 'legs') noise(.04, 4200, 2, v * .5, 'bandpass');
      if (p > 13) { tone(72, 26, .34, v * .9, 'sine'); noise(.2, 500, .7, v * .4, 'lowpass'); }
    },
    whoosh(v) { noise(.16, 500, 1.4, .1 * v, 'bandpass', 0, 2200); },
    step() { noise(.05, 300, 1, .12, 'lowpass'); },
    taiko(v = 1) { tone(96, 40, .5, .8 * v, 'sine'); noise(.035, 700, 1, .5 * v, 'lowpass'); },
    rim(v = 1) { tone(900, 500, .04, .18 * v, 'square'); noise(.03, 3000, 2, .15 * v, 'bandpass'); },
    gong() { for (const [f, v] of [[110, .5], [164, .3], [221, .25], [331, .12]]) tone(f, f * .985, 2.6, v, 'sine'); noise(.25, 900, 1, .3, 'bandpass'); },
    down() { tone(70, 28, .5, 1, 'sine'); noise(.3, 260, .8, .7, 'lowpass'); },
    crack(d = 0) { noise(.09, 2600, 1, .6, 'highpass', d); tone(240, 60, .12, .5, 'square', d); },
    flag() { noise(.12, 1200, .8, .25, 'bandpass', 0, 400); },
    ui() { tone(520, 420, .05, .12, 'triangle'); },
    kiai() {
      tone(250, 520, .12, .22, 'sawtooth'); tone(520, 190, .5, .28, 'sawtooth', .1);
      tone(262, 96, .5, .2, 'square', .1); noise(.55, 1300, 2.5, .16, 'bandpass');
    },
    cheer() {
      if (!crowdG || !ac) return;
      const t = ac.currentTime; crowdG.gain.cancelScheduledValues(t);
      crowdG.gain.setValueAtTime(crowdG.gain.value, t); crowdG.gain.linearRampToValueAtTime(.3, t + .25); crowdG.gain.linearRampToValueAtTime(.05, t + 2.6);
    },
    crowd(on) {
      if (!ac) return;
      if (on && !crowdG) {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(); crowdG = ac.createGain();
        s.buffer = nb; s.loop = true; f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = .5; crowdG.gain.value = .05;
        s.connect(f); f.connect(crowdG); crowdG.connect(out); s.start(); crowdG.src = s;
      } else if (!on && crowdG) { crowdG.src.stop(); crowdG.disconnect(); crowdG = null; }
    },
    // Sparse taiko pulse under the fights.
    music(on) {
      if (mus) { clearInterval(mus); mus = null; }
      if (!on || !opt.music) return;
      const pat = [1, 0, 0, .5, 0, 0, .6, 0, 1, 0, .45, 0, .7, 0, 'r', 'r'];
      step = 0;
      mus = setInterval(() => {
        if (!ac || document.hidden) return;
        const p = pat[step++ % pat.length];
        if (p === 'r') A.rim(.35); else if (p) A.taiko(p * .3);
      }, 190);
    },
    speak(text) {
      if (!opt.voice || !window.speechSynthesis) return;
      const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('ja'));
      if (!v) return;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = 'ja-JP'; u.rate = 1.2; u.pitch = .5; u.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    },
  };
  return A;
})();
