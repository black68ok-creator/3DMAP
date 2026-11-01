// 모닥불: 셰이더 불꽃 + 불티 + 연기 + 숯불 + 흔들리는 조명
import * as THREE from 'three';

const flameVert = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const flameFrag = `
uniform float uTime, uSeed, uPower;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec2 uv = vUv;
  float t = uTime * 1.6 + uSeed * 10.0;
  float y = uv.y;
  // 위로 흐르는 난류
  vec2 q = vec2(uv.x * 2.2 + uSeed, y * 1.6 - t);
  float turb = fbm(q * 2.0 + fbm(q * 1.3 + vec2(0.0, -t * 0.5)));
  float x = (uv.x - 0.5) * 2.0 + (turb - 0.5) * 0.9 * y;
  // 물방울 모양 외곽
  float width = mix(0.62, 0.0, pow(y, 0.7));
  float body = 1.0 - smoothstep(width * 0.35, width, abs(x));
  float core = 1.0 - smoothstep(0.0, width * 0.55, abs(x));
  float lick = smoothstep(0.15, 0.85, turb + (1.0 - y) * 0.55);
  float flame = body * lick * smoothstep(0.0, 0.07, y) * (1.0 - smoothstep(0.75, 1.0, y));
  flame = clamp(flame * (0.75 + uPower * 0.45), 0.0, 1.0);
  float hot = core * (1.0 - y) * flame;
  vec3 col = vec3(0.55, 0.06, 0.0) * flame;
  col = mix(col, vec3(1.0, 0.36, 0.04), smoothstep(0.15, 0.55, flame));
  col = mix(col, vec3(1.0, 0.75, 0.32), smoothstep(0.45, 0.9, flame) * 0.9);
  col += vec3(1.0, 0.85, 0.55) * smoothstep(0.4, 0.85, hot) * 0.45;
  // 뿌리 쪽 파란 기운
  col += vec3(0.1, 0.25, 0.9) * (1.0 - smoothstep(0.0, 0.12, y)) * body * 0.5;
  gl_FragColor = vec4(col * 1.35, flame);
}`;

export function createCampfire(scene, tex, barkMat, quality) {
  const group = new THREE.Group(); scene.add(group);
  const charred = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.95, emissive: 0xff3a00, emissiveIntensity: 0.0 });
  const logMat = barkMat.clone(); logMat.color = new THREE.Color(0x5a4a3c);
  // 장작 (원뿔형으로 기댄)
  const logs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.15, 10), i % 2 ? logMat : charred);
    l.position.set(Math.sin(a) * 0.3, 0.38, Math.cos(a) * 0.3);
    l.lookAt(0, 1.6, 0); l.rotateX(Math.PI / 2);
    l.castShadow = true; group.add(l); logs.push(l);
  }
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 10), charred); const a = i * 2.1;
    l.rotation.set(Math.PI / 2, 0, a); l.position.set(Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15); l.rotation.order = 'YXZ'; l.rotation.y = a; group.add(l);
  }
  // 숯
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x110805, roughness: 1, emissive: 0xff4a10, emissiveIntensity: 2.2 });
  const coalGeo = new THREE.DodecahedronGeometry(0.06, 0);
  const coals = new THREE.InstancedMesh(coalGeo, coalMat, 40);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.6; p.set(Math.sin(a) * r, 0.03, Math.cos(a) * r); q.setFromEuler(e.set(Math.random() * 3, Math.random() * 3, 0)); s.setScalar(0.6 + Math.random() * 1.2); m.compose(p, q, s); coals.setMatrixAt(i, m); }
  group.add(coals);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 })); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.012; ash.receiveShadow = true; group.add(ash);

  // 불꽃 판들
  const flames = [];
  const defs = [[0, 0, 1.25, 1.7, 0.1], [0.14, 0.08, 0.95, 1.35, 0.5], [-0.16, 0.05, 0.9, 1.25, 0.9], [0.05, -0.16, 0.85, 1.1, 1.3], [-0.05, -0.05, 0.7, 1.95, 1.7]];
  defs.forEach(([x, z, w, hgt, seed]) => {
    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uPower: { value: 1 } }, vertexShader: flameVert, fragmentShader: flameFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    const f = new THREE.Mesh(geo, mat); f.position.set(x, 0.12, z); f.scale.set(w * 1.6, hgt, 1); f.userData = { w: w * 1.6, h: hgt };
    f.renderOrder = 5; group.add(f); flames.push(f);
  });
  // 불빛 후광
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xff7a2a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.5, depthWrite: false }));
  halo.scale.set(4.5, 4.5, 1); halo.position.y = 0.9; group.add(halo);

  // 불티
  const NS = quality === 'high' ? 160 : 80;
  const sparkPos = new Float32Array(NS * 3), sparkData = [];
  for (let i = 0; i < NS; i++) sparkData.push({ life: Math.random() * 2.5, max: 2.5, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0 });
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ map: tex.spark, color: new THREE.Color(0xffa040).multiplyScalar(3), size: 0.09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = new THREE.Points(sg, sparkMat); sparks.frustumCulled = false; group.add(sparks);

  // 연기
  const NM = quality === 'high' ? 26 : 14;
  const smoke = [];
  for (let i = 0; i < NM; i++) {
    const sm = new THREE.SpriteMaterial({ map: tex.smoke, color: 0x6a6660, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(sm); sp.userData = { life: Math.random() * 6, max: 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 };
    group.add(sp); smoke.push(sp);
  }

  // 조명
  const light = new THREE.PointLight(0xff8a3c, 30, 0, 1.6);
  light.position.set(0, 1.0, 0); light.castShadow = true;
  light.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
  light.shadow.bias = -0.002; light.shadow.normalBias = 0.03; light.shadow.camera.near = 0.3; light.shadow.camera.far = 40;
  group.add(light);
  const bounce = new THREE.PointLight(0xff6020, 6, 9, 2); bounce.position.set(0, 0.25, 0); group.add(bounce);

  let boost = 0;
  const camPos = new THREE.Vector3();
  return {
    group, light,
    addFuel() { boost = 1; for (let i = 0; i < 40; i++) { const d = sparkData[Math.floor(Math.random() * NS)]; d.life = 0; } },
    get boost() { return boost; },
    update(dt, t, camera, wind) {
      boost = Math.max(0, boost - dt / 25);
      const power = 1 + boost * 0.8;
      camera.getWorldPosition(camPos);
      const ang = Math.atan2(camPos.x - group.position.x, camPos.z - group.position.z);
      flames.forEach((f, i) => {
        f.material.uniforms.uTime.value = t; f.material.uniforms.uPower.value = power;
        f.rotation.y = ang + (i % 2 ? 0.25 : -0.25);
        const fl = 0.92 + Math.sin(t * (7 + i * 1.7)) * 0.05 + Math.random() * 0.05;
        f.scale.set(f.userData.w * (1 + boost * 0.35), f.userData.h * fl * (1 + boost * 0.6), 1);
      });
      const flick = 0.82 + Math.sin(t * 10.3) * 0.06 + Math.sin(t * 23.1) * 0.04 + Math.random() * 0.12;
      light.intensity = 30 * flick * power; bounce.intensity = 6 * flick * power;
      light.position.x = Math.sin(t * 7) * 0.05; light.position.z = Math.cos(t * 5.3) * 0.05;
      halo.material.opacity = 0.35 + flick * 0.15 + boost * 0.2;
      coalMat.emissiveIntensity = 1.6 + Math.sin(t * 2.3) * 0.5 + Math.random() * 0.3;
      charred.emissiveIntensity = 0.25 + Math.sin(t * 1.7) * 0.1;
      // 불티
      const a = sg.attributes.position;
      sparkData.forEach((d, i) => {
        d.life -= dt;
        if (d.life <= 0) {
          d.max = d.life = 0.8 + Math.random() * 2.2; d.x = (Math.random() - 0.5) * 0.5; d.z = (Math.random() - 0.5) * 0.5; d.y = 0.4;
          d.vx = (Math.random() - 0.5) * 0.6; d.vz = (Math.random() - 0.5) * 0.6; d.vy = 1.2 + Math.random() * 1.8 + boost * 2;
          if (Math.random() > 0.35 + boost * 0.5) d.y = -50; // 가끔만
        }
        d.vx += (Math.sin(t * 3 + i) * 0.8 + wind.x) * dt; d.vz += (Math.cos(t * 2.6 + i) * 0.8 + wind.y) * dt; d.vy -= 0.25 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        a.setXYZ(i, d.x, d.y, d.z);
      });
      a.needsUpdate = true;
      // 연기
      smoke.forEach((sp) => {
        const u = sp.userData; u.life += dt;
        if (u.life > u.max) { u.life = 0; u.max = 5 + Math.random() * 4; sp.position.set((Math.random() - 0.5) * 0.3, 1.3, (Math.random() - 0.5) * 0.3); u.rot = Math.random() * 6; }
        const k = u.life / u.max;
        sp.position.y += dt * (0.7 + boost * 0.4); sp.position.x += (wind.x * 0.6 + Math.sin(t * 0.7 + u.rot) * 0.1) * dt; sp.position.z += (wind.y * 0.6) * dt;
        const sc = 0.6 + k * 3.2; sp.scale.set(sc, sc, 1);
        u.rot += u.vr * dt; sp.material.rotation = u.rot;
        sp.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.3)) * 0.13 * (1 - k * 0.5);
      });
    },
  };
}
