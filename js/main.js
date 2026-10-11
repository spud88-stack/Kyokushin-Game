'use strict';
// Game shell: input, save data, menus, and the modes built on top of the fight engine.
(function () {
  const { clamp, rand, irand, BELTS, DOJOS, STATS, MOVES } = KY;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), ui = $('#ui'), ctx = $('#game').getContext('2d');
  const SAVE = 'kyokushin_save_v1', G = KY.GROUND;
  let P = null, scene = null, paused = false, last = 0, acts = {};

  // ------------------------------------------------------------------ input
  const MAP = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyJ: 'J', KeyZ: 'J', KeyK: 'K', KeyX: 'K', KeyL: 'L', KeyC: 'L', KeyI: 'I', KeyV: 'I', KeyH: 'H', Space: 'guard', ShiftLeft: 'guard', ShiftRight: 'guard', KeyF: 'kiai', Enter: 'ok', Escape: 'pause' };
  const keys = {}, pressed = []; let dtap = 0, tap = { k: '', t: 0 };
  KY.input = { down: k => !!keys[k], pressed: k => pressed.includes(k), dtap() { const d = dtap; dtap = 0; return d; } };
  addEventListener('keydown', e => {
    KY.audio.init();
    if (e.target.tagName === 'INPUT') return;
    const a = MAP[e.code]; if (!a) return;
    if (scene && scene.capture) e.preventDefault();
    if (e.repeat) return;
    keys[a] = true; pressed.push(a);
    if (a === 'left' || a === 'right') { const now = performance.now(); if (tap.k === a && now - tap.t < 250) dtap = a === 'left' ? -1 : 1; tap = { k: a, t: now }; }
    if (a === 'pause' && scene instanceof KY.Fight) togglePause();
  });
  addEventListener('keyup', e => { const a = MAP[e.code]; if (a) keys[a] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  addEventListener('pointerdown', () => KY.audio.init());
  ui.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled && acts[b.dataset.a]) { KY.audio.ui(); acts[b.dataset.a](b); } });

  function fit() { stage.style.transform = `translate(-50%,-50%) scale(${Math.min(innerWidth / 1280, innerHeight / 720)})`; }
  addEventListener('resize', fit); fit();

  function save() { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* private mode */ } }
  function load() { try { const p = JSON.parse(localStorage.getItem(SAVE)); if (p && p.v === 1) return p; } catch (e) { /* corrupt */ } return null; }
  function setScene(s) { scene = s; paused = false; }
  function show(html, a) { ui.innerHTML = html; acts = a || {}; const f = ui.querySelector('[autofocus]'); if (f) f.focus({ preventScroll: true }); }

  // ------------------------------------------------------------------ scenes
  // A dojo with fighters standing in it: backdrop for every menu.
  class Still {
    constructor(dojo, actors, o = {}) { this.bg = KY.dojoBG(dojo); this.dojo = DOJOS[dojo]; this.actors = actors; this.o = o; this.t = 0; }
    update(dt) { this.t += dt; }
    render(c) {
      const o = this.o, z = o.zoom || 1;
      c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720);
      c.save(); c.translate(640, G); c.scale(z, z); c.translate(-640 - (o.camX === undefined ? 160 : o.camX), -G);
      c.drawImage(this.bg, 0, 0); this.dojo.an(c, this.t);
      this.actors.forEach((a, i) => {
        const b = Math.sin(this.t * .004 + i * 2) * 1.5;
        const pose = a.pose ? KY.POSES[a.pose] : KY.P({ fk: 35 + b * 2, bk: 22 + b * 2, t: 6 + b * .5, fs: 38 + b, bs: 12 - b });
        KY.drawFighter(c, { x: a.x, y: G, dir: a.dir, pose, look: a.prof.look, rank: a.prof.rank, scale: a.scale });
      });
      c.restore();
      if (o.dim) { c.fillStyle = `rgba(8,5,4,${o.dim})`; c.fillRect(0, 0, 1280, 720); }
    }
  }

  // Tameshiwari: two timing stops (focus, then power) decide how many tiles break.
  class Tameshi {
    constructor(target, cb) {
      this.bg = KY.dojoBG(P.dojo); this.dojo = DOJOS[P.dojo]; this.target = target; this.cb = cb; this.capture = true;
      this.t = 0; this.stage = 0; this.acc = []; this.pos = 0; this.dir = 1; this.st = 0; this.broken = -1; this.shake = 0;
      this.pose = KY.P(KY.POSES.stand); this.cap = 3 + P.stats.pow * .7;
    }
    update(dt) {
      this.t += dt; this.shake *= Math.exp(-dt / 90);
      let tgt = KY.POSES.tameUp, tau = 160;
      if (this.stage < 2) {
        if (this.t > 700) {
          this.pos += this.dir * ((this.stage ? 2.1 : 1.5) + this.target * .05) * dt / 1000;
          if (this.pos > 1) { this.pos = 1; this.dir = -1; } if (this.pos < 0) { this.pos = 0; this.dir = 1; }
          if (['guard', 'J', 'ok'].some(k => KY.input.pressed(k))) {
            this.acc.push(1 - Math.abs(this.pos - .5) * 2); this.stage++; this.pos = Math.random(); KY.audio.taiko(.7);
            if (this.stage === 2) KY.audio.kiai();
          }
        }
      } else {
        this.st += dt;
        if (this.st > 380) {
          tgt = KY.POSES.tameDown; tau = 28;
          if (this.broken < 0) {
            this.broken = Math.min(this.target, Math.floor(this.cap * (.25 + (this.acc[0] + this.acc[1]) / 2 * .9)));
            this.shake = 8 + this.broken * 2; KY.audio.hit(18, 'body');
            for (let i = 0; i < this.broken; i++) KY.audio.crack(i * .035);
          }
        }
        if (this.st > 3000 && !this.done) { this.done = true; this.cb(this.broken >= this.target, this.broken); }
      }
      const k = 1 - Math.exp(-dt / tau); for (const j in KY.STANCE) this.pose[j] += (tgt[j] - this.pose[j]) * k;
    }
    render(c) {
      const N = this.target, th = Math.min(10, 70 / N), top = G - 30 - N * th, sx = 868;
      c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720);
      c.save(); c.translate(640 + (Math.random() - .5) * this.shake, G + (Math.random() - .5) * this.shake); c.scale(1.5, 1.5); c.translate(-640 - 160, -G);
      c.drawImage(this.bg, 0, 0); this.dojo.an(c, this.t);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sx, G + 3, 90, 9, 0, 0, 7); c.fill();
      for (const x of [sx - 62, sx + 38]) { c.fillStyle = '#1b1511'; c.fillRect(x - 2, G - 32, 28, 34); c.fillStyle = '#8d8a82'; c.fillRect(x, G - 30, 24, 30); }
      const u = this.broken >= 0 ? clamp((this.st - 380) / 260, 0, 1) : 0;
      for (let i = 0; i < N; i++) {
        const y = G - 30 - (i + 1) * th, brk = this.broken >= 0 && N - 1 - i < this.broken;
        for (const s of [-1, 1]) {
          c.save(); c.translate(sx + s * 62 - (s > 0 ? 24 : 0) * 0, y);
          if (brk) { c.translate(0, u * (4 + (N - i) * 1.2)); c.rotate(-s * u * .34); }
          c.fillStyle = '#1b1511'; c.fillRect(s > 0 ? -64 : 0, 0, 64, th);
          c.fillStyle = i % 2 ? '#a7553a' : '#b9644a'; c.fillRect(s > 0 ? -63 : 1, 1, 62, th - 2);
          c.restore();
        }
      }
      KY.drawFighter(c, { x: 760, y: G, dir: 1, pose: this.pose, look: P.look, rank: P.rank, face: this.stage === 2 && this.st < 900 ? 'kiai' : 'normal' });
      c.restore();
      // meter
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const hd = 'Impact,"Arial Narrow Bold",sans-serif', jp = '"Hiragino Mincho ProN","Yu Mincho",serif';
      const txt = (t, y, f, col) => { c.font = f; c.lineWidth = 6; c.strokeStyle = '#120c08'; c.lineJoin = 'round'; c.strokeText(t, 640, y); c.fillStyle = col; c.fillText(t, 640, y); };
      txt(`試割り   TAMESHIWARI   ${N} TILE${N > 1 ? 'S' : ''}`, 54, `900 30px ${jp}`, '#f7f2e6');
      if (this.stage < 2) {
        txt(this.stage ? '気合  POWER' : '集中  FOCUS', 596, `900 26px ${jp}`, '#ffd24a');
        c.fillStyle = 'rgba(10,6,4,.85)'; c.fillRect(386, 626, 508, 30);
        c.fillStyle = '#5a2019'; c.fillRect(390, 630, 500, 22); c.fillStyle = '#c8261c'; c.fillRect(590, 630, 100, 22); c.fillStyle = '#ffd24a'; c.fillRect(626, 630, 28, 22);
        c.fillStyle = '#fff'; c.fillRect(390 + this.pos * 500 - 3, 622, 6, 38);
        txt('Press SPACE when the marker crosses the centre', 682, '600 14px "Avenir Next",Arial', '#e8dfc8');
      } else if (this.broken >= 0 && this.st > 700) {
        const ok = this.broken >= N;
        txt(ok ? '成功' : '失敗', 300, `900 110px ${jp}`, ok ? '#ffd24a' : '#ff5a48');
        txt(`${this.broken} / ${N} BROKEN`, 392, `40px ${hd}`, '#fff');
      }
    }
  }
  KY.Fight.prototype.capture = true;

  // ------------------------------------------------------------------ html bits
  const nat = p => KY.NATIONS[p.nation];
  const statBars = p => Object.keys(STATS).map(k => `<div class="st"><span>${STATS[k].n} <i class="dim">${STATS[k].t.split(' ')[0]}</i></span><div class="sb"><i style="width:${p.stats[k] / KY.STAT_MAX * 100}%"></i></div><b>${p.stats[k]}</b></div>`).join('');
  function card(p, tag) {
    const b = BELTS[p.rank], S = KY.STYLES[p.style];
    return `<div class="card">${tag ? `<span class="tagc ${tag[0]}">${tag[1]}</span>` : ''}
      <h2>${esc(p.name).toUpperCase()}</h2>
      <div class="sub">${nat(p).f} ${nat(p).c} &nbsp;·&nbsp; ${KY.BUILDS[p.build].n} ${p.kg} kg</div>
      <div class="beltrow">${KY.beltChip(p.rank)} &nbsp;${b.name} <span class="dim">· ${b.label}</span></div>
      <div class="sub"><b>${S.n}</b> · ${S.t}</div><hr>${statBars(p)}</div>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mi = (a, kj, t, d, extra = '') => `<button class="mi ${extra}" data-a="${a}"><span class="kj">${kj}</span><span><b>${t}</b><small>${d}</small></span></button>`;

  // ------------------------------------------------------------------ title
  function title() {
    setScene(new Still(0, [], { dim: .25 }));
    const has = !!load();
    show(`<div class="title"><div class="kanji">極真</div><h1>KYOKUSHIN</h1><div class="tag">FULL-CONTACT KNOCKDOWN KARATE · THE ULTIMATE TRUTH</div>
      <div class="row">${has ? '<button class="btn big" data-a="cont" autofocus>CONTINUE</button><button class="btn big ghost" data-a="new">NEW FIGHTER</button>' : '<button class="btn big" data-a="new" autofocus>ENTER THE DOJO</button>'}</div>
      <div class="foot">OSU! &nbsp;·&nbsp; Keyboard: WASD / arrows to move, J K L to strike, SPACE to guard</div></div>`,
      { cont() { P = load(); KY.audio.opt.voice = P.opts.voice; KY.audio.opt.music = P.opts.music; hub(); }, new() { creator(true); } });
  }

  // ------------------------------------------------------------------ fighter creation
  function creator(isNew) {
    const d = isNew ? KY.newProfile() : JSON.parse(JSON.stringify(P));
    setScene(new Still(isNew ? 0 : P.dojo, [{ prof: d, x: 800, dir: 1 }], { zoom: 1.6, camX: 325 }));
    const cyc = (k, val, sub) => `<div class="cyc"><button data-a="cyc" data-k="${k}" data-d="-1">◀</button><div class="val">${val}${sub ? `<small>${sub}</small>` : ''}</div><button data-a="cyc" data-k="${k}" data-d="1">▶</button></div>`;
    const sws = (k, arr, cur) => `<div class="sws">${arr.map(c => `<button class="sw ${c === cur ? 'on' : ''}" style="background:${c}" data-a="sw" data-k="${k}" data-v="${c}"></button>`).join('')}</div>`;
    const draw = () => {
      const S = KY.STYLES[d.style], B = KY.BUILDS[d.build];
      show(`<div class="panel creator"><h1><span class="jp">${isNew ? '入門' : '道着'}</span>${isNew ? 'NEW FIGHTER' : 'YOUR FIGHTER'}</h1>
        <div class="fr"><label>Name</label><input type="text" id="nm" maxlength="16" value="${esc(d.name)}"></div>
        <div class="fr"><label>Country</label>${cyc('nation', `${nat(d).f} ${nat(d).c}`)}</div>
        <div class="fr"><label>Weight class</label>${isNew ? cyc('build', B.n, `${B.kg} kg · ${d.build === 'light' ? 'fast, tireless, less padding' : d.build === 'heavy' ? 'heavy hands, hard to hurt, slower' : 'no trade-offs'}`) : `<div class="cyc"><div class="val">${B.n}</div></div>`}</div>
        <div class="fr"><label>Style</label>${isNew ? cyc('style', `${S.n} · ${S.t}`, S.d) : `<div class="cyc"><div class="val">${S.n} · ${S.t}</div></div>`}</div>
        <div class="fr"><label>Skin</label>${sws('skin', KY.SKINS, d.look.skin)}</div>
        <div class="fr"><label>Hair</label>${cyc('hs', KY.HAIRSTYLES[d.look.hs])}</div>
        <div class="fr"><label>Hair colour</label>${sws('hair', KY.HAIRS, d.look.hair)}</div>
        <div class="fr"><label>Beard</label>${cyc('beard', KY.BEARDS[d.look.beard])}</div>
        <div class="fr"><label>Hachimaki</label>${cyc('band', KY.BANDS[d.look.band].n)}</div>
        <div class="fr"><label>Dogi</label>${cyc('gi', KY.GIS[d.look.gi].n)}</div>
        <div style="margin-top:10px">${statBars(d)}</div>
        <div class="row foot" style="margin-top:14px">${isNew && load() ? '<span class="dim" style="font-size:12px">Starting over replaces your saved fighter.</span>' : ''}<span class="sp"></span>
          <button class="btn ghost" data-a="back">BACK</button><button class="btn" data-a="ok">${isNew ? 'BEGIN TRAINING' : 'SAVE'}</button></div></div>`, A);
      $('#nm').addEventListener('input', e => { d.name = e.target.value; });
    };
    const wrap = (v, n) => (v + n) % n;
    const A = {
      cyc(b) {
        const k = b.dataset.k, s = +b.dataset.d;
        if (k === 'nation') d.nation = wrap(d.nation + s + KY.NATIONS.length, KY.NATIONS.length);
        else if (k === 'build') { const a = Object.keys(KY.BUILDS); d.build = a[wrap(a.indexOf(d.build) + s + a.length, a.length)]; KY.applyBuild(d); }
        else if (k === 'style') { const a = KY.PLAYER_STYLES; d.style = a[wrap(a.indexOf(d.style) + s + a.length, a.length)]; KY.applyBuild(d); }
        else { const n = { hs: KY.HAIRSTYLES, beard: KY.BEARDS, band: KY.BANDS, gi: KY.GIS }[k].length; d.look[k] = wrap(d.look[k] + s + n, n); }
        draw();
      },
      sw(b) { d.look[b.dataset.k] = b.dataset.v; draw(); },
      back() { isNew ? title() : hub(); },
      ok() { d.name = (d.name || '').trim() || 'Kenshi'; P = d; save(); hub(); },
    };
    if (isNew) KY.applyBuild(d);
    draw();
  }

  // ------------------------------------------------------------------ hub
  function hub() {
    KY.audio.music(false); KY.audio.crowd(false);
    setScene(new Still(P.dojo, [{ prof: P, x: 800, dir: 1 }], { zoom: 1.42 }));
    const nb = BELTS[P.rank + 1], ready = nb && P.xp >= nb.xp, r = P.rec;
    const prev = BELTS[P.rank].xp, xf = nb ? clamp((P.xp - prev) / (nb.xp - prev), 0, 1) : 1;
    const nin = Object.keys(P.trophies.nin).filter(k => P.trophies.nin[k]).map(k => k + '-man').join(', ');
    show(`<div class="hub">
      <div class="panel left">${card(P)}<hr>
        <div class="kicker">${nb ? `Next grading · ${nb.name}` : 'Highest grade attained'}</div>
        <div class="sb xp" style="margin:6px 0 4px"><i style="width:${xf * 100}%"></i></div>
        <div class="kv"><span>Experience</span><b>${P.xp}${nb ? ' / ' + nb.xp : ''}</b></div>
        <div class="kv"><span>Training points</span><b class="gold">${P.tp}</b></div>
        <div class="kv"><span>Record (W · D · L)</span><b>${r.w} · ${r.d} · ${r.l}</b></div>
        <div class="kv"><span>Ippon victories</span><b>${r.ko}</b></div>
        ${P.trophies.taikai ? `<div class="kv"><span>Tournament titles</span><b class="gold">${P.trophies.taikai}</b></div>` : ''}
        ${nin ? `<div class="kv"><span>Kumite trials</span><b class="gold">${nin}</b></div>` : ''}
      </div>
      <div class="brand"><span>極真</span>KYOKUSHIN</div>
      <div class="panel right">
        ${mi('kumite', '組手', 'KUMITE', 'Free fight. One opponent, knockdown rules.')}
        ${mi('taikai', '大会', 'TAIKAI', 'Eight-man tournament. Lose once and you are out.')}
        ${nb ? mi('shinsa', '審査', 'SHINSA', ready ? `Grading is open: test for ${nb.name}.` : `Belt grading for ${nb.name}. Needs ${nb.xp - P.xp} more experience.`, ready ? 'hot' : '') : ''}
        ${mi('nin', '百人組手', 'HYAKUNIN KUMITE', 'The 10, 30, 50 and 100-man kumite trials.')}
        ${mi('keiko', '稽古', 'KEIKO', `Training. Spend points to forge your body.${P.tp ? ` ${P.tp} to spend.` : ''}`, P.tp >= 2 ? 'hot' : '')}
        ${mi('tame', '試割り', 'TAMESHIWARI', `Breaking. Personal best: ${P.bestTiles} tiles.`)}
        ${mi('edit', '道着', 'FIGHTER', 'Change your name and appearance.')}
        ${mi('help', '心得', 'KOKOROE', 'Rules, techniques and controls.')}
      </div>
      <div class="where">${DOJOS[P.dojo].jp} · ${DOJOS[P.dojo].name}, ${DOJOS[P.dojo].place}</div>
      <div class="row opts"><button class="btn sm ghost" data-a="voice">REFEREE VOICE: ${P.opts.voice ? 'ON' : 'OFF'}</button><button class="btn sm ghost" data-a="music">TAIKO: ${P.opts.music ? 'ON' : 'OFF'}</button><button class="btn sm ghost" data-a="quit">TITLE</button></div>
    </div>`, {
      kumite() { pickDojo('組手', 'JIYU KUMITE', 'Choose where to fight.', id => { P.dojo = id; kumite(id); }); },
      taikai() { taikai(); }, shinsa() { ready ? shinsa() : null; }, nin() { ninMenu(); }, keiko() { keiko(); }, tame() { tameMenu(); },
      edit() { creator(false); }, help() { help(hub); },
      voice() { P.opts.voice = KY.audio.opt.voice = !P.opts.voice; save(); hub(); },
      music() { P.opts.music = KY.audio.opt.music = !P.opts.music; save(); hub(); },
      quit() { title(); },
    });
    if (!ready && nb) { const b = ui.querySelector('[data-a=shinsa]'); if (b) b.disabled = true; }
  }

  function pickDojo(kj, t, lead, cb) {
    setScene(new Still(P.dojo, [], { dim: .6 }));
    show(`<div class="panel modal wide"><h1><span class="jp">${kj}</span>${t}</h1><p class="lead">${lead}</p>
      <div class="grid">${DOJOS.map((d, i) => `<button class="dj" data-a="go" data-i="${i}"><span class="jp">${d.jp}</span><span class="th" data-i="${i}"></span><div><b>${d.name.toUpperCase()}</b><small>${d.place}</small></div></button>`).join('')}</div>
      <div class="row foot"><button class="btn ghost" data-a="back">BACK</button><button class="btn" data-a="rnd">RANDOM DOJO</button></div></div>`,
      { go(b) { cb(+b.dataset.i); }, rnd() { cb(irand(0, DOJOS.length - 1)); }, back: hub });
    // thumbnails are painted one per frame so the screen appears instantly
    const slots = [...ui.querySelectorAll('.th')]; let i = 0;
    (function next() { if (i >= slots.length || !slots[i].isConnected) return; slots[i].replaceWith(KY.dojoThumb(i)); i++; requestAnimationFrame(next); })();
  }

  // ------------------------------------------------------------------ fights
  function versus(opp, cfg, st, go) {
    setScene(new Still(cfg.dojo, [{ prof: P, x: 670, dir: 1 }, { prof: opp, x: 930, dir: -1 }], { zoom: 1.3 }));
    show(`<div class="vs"><div class="panel vcard l">${card(P, ['w', '白 SHIRO'])}</div><div class="panel vcard r">${card(opp, ['r', '赤 AKA'])}</div>
      <div class="vmid"><div class="t">${cfg.title}</div><div class="s">${cfg.sub ? cfg.sub(st.i) + ' · ' : ''}${DOJOS[cfg.dojo].name}, ${DOJOS[cfg.dojo].place}</div><div class="x">対</div></div>
      <div class="row vbot"><button class="btn ghost" data-a="back">WITHDRAW</button><button class="btn big" data-a="go" autofocus>始め &nbsp;HAJIME</button><button class="btn ghost" data-a="help">MOVES</button></div></div>`,
      { go, back: hub, help() { help(() => versus(opp, cfg, st, go)); } });
  }

  function reward(res, opp) {
    const fin = res.method !== 'hantei';
    return { xp: res.draw ? 35 : res.win ? 60 + opp.rank * 12 + (fin ? 25 : 0) : 18, tp: res.draw ? 1 : res.win ? (fin ? 3 : 2) : 1 };
  }

  // Runs one or more consecutive bouts, carrying the player's damage between them.
  function runSeries(cfg) {
    const st = { i: 0, w: 0, l: 0, d: 0, xp: 0, tp: 0, carry: null, failed: false, last: null };
    const queue = cfg.lineup ? Array.from({ length: 12 }, () => { const o = KY.genOpponent(irand(0, 11)); return { look: o.look, rank: o.rank }; }) : null;
    const done = () => { KY.audio.music(false); KY.audio.crowd(false); P.xp += st.xp; P.tp += Math.floor(st.tp); save(); cfg.done(st); };
    const bout = () => {
      const opp = cfg.opp(st.i);
      const go = () => {
        show('');
        KY.audio.music(true); KY.audio.crowd(!!DOJOS[cfg.dojo].crowd);
        setScene(new KY.Fight({
          p1: P, p2: opp, dojo: cfg.dojo, time: cfg.time, aiLevel: opp.ai, quick: cfg.quick && st.i > 0, carry: st.carry,
          oppHp: cfg.oppHp, oppWill: cfg.oppWill, allowDraw: cfg.allowDraw, encho: cfg.encho, fatigue: cfg.fatigue ? cfg.fatigue(st.i) : 0,
          label: cfg.label ? cfg.label(st.i) : '', tally: cfg.count > 1 && !cfg.vs ? st : null,
          lineup: queue ? queue.slice(0, Math.min(12, cfg.count - st.i - 1)) : null,
          onEnd(res) {
            st.last = res;
            if (res.draw) { st.d++; P.rec.d++; } else if (res.win) { st.w++; P.rec.w++; if (res.method !== 'hantei') P.rec.ko++; } else { st.l++; P.rec.l++; }
            const r = reward(res, opp); st.xp += Math.round(r.xp * (cfg.xpMul || 1)); st.tp += r.tp * (cfg.tpMul === undefined ? 1 : cfg.tpMul);
            st.i++;
            const stopped = !res.win && !res.draw && res.method !== 'hantei';
            if ((cfg.failOnLoss && !res.win) || (cfg.failOnIppon && stopped)) { st.failed = true; return done(); }
            if (st.i >= cfg.count) return done();
            const c = res.carry, rec = cfg.recover || { hp: 1, sta: 1 };
            for (const z in c.hp) c.hp[z] = Math.min(1, Math.max(c.hp[z], .05) + rec.hp);
            c.sta = Math.min(1, c.sta + rec.sta); st.carry = c;
            bout();
          },
        }));
      };
      if (cfg.vs || st.i === 0) versus(opp, cfg, st, go); else go();
    };
    bout();
  }

  function summary(o) {
    show(`<div class="shade"></div><div class="panel modal narrow result"><div class="kj" style="color:${o.good ? 'var(--gold)' : 'var(--paper)'}">${o.kj}</div>
      <h1 class="hd">${o.title}</h1><p class="lead">${o.sub || ''}</p>
      ${o.st ? `<div class="gains"><div><b>+${o.st.xp}</b>Experience</div><div><b>+${Math.floor(o.st.tp)}</b>Training points</div>${o.extra || ''}</div>` : ''}
      ${o.note ? `<p class="lead gold">${o.note}</p>` : ''}
      <div class="row foot"><button class="btn big" data-a="ok" autofocus>${o.btn || 'OSU!'}</button></div></div>`, { ok: o.next || hub });
  }
  const gradeNote = () => { const nb = BELTS[P.rank + 1]; return nb && P.xp >= nb.xp ? `You are ready to grade for ${nb.name}. Visit SHINSA.` : ''; };
  const HOW = { ippon: 'by ippon', awasete: 'by awasete ippon, two waza-ari', hantei: "by judges' decision", shikkaku: 'by disqualification' };

  function kumite(dojo) {
    runSeries({
      title: 'JIYU KUMITE', dojo, count: 1, time: 90, vs: true,
      opp: () => KY.genOpponent(P.rank + irand(-1, 1)),
      done(st) {
        const r = st.last;
        summary(r.draw ? { kj: '引き分け', title: 'HIKIWAKE', sub: 'A draw. Neither fighter could be separated.', st, note: gradeNote() }
          : r.win ? { kj: '勝ち', title: 'VICTORY', good: true, sub: `You defeated ${esc(r.opp.name)} ${HOW[r.method]}.`, st, note: gradeNote() }
            : { kj: '負け', title: 'DEFEAT', sub: `${esc(r.opp.name)} wins ${HOW[r.method]}. Bow, and return to training.`, st, note: gradeNote() });
      },
    });
  }

  function taikai() {
    pickDojo('大会', 'TAIKAI', 'An eight-man knockdown tournament: quarter-final, semi-final, final. Damage follows you between rounds. No draws: a level fight goes to an extension round.', dojo => {
      P.dojo = dojo;
      const rounds = ['QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'];
      runSeries({
        title: 'TAIKAI', sub: i => rounds[i], label: i => rounds[i], dojo, count: 3, time: 90, vs: true, failOnLoss: true, recover: { hp: .5, sta: 1 },
        opp: i => KY.genOpponent(P.rank + i, { aiBonus: .04 * i }),
        done(st) {
          if (st.failed) return summary({ kj: '敗退', title: 'ELIMINATED', sub: `Your tournament ends in the ${rounds[st.i - 1].toLowerCase()}, beaten ${HOW[st.last.method]}.`, st, note: gradeNote() });
          const bx = 250 + P.rank * 30; P.xp += bx; P.tp += 5; P.trophies.taikai++; st.xp += bx; st.tp += 5; save();
          summary({ kj: '優勝', title: 'CHAMPION', good: true, sub: 'Three fights, three wins. The trophy is yours.', st, note: gradeNote() });
        },
      });
    });
  }

  function shinsa() {
    const nb = BELTS[P.rank + 1], n = nb.bouts;
    setScene(new Still(0, [{ prof: P, x: 800, dir: 1, pose: 'seiza' }], { zoom: 1.42, dim: .35 }));
    show(`<div class="panel modal narrow"><h1><span class="jp">審査</span>SHINSA · ${nb.name.toUpperCase()}</h1>
      <p class="lead">You stand before the grading panel at the Sohonbu to test for <b>${nb.label}</b> ${KY.beltChip(P.rank + 1)}.</p>
      <div class="cols" style="grid-template-columns:1fr"><div><ul>
        ${nb.tiles ? `<li><b>Tameshiwari:</b> break ${nb.tiles} roof tiles in a single strike.</li>` : ''}
        <li><b>Kumite:</b> ${n === 1 ? 'one bout' : n + ' consecutive bouts'} of 45 seconds${n > 1 ? ' with almost no rest. Damage carries over.' : '.'}</li>
        <li>You must win or draw at least half of your bouts, and you must never fail to rise from a knockdown.</li></ul></div></div>
      <div class="row foot"><button class="btn ghost" data-a="back">NOT YET</button><button class="btn" data-a="go" autofocus>OSU! BEGIN</button></div></div>`,
      {
        back: hub,
        go() {
          const fight = () => runSeries({
            title: `${nb.name.toUpperCase()} SHINSA`, sub: () => `Kumite, ${n} bout${n > 1 ? 's' : ''}`, label: i => `SHINSA KUMITE ${i + 1} / ${n}`, dojo: 0, count: n, time: 45,
            quick: true, allowDraw: true, failOnIppon: true, lineup: n > 1, oppHp: .8, oppWill: .8, recover: { hp: .25, sta: .6 }, xpMul: .5, tpMul: .5,
            fatigue: i => i * .6, opp: i => KY.genOpponent(P.rank + (i >= n / 2 ? 1 : 0), { aiBonus: -.03 }),
            done(st) {
              const pass = !st.failed && st.w + st.d * .5 >= n / 2;
              if (!pass) return summary({ kj: '不合格', title: 'NOT THIS TIME', sub: st.failed ? 'You could not rise. The panel bows and asks you to return when you are ready.' : `${st.w} wins, ${st.d} draws, ${st.l} losses. Not enough to pass.`, st });
              P.rank++; save();
              setScene(new Still(0, [{ prof: P, x: 800, dir: 1, pose: 'win' }], { zoom: 1.42 }));
              summary({ kj: P.rank >= 11 ? '昇段' : '昇級', title: 'PROMOTED', good: true, sub: `${st.w} wins, ${st.d} draws, ${st.l} losses. You are awarded the <b>${nb.label}</b> ${KY.beltChip(P.rank)}<br>${nb.name}.`, st });
            },
          });
          if (!nb.tiles) return fight();
          setScene(new Tameshi(nb.tiles, (ok, got) => {
            if (got > P.bestTiles) { P.bestTiles = got; save(); }
            if (ok) return fight();
            summary({ kj: '不合格', title: 'NOT THIS TIME', sub: `Only ${got} of ${nb.tiles} tiles broke. Harden your fists on the makiwara (Keiko → Tsuki) and sharpen your timing.` });
          }));
          show('');
        },
      });
  }

  function ninMenu() {
    setScene(new Still(P.dojo, [{ prof: P, x: 800, dir: 1 }], { zoom: 1.42, dim: .6 }));
    const T = [[10, '十人組手', 'JUNIN KUMITE', 'Ten opponents. The traditional test for shodan.'], [30, '三十人組手', 'SANJUNIN KUMITE', 'Thirty opponents without rest.'], [50, '五十人組手', 'GOJUNIN KUMITE', 'Fifty. Your legs will not thank you.'], [100, '百人組手', 'HYAKUNIN KUMITE', 'One hundred. The ultimate trial of Kyokushin.']];
    show(`<div class="panel modal"><h1><span class="jp">百人組手</span>KUMITE TRIALS</h1>
      <p class="lead">One fresh opponent after another, thirty seconds each, with only a breath between bouts. Your injuries and exhaustion carry forward; theirs do not. Win more than half, and never stay down: if you cannot rise from a knockdown, the trial is over.</p>
      <div class="nin">${T.map(([n, kj, t, d]) => mi('go', kj, t, d + (P.trophies.nin[n] ? ' <span class="gold">Completed.</span>' : ''), P.trophies.nin[n] ? 'hot' : '').replace('data-a="go"', `data-a="go" data-n="${n}"`)).join('')}</div>
      <div class="row foot"><button class="btn ghost" data-a="back">BACK</button></div></div>`,
      { back: hub, go(b) { const n = +b.dataset.n; pickDojo('百人組手', `${n}-MAN KUMITE`, 'Choose the floor you will stand on until it is finished.', d => { P.dojo = d; nin(n, d); }); } });
  }
  function nin(n, dojo) {
    const lo = Math.max(0, P.rank - 4);
    runSeries({
      title: `${n}-MAN KUMITE`, sub: () => `${n} consecutive bouts`, label: i => `KUMITE ${i + 1} / ${n}`, dojo, count: n, time: 30, quick: true, allowDraw: true, failOnIppon: true, lineup: true,
      oppHp: .5, oppWill: .55, recover: { hp: .1, sta: .35 }, xpMul: .3, tpMul: .2, fatigue: i => i / n * 8,
      opp: i => KY.genOpponent(lo + (P.rank + 1 - lo) * i / Math.max(1, n - 1), { aiBonus: -.05 }),
      done(st) {
        const rec = `${st.w} wins, ${st.d} draws, ${st.l} losses.`;
        if (st.failed) return summary({ kj: '無念', title: `FELL AT BOUT ${st.i}`, sub: `${rec} You could not rise in time. ${st.i > n / 2 ? 'So close. The line bows to you all the same.' : 'The line bows. Train, and come back.'}`, st, note: gradeNote() });
        if (st.w <= n / 2) return summary({ kj: '完遂', title: 'STILL STANDING', sub: `${rec} You finished on your feet, but a completed trial needs more than half the bouts won.`, st, note: gradeNote() });
        const bx = n * 40; P.xp += bx; P.tp += Math.round(n / 5); st.xp += bx; st.tp += Math.round(n / 5); P.trophies.nin[n] = true; save();
        summary({ kj: n === 100 ? '百人組手' : '完遂', title: `${n}-MAN KUMITE COMPLETE`, good: true, sub: `${rec} ${n === 100 ? 'One hundred fighters. You join a very short list of names.' : 'Every one of them bowed to you at the end.'}`, st, note: gradeNote() });
      },
    });
  }

  // ------------------------------------------------------------------ training & breaking
  function keiko() {
    setScene(new Still(P.dojo, [{ prof: P, x: 800, dir: 1 }], { zoom: 1.42, dim: .6 }));
    show(`<div class="panel modal"><div class="row"><h1><span class="jp">稽古</span>KEIKO</h1><span class="sp"></span><div style="text-align:right"><div class="kicker">Training points</div><div class="num" style="font-size:44px">${P.tp}</div></div></div>
      <p class="lead">Every fight earns training points, more for a win and most for an ippon. Spend them here.</p>
      ${Object.keys(STATS).map(k => {
        const s = STATS[k], v = P.stats[k], cost = KY.statCost(v), max = v >= KY.STAT_MAX;
        return `<div class="tr"><h3>${s.tr.toUpperCase()}<small>${s.n} · ${s.t}</small></h3><p>${s.d}</p>
        <div class="row"><div class="sb" style="flex:1"><i style="width:${v / KY.STAT_MAX * 100}%"></i></div><b class="hd" style="font-size:22px;width:28px;text-align:right">${v}</b></div>
        <button class="btn sm" data-a="up" data-k="${k}" ${max || P.tp < cost ? 'disabled' : ''}>${max ? 'MASTERED' : `TRAIN · ${cost} pt`}</button></div>`;
      }).join('')}
      <div class="row foot"><button class="btn" data-a="back" autofocus>DONE</button></div></div>`,
      { back: hub, up(b) { const k = b.dataset.k, c = KY.statCost(P.stats[k]); if (P.tp >= c && P.stats[k] < KY.STAT_MAX) { P.tp -= c; P.stats[k]++; save(); KY.audio.taiko(.6); keiko(); } } });
  }
  function tameMenu() {
    let n = clamp(P.bestTiles + 1, 1, 15);
    setScene(new Still(P.dojo, [{ prof: P, x: 800, dir: 1 }], { zoom: 1.42, dim: .6 }));
    const draw = () => show(`<div class="panel modal narrow"><h1><span class="jp">試割り</span>TAMESHIWARI</h1>
      <p class="lead">The test of breaking. Stack the roof tiles, find your focus, then drive straight through with a kiai. Two timing stops decide the strike. At your current Tsuki, a perfect strike breaks about <b>${Math.floor((3 + P.stats.pow * .7) * 1.15)}</b> tiles. Beating your personal best (${P.bestTiles}) earns experience.</p>
      <div class="row" style="justify-content:center;gap:18px"><button class="btn ghost" data-a="dn">−</button><div class="num">${n}</div><button class="btn ghost" data-a="up">+</button></div>
      <div class="row foot"><button class="btn ghost" data-a="back">BACK</button><button class="btn" data-a="go" autofocus>ATTEMPT ${n} TILE${n > 1 ? 'S' : ''}</button></div></div>`,
      {
        back: hub, dn() { n = Math.max(1, n - 1); draw(); }, up() { n = Math.min(15, n + 1); draw(); },
        go() {
          show('');
          setScene(new Tameshi(n, (ok, got) => {
            const best = got > P.bestTiles, xp = best ? (got - P.bestTiles) * 15 : 0;
            if (best) { P.bestTiles = got; P.xp += xp; save(); }
            summary({ kj: ok ? '成功' : '失敗', title: ok ? 'CLEAN BREAK' : 'NOT THROUGH', good: ok, sub: `${got} of ${n} tiles broken.${best ? ` A new personal best: +${xp} experience.` : ''}`, note: gradeNote(), next: tameMenu });
          }));
        },
      });
    draw();
  }

  // ------------------------------------------------------------------ rules & moves
  function help(back) {
    const row = id => { const m = MOVES[id]; return `<tr><td class="k">${m.inp}</td><td class="n ${m.foul ? 'red' : ''}">${m.n}</td><td class="e">${m.en}</td></tr>`; };
    const html = `<div class="panel modal wide"><h1><span class="jp">心得</span>KOKOROE · RULES AND TECHNIQUES</h1>
      <div class="cols"><div>
        <h3>KNOCKDOWN RULES</h3>
        <ul><li>Full contact, no gloves, no pads. Punches and elbows may only strike the body. <b class="red">Hand strikes to the face are a foul.</b></li>
        <li>Kicks and knees may strike anywhere: head (jodan), body (chudan) or legs (gedan).</li>
        <li><b>Ippon</b> (full point): the opponent is down for three seconds. The fight ends at once.</li>
        <li><b>Waza-ari</b> (half point): the opponent is knocked down but rises inside three seconds. Two waza-ari make <b>awasete ippon</b>.</li>
        <li>No score at time? <b>Hantei</b>: five flags decide on damage and clean technique. A level fight goes to <b>encho-sen</b>, an extension.</li>
        <li>Fouls: <b>chui</b> (warning), then <b>genten</b> (point deducted), finally <b>shikkaku</b> (disqualification).</li></ul>
        <h3>HOW TO WIN</h3>
        <ul><li>Each fighter has three targets. Empty any one and they go down: legs chopped out by low kicks, a body broken by punches and knees, or a head kick they never saw.</li>
        <li>Body shots drain <b>stamina</b> (yellow). A tired fighter is slow and hits soft. Back off and breathe.</li>
        <li>A hurt head or a tired body can drop from a single clean kick. Catch them mid-attack for a <b>counter</b>.</li>
        <li>Landing techniques cancels the recovery into the next one. Punch, punch, low kick is the bread and butter.</li>
        <li>Giving and taking blows fills <b>spirit</b> (blue). When full, <kbd>F</kbd> lets out a <b>kiai</b>: more power, a second wind.</li></ul>
        <h3>CONTROLS</h3>
        <table><tr><td class="k"><kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd></td><td>Move. Double-tap to step in or slip back (sabaki).</td></tr>
        <tr><td class="k"><kbd>W</kbd> <kbd>S</kbd> / <kbd>↑</kbd> <kbd>↓</kbd></td><td>Aim high or low. Hold while striking or guarding.</td></tr>
        <tr><td class="k"><kbd>SPACE</kbd></td><td>Guard the body. With <kbd>↑</kbd> guard the head, with <kbd>↓</kbd> raise the shin (sune uke) to check low kicks and hurt the kicker. Guard at the last instant to turn the technique aside.</td></tr>
        <tr><td class="k"><kbd>F</kbd> · <kbd>ESC</kbd></td><td>Kiai · Pause. &nbsp;(Alt keys: <kbd>Z</kbd> <kbd>X</kbd> <kbd>C</kbd> <kbd>V</kbd> = J K L I)</td></tr></table>
      </div><div>
        <h3>TSUKI · PUNCHES <kbd>J</kbd></h3><table>${['seiken', 'gyaku', 'kagi', 'shita'].map(row).join('')}</table>
        <h3>GERI · KICKS <kbd>K</kbd></h3><table>${['chudan', 'jodan', 'gedan', 'mae'].map(row).join('')}</table>
        <h3>WAZA · SPECIAL TECHNIQUES <kbd>L</kbd> <kbd>I</kbd></h3><table>${['hiza', 'kakato', 'barai', 'ushiro', 'ushiroMawashi', 'kaiten'].map(row).join('')}</table>
        <h3>HANSOKU · FOUL</h3><table>${row('ganmen')}</table>
        <p style="margin-top:8px">"Back" and "Fwd" mean away from and toward your opponent. Spinning and high techniques are slow: set them up, or throw them when the guard is busy elsewhere.</p>
      </div></div>
      <div class="row foot" style="margin-top:8px"><button class="btn" data-a="back" autofocus>OSU!</button></div></div>`;
    show(html, { back });
  }

  // ------------------------------------------------------------------ pause
  function togglePause() {
    if (!(scene instanceof KY.Fight) || scene.phase === 'over') return;
    if (paused && ui.querySelector('.pausebox')) { paused = false; show(''); KY.audio.music(true); return; }
    if (paused) return;
    paused = true; KY.audio.music(false);
    const box = () => show(`<div class="shade"></div><div class="panel modal narrow result pausebox"><div class="kj">待て</div><h1 class="hd">MATTE · PAUSED</h1>
      <div class="row foot" style="margin-top:22px"><button class="btn ghost" data-a="quit">FORFEIT</button><button class="btn ghost" data-a="help">MOVES</button><button class="btn big" data-a="go" autofocus>RESUME</button></div></div>`,
      { go: togglePause, help() { help(box); }, quit() { P.rec.l++; save(); hub(); } });
    box();
  }

  // ------------------------------------------------------------------ loop
  function frame(t) {
    const dt = Math.min(40, t - last || 16); last = t;
    if (scene) { if (!paused) scene.update(dt); scene.render(ctx); }
    pressed.length = 0;
    requestAnimationFrame(frame);
  }
  title();
  requestAnimationFrame(frame);
  KY.debug = { get scene() { return scene; }, get P() { return P; }, keys, pressed, step(n, dt = 16) { for (let i = 0; i < n; i++) { scene.update(dt); pressed.length = 0; } scene.render(ctx); } };
})();
