import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LAKE, WATER_Y, WORLD_R, obstacles, SEATS, heightAt, glowTex, createSky, createGround, createLake, createForest, createGrass, createRocks, createTents, createProps, createFireflies } from './world.js';
import { createCampfire } from './fire.js';
import { setAvatarAsset, createAvatar, updateAvatar, setLabel, say, react, playEmote, disposeAvatar } from './avatar.js';
import { connectNet } from './net.js';
import { createSound } from './sound.js';

const $ = (s) => document.querySelector(s);
const COLORS = ['#e2702a', '#d94a5a', '#e8c547', '#5fb37a', '#4f8fd9', '#8a6ad9', '#e98cc0', '#e9e4d8'];
const EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '🎵', '⭐', '😴'];
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
const r2 = (v) => Math.round(v * 100) / 100;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const IN_CLAUDE = !!(window.claude && window.claude.use);
const M = (n) => `assets/${n}${IN_CLAUDE ? '.gltf.json' : '.glb'}`; // 아티팩트는 .glb를 서빙하지 않음
const coarse = matchMedia('(pointer: coarse)').matches;
let quality = store.get('camp.quality') || (coarse ? 'low' : 'high');

/* ---------------- renderer ---------------- */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d1328, 0.016);
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 2000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- loading ---------------- */
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, l, t) => { $('#loadbar').style.width = Math.round((l / t) * 85) + '%'; };
const gltfL = new GLTFLoader(manager), texL = new THREE.TextureLoader(manager);
const loadTex = (u, srgb = true) => new Promise((res, rej) => texL.load(u, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; res(t); }, undefined, rej));

const world = {};
const sound = createSound();
let me = null;
const others = new Map();
let net = null, joined = false;
let dayAmt = 0, dayTarget = 0;
const wind = new THREE.Vector2(0.15, 0.05);

async function boot() {
  const [xbot, grassG, fw, fy, fb, r1, r2g, r3, tGrass, tDirt, tDirtN, tWater, tMoon, tSmoke, tSpark] = await Promise.all([
    gltfL.loadAsync(M('Xbot')), gltfL.loadAsync(M('grass')), gltfL.loadAsync(M('flower_white')), gltfL.loadAsync(M('flower_yellow')), gltfL.loadAsync(M('flower_blue')),
    gltfL.loadAsync(M('rock1')), gltfL.loadAsync(M('rock2')), gltfL.loadAsync(M('rock3')),
    loadTex('assets/grass.jpg'), loadTex('assets/dirt_color.jpg'), loadTex('assets/dirt_normal.jpg', false), loadTex('assets/waternormals.jpg', false),
    loadTex('assets/moon.jpg'), loadTex('assets/smoke.png'), loadTex('assets/spark.png'),
  ]);
  setStatusLoading('숲을 만드는 중…');
  await frame0();
  setAvatarAsset(xbot);
  const sky = createSky(scene, tMoon); world.sky = sky;
  // 조명
  world.hemi = new THREE.HemisphereLight(0x3a4c86, 0x0c120c, 0.55); scene.add(world.hemi);
  const moonL = new THREE.DirectionalLight(0xa8b8ff, 0.55);
  moonL.position.copy(sky.moonDir).multiplyScalar(60); moonL.castShadow = true;
  const sm = quality === 'high' ? 2048 : 1024; moonL.shadow.mapSize.set(sm, sm);
  Object.assign(moonL.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 }); moonL.shadow.bias = -0.0008; moonL.shadow.normalBias = 0.04;
  scene.add(moonL, moonL.target); world.moonL = moonL;
  createGround(scene, { grass: tGrass, dirt: tDirt, dirtN: tDirtN });
  world.water = createLake(scene, tWater, sky.moonDir, quality);
  await frame0();
  world.forest = createForest(scene, quality);
  await frame0();
  world.grass = createGrass(scene, grassG, [fw, fy, fb], quality);
  createRocks(scene, [r1, r2g, r3]);
  world.tentGlows = createTents(scene);
  // 장작/의자 껍질 질감은 소나무 나무껍질 재사용
  let barkMat = null; scene.traverse((o) => { if (!barkMat && o.isInstancedMesh && o.material && o.material.map && o.castShadow) barkMat = o.material; });
  barkMat = barkMat || new THREE.MeshStandardMaterial({ color: 0x5a4632 });
  world.props = createProps(scene, barkMat);
  world.fire = createCampfire(scene, { glow: glowTex('rgba(255,160,80,1)', 'rgba(255,120,40,0)'), smoke: tSmoke, spark: tSpark }, barkMat, quality);
  world.flies = createFireflies(scene, tSpark);
  // 내 손전등 (항상 존재, 세기만 바꿔 셰이더 재컴파일을 피함)
  world.torch = new THREE.SpotLight(0xfff0d6, 0, 26, 0.42, 0.45, 1.6); world.torch.castShadow = quality === 'high'; world.torch.shadow.mapSize.set(512, 512);
  scene.add(world.torch, world.torch.target);

  // 나
  const myNick0 = (store.get('camp.nick') || '').slice(0, 12) || '캠퍼' + Math.floor(100 + Math.random() * 900);
  const myColor0 = COLORS.includes(store.get('camp.color')) ? store.get('camp.color') : COLORS[Math.floor(Math.random() * COLORS.length)];
  me = createAvatar(scene, myColor0, myNick0);
  const a0 = Math.random() * Math.PI * 2; me.x = Math.sin(a0) * 8; me.z = Math.cos(a0) * 8; me.ry = Math.atan2(-me.x, -me.z);
  me.vy = 0; me.grounded = true;
  camYaw = a0;
  setupJoin(myNick0, myColor0);
  applyQuality();
  renderer.compile(scene, camera);
  $('#loadbar').style.width = '100%';
  $('#loading').hidden = true; $('#join').hidden = false;
  net = await connectNet().catch(() => null);
  wireNet();
}
function frame0() { return new Promise((r) => requestAnimationFrame(() => r())); }
function setStatusLoading(t) { const el = $('#loadtext'); if (el) el.textContent = t; }

/* ---------------- 입력 ---------------- */
const keys = new Set();
let camYaw = 0, camPitch = 0.28, camDist = 6.5, firstPerson = false;
const typing = () => document.activeElement && (document.activeElement.tagName === 'INPUT');
addEventListener('keydown', (e) => {
  if (!joined) return;
  if (typing()) { if (e.key === 'Escape') closeChat(); return; }
  if (e.key === 'Enter') { e.preventDefault(); openChat(); return; }
  keys.add(e.code);
  if (e.repeat) return;
  const map = { Space: 'jump', KeyE: 'sit', KeyF: 'mallow', KeyQ: 'wave', KeyG: 'fuel', KeyL: 'light', KeyN: 'night', KeyV: 'view', KeyR: 'nod', KeyT: 'shake', KeyH: 'help', KeyM: 'sound' };
  if (map[e.code]) { e.preventDefault(); act(map[e.code]); }
  if (/^Digit[1-8]$/.test(e.code)) sendReact(EMOJIS[+e.code.slice(5) - 1]);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.focus(); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  camYaw -= (e.clientX - drag.x) * 0.0055; camPitch = clamp(camPitch + (e.clientY - drag.y) * 0.004, -0.35, 1.25);
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * 0.008, 2.2, 16); }, { passive: false });
const joy = $('#joy'), knob = $('#knob'); let jx = 0, jy = 0, joyId = null;
if (coarse) joy.hidden = false;
function joyMove(e) { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy), M = 46; if (L > M) { dx *= M / L; dy *= M / L; } jx = dx / M; jy = dy / M; knob.style.transform = `translate(${dx}px, ${dy}px)`; }
joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = (e) => { if (e.pointerId !== joyId) return; joyId = null; jx = jy = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

/* ---------------- HUD ---------------- */
let toastTimer = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; el.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.style.opacity = 0; setTimeout(() => (el.hidden = true), 400); }, 2400); }
function logChat(nick, color, text) {
  const box = $('#chatlog'), d = document.createElement('div'), b = document.createElement('b');
  b.textContent = nick; b.style.color = color; d.append(b, document.createTextNode(text)); box.append(d);
  while (box.children.length > 7) box.firstChild.remove();
}
function openChat() { $('#chatform').hidden = false; $('#chatinput').focus(); keys.clear(); }
function closeChat() { $('#chatinput').value = ''; $('#chatform').hidden = true; canvas.focus(); }
$('#chatform').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#chatinput').value.replace(/\s+/g, ' ').trim().slice(0, 60); closeChat(); if (t) speak(t); });
document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { if (joined) act(b.dataset.act); }));
{
  const bar = $('#emojibar');
  EMOJIS.forEach((em, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = em; b.title = `${em} (${i + 1})`; b.addEventListener('click', () => joined && sendReact(em)); bar.append(b); });
}
$('#helpclose').addEventListener('click', () => { $('#help').hidden = true; });

/* ---------------- 상태 & 행동 ---------------- */
const myState = { emote: '', emoteAt: 0, say: '', sayAt: 0, react: '', reactAt: 0, fuelAt: 0 };
let dirty = false;
function speak(t) { const now = performance.now(); say(me, t, now); logChat(me.nick, me.color, t); myState.say = t; myState.sayAt = Date.now(); dirty = true; }
function emote(kind) { myState.emote = kind; myState.emoteAt = Date.now(); dirty = true; }
function sendReact(em) { react(me, em, performance.now()); myState.react = em; myState.reactAt = Date.now(); dirty = true; }
function nearestSeat() { let best = -1, bd = 1e9; SEATS.forEach((s, i) => { const d = Math.hypot(s.x - me.x, s.z - me.z); if (d < bd) { bd = d; best = i; } }); return { i: best, d: bd }; }
const fireDist = () => Math.hypot(me.x, me.z);
function act(kind) {
  const now = performance.now();
  switch (kind) {
    case 'chat': return openChat();
    case 'sound': sound.on ? sound.stop() : sound.start(); break;
    case 'wave': me.waveUntil = now + 2400; emote('wave'); break;
    case 'nod': playEmote(me, 'agree'); emote('nod'); break;
    case 'shake': playEmote(me, 'headShake'); emote('shake'); break;
    case 'jump': if (me.sit) { me.sit = false; dirty = true; } if (me.grounded) { me.vy = 5.2; me.grounded = false; emote('jump'); } break;
    case 'sit': {
      if (me.sit) { me.sit = false; dirty = true; break; }
      const s = nearestSeat(); if (s.d > 2.2) { toast('통나무나 캠핑 의자 가까이 가면 앉을 수 있어요'); break; }
      const st = SEATS[s.i]; me.x = st.x; me.z = st.z; me.ry = st.face; me.sitY = st.y; me.sit = true; dirty = true; break;
    }
    case 'mallow': {
      if (me.roast >= 0) {
        const r = me.roast; me.roast = -1; dirty = true;
        speak(r < 0.2 ? '덜 구웠다… 그래도 냠' : r < 0.7 ? '완벽한 황금빛! 냠냠' : r < 0.88 ? '살짝 탔지만 맛있어' : '숯이 됐다… 바삭');
      } else { if (fireDist() > 5) { toast('모닥불 가까이 가서 마시멜로를 꺼내 보세요'); break; } me.roast = 0; dirty = true; toast('불 가까이에서 굽는 중… F를 다시 누르면 먹어요'); }
      break;
    }
    case 'fuel': if (fireDist() > 4.5) { toast('모닥불 가까이에서 장작을 넣을 수 있어요'); break; } world.fire.addFuel(); myState.fuelAt = Date.now(); dirty = true; toast('장작을 넣었어요. 불이 커져요'); break;
    case 'light': me.light = !me.light; dirty = true; break;
    case 'night': dayTarget = dayTarget > 0.5 ? 0 : 1; toast(dayTarget ? '해가 뜨고 있어요' : '밤이 찾아와요'); break;
    case 'view': firstPerson = !firstPerson; break;
    case 'help': $('#help').hidden = !$('#help').hidden; break;
    case 'quality': quality = quality === 'high' ? 'low' : 'high'; store.set('camp.quality', quality); applyQuality(); toast(quality === 'high' ? '그래픽: 고품질' : '그래픽: 가볍게 (일부는 새로고침 후 적용)'); break;
    case 'photo': takePhoto(); break;
    case 'voice': toggleVoice(); break;
  }
  updateButtons();
}
function updateButtons() {
  const set = (a, on) => { const b = document.querySelector(`[data-act="${a}"]`); if (b) b.classList.toggle('active', !!on); };
  set('sit', me.sit); set('mallow', me.roast >= 0); set('light', me.light); set('sound', sound.on); set('night', dayTarget > 0.5); set('view', firstPerson); set('voice', voiceOn);
  const q = document.querySelector('[data-act="quality"]'); if (q) q.textContent = quality === 'high' ? '그래픽 고' : '그래픽 저';
}
function applyQuality() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1));
  bloom.enabled = true; bloom.strength = quality === 'high' ? 0.55 : 0.45;
  resize();
}
function takePhoto() {
  composer.render();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.92);
  const a = document.createElement('a'); a.href = url; a.download = `별빛캠핑장-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`; document.body.append(a); a.click(); a.remove();
  toast('사진을 저장했어요');
}
if (IN_CLAUDE) { const p = document.querySelector('[data-act="photo"]'); if (p) p.hidden = true; }

/* ---------------- 음성 대화 (P2P에서만) ---------------- */
let voiceOn = false;
const voiceEls = new Map();
async function toggleVoice() {
  if (!net || !net.voice) { toast('음성 대화는 GitHub Pages 주소에서만 쓸 수 있어요'); return; }
  if (voiceOn) { net.voice.stop(); voiceOn = false; dirty = true; toast('마이크를 껐어요'); updateButtons(); return; }
  try { await net.voice.start(); voiceOn = true; dirty = true; toast('마이크 켜짐 · 가까이 있는 사람에게 잘 들려요'); }
  catch { toast('마이크를 쓸 수 없어요. 브라우저 권한을 확인해 주세요'); }
  updateButtons();
}

/* ---------------- 네트워크 ---------------- */
function setStatus(mode, count) {
  $('#dot').classList.toggle('on', mode === 'on');
  $('#status').textContent = mode === 'on' ? `지금 ${count}명이 캠핑 중` : mode === 'off' ? '다시 연결하는 중…' : mode === 'solo' ? '혼자 모드 · 다른 캠퍼와 연결되지 않았어요' : '연결 중…';
}
function buildPresence() {
  return {
    nick: me.nick, color: me.color, x: r2(me.x), z: r2(me.z), ry: r2(me.ry), y: r2(me.jumpY), sit: me.sit, sy: r2(me.sitY || 0.5), roast: me.roast < 0 ? -1 : r2(me.roast), light: me.light, mic: voiceOn,
    say: myState.say, sayAt: myState.sayAt, emote: myState.emote, emoteAt: myState.emoteAt, react: myState.react, reactAt: myState.reactAt, fuelAt: myState.fuelAt,
  };
}
function readPresence(p) {
  const pr = p.presence || {};
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return {
    nick: str(pr.nick, 12).trim() || '손님', color: typeof pr.color === 'string' && /^#[0-9a-f]{6}$/i.test(pr.color) ? pr.color : '#a9a8b8',
    has: typeof pr.x === 'number', x: clamp(num(pr.x, 0), -WORLD_R, WORLD_R), z: clamp(num(pr.z, 0), -WORLD_R, WORLD_R), ry: num(pr.ry, 0), y: clamp(num(pr.y, 0), 0, 3),
    sit: pr.sit === true, sy: clamp(num(pr.sy, 0.5), 0.3, 0.7), roast: clamp(num(pr.roast, -1), -1, 1), light: pr.light === true, mic: pr.mic === true,
    say: str(pr.say, 60), sayAt: num(pr.sayAt, 0), emote: str(pr.emote, 12), emoteAt: num(pr.emoteAt, 0), react: EMOJIS.includes(pr.react) ? pr.react : '', reactAt: num(pr.reactAt, 0), fuelAt: num(pr.fuelAt, 0),
  };
}
function applyPeer(p, quiet) {
  if (p.sameTab || p.kind !== 'viewer') return;
  const s = readPresence(p); if (!s.has) return;
  let av = others.get(p.peer);
  if (!av) {
    av = createAvatar(scene, s.color, s.nick); av.x = av.tx = s.x; av.z = av.tz = s.z; av.ry = av.try = s.ry;
    av.lastSayAt = s.sayAt; av.lastEmoteAt = s.emoteAt; av.lastReactAt = s.reactAt; av.lastFuelAt = s.fuelAt; others.set(p.peer, av);
    if (!quiet) { toast(`${s.nick} 님이 캠핑장에 왔어요`); logChat(s.nick, s.color, ' 님이 모닥불 곁으로 왔어요'); }
  }
  setLabel(av, s.nick, s.color, false, s.mic);
  av.tx = s.x; av.tz = s.z; av.try = s.ry; av.ty = s.y; av.sit = s.sit; av.sitY = s.sy; av.roast = s.roast; av.light = s.light;
  const now = performance.now();
  if (s.sayAt && s.sayAt !== av.lastSayAt) { av.lastSayAt = s.sayAt; if (s.say) { say(av, s.say, now); logChat(s.nick, s.color, s.say); } }
  if (s.emoteAt && s.emoteAt !== av.lastEmoteAt) { av.lastEmoteAt = s.emoteAt; if (s.emote === 'wave') av.waveUntil = now + 2400; if (s.emote === 'nod') playEmote(av, 'agree'); if (s.emote === 'shake') playEmote(av, 'headShake'); }
  if (s.reactAt && s.reactAt !== av.lastReactAt) { av.lastReactAt = s.reactAt; if (s.react) react(av, s.react, now); }
  if (s.fuelAt && s.fuelAt !== av.lastFuelAt) { av.lastFuelAt = s.fuelAt; world.fire.addFuel(); }
}
function renderRoster(peers) {
  const ul = $('#roster'); ul.textContent = '';
  const list = peers.filter((p) => p.kind === 'viewer' && (p.sameTab ? joined : readPresence(p).has));
  list.forEach((p) => {
    const s = p.sameTab ? { nick: me.nick, color: me.color, mic: voiceOn } : readPresence(p);
    const li = document.createElement('li'), sw = document.createElement('span'), nm = document.createElement('span');
    sw.className = 'sw'; sw.style.background = s.color; nm.textContent = s.nick; li.append(sw, nm);
    if (s.mic) { const m = document.createElement('span'); m.className = 'tag'; m.textContent = '🎙'; li.append(m); }
    if (p.sameTab) { const m = document.createElement('span'); m.className = 'tag'; m.textContent = '나'; li.append(m); }
    ul.append(li);
  });
  if (net && net.room.connected()) setStatus('on', Math.max(1, list.length));
}
function wireNet() {
  if (!net) { setStatus('solo'); const v = document.querySelector('[data-act="voice"]'); if (v) v.hidden = true; return; }
  if (!net.voice) { const v = document.querySelector('[data-act="voice"]'); if (v) v.hidden = true; }
  const room = net.room; let first = true, offTimer = 0;
  room.onConnection((c) => { clearTimeout(offTimer); if (c) { renderRoster(room.peers()); dirty = true; } else offTimer = setTimeout(() => setStatus('off'), 2000); }, () => setStatus('solo'));
  room.onPeers((ch) => {
    const quiet = first || !joined; first = false;
    ch.joined.forEach((p) => applyPeer(p, quiet)); ch.updated.forEach((p) => applyPeer(p, !joined));
    ch.left.forEach((p) => { const av = others.get(p.peer); if (!av) return; others.delete(p.peer); disposeAvatar(av); if (joined) logChat(av.nick, av.color, ' 님이 텐트로 돌아갔어요'); });
    renderRoster(ch.peers);
  }, () => setStatus('solo'));
  if (net.voice) net.voice.onStream((peerId, stream) => {
    const old = voiceEls.get(peerId); if (old) { old.srcObject = null; old.remove(); voiceEls.delete(peerId); }
    if (!stream) return;
    const el = document.createElement('audio'); el.autoplay = true; el.srcObject = stream; el.volume = 0; document.body.append(el); voiceEls.set(peerId, el); el.play().catch(() => {});
  });
}

/* ---------------- 입장 ---------------- */
function setupJoin(nick, color) {
  let chosen = color;
  const box = $('#colors');
  COLORS.forEach((c) => {
    const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', '색 ' + c); b.setAttribute('aria-pressed', String(c === chosen));
    b.addEventListener('click', () => { chosen = c; me.body.color.set(c); box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
    box.append(b);
  });
  $('#nick').value = nick;
  $('#joinform').addEventListener('submit', (e) => {
    e.preventDefault();
    const n = $('#nick').value.replace(/\s+/g, ' ').trim().slice(0, 12) || nick;
    store.set('camp.nick', n); store.set('camp.color', chosen);
    setLabel(me, n, chosen, true);
    joined = true; $('#join').hidden = true; canvas.focus(); dirty = true;
    toast(`${n} 님, 어서 오세요! 모닥불로 가 보세요`);
    if (!sound.on) { try { sound.start(); } catch {} }
    updateButtons();
    if (net) renderRoster(net.room.peers());
    if (!store.get('camp.helpSeen')) { $('#help').hidden = false; store.set('camp.helpSeen', '1'); }
  });
}

/* ---------------- 미니맵 ---------------- */
const mini = $('#minimap'), mg = mini.getContext('2d');
function drawMinimap() {
  const W = mini.width, S = W / 2 / 40; // 반경 40m
  mg.clearRect(0, 0, W, W);
  mg.save(); mg.beginPath(); mg.arc(W / 2, W / 2, W / 2 - 2, 0, 7); mg.clip();
  mg.fillStyle = 'rgba(14,22,18,0.85)'; mg.fillRect(0, 0, W, W);
  mg.translate(W / 2, W / 2); mg.rotate(camYaw); // 카메라 방향이 위로
  const P = (x, z) => [(x - me.x) * S, (z - me.z) * S];
  mg.fillStyle = 'rgba(70,58,40,0.9)'; { const [x, z] = P(0, 0); mg.beginPath(); mg.arc(x, z, 10 * S, 0, 7); mg.fill(); }
  mg.fillStyle = 'rgba(40,80,130,0.9)'; { const [x, z] = P(LAKE.x, LAKE.z); mg.beginPath(); mg.arc(x, z, LAKE.r * S, 0, 7); mg.fill(); }
  mg.fillStyle = '#ff8a3c'; { const [x, z] = P(0, 0); mg.beginPath(); mg.arc(x, z, 3.5, 0, 7); mg.fill(); }
  others.forEach((av) => { const [x, z] = P(av.x, av.z); mg.fillStyle = av.color; mg.beginPath(); mg.arc(x, z, 4, 0, 7); mg.fill(); });
  mg.restore();
  mg.save(); mg.translate(W / 2, W / 2); mg.rotate(camYaw - me.ry + Math.PI);
  mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -7); mg.lineTo(5, 5); mg.lineTo(0, 2); mg.lineTo(-5, 5); mg.closePath(); mg.fill(); mg.restore();
  mg.strokeStyle = 'rgba(255,196,120,0.35)'; mg.lineWidth = 2; mg.beginPath(); mg.arc(W / 2, W / 2, W / 2 - 2, 0, 7); mg.stroke();
}

/* ---------------- 루프 ---------------- */
function collide(p) {
  for (const o of obstacles) { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), R = o.r + 0.32; if (d < R && d > 1e-4) { p.x = o.x + (dx / d) * R; p.z = o.z + (dz / d) * R; } }
  const d = Math.hypot(p.x, p.z); if (d > WORLD_R) { p.x *= WORLD_R / d; p.z *= WORLD_R / d; }
}
let lastPresenceKey = '', lastSent = 0, lastRoster = 0;
const tmpV = new THREE.Vector3(), camTarget = new THREE.Vector3(), camWant = new THREE.Vector3();
const dayCol = { top: new THREE.Color(0x3d78c9), hor: new THREE.Color(0xb9d3ea), fog: new THREE.Color(0xa9c1d6) };
const nightCol = { top: new THREE.Color(0x02040c), hor: new THREE.Color(0x111a35), fog: new THREE.Color(0x0d1328) };
function step(dt, now) {
  const t = now / 1000;
  // --- 이동 ---
  let ix = 0, iz = 0;
  if (joined && !typing()) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    ix += jx; iz -= jy;
  }
  const L = Math.hypot(ix, iz); let speed = 0;
  if (L > 0.12) {
    if (me.sit) { me.sit = false; updateButtons(); dirty = true; }
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    const dx = (-s * iz + c * ix) / Math.max(1, L), dz = (-c * iz - s * ix) / Math.max(1, L);
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || (coarse && L > 0.95);
    speed = (run ? 5.4 : 1.9) * Math.min(1, L);
    me.x += dx * speed * dt; me.z += dz * speed * dt; collide(me);
    me.ry += angDiff(me.ry, Math.atan2(dx, dz)) * Math.min(1, dt * (firstPerson ? 20 : 10));
  }
  me.speed += (speed - me.speed) * Math.min(1, dt * 10);
  // 점프 물리
  if (!me.grounded) { me.vy -= 14 * dt; me.jumpY += me.vy * dt; if (me.jumpY <= 0) { me.jumpY = 0; me.vy = 0; me.grounded = true; } }
  // 마시멜로
  const fd = fireDist();
  if (me.roast >= 0 && fd < 4.4) { me.roast = Math.min(1, me.roast + dt * (fd < 3 ? 0.1 : 0.05) * (1 + world.fire.boost)); if (me.speed < 0.2 && !me.sit) me.ry += angDiff(me.ry, Math.atan2(-me.x, -me.z)) * Math.min(1, dt * 4); }
  const gy = me.sit ? 0 : heightAt(me.x, me.z);
  updateAvatar(me, dt, now, gy);
  me.model.visible = !firstPerson; me.label.visible = !firstPerson;

  // --- 다른 사람 ---
  const k = 1 - Math.exp(-dt * 9);
  others.forEach((av, id) => {
    const dx = av.tx - av.x, dz = av.tz - av.z; const dist = Math.hypot(dx, dz);
    if (dist > 8) { av.x = av.tx; av.z = av.tz; } else { av.x += dx * k; av.z += dz * k; }
    av.speed += ((av.sit ? 0 : Math.min(7, (dist * k) / Math.max(dt, 1e-3))) - av.speed) * Math.min(1, dt * 6);
    av.ry += angDiff(av.ry, av.try) * k; av.jumpY += ((av.ty || 0) - av.jumpY) * Math.min(1, dt * 15);
    updateAvatar(av, dt, now, av.sit ? 0 : heightAt(av.x, av.z));
    const el = voiceEls.get(id); if (el) el.volume = clamp(1 - Math.hypot(av.x - me.x, av.z - me.z) / 16, 0, 1) ** 1.5;
  });

  // --- 손전등 ---
  const tor = world.torch;
  tor.intensity += ((me.light ? 22 : 0) - tor.intensity) * Math.min(1, dt * 10);
  me.bones.lHand.getWorldPosition(tor.position);
  tmpV.set(Math.sin(me.ry), -0.22, Math.cos(me.ry)).multiplyScalar(8).add(tor.position); tor.target.position.copy(tmpV);

  // --- 프롬프트 ---
  const pr = $('#prompt'); let msg = '';
  if (joined) {
    if (me.roast >= 0) msg = fd < 4.4 ? `굽는 중 ${Math.round(me.roast * 100)}% · F 먹기` : '불 가까이 가야 구워져요';
    else if (!me.sit && nearestSeat().d < 2.2) msg = fd < 5 ? 'E 앉기 · F 마시멜로 · G 장작' : 'E 앉기';
    else if (fd < 5) msg = 'F 마시멜로 · G 장작 넣기';
  }
  if (pr.textContent !== msg) { pr.textContent = msg; pr.hidden = !msg; }

  // --- presence ---
  if (net && joined && now - lastSent > 100) {
    const p = buildPresence(); const key = JSON.stringify(p);
    if (key !== lastPresenceKey || dirty) { net.room.presence(p).catch(() => {}); lastPresenceKey = key; lastSent = now; dirty = false; }
  }
  if (net && now - lastRoster > 2000) { lastRoster = now; renderRoster(net.room.peers()); }

  // --- 낮/밤 ---
  dayAmt += (dayTarget - dayAmt) * Math.min(1, dt * 0.6);
  const d = dayAmt;
  world.sky.uniforms.uTop.value.copy(nightCol.top).lerp(dayCol.top, d);
  world.sky.uniforms.uHorizon.value.copy(nightCol.hor).lerp(dayCol.hor, d);
  world.sky.uniforms.uStars.value = 1 - d; world.sky.uniforms.uTime.value = t;
  scene.fog.color.copy(nightCol.fog).lerp(dayCol.fog, d); scene.fog.density = 0.016 - d * 0.008;
  world.hemi.intensity = 0.55 + d * 1.6; world.hemi.color.setHex(d > 0.5 ? 0xbcd4ff : 0x3a4c86); world.hemi.groundColor.setHex(d > 0.5 ? 0x4a5a3a : 0x0c120c);
  world.moonL.intensity = 0.55 + d * 2.6; world.moonL.color.setRGB(0.66 + d * 0.34, 0.72 + d * 0.23, 1 - d * 0.12);
  world.sky.moon.visible = world.sky.glow.visible = d < 0.6; world.sky.moon.material.opacity = 1 - d;
  renderer.toneMappingExposure = 1.0 - d * 0.15;
  bloom.threshold = 0.85 + d * 0.12;
  world.flies.points.visible = d < 0.5;
  world.props.bulbs.forEach((m) => { m.emissiveIntensity = 2.2 * (1 - d * 0.8); });
  // 그림자 카메라를 플레이어 따라
  world.moonL.target.position.set(me.x, 0, me.z); world.moonL.position.copy(world.sky.moonDir).multiplyScalar(60).add(world.moonL.target.position);

  // --- 환경 갱신 ---
  wind.set(0.2 + Math.sin(t * 0.13) * 0.15, 0.08 + Math.cos(t * 0.09) * 0.1);
  world.fire.update(dt, t, camera, wind);
  world.water.material.uniforms.time.value = t * 0.35;
  world.forest.update(t); world.grass.update(t); world.flies.update(t);
  world.props.lights.forEach((l) => { l.light.intensity = l.base * (0.92 + Math.random() * 0.08) * (1 - d * 0.7); });
  world.tentGlows.forEach((g, i) => { g.opacity = (0.16 + Math.sin(t * 1.3 + i) * 0.03) * (1 - d * 0.8); });
  sound.set(fd, Math.max(0, Math.hypot(me.x - LAKE.x, me.z - LAKE.z) - LAKE.r), 1 - d);

  // --- 카메라 ---
  const headY = gy + me.jumpY + (me.sit ? 1.15 : 1.62) - (me.sit ? 0.0 : 0);
  if (firstPerson) {
    camTarget.set(me.x + Math.sin(me.ry) * 0.25, headY + 0.02, me.z + Math.cos(me.ry) * 0.25);
    camera.position.copy(camTarget);
    if (L > 0.12) camYaw += angDiff(camYaw, me.ry + Math.PI) * Math.min(1, dt * 6);
    tmpV.set(-Math.sin(camYaw) * Math.cos(camPitch - 0.3), -Math.sin(camPitch - 0.3), -Math.cos(camYaw) * Math.cos(camPitch - 0.3)).add(camTarget);
    camera.lookAt(tmpV);
  } else {
    camTarget.set(me.x, headY - 0.1, me.z);
    camWant.set(me.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, headY + Math.sin(camPitch) * camDist, me.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
    const floor = heightAt(camWant.x, camWant.z) + 0.35; if (camWant.y < floor) camWant.y = floor;
    camera.position.lerp(camWant, Math.min(1, dt * 9));
    camera.lookAt(camTarget);
  }
  if (!joined) camYaw += dt * 0.06;
  drawMinimap();
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); bloom.resolution.set(w / 2, h / 2); }
addEventListener('resize', resize);
let prev = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (me) { step(dt, now); composer.render(); }
  requestAnimationFrame(loop);
}
resize();
boot().then(() => requestAnimationFrame(loop)).catch((e) => {
  console.error(e); $('#loadtext').textContent = '불러오기에 실패했어요. 새로고침해 주세요. (' + (e && e.message ? e.message : e) + ')';
});
window.__camp = { get me() { return me; }, act, scene, camera, setCam(y, p, d) { camYaw = y; camPitch = p; camDist = d; }, others };
