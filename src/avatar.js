// 사람 캐릭터: 리깅된 GLB + 애니메이션 블렌딩 + 뼈대 방향 지정(앉기, 손 흔들기, 꼬챙이 들기, 점프)
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let asset = null;
export function setAvatarAsset(gltf) {
  const clips = {};
  gltf.animations.forEach((c) => { clips[c.name] = c; });
  // 끄덕/도리도리는 additive 클립으로 변환
  ['agree', 'headShake'].forEach((n) => { if (clips[n]) { clips[n] = clips[n].clone(); THREE.AnimationUtils.makeClipAdditive(clips[n]); } });
  asset = { gltf, clips };
}

const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function textSprite(draw, w, h, scale) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  s.scale.set(scale * (w / h), scale, 1); s.renderOrder = 20; return s;
}
function makeLabel(text, color, speaking) {
  return textSprite((g, w, h) => {
    g.font = `40px ${FONT}`; const tw = Math.min(w - 20, g.measureText(text).width + 56);
    g.fillStyle = 'rgba(10,12,24,0.62)'; roundRect(g, (w - tw) / 2, 8, tw, h - 16, 24); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc((w - tw) / 2 + 24, h / 2, 9, 0, 7); g.fill();
    if (speaking) { g.strokeStyle = '#8cc79a'; g.lineWidth = 4; roundRect(g, (w - tw) / 2, 8, tw, h - 16, 24); g.stroke(); }
    g.fillStyle = '#f1ece0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2 + 10, h / 2 + 2);
  }, 512, 76, 0.3);
}
function makeBubble(text) {
  return textSprite((g, w, h) => {
    g.font = `36px ${FONT}`;
    const lines = []; let cur = '';
    for (const ch of text) { if (g.measureText(cur + ch).width > w - 70) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur); const L = lines.slice(0, 3);
    const lh = 44, bh = L.length * lh + 30, bw = Math.min(w - 10, Math.max(...L.map((l) => g.measureText(l).width)) + 50);
    const x = (w - bw) / 2, y = h - bh - 22;
    g.fillStyle = 'rgba(248,243,230,0.95)'; roundRect(g, x, y, bw, bh, 24); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 14, y + bh - 1); g.lineTo(w / 2 + 14, y + bh - 1); g.lineTo(w / 2, h - 4); g.fill();
    g.fillStyle = '#1d1a24'; g.textAlign = 'center'; g.textBaseline = 'middle';
    L.forEach((l, i) => g.fillText(l, w / 2, y + 15 + lh / 2 + i * lh));
  }, 640, 220, 1.0);
}
function makeEmoji(e) {
  return textSprite((g, w, h) => { g.font = `96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, w / 2, h / 2 + 6); }, 128, 128, 0.5);
}
const disposeSprite = (s) => { if (!s) return; s.parent && s.parent.remove(s); s.material.map.dispose(); s.material.dispose(); };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _want = new THREE.Vector3(), _cur = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
// 뼈 bone 이 자식 child 쪽으로 향하는 방향을, 아바타 기준 방향 dir 로 돌린다 (가중치 w)
function aim(root, bone, child, dir, w) {
  if (w <= 0.001 || !bone || !child) return;
  _want.copy(dir).normalize().transformDirection(root.matrixWorld);
  bone.getWorldPosition(_a); child.getWorldPosition(_b); _cur.subVectors(_b, _a).normalize();
  _q.setFromUnitVectors(_cur, _want); if (w < 1) _q.copy(_q2.identity().slerp(_q, w));
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}

export function createAvatar(scene, color, nick) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(asset.gltf.scene);
  root.add(model);
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.05 });
  const joints = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.45, metalness: 0.4 });
  model.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; o.material = /Joints/i.test(o.name) ? joints : body; }
  });
  const B = (n) => model.getObjectByName('mixamorig' + n);
  const bones = {
    hips: B('Hips'), spine: B('Spine1'), head: B('Head'),
    rArm: B('RightArm'), rFore: B('RightForeArm'), rHand: B('RightHand'), rHandEnd: B('RightHandMiddle1'),
    lArm: B('LeftArm'), lFore: B('LeftForeArm'), lHand: B('LeftHand'), lHandEnd: B('LeftHandMiddle1'),
    rUp: B('RightUpLeg'), rLeg: B('RightLeg'), rFoot: B('RightFoot'), rToe: B('RightToeBase'),
    lUp: B('LeftUpLeg'), lLeg: B('LeftLeg'), lFoot: B('LeftFoot'), lToe: B('LeftToeBase'),
  };
  // 오른쪽이 아바타 기준 어느 x 방향인지 (모델마다 다를 수 있어 측정)
  root.updateMatrixWorld(true);
  const side = bones.rArm.getWorldPosition(new THREE.Vector3()).x < 0 ? -1 : 1;
  const hipsY = bones.hips.getWorldPosition(new THREE.Vector3()).y;

  const mixer = new THREE.AnimationMixer(model);
  const act = {};
  ['idle', 'walk', 'run'].forEach((n) => { act[n] = mixer.clipAction(asset.clips[n]); act[n].play(); act[n].setEffectiveWeight(n === 'idle' ? 1 : 0); });
  ['agree', 'headShake'].forEach((n) => { const a = mixer.clipAction(asset.clips[n]); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; a.blendMode = THREE.AdditiveAnimationBlendMode; act[n] = a; });
  mixer.timeScale = 1;
  act.idle.time = Math.random() * 3;

  // 마시멜로 꼬챙이 + 손전등
  const stick = new THREE.Group();
  const stickRod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 }));
  stickRod.rotation.x = Math.PI / 2; stickRod.position.z = 0.55; stick.add(stickRod);
  const mallowMat = new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: 0.75, emissive: 0x000000 });
  const mallow = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 14), mallowMat); mallow.rotation.x = Math.PI / 2; mallow.position.z = 1.1; stick.add(mallow);
  stick.visible = false; root.add(stick);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1d0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  beam.geometry.translate(0, -3.5, 0); beam.geometry.rotateX(-Math.PI / 2 + 0.22); beam.visible = false; root.add(beam);
  const torchLens = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6dc })); torchLens.visible = false; root.add(torchLens);

  scene.add(root);
  const av = {
    root, model, mixer, act, bones, side, hipsY, body, color, nick,
    label: null, bubble: null, bubbleUntil: 0, emojis: [], speaking: false,
    w: { idle: 1, walk: 0, run: 0, sit: 0, wave: 0, hold: 0, tuck: 0 },
    x: 0, z: 0, y: 0, ry: 0, tx: 0, tz: 0, try: 0, speed: 0,
    sit: false, sitY: 0.5, roast: -1, waveUntil: 0, jumpY: 0, light: false, lastSayAt: 0, lastEmoteAt: 0, lastReactAt: 0, lastFuelAt: 0,
    stick, mallowMat, beam, torchLens,
  };
  setLabel(av, nick, color, true);
  return av;
}

export function setLabel(av, nick, color, force, speaking = false) {
  if (!force && av.nick === nick && av.color === color && av.speaking === speaking) return;
  if (av.color !== color) av.body.color.set(color);
  av.nick = nick; av.color = color; av.speaking = speaking;
  disposeSprite(av.label); av.label = makeLabel(nick, color, speaking); av.label.position.y = 2.12; av.root.add(av.label);
}
export function say(av, text, now) {
  disposeSprite(av.bubble); av.bubble = makeBubble(text); av.bubble.position.y = 2.75; av.root.add(av.bubble); av.bubbleUntil = now + 7000;
}
export function react(av, emoji, now) {
  const s = makeEmoji(emoji); s.position.set((Math.random() - 0.5) * 0.3, 2.3, 0); av.root.add(s); av.emojis.push({ s, t0: now });
}
export function playEmote(av, name) {
  const a = av.act[name]; if (!a) return; a.reset(); a.setEffectiveWeight(1); a.play();
}
export function disposeAvatar(av) {
  disposeSprite(av.label); disposeSprite(av.bubble); av.emojis.forEach((e) => disposeSprite(e.s));
  av.mixer.stopAllAction(); av.root.parent && av.root.parent.remove(av.root);
  av.body.dispose();
}
export function roastColor(r) {
  const c = new THREE.Color(0xfff8ee);
  if (r < 0.55) c.lerp(new THREE.Color(0xc98a3a), r / 0.55);
  else c.set(0xc98a3a).lerp(new THREE.Color(0x1e130c), Math.min(1, (r - 0.55) / 0.4));
  return c;
}

const _hand = new THREE.Vector3();
// 매 프레임 갱신. speed: m/s, now: ms
export function updateAvatar(av, dt, now, groundY) {
  const k = Math.min(1, dt * 8);
  const sp = av.speed;
  const tIdle = av.sit ? 1 : sp < 0.15 ? 1 : 0;
  const tRun = av.sit ? 0 : sp > 3.2 ? 1 : 0;
  const tWalk = av.sit ? 0 : 1 - tIdle - tRun;
  const w = av.w;
  w.idle += (tIdle - w.idle) * k; w.walk += (tWalk - w.walk) * k; w.run += (tRun - w.run) * k;
  av.act.idle.setEffectiveWeight(w.idle); av.act.walk.setEffectiveWeight(w.walk); av.act.run.setEffectiveWeight(w.run);
  av.act.walk.setEffectiveTimeScale(Math.max(0.6, Math.min(1.6, sp / 1.7)));
  av.act.run.setEffectiveTimeScale(Math.max(0.7, Math.min(1.4, sp / 5.2)));
  w.sit += ((av.sit ? 1 : 0) - w.sit) * Math.min(1, dt * 5);
  w.wave += ((now < av.waveUntil ? 1 : 0) - w.wave) * Math.min(1, dt * 7);
  w.hold += ((av.roast >= 0 ? 1 : 0) - w.hold) * Math.min(1, dt * 6);
  w.tuck += ((av.jumpY > 0.05 ? 1 : 0) - w.tuck) * Math.min(1, dt * 12);

  av.root.position.set(av.x, groundY + av.jumpY - w.sit * (av.hipsY - av.sitY - 0.06) * 1.0, av.z);
  av.root.rotation.y = av.ry;
  av.mixer.update(dt);
  av.root.updateMatrixWorld(true);

  const b = av.bones, s = av.side, R = av.root;
  // 앉기: 허벅지 앞으로, 정강이 아래로, 팔은 무릎 위
  if (w.sit > 0.01) {
    aim(R, b.lUp, b.lLeg, V(-s * 0.12, 0.05, 1), w.sit); aim(R, b.rUp, b.rLeg, V(s * 0.12, 0.05, 1), w.sit);
    aim(R, b.lLeg, b.lFoot, V(-s * 0.05, -1, 0.12), w.sit); aim(R, b.rLeg, b.rFoot, V(s * 0.05, -1, 0.12), w.sit);
    aim(R, b.lFoot, b.lToe, V(0, -0.35, 1), w.sit); aim(R, b.rFoot, b.rToe, V(0, -0.35, 1), w.sit);
    aim(R, b.lArm, b.lFore, V(-s * 0.25, -0.75, 0.55), w.sit * (1 - 0)); aim(R, b.lFore, b.lHand, V(s * 0.1, -0.35, 1), w.sit);
    aim(R, b.rArm, b.rFore, V(s * 0.25, -0.75, 0.55), w.sit * (1 - w.wave) * (1 - w.hold)); aim(R, b.rFore, b.rHand, V(-s * 0.1, -0.35, 1), w.sit * (1 - w.wave) * (1 - w.hold));
  }
  // 점프: 다리 살짝 접기
  if (w.tuck > 0.01) {
    aim(R, b.lUp, b.lLeg, V(0, -0.75, 0.65), w.tuck * 0.8); aim(R, b.rUp, b.rLeg, V(0, -0.75, 0.65), w.tuck * 0.8);
    aim(R, b.lLeg, b.lFoot, V(0, -1, -0.55), w.tuck * 0.8); aim(R, b.rLeg, b.rFoot, V(0, -1, -0.55), w.tuck * 0.8);
  }
  // 꼬챙이 들기
  if (w.hold > 0.01) {
    aim(R, b.rArm, b.rFore, V(s * 0.35, -0.55, 0.75), w.hold * (1 - w.wave));
    aim(R, b.rFore, b.rHand, V(-s * 0.05, 0.05, 1), w.hold * (1 - w.wave));
  }
  // 손 흔들기
  if (w.wave > 0.01) {
    const osc = Math.sin(now / 110) * 0.45;
    aim(R, b.rArm, b.rFore, V(s * 0.75, 0.55, 0.15), w.wave);
    aim(R, b.rFore, b.rHand, V(s * (0.1 + osc), 1, 0.15), w.wave);
  }
  // 꼬챙이는 손 위치에서 앞쪽 위로
  av.stick.visible = w.hold > 0.5;
  if (av.stick.visible) {
    b.rHand.getWorldPosition(_hand); R.worldToLocal(_hand);
    av.stick.position.copy(_hand); av.stick.rotation.set(-0.35, -s * 0.12, 0);
    av.mallowMat.color.copy(roastColor(Math.max(0, av.roast)));
    av.mallowMat.emissive.setHex(av.roast > 0.25 && av.roast < 0.9 ? 0x3a1400 : 0x000000);
  }
  // 손전등
  av.beam.visible = av.torchLens.visible = av.light;
  if (av.light) {
    b.lHand.getWorldPosition(_hand); R.worldToLocal(_hand);
    av.torchLens.position.copy(_hand); av.beam.position.copy(_hand);
  }
  // 말풍선, 이모지
  if (av.bubble && now > av.bubbleUntil) { disposeSprite(av.bubble); av.bubble = null; }
  const headY = 2.12 - w.sit * 0.62;
  if (av.label) av.label.position.y = headY;
  if (av.bubble) av.bubble.position.y = headY + 0.62;
  av.emojis = av.emojis.filter((e) => {
    const t = (now - e.t0) / 2200; if (t >= 1) { disposeSprite(e.s); return false; }
    e.s.position.y = headY + 0.25 + t * 1.1; e.s.material.opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; const sc = 0.5 * (t < 0.12 ? t / 0.12 : 1); e.s.scale.set(sc, sc, 1);
    return true;
  });
}
