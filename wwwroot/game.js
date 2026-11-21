import * as THREE from 'three';
const $ = id => document.getElementById(id);
const W = 1, H = 1.33, DP = .5, LG = .52, SX = W / 2, SZ = H / 2; let C = 15, R = 8, LAY = 5;
const NF = 42;
let t;
const rng = s => () => (s = s + 0x6D2B79F5 | 0, t = Math.imul(s ^ s >>> 15, 1 | s), t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296);
// ---------- sound ----------
const AC = new (window.AudioContext || window.webkitAudioContext)(), buf = {};
['sel', 'match', 'bad', 'win', 'shuf', 'layer', 'boom'].forEach(n => fetch(`sounds/${n}.ogg`).then(r => r.ok ? r.arrayBuffer() : 0).then(b => b && AC.decodeAudioData(b)).then(d => d && (buf[n] = d)).catch(() => {}));
const master = AC.createGain(), mus = AC.createGain(), fxg = AC.createGain(), dly = AC.createDelay(), fb = AC.createGain(), snd = { on: true, mus: true, vib: true, ...JSON.parse(localStorage.getItem('mjs2') || '{}') };
master.gain.value = .9; mus.gain.value = snd.on && snd.mus ? .2 : 0; mus.connect(master); fxg.connect(master); master.connect(AC.destination);
dly.delayTime.value = .42; fb.gain.value = .4; mus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(master);   // soft room reverb/echo for the music
const nb = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
function tone(f, type, dur, vol, at = 0, to, dest = fxg) {
  const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur);
}
function noise(f, q, dur, vol, at = 0, type = 'bandpass', to) {
  const s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain(), t0 = AC.currentTime + at;
  s.buffer = nb; s.loop = true; b.type = type; b.Q.value = q; b.frequency.setValueAtTime(f, t0); if (to) b.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); s.connect(b).connect(g).connect(fxg); s.start(t0); s.stop(t0 + dur + .05);
}
const clack = (v = 1, p = 1, at = 0) => { noise(2600 * p, 2.5, .04, .55 * v, at); noise(950 * p, 6, .1, .5 * v, at); tone(190 * p, 'sine', .08, .35 * v, at, 110 * p); };   // stone-on-stone click
const VIB = { sel: 8, match: [18, 30, 12], bad: [40, 30, 40], win: [30, 40, 60, 40, 90], boom: [60, 30, 90], layer: [20, 40, 20], shuf: [10, 20, 10, 20, 10], place: 16, drop: 3, whoosh: 0 };
function sfx(n, c = 1) {
  if (!snd.on) { snd.vib && navigator.vibrate?.(VIB[n] ?? 6); return; } if (AC.state !== 'running') AC.resume();
  if (buf[n]) { const s = AC.createBufferSource(); s.buffer = buf[n]; s.playbackRate.value = 1 + .06 * Math.min(c, 8); s.connect(fxg); s.start(); }
  else if (n === 'sel') clack(.5, 1.25);
  else if (n === 'drop') clack(.35 * c, .8 + Math.random() * .5);
  else if (n === 'place') { clack(.9, .85); clack(.6, .95, .06); }
  else if (n === 'whoosh') noise(500, 1, .35, .12, 0, 'bandpass', 2500);
  else if (n === 'match') { clack(1, 1); clack(.8, .9, .07); tone(520 * 1.0595 ** (Math.min(c, 10) * 2), 'triangle', .35, .18, .05); }
  else if (n === 'bad') { tone(120, 'square', .15, .15, 0, 70); noise(300, 2, .12, .3); }
  else if (n === 'shuf') for (let i = 0; i < 9; i++) clack(.4, .8 + Math.random() * .6, i * .045);
  else if (n === 'boom') { tone(90, 'sawtooth', .5, .4, 0, 30); noise(1200, .7, .6, .6, 0, 'lowpass', 120); }
  else if (n === 'layer') { tone(784, 'triangle', .2, .25); tone(1175, 'triangle', .3, .25, .12); }
  else if (n === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', .6, .25, i * .14));
  snd.vib && navigator.vibrate?.(VIB[n] ?? 6);
}
let musicOn = 0; const PEN = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];   // generative D-major pentatonic ambience
function startMusic() {
  if (musicOn) return; musicOn = 1;
  [73.42, 110, 146.83, 220].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i * 3 - 5; g.gain.value = .06; o.connect(g).connect(mus); o.start(); });
  let n = 0; setInterval(() => { if (!snd.on || !snd.mus || AC.state !== 'running') return; const f = PEN[Math.random() * PEN.length | 0] * (Math.random() < .25 ? .5 : 1); tone(f, 'triangle', 1.6, .17, 0, undefined, mus); tone(f * 2, 'sine', .9, .05, .01, undefined, mus); if (++n % 4 === 0) tone(f / 2, 'sine', 2.4, .12, 0, undefined, mus); }, 650);
}
// ---------- REAL MAHJONG RULES: a tile is free when nothing lies on top AND its left or right side is open (all layers playable) ----------
const tD = n => { const b = 5 + 90 * Math.pow(Math.min(n, 300) / 300, .8); return n % 20 === 0 ? Math.min(100, b * 1.15 + 8) : Math.min(100, b * [.95, 1, 1.05, 1.1, .85][(n - 1) % 5]); };
const grp = f => f >= 38 ? -2 : f >= 34 ? -1 : f;                     // any flower matches any flower, any season any season
const open = (t, a) => !a.some(o => o.z > t.z && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2);
const isFree = (t, a) => open(t, a) && !(a.some(o => o.z === t.z && Math.abs(o.y - t.y) < 2 && o.x === t.x - 2) && a.some(o => o.z === t.z && Math.abs(o.y - t.y) < 2 && o.x === t.x + 2));
const near = (a, b) => a.z === b.z && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;
// classic TURTLE: 87 + 36 + 16 + 4 + 1 = 144 tiles (x,y in half-tile units)
const TUR = []; {
  const rw = (l, y, a, b) => { for (let c = a; c <= b; c++) TUR.push({ x: 2 * c, y: 2 * y, z: l }); };
  [[1, 12], [3, 10], [2, 11], [1, 12], [1, 12], [2, 11], [3, 10], [1, 12]].forEach(([a, b], y) => rw(0, y, a, b));
  TUR.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 });
  for (let y = 1; y <= 6; y++) rw(1, y, 4, 9); for (let y = 2; y <= 5; y++) rw(2, y, 5, 8); for (let y = 3; y <= 4; y++) rw(3, y, 6, 7);
  TUR.push({ x: 13, y: 7, z: 4 });
}
function layout(rnd) {   // turtle (50%) or a pyramid stack, randomly mirrored = different board every game
  let s; const PT = innerHeight > innerWidth * 1.1;   // phone portrait: taller boards = bigger tiles
  if (rnd() < (PT ? .3 : .5)) { if (PT) { [C, R, LAY] = [8, 15, 5]; s = TUR.map(q => ({ x: q.y, y: q.x, z: q.z })); } else { [C, R, LAY] = [15, 8, 5]; s = TUR.map(q => ({ ...q })); } }
  else {
    [C, R, LAY] = (PT ? [[6, 9, 5], [7, 8, 4], [6, 9, 5]] : [[6, 9, 5], [8, 7, 4], [7, 8, 4]])[rnd() * 3 | 0]; s = [];
    for (let l = 0; l < LAY; l++) for (let i = 0; i < C - l; i++) for (let j = 0; j < R - l; j++) s.push({ x: 2 * i + l, y: 2 * j + l, z: l });
    const top = s.filter(q => q.z === LAY - 1), mx = top.reduce((a, q) => a + q.x, 0) / top.length, my = top.reduce((a, q) => a + q.y, 0) / top.length;
    top.sort((a, b) => Math.hypot(b.x - mx, b.y - my) - Math.hypot(a.x - mx, a.y - my) || rnd() - .5);
    for (let k = 0; s.length > 144; k++) s.splice(s.indexOf(top[k]), 1);
  }
  const fx = rnd() < .5, fy = rnd() < .5; for (const q of s) { if (fx) q.x = 2 * C - 2 - q.x; if (fy) q.y = 2 * R - 2 - q.y; }
  return s;
}
function build(ts, rnd, nar) {   // removes pairs in a legal play order => every deal is solvable
  const al = new Set(ts), ord = [];
  while (al.size) {
    const a = [...al], f = a.filter(q => isFree(q, a)); if (f.length < 2) return null;
    const c = [];
    for (let i = 0; i < 10; i++) { const p = f[rnd() * f.length | 0], q = f[rnd() * f.length | 0]; if (p === q) continue; const r = a.filter(z => z !== p && z !== q); c.push([p, q, r.filter(z => isFree(z, r)).length]); }
    if (!c.length) continue;
    c.sort((u, v) => u[2] - v[2]); const k = c[Math.round((1 - nar) * (c.length - 1))];
    al.delete(k[0]); al.delete(k[1]); ord.push([k[0], k[1]]);
  }
  return ord;
}
function assign(ord, fl, spread, rnd, fp = [34, 35, 36, 37], sp = [38, 39, 40, 41]) {
  fl = fl.slice(); fp = fp.slice().sort(() => rnd() - .5); sp = sp.slice().sort(() => rnd() - .5);
  for (let i = 0, m = fl.length * spread * 1.2; i < m; i++) { const a = rnd() * fl.length | 0, b = rnd() * fl.length | 0;[fl[a], fl[b]] = [fl[b], fl[a]]; }
  ord.forEach((p, i) => { const t = fl[i]; if (t >= 0) p[0].f = p[1].f = t; else { const pool = t === -1 ? fp : sp; p[0].f = pool.pop(); p[1].f = pool.pop(); } });
}
// TWISTS: gold tiles (+50 bonus), frozen tiles (thaw when a neighbour is matched), bombs, combos
function generate(n, seed, Dover) {
  const D = Dover ?? tD(n), P = { D, narrow: Math.min(1, D / 95), spread: Math.min(1, Math.max(0, (D - 10) / 85)), slack: Math.max(8, Math.round(34 - .26 * D)), pen: D > 50 ? 4 : 3, ice: D >= 25 ? Math.min(8, 2 + (D / 15 | 0)) : 0, hp2: D > 60, gold: D >= 12 ? 14 : 0 };
  for (let tries = 0; tries < 90; tries++) {
    const rnd = rng(seed * 131 + tries), ts = layout(rnd), ord = build(ts, rnd, P.narrow); if (!ord) continue;
    const fl = []; for (let f = 0; f < 34; f++) fl.push(f, f); fl.push(-1, -1, -2, -2);
    assign(ord, fl, P.spread, rnd); ts.forEach(q => { q.hp = 0; q.alive = true; q.gold = false; });
    const late = ord.slice(Math.floor(ord.length * .4)).flat(); for (let i = 0; i < P.ice && late.length; i++) late.splice(rnd() * late.length | 0, 1)[0].hp = P.hp2 && rnd() < .5 ? 2 : 1;
    for (let i = 0; i < P.gold; i++) ts[rnd() * ts.length | 0].gold = true;
    const hp0 = new Map(ts.filter(q => q.hp > 0).map(q => [q, q.hp])), cur = new Map(hp0);
    for (const [a, b] of ord) { for (const q of [a, b]) if (cur.get(q) > 0) { hp0.delete(q); cur.set(q, 0); } a.alive = b.alive = false; for (const [q, h] of cur) if (h > 0 && q.alive && (near(q, a) || near(q, b))) cur.set(q, h - 1); }
    ts.forEach(q => { q.hp = hp0.get(q) || 0; q.alive = true; });
    return { ts, ord, P, D };
  }
  throw new Error('layout failed');
}
// ---------- RENDERER: WebGPU (WebGL2 fallback), PBR, ACES tone mapping, soft shadows, reflections ----------
const r = new THREE.WebGPURenderer({ antialias: true }); await r.init();
const mob = innerWidth < 700 || matchMedia('(pointer:coarse)').matches; r.setPixelRatio(Math.min(devicePixelRatio, mob ? 1.75 : 2)); r.setSize(innerWidth, innerHeight);
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; document.body.prepend(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0806); scene.fog = new THREE.Fog(0x0b0806, 60, 170);
const cam = new THREE.PerspectiveCamera(40, 1, .1, 200); const VIEWS = [['Clear', 1.3, 0], ['Top-down', 1.5, 0], ['3D', .95, 0], ['Corner', 1.0, .6], ['Low', .72, 0]];
let vi = Math.max(0, Math.min(VIEWS.length - 1, +localStorage.getItem('mjv') || 0)), yaw = VIEWS[vi][2], pitch = VIEWS[vi][1], tp = pitch, ty = yaw, dist = 20, camY = 0, zoom = 1, panX = 0, panZ = 0;
const cvs = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; x.wrapS = x.wrapT = THREE.RepeatWrapping; return x; };
const env = cvs(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cfe0f0'); gr.addColorStop(.5, '#56665e'); gr.addColorStop(1, '#101a15'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; [[50, 30, 130, 40], [290, 20, 150, 34], [200, 84, 90, 24], [430, 50, 60, 50]].forEach(a => g.fillRect(...a)); });
env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 1.5;
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x2a1d14, .45));
const sun = new THREE.DirectionalLight(0xdfeaff, 2.6); sun.position.set(-10, 22, 8); sun.castShadow = true; sun.shadow.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;   // cool window light
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); scene.add(sun);
const lamp = new THREE.SpotLight(0xffc88a, 300, 60, .95, .7, 2); lamp.position.set(0, 11, -3); lamp.target.position.set(0, 0, 0); scene.add(lamp, lamp.target);   // warm pendant lamp
// rounded-rect shape helper (used for tiles and table)
const rr = (w, h, k) => { const x0 = -w / 2, y0 = -h / 2, P = Math.PI, s = new THREE.Shape(); s.moveTo(x0 + k, y0).lineTo(-x0 - k, y0).absarc(-x0 - k, y0 + k, k, -P / 2, 0).lineTo(-x0, -y0 - k).absarc(-x0 - k, -y0 - k, k, 0, P / 2).lineTo(x0 + k, -y0).absarc(x0 + k, -y0 - k, k, P / 2, P).lineTo(x0, y0 + k).absarc(x0 + k, y0 + k, k, P, 1.5 * P); return s; };
const TW = 22, TD = 21;
const wood = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(TW, TD, 1.6), { depth: .5, bevelEnabled: true, bevelThickness: .1, bevelSize: .12, bevelSegments: 4, curveSegments: 24 }).rotateX(-Math.PI / 2),
  new THREE.MeshPhysicalMaterial({ map: cvs(256, 256, (g, w, h) => { g.fillStyle = '#5a3820'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${20 + Math.random() * 40},${10 + Math.random() * 20},5,.25)`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, Math.random() * h); g.bezierCurveTo(80, Math.random() * h, 170, Math.random() * h, w, Math.random() * h); g.stroke(); } }), roughness: .35, clearcoat: .6, clearcoatRoughness: .25 }));
wood.position.y = -.68; wood.receiveShadow = true; scene.add(wood);
const felt = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(TW - 1.8, TD - 1.8, 1.1), { depth: .04, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: cvs(128, 128, (g, w, h) => { g.fillStyle = '#17684a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }), roughness: 1 }));
felt.position.y = -.04; felt.receiveShadow = true; scene.add(felt);
const fm = cvs(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) { g.fillStyle = `hsl(28,${35 + Math.random() * 10}%,${22 + Math.random() * 8}%)`; g.fillRect(0, y * 64, w, 62); g.fillStyle = '#0006'; g.fillRect(0, y * 64 + 62, w, 2); for (let k = 0; k < 14; k++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(0, y * 64 + Math.random() * 60); g.lineTo(w, y * 64 + Math.random() * 60); g.stroke(); } } }); fm.repeat.set(14, 14);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshPhysicalMaterial({ map: fm, roughness: .4, clearcoat: .5 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -7; ground.receiveShadow = true; scene.add(ground);
const dark = new THREE.MeshPhysicalMaterial({ color: 0x2b1a10, roughness: .35, clearcoat: .6 });
for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.55, .4, 6.3, 20), dark); l.position.set(lx * (TW / 2 - 1.4), -3.85, lz * (TD / 2 - 1.4)); l.castShadow = true; scene.add(l); }
const wall = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), new THREE.MeshStandardMaterial({ color: 0x3b2d25, roughness: .95 })); wall.position.set(0, 20, -45); scene.add(wall);
const winM = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshBasicMaterial({ color: 0xcfe2ff })); winM.position.set(-16, 14, -44.8); scene.add(winM);
for (const [w, h, x, y] of [[.5, 16, -16, 14], [26, .5, -16, 14]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .4), dark); m.position.set(x, y, -44.6); scene.add(m); }
const shade = new THREE.Mesh(new THREE.CylinderGeometry(.5, 2.4, 1.7, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x1f4a36, metalness: .7, roughness: .3, side: THREE.DoubleSide })); shade.position.set(0, 11.6, -3); scene.add(shade);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); bulb.position.set(0, 10.9, -3); scene.add(bulb);
const cord = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 30, 6), dark); cord.position.set(0, 27, -3); scene.add(cord);
const cup = new THREE.Mesh(new THREE.CylinderGeometry(.55, .38, .85, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: .1, clearcoat: 1, side: THREE.DoubleSide })); cup.position.set(8.6, .45, -8.3); cup.castShadow = true; scene.add(cup);
const tea = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshPhysicalMaterial({ color: 0x7a3a10, roughness: .05, clearcoat: 1 })); tea.rotation.x = -Math.PI / 2; tea.position.set(8.6, .75, -8.3); scene.add(tea);
// TILE: rounded extruded body (bevelled), glossy ivory marble face, jade-glass sides
const IW = W - .1, IH = H - .1, geo = new THREE.ExtrudeGeometry(rr(IW, IH, .17), { depth: DP - .1, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 5, curveSegments: 16 });
{ const p = geo.attributes.position, u = geo.attributes.uv; for (let i = 0; i < p.count; i++) u.setXY(i, (p.getX(i) + IW / 2) / IW, (p.getY(i) + IH / 2) / IH); geo.rotateX(-Math.PI / 2); geo.center(); }
const side = new THREE.MeshPhysicalMaterial({ color: 0x1b8a64, roughness: .15, clearcoat: 1, clearcoatRoughness: .05, transmission: 0, metalness: .1 });
const goldSide = new THREE.MeshPhysicalMaterial({ color: 0xe0a82a, roughness: .2, metalness: .9, clearcoat: 1 });
const CJK = '"Noto Sans SC","Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif';
const tex = Array.from({ length: NF }, (_, i) => cvs(256, 340, (g) => {   // 0-8 dots, 9-17 bamboo, 18-26 characters, 27-30 winds, 31-33 dragons, 34-37 flowers, 38-41 seasons
  g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 128, 170); gr.addColorStop(0, '#fcf8ec'); gr.addColorStop(1, '#ebe2ca'); g.fillStyle = gr; g.fillRect(0, 0, 128, 170);
  g.lineWidth = .8; for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(110,100,85,${.05 + Math.random() * .1})`; g.beginPath(); let x = Math.random() * 128, y = 0; g.moveTo(x, y); for (let m = 0; m < 6; m++) { x += Math.random() * 40 - 20; y += 28; g.quadraticCurveTo(x + Math.random() * 30 - 15, y - 14, x, y); } g.stroke(); }
  g.strokeStyle = '#bfae86'; g.lineWidth = 4; g.beginPath(); g.roundRect(6, 6, 116, 158, 23); g.stroke();   // 23px rounded border
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (i < 18) {
    const n = i % 9 + 1, rows = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const row = k / 3 | 0, cnt = Math.min(3, n - row * 3), x = 64 + (k % 3 - (cnt - 1) / 2) * 34, y = 85 + (row - (rows - 1) / 2) * 40;
      if (i < 9) { g.fillStyle = k % 3 === 1 ? '#c62828' : '#1e5aa8'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); }
      else { g.fillStyle = k % 3 === 1 ? '#c62828' : '#2e7d32'; g.fillRect(x - 6, y - 17, 12, 34); g.fillStyle = '#f7f1e1'; g.fillRect(x - 6, y - 2, 12, 3); }
    }
  } else if (i < 27) { g.fillStyle = '#212121'; g.font = `62px ${CJK}`; g.fillText('一二三四五六七八九'[i - 18], 64, 62); g.fillStyle = '#c62828'; g.fillText('萬', 64, 124); }
  else if (i < 34) { const k = i - 27; g.fillStyle = ['#212121', '#212121', '#212121', '#212121', '#c62828', '#2e7d32', '#1e5aa8'][k]; g.font = `86px ${CJK}`; if (k === 6) { g.strokeStyle = '#1e5aa8'; g.lineWidth = 6; g.strokeRect(26, 40, 76, 90); } else g.fillText('東南西北中發'[k], 64, 88); }
  else if (i < 38) { g.font = `70px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; g.fillText(['🌸', '🌺', '🌼', '🎋'][i - 34], 64, 88); }
  else { g.fillStyle = '#ef6c00'; g.beginPath(); g.arc(64, 85, 44, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `60px ${CJK}`; g.fillText('春夏秋冬'[i - 38], 64, 88); }
}));
// ---------- REALISTIC HAND: picks up the two matched tiles, carries them to your discard rack ----------
function mkHand(ry) {
  const o = new THREE.Group(), g = new THREE.Group(), arm = new THREE.Group();
  const skm = cvs(128, 128, (c, w, h) => { c.fillStyle = '#d9a784'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,200,170' : '120,70,50'},${Math.random() * .12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const sk = new THREE.MeshPhysicalMaterial({ map: skm, roughness: .55, sheen: 1, sheenRoughness: .5, sheenColor: new THREE.Color(0xff9b80), clearcoat: .12, clearcoatRoughness: .45 }),
    nl = new THREE.MeshPhysicalMaterial({ color: 0xf0c4b8, roughness: .15, clearcoat: 1 }), sl = new THREE.MeshPhysicalMaterial({ color: 0x1d2a44, roughness: .8, sheen: 1, sheenColor: new THREE.Color(0x6677aa) });
  const mesh = (geo, m, p, sc) => { const e = new THREE.Mesh(geo, m); e.castShadow = true; if (p) e.position.set(...p); if (sc) e.scale.set(...sc); return e; };
  const finger = (x, y, z, len, rad, curl, rz) => {   // 3 phalanges with knuckle joints, curled like a relaxed pinch, fingernail on the last one
    const root = new THREE.Group(); root.position.set(x, y, z); root.rotation.z = rz; let par = root, prev = 0;
    [.44, .3, .26].forEach((f, i) => {
      const l = len * f, rd = rad * (1 - i * .1), j = new THREE.Group(); j.position.y = i ? -prev : 0; j.rotation.x = curl[i]; par.add(j);
      j.add(mesh(new THREE.SphereGeometry(rd * 1.05, 14, 10), sk)); j.add(mesh(new THREE.CapsuleGeometry(rd, l, 6, 14), sk, [0, -l / 2, 0]));
      if (i === 2) j.add(mesh(new THREE.SphereGeometry(rd * .75, 12, 8), nl, [0, -l * .55, rd * .78], [1, 1.2, .3]));
      prev = l; par = j;
    }); g.add(root);
  };
  g.add(mesh(new THREE.SphereGeometry(.5, 28, 20), sk, [0, .78, .02], [.95, .55, .3]));            // palm
  g.add(mesh(new THREE.SphereGeometry(.5, 20, 14), sk, [.42, .7, .1], [.36, .5, .3]));             // thumb pad
  [[-.33, .38, .065, [.4, .6, .5], .05], [-.11, .5, .075, [.4, .6, .5], .02], [.11, .56, .078, [.45, .65, .5], -.02], [.33, .5, .075, [.55, .75, .45], -.06]].forEach(([x, l, r, c, z]) => finger(x, .5, 0, l, r, c, z));
  finger(.5, .62, .06, .42, .09, [.3, .55, .3], -.95);                                              // thumb
  arm.position.set(0, 1.0, .02); arm.rotation.x = 1.0; g.add(arm);
  arm.add(mesh(new THREE.CylinderGeometry(.24, .17, 1.8, 28), sk, [0, .9, 0])); arm.add(mesh(new THREE.CylinderGeometry(.34, .31, 1.6, 32), sl, [0, 2.2, 0]));
  const cuff = mesh(new THREE.TorusGeometry(.32, .06, 12, 32), sl, [0, 1.4, 0]); cuff.rotation.x = Math.PI / 2; arm.add(cuff);
  g.rotation.y = ry; o.add(g); o.visible = false; scene.add(o); return { g: o, q: [] };
}
const Hd = { you: mkHand(0), cpu: mkHand(Math.PI) };
const pileXY = (who, k) => ({ x: -7 + (k % 28) * .5, z: (who === 'you' ? 1 : -1) * (6.4 + (k / 28 | 0) * .7) });
function grab(a, b, who) { [a, b].forEach(t => { t.pp = pileXY(who, S.pile[who]++); }); Hd[who].q.push({ a, b, p: 0 }); }
function handStep(who, dt) {
  const h = Hd[who], j = h.q[0]; if (!j) { h.g.visible = false; return; }
  h.g.visible = true; j.p += dt * (1 + (h.q.length - 1) * .9); const p = j.p; if (p >= 1.3) { h.q.shift(); return; }
  const dir = who === 'you' ? 1 : -1, A = j.a, B = j.b, ax = wx(A), ay = wy(A), az = wz(A), bx = wx(B), by = wy(B), bz = wz(B), mx = (A.pp.x + B.pp.x) / 2, mz = (A.pp.z + B.pp.z) / 2;
  const K = [[ax + .6, 5, az + dir * 8], [ax + .6, ay + .45, az], [bx - .6, by + .45, bz], [mx, .575, mz], [mx, 5, mz + dir * 8]], T = [0, .3, .6, 1, 1.3];
  const i = T.findIndex(x => p < x) - 1, f = (p - T[i]) / (T[i + 1] - T[i]), s = f * f * (3 - 2 * f), a = K[i], b = K[i + 1], arc = Math.sin(s * Math.PI) * [.4, 1.1, 1.1, .3][i];
  const hx = a[0] + (b[0] - a[0]) * s, hy = a[1] + (b[1] - a[1]) * s + arc, hz = a[2] + (b[2] - a[2]) * s;
  h.g.position.set(hx, hy, hz);
  const put = (t, ox) => { const e = i === 2 ? s : i === 3 ? 1 : 0; t.mesh.position.set(hx + ox + (t.pp.x - hx - ox) * e, hy - .45 + (.125 - hy + .45) * e, hz + (t.pp.z - hz) * e); t.mesh.scale.setScalar(1 - .5 * e); t.mesh.rotation.y = (t.jit ??= (Math.random() - .5) * .5) * e; };
  if (!j.w) { j.w = 1; sfx('whoosh'); } if (p >= .3) { if (!j.g1) { j.g1 = 1; sfx('sel'); } put(A, -.6); } if (p >= .6) { if (!j.g2) { j.g2 = 1; sfx('sel'); } put(B, .6); } if (p >= 1 && !j.pl) { j.pl = 1; sfx('place'); }
  h.g.rotation.z = Math.sin(s * Math.PI) * -.08 * dir;
}
// ---------- GLOW: bright pulsing ring + fill + bouncing arrow on hinted tiles, cyan ring on the selected tile ----------
const glowM = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const ringShape = rr(W + .06, H + .06, .24); ringShape.holes.push(new THREE.Path(rr(W - .22, H - .22, .1).getPoints(16)));
const ringGeo = new THREE.ShapeGeometry(ringShape, 16).rotateX(-Math.PI / 2), fillGeo = new THREE.ShapeGeometry(rr(W - .04, H - .04, .2), 16).rotateX(-Math.PI / 2), arrowGeo = new THREE.ConeGeometry(.3, .65, 20).rotateX(Math.PI);
const glows = Array.from({ length: 4 }, () => { const g = new THREE.Group(), m1 = glowM(0xffd54a), m2 = glowM(0xffd54a), m3 = glowM(0xffd54a), a = new THREE.Mesh(arrowGeo, m3); g.add(new THREE.Mesh(ringGeo, m1), new THREE.Mesh(fillGeo, m2), a); g.visible = false; scene.add(g); return { g, m1, m2, m3, a }; });
function glowFx(now) {
  const list = [];
  if (S) { if (S.sel && S.sel.alive) list.push([S.sel, 0x6fe9ff, 0]); if (hintT > now && S.hint) for (const q of S.hint) if (q.alive) list.push([q, 0xffd54a, 1]); }
  const pulse = .55 + .45 * Math.sin(now / 130);
  glows.forEach((o, i) => {
    const e = list[i]; o.g.visible = !!e; if (!e) return; const [q, col, arrow] = e, m = q.mesh;
    o.g.position.set(m.position.x, m.position.y + DP / 2 + .03, m.position.z);
    [o.m1, o.m2, o.m3].forEach(x => x.color.setHex(col)); o.m1.opacity = .6 + .4 * pulse; o.m2.opacity = .15 + .3 * pulse; o.a.visible = !!arrow; o.a.position.y = .85 + .25 * Math.sin(now / 160);
    q.top.emissive.setHex(col); q.top.emissiveIntensity = .2 + .45 * pulse;
  });
}
// ---------- game state ----------
let S = null, anims = [], hintT = 0, cx = 0, cz = 0;
const prog = JSON.parse(localStorage.getItem('mj') || '{"u":1,"s":{}}'), save = () => localStorage.setItem('mj', JSON.stringify(prog));
const toast = m => { const e = $('toast'); e.textContent = m; e.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.opacity = 0, 1800); };
const wx = q => (q.x + 1 - cx) * SX, wz = q => (q.y + 1 - cz) * SZ, wy = q => q.z * LG + DP / 2;
const alive = () => S.ts.filter(q => q.alive);
const topOf = () => Math.max(-1, ...alive().map(q => q.z));
const playable = (q, a = alive()) => q.alive && q.hp <= 0 && isFree(q, a);
function fit() {
  r.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); if (!S) return;
  const t = Math.tan(20 * Math.PI / 180); dist = Math.max((S.bw / 2 + .9) / (t * cam.aspect), (S.bd * .55 + 1.4) / t) * (cam.aspect < .8 ? 1.04 : 1.1) + (cam.aspect < .8 ? .6 : 2);
}
function start(n, o = {}) {
  if (S) S.ts.forEach(q => scene.remove(q.mesh)); Hd.you.q = []; Hd.cpu.q = [];
  const seed = o.seed ?? (Math.random() * 1e9 | 0), D = o.D, g = generate(n, seed, D), ts = g.ts;
  cx = (Math.min(...ts.map(q => q.x)) + Math.max(...ts.map(q => q.x)) + 2) / 2; cz = (Math.min(...ts.map(q => q.y)) + Math.max(...ts.map(q => q.y)) + 2) / 2;
  S = { n, ts, ord: g.ord, P: g.P, seed, daily: !!(o.daily || o.quick), quick: !!o.quick, mode: o.mode || 'solo', turn: 'you', cs: 0, hist: [], sel: null, score: 0, combo: 0, last: 0, aid: 0, t0: performance.now(), top: LAY - 1, pile: { you: 0, cpu: 0 }, bw: C * W, bd: R * H + 4, moves: 72 + g.P.slack, pen: g.P.pen, bombs: 1, armed: false, failed: false, Dover: D };
  for (const q of ts) {
    q.top = new THREE.MeshPhysicalMaterial({ map: tex[q.f], roughness: .08, clearcoat: 1, clearcoatRoughness: .03, specularIntensity: 1 });
    q.mesh = new THREE.Mesh(geo, [q.top, q.gold ? goldSide : side]); q.mesh.castShadow = q.mesh.receiveShadow = true; q.mesh.userData.q = q;
    q.vy = 0; q.mesh.position.set(wx(q), wy(q) + 3 + q.z * 1.6 + Math.random() * 2, wz(q)); q.mesh.rotation.set(0, 0, 0); scene.add(q.mesh);
  }
  camY = LAY * LG; zoom = 1; panX = panZ = 0; fit(); refresh(); $('win').classList.remove('on'); go('game'); $('bNext').textContent = 'Next level ▶';
  $('lv').textContent = S.mode === 'vs' ? 'vs CPU' : S.quick ? 'Quick play' : S.daily ? 'Daily' : 'Level ' + n; toast(`${r.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2'} · 144 tiles · real free-tile rules`);
}
function refresh() {
  S.top = topOf(); const al = alive(), vs = S.mode === 'vs';
  $('left').textContent = S.top < 0 ? 'Done' : `Tiles ${al.length}`; $('sc').textContent = vs ? 'You ' + S.score : S.score; $('mv').textContent = vs ? 'CPU ' + S.cs : 'Moves ' + S.moves; $('mv').style.color = !vs && S.moves <= 10 ? '#ff8a80' : ''; if (vs) $('lv').textContent = S.turn === 'you' ? 'Your turn' : 'CPU…'; $('bBomb').textContent = '💣' + S.bombs; $('bBomb').style.outline = S.armed ? '3px solid #ffd54f' : 'none';
  $('secs').textContent = S.top < 0 ? '' : `Free pairs ${moves().length}`;
  for (const q of al) {
    const ok = playable(q, al), sel = S.sel === q || (hintT > performance.now() && S.hint?.includes(q));
    q.top.color.set(q.hp > 0 ? 0x8fd6ff : ok ? 0xffffff : 0x7c7c7c);
    q.top.emissive.set(sel ? 0xffc83d : q.hp > 0 ? 0x1a6a99 : q.gold ? 0x3a2a00 : 0x000000); q.top.emissiveIntensity = sel ? .5 : .35;
  }
}
const moves = () => { const al = alive(), m = {}; for (const q of al) if (playable(q, al)) (m[grp(q.f)] ||= []).push(q); return Object.values(m).filter(a => a.length > 1); };
const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
function pick(ex, ey) {
  mv.set(ex / innerWidth * 2 - 1, -(ey / innerHeight) * 2 + 1); ray.setFromCamera(mv, cam);
  const lt = alive(), h = ray.intersectObjects(lt.map(q => q.mesh))[0]; if (h) return h.object.userData.q;
  let b = null, bd = 60; const v = new THREE.Vector3();
  for (const q of lt) { v.copy(q.mesh.position).project(cam); const d = (playable(q, lt) ? 0 : 18) + Math.hypot((v.x + 1) / 2 * innerWidth - ex, (1 - v.y) / 2 * innerHeight - ey); if (d < bd) { bd = d; b = q; } }
  return b;
}
const HINT = 2, SHUF = 5, d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), live = () => S && S.top >= 0 && !S.failed;
function lose(n) {
  if (S.mode === 'vs') return;
  S.moves = Math.max(0, S.moves - n);
  if (S.moves <= 0 && S.top >= 0 && !S.failed) { S.failed = true; refresh(); setTimeout(() => { $('wt').textContent = 'Out of moves'; $('ws').textContent = `Score ${S.score}`; $('bNext').textContent = 'Retry ↻'; $('win').classList.add('on'); }, 500); }
}
function tap(q) {
  if (!live() || (S.mode === 'vs' && S.turn !== 'you')) return;
  if (S.armed) { if (q) return explode(q); return toast('Tap a tile'); }
  if (!q || !playable(q)) { sfx('bad'); if (q) anims.push({ m: q.mesh, k: 'shake', t: performance.now() }); if (q && q.hp > 0) toast('Frozen: match tiles next to it'); else if (q && !open(q, alive())) toast('Covered by another tile'); else if (q) toast('Blocked left and right'); return; }
  if (!S.sel) { S.sel = q; sfx('sel'); } else if (S.sel === q) S.sel = null; else if (grp(S.sel.f) === grp(q.f)) match(S.sel, q); else wrong(S.sel, q);
  refresh();
}
function wrong(a, b) {
  S.sel = null; S.combo = 0; sfx('bad'); [a, b].forEach(q => anims.push({ m: q.mesh, k: 'shake', t: performance.now() }));
  if (S.mode === 'vs') { toast('Wrong match – turn lost'); endTurn(); } else { toast(`Wrong match! -${S.pen} moves`); lose(S.pen); }
}
function match(a, b) {
  const now = performance.now(); S.combo = now - S.last < 2000 ? S.combo + 1 : 1; S.last = now; S.score += 100 * S.combo; sfx('match', S.combo);
  if (a.gold) S.score += 50; if (b.gold) S.score += 50;
  if (S.combo === 4) { S.bombs++; toast('Combo x4! +1 💣'); }
  S.hist.push({ t: [a, b], snap: S.ts.filter(q => q.hp > 0).map(q => [q, q.hp]), cost: 1 });
  a.alive = b.alive = false; S.sel = null; S.moves--; grab(a, b, 'you'); finish([a, b], now); if (S.top >= 0) { lose(0); endTurn(); }
}
function finish(rem, now, who = 'you') {
  const add = v => who === 'cpu' ? S.cs += v : S.score += v;
  for (const q of S.ts) if (q.hp > 0 && q.alive && rem.some(t => near(q, t))) q.hp--;
  for (const z of new Set(rem.map(t => t.z))) if (!S.ts.some(q => q.alive && q.z === z)) { add(500); if (who !== 'cpu') S.bombs++; sfx('layer'); toast(`Layer ${LAY - z} cleared by ${who === 'cpu' ? 'CPU' : 'you'}! +500`); }
  refresh(); if (S.top < 0) return win(); if (!moves().length) { if (S.mode === 'vs') { if (reshuffle()) toast('No moves – board reshuffled'); } else toast('No moves – Shuffle or Undo!'); }
}
function explode(q) {   // BOMB: blasts the tapped uncovered tile + its partner + the nearest other pair = 4 tiles
  const a = alive(), lt = a.filter(o => open(o, a)), mate = (t, ex) => lt.filter(o => o !== t && !ex.includes(o) && grp(o.f) === grp(t.f)).sort((x, y) => d2(x, t) - d2(y, t))[0];
  if (!lt.includes(q)) return toast('Tile is covered');
  const set = [q], m1 = mate(q, set); if (!m1) return toast('No partner for that tile'); set.push(m1);
  const y = lt.filter(o => !set.includes(o)).sort((u, v) => d2(u, q) - d2(v, q)).find(o => mate(o, set)); if (y) set.push(y, mate(y, set));
  S.hist.push({ t: set, snap: S.ts.filter(o => o.hp > 0).map(o => [o, o.hp]), cost: 1, bomb: true });
  S.armed = false; S.bombs--; S.moves--; S.sel = null; S.score += 100 * set.length; set.forEach(t => t.alive = false);
  for (let i = 0; i < set.length; i += 2) grab(set[i], set[i + 1], 'you');
  sfx('boom'); toast(`💣 Boom! ${set.length} tiles`); finish(set, performance.now()); if (S.top >= 0) { lose(0); endTurn(); }
}
function arm() {
  if (!live() || (S.mode === 'vs' && S.turn !== 'you')) return; if (S.bombs <= 0) return toast('No bombs: clear a layer or make a x4 combo');
  S.armed = !S.armed; S.sel = null; toast(S.armed ? '💣 Armed: tap a tile to blast 4' : 'Bomb off'); refresh();
}
function win() {
  if (S.mode === 'vs') { const y = S.score, c = S.cs; sfx(y >= c ? 'win' : 'bad'); refresh(); setTimeout(() => { $('wt').textContent = y > c ? 'You win! 🎉' : y < c ? 'Computer wins' : 'Draw'; $('ws').textContent = `You ${y} – CPU ${c}`; $('bNext').textContent = 'Play again ↻'; $('win').classList.add('on'); }, 1400); return; }
  const st = S.aid === 0 && S.moves > 15 ? 3 : S.aid <= 3 ? 2 : 1, secs = Math.round((performance.now() - S.t0) / 1000);
  S.score += Math.max(0, 600 - secs) * 2 + S.moves * 10; sfx('win'); refresh();
  if (!S.daily) { prog.s[S.n] = Math.max(prog.s[S.n] || 0, st); prog.u = Math.min(300, Math.max(prog.u, S.n + 1)); save(); }
  fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: S.daily ? 1000 : S.n, points: S.score, name: 'player' }) }).catch(() => {});
  setTimeout(() => { $('wt').textContent = '★'.repeat(st) + '☆'.repeat(3 - st); $('ws').textContent = `Score ${S.score} · ${secs}s · ${S.moves} moves left`; $('win').classList.add('on'); }, 1400);
}
function hint() {
  if (!live()) return; if (S.mode === 'vs') return toast('Not available in versus'); if (S.moves <= HINT + 1) return toast('Not enough moves for a hint');
  let p = S.ord.find(([a, b]) => a.alive && b.alive && playable(a) && playable(b)); if (!p) { const m = moves()[0]; if (m) p = [m[0], m[1]]; }
  if (!p) return toast('No moves – Shuffle or Undo!');
  S.aid++; S.hint = p; hintT = performance.now() + 3200; sfx('sel'); toast(`Hint: -${HINT} moves`); lose(HINT); refresh(); setTimeout(refresh, 3300);
}
function reshuffle() {   // reshuffles every remaining tile, always solvable
  const al = alive(), cnt = {}; al.forEach(q => { const g = grp(q.f); cnt[g] = (cnt[g] || 0) + 1; });
  const fl = []; for (const g in cnt) for (let i = 0; i < cnt[g] / 2; i++) fl.push(+g);
  const fp = al.filter(q => grp(q.f) === -1).map(q => q.f), sp = al.filter(q => grp(q.f) === -2).map(q => q.f);
  for (let i = 0; i < 60; i++) {
    const rnd = rng(Date.now() + i), ord = build(al, rnd, S.P.narrow); if (!ord) continue;
    assign(ord, fl, S.P.spread, rnd, fp, sp); S.ord = ord; al.forEach(q => { q.hp = 0; q.top.map = tex[q.f]; q.top.needsUpdate = true; });
    S.sel = null; sfx('shuf'); refresh(); return true;
  }
  return false;
}
function shuffle() {
  if (!live()) return; if (S.mode === 'vs') return toast('Not available in versus'); if (S.moves <= SHUF + 1) return toast(`Shuffle costs ${SHUF} moves`);
  if (reshuffle()) { S.aid++; toast(`Board shuffled -${SHUF} moves (ice thawed)`); lose(SHUF); refresh(); } else toast('Could not shuffle – try Undo');
}
// ---------- COMPUTER OPPONENT (versus): you and the CPU alternate turns on the same board, higher score wins ----------
function endTurn() { if (S.mode !== 'vs' || S.top < 0) return; S.turn = 'cpu'; refresh(); setTimeout(cpuMove, 800); }
function cpuMove() {
  if (!S || S.mode !== 'vs' || S.turn !== 'cpu' || S.top < 0) return;
  let ms = moves(); if (!ms.length) { if (reshuffle()) { toast('No moves – board reshuffled'); ms = moves(); } if (!ms.length) { S.turn = 'you'; return refresh(); } }
  const skill = Math.min(.95, .3 + (S.Dover ?? 40) / 120), cand = [];
  for (const g of ms) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) cand.push([g[i], g[j]]);
  const a0 = ms[0][0], b0 = S.ts.find(q => playable(q) && grp(q.f) !== grp(a0.f));
  if (b0 && Math.random() < (1 - skill) * .2) { toast('Computer slipped – your turn'); [a0, b0].forEach(q => anims.push({ m: q.mesh, k: 'shake', t: performance.now() })); sfx('bad'); S.turn = 'you'; return refresh(); }
  let p = Math.random() < skill ? S.ord.find(([a, b]) => a.alive && b.alive && playable(a) && playable(b)) : null;
  if (!p) { const al = alive(); let bs = -1e9; for (const c of cand) { const rest = al.filter(q => q !== c[0] && q !== c[1]); const sc = rest.filter(q => isFree(q, rest)).length + Math.random() * (1 - skill) * 4 + (c[0].gold ? 1.5 : 0); if (sc > bs) { bs = sc; p = c; } } }
  S.hint = p; hintT = performance.now() + 700; refresh(); sfx('sel');
  setTimeout(() => {
    if (!S || S.mode !== 'vs' || S.turn !== 'cpu') return; const [a, b] = p; if (!a.alive || !b.alive) return;
    sfx('match', 1); S.cs += 100 + (a.gold ? 50 : 0) + (b.gold ? 50 : 0);
    a.alive = b.alive = false; grab(a, b, 'cpu'); finish([a, b], performance.now(), 'cpu'); if (S.top < 0) return;
    S.turn = 'you'; if (!moves().length && reshuffle()) toast('No moves – board reshuffled'); refresh();
  }, 750);
}
function undo() {
  if (!live() || !S.hist.length) return; if (S.mode === 'vs') return toast('Not available in versus'); S.aid++; const h = S.hist.pop();
  h.t.forEach(q => q.alive = true); S.ts.forEach(q => q.hp = 0); h.snap.forEach(([q, hp]) => q.hp = hp); S.moves += h.cost; if (h.bomb) S.bombs++;
  S.pile.you -= h.t.length; Hd.you.q = Hd.you.q.filter(j => !h.t.includes(j.a) && !h.t.includes(j.b));
  for (const q of h.t) { q.mesh.scale.setScalar(1); q.mesh.rotation.set(0, 0, 0); }
  S.sel = null; sfx('sel'); refresh();
}
// ---------- UI ----------
function grid() {
  const g = $('grid'); g.innerHTML = '';
  for (let n = 1; n <= 300; n++) { if (n % 50 === 1) { const l = document.createElement('div'); l.className = 'glabel'; l.textContent = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Master'][(n - 1) / 50 | 0] + ` · ${n}–${n + 49}`; g.appendChild(l); } const b = document.createElement('button'), st = prog.s[n] || 0; b.textContent = n + (st ? '\n' + '★'.repeat(st) : ''); if (n > prog.u) b.className = 'lock'; else b.onclick = () => start(n); g.appendChild(b); }
}
$('bMenu').onclick = () => go('home');
$('bClose').onclick = () => go('game'); $('bPlay').onclick = () => start(prog.u);
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
$('bBomb').onclick = arm; $('bHint').onclick = hint; $('bShuf').onclick = shuffle; $('bUndo').onclick = undo;
$('bNext').onclick = () => S.mode === 'vs' ? start(1, { D: S.Dover, mode: 'vs' }) : S.quick ? start(1, { D: S.Dover, quick: true }) : S.failed ? start(S.n, { D: S.Dover, seed: S.daily ? S.seed : undefined, daily: S.daily }) : start(S.daily ? prog.u : Math.min(300, S.n + 1));
$('bQuick').onclick = () => start(1, { D: 22, quick: true });
$('vsE').onclick = () => start(1, { D: 15, mode: 'vs' }); $('vsN').onclick = () => start(1, { D: 45, mode: 'vs' }); $('vsH').onclick = () => start(1, { D: 80, mode: 'vs' });
$('bDaily').onclick = async () => { let seed = +new Date().toISOString().slice(0, 10).replace(/-/g, ''); try { seed = (await (await fetch('/api/daily')).json()).seed; } catch {} start(60, { seed, D: 62, daily: true }); };
// tap = select · drag = orbit · wheel / pinch / +- = zoom · two-finger or shift+drag = pan
const ptrs = new Map(), dom = r.domElement; let down = null, pinch = null;
const mid = () => { const p = [...ptrs.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; };
const clampZ = z => Math.max(.35, Math.min(3, z));
function doPan(dx, dy) { const k = 2 * dist * zoom * Math.tan(20 * Math.PI / 180) / innerHeight; panX = Math.max(-10, Math.min(10, panX - dx * k * Math.cos(yaw))); panZ = Math.max(-10, Math.min(10, panZ - dy * k * 1.2)); }
dom.addEventListener('contextmenu', e => e.preventDefault());
dom.addEventListener('pointerdown', e => { AC.resume(); startMusic(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, drag: false, pan: e.button === 2 || e.shiftKey }; else { down = null; pinch = { ...mid(), z: zoom }; } });
dom.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2 && pinch) { const m = mid(); zoom = clampZ(pinch.z * pinch.d / m.d); doPan(m.x - pinch.x, m.y - pinch.y); pinch.x = m.x; pinch.y = m.y; return; }
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
  if (!down.drag && Math.hypot(dx, dy) > 16) down.drag = true;
  if (down.drag) { doPan(dx, dy); down.x = e.clientX; down.y = e.clientY; }   // one finger only pans (no rotation)
});
const up = e => { const was = down; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (was && !was.drag && S && e.type === 'pointerup') tap(pick(e.clientX, e.clientY)); down = null; };
addEventListener('pointerup', up); addEventListener('pointercancel', up);
dom.addEventListener('wheel', e => { e.preventDefault(); zoom = clampZ(zoom * Math.exp(e.deltaY * .001)); }, { passive: false });
$('bZin').onclick = () => zoom = clampZ(zoom / 1.25); $('bZout').onclick = () => zoom = clampZ(zoom * 1.25); $('bZr').onclick = () => { zoom = 1; panX = panZ = 0; setView(0); };
const setView = i => { vi = (i + VIEWS.length) % VIEWS.length; tp = VIEWS[vi][1]; ty = VIEWS[vi][2]; localStorage.setItem('mjv', vi); };
$('bCam').onclick = () => { setView(vi + 1); toast('View: ' + VIEWS[vi][0]); };
addEventListener('resize', fit); grid();
let hq = localStorage.getItem('mjq') !== '0'; const pr = () => { r.setPixelRatio(hq ? Math.min(devicePixelRatio, mob ? 1.75 : 2) : 1); r.setSize(innerWidth, innerHeight); };
const sv = () => localStorage.setItem('mjs2', JSON.stringify(snd)), apply = () => {
  mus.gain.value = snd.on && snd.mus ? .2 : 0; $('bSnd').textContent = snd.on ? '🔊' : '🔇';
  [['sSnd', 'on', 'Sound effects'], ['sMus', 'mus', 'Music'], ['sVib', 'vib', 'Vibration']].forEach(([id, k, l]) => $(id).textContent = `${l}: ${snd[k] ? 'ON' : 'OFF'}`); $('sQ').textContent = 'Graphics: ' + (hq ? 'High' : 'Battery saver');
};
[['sSnd', 'on'], ['sMus', 'mus'], ['sVib', 'vib']].forEach(([id, k]) => $(id).onclick = () => { snd[k] = !snd[k]; sv(); apply(); AC.resume(); startMusic(); if (snd.on) sfx('sel'); if (k === 'vib' && snd.vib) navigator.vibrate?.(30); });
$('bSnd').onclick = () => { snd.on = !snd.on; sv(); apply(); AC.resume(); startMusic(); if (snd.on) sfx('sel'); };
$('sQ').onclick = () => { hq = !hq; localStorage.setItem('mjq', hq ? 1 : 0); pr(); apply(); };
$('sRes').onclick = () => { if (confirm('Reset all level progress?')) { localStorage.removeItem('mj'); location.reload(); } };
apply(); pr();
// ---------- ROUTER (hash pages): #/home #/levels #/versus #/settings #/howto #/game ----------
function go(h) { if (location.hash !== '#/' + h) location.hash = '/' + h; else route(); }
function route() {
  const h = location.hash.replace('#/', '') || 'home'; document.body.dataset.route = h; $('win').classList.remove('on');
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.dataset.page === h)); $('menu').classList.toggle('on', h !== 'game');
  if (h === 'levels') grid();
  if (h === 'home') { const st = Object.values(prog.s).reduce((a, b) => a + b, 0); $('bPlay').textContent = `▶ Continue · Level ${prog.u}`; $('hSt').textContent = `★ ${st} collected`; $('bClose').hidden = !(S && S.top >= 0 && !S.failed); }
  if (h === 'game' && !S) start(prog.u);
}
addEventListener('hashchange', route); addEventListener('keydown', e => { if (e.key === 'Escape') go(document.body.dataset.route === 'game' ? 'home' : 'game'); });
// ---------- loop ----------
let lastT = performance.now(), lastImp = 0; const impact = v => { const n = performance.now(); if (n - lastImp > 45) { lastImp = n; sfx('drop', Math.min(1, -v / 14)); } };
r.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (S) {
    for (const q of S.ts) if (q.alive) {
      const m = q.mesh, ty = wy(q) + (S.sel === q ? .25 : 0); let y = m.position.y, vy = q.vy || 0;
      if (ty > y) { y += (ty - y) * Math.min(1, dt * 14); vy = 0; }   // lifting a selected tile
      else { vy -= 34 * dt; y += vy * dt; if (y <= ty) { if (vy < -5) impact(vy); y = ty; vy = vy < -1.5 ? -vy * .28 : 0; } }   // gravity + bounce
      q.vy = vy; m.position.set(wx(q), y, wz(q)); m.rotation.x += ((S.sel === q ? -.06 : 0) - m.rotation.x) * .2;
    }
    handStep('you', dt); handStep('cpu', dt);
    camY += (Math.max(0, S.top) * LG + DP - camY) * .05;
  }
  pitch += (tp - pitch) * .12; yaw += (ty - yaw) * .12; const dd = dist * zoom; cam.position.set(panX + Math.sin(yaw) * Math.cos(pitch) * dd, camY + Math.sin(pitch) * dd, panZ + Math.cos(yaw) * Math.cos(pitch) * dd); cam.lookAt(panX, camY, panZ);
  anims = anims.filter(a => { const p = (now - a.t) / 180; a.m.rotation.z = Math.sin(p * 18) * .12 * (1 - p); if (p >= 1) { a.m.rotation.z = 0; return false; } return true; });
  glowFx(now); r.render(scene, cam);
});
route();
