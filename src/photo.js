// 사진 한 장 → 캐릭터 재료 (얼굴 텍스처, 머리카락 색, 옷 색)
// 모든 처리는 브라우저 안에서만 한다. 원본 사진은 어디에도 보내지 않는다.
const $ = (s) => document.querySelector(s);

function avgColor(ctx, x, y, w, h) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
  w = Math.min(W - x, Math.floor(w)); h = Math.min(H - y, Math.floor(h));
  if (w < 4 || h < 4) return null;
  const d = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [r / n, g / n, b / n];
}
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function vivid(c, amt = 1.25) { const m = (c[0] + c[1] + c[2]) / 3; return c.map((v) => m + (v - m) * amt); }

function encode(src, sx, sy, size, out, maxChars) {
  const c = document.createElement('canvas'); c.width = c.height = out;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(src, sx, sy, size, size, 0, 0, out, out);
  let q = 0.82, url = c.toDataURL('image/jpeg', q);
  while (maxChars && url.length > maxChars && q > 0.2) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }
  return url;
}

export function createPhotoEditor(onDone) {
  const dlg = $('#photoedit'), cv = $('#photocanvas'), g = cv.getContext('2d');
  const size = $('#photosize'), file = $('#photofile');
  let img = null, work = null, wctx = null, scale = 1, crop = { x: 0, y: 0, r: 0 }, drag = null;

  function draw() {
    if (!img) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(work, 0, 0, cv.width, cv.height);
    // 바깥 어둡게
    g.save(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height);
    g.ellipse(crop.x * scale, crop.y * scale, crop.r * scale * 0.82, crop.r * scale, 0, 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
    g.strokeStyle = '#ffb04a'; g.lineWidth = 2; g.beginPath(); g.ellipse(crop.x * scale, crop.y * scale, crop.r * scale * 0.82, crop.r * scale, 0, 0, Math.PI * 2); g.stroke();
    // 색을 뽑는 영역 표시
    g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.strokeRect((crop.x - crop.r) * scale, (crop.y + crop.r * 1.35) * scale, crop.r * 2 * scale, crop.r * 1.3 * scale); g.setLineDash([]);
    const c = colors(); $('#photoshirt').style.background = c.shirt || 'transparent'; $('#photohair').style.background = c.hair || 'transparent';
  }
  function colors() {
    const s = avgColor(wctx, crop.x - crop.r * 0.9, crop.y + crop.r * 1.4, crop.r * 1.8, crop.r * 1.2);
    const h = avgColor(wctx, crop.x - crop.r * 0.45, crop.y - crop.r * 1.0, crop.r * 0.9, crop.r * 0.28);
    return { shirt: s ? hex(vivid(s)) : null, hair: h ? hex(h.map((v) => v * 0.9)) : null };
  }
  function load(f) {
    if (!f || !/^image\//.test(f.type)) { $('#photomsg').textContent = '이미지 파일을 골라 주세요'; return; }
    const url = URL.createObjectURL(f); const im = new Image();
    im.onload = () => {
      // 긴 변 1024px로 줄인 작업본
      const k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
      work = document.createElement('canvas'); work.width = Math.round(im.naturalWidth * k); work.height = Math.round(im.naturalHeight * k);
      wctx = work.getContext('2d', { willReadFrequently: true }); wctx.drawImage(im, 0, 0, work.width, work.height);
      URL.revokeObjectURL(url); img = im;
      const maxW = Math.min(420, window.innerWidth - 64), maxH = Math.min(420, window.innerHeight * 0.5);
      scale = Math.min(maxW / work.width, maxH / work.height);
      cv.width = Math.round(work.width * scale); cv.height = Math.round(work.height * scale);
      crop = { x: work.width / 2, y: work.height * 0.36, r: Math.min(work.width, work.height) * 0.2 };
      size.value = String(Math.round((crop.r / Math.min(work.width, work.height)) * 100));
      $('#photomsg').textContent = '동그라미를 끌어서 얼굴에 맞추고, 크기를 조절하세요';
      $('#photostep2').hidden = false; draw();
    };
    im.onerror = () => { $('#photomsg').textContent = '사진을 열 수 없어요. 다른 파일을 골라 주세요'; };
    im.src = url;
  }
  file.addEventListener('change', () => load(file.files && file.files[0]));
  dlg.addEventListener('dragover', (e) => e.preventDefault());
  dlg.addEventListener('drop', (e) => { e.preventDefault(); load(e.dataTransfer.files && e.dataTransfer.files[0]); });
  size.addEventListener('input', () => { if (!work) return; crop.r = (+size.value / 100) * Math.min(work.width, work.height); draw(); });
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width) / scale, y: (e.clientY - r.top) * (cv.height / r.height) / scale }; };
  cv.addEventListener('pointerdown', (e) => { if (!work) return; const p = pos(e); drag = { dx: crop.x - p.x, dy: crop.y - p.y, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = pos(e); crop.x = p.x + drag.dx; crop.y = p.y + drag.dy; draw(); });
  const end = () => { drag = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', (e) => { if (!work) return; e.preventDefault(); crop.r = Math.max(8, crop.r * (e.deltaY > 0 ? 0.95 : 1.05)); size.value = String(Math.round((crop.r / Math.min(work.width, work.height)) * 100)); draw(); }, { passive: false });

  $('#photoapply').addEventListener('click', () => {
    if (!work) return;
    const side = crop.r * 2, sx = crop.x - crop.r, sy = crop.y - crop.r;
    const c = colors();
    onDone({ face: encode(work, sx, sy, side, 128, 0), faceSmall: encode(work, sx, sy, side, 56, 2400), shirt: c.shirt, hair: c.hair });
    close();
  });
  $('#photoremove').addEventListener('click', () => { onDone(null); close(); });
  $('#photocancel').addEventListener('click', close);
  function close() { dlg.hidden = true; file.value = ''; }
  return {
    open() { dlg.hidden = false; if (!img) { $('#photostep2').hidden = true; $('#photomsg').textContent = '얼굴이 잘 보이는 사진 한 장을 골라 주세요. 상반신까지 나오면 옷 색도 따라 만들어져요.'; } else draw(); },
  };
}
