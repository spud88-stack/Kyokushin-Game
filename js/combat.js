'use strict';
// Knockdown-rules combat: fighters, AI, referee calls, scoring and the fight HUD.
(function () {
  const { clamp, rand, irand, P, POSES, STANCE, MOVES } = KY;
  const G = KY.GROUND, ZONES = ['head', 'body', 'legs'];
  const COVER = { mid: { body: 1, head: .45, legs: 0 }, high: { head: 1, body: .4, legs: 0 }, low: { legs: 1, body: .4, head: 0 } };
  const ZONE_Y = { head: -205, body: -140, legs: -58 };
  const ZLAB = { head: 'JODAN', body: 'CHUDAN', legs: 'GEDAN' };
  const JP = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif', HD = 'Impact,"Haettenschweiler","Arial Narrow Bold",sans-serif';

  for (const id in MOVES) {
    const m = MOVES[id];
    if (m.keys) { m._keys = m.keys.map(([t, p]) => [t, P(p)]); m.total = m.keys[m.keys.length - 1][0]; }
    else { m._ch = P(m.ch); m._hit = P(m.hit); m._end = P({ sp: m.spinEnd || 0 }); m.total = m.st + m.ac + m.rc; }
  }

  const CALLS = {
    rei: { k: '礼', t: 'REI', s: 'Bow', v: 'れい' },
    kamaete: { k: '構えて', t: 'KAMAETE', s: 'Take your stance', v: 'かまえて' },
    hajime: { k: '始め', t: 'HAJIME!', s: 'Begin', v: 'はじめ' },
    zokko: { k: '続行', t: 'ZOKKO!', s: 'Fight on', v: 'ぞっこう' },
    yame: { k: '止め', t: 'YAME!', s: 'Stop', v: 'やめ' },
    wazaari: { k: '技有り', t: 'WAZA-ARI', s: 'Half point', v: 'わざあり' },
    ippon: { k: '一本', t: 'IPPON!', s: 'Full point. The fight is over', v: 'いっぽん' },
    awasete: { k: '合わせて一本', t: 'AWASETE IPPON!', s: 'Two half points make one', v: 'わざあり、あわせていっぽん' },
    chui: { k: '注意', t: 'CHUI', s: 'Warning: no hand strikes to the face', v: 'ちゅうい' },
    genten: { k: '減点', t: 'GENTEN ICHI', s: 'Penalty: one point deducted', v: 'げんてんいち' },
    shikkaku: { k: '失格', t: 'SHIKKAKU', s: 'Disqualified', v: 'しっかく' },
    hantei: { k: '判定', t: 'HANTEI', s: "Judges' decision", v: 'はんてい' },
    hikiwake: { k: '引き分け', t: 'HIKIWAKE', s: 'Draw', v: 'ひきわけ' },
    encho: { k: '延長戦', t: 'ENCHO-SEN', s: 'Extension round', v: 'えんちょうせん' },
    shiro: { k: '白', t: 'SHIRO NO KACHI', s: 'White wins', v: 'しろ' },
    aka: { k: '赤', t: 'AKA NO KACHI', s: 'Red wins', v: 'あか' },
  };

  // ------------------------------------------------------------------ fighter
  class Combatant {
    constructor(prof, x, dir, isPlayer, hpScale) {
      const s = prof.stats;
      Object.assign(this, { prof, look: prof.look, rank: prof.rank, name: prof.name, x, startX: x, dir, isPlayer });
      this.scale = prof.look.h || 1;
      this.powMul = .8 + s.pow * .035; this.kickMul = .8 + s.kick * .035;
      this.rate = .92 + s.spd * .018; this.walk = 150 + s.spd * 6;
      const hp = (140 + s.tgh * 9) * (hpScale || 1);
      this.maxHp = { head: hp * .9, body: hp * 1.15, legs: hp }; this.hp = Object.assign({}, this.maxHp);
      this.maxSta = 80 + s.sta * 5; this.sta = this.maxSta; this.staRegen = 8 + s.sta * .5;
      this.spirit = 0; this.kiaiT = 0; this.state = 'idle'; this.t = 0; this.pose = P({});
      this.wazaari = 0; this.fouls = 0; this.dmgDealt = 0; this.hits = 0;
      this.guard = null; this.guardT = 0; this.flash = 0; this.vx = 0; this.kbv = 0; this.restT = 999;
      this.lastMove = null; this.lastMoveT = 1e9; this.walkPhase = 0; this.serial = 0; this.seed = Math.random() * 9;
    }
    frac(z) { return clamp(this.hp[z] / this.maxHp[z], 0, 1); }
    cond() { return (this.frac('head') + this.frac('body') + this.frac('legs')) / 3; }
    canAct() { return this.state === 'idle' || this.state === 'block'; }
    canCancel() { const m = this.move; return this.state === 'attack' && this.hitLanded && this.t >= m.st + m.ac + m.rc * .3; }
    get face() {
      if (this.state === 'down') return 'ko';
      if (this.state === 'hit') return 'hurt';
      if (this.kiaiT > 5300) return 'kiai';
      const m = this.move;
      if (this.state === 'attack' && m.dmg >= 10 && this.t > m.st * .6 && this.t < m.st + m.ac + 90) return 'kiai';
      return 'normal';
    }
    norm() { if (this.pose.r > 180) this.pose.r -= 360; if (this.pose.sp > 1) this.pose.sp -= 2; }
    attack(id) {
      const m = MOVES[id];
      if (!m || !(this.canAct() || this.canCancel())) return false;
      this.norm();
      this.tired = this.sta < m.cost; this.sta = Math.max(0, this.sta - m.cost);
      this.state = 'attack'; this.move = m; this.moveId = id; this.t = 0;
      this.hitDone = this.hitLanded = this.whooshed = false; this.guard = null;
      this.serial++; this.lastMove = id; this.lastMoveT = 0; this.restT = 0;
      const from = Object.assign({}, this.pose);
      this.keys = m._keys ? [[0, from]].concat(m._keys)
        : [[0, from], [m.st * (m.chAt || .55), m._ch], [m.st, m._hit], [m.st + m.ac, m._hit], [m.total, m._end]];
      return true;
    }
    sample(t) {
      const K = this.keys; let i = 0;
      while (i < K.length - 2 && t >= K[i + 1][0]) i++;
      const a = K[i], b = K[i + 1];
      let u = clamp((t - a[0]) / Math.max(1, b[0] - a[0]), 0, 1);
      u = (i === 1 && !this.move._keys) ? u * u : u * u * (3 - 2 * u);     // strikes snap out
      for (const k in STANCE) this.pose[k] = a[1][k] + (b[1][k] - a[1][k]) * u;
    }
    blend(target, dt, tau) { const k = 1 - Math.exp(-dt / tau); for (const j in STANCE) this.pose[j] += (target[j] - this.pose[j]) * k; }
    guardOn(type) { if (!this.canAct()) return; if (this.state !== 'block' || this.guard !== type) this.guardT = 0; this.state = 'block'; this.guard = type; }
    guardOff() { if (this.state === 'block') { this.state = 'idle'; this.guard = null; } }
    dash(d) { if (!this.canAct() || this.sta < 3) return; this.sta -= 3; this.state = 'dash'; this.t = 0; this.dashDir = d; this.dashBack = d !== this.dir; this.guard = null; KY.audio.step(); }
    stun(pose, ms) { this.norm(); this.state = 'hit'; this.t = 0; this.stunT = ms; this.hitPose = pose; this.guard = null; }

    update(dt, F) {
      const op = this.opp;
      this.lastMoveT += dt; this.flash = Math.max(0, this.flash - dt);
      if (this.kiaiT > 0) this.kiaiT -= dt;
      if (this.state !== 'down' && this.state !== 'attack') this.dir = this.x < op.x ? 1 : -1;
      if (this.kbv) { this.x += this.kbv * dt / 1000; this.kbv *= Math.exp(-dt / 90); if (Math.abs(this.kbv) < 4) this.kbv = 0; }
      switch (this.state) {
        case 'attack': {
          const m = this.move, r = this.rate * (this.tired ? .72 : 1) * (this.kiaiT > 0 ? 1.1 : 1), pt = this.t;
          this.t += dt * r;
          if (m.adv && pt < m.st) this.x += this.dir * m.adv * Math.min(dt * r, m.st - pt) / m.st;
          if (!this.whooshed && this.t >= m.st * .7) { this.whooshed = true; KY.audio.whoosh(m.type === 'geri' ? 1 : .5); }
          if (!this.hitDone && this.t >= m.st && pt <= m.st + m.ac) F.tryHit(this);
          if (this.state !== 'attack') break;
          if (this.t >= m.total) { this.state = 'idle'; this.pose.sp = 0; this.pose.r = 0; } else this.sample(this.t);
          break;
        }
        case 'hit': this.t += dt; this.blend(this.hitPose, dt, 45); if (this.t >= this.stunT) this.state = 'idle'; break;
        case 'block': this.guardT += dt; this.blend(POSES['guard' + this.guard], dt, 45); break;
        case 'down': this.t += dt; this.blend(this.downPose, dt, 130); break;
        case 'getup': this.t += dt; this.blend(STANCE, dt, 170); if (this.t > 750) this.state = 'idle'; break;
        case 'pose': this.blend(this.fixedPose, dt, 150); break;
        case 'dash': this.t += dt; this.x += this.dashDir * .58 * dt; this.blend(STANCE, dt, 60); if (this.t >= 160) this.state = 'idle'; break;
        default: {
          if (this.endPose) { this.state = 'pose'; this.fixedPose = this.endPose; break; }
          if (this.vx) {
            const sp = this.walk * (.5 + .5 * this.frac('legs')) * (this.vx * this.dir < 0 ? .8 : 1);
            this.x += this.vx * sp * dt / 1000; this.walkPhase += dt * .013;
          }
          const b = Math.sin(F.time * .006 + this.seed) * 1.5, w = this.vx ? Math.sin(this.walkPhase) * 11 : 0;
          const limp = this.frac('legs') < .35 ? 1 : 0, tired = this.sta < this.maxSta * .25 ? 1 : 0;
          this.blend(P({ fh: 30 + w, fk: 35 + Math.abs(w) * .6 + b * 2 + limp * 16, bh: -12 - w, bk: 22 + b * 2 + Math.abs(w) * .6, t: 6 + b * .5 + limp * 5 + tired * 10, h: tired * 8, fs: 38 + b - tired * 12, fe: 105 - tired * 18, bs: 12 - b - tired * 4, be: 118 - tired * 22 }), dt, 70);
        }
      }
      if (this.state !== 'attack' && this.state !== 'down') {
        this.restT += dt;
        if (this.restT > 350) this.sta = Math.min(this.maxSta, this.sta + this.staRegen * (this.state === 'block' ? .4 : 1) * (.45 + .55 * this.frac('body')) * dt / 1000);
      }
      this.vx = 0;
    }
  }

  // ------------------------------------------------------------------ AI
  class AI {
    constructor(me, level, style) {
      const L = this.L = clamp(level, 0, 1), S = KY.STYLES[style] || KY.STYLES.allround;
      this.me = me; this.w = S.w; this.pref = S.range;
      this.block = .12 + .62 * L; this.react = 400 - 250 * L; this.read = .35 + .6 * L;
      this.gap = 1500 - 1000 * L; this.combo = .15 + .6 * L;
      this.timer = 500; this.seen = -1; this.plan = null; this.queue = 0; this.want = this.pref; this.close = 0;
    }
    update(dt, F) {
      const me = this.me, op = me.opp, L = this.L, dist = Math.abs(me.x - op.x);
      this.timer -= dt;
      if (me.spirit >= 100 && me.canAct() && Math.random() < .03) F.kiai(me);
      // read the incoming technique and maybe get a guard up in time
      if (op.state === 'attack' && op.serial !== this.seen) {
        this.seen = op.serial;
        const m = op.move, left = (m.st - op.t) / op.rate;
        if (dist < m.rng * op.scale + 40 && me.state !== 'attack' && Math.random() < this.block) {
          const delay = this.react * rand(.7, 1.3);
          if (delay < left + m.ac * .5) {
            const right = m.zone === 'head' ? 'high' : m.zone === 'legs' ? 'low' : 'mid';
            this.plan = { t: delay, g: Math.random() < this.read ? right : 'mid', s: op.serial };
          }
        }
      }
      if (this.plan) {
        const pl = this.plan; pl.t -= dt;
        if (op.state !== 'attack' || op.serial !== pl.s) {
          if (pl.on) { me.guardOff(); if (Math.random() < .4 + .5 * L) this.timer = Math.min(this.timer, 90); }
          this.plan = null;
        } else if (pl.t <= 0 && me.canAct()) { me.guardOn(pl.g); pl.on = true; }
        if (this.plan && pl.on) return;
      }
      if (!me.canAct() && !me.canCancel()) return;
      if (me.state === 'block') me.guardOff();
      const tired = me.sta < me.maxSta * .22;
      if (me.state === 'idle') {
        const want = this.want * me.scale + (tired ? 80 : 0);
        this.close -= dt;
        if (dist > want + 4 || (this.close > 0 && !tired)) me.vx = me.dir; else if (dist < want - 34 && tired) me.vx = -me.dir;
      }
      if (this.timer > 0) return;
      if (me.state === 'attack' && !(this.queue > 0)) return;
      if (tired && Math.random() < .75) { this.timer = 450; return; }
      // pick a technique that reaches, favouring the opponent's most damaged zone
      const weak = ZONES.reduce((a, z) => op.frac(z) < op.frac(a) ? z : a, 'body');
      const opts = []; let tot = 0;
      for (const id in this.w) {
        const m = MOVES[id];
        if (dist > m.rng * me.scale - 4 || (m.minRng && dist < m.minRng + 10) || m.cost > me.sta + 2) continue;
        let w = this.w[id];
        if (m.zone === weak && op.frac(weak) < .8) w *= 1 + L;
        if (id === me.lastMove) w *= .5;
        opts.push([id, w]); tot += w;
      }
      if (!opts.length) { this.timer = 100; this.queue = 0; this.close = 260; return; }
      let r = Math.random() * tot, id = opts[0][0];
      for (const [k, w] of opts) { r -= w; if (r <= 0) { id = k; break; } }
      if (id === 'seiken' && me.lastMove === 'seiken' && me.lastMoveT < 700) id = 'gyaku';
      if (me.attack(id)) {
        F.note(me, id);
        if (this.queue > 0) this.queue--; else if (Math.random() < this.combo) this.queue = irand(1, 1 + Math.round(L * 2));
        this.timer = this.queue > 0 ? 0 : this.gap * rand(.6, 1.4);
        this.want = Math.random() < .4 ? 88 : this.pref;       // sometimes step inside to punch
      }
    }
  }
  KY.AI = AI;

  // ------------------------------------------------------------------ fight
  class Fight {
    constructor(o) {
      this.o = o; this.dojo = KY.DOJOS[o.dojo]; this.bg = KY.dojoBG(o.dojo);
      this.time = 0; this.pt = 0; this.phase = 'intro';
      const p1 = this.p1 = new Combatant(o.p1, 800 - 145, 1, true, 1), p2 = this.p2 = new Combatant(o.p2, 800 + 145, -1, false, o.oppHp || 1);
      p1.opp = p2; p2.opp = p1;
      if (o.carry) { for (const z of ZONES) p1.hp[z] = p1.maxHp[z] * o.carry.hp[z]; p1.sta = p1.maxSta * o.carry.sta; p1.spirit = o.carry.spirit; }
      this.ai = new AI(p2, o.aiLevel, o.p2.style);
      this.clock = o.time || 90; this.fx = []; this.pops = []; this.notes = {};
      this.shake = 0; this.hitstop = 0; this.slow = 0; this.banner = null; this.extUsed = false; this.flags = null; this.buf = null;
      this.cam = { x: 160, z: 1.05 };
      this.ref = { skin: KY.pick(KY.SKINS), hair: '#15120f', hs: 1, beard: 0, band: 0, gi: 0, h: .96, w: 1, outfit: 'ref' };
      this.refPose = P(POSES.stand);
      for (const p of [p1, p2]) { p.state = 'pose'; p.fixedPose = POSES.bow; p.pose = P(POSES.stand); }
      this.say('rei', o.quick ? 500 : 1100);
    }

    say(kind, dur) {
      const c = CALLS[kind];
      this.banner = Object.assign({ age: 0, dur: dur || 1300, kind }, c);
      KY.audio.speak(c.v);
      if (kind === 'hajime' || kind === 'zokko') KY.audio.taiko(1);
      else if (kind === 'yame' || kind === 'wazaari') { KY.audio.taiko(.8); KY.audio.rim(1); }
    }
    note(p, id) { const m = MOVES[id]; this.notes[p.isPlayer ? 'a' : 'b'] = { n: m.n, en: m.en, foul: m.foul, t: 0 }; }
    pop(x, y, txt, col, size) { this.pops.push({ x, y, txt, col: col || '#fff', size: size || 26, t: 0 }); }

    kiai(p) {
      if (p.spirit < 100 || p.state === 'down' || p.state === 'getup' || this.phase !== 'fight') return;
      p.spirit = 0; p.kiaiT = 6000; p.sta = Math.min(p.maxSta, p.sta + 45);
      if (p.state === 'hit') p.state = 'idle';
      KY.audio.kiai(); this.shake = 9; this.pop(p.x, G - 270, 'KIAI!', '#ffb347', 44);
      for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28; this.fx.push({ x: p.x, y: G - 140, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 0, max: 320, r: 4, col: '#ffcf7a', g: 0 }); }
    }

    // --- player input -> techniques
    control() {
      const I = KY.input, p = this.p1;
      const L = I.down('left'), R = I.down('right'), U = I.down('up'), Dn = I.down('down');
      const fwd = p.dir > 0 ? R : L, back = p.dir > 0 ? L : R;
      for (const a of ['J', 'K', 'L', 'I', 'H']) if (I.pressed(a)) this.buf = { a, U, Dn, fwd, back, t: this.time };
      if (this.buf && this.time - this.buf.t > 240) this.buf = null;
      if (this.buf && (p.canAct() || p.canCancel())) {
        const b = this.buf; let id;
        if (b.a === 'J') id = b.U ? 'kagi' : b.Dn ? 'shita' : (p.lastMove === 'seiken' && p.lastMoveT < 700 ? 'gyaku' : 'seiken');
        else if (b.a === 'K') id = b.U ? 'jodan' : b.Dn ? 'gedan' : b.back ? 'mae' : 'chudan';
        else if (b.a === 'L') id = b.U ? 'kakato' : b.Dn ? 'barai' : b.back ? 'ushiro' : b.fwd ? 'ushiroMawashi' : 'hiza';
        else id = b.a === 'I' ? 'kaiten' : 'ganmen';
        if (p.attack(id)) this.note(p, id);
        this.buf = null;
      }
      if (I.pressed('kiai')) this.kiai(p);
      const d = I.dtap(); if (d) p.dash(d);
      if (I.down('guard')) p.guardOn(U ? 'high' : Dn ? 'low' : 'mid');
      else { p.guardOff(); if (p.state === 'idle') p.vx = (R ? 1 : 0) - (L ? 1 : 0); }
    }

    // --- a technique reaches its striking frame
    tryHit(a) {
      if (this.phase !== 'fight') { a.hitDone = true; return; }
      const m = a.move, d = a.opp, dist = Math.abs(a.x - d.x);
      if (dist > m.rng * a.scale + 6 || (m.minRng && dist < m.minRng)) return;
      a.hitDone = true;
      if (d.state === 'down' || d.state === 'getup') return;
      const zone = m.zone, ix = d.x - a.dir * 16, iy = G + ZONE_Y[zone] * d.scale;
      if (d.state === 'dash' && d.dashBack && d.t < 120) { this.pop(d.x, G - 250, 'SABAKI', '#9fe0ff', 22); return; }
      let dmg = m.dmg * (m.type === 'geri' ? a.kickMul * (.6 + .4 * a.frac('legs')) : a.powMul);
      if (a.tired) dmg *= .5;
      if (a.kiaiT > 0) dmg *= 1.3;
      let cov = 0;
      if (d.state === 'block') {
        cov = COVER[d.guard][zone] * (m.pierce || 1);
        if (cov >= 1 && d.guardT < 150 && !m.foul) {                       // perfectly timed block
          a.stun(POSES.stumble, 430); d.spirit = Math.min(100, d.spirit + 12); d.sta = Math.min(d.maxSta, d.sta + 6);
          KY.audio.hit(8, zone, true); this.hitstop = 70; this.spark(ix, iy, 16, '#bfe8ff');
          this.pop(d.x, G - 250, zone === 'legs' ? 'SUNE UKE!' : 'UKE!', '#9fe0ff', 30);
          if (zone === 'legs') a.hp.legs = Math.max(1, a.hp.legs - dmg * .5);
          return;
        }
      }
      const counter = d.state === 'attack' && d.t < d.move.st;
      if (counter) dmg *= 1.3;
      if (cov >= 1 && zone === 'legs') { a.hp.legs = Math.max(1, a.hp.legs - dmg * .4); this.pop(d.x, G - 110, 'SUNE UKE', '#9fe0ff', 20); }
      const raw = dmg; dmg *= 1 - .85 * cov;
      d.hp[zone] -= dmg; a.dmgDealt += dmg; a.hitLanded = true;
      d.sta = Math.max(0, d.sta - dmg * (zone === 'body' ? .7 : .2) * (m.stam || 1) - (cov ? raw * .3 : 0));
      a.spirit = Math.min(100, a.spirit + dmg * .9); d.spirit = Math.min(100, d.spirit + dmg * 1.2);
      d.kbv += a.dir * (m.push || 6) * (cov ? .6 : 1) / .09;
      // juice
      KY.audio.hit(dmg, zone, cov >= .9);
      this.hitstop = cov >= .9 ? 35 : Math.min(190, 45 + dmg * 6); this.shake = Math.max(this.shake, cov >= .9 ? 2 : dmg * .75);
      this.spark(ix, iy, cov >= .9 ? 10 : 12 + dmg * 1.6, cov >= .9 ? '#cfd8e6' : '#fff3c4');
      if (cov < .9) {
        a.hits++; d.flash = 60;
        for (let i = 0; i < 4 + dmg * .7; i++) this.fx.push({ x: ix, y: iy, vx: a.dir * rand(60, 420), vy: rand(-380, 80), life: 0, max: rand(300, 650), r: rand(1.5, 3.5), col: 'rgba(225,240,255,.9)', g: 1100 });
        if (counter) this.pop(d.x, iy - 46, 'COUNTER!', '#ffd24a', 28);
        if (dmg >= 15) this.pop(d.x, iy - 78, m.n.toUpperCase() + '!', '#fff', 24);
      }
      if (m.foul) { if (d.hp.head < 1) d.hp.head = 1; d.stun(POSES.hithead, 300); this.foul(a); return; }
      // knockdown?
      let kd = d.hp[zone] <= 0;
      if (!kd && cov < .5) {
        const f = d.frac(zone), rel = dmg / d.maxHp[zone];
        if (zone === 'head' && m.type === 'geri') kd = Math.random() < rel * (1.25 - f) * 1.1 * (counter ? 2 : 1);
        else if (zone === 'body' && m.liver && f < .6 && Math.random() < rel * (1 - f) * m.liver * (counter ? 1.6 : 1)) { kd = true; this.pop(d.x, iy - 110, 'LIVER SHOT', '#ff6a4a', 26); }
      }
      if (kd) { d.hp[zone] = Math.max(0, d.hp[zone]); this.knock(d, a, zone); return; }
      if (cov >= .9) return;
      if (m.trip) { d.stun(POSES.stumble, 520); this.pop(d.x, G - 250, 'KUZUSHI!', '#9fe0ff', 24); return; }
      if (d.state === 'attack' && dmg < 7.5) return;                        // conditioned bodies walk through light shots
      d.stun(POSES['hit' + zone], Math.min(430, 130 + dmg * 9));
    }
    spark(x, y, size, col) { this.fx.push({ spark: 1, x, y, size, col, life: 0, max: 130, rot: Math.random() * 3 }); }

    foul(a) {
      a.fouls++;
      this.pop(a.opp.x, G - 290, 'HANSOKU!', '#ff4a3a', 34);
      if (a.fouls >= 4) return this.finish(a.opp, 'shikkaku');
      this.call(a.fouls === 2 ? 'genten' : 'chui', 1700);
    }

    knock(d, a, zone) {
      d.norm(); d.state = 'down'; d.t = 0; d.guard = null; d.kbv = 0; d.downPose = POSES['down' + zone];
      this.phase = 'down'; this.pt = 0; this.downed = d; this.downZone = zone;
      this.slow = 750; this.shake = 16; this.hitstop = 170;
      KY.audio.down(); if (this.dojo.crowd) KY.audio.cheer();
      for (let i = 0; i < 12; i++) this.fx.push({ x: d.x + rand(-40, 40), y: G - 4, vx: rand(-120, 120), vy: rand(-90, -10), life: 0, max: 700, r: rand(5, 11), col: 'rgba(230,225,210,.35)', g: 60 });
      if (a.wazaari >= 1) this.plan = 'awasete';
      else if (d.isPlayer) { this.plan = 'mash'; this.mash = { n: 0, need: Math.round(7 + 13 * (1 - d.cond()) + (this.o.fatigue || 0)) }; }
      else {
        let p = .3 + d.cond() * .75; if (zone === 'head') p -= .12;
        this.plan = Math.random() < clamp(p * (this.o.oppWill || 1), .06, .95) ? 'rise' : 'stay'; this.riseAt = rand(1300, 2600);
      }
    }
    rise() {
      const d = this.downed, a = d.opp, z = this.downZone;
      d.state = 'getup'; d.t = 0; d.hp[z] = Math.max(d.hp[z], d.maxHp[z] * .45); d.sta = Math.max(d.sta, d.maxSta * .4);
      a.wazaari++; this.call('wazaari', 1900, null, true);
    }

    call(kind, dur, cb, reset) {
      this.phase = 'call'; this.pt = 0; this.callDur = dur; this.callCb = cb; this.callReset = reset;
      this.p1.guardOff(); this.p2.guardOff(); this.say(kind, dur);
    }

    timeUp() {
      const p1 = this.p1, p2 = this.p2, o = this.o;
      const sc = p => { const q = p.opp, tot = q.maxHp.head + q.maxHp.body + q.maxHp.legs; return p.wazaari * 200 + p.dmgDealt / tot * 100 + p.hits * .25 - (p.fouls >= 2 ? 25 : 0) - (p.fouls % 2 ? 6 : 0); };
      const diff = sc(p1) - sc(p2), ad = Math.abs(diff);
      let w = null, n = 0, ext = false;
      if (ad < 3.5) { if (o.allowDraw) w = null; else if (!this.extUsed && o.encho !== false) ext = true; else { w = diff >= 0 ? p1 : p2; n = 3; } }
      else { w = diff > 0 ? p1 : p2; n = ad < 10 ? 3 : ad < 22 ? 4 : 5; }
      const flags = w ? Array.from({ length: 5 }, (_, i) => (i < n) === (w === p1) ? 'w' : 'r').sort(() => Math.random() - .5) : ['x', 'w', 'x', 'r', 'x'];
      this.call('yame', 1000, () => {
        this.call('hantei', 2300, () => {
          if (ext) { this.flags = null; this.call('encho', 1500, () => { this.clock = o.enchoTime || 30; this.extUsed = true; this.phase = 'fight'; this.say('hajime', 800); }); }
          else this.finish(w, 'hantei');
        });
        this.flags = flags; this.flagT = 0;
      });
    }

    finish(w, method) {
      if (this.phase === 'over') return;
      const p1 = this.p1, p2 = this.p2;
      this.phase = 'over'; this.pt = 0; this.overDur = this.o.quick ? 2000 : 3300;
      p1.guardOff(); p2.guardOff();
      if (method === 'ippon' || method === 'awasete' || method === 'shikkaku') { this.say(method, 2600); KY.audio.gong(); if (this.dojo.crowd) KY.audio.cheer(); }
      else this.say(w ? (w === p1 ? 'shiro' : 'aka') : 'hikiwake', 2400);
      if (w) { w.endPose = POSES.win; if (w.opp.state !== 'down') w.opp.endPose = POSES.bow; } else p1.endPose = p2.endPose = POSES.bow;
      this.winner = w;
      this.result = {
        win: w === p1, draw: !w, method, opp: this.o.p2, dealt: p1.dmgDealt, taken: p2.dmgDealt,
        carry: { hp: { head: p1.frac('head'), body: p1.frac('body'), legs: p1.frac('legs') }, sta: p1.sta / p1.maxSta, spirit: p1.spirit },
      };
    }

    update(dtR) {
      this.time += dtR; this.pt += dtR;
      let dt = dtR;
      if (this.hitstop > 0) { this.hitstop -= dtR; dt = 0; } else if (this.slow > 0) { this.slow -= dtR; dt *= .3; }
      this.shake *= Math.exp(-dtR / 90);
      if (this.banner && (this.banner.age += dtR) > this.banner.dur) this.banner = null;
      for (const k in this.notes) this.notes[k].t += dtR;
      if (this.flags) this.flagT += dtR;
      const p1 = this.p1, p2 = this.p2, o = this.o;

      switch (this.phase) {
        case 'intro': {
          const T1 = o.quick ? 450 : 1150, T2 = o.quick ? 900 : 2200;
          if (this.pt > T1 && !this.i1) { this.i1 = 1; p1.state = p2.state = 'idle'; if (!o.quick) this.say('kamaete', 900); }
          if (this.pt > T2) { this.phase = 'fight'; this.say('hajime', 900); }
          break;
        }
        case 'fight':
          this.control(); this.ai.update(dt, this);
          this.clock -= dt / 1000;
          if (this.clock <= 0 && this.phase === 'fight') { this.clock = 0; this.timeUp(); }
          break;
        case 'down': {
          const d = this.downed, a = d.opp;
          if (this.plan === 'awasete') { if (this.pt > 1200) { a.wazaari = 2; this.finish(a, 'awasete'); } break; }
          if (this.plan === 'mash') { for (const k of ['J', 'K', 'L', 'guard']) if (KY.input.pressed(k)) this.mash.n++; if (this.mash.n >= this.mash.need && this.pt > 500) { this.rise(); break; } }
          if (this.plan === 'rise' && this.pt >= this.riseAt) { this.rise(); break; }
          if (this.pt >= 3000) this.finish(a, 'ippon');
          break;
        }
        case 'call':
          if (this.callReset) for (const p of [p1, p2]) if (p.state === 'idle' || p.state === 'getup') p.x += (p.startX - p.x) * Math.min(1, dtR / 220);
          if (this.pt >= this.callDur) { const cb = this.callCb; this.callCb = null; if (cb) cb(); else { this.phase = 'fight'; this.say('zokko', 750); } }
          break;
        case 'over':
          if (this.pt >= this.overDur && !this.ended) { this.ended = true; o.onEnd(this.result); }
          break;
      }
      p1.update(dt, this); p2.update(dt, this);
      // bodies can't overlap, and the mat has edges
      const dx = p2.x - p1.x, s = Math.sign(dx) || 1, MIN = 82;
      if (Math.abs(dx) < MIN) { const push = (MIN - Math.abs(dx)) / 2; p1.x -= s * push; p2.x += s * push; }
      for (const p of [p1, p2]) p.x = clamp(p.x, 130, 1470);
      if (Math.abs(p2.x - p1.x) < MIN) { if (p1.x <= 131 || p1.x >= 1469) p2.x = p1.x + s * MIN; else p1.x = p2.x - s * MIN; }
      // camera
      const mid = (p1.x + p2.x) / 2, dist = Math.abs(p2.x - p1.x), k = 1 - Math.exp(-dtR / 160);
      const tz = this.phase === 'down' || this.phase === 'over' ? 1.22 : clamp(1.2 - (dist - 90) / 700 * .25, 1.04, 1.2);
      this.cam.x += (clamp(mid - 640, 10, 310) - this.cam.x) * k; this.cam.z += (tz - this.cam.z) * k;
      // effects
      for (const f of this.fx) { f.life += dtR; if (!f.spark) { f.x += f.vx * dt / 1000; f.y += f.vy * dt / 1000; f.vy += f.g * dt / 1000; if (f.y > G) { f.y = G; f.vy = 0; f.vx *= .6; } } }
      this.fx = this.fx.filter(f => f.life < f.max);
      for (const q of this.pops) q.t += dtR;
      this.pops = this.pops.filter(q => q.t < 900);
      const calling = this.banner && !['hajime', 'zokko', 'kamaete', 'rei'].includes(this.banner.kind);
      const k2 = 1 - Math.exp(-dtR / 120), rp = calling ? POSES.refpoint : POSES.stand;
      for (const j in STANCE) this.refPose[j] += (rp[j] - this.refPose[j]) * k2;
    }

    // ---------------------------------------------------------------- drawing
    render(ctx) {
      const c = this.cam, p1 = this.p1, p2 = this.p2, o = this.o;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1280, 720);
      ctx.save();
      ctx.translate(640 + (Math.random() - .5) * this.shake, G + (Math.random() - .5) * this.shake);
      ctx.scale(c.z, c.z); ctx.translate(-640 - c.x, -G);
      ctx.drawImage(this.bg, 0, 0); this.dojo.an(ctx, this.time);
      if (o.lineup) o.lineup.forEach((q, i) => KY.drawFighter(ctx, { x: 800 + (i - (o.lineup.length - 1) / 2) * 74, y: 552, dir: i % 2 ? -1 : 1, pose: POSES.seiza, look: q.look, rank: q.rank, scale: .6 }));
      const refDir = this.winner === p2 || (this.banner && this.banner.kind === 'aka') ? 1 : -1;
      KY.drawFighter(ctx, { x: (p1.x + p2.x) / 2, y: G - 34, dir: this.phase === 'over' ? refDir : 1, pose: this.refPose, look: this.ref, scale: .9 });
      const draw = p => KY.drawFighter(ctx, { x: p.x, y: G, dir: p.dir, pose: p.pose, look: p.look, rank: p.rank, flash: p.flash, face: p.face, aura: p.kiaiT > 0 });
      if (p1.state === 'down' || (p2.state === 'attack' && p1.state !== 'attack')) { draw(p1); draw(p2); } else { draw(p2); draw(p1); }
      for (const f of this.fx) {
        const u = f.life / f.max;
        if (f.spark) {
          const r = f.size * (.5 + u * 1.3); ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = 1 - u * u;
          ctx.fillStyle = f.col; ctx.beginPath();
          for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr = i % 2 ? r * .38 : r * (1 + (i % 4 ? 0 : .5)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, 7); ctx.fill(); ctx.restore();
        } else { ctx.globalAlpha = 1 - u; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y - f.r, f.r, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (const q of this.pops) {
        const u = q.t / 900; ctx.globalAlpha = u > .7 ? (1 - u) / .3 : 1;
        ctx.font = `${q.size * (u < .1 ? .6 + u * 4 : 1)}px ${HD}`; ctx.lineWidth = 6; ctx.strokeStyle = '#120c08';
        ctx.strokeText(q.txt, q.x, q.y - u * 46); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y - u * 46);
      }
      ctx.globalAlpha = 1; ctx.restore();
      // cinematic edge
      const v = ctx.createRadialGradient(640, 380, 330, 640, 380, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, 1280, 720);
      this.hud(ctx);
    }

    hud(ctx) {
      const p1 = this.p1, p2 = this.p2, o = this.o;
      ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const panel = (p, left) => {
        const W = 400, x = left ? 26 : 1280 - 26 - W, al = left ? 'left' : 'right', ax = left ? x : x + W, sg = left ? 1 : -1;
        ctx.textAlign = al;
        ctx.fillStyle = left ? '#f4f1e8' : '#c8261c'; ctx.fillRect(left ? x : x + W - 8, 20, 8, 30);
        ctx.font = `28px ${HD}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,6,4,.85)';
        ctx.strokeText(p.name.toUpperCase(), ax + sg * 16, 35); ctx.fillStyle = '#f7f2e6'; ctx.fillText(p.name.toUpperCase(), ax + sg * 16, 35);
        const b = KY.BELTS[p.rank]; ctx.font = '600 13px "Avenir Next","Helvetica Neue",Arial';
        const tw = ctx.measureText(p.name.toUpperCase()).width; ctx.font = `28px ${HD}`; const nw = ctx.measureText(p.name.toUpperCase()).width;
        ctx.font = '600 13px "Avenir Next","Helvetica Neue",Arial';
        const bx = ax + sg * (28 + nw);
        ctx.fillStyle = '#120c08'; ctx.fillRect(left ? bx - 2 : bx - 30, 27, 32, 14); ctx.fillStyle = b.color; ctx.fillRect(left ? bx : bx - 28, 29, 28, 10);
        if (b.stripe) { ctx.fillStyle = b.stripe; ctx.fillRect(left ? bx + 20 : bx - 24, 29, 4, 10); }
        ctx.strokeText(b.name, bx + sg * 38, 35); ctx.fillStyle = '#e8dfc8'; ctx.fillText(b.name, bx + sg * 38, 35);
        ZONES.forEach((z, i) => {
          const y = 58 + i * 19, f = p.frac(z), bw = W - 74;
          const x0 = left ? x + 74 : x; ctx.fillStyle = 'rgba(10,6,4,.78)'; ctx.fillRect(x0 - 2, y - 2, bw + 4, 15);
          ctx.fillStyle = f > .6 ? '#8fcf6f' : f > .3 ? '#e6b83a' : '#dc3f28';
          ctx.fillRect(left ? x0 : x0 + bw * (1 - f), y, bw * f, 11);
          ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(left ? x0 : x0 + bw * (1 - f), y, bw * f, 3);
          ctx.font = `15px ${HD}`; ctx.fillStyle = f > .3 ? '#efe7d3' : '#ff7a62'; ctx.textAlign = al;
          ctx.lineWidth = 4; ctx.strokeText(ZLAB[z], left ? x : x + W, y + 6); ctx.fillText(ZLAB[z], left ? x : x + W, y + 6);
        });
        const bar = (y, h, f, col) => { ctx.fillStyle = 'rgba(10,6,4,.78)'; ctx.fillRect(x - 2, y - 2, W + 4, h + 4); ctx.fillStyle = col; ctx.fillRect(left ? x : x + W * (1 - f), y, W * f, h); };
        bar(118, 6, p.sta / p.maxSta, p.sta < p.maxSta * .25 ? '#d67a2c' : '#f2d65a');
        const full = p.spirit >= 100, kia = p.kiaiT > 0;
        bar(130, 5, kia ? p.kiaiT / 6000 : p.spirit / 100, kia ? '#ff8a3c' : full && Math.floor(this.time / 140) % 2 ? '#fff' : '#58b8ff');
        ctx.textAlign = al; ctx.font = `16px ${HD}`;
        let lx = ax, y = 154;
        if (p.wazaari) { const t = '技有り WAZA-ARI'; ctx.font = `700 15px ${JP}`; ctx.strokeText(t, lx, y); ctx.fillStyle = '#ffd24a'; ctx.fillText(t, lx, y); lx += sg * (ctx.measureText(t).width + 16); }
        if (p.fouls) { const t = p.fouls >= 2 ? '減点 GENTEN' + (p.fouls === 3 ? ' + CHUI' : '') : '注意 CHUI'; ctx.font = `700 15px ${JP}`; ctx.strokeText(t, lx, y); ctx.fillStyle = '#ff5a48'; ctx.fillText(t, lx, y); lx += sg * (ctx.measureText(t).width + 16); }
        if (full && p.isPlayer) { ctx.font = `16px ${HD}`; ctx.strokeText('KIAI READY  [F]', lx, y); ctx.fillStyle = '#7fd0ff'; ctx.fillText('KIAI READY  [F]', lx, y); }
        const nt = this.notes[left ? 'a' : 'b'];
        if (nt && nt.t < 1500) {
          ctx.globalAlpha = nt.t > 1100 ? (1500 - nt.t) / 400 : 1;
          ctx.font = `22px ${HD}`; ctx.lineWidth = 5; ctx.strokeText(nt.n.toUpperCase(), ax, 182); ctx.fillStyle = nt.foul ? '#ff5a48' : '#fff'; ctx.fillText(nt.n.toUpperCase(), ax, 182);
          ctx.font = 'italic 13px "Avenir Next","Helvetica Neue",Arial'; ctx.lineWidth = 3; ctx.strokeText(nt.en, ax, 202); ctx.fillStyle = '#e8dfc8'; ctx.fillText(nt.en, ax, 202);
          ctx.globalAlpha = 1;
        }
      };
      panel(p1, true); panel(p2, false);

      // clock
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,6,4,.8)'; ctx.beginPath(); ctx.roundRect(586, 14, 108, 78, 6); ctx.fill();
      ctx.fillStyle = '#c8261c'; ctx.fillRect(586, 14, 108, 4);
      ctx.font = `54px ${HD}`; ctx.fillStyle = this.clock <= 10 ? '#ff5a48' : '#f7f2e6'; ctx.fillText(Math.ceil(this.clock), 640, 56);
      ctx.font = `600 11px "Avenir Next",Arial`; ctx.fillStyle = '#b9ad94'; ctx.fillText(this.extUsed ? 'ENCHO-SEN' : this.dojo.name.toUpperCase(), 640, 82);
      if (o.label) {
        ctx.font = `20px ${HD}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,6,4,.85)'; ctx.strokeText(o.label, 640, 112); ctx.fillStyle = '#ffd24a'; ctx.fillText(o.label, 640, 112);
        if (o.tally) { const s = o.tally, t = `${s.w} W   ${s.d} D   ${s.l} L`; ctx.font = '600 13px "Avenir Next",Arial'; ctx.lineWidth = 4; ctx.strokeText(t, 640, 134); ctx.fillStyle = '#e8dfc8'; ctx.fillText(t, 640, 134); }
      }
      ctx.font = '600 12px "Avenir Next",Arial'; ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillText('J tsuki    K geri    L waza    I kaiten    SPACE guard  (+W head / +S shin check)    F kiai    double-tap ← → step    ESC pause', 640, 704);

      // knockdown count
      if (this.phase === 'down' && this.plan !== 'awasete') {
        const n = Math.min(3, 1 + Math.floor(this.pt / 1000));
        ctx.font = `150px ${HD}`; ctx.lineWidth = 12; ctx.strokeStyle = '#120c08'; ctx.globalAlpha = .9;
        ctx.strokeText(n, 640, 300); ctx.fillStyle = '#ffd24a'; ctx.fillText(n, 640, 300); ctx.globalAlpha = 1;
        ctx.font = `30px ${HD}`; ctx.lineWidth = 6; ctx.strokeText('DOWN', 640, 204); ctx.fillStyle = '#fff'; ctx.fillText('DOWN', 640, 204);
        if (this.plan === 'mash') {
          const f = clamp(this.mash.n / this.mash.need, 0, 1);
          ctx.fillStyle = 'rgba(10,6,4,.85)'; ctx.fillRect(420, 396, 440, 30); ctx.fillStyle = '#c8261c'; ctx.fillRect(424, 400, 432 * f, 22);
          ctx.font = `28px ${HD}`; ctx.lineWidth = 6; const t = Math.floor(this.time / 120) % 2 ? 'GET UP!  MASH  J / K' : 'GET UP!  MASH  J / K ';
          ctx.strokeText(t, 640, 456); ctx.fillStyle = '#fff'; ctx.fillText(t, 640, 456);
        }
      }
      // referee banner
      const b = this.banner;
      if (b) {
        const u = b.age / b.dur, a = u < .08 ? u / .08 : u > .85 ? (1 - u) / .15 : 1, sc = u < .08 ? 1.5 - u / .08 * .5 : 1, big = b.kind === 'ippon' || b.kind === 'awasete';
        ctx.save(); ctx.globalAlpha = a; ctx.translate(640, this.flags ? 250 : 300);
        ctx.fillStyle = 'rgba(8,5,4,.62)'; ctx.fillRect(-640, -92, 1280, 184);
        ctx.fillStyle = '#c8261c'; ctx.fillRect(-640, -92, 1280, 3); ctx.fillRect(-640, 89, 1280, 3);
        ctx.scale(sc, sc);
        ctx.font = `900 ${b.k.length > 3 ? 74 : 104}px ${JP}`; ctx.lineWidth = 10; ctx.strokeStyle = '#120c08';
        ctx.strokeText(b.k, 0, -22); ctx.fillStyle = big ? '#ffd24a' : '#f7f2e6'; ctx.fillText(b.k, 0, -22);
        ctx.font = `34px ${HD}`; ctx.lineWidth = 6; ctx.strokeText(b.t, 0, 46); ctx.fillStyle = '#ff5a48'; ctx.fillText(b.t, 0, 46);
        ctx.font = 'italic 15px "Avenir Next",Arial'; ctx.fillStyle = '#e8dfc8'; ctx.fillText(b.s, 0, 74);
        ctx.restore();
      }
      // judges' flags
      if (this.flags && this.flagT > 500) {
        this.flags.forEach((f, i) => {
          const x = 440 + i * 100, up = clamp((this.flagT - 500 - i * 90) / 160, 0, 1), y = 470 - up * 40;
          if (up > 0 && !this['fl' + i]) { this['fl' + i] = 1; KY.audio.flag(); }
          ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 26, y + 60); ctx.lineTo(x - 26, y - 6); ctx.stroke();
          if (f === 'x') { ctx.fillStyle = '#f4f1e8'; ctx.fillRect(x - 24, y + 22, 44, 30); ctx.fillStyle = '#c8261c'; ctx.fillRect(x - 12, y + 30, 44, 30); }
          else { ctx.fillStyle = '#120c08'; ctx.fillRect(x - 26, y - 6, 60, 42); ctx.fillStyle = f === 'w' ? '#f4f1e8' : '#c8261c'; ctx.fillRect(x - 23, y - 3, 54, 36); }
        });
      } else if (!this.flags) for (let i = 0; i < 5; i++) this['fl' + i] = 0;
    }
  }
  KY.Fight = Fight;
})();
