// 캠핑장 환경: 지형, 하늘, 호수, 나무, 풀, 바위, 텐트, 소품
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Tree, TreePreset } from '@dgreenheck/ez-tree';

export const LAKE = { x: 27, z: -19, r: 11 };
export const WATER_Y = -0.42;
export const WORLD_R = 62;
export const obstacles = [];
export const SEATS = [];
export const PATH = [new THREE.Vector2(6.5, -4.5), new THREE.Vector2(LAKE.x - LAKE.r * 0.72, LAKE.z + LAKE.r * 0.72)];

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(20261101);

/* ---------- 지형 높이 ---------- */
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f); f *= 2; a *= 0.5; } return s; }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, a, b) {
  const abx = b.x - a.x, abz = b.y - a.y; const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (pz - a.y) * abz) / (abx * abx + abz * abz)));
  return Math.hypot(px - (a.x + abx * t), pz - (a.y + abz * t));
}
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  let h = (fbm(x * 0.035 + 10, z * 0.035 + 10) - 0.45) * 3.2 * ss(12, 36, r) * ss(LAKE.r + 2, LAKE.r + 12, dl);
  h += ss(58, 120, r) * 16 * (0.45 + fbm(x * 0.012, z * 0.012));
  const bowl = 1 - ss(LAKE.r - 4, LAKE.r + 2, dl);
  return h * (1 - bowl) - 1.9 * bowl;
}
export function isClearing(x, z, pad = 0) {
  if (Math.hypot(x, z) < 11 + pad) return true;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 2.5 + pad) return true;
  if (segDist(x, z, PATH[0], PATH[1]) < 1.6 + pad) return true;
  return false;
}

/* ---------- 텍스처 유틸 ---------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function fabricNormal() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 16) { g.fillStyle = 'rgb(100,128,255)'; g.fillRect(i, 0, 2, h); g.fillStyle = 'rgb(128,100,255)'; g.fillRect(0, i, w, 2); }
    const id = g.getImageData(0, 0, w, h); for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; id.data[i] += n; id.data[i + 1] += n; } g.putImageData(id, 0, 0);
  }, false);
}
function woodTex(base = [120, 84, 52]) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * h, l = 40 + Math.random() * 300, x = Math.random() * w, d = Math.random() * 40 - 20;
      g.strokeStyle = `rgba(${base[0] + d - 30},${base[1] + d - 25},${base[2] + d - 20},${0.25 + Math.random() * 0.4})`;
      g.lineWidth = 0.5 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l / 3, y + Math.random() * 4 - 2, x + l * 2 / 3, y + Math.random() * 4 - 2, x + l, y); g.stroke();
    }
    for (let i = 0; i < 4; i++) { const x = Math.random() * w, y = Math.random() * h; const gr = g.createRadialGradient(x, y, 1, x, y, 10); gr.addColorStop(0, 'rgba(50,30,15,0.8)'); gr.addColorStop(1, 'rgba(50,30,15,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 14, 6, 0, 0, 7); g.fill(); }
  });
}
function ringTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b48a5a'; g.fillRect(0, 0, w, h);
    for (let r = 4; r < 128; r += 3 + Math.random() * 4) { g.strokeStyle = `rgba(110,72,40,${0.3 + Math.random() * 0.4})`; g.lineWidth = 1 + Math.random(); g.beginPath(); g.ellipse(128, 128, r, r * (0.95 + Math.random() * 0.1), 0, 0, 7); g.stroke(); }
    g.strokeStyle = '#3d2615'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(60,35,20,0.6)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = Math.random() * 6.28; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); g.stroke(); }
  });
}
export function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.35)')); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

/* ---------- 하늘 ---------- */
export function createSky(scene, moonTex) {
  const uniforms = {
    uTop: { value: new THREE.Color(0x02040c) }, uHorizon: { value: new THREE.Color(0x111a35) }, uGround: { value: new THREE.Color(0x05070c) },
    uStars: { value: 1 }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uHorizon, uGround; uniform float uStars, uTime; varying vec3 vDir;
      float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 col = mix(uHorizon, uTop, pow(clamp(y,0.0,1.0), 0.55));
        if (y < 0.0) col = mix(uHorizon, uGround, smoothstep(0.0, -0.15, y));
        if (uStars > 0.001 && y > 0.0) {
          float fade = smoothstep(0.0, 0.25, y) * uStars;
          // 은하수
          float band = exp(-pow(dot(d, normalize(vec3(0.45, 0.35, -0.82))), 2.0) * 28.0);
          float cloud = n3(d*9.0)*0.6 + n3(d*23.0)*0.4;
          col += vec3(0.33, 0.33, 0.48) * band * cloud * 0.22 * fade;
          for (int k = 0; k < 2; k++) {
            float sc = k == 0 ? 260.0 : 520.0;
            vec3 p = d * sc; vec3 ip = floor(p); float s = h3(ip + float(k)*17.0);
            float th = k == 0 ? 0.992 : 0.985 - band*0.02;
            if (s > th) {
              vec3 fp = fract(p) - 0.5; float dd = length(fp);
              float tw = 0.65 + 0.35 * sin(uTime * (1.5 + s * 9.0) + s * 120.0);
              vec3 sc3 = mix(vec3(1.0,0.85,0.7), vec3(0.75,0.85,1.0), fract(s*91.0));
              col += sc3 * smoothstep(0.32, 0.0, dd) * tw * fade * (k == 0 ? 2.2 : 0.9) * (s - th) / (1.0 - th);
            }
          }
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const moonDir = new THREE.Vector3(-0.45, 0.5, -0.74).normalize();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 20), new THREE.MeshBasicMaterial({ map: moonTex, color: 0xe8e4d4, fog: false }));
  moon.position.copy(moonDir).multiplyScalar(700); moon.rotation.y = 2.3; scene.add(moon);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(190,205,255,0.55)', 'rgba(190,205,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glow.scale.setScalar(150); glow.position.copy(moon.position); scene.add(glow);
  return { sky, uniforms, moon, glow, moonDir };
}

/* ---------- 지형 ---------- */
export function createGround(scene, tex) {
  const SIZE = 340, SEG = 240;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tGrass = { value: tex.grass }; sh.uniforms.tDirt = { value: tex.dirt }; sh.uniforms.tDirtN = { value: tex.dirtN };
    sh.uniforms.uLake = { value: new THREE.Vector3(LAKE.x, LAKE.z, LAKE.r) };
    sh.uniforms.uPath = { value: new THREE.Vector4(PATH[0].x, PATH[0].y, PATH[1].x, PATH[1].y) };
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `
      uniform sampler2D tGrass, tDirt, tDirtN; uniform vec3 uLake; uniform vec4 uPath; varying vec3 vWPos;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y); }
      float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
      float dirtMask(){
        vec2 w = vWPos.xz; float n = gn(w*0.35)*2.2 + gn(w*1.6)*0.7 - 1.3;
        float m = 1.0 - smoothstep(8.5, 11.5, length(w) + n);
        m = max(m, 1.0 - smoothstep(uLake.z + 0.6, uLake.z + 2.6, length(w - uLake.xy) + n*0.7));
        m = max(m, 1.0 - smoothstep(0.7, 1.6, sdSeg(w, uPath.xy, uPath.zw) + n*0.35));
        return clamp(m, 0.0, 1.0);
      }
    ` + sh.fragmentShader.replace('#include <map_fragment>', `
      vec2 wuv = vWPos.xz;
      vec3 g1 = texture2D(tGrass, wuv * 0.21).rgb;
      vec3 g2 = texture2D(tGrass, wuv * 0.037 + 0.3).rgb;
      vec3 grassC = mix(g1, g2, 0.45) * vec3(0.62, 0.78, 0.6);
      float var = gn(wuv*0.08);
      grassC *= mix(0.75, 1.15, var);
      vec3 dirtC = texture2D(tDirt, wuv * 0.28).rgb * vec3(0.9, 0.85, 0.8);
      float dm = dirtMask();
      vec3 gcol = mix(grassC, dirtC, dm);
      gcol *= mix(1.0, 0.3, smoothstep(-0.25, -1.4, vWPos.y));
      diffuseColor.rgb *= gcol;
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      {
        float dmn = dirtMask();
        vec3 tn = texture2D(tDirtN, vWPos.xz * 0.28).xyz * 2.0 - 1.0;
        normal = normalize(mix(normal, normalize(normal + (tn.x * vec3(1.0,0.0,0.0) + tn.y * vec3(0.0,0.0,1.0)) * 0.6 * (mat3(viewMatrix) * vec3(0.0,1.0,0.0)).y ), dmn * 0.6));
      }
    `);
  };
  const ground = new THREE.Mesh(geo, mat); ground.receiveShadow = true; scene.add(ground);
  return ground;
}

/* ---------- 호수 ---------- */
export function createLake(scene, normals, lightDir, quality) {
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  const water = new Water(new THREE.CircleGeometry(LAKE.r + 3.5, 72), {
    textureWidth: quality === 'high' ? 512 : 256, textureHeight: quality === 'high' ? 512 : 256,
    waterNormals: normals, sunDirection: lightDir.clone(), sunColor: 0xa8b8e8, waterColor: 0x02121c, distortionScale: 1.6, fog: true,
  });
  water.rotation.x = -Math.PI / 2; water.position.set(LAKE.x, WATER_Y, LAKE.z);
  water.material.uniforms.size.value = 3.5;
  scene.add(water);
  obstacles.push({ x: LAKE.x, z: LAKE.z, r: LAKE.r - 0.4 });
  return water;
}

/* ---------- 나무 ---------- */
export function createForest(scene, quality) {
  const variants = [
    { preset: 'Pine Large', seed: 101, h: [12, 17] }, { preset: 'Pine Medium', seed: 202, h: [9, 13] },
    { preset: 'Pine Medium', seed: 303, h: [8, 12] }, { preset: 'Pine Small', seed: 404, h: [5, 8] },
    { preset: 'Aspen Medium', seed: 505, h: [8, 11] }, { preset: 'Bush 1', seed: 606, h: [0.9, 1.6], bush: true }, { preset: 'Bush 2', seed: 707, h: [0.8, 1.4], bush: true },
  ];
  const trees = variants.map((v) => {
    const t = new Tree(); const json = structuredClone(TreePreset[v.preset]); json.seed = v.seed; t.loadFromJson(json);
    t.branchesMesh.geometry.computeBoundingBox(); const bb = t.branchesMesh.geometry.boundingBox;
    const lb = new THREE.Box3().setFromBufferAttribute(t.leavesMesh.geometry.attributes.position);
    v.baseH = Math.max(bb.max.y, lb.max.y); v.tree = t; v.items = [];
    // 밤 숲 톤
    if (t.leavesMesh.material.color) t.leavesMesh.material.color.multiplyScalar(0.55);
    if (t.branchesMesh.material.color) t.branchesMesh.material.color.multiplyScalar(0.7);
    return v;
  });
  const placed = [];
  const tryPlace = (minR, maxR, n, pick) => {
    for (let i = 0; i < n * 8 && n > 0; i++) {
      const a = rand() * Math.PI * 2, rr = minR + Math.pow(rand(), 0.85) * (maxR - minR);
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      if (isClearing(x, z, 2)) continue;
      const v = variants[pick()];
      const sep = v.bush ? 1.6 : 3.4;
      if (placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < sep * (p[2] && v.bush ? 0.6 : 1))) continue;
      placed.push([x, z, v.bush]);
      const H = v.h[0] + rand() * (v.h[1] - v.h[0]);
      v.items.push({ x, z, s: H / v.baseH, ry: rand() * Math.PI * 2 });
      if (!v.bush) obstacles.push({ x, z, r: 0.35 + H * 0.02 });
      n--;
    }
  };
  const treeCount = quality === 'high' ? 210 : 120;
  tryPlace(13, 95, treeCount, () => { const r = rand(); return r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.75 ? 2 : r < 0.9 ? 3 : 4; });
  tryPlace(10, 45, quality === 'high' ? 70 : 35, () => (rand() < 0.5 ? 5 : 6));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  trees.forEach((v) => {
    if (!v.items.length) return;
    const b = new THREE.InstancedMesh(v.tree.branchesMesh.geometry, v.tree.branchesMesh.material, v.items.length);
    const l = new THREE.InstancedMesh(v.tree.leavesMesh.geometry, v.tree.leavesMesh.material, v.items.length);
    v.items.forEach((it, i) => {
      pos.set(it.x, heightAt(it.x, it.z) - 0.15, it.z); q.setFromAxisAngle(up, it.ry); s.setScalar(it.s);
      m.compose(pos, q, s); b.setMatrixAt(i, m); l.setMatrixAt(i, m);
    });
    b.castShadow = !v.bush; b.receiveShadow = true; l.receiveShadow = true;
    scene.add(b, l);
  });
  return { update(t) { trees.forEach((v) => v.tree.update(t)); } };
}

/* ---------- 풀, 꽃 ---------- */
export function appendWind(material, strength = 0.12) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = { value: 0 };
    material.userData.shader = sh;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float wph = ip.x * 0.35 + ip.z * 0.27;
      float sway = (0.6 * sin(uTime * 1.6 + wph) + 0.3 * sin(uTime * 3.1 + wph * 1.7) + 0.1 * sin(uTime * 7.0 + wph * 3.0));
      transformed.x += sway * ${strength.toFixed(3)} * max(position.y, 0.0);
      transformed.z += sway * ${(strength * 0.6).toFixed(3)} * max(position.y, 0.0);
    `);
  };
}
export function createGrass(scene, grassGltf, flowerGltfs, quality) {
  const src = grassGltf.scene.getObjectByProperty('isMesh', true);
  const mat = new THREE.MeshLambertMaterial({ map: src.material.map, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x6f8a62 });
  appendWind(mat, 0.18);
  const N = quality === 'high' ? 14000 : 5000;
  const inst = new THREE.InstancedMesh(src.geometry, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let i = 0; i < N * 4 && n < N; i++) {
    const a = rand() * Math.PI * 2, rr = 8 + Math.pow(rand(), 0.7) * 52;
    const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
    const patch = vnoise(x * 0.18, z * 0.18);
    if (patch < 0.38 || isClearing(x, z, -0.3) || heightAt(x, z) < WATER_Y + 0.05) continue;
    p.set(x, heightAt(x, z) - 0.03, z); q.setFromAxisAngle(up, rand() * 6.28);
    const sc = 0.13 + rand() * 0.14 + patch * 0.08; s.set(sc, sc * (0.8 + rand() * 0.8), sc);
    m.compose(p, q, s); inst.setMatrixAt(n++, m);
  }
  inst.count = n; inst.receiveShadow = true; scene.add(inst);
  const mats = [mat];
  flowerGltfs.forEach((fg) => {
    const fl = fg.scene.children[0];
    const meshes = []; fl.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const count = quality === 'high' ? 70 : 30;
    const insts = meshes.map((me) => {
      const fm = new THREE.MeshLambertMaterial({ map: me.material.map || null, color: me.material.color ? me.material.color.clone().multiplyScalar(0.7) : 0xffffff, side: THREE.DoubleSide, alphaTest: 0.5 });
      appendWind(fm, 0.004); mats.push(fm);
      return new THREE.InstancedMesh(me.geometry, fm, count);
    });
    let k = 0;
    for (let i = 0; i < count * 10 && k < count; i++) {
      const a = rand() * 6.28, rr = 11 + rand() * 30; const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      if (isClearing(x, z, 0.4) || vnoise(x * 0.18, z * 0.18) < 0.5) continue;
      p.set(x, heightAt(x, z), z); q.setFromAxisAngle(up, rand() * 6.28); s.setScalar(0.004 + rand() * 0.003);
      m.compose(p, q, s); insts.forEach((im) => im.setMatrixAt(k, m)); k++;
    }
    insts.forEach((im) => { im.count = k; scene.add(im); });
  });
  return { update(t) { mats.forEach((mm) => { if (mm.userData.shader) mm.userData.shader.uniforms.uTime.value = t; }); } };
}

/* ---------- 바위 ---------- */
export function createRocks(scene, rockGltfs) {
  const meshes = rockGltfs.map((g) => g.scene.getObjectByProperty('isMesh', true));
  meshes.forEach((me) => { me.material = me.material.clone(); me.material.color.multiplyScalar(0.55); me.material.roughness = 0.9; });
  const groups = meshes.map(() => []);
  // 모닥불 돌
  for (let i = 0; i < 13; i++) { const a = (i / 13) * Math.PI * 2 + rand() * 0.1; groups[i % 3].push({ x: Math.sin(a) * 1.02, z: Math.cos(a) * 1.02, y: 0.05, s: 0.17 + rand() * 0.05, r: rand() * 6 }); }
  // 흩어진 바위
  for (let i = 0; i < 70; i++) {
    const a = rand() * 6.28, rr = 9 + rand() * 55; const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
    if (isClearing(x, z, 0.5) && Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE.r + 4) continue;
    const s = rand() < 0.15 ? 0.9 + rand() * 0.9 : 0.15 + rand() * 0.4;
    groups[i % 3].push({ x, z, y: heightAt(x, z) - s * 0.3, s, r: rand() * 6 });
    if (s > 0.6) obstacles.push({ x, z, r: s * 0.9 });
  }
  // 호숫가 돌
  for (let i = 0; i < 22; i++) { const a = rand() * 6.28, rr = LAKE.r + 0.3 + rand() * 1.4; const x = LAKE.x + Math.sin(a) * rr, z = LAKE.z + Math.cos(a) * rr; if (segDist(x, z, PATH[0], PATH[1]) < 2.2) continue; groups[i % 3].push({ x, z, y: heightAt(x, z) - 0.05, s: 0.15 + rand() * 0.35, r: rand() * 6 }); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  meshes.forEach((me, gi) => {
    const list = groups[gi]; const inst = new THREE.InstancedMesh(me.geometry, me.material, list.length);
    list.forEach((it, i) => { p.set(it.x, it.y, it.z); q.setFromEuler(e.set(rand() * 0.4, it.r, rand() * 0.4)); s.set(it.s, it.s * (0.6 + rand() * 0.4), it.s); m.compose(p, q, s); inst.setMatrixAt(i, m); });
    inst.castShadow = inst.receiveShadow = true; scene.add(inst);
  });
}

/* ---------- 텐트 ---------- */
const fabricN = fabricNormal();
function tentMesh(color, L = 2.7, W = 1.55, H = 1.45) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, normalMap: fabricN, normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide });
  const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.35), roughness: 0.9, side: THREE.DoubleSide });
  // 지붕 두 면 (처짐 포함)
  [-1, 1].forEach((sd) => {
    const geo = new THREE.PlaneGeometry(1, 1, 18, 10); const pp = geo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const u = pp.getX(i) + 0.5, v = 0.5 - pp.getY(i); // u: 길이방향, v: 능선(0)→바닥(1)
      const sag = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.09;
      const flare = (1 - Math.sin(Math.PI * u)) * v * v * 0.12;
      pp.setXYZ(i, sd * (W * v + flare - sag * 0.5), H * (1 - v) - sag * 0.7, (u - 0.5) * (L + v * 0.25));
    }
    geo.computeVertexNormals();
    const roof = new THREE.Mesh(geo, mat); roof.castShadow = roof.receiveShadow = true; g.add(roof);
  });
  // 뒷면
  const tri = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(0, h); s.closePath(); return new THREE.ShapeGeometry(s); };
  const back = new THREE.Mesh(tri(W, H), mat); back.position.z = -L / 2 - 0.02; back.castShadow = true; g.add(back);
  // 앞면: 열린 문 + 걷어 올린 플랩
  const frontL = new THREE.Shape(); frontL.moveTo(-W, 0); frontL.lineTo(-0.42, 0); frontL.lineTo(0, H * 0.82); frontL.lineTo(0, H); frontL.closePath();
  const fl = new THREE.Mesh(new THREE.ShapeGeometry(frontL), mat); fl.position.z = L / 2 + 0.02; fl.castShadow = true; g.add(fl);
  const fr = fl.clone(); fr.scale.x = -1; g.add(fr);
  const dark = new THREE.Mesh(tri(0.46, H * 0.84), new THREE.MeshBasicMaterial({ color: 0x080605 })); dark.position.z = L / 2 - 0.3; g.add(dark);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, L), inner); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; g.add(floor);
  // 폴대, 줄, 팩
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.8, roughness: 0.35 });
  [-1, 1].forEach((e) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, H + 0.12, 6), poleMat); pole.position.set(0, (H + 0.12) / 2, e * (L / 2 + 0.03)); pole.castShadow = true; g.add(pole);
    const top = new THREE.Vector3(0, H + 0.08, e * (L / 2 + 0.03)), peg = new THREE.Vector3(0, 0.02, e * (L / 2 + 1.25));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([top, peg]), new THREE.LineBasicMaterial({ color: 0x3e3a32 })); g.add(line);
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 0.15, 5), poleMat); pm.position.copy(peg); g.add(pm);
    [-1, 1].forEach((sd) => {
      const corner = new THREE.Vector3(sd * W, 0.03, e * (L / 2 + 0.12)); const pg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.004, 0.12, 5), poleMat); pg.position.copy(corner); g.add(pg);
    });
  });
  return g;
}
export function createTents(scene) {
  const defs = [[-6.8, 3.6, 0x2b6077, false], [6.6, 4.3, 0xa14a2c, true], [-2.4, -7.6, 0x5c7232, false], [5.9, -5.6, 0x6b4a86, true]];
  const glows = [];
  defs.forEach(([x, z, c, glow]) => {
    const t = tentMesh(c); t.position.set(x, heightAt(x, z), z); t.rotation.y = Math.atan2(-x, -z);
    if (glow) {
      // 안쪽 랜턴 불빛이 비치는 천
      const gm = new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const s = new THREE.Shape(); s.moveTo(-0.45, 0); s.lineTo(0.45, 0); s.lineTo(0, 1.2); s.closePath();
      const gp = new THREE.Mesh(new THREE.ShapeGeometry(s), gm); gp.position.z = 1.05; t.add(gp); glows.push(gm);
    }
    scene.add(t); obstacles.push({ x, z, r: 1.85 });
  });
  return glows;
}

/* ---------- 통나무 의자, 소품 ---------- */
export function createProps(scene, barkMat) {
  const bark = barkMat.clone(); if (bark.map) { bark.map = bark.map.clone(); bark.map.repeat.set(2, 1); bark.map.needsUpdate = true; }
  if (bark.normalMap) { bark.normalMap = bark.normalMap.clone(); bark.normalMap.repeat.set(2, 1); bark.normalMap.needsUpdate = true; }
  bark.color = new THREE.Color(0x8a7a6a);
  const cut = new THREE.MeshStandardMaterial({ map: ringTex(), roughness: 0.85 });
  const lights = [];
  // 통나무 의자
  [0.5, 2.6, 4.7].forEach((a) => {
    const R = 3.75, x = Math.sin(a) * R, z = Math.cos(a) * R;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = a;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 2.4, 20, 1), [bark, cut, cut]);
    log.rotation.z = Math.PI / 2; log.position.y = 0.27; log.castShadow = log.receiveShadow = true; g.add(log); scene.add(g);
    const tx = Math.cos(a), tz = -Math.sin(a);
    [-0.65, 0.65].forEach((o) => SEATS.push({ x: x + tx * o, z: z + tz * o, y: 0.5, face: Math.atan2(-(x + tx * o), -(z + tz * o)) }));
  });
  // 장작 더미
  {
    const g = new THREE.Group(); g.position.set(-4.4, 0, -4.2); g.rotation.y = 0.8;
    const geo = new THREE.CylinderGeometry(0.09, 0.1, 0.9, 10);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 5 - row; i++) {
      const l = new THREE.Mesh(geo, [bark, cut, cut]); l.rotation.x = Math.PI / 2; l.position.set((i - (4 - row) / 2) * 0.2, 0.1 + row * 0.17, (rand() - 0.5) * 0.08); l.rotation.z = (rand() - 0.5) * 0.1; l.castShadow = true; g.add(l);
    }
    scene.add(g); obstacles.push({ x: -4.4, z: -4.2, r: 0.6 });
  }
  // 그루터기와 도끼
  {
    const g = new THREE.Group(); g.position.set(-3.2, 0, -5.6);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.5, 20), [bark, cut, cut]); st.position.y = 0.25; st.castShadow = true; g.add(st);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.75, 8), new THREE.MeshStandardMaterial({ map: woodTex([150, 108, 66]), roughness: 0.6 }));
    handle.position.set(0.05, 0.78, 0.05); handle.rotation.z = 0.5; g.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.03), new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.9, roughness: 0.35 }));
    head.position.set(-0.1, 0.52, 0.05); head.rotation.z = 0.5 + Math.PI / 2; g.add(head);
    scene.add(g); obstacles.push({ x: -3.2, z: -5.6, r: 0.5 });
  }
  // 아이스박스 + 랜턴
  {
    const g = new THREE.Group(); g.position.set(3.6, 0, 6.3); g.rotation.y = -0.5;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: 0x2d5f9a, roughness: 0.45 })); box.position.y = 0.21; box.castShadow = box.receiveShadow = true; g.add(box);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.44), new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.4 })); lid.position.y = 0.45; lid.castShadow = true; g.add(lid);
    const lan = new THREE.Group(); lan.position.set(0.12, 0.49, 0);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2e3236, metalness: 0.7, roughness: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.05, 16), metal); base.position.y = 0.025; lan.add(base);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 0.2, transparent: true, opacity: 0.9 })); glass.position.y = 0.13; lan.add(glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 16), metal); cap.position.y = 0.24; lan.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 16), metal); ring.position.y = 0.3; lan.add(ring);
    g.add(lan);
    const pl = new THREE.PointLight(0xffb060, 1.4, 10, 2); pl.position.set(0.12, 1.05, 0.25); g.add(pl); lights.push({ light: pl, base: 1.4, glass: glass.material });
    scene.add(g); obstacles.push({ x: 3.6, z: 6.3, r: 0.5 });
  }
  // 캠핑 의자 2개
  const chairFabric = [0x8b2f2f, 0x2f5f4a];
  [[-1.2, 6.4], [1.4, -6.6]].forEach(([x, z], ci) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z);
    const metal = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.6, roughness: 0.45 });
    const fab = new THREE.MeshStandardMaterial({ color: chairFabric[ci], roughness: 0.85, side: THREE.DoubleSide, normalMap: fabricN, normalScale: new THREE.Vector2(0.4, 0.4) });
    const leg = (x1, y1, z1, x2, y2, z2) => { const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2); const len = a.distanceTo(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), metal); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); c.castShadow = true; g.add(c); };
    leg(-0.25, 0, 0.25, 0.25, 0.42, -0.2); leg(0.25, 0, 0.25, -0.25, 0.42, -0.2); leg(-0.25, 0, -0.25, 0.25, 0.42, 0.25); leg(0.25, 0, -0.25, -0.25, 0.42, 0.25);
    leg(-0.26, 0.42, -0.22, -0.26, 0.95, -0.32); leg(0.26, 0.42, -0.22, 0.26, 0.95, -0.32);
    const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.46, 6, 6), fab); const sp = seat.geometry.attributes.position; for (let i = 0; i < sp.count; i++) { const u = sp.getX(i), v = sp.getY(i); sp.setZ(i, -(1 - (u / 0.26) ** 2) * 0.05); } seat.geometry.computeVertexNormals();
    seat.rotation.x = -Math.PI / 2; seat.position.y = 0.42; seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.5), fab); back.position.set(0, 0.7, -0.27); back.rotation.x = 0.2; back.castShadow = true; g.add(back);
    scene.add(g); obstacles.push({ x, z, r: 0.4 });
    SEATS.push({ x: x * 0.97, z: z * 0.97, y: 0.44, face: Math.atan2(-x, -z), chair: true });
  });
  // 전구 줄
  const bulbs = [];
  {
    const A = new THREE.Vector3(-8.6, 3.0, -2.2), B = new THREE.Vector3(8.4, 3.0, -1.2);
    const poleM = new THREE.MeshStandardMaterial({ map: woodTex([90, 64, 42]), roughness: 0.8 });
    [A, B].forEach((p) => { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.1, 8), poleM); pole.position.set(p.x, 1.55, p.z); pole.castShadow = true; scene.add(pole); obstacles.push({ x: p.x, z: p.z, r: 0.2 }); });
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * 0.95; pts.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x111111 })));
    const geo = new THREE.SphereGeometry(0.055, 10, 8); const cols = [0xffc870, 0xffe2a8, 0xff9f6a];
    for (let i = 1; i < 26; i++) {
      const t = i / 26, p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * 0.95 + 0.07;
      const mm = new THREE.MeshStandardMaterial({ color: cols[i % 3], emissive: cols[i % 3], emissiveIntensity: 2.2 });
      const b = new THREE.Mesh(geo, mm); b.position.copy(p); scene.add(b); bulbs.push(mm);
    }
  }
  // 선착장
  {
    const plank = new THREE.MeshStandardMaterial({ map: woodTex([112, 86, 62]), roughness: 0.85 });
    const g = new THREE.Group(); const sx = PATH[1].x, sz = PATH[1].y;
    const dir = Math.atan2(LAKE.x - sx, LAKE.z - sz);
    g.position.set(sx, 0, sz); g.rotation.y = dir;
    for (let i = 0; i < 16; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.24), plank); p.position.set((rand() - 0.5) * 0.04, 0.12, i * 0.27); p.rotation.y = (rand() - 0.5) * 0.03; p.castShadow = p.receiveShadow = true; g.add(p); }
    for (let i = 0; i < 3; i++) [-0.7, 0.7].forEach((xx) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), plank); post.position.set(xx, -0.45, i * 2 + 0.2); g.add(post); });
    scene.add(g);
  }
  return { bulbs, lights };
}

/* ---------- 반딧불 ---------- */
export function createFireflies(scene, sparkTex) {
  const N = 90, pos = new Float32Array(N * 3), base = [];
  for (let i = 0; i < N; i++) {
    const near = i < 50; const a = rand() * 6.28, rr = near ? LAKE.r + rand() * 7 : 12 + rand() * 22;
    base.push({ x: (near ? LAKE.x : 0) + Math.sin(a) * rr, z: (near ? LAKE.z : 0) + Math.cos(a) * rr, y: 0.4 + rand() * 1.8, p: rand() * 10 });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: sparkTex, color: new THREE.Color(0xc8ff60).multiplyScalar(2.5), size: 0.22, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(g, mat); scene.add(pts);
  return {
    points: pts, mat,
    update(t) {
      const a = g.attributes.position;
      base.forEach((b, i) => a.setXYZ(i, b.x + Math.sin(t * 0.4 + b.p) * 1.6, heightAt(b.x, b.z) + b.y + Math.sin(t * 1.1 + b.p * 2) * 0.4, b.z + Math.cos(t * 0.35 + b.p) * 1.6));
      a.needsUpdate = true; mat.opacity = 0.6 + Math.sin(t * 2.1) * 0.35;
    },
  };
}
