'use strict';
// Shared namespace, constants and game data.
const KY = window.KY = { W: 1280, H: 720, GROUND: 606, WORLD: 1600 };

KY.rand = (a, b) => a + Math.random() * (b - a);
KY.irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
KY.pick = a => a[Math.floor(Math.random() * a.length)];
KY.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
KY.shade = function (hex, amt) {
  const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const f = v => Math.round(v + (t - v) * p);
  return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`;
};

// ---------------------------------------------------------------- belts
// xp / bouts / tiles are the requirements to be promoted TO that rank.
KY.BELTS = [
  { name: 'Mukyu', label: 'White Belt', color: '#f2efe6', xp: 0, bouts: 0 },
  { name: '10th Kyu', label: 'Orange Belt', color: '#e67a17', xp: 80, bouts: 1 },
  { name: '9th Kyu', label: 'Orange Belt, blue stripe', color: '#e67a17', stripe: '#2456b8', xp: 200, bouts: 1 },
  { name: '8th Kyu', label: 'Blue Belt', color: '#2456b8', xp: 360, bouts: 2 },
  { name: '7th Kyu', label: 'Blue Belt, yellow stripe', color: '#2456b8', stripe: '#e8c21a', xp: 560, bouts: 2 },
  { name: '6th Kyu', label: 'Yellow Belt', color: '#e8c21a', xp: 800, bouts: 3 },
  { name: '5th Kyu', label: 'Yellow Belt, green stripe', color: '#e8c21a', stripe: '#2c8a3c', xp: 1100, bouts: 3 },
  { name: '4th Kyu', label: 'Green Belt', color: '#2c8a3c', xp: 1450, bouts: 4, tiles: 3 },
  { name: '3rd Kyu', label: 'Green Belt, brown stripe', color: '#2c8a3c', stripe: '#6b3f1d', xp: 1850, bouts: 4, tiles: 4 },
  { name: '2nd Kyu', label: 'Brown Belt', color: '#6b3f1d', xp: 2300, bouts: 5, tiles: 5 },
  { name: '1st Kyu', label: 'Brown Belt, black stripe', color: '#6b3f1d', stripe: '#15140f', xp: 2800, bouts: 5, tiles: 6 },
  { name: 'Shodan', label: 'Black Belt, 1st Dan', color: '#15140f', bars: 1, xp: 3500, bouts: 10, tiles: 8 },
  { name: 'Nidan', label: 'Black Belt, 2nd Dan', color: '#15140f', bars: 2, xp: 5000, bouts: 20, tiles: 10 },
  { name: 'Sandan', label: 'Black Belt, 3rd Dan', color: '#15140f', bars: 3, xp: 7500, bouts: 30, tiles: 12 },
];

// ---------------------------------------------------------------- stats
KY.STATS = {
  pow: { n: 'Tsuki', t: 'Punch power', tr: 'Makiwara', d: 'Strike the straw-bound post until the knuckles harden. Also raises tameshiwari breaking power.' },
  kick: { n: 'Geri', t: 'Kick power', tr: 'Sandbag', d: 'Thousands of roundhouse kicks into the heavy bag.' },
  spd: { n: 'Hayasa', t: 'Speed', tr: 'Ido Geiko', d: 'Moving basics up and down the dojo floor. Faster techniques and footwork.' },
  sta: { n: 'Tairyoku', t: 'Stamina', tr: 'Roadwork', d: 'Dawn runs, squats and push-ups on the fists.' },
  tgh: { n: 'Tanren', t: 'Toughness', tr: 'Body Conditioning', d: 'Sanchin breathing while partners strike your body and legs.' },
};
KY.STAT_MAX = 20;
KY.statCost = v => 1 + Math.floor(v / 5);

// ---------------------------------------------------------------- looks
KY.SKINS = ['#f7dcc0', '#edc7a0', '#dcaa7c', '#bd8556', '#8f5c38', '#613c24'];
KY.HAIRS = ['#15120f', '#3a2616', '#6b4423', '#b98a3e', '#8c2f1b', '#8a8a8a', '#e8e4da'];
KY.HAIRSTYLES = ['Buzz cut', 'Short', 'Spiky', 'Topknot', 'Ponytail', 'Bald', 'Long'];
KY.BEARDS = ['Clean', 'Stubble', 'Beard'];
KY.BANDS = [{ n: 'None' }, { n: 'White', c: '#f4f1e8' }, { n: 'Red', c: '#c8261c' }, { n: 'Black', c: '#191715' }];
KY.GIS = [{ n: 'Classic white', c: '#f5f2e9' }, { n: 'Weathered', c: '#e4dcc6' }, { n: 'Sleeveless', c: '#f5f2e9', sl: 1 }];
KY.BUILDS = {
  light: { n: 'Lightweight', w: .9, h: .95, kg: 68, b: { spd: 2, sta: 1, tgh: -1 } },
  middle: { n: 'Middleweight', w: 1, h: 1, kg: 80, b: {} },
  heavy: { n: 'Heavyweight', w: 1.16, h: 1.05, kg: 98, b: { pow: 2, tgh: 1, spd: -2 } },
};

// ---------------------------------------------------------------- techniques
// Angles in degrees: 0 = limb hanging down, 90 = forward, 180 = up.
// f* = lead side, b* = rear side; s/e = shoulder/elbow, h/k = hip/knee, t = torso lean.
KY.MOVES = {
  seiken: { n: 'Seiken Chudan Tsuki', en: 'Straight punch to the body', k: '正拳中段突き', inp: 'J', type: 'tsuki', zone: 'body', dmg: 5, cost: 3, st: 120, ac: 60, rc: 150, rng: 97, push: 5, adv: 4,
    ch: { t: 8, fs: 4, fe: 112 }, hit: { t: 14, fs: 80, fe: 2, bs: -22, be: 96, fh: 36, fk: 40, x: 8 } },
  gyaku: { n: 'Gyaku Tsuki', en: 'Reverse punch to the body', k: '逆突き', inp: 'J, J', type: 'tsuki', zone: 'body', dmg: 7, cost: 4, st: 140, ac: 60, rc: 180, rng: 101, push: 7, adv: 6,
    ch: { t: 4, bs: -28, be: 100 }, hit: { t: 20, bs: 82, be: 2, fs: -16, fe: 100, fh: 38, fk: 42, bh: -20, bk: 14, x: 12 } },
  shita: { n: 'Shita Tsuki', en: 'Body uppercut, drains stamina', k: '下突き', inp: '↓ + J', type: 'tsuki', zone: 'body', dmg: 9, cost: 5, st: 170, ac: 70, rc: 210, rng: 93, push: 4, stam: 1.7,
    ch: { t: 28, bs: -22, be: 80, fh: 40, fk: 62, bh: -10, bk: 46 }, hit: { t: 6, bs: 36, be: 86, fs: 20, fe: 120, fh: 30, fk: 30, x: 10 } },
  kagi: { n: 'Kagi Tsuki', en: 'Hook to the ribs, liver shot', k: '鉤突き', inp: '↑ + J', type: 'tsuki', zone: 'body', dmg: 8, cost: 5, st: 160, ac: 70, rc: 200, rng: 95, push: 5, liver: 1.7,
    ch: { t: 2, fs: -26, fe: 96 }, hit: { t: 16, fs: 72, fe: 62, bs: 0, be: 126, x: 10 } },
  ganmen: { n: 'Ganmen Tsuki', en: 'Punch to the face. ILLEGAL', k: '顔面突き', inp: 'H', type: 'tsuki', zone: 'head', dmg: 8, cost: 3, st: 110, ac: 60, rc: 170, rng: 96, push: 6, foul: true,
    ch: { fs: 10, fe: 120 }, hit: { t: 12, fs: 108, fe: 0, bs: -15, be: 100, x: 8 } },
  chudan: { n: 'Chudan Mawashi Geri', en: 'Roundhouse kick to the body', k: '中段回し蹴り', inp: 'K', type: 'geri', zone: 'body', dmg: 12, cost: 8, st: 250, ac: 80, rc: 280, rng: 126, push: 14, liver: 1.2,
    ch: { t: -6, bh: 65, bk: 115, fh: 6, fk: 8, bs: 20, be: 100 }, hit: { t: -20, bh: 94, bk: 4, fh: 2, fk: 4, bs: -35, be: 30, fs: 45, fe: 100, x: 12 } },
  gedan: { n: 'Gedan Mawashi Geri', en: 'Low kick to the thigh', k: '下段回し蹴り', inp: '↓ + K', type: 'geri', zone: 'legs', dmg: 10, cost: 6, st: 210, ac: 80, rc: 240, rng: 120, push: 4,
    ch: { t: -2, bh: 35, bk: 85, fh: 8, fk: 10 }, hit: { t: -8, bh: 58, bk: 8, fh: 6, fk: 10, bs: -30, be: 40, x: 10 } },
  jodan: { n: 'Jodan Mawashi Geri', en: 'Roundhouse kick to the head', k: '上段回し蹴り', inp: '↑ + K', type: 'geri', zone: 'head', dmg: 20, cost: 11, st: 330, ac: 80, rc: 360, rng: 114, push: 10,
    ch: { t: -10, bh: 80, bk: 125, fh: 2, fk: 4 }, hit: { t: -36, bh: 138, bk: 4, fh: -4, fk: 2, bs: -40, be: 30, fs: 40, fe: 95, x: 24 } },
  mae: { n: 'Mae Geri', en: 'Front kick, shoves them back', k: '前蹴り', inp: 'Back + K', type: 'geri', zone: 'body', dmg: 10, cost: 7, st: 230, ac: 80, rc: 260, rng: 132, push: 40,
    ch: { t: -4, bh: 88, bk: 115, fh: 4, fk: 6 }, hit: { t: -14, bh: 90, bk: 0, fh: 0, fk: 4, x: 14 } },
  hiza: { n: 'Hiza Geri', en: 'Knee strike, close range', k: '膝蹴り', inp: 'L', type: 'geri', zone: 'body', dmg: 13, cost: 7, st: 190, ac: 70, rc: 240, rng: 93, push: 8, liver: 1.3,
    ch: { t: 4, bh: 35, bk: 95 }, hit: { t: -10, bh: 98, bk: 125, fh: -8, fk: 2, fs: 62, fe: 60, bs: 55, be: 70, x: 22 } },
  kakato: { n: 'Kakato Otoshi', en: 'Axe kick, crashes through a guard', k: '踵落とし', inp: '↑ + L', type: 'geri', zone: 'head', dmg: 21, cost: 12, st: 420, ac: 90, rc: 380, rng: 110, push: 6, pierce: .5, chAt: .7,
    ch: { t: -16, bh: 158, bk: 0, fh: 0, fk: 2, x: 6 }, hit: { t: 0, bh: 112, bk: 0, fh: 2, fk: 6, x: 20 } },
  barai: { n: 'Ashi Barai', en: 'Foot sweep, breaks their balance', k: '足払い', inp: '↓ + L', type: 'geri', zone: 'legs', dmg: 5, cost: 5, st: 190, ac: 70, rc: 240, rng: 108, push: 2, trip: true,
    ch: { fh: 10, fk: 34, t: 4 }, hit: { fh: 52, fk: 2, bh: -8, bk: 62, t: 4, x: 8 } },
  ushiro: { n: 'Ushiro Geri', en: 'Spinning back kick', k: '後ろ蹴り', inp: 'Back + L', type: 'geri', zone: 'body', dmg: 22, cost: 13, st: 400, ac: 80, rc: 400, rng: 130, push: 46, liver: 1.3,
    ch: { sp: .5, t: 25, bh: 25, bk: 95, fh: 5, fk: 15 }, hit: { sp: 1, t: 48, bh: -90, bk: 0, fh: 4, fk: 8, x: 14 } },
  ushiroMawashi: { n: 'Ushiro Mawashi Geri', en: 'Spinning heel kick to the head', k: '後ろ回し蹴り', inp: 'Fwd + L', type: 'geri', zone: 'head', dmg: 27, cost: 14, st: 450, ac: 80, rc: 420, rng: 118, push: 10, spinEnd: 2,
    ch: { sp: .5, t: 28, bh: 15, bk: 60, fh: 5, fk: 12 }, hit: { sp: 1, t: 55, bh: -140, bk: -8, fh: 0, fk: 4, x: 16 } },
  kaiten: { n: 'Do Mawashi Kaiten Geri', en: 'Rolling wheel kick. All or nothing', k: '胴回し回転蹴り', inp: 'I', type: 'geri', zone: 'head', dmg: 38, cost: 26, st: 520, ac: 110, rc: 870, rng: 150, minRng: 86, push: 16, adv: 46,
    keys: [
      [190, { t: 52, fh: 55, fk: 95, bh: 15, bk: 85, fs: 60, fe: 60 }],
      [520, { r: 118, lift: 52, t: 25, bh: -115, bk: 5, fh: -20, fk: 70, fs: 120, fe: 20, bs: 100, be: 30 }],
      [640, { r: 165, lift: 16, t: 20, bh: -100, bk: 10, fh: -10, fk: 60, fs: 120, fe: 20, bs: 100, be: 30 }],
      [900, { r: 270, t: 0, fh: 42, fk: 80, bh: 6, bk: 6, fs: 150, fe: 15, bs: 30, be: 10 }],
      [1160, { r: 270, t: 0, fh: 42, fk: 80, bh: 6, bk: 6, fs: 150, fe: 15, bs: 30, be: 10 }],
      [1500, { r: 360 }],
    ] },
};

// ---------------------------------------------------------------- fighting styles
// w = AI technique weights, range = preferred fighting distance.
KY.STYLES = {
  allround: { n: 'Kihon', t: 'All-rounder', d: 'Balanced fundamentals. No weakness, no shortcut.', bonus: { pow: 1, kick: 1 }, range: 100,
    w: { seiken: 4, gyaku: 4, shita: 2, kagi: 2, chudan: 3, gedan: 3, jodan: 1.5, mae: 2, hiza: 2, ushiro: 1, kakato: .6 } },
  puncher: { n: 'Tsuki', t: 'Body Puncher', d: 'Walks through fire to dig punches into the ribs.', bonus: { pow: 2 }, range: 88,
    w: { seiken: 5, gyaku: 5, shita: 4, kagi: 4, gedan: 2, hiza: 2, chudan: 1 } },
  lowkick: { n: 'Gedan', t: 'Leg Destroyer', d: 'Chops the legs out from under you, one low kick at a time.', bonus: { kick: 1, tgh: 1 }, range: 106,
    w: { gedan: 8, seiken: 3, gyaku: 3, barai: 2, chudan: 2, jodan: 1, mae: 1 } },
  headhunter: { n: 'Jodan', t: 'Head Hunter', d: 'Flexible, patient, always looking for the high kick.', bonus: { kick: 2 }, range: 104,
    w: { jodan: 5, kakato: 3, ushiroMawashi: 2, mae: 2.5, seiken: 2, gyaku: 2, chudan: 2.5, gedan: 1.5 } },
  pressure: { n: 'Oshi', t: 'Pressure Fighter', d: 'Never takes a backward step. Knees and volume.', bonus: { sta: 2 }, range: 84,
    w: { seiken: 4, gyaku: 4, shita: 3, hiza: 5, gedan: 3, kagi: 3 } },
  showman: { n: 'Kaiten', t: 'Spinning Technician', d: 'Back kicks, heel kicks and the rolling wheel kick.', bonus: { spd: 2 }, range: 110,
    w: { ushiro: 4, ushiroMawashi: 3, kaiten: 1.2, kakato: 2, mae: 3, chudan: 3, seiken: 2, gyaku: 2, gedan: 2 } },
  iron: { n: 'Tetsu', t: 'Iron Body', d: 'Conditioned like oak. Grinds you down and never breaks.', bonus: { tgh: 2 }, range: 92,
    w: { seiken: 3, gyaku: 4, shita: 3, gedan: 4, chudan: 2, hiza: 3, mae: 2 } },
  brawler: { n: 'Kenka', t: 'Rough Brawler', d: 'Strong, wild, and careless with the rules.', bonus: { pow: 1, tgh: 1 }, range: 88,
    w: { seiken: 4, gyaku: 4, kagi: 4, shita: 2, gedan: 3, hiza: 2, ganmen: .9 } },
};
KY.PLAYER_STYLES = ['allround', 'puncher', 'lowkick', 'headhunter', 'pressure', 'showman', 'iron'];

// ---------------------------------------------------------------- nations & names
KY.NATIONS = [
  { c: 'Japan', f: '🇯🇵', a: ['Kenji', 'Hiroshi', 'Takeshi', 'Daisuke', 'Ryo', 'Shinji', 'Yuto', 'Kazuki', 'Makoto', 'Tatsuya', 'Koji', 'Shun'], b: ['Yamamoto', 'Tanaka', 'Kobayashi', 'Nakamura', 'Fujita', 'Ishikawa', 'Mori', 'Okada', 'Hayashi', 'Shimizu', 'Kuroda', 'Sakamoto'] },
  { c: 'Brazil', f: '🇧🇷', a: ['Rafael', 'Thiago', 'Bruno', 'Caio', 'Leandro', 'Marcelo', 'Diego', 'Vitor'], b: ['Souza', 'Carvalho', 'Barbosa', 'Moreira', 'Teixeira', 'Nogueira', 'Pinheiro', 'Azevedo'] },
  { c: 'Russia', f: '🇷🇺', a: ['Dmitri', 'Alexei', 'Sergei', 'Nikolai', 'Pavel', 'Artem', 'Maxim', 'Ilya'], b: ['Volkov', 'Sokolov', 'Morozov', 'Orlov', 'Belov', 'Kozlov', 'Zaitsev', 'Baranov'] },
  { c: 'Netherlands', f: '🇳🇱', a: ['Daan', 'Sven', 'Ruben', 'Bram', 'Joris', 'Niels'], b: ['de Vries', 'Bakker', 'Visser', 'Smit', 'Mulder', 'van Dijk'] },
  { c: 'Poland', f: '🇵🇱', a: ['Marek', 'Tomasz', 'Piotr', 'Kamil', 'Lukasz', 'Jakub'], b: ['Kowalski', 'Nowak', 'Wojcik', 'Zielinski', 'Lewandowski', 'Kaminski'] },
  { c: 'United States', f: '🇺🇸', a: ['Mike', 'Tyler', 'Marcus', 'Derek', 'Cole', 'Andre', 'Jesse'], b: ['Hayes', 'Brooks', 'Coleman', 'Whitaker', 'Ramirez', 'Sullivan', 'Bennett'] },
  { c: 'Georgia', f: '🇬🇪', a: ['Giorgi', 'Levan', 'Irakli', 'Zurab', 'Nika'], b: ['Beridze', 'Kapanadze', 'Lomidze', 'Gelashvili', 'Tsiklauri'] },
  { c: 'Hungary', f: '🇭🇺', a: ['Zoltan', 'Gabor', 'Balazs', 'Attila', 'Tamas'], b: ['Nagy', 'Kovacs', 'Toth', 'Szabo', 'Horvath'] },
  { c: 'France', f: '🇫🇷', a: ['Julien', 'Mathieu', 'Antoine', 'Karim', 'Lucas'], b: ['Moreau', 'Lefevre', 'Girard', 'Benali', 'Fontaine'] },
  { c: 'Spain', f: '🇪🇸', a: ['Alejandro', 'Sergio', 'Pablo', 'Ivan', 'Raul'], b: ['Ortega', 'Navarro', 'Molina', 'Serrano', 'Castillo'] },
  { c: 'Kazakhstan', f: '🇰🇿', a: ['Daniyar', 'Yerlan', 'Timur', 'Arman', 'Nurlan'], b: ['Akhmetov', 'Suleimenov', 'Ospanov', 'Kaliyev', 'Zhumabayev'] },
  { c: 'South Africa', f: '🇿🇦', a: ['Sipho', 'Johan', 'Thabo', 'Pieter', 'Mandla'], b: ['Botha', 'Dlamini', 'Nkosi', 'van Wyk', 'Mokoena'] },
  { c: 'Australia', f: '🇦🇺', a: ['Lachlan', 'Mitch', 'Callum', 'Josh', 'Darcy'], b: ['Harding', 'Fraser', 'Walsh', 'Kerr', 'Doyle'] },
  { c: 'Iran', f: '🇮🇷', a: ['Arash', 'Reza', 'Omid', 'Kaveh', 'Milad'], b: ['Karimi', 'Rahimi', 'Hosseini', 'Moradi', 'Jafari'] },
  { c: 'United Kingdom', f: '🇬🇧', a: ['Liam', 'Callum', 'Owen', 'Declan', 'Reece'], b: ['Barker', 'Whitfield', 'Hughes', 'Marsh', 'Pearce'] },
  { c: 'Bulgaria', f: '🇧🇬', a: ['Stoyan', 'Dimitar', 'Ivaylo', 'Petar', 'Kiril'], b: ['Georgiev', 'Dimitrov', 'Todorov', 'Stoyanov', 'Angelov'] },
  { c: 'South Korea', f: '🇰🇷', a: ['Min-jun', 'Seung', 'Tae-yang', 'Hyun', 'Jae-won'], b: ['Kim', 'Park', 'Choi', 'Jung', 'Kang'] },
  { c: 'Lithuania', f: '🇱🇹', a: ['Mantas', 'Lukas', 'Tomas', 'Darius', 'Rokas'], b: ['Kazlauskas', 'Petrauskas', 'Jankauskas', 'Butkus', 'Urbonas'] },
];

KY.genOpponent = function (rank, o = {}) {
  const { clamp, rand, irand, pick } = KY;
  rank = clamp(Math.round(rank), 0, KY.BELTS.length - 1);
  const ni = irand(0, KY.NATIONS.length - 1), nat = KY.NATIONS[ni];
  const build = pick(['light', 'middle', 'middle', 'heavy']), B = KY.BUILDS[build];
  const style = o.style || pick(Object.keys(KY.STYLES)), S = KY.STYLES[style];
  const stats = {};
  for (const k in KY.STATS) stats[k] = clamp(Math.round(2 + rank * .95 + rand(-1.5, 1.5) + (S.bonus[k] || 0) + (B.b[k] || 0)), 1, KY.STAT_MAX);
  return {
    name: pick(nat.a) + ' ' + pick(nat.b), nation: ni, rank, style, build, stats,
    kg: Math.round(B.kg + rand(-5, 6)),
    ai: clamp(.1 + rank * .062 + rand(-.04, .05) + (o.aiBonus || 0), .05, .97),
    look: {
      skin: pick(KY.SKINS), hair: pick(KY.HAIRS.slice(0, rank > 8 ? 7 : 5)), hs: irand(0, 6), beard: pick([0, 0, 0, 1, 2]),
      band: pick([0, 0, 0, 0, 1, 2, 3]), gi: pick([0, 0, 0, 1, 1, 2]), build, h: B.h * rand(.96, 1.04), w: B.w,
    },
  };
};

KY.newProfile = function () {
  return {
    v: 1, name: 'Kenshi', nation: 0, style: 'allround', build: 'middle', kg: 80,
    look: { skin: KY.SKINS[1], hair: KY.HAIRS[0], hs: 1, beard: 0, band: 0, gi: 0, build: 'middle', h: 1, w: 1 },
    stats: { pow: 3, kick: 3, spd: 3, sta: 3, tgh: 3 },
    rank: 0, xp: 0, tp: 2, rec: { w: 0, l: 0, d: 0, ko: 0 },
    trophies: { taikai: 0, nin: {} }, bestTiles: 0, dojo: 0, opts: { voice: true, music: true },
  };
};
KY.applyBuild = function (p) {
  const B = KY.BUILDS[p.build], S = KY.STYLES[p.style];
  p.look.build = p.build; p.look.h = B.h; p.look.w = B.w; p.kg = B.kg;
  for (const k in KY.STATS) p.stats[k] = Math.max(1, 3 + (S.bonus[k] || 0) + (B.b[k] || 0));
};
