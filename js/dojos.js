'use strict';
// Eight hand-drawn (in code) dojos. st() paints the static backdrop once into a cache; an() adds per-frame life.
(function () {
  const G = KY.GROUND, HZ = 532, WW = KY.WORLD, VX = 800;
  const R = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function lg(c, x0, y0, x1, y1, ...s) { const g = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < s.length; i += 2) g.addColorStop(s[i], s[i + 1]); return g; }
  function rg(c, x, y, r0, r1, ...s) { const g = c.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < s.length; i += 2) g.addColorStop(s[i], s[i + 1]); return g; }
  const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  function poly(c, col, pts) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function floor(c, fill, lineCol, step = 120, rows = 7) {
    rect(c, fill, 0, HZ, WW, 720 - HZ);
    c.strokeStyle = lineCol; c.lineWidth = 1.5;
    for (let xb = -1400; xb <= 3000; xb += step) { c.beginPath(); c.moveTo(VX + (xb - VX) * .6, HZ); c.lineTo(xb, 720); c.stroke(); }
    for (let i = 1; i < rows; i++) { const y = HZ + (720 - HZ) * Math.pow(i / rows, 1.7); c.beginPath(); c.moveTo(0, y); c.lineTo(WW, y); c.stroke(); }
  }
  function vkanji(c, txt, x, y, size, col, gap = 1.08) {
    c.fillStyle = col; c.font = `900 ${size}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    [...txt].forEach((ch, i) => c.fillText(ch, x, y + i * size * gap));
  }
  function glow(c, x, y, r, col) { c.fillStyle = rg(c, x, y, 0, r, 0, col, 1, 'rgba(0,0,0,0)'); c.fillRect(x - r, y - r, r * 2, r * 2); }
  function ridge(c, col, base, amp, seed, step = 40) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, HZ);
    for (let x = 0; x <= WW; x += step) c.lineTo(x, base - amp * (.5 * Math.sin(x * .004 + seed) + .5 * R(x + seed * 9)) );
    c.lineTo(WW, HZ); c.fill();
  }

  KY.DOJOS = [
    // ------------------------------------------------------------ 1. Honbu
    {
      name: 'Sohonbu Dojo', jp: '総本部道場', place: 'Tokyo, Japan', desc: 'Polished cedar, a taiko drum and the calligraphy of the founder. Where it all begins.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, 300, 0, '#f0e7d2', 1, '#dccfb4'), 0, 0, WW, 300);
        rect(c, lg(c, 0, 300, 0, HZ, 0, '#7d5532', 1, '#5c3b21'), 0, 300, WW, HZ - 300);
        c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1;
        for (let x = 0; x < WW; x += 46) { c.beginPath(); c.moveTo(x, 300); c.lineTo(x, HZ); c.stroke(); }
        rect(c, '#35210f', 0, 290, WW, 12); rect(c, '#35210f', 0, 0, WW, 36);
        // shomen alcove
        rect(c, '#2d1b0d', 628, 36, 344, HZ - 36); rect(c, lg(c, 0, 50, 0, HZ, 0, '#efe5cb', 1, '#cdbf9f'), 642, 50, 316, HZ - 62);
        rect(c, '#4a2f18', 628, HZ - 22, 344, 22);
        rect(c, '#5a3a1e', 720, 128, 160, 8);                                                  // kamidana shelf
        poly(c, '#3d2612', [752, 100, 800, 74, 848, 100]); rect(c, '#8a6238', 762, 100, 76, 28); rect(c, '#2a190b', 790, 108, 20, 20);
        rect(c, '#fff', 738, 112, 6, 14); rect(c, '#fff', 856, 112, 6, 14);
        rect(c, '#3b2716', 752, 156, 96, 330); rect(c, '#f8f3e4', 760, 170, 80, 300);           // scroll
        vkanji(c, '極真会', 800, 232, 66, '#14100c', 1.3);
        rect(c, '#b3261c', 812, 440, 16, 16);
        rect(c, '#f8f3e4', 672, 190, 44, 250); vkanji(c, '押忍', 694, 250, 34, '#14100c', 1.6);
        rect(c, '#f8f3e4', 884, 190, 44, 250); vkanji(c, '一撃必殺', 906, 222, 30, '#14100c', 1.7);
        for (const x of [100, 560, 1040, 1500]) rect(c, '#35210f', x - 14, 0, 28, HZ);
        // taiko
        rect(c, '#2d1b0d', 196, 440, 12, 92); rect(c, '#2d1b0d', 316, 440, 12, 92); rect(c, '#2d1b0d', 190, 478, 144, 10);
        c.fillStyle = '#7c1d12'; c.beginPath(); c.ellipse(262, 400, 84, 70, 0, 0, 7); c.fill();
        c.fillStyle = '#e9dcc0'; c.beginPath(); c.ellipse(262, 400, 62, 52, 0, 0, 7); c.fill();
        c.strokeStyle = '#14100c'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#14100c'; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; c.beginPath(); c.arc(262 + Math.cos(a) * 73, 400 + Math.sin(a) * 61, 3, 0, 7); c.fill(); }
        c.strokeStyle = '#14100c'; c.lineWidth = 9; c.beginPath(); c.arc(262, 400, 20, .4, 5.4); c.stroke();
        // name boards (nafuda)
        rect(c, '#35210f', 1110, 96, 360, 156);
        for (let r = 0; r < 4; r++) for (let i = 0; i < 16; i++) { rect(c, R(r * 20 + i) > .1 ? '#e2c592' : '#b99562', 1120 + i * 21.5, 106 + r * 36, 17, 30); rect(c, 'rgba(0,0,0,.6)', 1127 + i * 21.5, 110 + r * 36, 3, 20); }
        // makiwara post
        rect(c, '#6b4a28', 1392, 330, 16, 202); rect(c, '#c9b07a', 1388, 330, 24, 62);
        c.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = 334; y < 392; y += 6) { c.beginPath(); c.moveTo(1388, y); c.lineTo(1412, y + 3); c.stroke(); }
        // windows of light
        poly(c, 'rgba(255,238,190,.1)', [330, 36, 470, 36, 760, HZ, 520, HZ]); poly(c, 'rgba(255,238,190,.07)', [1180, 36, 1290, 36, 1150, HZ, 960, HZ]);
        floor(c, lg(c, 0, HZ, 0, 720, 0, '#c9a066', 1, '#8a5f35'), 'rgba(60,35,10,.3)', 92, 1);
        rect(c, lg(c, 0, HZ, 0, HZ + 70, 0, 'rgba(255,245,215,.28)', 1, 'rgba(255,245,215,0)'), 0, HZ, WW, 70);
      },
      an(c, t) {
        c.fillStyle = 'rgba(255,240,200,.5)';
        for (let i = 0; i < 26; i++) { const x = 380 + R(i) * 330 + Math.sin(t * .0004 + i) * 20, y = 60 + ((R(i + 50) * 480 + t * .008 * (1 + R(i))) % 470); c.fillRect(x + y * .45, y, 2, 2); }
      },
    },
    // ------------------------------------------------------------ 2. Mountain waterfall
    {
      name: 'Kiyosumi Falls', jp: '清澄山', place: 'Mount Kiyosumi, Japan', desc: 'Mountain training. Ice water on the shoulders, bare feet on wet rock.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, HZ, 0, '#8fb6cf', .55, '#f3d9b0', 1, '#f6c79a'), 0, 0, WW, HZ);
        glow(c, 1240, 200, 260, 'rgba(255,240,200,.75)');
        ridge(c, '#9fb5bd', 300, 140, 1, 50); ridge(c, '#6f8e8c', 360, 130, 4, 40); ridge(c, '#476a5c', 430, 90, 8, 30);
        // cliffs framing the falls
        poly(c, '#2f4638', [0, 0, 520, 0, 610, 120, 640, 300, 700, HZ, 0, HZ]);
        poly(c, '#28402f', [1600, 60, 1150, 30, 1010, 160, 980, 330, 930, HZ, 1600, HZ]);
        for (let i = 0; i < 40; i++) { const l = i % 2, x = l ? 40 + R(i) * 520 : 1040 + R(i) * 540, y = 110 + R(i + 9) * 380, s = 26 + R(i + 3) * 44; poly(c, l ? '#1d3226' : '#1a2d22', [x, y - s * 1.7, x + s * .55, y, x - s * .55, y]); poly(c, l ? '#243b2c' : '#203528', [x, y - s * 1.1, x + s * .7, y + s * .5, x - s * .7, y + s * .5]); }
        rect(c, lg(c, 0, 0, 0, HZ, 0, '#eaf4f7', 1, '#b9d9e2'), 690, 60, 250, HZ - 60);                 // water column
        poly(c, '#3a4a44', [640, 40, 700, 20, 940, 26, 1000, 60, 930, 76, 700, 72]);
        for (let i = 0; i < 9; i++) { const x = 560 + i * 62 + R(i) * 30, w = 50 + R(i + 2) * 60; c.fillStyle = i % 2 ? '#4b524c' : '#3b423d'; c.beginPath(); c.ellipse(x, HZ + 4, w, 20 + R(i) * 22, 0, 3.14, 6.29); c.fill(); }
        // rock shelf
        rect(c, lg(c, 0, HZ, 0, 720, 0, '#6d6b60', 1, '#3f3e38'), 0, HZ, WW, 720 - HZ);
        for (let i = 0; i < 70; i++) { const x = R(i) * WW, y = HZ + 10 + R(i + 7) * 170, w = 30 + R(i + 1) * 110; c.fillStyle = R(i + 4) > .7 ? 'rgba(74,104,62,.5)' : 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(x, y, w, 4 + R(i) * 7, 0, 0, 7); c.fill(); }
        rect(c, lg(c, 0, HZ, 0, HZ + 40, 0, 'rgba(220,240,245,.55)', 1, 'rgba(220,240,245,0)'), 0, HZ, WW, 40);
      },
      an(c, t) {
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.lineCap = 'round';
        for (let i = 0; i < 46; i++) { const x = 696 + R(i) * 238, len = 30 + R(i + 5) * 80, y = 60 + ((R(i + 11) * 480 + t * (.5 + R(i) * .35)) % 470); c.globalAlpha = .25 + R(i + 2) * .5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(HZ, y + len)); c.stroke(); }
        c.globalAlpha = 1;
        for (let i = 0; i < 14; i++) { const x = 620 + i * 30 + Math.sin(t * .0007 + i * 2) * 40, r = 50 + R(i) * 50 + Math.sin(t * .001 + i) * 10; glow(c, x, HZ - 6 + R(i) * 20, r, 'rgba(240,250,252,.3)'); }
      },
    },
    // ------------------------------------------------------------ 3. Winter beach
    {
      name: 'Kangeiko Shore', jp: '寒稽古', place: 'Tateyama coast, Japan', desc: 'Midwinter training at first light. Snow on the sand, the sun rising out of the sea.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, 430, 0, '#141a3a', .55, '#5a3f6e', .85, '#d9694a', 1, '#f6b05e'), 0, 0, WW, 430);
        for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${.2 + R(i) * .6})`; c.fillRect(R(i + 1) * WW, R(i + 2) * 240, 2, 2); }
        glow(c, 1020, 430, 420, 'rgba(255,170,90,.55)');
        c.fillStyle = '#f2452a'; c.beginPath(); c.arc(1020, 432, 116, 3.14, 6.29); c.fill();
        c.fillStyle = '#ff7b3c'; c.beginPath(); c.arc(1020, 432, 96, 3.14, 6.29); c.fill();
        poly(c, '#231c33', [0, 430, 0, 392, 120, 372, 250, 396, 360, 384, 470, 430]); poly(c, '#2b2138', [1330, 430, 1420, 398, 1520, 380, 1600, 392, 1600, 430]);
        rect(c, lg(c, 0, 430, 0, HZ + 6, 0, '#b0563f', .25, '#3f3a5e', 1, '#1b2340'), 0, 430, WW, HZ - 424);
        rect(c, lg(c, 0, HZ, 0, 720, 0, '#8b7a6a', .25, '#6c5d51', 1, '#3d342f'), 0, HZ, WW, 720 - HZ);
        for (let i = 0; i < 60; i++) { c.fillStyle = R(i) > .5 ? 'rgba(240,244,250,.5)' : 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(R(i + 3) * WW, HZ + 26 + R(i + 5) * 160, 20 + R(i) * 90, 3 + R(i + 1) * 6, 0, 0, 7); c.fill(); }
        // torii-less driftwood & footprints: keep it bare
        poly(c, '#1d1820', [170, HZ + 8, 330, HZ - 6, 352, HZ + 2, 190, HZ + 18]);
      },
      an(c, t) {
        for (let i = 0; i < 16; i++) {                                                          // swell
          const y = 438 + i * 6.2, a = .08 + i * .012; c.strokeStyle = `rgba(255,220,190,${a})`; c.lineWidth = 1.5; c.beginPath();
          for (let x = 0; x <= WW; x += 40) c.lineTo(x, y + Math.sin(x * .012 + t * .0012 + i * 1.3) * (1.5 + i * .25));
          c.stroke();
        }
        for (let i = 0; i < 20; i++) { const y = 436 + i * 5, w = 30 + i * 9 + Math.sin(t * .003 + i) * 14; c.fillStyle = `rgba(255,150,80,${.34 - i * .012})`; c.fillRect(1020 - w / 2, y, w, 3); }
        const f = Math.sin(t * .0009) * 10;                                                    // foam line
        c.fillStyle = 'rgba(245,248,252,.75)'; c.beginPath(); c.moveTo(0, HZ + 2);
        for (let x = 0; x <= WW; x += 40) c.lineTo(x, HZ + 8 + f + Math.sin(x * .02 + t * .001) * 4);
        c.lineTo(WW, HZ - 2); c.lineTo(0, HZ - 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.8)';
        for (let i = 0; i < 110; i++) { const s = 1.5 + R(i) * 2.5, x = (R(i + 1) * WW + t * (.02 + R(i) * .03) + Math.sin(t * .001 + i) * 20) % WW, y = (R(i + 2) * 720 + t * (.05 + R(i + 3) * .06)) % 720; c.fillRect(x, y, s, s); }
      },
    },
    // ------------------------------------------------------------ 4. Arena
    {
      name: 'World Open Arena', jp: '全世界大会', place: 'Tokyo Metropolitan Gym', crowd: true, desc: 'Ten thousand in the stands, four judges at the corners, nowhere to hide on the mat.',
      st(c) {
        rect(c, '#080a13', 0, 0, WW, HZ);
        for (let r = 0; r < 13; r++) {                                                          // stands
          const y = 150 + r * 27; rect(c, r % 2 ? '#101425' : '#0d1020', 0, y, WW, 27);
          for (let i = 0; i < 132; i++) { const x = i * 12.2 + (r % 2) * 6 + R(r * 200 + i) * 4, h = R(r * 97 + i * 3); c.fillStyle = `hsl(${Math.floor(h * 360)},${18 + R(i + r) * 30}%,${22 + R(i * 7 + r) * 30}%)`; c.beginPath(); c.arc(x, y + 12, 4.6, 0, 7); c.fill(); c.fillRect(x - 5, y + 15, 10, 12); }
        }
        rect(c, lg(c, 0, 0, 0, 150, 0, '#03040a', 1, '#0a0d1a'), 0, 0, WW, 150);
        rect(c, '#101a4a', 380, 44, 840, 78); rect(c, '#c8261c', 380, 44, 840, 6); rect(c, '#c8261c', 380, 116, 840, 6);
        c.fillStyle = '#f4f1e8'; c.font = '900 44px "Hiragino Mincho ProN","Yu Mincho",serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('全世界空手道選手権大会', VX, 84);
        for (const x of [150, 290, 1310, 1450]) { rect(c, '#f4f1e8', x - 34, 30, 68, 104); vkanji(c, '極真', x, 62, 36, x < 800 ? '#14100c' : '#c8261c', 1.2); }
        rect(c, '#0b0d18', 0, 480, WW, HZ - 480); rect(c, '#c8261c', 0, 478, WW, 4);              // barrier
        for (let i = 0; i < 9; i++) { rect(c, '#151a30', 40 + i * 180, 488, 140, 36); c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 15px Arial'; c.fillText(['KNOCKDOWN', 'OSU!', '空手', 'ICHIGEKI', 'KARATE'][i % 5], 110 + i * 180, 507); }
        rect(c, lg(c, 0, HZ, 0, 720, 0, '#d9dccd', 1, '#a9ae9c'), 0, HZ, WW, 720 - HZ);            // tatami
        c.strokeStyle = 'rgba(0,0,0,.1)'; c.lineWidth = 1;
        for (let xb = -1400; xb <= 3000; xb += 150) { c.beginPath(); c.moveTo(VX + (xb - VX) * .6, HZ); c.lineTo(xb, 720); c.stroke(); }
        for (let i = 1; i < 6; i++) { const y = HZ + 188 * Math.pow(i / 6, 1.7); c.beginPath(); c.moveTo(0, y); c.lineTo(WW, y); c.stroke(); }
        poly(c, '#c8261c', [300, HZ + 16, 1300, HZ + 16, 1560, 708, 40, 708]);
        poly(c, '#d5d8c8', [318, HZ + 26, 1282, HZ + 26, 1524, 696, 76, 696]);
        rect(c, '#f4f1e8', 696, G + 44, 8, 34); rect(c, '#c8261c', 896, G + 44, 8, 34);
        rect(c, lg(c, 0, HZ, 0, HZ + 80, 0, 'rgba(255,255,255,.35)', 1, 'rgba(255,255,255,0)'), 0, HZ, WW, 80);
      },
      an(c, t) {
        for (let i = 0; i < 5; i++) {                                                          // spotlights
          const x0 = 200 + i * 300, x1 = 640 + (i - 2) * 160 + Math.sin(t * .0004 + i * 2) * 120;
          c.fillStyle = lg(c, 0, 0, 0, HZ + 80, 0, 'rgba(210,225,255,.2)', 1, 'rgba(210,225,255,0)');
          c.beginPath(); c.moveTo(x0 - 12, 0); c.lineTo(x0 + 12, 0); c.lineTo(x1 + 190, HZ + 80); c.lineTo(x1 - 190, HZ + 80); c.fill();
        }
        const k = Math.floor(t / 90);
        for (let i = 0; i < 5; i++) { const x = R(k * 3 + i) * WW, y = 160 + R(k * 5 + i) * 330; if (R(k + i * 13) > .55) glow(c, x, y, 16, 'rgba(255,255,255,.95)'); }
      },
    },
    // ------------------------------------------------------------ 5. Brazil
    {
      name: 'Academia do Sol', jp: 'ブラジル支部', place: 'São Paulo, Brazil', desc: 'Open shutters, sea air, swinging heavy bags and a room full of sharpened shins.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, HZ, 0, '#f0c257', 1, '#e0a63c'), 0, 0, WW, HZ);
        rect(c, '#1f7f78', 0, 400, WW, HZ - 400); rect(c, '#145d58', 0, 394, WW, 8);
        for (const x of [330, 800, 1270]) {                                                    // arched openings
          c.save(); c.beginPath(); c.moveTo(x - 150, 440); c.lineTo(x - 150, 200); c.arc(x, 200, 150, 3.14, 6.29); c.lineTo(x + 150, 440); c.closePath(); c.clip();
          rect(c, lg(c, 0, 40, 0, 440, 0, '#3fa6e8', 1, '#c9ecf7'), x - 150, 40, 300, 400);
          glow(c, x + 60, 120, 110, 'rgba(255,250,210,.9)');
          poly(c, '#4d8f5a', [x - 150, 440, x - 150, 330, x - 60, 290, x + 30, 330, x + 150, 300, x + 150, 440]);
          for (let i = 0; i < 26; i++) rect(c, ['#e86a4a', '#f2d06b', '#6ab7e0', '#f4f1e8', '#e58fb0'][i % 5], x - 150 + R(x + i) * 280, 340 + R(x + i * 3) * 80, 18, 14);
          rect(c, lg(c, 0, 400, 0, 440, 0, '#2a8fc0', 1, '#1b6f9c'), x - 150, 408, 300, 32);
          for (const px of [x - 96, x + 104]) {                                                // palms
            c.strokeStyle = '#3b2a1a'; c.lineWidth = 9; c.beginPath(); c.moveTo(px, 440); c.quadraticCurveTo(px + 16, 300, px - 6, 190); c.stroke();
            c.strokeStyle = '#1e5a2e'; c.lineWidth = 7; c.lineCap = 'round';
            for (let i = 0; i < 7; i++) { const a = -2.9 + i * .45; c.beginPath(); c.moveTo(px - 6, 190); c.quadraticCurveTo(px - 6 + Math.cos(a) * 40, 190 + Math.sin(a) * 50, px - 6 + Math.cos(a) * 82, 190 + Math.sin(a) * 34 + 26); c.stroke(); }
          }
          c.restore();
          c.strokeStyle = '#b77b20'; c.lineWidth = 12; c.beginPath(); c.moveTo(x - 150, 440); c.lineTo(x - 150, 200); c.arc(x, 200, 150, 3.14, 6.29); c.lineTo(x + 150, 440); c.stroke();
          rect(c, '#b77b20', x - 166, 436, 332, 12);
        }
        for (let i = 0; i < 40; i++) poly(c, ['#1f9d4d', '#f4d21f', '#1c4fa8'][i % 3], [i * 41, 12, i * 41 + 36, 12, i * 41 + 18, 44]);
        rect(c, '#3a2a18', 0, 8, WW, 6);
        for (const [x, tx] of [[565, '空手'], [1035, '極真']]) { rect(c, '#f4f1e8', x - 34, 150, 68, 130); rect(c, '#c8261c', x - 34, 150, 68, 8); vkanji(c, tx, x, 196, 34, '#14100c', 1.3); }
        // puzzle mats
        rect(c, '#1c4fa8', 0, HZ, WW, 720 - HZ);
        for (let r = 0; r < 7; r++) { const y0 = HZ + 188 * Math.pow(r / 7, 1.7), y1 = HZ + 188 * Math.pow((r + 1) / 7, 1.7); for (let i = -14; i < 30; i++) { if ((i + r) % 2) continue; const a = i * 130, b = a + 130, f = y => .6 + .4 * (y - HZ) / 188; poly(c, '#c8322a', [VX + (a - VX) * f(y0), y0, VX + (b - VX) * f(y0), y0, VX + (b - VX) * f(y1), y1, VX + (a - VX) * f(y1), y1]); } }
        rect(c, lg(c, 0, HZ, 0, 720, 0, 'rgba(255,230,150,.3)', 1, 'rgba(0,0,0,.25)'), 0, HZ, WW, 720 - HZ);
      },
      an(c, t) {
        for (const [x, ph] of [[150, 0], [1460, 2]]) {                                          // heavy bags
          const a = Math.sin(t * .0016 + ph) * .09;
          c.save(); c.translate(x, 0); c.rotate(a);
          c.strokeStyle = '#2a2a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 200); c.stroke();
          c.fillStyle = '#16120f'; c.beginPath(); c.roundRect(-36, 200, 72, 250, 16); c.fill();
          c.fillStyle = '#7a1c14'; c.beginPath(); c.roundRect(-32, 204, 64, 242, 14); c.fill();
          c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-24, 214, 12, 222); c.fillStyle = '#d9d2c0'; c.fillRect(-32, 300, 64, 14);
          c.restore();
        }
        c.save(); c.translate(VX, 16); c.fillStyle = '#3a2a18'; c.fillRect(-4, 0, 8, 26); c.translate(0, 30);    // ceiling fan
        const w = Math.cos(t * .012); c.fillStyle = '#4b3722'; c.fillRect(-120 * w, -4, 240 * w, 8); c.fillRect(-120 * Math.sin(t * .012), -3, 240 * Math.sin(t * .012), 6); c.restore();
      },
    },
    // ------------------------------------------------------------ 6. Siberia
    {
      name: 'Zavod No. 7', jp: 'シベリア支部', place: 'Novosibirsk, Russia', desc: 'A converted factory hall. Frost on the glass, steam on your breath, iron on the floor.',
      st(c) {
        rect(c, '#3a2622', 0, 0, WW, HZ);
        for (let r = 0; r < 34; r++) for (let i = 0; i < 36; i++) { const s = R(r * 40 + i); c.fillStyle = `rgb(${88 + s * 40},${48 + s * 20},${42 + s * 16})`; c.fillRect(i * 46 - (r % 2) * 23 + 1, r * 16 + 1, 44, 14); }
        rect(c, 'rgba(10,14,24,.38)', 0, 0, WW, HZ);
        for (const x of [330, 800, 1270]) {                                                    // factory windows
          rect(c, '#15171c', x - 130, 70, 260, 290); rect(c, lg(c, 0, 80, 0, 350, 0, '#a9c4dc', 1, '#dfeaf2'), x - 120, 80, 240, 270);
          for (let i = 0; i < 30; i++) glow(c, x - 110 + R(x + i) * 220, 90 + R(x + i * 7) * 250, 30 + R(i) * 30, 'rgba(255,255,255,.3)');
          c.strokeStyle = '#15171c'; c.lineWidth = 5; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x - 120 + i * 60, 80); c.lineTo(x - 120 + i * 60, 350); c.stroke(); }
          for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x - 120, 80 + i * 68); c.lineTo(x + 120, 80 + i * 68); c.stroke(); }
          c.fillStyle = '#f2f6fa'; c.beginPath(); c.ellipse(x, 352, 126, 14, 0, 3.14, 6.29); c.fill(); rect(c, '#1c1e24', x - 140, 352, 280, 12);
        }
        rect(c, '#2b2f38', 0, 396, WW, 12); rect(c, '#232730', 0, 420, WW, 8);                  // pipes
        for (const x of [560, 1040]) { rect(c, '#2b2f38', x - 6, 0, 12, 400); rect(c, '#3a3f4a', x - 46, 430, 92, 80); for (let i = 0; i < 8; i++) rect(c, '#22252c', x - 42 + i * 11, 434, 4, 72); }
        // wall bars
        rect(c, '#6b4a28', 1430, 150, 10, 382); rect(c, '#6b4a28', 1560, 150, 10, 382);
        for (let i = 0; i < 16; i++) rect(c, '#8a6238', 1430, 160 + i * 23, 140, 7);
        // tyres and iron
        for (let i = 0; i < 3; i++) { c.fillStyle = '#121316'; c.beginPath(); c.ellipse(120, HZ - 16 - i * 34, 74, 20, 0, 0, 7); c.fill(); c.fillStyle = '#26282d'; c.beginPath(); c.ellipse(120, HZ - 22 - i * 34, 44, 9, 0, 0, 7); c.fill(); }
        for (const x of [236, 286, 1350]) { c.fillStyle = '#101114'; c.beginPath(); c.arc(x, HZ - 20, 21, 0, 7); c.fill(); c.strokeStyle = '#101114'; c.lineWidth = 7; c.beginPath(); c.arc(x, HZ - 44, 12, 3.3, 6.1); c.stroke(); }
        rect(c, '#e3ded0', 1088, 150, 96, 130); rect(c, '#b3261c', 1088, 150, 96, 20); vkanji(c, '極真', 1136, 206, 38, '#14100c', 1.25);
        floor(c, lg(c, 0, HZ, 0, 720, 0, '#3f5a4c', 1, '#22332b'), 'rgba(0,0,0,.35)', 200, 5);
        for (let i = 0; i < 46; i++) { c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(R(i) * WW, HZ + 20 + R(i + 9) * 160, 30 + R(i + 2) * 80, 3 + R(i) * 6, 0, 0, 7); c.fill(); }
      },
      an(c, t) {
        c.fillStyle = 'rgba(255,255,255,.85)';
        for (const x of [330, 800, 1270]) for (let i = 0; i < 26; i++) { const sx = x - 116 + ((R(x + i) * 232 + t * .012) % 232), sy = 84 + ((R(x + i * 3) * 262 + t * (.04 + R(i) * .04)) % 262); c.fillRect(sx, sy, 2.5, 2.5); }
        for (const [x, ph] of [[560, 0], [1040, 1.7]]) {                                        // swinging bulbs
          const a = Math.sin(t * .0013 + ph) * .12, bx = x + Math.sin(a) * 170, by = Math.cos(a) * 170;
          c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(bx, by); c.stroke();
          glow(c, bx, by + 6, 240, 'rgba(255,214,140,.2)'); glow(c, bx, by + 6, 30, 'rgba(255,240,200,.95)');
          poly(c, '#16171b', [bx - 22, by + 2, bx + 22, by + 2, bx + 8, by - 16, bx - 8, by - 16]);
        }
      },
    },
    // ------------------------------------------------------------ 7. Temple
    {
      name: 'Tsukiyo Shrine', jp: '月夜の社', place: 'Chichibu, Japan', desc: 'Stone courtyard under a full moon. Lanterns, falling blossom, and silence between blows.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, HZ, 0, '#070b1e', .7, '#1b2550', 1, '#34406e'), 0, 0, WW, HZ);
        for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(255,255,255,${.2 + R(i) * .7})`; const s = 1 + R(i + 5) * 2; c.fillRect(R(i + 1) * WW, R(i + 2) * 380, s, s); }
        glow(c, 1250, 130, 300, 'rgba(190,210,255,.35)');
        c.fillStyle = '#f2f0dc'; c.beginPath(); c.arc(1250, 130, 70, 0, 7); c.fill();
        c.fillStyle = 'rgba(160,165,150,.35)'; for (const [x, y, r] of [[1230, 110, 14], [1272, 150, 20], [1262, 104, 8]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
        ridge(c, '#0c1230', 420, 120, 3, 40);
        // shrine hall
        poly(c, '#0a0d1c', [300, 270, 420, 190, 760, 190, 880, 270, 840, 276, 590, 250, 340, 276]);
        poly(c, '#0a0d1c', [260, 372, 380, 300, 800, 300, 920, 372, 870, 380, 590, 352, 310, 380]);
        rect(c, '#0d1022', 400, 270, 380, 34); rect(c, '#0d1022', 360, 376, 460, HZ - 376);
        for (let i = 0; i < 5; i++) rect(c, '#151a36', 384 + i * 100, 384, 16, HZ - 384);
        rect(c, lg(c, 0, 400, 0, HZ, 0, '#e8a54a', 1, '#9a5a22'), 540, 410, 100, HZ - 410);
        c.strokeStyle = '#2a1708'; c.lineWidth = 3; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(540 + i * 25, 410); c.lineTo(540 + i * 25, HZ); c.stroke(); } for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(540, 410 + i * 30); c.lineTo(640, 410 + i * 30); c.stroke(); }
        // torii
        const tx = 1220; rect(c, '#b3261c', tx - 120, 250, 22, HZ - 250); rect(c, '#b3261c', tx + 98, 250, 22, HZ - 250);
        rect(c, '#b3261c', tx - 150, 290, 300, 16); poly(c, '#8f1c14', [tx - 190, 222, tx + 190, 222, tx + 172, 252, tx - 172, 252]); poly(c, '#14100c', [tx - 196, 212, tx + 196, 212, tx + 190, 224, tx - 190, 224]);
        rect(c, '#14100c', tx - 14, 252, 28, 40);
        // stone lanterns
        for (const x of [170, 1470]) { rect(c, '#4c5263', x - 12, 420, 24, HZ - 420); rect(c, '#5a6073', x - 34, 400, 68, 22); rect(c, '#3d4252', x - 26, 352, 52, 50); poly(c, '#5a6073', [x - 50, 356, x, 318, x + 50, 356]); rect(c, '#f6c56a', x - 14, 362, 28, 30); rect(c, '#4c5263', x - 30, HZ - 14, 60, 14); }
        // blossom boughs
        for (const [bx, d] of [[0, 1], [WW, -1]]) {
          c.strokeStyle = '#120d12'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, 30); c.quadraticCurveTo(bx + d * 200, 60, bx + d * 400, 150); c.stroke();
          c.lineWidth = 6; c.beginPath(); c.moveTo(bx + d * 200, 66); c.quadraticCurveTo(bx + d * 280, 30, bx + d * 370, 30); c.stroke();
          for (let i = 0; i < 90; i++) { const x = bx + d * R(i + bx) * 440, y = R(i * 3 + bx) * 190; c.fillStyle = ['rgba(246,182,205,.85)', 'rgba(250,214,226,.8)', 'rgba(226,140,172,.8)'][i % 3]; c.beginPath(); c.arc(x, y + (x - bx) * d * .22 - 20, 8 + R(i) * 12, 0, 7); c.fill(); }
        }
        floor(c, lg(c, 0, HZ, 0, 720, 0, '#59607a', 1, '#2b3044'), 'rgba(0,0,0,.35)', 130, 6);
        rect(c, lg(c, 0, HZ, 0, HZ + 60, 0, 'rgba(180,200,255,.22)', 1, 'rgba(180,200,255,0)'), 0, HZ, WW, 60);
      },
      an(c, t) {
        for (const x of [170, 1470]) glow(c, x, 378, 170 + Math.sin(t * .011 + x) * 12 + Math.sin(t * .027) * 6, 'rgba(255,190,90,.3)');
        glow(c, 590, 470, 190 + Math.sin(t * .006) * 8, 'rgba(255,180,90,.16)');
        for (let i = 0; i < 46; i++) {
          const x = (R(i) * WW + t * (.02 + R(i + 1) * .02) + Math.sin(t * .0012 + i) * 40) % WW, y = (R(i + 2) * 720 + t * (.03 + R(i + 3) * .03)) % 720;
          c.save(); c.translate(x, y); c.rotate(t * .002 * (R(i) - .5) * 4 + i); c.fillStyle = i % 2 ? 'rgba(250,200,220,.9)' : 'rgba(240,160,190,.85)'; c.beginPath(); c.ellipse(0, 0, 5, 2.6, 0, 0, 7); c.fill(); c.restore();
        }
      },
    },
    // ------------------------------------------------------------ 8. Rooftop
    {
      name: 'Shinjuku Rooftop', jp: '新宿屋上', place: 'Tokyo, Japan', desc: 'After hours, twelve floors up, rain on the concrete and neon in the puddles.',
      st(c) {
        rect(c, lg(c, 0, 0, 0, HZ, 0, '#0a0718', .6, '#2a1444', 1, '#5a2452'), 0, 0, WW, HZ);
        for (let l = 0; l < 2; l++) for (let i = 0; i < 22; i++) {                               // skyline
          const w = 50 + R(i + l * 50) * 70, x = i * 76 - 20 + R(i * 3 + l) * 20, h = (l ? 150 : 250) + R(i * 7 + l * 9) * (l ? 190 : 170), y = HZ - h;
          rect(c, l ? '#110d22' : '#1b1433', x, y, w, h);
          for (let wy = y + 10; wy < HZ - 30; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 12) { const s = R(wx * 3.1 + wy * 1.7 + l); if (s > .62) rect(c, s > .9 ? 'rgba(120,220,255,.75)' : s > .76 ? 'rgba(255,214,130,.7)' : 'rgba(255,190,110,.3)', wx, wy, 6, 9); }
        }
        const sign = (x, y, w, h, col, txt, size) => { rect(c, '#0c0916', x - 4, y - 4, w + 8, h + 8); c.strokeStyle = col; c.lineWidth = 3; c.strokeRect(x, y, w, h); vkanji(c, txt, x + w / 2, y + size * .78, size, col, 1.12); };
        sign(250, 120, 64, 250, '#ff4f9a', '極真空手', 46); sign(1130, 90, 70, 190, '#46e0ff', '道場', 62); sign(1400, 190, 54, 230, '#ffb347', 'ラーメン', 40); sign(600, 210, 50, 130, '#8dff7a', '押忍', 40);
        // rooftop furniture
        rect(c, '#191624', 60, 410, 190, 122); for (let i = 0; i < 7; i++) rect(c, '#0f0d17', 72 + i * 26, 424, 14, 80); rect(c, '#22202e', 50, 400, 210, 14);
        rect(c, '#1a1826', 1330, 330, 20, 202); rect(c, '#1a1826', 1470, 330, 20, 202); c.fillStyle = '#272437'; c.beginPath(); c.roundRect(1300, 230, 220, 130, 20); c.fill(); rect(c, '#15131f', 1300, 262, 220, 6); rect(c, '#15131f', 1300, 316, 220, 6);
        c.strokeStyle = '#2d2a3d'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 470); c.lineTo(WW, 470); c.moveTo(0, 500); c.lineTo(WW, 500); c.stroke();
        for (let x = 0; x < WW; x += 64) rect(c, '#2d2a3d', x, 466, 5, 66);
        rect(c, '#16141f', 0, HZ - 8, WW, 10);
        floor(c, lg(c, 0, HZ, 0, 720, 0, '#3a3648', 1, '#1b1924'), 'rgba(0,0,0,.3)', 240, 4);
        for (const [x, y, w, col] of [[300, 630, 190, 'rgba(255,79,154,.3)'], [820, 668, 260, 'rgba(70,224,255,.26)'], [1250, 612, 170, 'rgba(255,179,71,.26)'], [560, 570, 120, 'rgba(141,255,122,.18)'], [1040, 580, 130, 'rgba(70,224,255,.2)']]) { c.fillStyle = 'rgba(8,8,16,.55)'; c.beginPath(); c.ellipse(x, y, w, w * .11, 0, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.ellipse(x, y, w * .86, w * .08, 0, 0, 7); c.fill(); }
      },
      an(c, t) {
        const fl = (ph, sp) => .55 + .45 * Math.sin(t * sp + ph) * (R(Math.floor(t / 120) + ph) > .12 ? 1 : .1);
        glow(c, 282, 245, 210, `rgba(255,79,154,${.24 * fl(0, .004)})`); glow(c, 1165, 185, 220, `rgba(70,224,255,${.24 * fl(2, .003)})`);
        glow(c, 1427, 305, 190, `rgba(255,179,71,${.22 * fl(4, .005)})`); glow(c, 625, 275, 150, `rgba(141,255,122,${.16 * fl(7, .006)})`);
        c.strokeStyle = 'rgba(190,210,255,.36)'; c.lineWidth = 1.5; c.beginPath();
        for (let i = 0; i < 130; i++) { const x = (R(i) * (WW + 200) - t * .12 + 4000) % (WW + 200) - 100, y = (R(i + 9) * 760 + t * (.9 + R(i + 4) * .5)) % 760 - 20; c.moveTo(x, y); c.lineTo(x - 6, y + 26); }
        c.stroke();
        c.strokeStyle = 'rgba(200,220,255,.35)'; c.lineWidth = 1;
        for (let i = 0; i < 14; i++) { const p = ((t * .0012 + R(i)) % 1), x = R(i + 20) * WW, y = HZ + 20 + R(i + 40) * 160; c.globalAlpha = 1 - p; c.beginPath(); c.ellipse(x, y, p * 22, p * 5, 0, 0, 7); c.stroke(); }
        c.globalAlpha = 1;
        if (Math.floor(t / 600) % 2) glow(c, (t * .03) % WW, 60, 6, 'rgba(255,60,60,.9)');
      },
    },
  ];

  // Static layer cache (one dojo at a time keeps memory sane).
  let cacheId = -1, cache = null;
  KY.dojoBG = function (id) {
    if (cacheId === id && cache) return cache;
    cache = cache || document.createElement('canvas'); cache.width = WW; cache.height = 720;
    const c = cache.getContext('2d'); c.clearRect(0, 0, WW, 720);
    KY.DOJOS[id].st(c); cacheId = id; return cache;
  };
  KY.dojoThumb = function (id, w = 280, h = 158) {
    const big = document.createElement('canvas'); big.width = WW; big.height = 720;
    const c = big.getContext('2d'); KY.DOJOS[id].st(c); KY.DOJOS[id].an(c, 4000);
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    t.getContext('2d').drawImage(big, 160, 0, 1280, 720, 0, 0, w, h);
    return t;
  };
})();
