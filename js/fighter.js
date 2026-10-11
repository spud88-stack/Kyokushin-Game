'use strict';
// Procedural fighter: a pose is a handful of joint angles, solved into points and drawn as a gi-clad figure.
(function () {
  const D = Math.PI / 180;
  const SEG = { torso: 74, neck: 9, head: 17, ua: 35, fa: 33, th: 54, sh: 54, foot: 16 };
  const RAD = { hip: 18, neck: 13, head: 17, sh: 13, elF: 7, elB: 7, haF: 8, haB: 8, knF: 9, knB: 9, ftF: 6, ftB: 6, toF: 5, toB: 5 };
  const JOINTS = Object.keys(RAD);

  const STANCE = KY.STANCE = { t: 6, h: 0, fs: 38, fe: 105, bs: 12, be: 118, fh: 30, fk: 35, bh: -12, bk: 22, x: 0, lift: 0, r: 0, sp: 0 };
  const P = KY.P = o => Object.assign({}, STANCE, o);

  KY.POSES = {
    guardmid: P({ t: 10, fs: 52, fe: 118, bs: 36, be: 126, fh: 30, fk: 40, bh: -12, bk: 28 }),
    guardhigh: P({ t: 8, h: 8, fs: 96, fe: 78, bs: 82, be: 88 }),
    guardlow: P({ t: 2, fh: 84, fk: 104, bh: -4, bk: 10, fs: 46, fe: 112, bs: 26, be: 120 }),
    hithead: P({ t: -24, h: -28, fs: 20, fe: 60, bs: -10, be: 70, fh: 22, fk: 28, bh: -22, bk: 34, x: -6 }),
    hitbody: P({ t: 32, h: 16, fs: 26, fe: 96, bs: 14, be: 102, fh: 34, fk: 52, bh: -8, bk: 42 }),
    hitlegs: P({ t: 16, h: 6, fh: 40, fk: 70, bh: -16, bk: 30, fs: 30, fe: 90 }),
    stumble: P({ t: -14, h: -8, fh: 58, fk: 24, bh: -26, bk: 40, fs: 74, fe: 30, bs: -40, be: 30 }),
    downhead: P({ r: -90, t: 0, h: -6, fs: 150, fe: 15, bs: 30, be: 10, fh: 42, fk: 80, bh: 6, bk: 6 }),
    downbody: P({ t: 86, h: 14, fh: 34, fk: 124, bh: 22, bk: 112, fs: 28, fe: 122, bs: 18, be: 126 }),
    downlegs: P({ t: 38, h: 10, fh: 78, fk: 98, bh: -6, bk: 84, fs: 52, fe: 28, bs: 24, be: 62 }),
    bow: P({ t: 36, h: 12, fs: 6, fe: 6, bs: 2, be: 6, fh: 5, fk: 5, bh: -3, bk: 3 }),
    win: P({ t: -3, h: -4, fs: -6, fe: 38, bs: -12, be: 42, fh: 12, fk: 5, bh: -12, bk: 5 }),
    seiza: P({ t: 2, fh: 86, fk: 172, bh: 82, bk: 168, fs: 26, fe: 52, bs: 20, be: 58 }),
    stand: P({ t: 0, fs: 4, fe: 6, bs: 0, be: 6, fh: 5, fk: 4, bh: -4, bk: 3 }),
    refpoint: P({ t: 0, fs: 122, fe: 4, bs: 0, be: 6, fh: 5, fk: 4, bh: -4, bk: 3 }),
    tameUp: P({ t: 4, bs: 172, be: 14, fs: 64, fe: 16, fh: 44, fk: 56, bh: -26, bk: 34 }),
    tameDown: P({ t: 40, h: 10, bs: 44, be: 8, fs: -24, fe: 96, fh: 50, fk: 66, bh: -28, bk: 38 }),
  };

  // Pose -> joint positions. Local space: x forward, y down, feet resting on y = 0.
  KY.solve = function (p) {
    const J = {};
    const pt = (o, a, l) => ({ x: o.x + Math.sin(a * D) * l, y: o.y + Math.cos(a * D) * l });
    J.hip = { x: 0, y: 0 };
    const ta = 180 - p.t;
    J.neck = pt(J.hip, ta, SEG.torso);
    J.sh = pt(J.hip, ta, SEG.torso - 9);
    J.head = pt(J.neck, ta - p.h, SEG.neck + SEG.head * .75);
    J.elF = pt(J.sh, p.fs, SEG.ua); J.haF = pt(J.elF, p.fs + p.fe, SEG.fa);
    J.elB = pt(J.sh, p.bs, SEG.ua); J.haB = pt(J.elB, p.bs + p.be, SEG.fa);
    J.knF = pt(J.hip, p.fh, SEG.th); J.ftF = pt(J.knF, p.fh - p.fk, SEG.sh); J.toF = pt(J.ftF, p.fh - p.fk + 80, SEG.foot);
    J.knB = pt(J.hip, p.bh, SEG.th); J.ftB = pt(J.knB, p.bh - p.bk, SEG.sh); J.toB = pt(J.ftB, p.bh - p.bk + 80, SEG.foot);
    // whole-body roll (r), fake spin by squashing x (sp), then drop onto the ground
    const c = Math.cos(p.r * D), s = Math.sin(p.r * D), sx = Math.cos(p.sp * Math.PI);
    let maxY = -1e9;
    for (const k of JOINTS) {
      const q = J[k], x = q.x * c - q.y * s, y = q.x * s + q.y * c;
      q.x = x * sx + p.x; q.y = y;
      if (y + RAD[k] > maxY) maxY = y + RAD[k];
    }
    const dy = -maxY - p.lift;
    for (const k of JOINTS) J[k].y += dy;
    J.sx = sx;
    return J;
  };

  const OUT = '#1b1511';

  // o: {x, y, dir, pose, look, rank, scale, flash, face, aura, shadow}
  KY.drawFighter = function (ctx, o) {
    const J = KY.solve(o.pose), L = o.look, S = (o.scale || 1) * (L.h || 1), W = L.w || 1;
    const ref = L.outfit === 'ref', fl = o.flash > 0, G = KY.GIS[L.gi || 0];
    const gi = fl ? '#ffffff' : ref ? '#dfe7f2' : G.c, giB = fl ? '#ffffff' : KY.shade(ref ? '#dfe7f2' : G.c, -.14);
    const pants = fl ? '#ffffff' : ref ? '#23252e' : gi, pantsB = fl ? '#ffffff' : ref ? '#191b22' : giB;
    const skin = fl ? '#ffffff' : L.skin, skinB = fl ? '#ffffff' : KY.shade(L.skin, -.16);
    const sleeveless = !ref && G.sl, front = J.sx >= 0 ? 1 : -1;
    const belt = KY.BELTS[o.rank || 0];

    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath();
      ctx.ellipse(J.hip.x * o.dir * S * .5, 3, 50 * S * W, 8 * S, 0, 0, 7); ctx.fill();
    }
    if (o.aura) {
      const g = ctx.createRadialGradient(0, -130 * S, 10, 0, -130 * S, 170 * S);
      g.addColorStop(0, 'rgba(255,190,90,.34)'); g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g; ctx.fillRect(-180 * S, -310 * S, 360 * S, 330 * S);
    }
    ctx.scale(o.dir * S, S);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const line = (a, b, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    const dot = (a, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 7); ctx.fill(); };
    const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

    function arm(el, ha, back) {
      const g = back ? giB : gi, s = back ? skinB : skin, w1 = 13 * W, w2 = 11 * W;
      ctx.strokeStyle = OUT; ctx.lineWidth = w1 + 4; ctx.beginPath();
      ctx.moveTo(J.sh.x, J.sh.y); ctx.lineTo(el.x, el.y); ctx.lineTo(ha.x, ha.y); ctx.stroke();
      line(el, ha, w2, s);
      if (sleeveless) line(J.sh, el, w1, s);
      else { line(J.sh, el, w1, g); line(el, mix(el, ha, .5), w2 + 1.5, g); }
      dot(ha, 8.5 * W, OUT); dot(ha, 6.6 * W, s);
    }
    function leg(kn, ft, to, back) {
      const g = back ? pantsB : pants, s = back ? skinB : skin, w1 = 20 * W, w2 = 16 * W;
      ctx.strokeStyle = OUT; ctx.lineWidth = w1 + 4; ctx.beginPath();
      ctx.moveTo(J.hip.x, J.hip.y); ctx.lineTo(kn.x, kn.y); ctx.lineTo(ft.x, ft.y); ctx.stroke();
      line(ft, to, 12, OUT); line(ft, to, 8, s);
      line(kn, ft, w2 - 4, s); line(kn, mix(kn, ft, .8), w2, g); line(J.hip, kn, w1, g);
    }

    arm(J.elB, J.haB, true);
    leg(J.knB, J.ftB, J.toB, true);

    // neck + torso
    line(J.neck, J.head, 15 * W, OUT); line(J.neck, J.head, 11 * W, skin);
    const top = mix(J.hip, J.neck, .88);
    line(J.hip, top, 41 * W, OUT); line(J.hip, top, 37 * W, gi);
    const ux = J.neck.x - J.hip.x, uy = J.neck.y - J.hip.y, ul = Math.hypot(ux, uy) || 1;
    const u = { x: ux / ul, y: uy / ul }, n = { x: -u.y * front, y: u.x * front };   // n points to the chest side
    const off = (a, k, m) => ({ x: a.x + n.x * k + u.x * (m || 0), y: a.y + n.y * k + u.y * (m || 0) });
    const pb = mix(J.hip, J.neck, .2);
    if (!ref) {
      ctx.lineCap = 'butt';
      line(off(top, 5, 12), off(pb, 15 * W), 2, 'rgba(60,45,30,.45)');           // lapel
      if (sleeveless) line(off(top, -4, 8), off(top, 12, 2), 2, 'rgba(60,45,30,.4)');
      ctx.lineCap = 'round';
    }
    // belt, knot and tails
    const bc = ref ? '#16171c' : belt.color;
    ctx.lineCap = 'butt';
    line(off(pb, -20.5 * W), off(pb, 20.5 * W), 11, OUT); line(off(pb, -19 * W), off(pb, 19 * W), 8, bc);
    ctx.lineCap = 'round';
    if (!ref) {
      const kn = off(pb, 17 * W), t1 = { x: kn.x + front * 3, y: kn.y + 22 }, t2 = { x: kn.x + front * 11, y: kn.y + 18 };
      line(kn, t1, 8, OUT); line(kn, t2, 8, OUT); line(kn, t1, 5, bc); line(kn, t2, 5, bc);
      ctx.lineCap = 'butt';
      if (belt.stripe) line(mix(kn, t1, .62), mix(kn, t1, .8), 5, belt.stripe);
      for (let i = 0; i < (belt.bars || 0); i++) line(mix(kn, t1, .5 + i * .16), mix(kn, t1, .58 + i * .16), 5, '#d8b23a');
      ctx.lineCap = 'round';
      dot(kn, 5.5, OUT); dot(kn, 4, bc);
      // Kyokushin kanji on the chest
      if (Math.abs(J.sx) > .55 && !fl) {
        const pc = off(mix(J.hip, J.neck, .62), 9 * W);
        ctx.save(); ctx.translate(pc.x, pc.y); ctx.scale(o.dir, 1); ctx.rotate(Math.atan2(u.x, -u.y) * o.dir);
        ctx.fillStyle = '#1d2f6b'; ctx.font = '700 8px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('極', 0, -4.5); ctx.fillText('真', 0, 4.5); ctx.restore();
      }
    }

    // head
    ctx.save();
    ctx.translate(J.head.x, J.head.y);
    ctx.rotate(Math.atan2(J.head.x - J.neck.x, -(J.head.y - J.neck.y)));
    ctx.scale(J.sx >= 0 ? Math.max(J.sx, .35) : Math.min(J.sx, -.35), 1);
    const R = 17, hc = fl ? '#ffffff' : L.hair, PI = Math.PI;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, R + 2, 0, 7); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.fillStyle = skinB; ctx.beginPath(); ctx.arc(-3, 2, 3.6, 0, 7); ctx.fill();
    const cap = (r, a0, a1) => { ctx.beginPath(); ctx.arc(0, 0, r, PI * a0, PI * a1); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = hc;
    switch (L.hs) {
      case 0: ctx.globalAlpha = .55; cap(R + .5, .98, 1.8); ctx.globalAlpha = 1; break;
      case 1: cap(R + 2.5, .9, 1.84); break;
      case 2: cap(R + 2, .9, 1.84);
        for (let i = 0; i < 6; i++) { const a = PI * (1.05 + i * .14); ctx.beginPath(); ctx.moveTo(Math.cos(a - .2) * R, Math.sin(a - .2) * R); ctx.lineTo(Math.cos(a) * (R + 11), Math.sin(a) * (R + 11)); ctx.lineTo(Math.cos(a + .2) * R, Math.sin(a + .2) * R); ctx.fill(); }
        break;
      case 3: cap(R + 2, .92, 1.84); ctx.beginPath(); ctx.arc(-9, -R - 4, 7, 0, 7); ctx.fill(); break;
      case 4: cap(R + 2.5, .9, 1.84); ctx.strokeStyle = hc; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-R, -5); ctx.quadraticCurveTo(-R - 16, 2, -R - 9, 24); ctx.stroke(); break;
      case 6: cap(R + 3, .86, 1.84); ctx.beginPath(); ctx.ellipse(-R + 3, 9, 8, 16, .2, 0, 7); ctx.fill(); break;
    }
    if (L.beard === 1) { ctx.globalAlpha = .28; cap(R, .06, .62); ctx.globalAlpha = 1; }
    if (L.beard === 2) { cap(R + 1.5, .04, .68); }
    const band = KY.BANDS[L.band || 0];
    if (band && band.c && !ref) {
      ctx.strokeStyle = fl ? '#fff' : band.c; ctx.lineWidth = 4.5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-R - 1, -5); ctx.lineTo(R + .5, -8); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-R, -5); ctx.lineTo(-R - 13, 1); ctx.moveTo(-R, -5); ctx.lineTo(-R - 10, 8); ctx.stroke();
    }
    // face
    ctx.strokeStyle = OUT; ctx.fillStyle = OUT; ctx.lineWidth = 2.2;
    const face = o.face || 'normal';
    ctx.beginPath(); ctx.moveTo(4, -8.5); ctx.lineTo(13, face === 'hurt' ? -9 : -6); ctx.stroke();
    if (face === 'ko') { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(12, 0); ctx.moveTo(12, -5); ctx.lineTo(6, 0); ctx.stroke(); }
    else if (face === 'hurt') { ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(11, -2); ctx.lineTo(6, 0); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(9, -2.5, 2.1, 2.6, 0, 0, 7); ctx.fill(); }
    if (face === 'kiai' || face === 'hurt' || face === 'ko') { ctx.fillStyle = '#3a0f0c'; ctx.beginPath(); ctx.ellipse(10.5, 8, 3.6, face === 'kiai' ? 4.6 : 3, 0, 0, 7); ctx.fill(); }
    else { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(8, 8.5); ctx.lineTo(14, 8); ctx.stroke(); }
    ctx.restore();

    leg(J.knF, J.ftF, J.toF, false);
    arm(J.elF, J.haF, false);
    ctx.restore();
  };

  // Small HTML belt chip used across the menus.
  KY.beltChip = function (rank) {
    const b = KY.BELTS[rank];
    let inner = b.stripe ? `<i style="background:${b.stripe}"></i>` : '';
    for (let i = 0; i < (b.bars || 0); i++) inner += '<i style="background:#d8b23a"></i>';
    return `<span class="belt" style="background:${b.color}">${inner}</span>`;
  };
})();
