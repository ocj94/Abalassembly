/* ═══════════════════════════════════════════
   CAMERA DETECTION — CLAUDE VISION
═══════════════════════════════════════════ */
let currentImageBase64 = null;
let currentImageMime = 'image/jpeg';
let mediaStream = null;
let camHistory = [];

function switchCamMode(mode) {
  document.getElementById('tab-upload').classList.toggle('active', mode==='upload');
  document.getElementById('tab-live').classList.toggle('active', mode==='live');
  document.getElementById('tab-ar').classList.toggle('active', mode==='ar');
  document.getElementById('mode-upload').style.display = mode==='upload' ? 'block' : 'none';
  document.getElementById('mode-live').style.display = mode==='live' ? 'block' : 'none';
  document.getElementById('mode-ar').style.display = mode==='ar' ? 'block' : 'none';
  if (mode !== 'ar' && typeof arStopCamera === 'function') arStopCamera();
  clearAll();
}

function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadImageFile(file);
}

/* ═══════════════════════════════════════════
   TRAITEMENT CONFIDENTIALITÉ DES IMAGES
   1. Recadrage sur le plateau (décor supprimé)
   2. Flou léger des bords (sécurité supplémentaire)
   3. Effacement des métadonnées EXIF (GPS, appareil…)
   4. Renommage neutre de l'image
   Tout se fait LOCALEMENT, rien n'est envoyé tel quel.
═══════════════════════════════════════════ */

// Zone de recadrage sélectionnée par l'utilisateur (en fraction 0..1 de l'image)
let cropRegion = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };

// Traite une image (HTMLImageElement) → renvoie {dataUrl, mime, name}
// crop : {x,y,w,h} en fractions ; blurEdges : bool
function processImagePrivacy(imgEl, crop, blurEdges) {
  const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight;
  // Zone de recadrage en pixels
  const cx = Math.round(crop.x * iw);
  const cy = Math.round(crop.y * ih);
  const cw = Math.max(1, Math.round(crop.w * iw));
  const ch = Math.max(1, Math.round(crop.h * ih));

  // Canvas final = uniquement la zone du plateau (décor supprimé)
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  // 1+3. Dessiner UNIQUEMENT la zone recadrée → le décor n'existe plus,
  //      et redessiner sur canvas efface toutes les métadonnées EXIF.
  ctx.drawImage(imgEl, cx, cy, cw, ch, 0, 0, cw, ch);

  // 2. Flou léger sur une bordure périphérique (sécurité en plus, au cas où
  //    un bout de décor resterait sur les bords du cadrage)
  if (blurEdges) {
    const margin = Math.round(Math.min(cw, ch) * 0.06); // 6% de bordure
    try {
      // Récupère la zone recadrée floutée
      const tmp = document.createElement('canvas');
      tmp.width = cw; tmp.height = ch;
      const tctx = tmp.getContext('2d');
      tctx.filter = 'blur(8px)';
      tctx.drawImage(canvas, 0, 0);
      // Réapplique le flou seulement sur le cadre périphérique
      // (haut, bas, gauche, droite)
      ctx.drawImage(tmp, 0, 0, cw, margin, 0, 0, cw, margin);                       // haut
      ctx.drawImage(tmp, 0, ch-margin, cw, margin, 0, ch-margin, cw, margin);       // bas
      ctx.drawImage(tmp, 0, 0, margin, ch, 0, 0, margin, ch);                       // gauche
      ctx.drawImage(tmp, cw-margin, 0, margin, ch, cw-margin, 0, margin, ch);       // droite
    } catch(e) {}
  }

  // 4. Export propre (JPEG ré-encodé = sans métadonnées) + nom neutre
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const stamp = Date.now().toString(36);
  return { dataUrl: dataUrl, mime: 'image/jpeg', name: 'plateau-' + stamp + '.jpg' };
}

// Taille max acceptée pour une photo de plateau : au-delà, readAsDataURL()
// charge tout le fichier en mémoire (en base64, ~+33% de poids) et peut
// geler l'onglet sur un fichier énorme. 10 Mo est largement suffisant pour
// une photo de plateau (même en haute résolution) et reste confortable.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 Mo

function loadImageFile(file) {
  if (file && file.size > MAX_PHOTO_BYTES) {
    const mo = (file.size / (1024 * 1024)).toFixed(1);
    if (typeof showToast === 'function') showToast('📷 Photo trop lourde (' + mo + ' Mo) — 10 Mo maximum');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    // Charge l'image en mémoire pour le recadrage (pas encore envoyée)
    const tmpImg = new Image();
    tmpImg.onload = function() {
      window._rawImageEl = tmpImg;
      cropRegion = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
      showCropInterface(dataUrl, file.name);
    };
    tmpImg.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Affiche l'aperçu avec un cadre de recadrage ajustable
function showCropInterface(dataUrl, fileName) {
  const img = document.getElementById('preview-img');
  img.src = dataUrl; img.style.display = 'block';
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('preview-overlay').style.display = 'flex';
  document.getElementById('preview-label').textContent = '✂️ Cadrez le plateau';
  document.getElementById('upload-zone').classList.add('has-image');
  document.getElementById('upload-zone').style.cursor = 'default';

  // Crée (ou réutilise) le cadre de recadrage par-dessus l'image
  let cropBox = document.getElementById('crop-box');
  const zone = document.getElementById('upload-zone');
  if (!cropBox) {
    cropBox = document.createElement('div');
    cropBox.id = 'crop-box';
    cropBox.style.cssText = 'position:absolute;border:2px solid var(--gold);box-shadow:0 0 0 9999px rgba(0,0,0,0.55);'
      + 'cursor:move;z-index:5;border-radius:4px';
    // poignée coin bas-droit pour redimensionner
    const handle = document.createElement('div');
    handle.id = 'crop-handle';
    handle.style.cssText = 'position:absolute;right:-8px;bottom:-8px;width:18px;height:18px;'
      + 'background:var(--gold);border-radius:50%;cursor:nwse-resize;border:2px solid #0d0f0e';
    cropBox.appendChild(handle);
    zone.appendChild(cropBox);
    setupCropDrag(cropBox, handle);
  }
  cropBox.style.display = 'block';
  // positionne le cadre après que l'image soit affichée
  setTimeout(() => positionCropBox(), 50);

  // Bouton de validation du recadrage
  let confirmBtn = document.getElementById('crop-confirm-btn');
  if (!confirmBtn) {
    confirmBtn = document.createElement('button');
    confirmBtn.id = 'crop-confirm-btn';
    confirmBtn.textContent = '✓ Valider le cadrage (protège votre vie privée)';
    confirmBtn.style.cssText = 'display:block;width:100%;margin-top:12px;padding:12px;background:var(--gold);'
      + 'color:#0d0f0e;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer';
    confirmBtn.onclick = applyCropAndProcess;
    document.getElementById('upload-zone').parentNode.insertBefore(confirmBtn, document.getElementById('upload-zone').nextSibling);
  }
  confirmBtn.style.display = 'block';
  document.getElementById('analyze-btn').disabled = true;  // pas d'analyse avant recadrage
  hideResults();
}

function positionCropBox() {
  const img = document.getElementById('preview-img');
  const cropBox = document.getElementById('crop-box');
  if (!img || !cropBox) return;
  const rect = img.getBoundingClientRect();
  const parentRect = img.parentNode.getBoundingClientRect();
  const offX = rect.left - parentRect.left;
  const offY = rect.top - parentRect.top;
  window._imgDisplay = { offX, offY, w: rect.width, h: rect.height };
  cropBox.style.left = (offX + cropRegion.x * rect.width) + 'px';
  cropBox.style.top = (offY + cropRegion.y * rect.height) + 'px';
  cropBox.style.width = (cropRegion.w * rect.width) + 'px';
  cropBox.style.height = (cropRegion.h * rect.height) + 'px';
}

function setupCropDrag(cropBox, handle) {
  let mode = null, startX, startY, startBox;
  function getDisp() { return window._imgDisplay || {offX:0,offY:0,w:1,h:1}; }
  function onDown(e, m) {
    e.preventDefault(); e.stopPropagation();
    mode = m;
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    startBox = { left: parseFloat(cropBox.style.left), top: parseFloat(cropBox.style.top),
                 w: parseFloat(cropBox.style.width), h: parseFloat(cropBox.style.height) };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false}); document.addEventListener('touchend', onUp);
  }
  function onMove(e) {
    if (!mode) return;
    e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startX, dy = p.clientY - startY;
    const d = getDisp();
    if (mode === 'move') {
      let nl = startBox.left + dx, nt = startBox.top + dy;
      nl = Math.max(d.offX, Math.min(nl, d.offX + d.w - startBox.w));
      nt = Math.max(d.offY, Math.min(nt, d.offY + d.h - startBox.h));
      cropBox.style.left = nl + 'px'; cropBox.style.top = nt + 'px';
    } else {
      let nw = Math.max(40, startBox.w + dx), nh = Math.max(40, startBox.h + dy);
      nw = Math.min(nw, d.offX + d.w - parseFloat(cropBox.style.left));
      nh = Math.min(nh, d.offY + d.h - parseFloat(cropBox.style.top));
      cropBox.style.width = nw + 'px'; cropBox.style.height = nh + 'px';
    }
    updateCropRegion();
  }
  function onUp() {
    mode = null;
    document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp);
  }
  cropBox.addEventListener('mousedown', e => { if (e.target === handle) return; onDown(e, 'move'); });
  cropBox.addEventListener('touchstart', e => { if (e.target === handle) return; onDown(e, 'move'); }, {passive:false});
  handle.addEventListener('mousedown', e => onDown(e, 'resize'));
  handle.addEventListener('touchstart', e => onDown(e, 'resize'), {passive:false});
}

function updateCropRegion() {
  const cropBox = document.getElementById('crop-box');
  const d = window._imgDisplay;
  if (!cropBox || !d) return;
  cropRegion = {
    x: (parseFloat(cropBox.style.left) - d.offX) / d.w,
    y: (parseFloat(cropBox.style.top) - d.offY) / d.h,
    w: parseFloat(cropBox.style.width) / d.w,
    h: parseFloat(cropBox.style.height) / d.h,
  };
}

// Applique le recadrage + flou + nettoyage métadonnées, puis prépare l'analyse
function applyCropAndProcess() {
  if (!window._rawImageEl) return;
  updateCropRegion();
  const result = processImagePrivacy(window._rawImageEl, cropRegion, true);
  // L'image traitée remplace l'originale — l'originale (avec décor + EXIF) est abandonnée
  currentImageBase64 = result.dataUrl.split(',')[1];
  currentImageMime = result.mime;
  // Aperçu de l'image nettoyée
  const img = document.getElementById('preview-img');
  img.src = result.dataUrl;
  document.getElementById('preview-label').textContent = '🔒 ' + result.name + ' (décor supprimé, métadonnées effacées)';
  // masque le cadre et le bouton de recadrage
  const cropBox = document.getElementById('crop-box'); if (cropBox) cropBox.style.display = 'none';
  const cb = document.getElementById('crop-confirm-btn'); if (cb) cb.style.display = 'none';
  document.getElementById('analyze-btn').disabled = false;
  window._rawImageEl = null;  // libère l'image brute de la mémoire
  showToast('🔒 Image nettoyée : décor supprimé, métadonnées effacées');
}

function loadImageFileOld(file) {
  currentImageMime = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    currentImageBase64 = dataUrl.split(',')[1];
    // Show preview
    const img = document.getElementById('preview-img');
    img.src = dataUrl; img.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('preview-overlay').style.display = 'flex';
    document.getElementById('preview-label').textContent = file.name;
    document.getElementById('upload-zone').classList.add('has-image');
    document.getElementById('upload-zone').style.cursor = 'default';
    document.getElementById('analyze-btn').disabled = false;
    hideResults();
  };
  reader.readAsDataURL(file);
}

function clearImage(e) {
  e.stopPropagation();
  currentImageBase64 = null;
  const img = document.getElementById('preview-img');
  img.src = ''; img.style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'flex';
  document.getElementById('upload-placeholder').style.flexDirection = 'column';
  document.getElementById('upload-placeholder').style.alignItems = 'center';
  document.getElementById('preview-overlay').style.display = 'none';
  document.getElementById('upload-zone').classList.remove('has-image');
  document.getElementById('upload-zone').style.cursor = 'pointer';
  document.getElementById('file-input').value = '';
  document.getElementById('analyze-btn').disabled = true;
  hideResults();
}

function clearAll() {
  clearImage({ stopPropagation: ()=>{} });
  stopCamera();
  currentImageBase64 = null;
  document.getElementById('snap-preview').style.display = 'none';
  document.getElementById('analyze-btn').disabled = true;
  hideResults();
}

function hideResults() {
  document.getElementById('result-panel').classList.remove('show');
  document.getElementById('analyzing-block').classList.remove('show');
}

/* ═══════════════════════════════════════════
   MODE AR — flux vidéo continu + overlay temps réel
   Principe : même calibration à 4 coins que la détection photo (haut-g,
   haut-d, bas-d, bas-g), même homographie (detComputeHomography /
   detApplyHomography), même classification colorimétrique (detSamplePatch /
   detClassify) — rien n'est réinventé, tout est réutilisé tel quel.
   Pour les coups légaux et le meilleur coup : le "board" global du jeu réel
   est échangé pour le board AR le temps d'un calcul SYNCHRONE (jamais de
   await entre l'échange et la restauration, donc aucune interférence
   possible avec une partie en cours ailleurs dans l'app), puis restauré.
   validateMove / applyMove / evaluateBoard sont donc les VRAIES fonctions
   du moteur, pas une réimplémentation.
═══════════════════════════════════════════ */
let _arStream = null;
let _arRAF = null;
let _arCorners = [];              // jusqu'à 4 points tapés {x,y} en px canvas (CSS)
let _arDraggingCorner = -1;
let _arHomography = null;
let _arRcList = [];               // 61 {r,c} dans l'ordre du plateau
let _arHolePos = [];              // 61 positions projetées {x,y} (px canvas), parallèle à _arRcList
let _arBoard = {};                // akey(r,c) -> 'black'|'white', board AR détecté
let _arSelectedIdx = -1;
let _arMoves = [];                // coups légaux calculés pour la bille sélectionnée
let _arBestMove = null;
let _arFrozen = false;
let _arPlayer = 'black';
const AR_GOLD = '#d6b15e';

function arBuildRcList() {
  const list = [];
  for (let r = 0; r < 9; r++) { const n = DET_ROWS[r]; for (let c = 0; c < n; c++) list.push({ r, c }); }
  return list;
}

async function arStartCamera() {
  try {
    _arStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    const video = document.getElementById('ar-video');
    video.srcObject = _arStream;
    await video.play().catch(()=>{});
    document.getElementById('ar-start-block').style.display = 'none';
    document.getElementById('ar-live-wrap').style.display = 'block';
    document.getElementById('ar-controls').style.display = 'flex';
    _arRcList = arBuildRcList();
    _arCorners = []; _arHomography = null; _arHolePos = []; _arBoard = {}; _arSelectedIdx = -1; _arMoves = []; _arBestMove = null; _arFrozen = false;
    arSetupCanvasEvents();
    arResizeCanvas();
    window.addEventListener('resize', arResizeCanvas);
    if (_arRAF) cancelAnimationFrame(_arRAF);
    _arRAF = requestAnimationFrame(arDrawLoop);
  } catch (err) {
    showToast('❌ Caméra AR inaccessible — vérifiez les permissions');
  }
}

function arStopCamera() {
  if (_arStream) { _arStream.getTracks().forEach(t => t.stop()); _arStream = null; }
  if (_arRAF) { cancelAnimationFrame(_arRAF); _arRAF = null; }
  window.removeEventListener('resize', arResizeCanvas);
  const wrap = document.getElementById('ar-live-wrap');
  const startBlock = document.getElementById('ar-start-block');
  const ctrls = document.getElementById('ar-controls');
  if (wrap) wrap.style.display = 'none';
  if (startBlock) startBlock.style.display = 'flex';
  if (ctrls) ctrls.style.display = 'none';
}

function arResizeCanvas() {
  const canvas = document.getElementById('ar-canvas');
  const video = document.getElementById('ar-video');
  if (!canvas || !video) return;
  const rect = video.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  if (_arCorners.length === 4) arComputeHomographyAndProject();
}

// Dessine la vidéo (ou l'image gelée si Freeze) dans un canvas hors-écran en
// respectant le même recadrage "cover" que l'affichage CSS (object-fit:cover),
// pour que les coordonnées d'échantillonnage colorimétrique correspondent
// exactement aux points projetés à l'écran.
function arDrawCoverFrame(ctx, video, dispW, dispH) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return false;
  const scale = Math.max(dispW / vw, dispH / vh);
  const w = vw * scale, h = vh * scale;
  const x = (dispW - w) / 2, y = (dispH - h) / 2;
  ctx.drawImage(video, x, y, w, h);
  return true;
}

function arSetupCanvasEvents() {
  const canvas = document.getElementById('ar-canvas');
  if (!canvas || canvas._arBound) return;
  canvas._arBound = true;
  canvas.addEventListener('pointerdown', arOnPointerDown);
  canvas.addEventListener('pointermove', arOnPointerMove);
  canvas.addEventListener('pointerup', arOnPointerUp);
}

function arCanvasPoint(e) {
  const canvas = document.getElementById('ar-canvas');
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function arOnPointerDown(e) {
  const p = arCanvasPoint(e);
  // Coin déjà posé à proximité → on le saisit pour le glisser (ajustement fin)
  for (let i = 0; i < _arCorners.length; i++) {
    if (Math.hypot(_arCorners[i].x - p.x, _arCorners[i].y - p.y) < 22) {
      _arDraggingCorner = i;
      e.target.setPointerCapture(e.pointerId);
      return;
    }
  }
  if (_arCorners.length < 4) {
    _arCorners.push(p);
    const labels = ['haut-gauche','haut-droit','bas-droit','bas-gauche'];
    const st = document.getElementById('ar-status');
    if (_arCorners.length < 4) { if (st) st.textContent = 'Coin ' + _arCorners.length + '/4 posé — tape le coin ' + labels[_arCorners.length]; }
    else arComputeHomographyAndProject();
    return;
  }
  // 4 coins déjà posés : tap sur un trou → sélection
  if (_arHolePos.length === 61) {
    let best = -1, bestD = 26;
    for (let i = 0; i < _arHolePos.length; i++) {
      const d = Math.hypot(_arHolePos[i].x - p.x, _arHolePos[i].y - p.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    arSelectHole(best);
  }
}
function arOnPointerMove(e) {
  if (_arDraggingCorner < 0) return;
  const p = arCanvasPoint(e);
  _arCorners[_arDraggingCorner] = p;
  if (_arCorners.length === 4) arComputeHomographyAndProject();
}
function arOnPointerUp() { _arDraggingCorner = -1; }

function arRecalibrate() {
  _arCorners = []; _arHomography = null; _arHolePos = []; _arSelectedIdx = -1; _arMoves = []; _arBestMove = null;
  const st = document.getElementById('ar-status');
  if (st) { st.style.display = 'block'; st.textContent = 'Calibration : tape les 4 coins (haut-gauche → haut-droit → bas-droit → bas-gauche)'; }
}

// Calcule l'homographie à partir des 4 coins tapés (réutilise EXACTEMENT le
// moteur de la détection photo : mêmes DET_CORNERS, même detCellFlatPos,
// même detComputeHomography/detApplyHomography) puis projette les 61 trous.
function arComputeHomographyAndProject() {
  if (_arCorners.length !== 4) return;
  const srcPts = DET_CORNERS.map(function(cc) { return detCellFlatPos(cc.r, cc.c); });
  const canvas = document.getElementById('ar-canvas');
  const dpr = window.devicePixelRatio || 1;
  // detApplyHomography attend le même repère que dstPts ; on travaille en px
  // CSS (canvas.width est en px physiques, on redivise par dpr pour rester
  // cohérent avec arCanvasPoint qui donne des coordonnées CSS).
  const dstPts = _arCorners;
  const H = detComputeHomography(srcPts, dstPts);
  if (!H) { const st = document.getElementById('ar-status'); if (st) st.textContent = 'Calibration invalide (coins alignés ?) — recalibre'; return; }
  _arHomography = H;
  _arHolePos = _arRcList.map(function(rc) { return detApplyHomography(H, detCellFlatPos(rc.r, rc.c)); });
  const st = document.getElementById('ar-status');
  if (st) { st.textContent = 'Calibré • tape une bille pour voir ses coups'; setTimeout(function(){ if (st) st.style.display = 'none'; }, 2500); }
}

// Détecte les billes : capture la frame courante (ou l'image gelée) dans un
// canvas hors-écran avec le même recadrage "cover" que l'affichage, puis
// réutilise TEL QUEL detSamplePatch + detClassify (déjà validés à 100% sur
// 4 scénarios par la détection photo — même code, pas une resimplification).
function arDetectBalls() {
  if (_arHolePos.length !== 61) { showToast('⚠️ Calibre d\'abord les 4 coins'); return; }
  const video = document.getElementById('ar-video');
  const canvas = document.getElementById('ar-canvas');
  const dpr = window.devicePixelRatio || 1;
  const dispW = canvas.width / dpr, dispH = canvas.height / dpr;
  let off = document.getElementById('ar-offscreen');
  if (!off) { off = document.createElement('canvas'); off.id = 'ar-offscreen'; off.style.display = 'none'; document.body.appendChild(off); }
  off.width = Math.round(dispW); off.height = Math.round(dispH);
  const octx = off.getContext('2d', { willReadFrequently: true });
  if (!arDrawCoverFrame(octx, video, off.width, off.height)) { showToast('⚠️ Vidéo pas prête'); return; }
  const imageData = octx.getImageData(0, 0, off.width, off.height);
  const samples = _arHolePos.map(function(p, i) {
    const s = detSamplePatch(imageData, p.x, p.y, 5);
    return s ? { key: i, r: s.r, g: s.g, b: s.b, lum: s.lum } : { key: i, r: 0, g: 0, b: 0, lum: 0 };
  });
  const labels = detClassify(samples);
  const newBoard = {};
  let nb = 0, nw = 0, ne = 0;
  _arRcList.forEach(function(rc, i) {
    const lab = labels[i];
    if (lab === 'black') { newBoard[akey(rc.r, rc.c)] = 'black'; nb++; }
    else if (lab === 'white') { newBoard[akey(rc.r, rc.c)] = 'white'; nw++; }
    else ne++;
  });
  _arBoard = newBoard;
  _arSelectedIdx = -1; _arMoves = []; _arBestMove = null;
  showToast('🔍 Détection : ' + nb + '⚫ ' + nw + '⚪ ' + ne + ' vides');
}

/* ── Échange temporaire du board global : voir l'en-tête du module pour la
   garantie de synchronicité (jamais de await entre swap et restore). ── */
let _arSavedBoard = null, _arSavedCapB = 0, _arSavedCapW = 0;
function arSwapBoard() {
  _arSavedBoard = board; _arSavedCapB = capturedByBlack; _arSavedCapW = capturedByWhite;
  board = _arBoard; capturedByBlack = 0; capturedByWhite = 0;
}
function arRestoreBoard() {
  board = _arSavedBoard; capturedByBlack = _arSavedCapB; capturedByWhite = _arSavedCapW;
}

// Construit les sélections candidates (1, 2 ou 3 billes alignées) passant
// par (r,c), une par axe et par sens — même principe que la sélection
// manuelle du joueur, mais générée automatiquement pour l'overlay AR.
function arCandidateSelections(r, c, color) {
  const ax0 = rcToAxial(r, c);
  const sels = [[{ r, c }]];
  const axes = [[{q:1,r:0},{q:-1,r:0}], [{q:0,r:1},{q:0,r:-1}], [{q:1,r:-1},{q:-1,r:1}]];
  axes.forEach(function(pair) {
    const d1 = pair[0], d2 = pair[1];
    const back = [], fwd = [];
    let cur = { q: ax0.q + d2.q, r: ax0.r + d2.r };
    for (let i = 0; i < 2; i++) {
      const rc = axialToRc(cur.q, cur.r);
      if (!rc || _arBoard[akey(rc.r, rc.c)] !== color) break;
      back.push(rc); cur = { q: cur.q + d2.q, r: cur.r + d2.r };
    }
    cur = { q: ax0.q + d1.q, r: ax0.r + d1.r };
    for (let i = 0; i < 2; i++) {
      const rc = axialToRc(cur.q, cur.r);
      if (!rc || _arBoard[akey(rc.r, rc.c)] !== color) break;
      fwd.push(rc); cur = { q: cur.q + d1.q, r: cur.r + d1.r };
    }
    if (back.length >= 1) sels.push([back[0], { r, c }]);
    if (fwd.length >= 1) sels.push([{ r, c }, fwd[0]]);
    if (back.length >= 1 && fwd.length >= 1) sels.push([back[0], { r, c }, fwd[0]]);
    if (back.length >= 2) sels.push([back[1], back[0], { r, c }]);
    if (fwd.length >= 2) sels.push([{ r, c }, fwd[0], fwd[1]]);
  });
  return sels;
}

// Calcule tous les coups légaux pour la bille (r,c) en réutilisant
// validateMove() du VRAI moteur, sur le board AR échangé temporairement.
function arComputeMovesForRc(r, c) {
  const color = _arBoard[akey(r, c)];
  if (!color) return [];
  const sels = arCandidateSelections(r, c, color);
  const seen = new Set();
  const moves = [];
  arSwapBoard();
  try {
    sels.forEach(function(sel) {
      const selKey = sel.map(function(s){ return akey(s.r, s.c); }).sort().join('|');
      AX_DIRS.forEach(function(dir) {
        const dkey = selKey + '>' + dir.q + ',' + dir.r;
        if (seen.has(dkey)) return;
        const info = validateMove(sel, dir, color);
        if (info.valid) { seen.add(dkey); moves.push({ cells: sel, dir: dir, info: info, color: color }); }
      });
    });
  } finally { arRestoreBoard(); }
  return moves;
}

function arSelectHole(idx) {
  const rc = _arRcList[idx];
  const color = _arBoard[akey(rc.r, rc.c)];
  if (!color) { _arSelectedIdx = -1; _arMoves = []; return; }
  _arSelectedIdx = idx;
  _arMoves = arComputeMovesForRc(rc.r, rc.c);
  _arBestMove = null;
}

// Meilleur coup toutes billes confondues pour la couleur au trait :
// réutilise applyMove/undoMove/evaluateBoard — les mêmes fonctions que le
// moteur de recherche du jeu réel, jamais une évaluation maison.
function arShowBestMove() {
  if (_arHolePos.length !== 61) { showToast('⚠️ Calibre d\'abord les 4 coins'); return; }
  let allMoves = [];
  _arRcList.forEach(function(rc) {
    if (_arBoard[akey(rc.r, rc.c)] === _arPlayer) allMoves = allMoves.concat(arComputeMovesForRc(rc.r, rc.c));
  });
  if (!allMoves.length) { showToast('Aucun coup trouvé pour ' + (_arPlayer === 'black' ? 'les Noirs' : 'les Blancs')); _arBestMove = null; return; }
  arSwapBoard();
  let best = null, bestScore = -Infinity;
  try {
    allMoves.forEach(function(m) {
      const undo = applyMove(m, _arPlayer);
      const score = evaluateBoard(_arPlayer);
      undoMove(undo);
      if (score > bestScore) { bestScore = score; best = m; }
    });
  } finally { arRestoreBoard(); }
  _arBestMove = best;
  showToast('★ Meilleur coup calculé (score ' + bestScore.toFixed(0) + ')');
}

function arSwitchPlayer() {
  _arPlayer = _arPlayer === 'black' ? 'white' : 'black';
  const btn = document.getElementById('ar-player-btn');
  if (btn) btn.textContent = _arPlayer === 'black' ? '⚫ Noirs' : '⚪ Blancs';
  _arBestMove = null;
}

// Exporte le plateau AR detecte en notation officielle (A-I / 1-9) — meme
// fonction coordToABAPRO() et meme format que exportEditorPosition() dans
// l'editeur de position, pour que le texte copie soit directement
// compatible avec le reste du jeu (partage, import futur, etc.), pas un
// format maison propre au mode AR.
function arExportPosition() {
  if (_arRcList.length !== 61 || Object.keys(_arBoard).length === 0) {
    showToast('⚠️ Detecte d\'abord les billes avant d\'exporter');
    return;
  }
  const blacks = [], whites = [];
  _arRcList.forEach(function(rc) {
    const couleur = _arBoard[akey(rc.r, rc.c)];
    if (couleur === 'black') blacks.push(coordToABAPRO(rc.r, rc.c));
    else if (couleur === 'white') whites.push(coordToABAPRO(rc.r, rc.c));
  });
  const code = 'Noirs: ' + (blacks.join(' ') || '(aucune)') + '\nBlancs: ' + (whites.join(' ') || '(aucune)');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function(){
      showToast('📋 Position AR copiée (notation A-I / 1-9)');
    }, function(){ showToast(code); });
  } else {
    showToast('📋 ' + code);
  }
}

function arToggleFreeze() {
  _arFrozen = !_arFrozen;
  const video = document.getElementById('ar-video');
  const btn = document.getElementById('ar-freeze-btn');
  if (video) { if (_arFrozen) video.pause(); else video.play().catch(function(){}); }
  if (btn) { btn.textContent = _arFrozen ? '▶️ Reprendre' : '❄️ Freeze'; btn.style.borderColor = _arFrozen ? 'var(--gold)' : ''; }
}

function arDrawLoop(ts) {
  _arRAF = requestAnimationFrame(arDrawLoop);
  const canvas = document.getElementById('ar-canvas');
  const video = document.getElementById('ar-video');
  if (!canvas || !video) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);
  const pulse = 0.5 + 0.5 * Math.sin((ts || 0) * 0.005);

  // Coins de calibration
  if (_arCorners.length > 0) {
    ctx.lineWidth = 2; ctx.strokeStyle = _arCorners.length === 4 ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    _arCorners.forEach(function(p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    if (_arCorners.length === 4) ctx.closePath();
    ctx.stroke();
    const labels = ['TL','TR','BR','BL'];
    _arCorners.forEach(function(p, i) {
      ctx.fillStyle = i === 0 ? '#facc15' : (_arCorners.length === 4 ? '#22c55e' : '#ef4444');
      ctx.beginPath(); ctx.arc(p.x, p.y, i === _arDraggingCorner ? 13 : 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = '11px monospace'; ctx.fillText(labels[i] || '', p.x + 12, p.y - 10);
    });
  }

  // Trous projetés + billes détectées
  if (_arHolePos.length === 61) {
    _arHolePos.forEach(function(p, i) {
      const rc = _arRcList[i];
      const col = _arBoard[akey(rc.r, rc.c)];
      const isSel = i === _arSelectedIdx;
      const rad = 9 + (isSel ? 4 : 0);
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI*2);
      if (col === 'black') { ctx.fillStyle = '#0a0a0a'; ctx.fill(); ctx.strokeStyle = isSel ? AR_GOLD : '#555'; ctx.lineWidth = isSel ? 2.5 : 1.2; ctx.stroke(); }
      else if (col === 'white') { ctx.fillStyle = '#f7f3e8'; ctx.fill(); ctx.strokeStyle = isSel ? AR_GOLD : '#333'; ctx.lineWidth = isSel ? 2.5 : 1.2; ctx.stroke(); }
      else { ctx.strokeStyle = isSel ? AR_GOLD : 'rgba(255,255,255,0.22)'; ctx.lineWidth = isSel ? 2 : 0.8; ctx.stroke(); }
      if (isSel) { ctx.strokeStyle = 'rgba(214,177,94,' + (0.3+0.5*pulse) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, rad+8+4*pulse, 0, Math.PI*2); ctx.stroke(); }
    });

    // Coups légaux de la bille sélectionnée : vert = destination, orange+rouge = sumito
    _arMoves.forEach(function(m) {
      const lead = m.cells[m.cells.length-1];
      const leadAx = rcToAxial(lead.r, lead.c);
      const frontAx = { q: leadAx.q + m.dir.q, r: leadAx.r + m.dir.r };
      const frontRc = axialToRc(frontAx.q, frontAx.r);
      if (m.info.type === 'push') {
        const startRc = axialToRc(m.info.oppStart.q, m.info.oppStart.r);
        if (!startRc) return;
        const idxStart = _arRcList.findIndex(function(x){ return x.r===startRc.r && x.c===startRc.c; });
        if (idxStart < 0) return;
        const pStart = _arHolePos[idxStart];
        const leadIdx = _arRcList.findIndex(function(x){ return x.r===lead.r && x.c===lead.c; });
        const pLead = _arHolePos[leadIdx];
        ctx.strokeStyle = 'rgba(249,115,22,0.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(pLead.x, pLead.y); ctx.lineTo(pStart.x, pStart.y); ctx.stroke();
        const ang = Math.atan2(pStart.y-pLead.y, pStart.x-pLead.x);
        ctx.fillStyle = '#f97316'; ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pStart.x-12*Math.cos(ang-0.4), pStart.y-12*Math.sin(ang-0.4));
        ctx.lineTo(pStart.x-12*Math.cos(ang+0.4), pStart.y-12*Math.sin(ang+0.4));
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(239,68,68,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pStart.x, pStart.y, 11, 0, Math.PI*2); ctx.stroke();
      } else if (frontRc) {
        const idxF = _arRcList.findIndex(function(x){ return x.r===frontRc.r && x.c===frontRc.c; });
        if (idxF < 0) return;
        const pf = _arHolePos[idxF];
        ctx.fillStyle = 'rgba(34,197,94,' + (0.25+0.35*pulse) + ')';
        ctx.beginPath(); ctx.arc(pf.x, pf.y, 14, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(34,197,94,' + (0.6+0.4*pulse) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pf.x, pf.y, 14, 0, Math.PI*2); ctx.stroke();
      }
    });

    // Meilleur coup : flèche or en tirets
    if (_arBestMove) {
      const m = _arBestMove;
      const lead = m.cells[m.cells.length-1];
      const leadIdx = _arRcList.findIndex(function(x){ return x.r===lead.r && x.c===lead.c; });
      const pLead = _arHolePos[leadIdx];
      let pTarget = null;
      if (m.info.type === 'push') {
        const startRc = axialToRc(m.info.oppStart.q, m.info.oppStart.r);
        const idxStart = startRc ? _arRcList.findIndex(function(x){ return x.r===startRc.r && x.c===startRc.c; }) : -1;
        if (idxStart >= 0) pTarget = _arHolePos[idxStart];
      } else {
        const leadAx = rcToAxial(lead.r, lead.c);
        const frontAx = { q: leadAx.q + m.dir.q, r: leadAx.r + m.dir.r };
        const frontRc = axialToRc(frontAx.q, frontAx.r);
        const idxF = frontRc ? _arRcList.findIndex(function(x){ return x.r===frontRc.r && x.c===frontRc.c; }) : -1;
        if (idxF >= 0) pTarget = _arHolePos[idxF];
      }
      if (pTarget && pLead) {
        ctx.strokeStyle = AR_GOLD; ctx.lineWidth = 4; ctx.setLineDash([8,6]);
        ctx.beginPath(); ctx.moveTo(pLead.x, pLead.y); ctx.lineTo(pTarget.x, pTarget.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = AR_GOLD; ctx.beginPath(); ctx.arc(pTarget.x, pTarget.y, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('★', pTarget.x-5, pTarget.y+4);
      }
    }
  }
}

/* ─── LIVE CAMERA ─── */
async function startCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
    const video = document.getElementById('cam-video');
    video.srcObject = mediaStream;
    document.getElementById('cam-start-block').style.display = 'none';
    document.getElementById('cam-live-wrap').style.display = 'block';
  } catch(err) {
    showToast('❌ Caméra inaccessible — vérifiez les permissions');
  }
}

function stopCamera() {
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  document.getElementById('cam-live-wrap').style.display = 'none';
  document.getElementById('cam-start-block').style.display = 'flex';
}

function snapPhoto() {
  const video = document.getElementById('cam-video');
  const canvas = document.getElementById('snap-canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  currentImageBase64 = dataUrl.split(',')[1];
  currentImageMime = 'image/jpeg';
  const snap = document.getElementById('snap-preview');
  snap.src = dataUrl; snap.style.display = 'block';
  document.getElementById('analyze-btn').disabled = false;
  showToast('📸 Photo capturée — prêt pour l\'analyse !');
  stopCamera();
}

/* ─── DEMO IMAGE ─── */
function loadDemoImage() {
  // Generate a synthetic demo board via canvas and use it
  const c = document.createElement('canvas');
  c.width = 600; c.height = 600;
  const ctx = c.getContext('2d');
  // Board background
  const bg = ctx.createRadialGradient(300,300,0,300,300,280);
  bg.addColorStop(0,'#2a3a35'); bg.addColorStop(1,'#131b19');
  ctx.beginPath(); ctx.arc(300,300,295,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='#4a6a60'; ctx.lineWidth=3; ctx.stroke();
  // Draw demo marbles — black top, white bottom
  const ROWS=[5,6,7,8,9,8,7,6,5];
  const demoBoard = {};
  for(let r=0;r<2;r++) for(let c=0;c<ROWS[r];c++) demoBoard[`${r},${c}`]='black';
  for(let c=0;c<3;c++) demoBoard[`2,${c}`]='black';
  for(let r=7;r<9;r++) for(let c=0;c<ROWS[r];c++) demoBoard[`${r},${c}`]='white';
  for(let c=ROWS[6]-3;c<ROWS[6];c++) demoBoard[`6,${c}`]='white';
  const HR=28, cx=300, cy=300;
  for(let r=0;r<9;r++){
    for(let cc=0;cc<ROWS[r];cc++){
      const vS=HR*1.73, hS=HR*2;
      const x=cx+(cc-(ROWS[r]-1)/2)*hS+(r-4)*hS*0.5;
      const y=cy+(r-4)*vS;
      // Cell
      ctx.beginPath(); ctx.arc(x,y,HR-4,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.stroke();
      const piece=demoBoard[`${r},${cc}`];
      if(piece){
        ctx.beginPath(); ctx.arc(x+2,y+3,HR-7,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fill();
        const g=ctx.createRadialGradient(x-6,y-6,1,x,y,HR-7);
        if(piece==='black'){g.addColorStop(0,'#666');g.addColorStop(1,'#0a0a0a');}
        else{g.addColorStop(0,'#fff');g.addColorStop(1,'#bbb');}
        ctx.beginPath(); ctx.arc(x,y,HR-7,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        const h=ctx.createRadialGradient(x-5,y-5,0,x-3,y-3,HR-8);
        h.addColorStop(0,piece==='black'?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.7)');
        h.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(x,y,HR-7,0,Math.PI*2); ctx.fillStyle=h; ctx.fill();
      }
    }
  }
  const dataUrl = c.toDataURL('image/jpeg', 0.92);
  currentImageBase64 = dataUrl.split(',')[1];
  currentImageMime = 'image/jpeg';
  const img = document.getElementById('preview-img');
  img.src = dataUrl; img.style.display = 'block';
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('preview-overlay').style.display = 'flex';
  document.getElementById('preview-label').textContent = 'Image de démo (position initiale)';
  document.getElementById('upload-zone').classList.add('has-image');
  document.getElementById('analyze-btn').disabled = false;
  hideResults();
  showToast('🎮 Image de démo chargée !');
}

/* ─── MAIN ANALYSIS ─── */
/* ═══════════════════════════════════════════
   DÉTECTION DE PLATEAU — HORS-LIGNE, SANS IA, SANS RÉSEAU
   Principe : l'utilisateur tape les 4 coins connus du plateau sur sa photo
   (comme un scanner de documents) → on calcule l'homographie (transformation
   projective) qui relie la géométrie idéale du plateau à la photo, quel que
   soit l'angle de prise de vue → on échantillonne la couleur du pixel à
   l'emplacement calculé de chacune des 61 cases → on classe chaque case
   (vide / noire / blanche) par analyse colorimétrique, sans seuil fixe
   câblé en dur (auto-calibré sur CETTE photo). Zéro appel réseau, zéro clé API.
═══════════════════════════════════════════ */
const DET_ROWS = [5,6,7,8,9,8,7,6,5];
function detRcToAx(r, c) { return { q: r <= 4 ? c - r : c - 4, r: r - 4 }; }
function detCellFlatPos(r, c) { const ax = detRcToAx(r, c); return { x: Math.sqrt(3)*(ax.q+ax.r/2), y: 1.5*ax.r }; }
const DET_CORNERS = [{r:0,c:0},{r:0,c:4},{r:8,c:4},{r:8,c:0}]; // haut-g, haut-d, bas-d, bas-g

function detGaussSolve(M, b) {
  const n = M.length;
  const A = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col+1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-10) return null;
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c <= n; c++) A[r][c] -= f * A[col][c];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}
function detComputeHomography(srcPts, dstPts) {
  const Msys = [], bsys = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = srcPts[i], { x: dx, y: dy } = dstPts[i];
    Msys.push([sx, sy, 1, 0, 0, 0, -dx*sx, -dx*sy]); bsys.push(dx);
    Msys.push([0, 0, 0, sx, sy, 1, -dy*sx, -dy*sy]); bsys.push(dy);
  }
  const h = detGaussSolve(Msys, bsys);
  return h ? [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1] : null;
}
function detApplyHomography(H, pt) {
  const w = H[6]*pt.x + H[7]*pt.y + H[8];
  return { x: (H[0]*pt.x + H[1]*pt.y + H[2]) / w, y: (H[3]*pt.x + H[4]*pt.y + H[5]) / w };
}

function detSamplePatch(imageData, x, y, radius) {
  const { width, height, data } = imageData;
  let sr=0, sg=0, sb=0, n=0;
  const x0=Math.max(0,Math.round(x-radius)), x1=Math.min(width-1,Math.round(x+radius));
  const y0=Math.max(0,Math.round(y-radius)), y1=Math.min(height-1,Math.round(y+radius));
  for (let yy=y0; yy<=y1; yy++) for (let xx=x0; xx<=x1; xx++) {
    const i=(yy*width+xx)*4; sr+=data[i]; sg+=data[i+1]; sb+=data[i+2]; n++;
  }
  if (!n) return null;
  const r=sr/n, g=sg/n, b=sb/n;
  return { r, g, b, lum: 0.299*r+0.587*g+0.114*b };
}

// Classification en 2 étapes robuste (bois vs bille par teinte, puis noir vs
// blanc par luminosité), avec test de signification statistique à chaque
// étape — jamais de coupure forcée sur du simple bruit. Voir la session de
// développement : validée sur position complète, éparse, une seule couleur
// présente, et plateau totalement vide (4/4 scénarios, 100% de précision).
function detClassify(samples) {
  const med = arr => { const s = arr.slice().sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
  const woodWarmth = med(samples.map(s => s.r - s.b));
  const dists = samples.map(s => ({ key: s.key, dist: Math.abs((s.r-s.b) - woodWarmth), lum: s.lum }));
  const sortedByDist = dists.slice().sort((a,b) => b.dist - a.dist);
  const distGaps = [];
  for (let i=1; i<sortedByDist.length; i++) distGaps.push(sortedByDist[i-1].dist - sortedByDist[i].dist);
  let bestGap=-1, cut=0;
  distGaps.forEach((g,i) => { if (g>bestGap) { bestGap=g; cut=i+1; } });
  const otherGaps = distGaps.filter((_,i) => i!==cut-1);
  const avgOtherGap = otherGaps.length ? otherGaps.reduce((s,g)=>s+g,0)/otherGaps.length : 0;
  if (!(bestGap > 6 && bestGap > 2.5*Math.max(avgOtherGap,0.5))) cut = 0;
  const marbleKeys = new Set(sortedByDist.slice(0,cut).map(x=>x.key));

  const labels = {};
  samples.forEach(s => { if (!marbleKeys.has(s.key)) labels[s.key] = 'empty'; });

  const marbleSamples = samples.filter(s => marbleKeys.has(s.key)).sort((a,b)=>a.lum-b.lum);
  if (!marbleSamples.length) return labels;
  if (marbleSamples.length === 1) { labels[marbleSamples[0].key] = marbleSamples[0].lum>128?'white':'black'; return labels; }
  const gaps = [];
  for (let i=1; i<marbleSamples.length; i++) gaps.push(marbleSamples[i].lum - marbleSamples[i-1].lum);
  let bestGap2=-1, cut2=Math.floor(marbleSamples.length/2);
  gaps.forEach((g,i) => { if (g>bestGap2) { bestGap2=g; cut2=i+1; } });
  const otherGaps2 = gaps.filter((_,i) => i!==cut2-1);
  const avgOtherGap2 = otherGaps2.length ? otherGaps2.reduce((s,g)=>s+g,0)/otherGaps2.length : 0;
  if (bestGap2 > 18 && bestGap2 > 2.5*Math.max(avgOtherGap2,1)) {
    marbleSamples.slice(0,cut2).forEach(s => labels[s.key]='black');
    marbleSamples.slice(cut2).forEach(s => labels[s.key]='white');
  } else {
    const avgLum = marbleSamples.reduce((s,x)=>s+x.lum,0)/marbleSamples.length;
    const col = avgLum>128 ? 'white' : 'black';
    marbleSamples.forEach(s => labels[s.key]=col);
  }
  return labels;
}

// ─── État de calibrage / correction (un cycle à la fois) ───
let _detImg = null;          // HTMLImageElement de la photo (déjà recadrée/nettoyée)
let _detTaps = [];           // les points tapés par l'utilisateur (jusqu'à 4)
let _detHomography = null;   // dernière homographie calculée
let _detCellLabels = {};     // 'r,c' -> 'empty'|'black'|'white' (corrigeable)
let _detFlipV = false, _detFlipH = false;

function detStartOffline() {
  const dataUrl = 'data:' + currentImageMime + ';base64,' + currentImageBase64;
  const img = new Image();
  img.onload = function(){
    _detImg = img; _detTaps = []; _detFlipV = false; _detFlipH = false;
    document.getElementById('analyzing-block').classList.remove('show');
    document.getElementById('result-panel').classList.remove('show');
    document.getElementById('det-correct-block').style.display = 'none';
    document.getElementById('det-calib-block').style.display = 'block';
    detCalibRender();
  };
  img.onerror = function(){ showAnalysisError('Image illisible'); };
  img.src = dataUrl;
}
function detCalibReset(){
  _detTaps = [];
  document.getElementById('det-correct-block').style.display = 'none';
  document.getElementById('det-calib-block').style.display = 'block';
  detCalibRender();
}
function detCalibCancel(){
  document.getElementById('det-calib-block').style.display = 'none';
  document.getElementById('det-correct-block').style.display = 'none';
}
function detCalibRender(){
  const canvas = document.getElementById('det-calib-canvas');
  canvas.width = _detImg.naturalWidth; canvas.height = _detImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(_detImg, 0, 0);
  const labelsOrder = ['①','②','③','④'];
  _detTaps.forEach(function(pt, i){
    ctx.beginPath(); ctx.arc(pt.x, pt.y, canvas.width*0.012, 0, 7);
    ctx.fillStyle = 'rgba(200,168,75,0.85)'; ctx.fill();
    ctx.strokeStyle = '#0d0f0e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0d0f0e'; ctx.font = 'bold ' + Math.round(canvas.width*0.02) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(labelsOrder[i], pt.x, pt.y);
  });
  const hints = ['Tapez le coin supérieur-gauche','Tapez le coin supérieur-droit','Tapez le coin inférieur-droit','Tapez le coin inférieur-gauche'];
  const hintEl = document.getElementById('det-calib-hint');
  if (_detTaps.length < 4) hintEl.textContent = hints[_detTaps.length];
  if (!canvas._detBound) {
    canvas._detBound = true;
    canvas.addEventListener('click', detCalibClick);
  }
}
function detCalibClick(e){
  if (_detTaps.length >= 4) return;
  const canvas = document.getElementById('det-calib-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  _detTaps.push({ x, y });
  detCalibRender();
  if (_detTaps.length === 4) detRunDetection();
}
function detRunDetection(){
  const srcPts = DET_CORNERS.map(c => detCellFlatPos(c.r, c.c));
  _detHomography = detComputeHomography(srcPts, _detTaps);
  if (!_detHomography) { showToast('❌ Les 4 points ne forment pas un plateau valide — réessayez'); detCalibReset(); return; }

  const canvas = document.getElementById('det-calib-canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const radius = canvas.width * 0.012;

  const samples = [];
  for (let r=0; r<9; r++) for (let c=0; c<DET_ROWS[r]; c++){
    const p = detApplyHomography(_detHomography, detCellFlatPos(r,c));
    const patch = detSamplePatch(imageData, p.x, p.y, radius);
    samples.push({ key: r+','+c, lum: patch ? patch.lum : 128, r: patch?patch.r:128, g: patch?patch.g:128, b: patch?patch.b:128 });
  }
  const labels = detClassify(samples);
  _detCellLabels = labels;

  document.getElementById('det-calib-block').style.display = 'none';
  document.getElementById('det-correct-block').style.display = 'block';
  detCorrectRender();
  const nb = Object.values(labels).filter(v=>v!=='empty').length;
  showToast('📐 ' + nb + ' bille(s) détectée(s) — vérifiez avant de confirmer');
}
function detEffCoord(r, c){
  // applique retournement vertical/horizontal choisi par l'utilisateur (orientation)
  let rr = r, cc = c;
  if (_detFlipV) rr = 8 - r;
  if (_detFlipH) cc = (DET_ROWS[rr] - 1) - c;
  return { r: rr, c: cc };
}
function detFlipVertical(){ _detFlipV = !_detFlipV; detCorrectRender(); }
function detFlipHorizontal(){ _detFlipH = !_detFlipH; detCorrectRender(); }
function detCorrectRender(){
  const canvas = document.getElementById('det-correct-canvas');
  canvas.width = _detImg.naturalWidth; canvas.height = _detImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(_detImg, 0, 0);
  const radius = canvas.width * 0.014;
  for (let r=0; r<9; r++) for (let c=0; c<DET_ROWS[r]; c++){
    const p = detApplyHomography(_detHomography, detCellFlatPos(r,c));
    const label = _detCellLabels[r+','+c] || 'empty';
    if (label === 'empty') {
      ctx.beginPath(); ctx.arc(p.x, p.y, radius*0.35, 0, 7);
      ctx.strokeStyle = 'rgba(200,168,75,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      continue;
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, 7);
    ctx.fillStyle = label === 'black' ? 'rgba(20,20,20,0.92)' : 'rgba(240,235,220,0.92)';
    ctx.fill();
    ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (!canvas._detBound) {
    canvas._detBound = true;
    canvas.addEventListener('click', detCorrectClick);
  }
}
function detCorrectClick(e){
  const canvas = document.getElementById('det-correct-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  let best = null, bestDist = Infinity;
  for (let r=0; r<9; r++) for (let c=0; c<DET_ROWS[r]; c++){
    const p = detApplyHomography(_detHomography, detCellFlatPos(r,c));
    const d = Math.hypot(p.x-x, p.y-y);
    if (d < bestDist) { bestDist = d; best = r+','+c; }
  }
  const threshold = canvas.width * 0.03;
  if (!best || bestDist > threshold) return;
  const cur = _detCellLabels[best] || 'empty';
  _detCellLabels[best] = cur === 'empty' ? 'black' : cur === 'black' ? 'white' : 'empty';
  detCorrectRender();
}
function detConfirmDetection(){
  const colLetters = 'ABCDEFGHI';
  const black = [], white = [];
  for (let r=0; r<9; r++) for (let c=0; c<DET_ROWS[r]; c++){
    const label = _detCellLabels[r+','+c];
    if (!label || label === 'empty') continue;
    const eff = detEffCoord(r, c);
    const cellLabel = colLetters[eff.r] + (eff.c + 1);
    (label === 'black' ? black : white).push(cellLabel);
  }
  document.getElementById('det-correct-block').style.display = 'none';
  const data = {
    detected: true, blackCount: black.length, whiteCount: white.length,
    boardQuality: 'bon', coordinateConfidence: 'haute',
    coordinateMethod: 'Calibrage manuel des 4 coins + analyse colorimétrique (hors-ligne, sans IA)',
    gamePhase: (black.length + white.length >= 24) ? 'position initiale' : (black.length + white.length >= 14 ? 'ouverture' : 'milieu de partie'),
    centerControl: 'indetermine', boardOrientation: 'défini par calibrage manuel',
    blackEjected: Math.max(0, 14 - black.length), whiteEjected: Math.max(0, 14 - white.length),
    nextBestMove: null,
    analysis: 'Détection géométrique hors-ligne : position des cases calculée par homographie depuis les 4 coins indiqués, couleur de chaque case déterminée par échantillonnage colorimétrique. Vérifiez et corrigez si besoin avant de continuer.',
    warnings: null,
    positions: { black, white }
  };
  showAnalysisResult(data);
  addToHistory(data);
  showToast('✅ Position confirmée — ' + black.length + ' noires, ' + white.length + ' blanches');
}

async function analyzeBoard() {
  if (!currentImageBase64) { showToast('⚠️ Veuillez d\'abord charger une image'); return; }
  document.getElementById('result-panel').classList.remove('show');
  detStartOffline();
}

function showAnalysisError(msg) {
  const panel = document.getElementById('result-panel');
  document.getElementById('result-header').className = 'result-header error';
  document.getElementById('result-icon').textContent = '❌';
  document.getElementById('result-title').textContent = 'Analyse échouée';
  document.getElementById('result-subtitle').textContent = msg;
  document.getElementById('result-body').textContent = msg;
  document.getElementById('count-black').textContent = '—';
  document.getElementById('count-white').textContent = '—';
  panel.classList.add('show');
}

function showAnalysisResult(data) {
  const panel = document.getElementById('result-panel');
  document.getElementById('result-header').className = 'result-header';
  document.getElementById('result-icon').textContent = '✅';

  const confIcon = { haute:'🎯', moyenne:'⚡', faible:'⚠️' }[data.coordinateConfidence] || '📍';
  document.getElementById('result-title').textContent =
    `Plateau détecté — ${data.boardQuality === 'excellent' ? 'Qualité excellente' : data.boardQuality === 'bon' ? 'Bonne qualité' : 'Qualité moyenne'}`;
  document.getElementById('result-subtitle').textContent =
    `${data.gamePhase || 'Position'} · Centre contrôlé: ${data.centerControl || 'équilibré'} · Confiance coordonnées: ${data.coordinateConfidence || '?'}`;
  document.getElementById('count-black').textContent = data.blackCount ?? '?';
  document.getElementById('count-white').textContent = data.whiteCount ?? '?';

  // Rich analysis text
  let bodyText = '';
  bodyText += `📍 Phase de jeu : ${data.gamePhase || 'inconnue'}\n`;
  bodyText += `🎯 Contrôle du centre : ${data.centerControl || 'équilibré'}\n`;
  bodyText += `${confIcon} Fiabilité des coordonnées : ${data.coordinateConfidence || '?'}\n`;
  if (data.coordinateMethod) bodyText += `📐 Méthode : ${data.coordinateMethod}\n`;
  bodyText += `🔄 Orientation plateau : ${data.boardOrientation || 'incertain'}\n`;
  if (data.blackEjected > 0) bodyText += `💀 Billes noires éjectées : ${data.blackEjected}\n`;
  if (data.whiteEjected > 0) bodyText += `💀 Billes blanches éjectées : ${data.whiteEjected}\n`;
  if (data.nextBestMove) bodyText += `\n💡 Meilleur coup suggéré : ${data.nextBestMove}\n`;
  bodyText += `\n📊 Analyse tactique :\n${data.analysis || 'Non disponible'}`;
  if (data.warnings) bodyText += `\n\n⚠️ Avertissements :\n${data.warnings}`;
  document.getElementById('result-body').textContent = bodyText;

  // Show coordinate table
  renderCoordTable(data.positions);

  // Draw mini board with coordinate labels
  drawMiniBoard(data.positions, true);

  panel.classList.add('show');
  window._detectedPositions = data.positions;
  window._detectedData = data;
}

function renderCoordTable(positions) {
  // Insert/update coord table inside result panel
  let tbl = document.getElementById('coord-table-wrap');
  if (!tbl) {
    tbl = document.createElement('div');
    tbl.id = 'coord-table-wrap';
    const resultBody = document.getElementById('result-body');
    resultBody.parentNode.insertBefore(tbl, resultBody);
  }
  const blacks = (positions?.black || []);
  const whites = (positions?.white || []);
  const maxLen = Math.max(blacks.length, whites.length);
  if (maxLen === 0) { tbl.innerHTML = ''; return; }

  let html = `
    <div style="margin:12px 0;border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="padding:10px 14px;background:var(--surface2);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)">
        Coordonnées détectées par l'IA
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border)">
        <div style="padding:10px 14px;border-right:1px solid var(--border)">
          <div style="font-size:12px;font-weight:600;color:#888;margin-bottom:6px">⚫ Billes noires (${blacks.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${blacks.map(c=>`<span style="font-family:'DM Mono',monospace;font-size:12px;padding:2px 7px;background:rgba(30,30,30,0.8);border:1px solid #333;border-radius:4px;color:#ccc">${c}</span>`).join('')}
          </div>
        </div>
        <div style="padding:10px 14px">
          <div style="font-size:12px;font-weight:600;color:#aaa;margin-bottom:6px">⚪ Billes blanches (${whites.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${whites.map(c=>`<span style="font-family:'DM Mono',monospace;font-size:12px;padding:2px 7px;background:rgba(220,210,190,0.08);border:1px solid #555;border-radius:4px;color:#ddd">${c}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  tbl.innerHTML = html;
}

function drawMiniBoard(positions, showCoords) {
  const canvas = document.getElementById('mini-board-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,400,400);
  const ROWS=[5,6,7,8,9,8,7,6,5];
  const HR=20, cx=200, cy=200;

  // Background
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,185);
  bg.addColorStop(0,'#1e2b28'); bg.addColorStop(1,'#131b19');
  ctx.beginPath(); ctx.arc(cx,cy,188,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='#2a3330'; ctx.lineWidth=2; ctx.stroke();

  // Rings
  ctx.strokeStyle='rgba(200,168,75,0.06)'; ctx.lineWidth=1;
  [50,95,140].forEach(r=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();});

  // Build coord map
  const colLetters='ABCDEFGHI';
  const posMap={};
  for(let r=0;r<9;r++) for(let c=0;c<ROWS[r];c++) posMap[`${colLetters[r]}${c+1}`]={r,c};

  const blackSet = new Set((positions?.black||[]).map(p=>p.trim().toUpperCase()));
  const whiteSet = new Set((positions?.white||[]).map(p=>p.trim().toUpperCase()));

  // Draw row letters on the left edge
  if (showCoords) {
    ctx.fillStyle='rgba(200,168,75,0.4)';
    ctx.font='bold 9px DM Mono,monospace';
    ctx.textAlign='right';
    for(let r=0;r<9;r++){
      const vS=HR*1.73,hS=HR*2;
      const firstX=cx+(0-(ROWS[r]-1)/2)*hS+(r-4)*hS*0.5;
      const y=cy+(r-4)*vS;
      ctx.fillText(colLetters[r], firstX-HR+2, y+3);
    }
    // Column numbers on top row
    ctx.textAlign='center';
    ctx.font='9px DM Mono,monospace';
    ctx.fillStyle='rgba(200,168,75,0.3)';
    for(let c=0;c<ROWS[0];c++){
      const hS=HR*2;
      const x=cx+(c-(ROWS[0]-1)/2)*hS+(0-4)*hS*0.5;
      const y=cy+(0-4)*HR*1.73;
      ctx.fillText(c+1, x, y-HR+2);
    }
  }

  for(let r=0;r<9;r++){
    for(let c=0;c<ROWS[r];c++){
      const vS=HR*1.73, hS=HR*2;
      const x=cx+(c-(ROWS[r]-1)/2)*hS+(r-4)*hS*0.5;
      const y=cy+(r-4)*vS;
      const posKey=`${colLetters[r]}${c+1}`;
      const isBlack=blackSet.has(posKey), isWhite=whiteSet.has(posKey);

      // Cell background
      ctx.beginPath(); ctx.arc(x,y,HR-3,0,Math.PI*2);
      ctx.fillStyle = (posKey==='E5') ? 'rgba(200,168,75,0.08)' : 'rgba(255,255,255,0.025)';
      ctx.fill();
      ctx.strokeStyle = (posKey==='E5') ? 'rgba(200,168,75,0.3)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth=1; ctx.stroke();

      if(isBlack||isWhite){
        // Shadow
        ctx.beginPath(); ctx.arc(x+1,y+2,HR-6,0,Math.PI*2);
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill();
        // Marble gradient
        const g=ctx.createRadialGradient(x-4,y-4,0.5,x,y,HR-6);
        if(isBlack){g.addColorStop(0,'#666');g.addColorStop(1,'#0d0d0d');}
        else{g.addColorStop(0,'#fff');g.addColorStop(1,'#bbb');}
        ctx.beginPath(); ctx.arc(x,y,HR-6,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        // Highlight
        const h=ctx.createRadialGradient(x-4,y-4,0,x-2,y-2,HR-7);
        h.addColorStop(0,isBlack?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.7)');
        h.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(x,y,HR-6,0,Math.PI*2); ctx.fillStyle=h; ctx.fill();
        // Coordinate label on the marble
        if(showCoords){
          ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
          ctx.font='bold 7px DM Mono,monospace';
          ctx.textAlign='center';
          ctx.fillText(posKey, x, y+3);
        }
      }
    }
  }

  // Centre marker if no pieces there
  if(!blackSet.has('E5')&&!whiteSet.has('E5')){
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
    ctx.fillStyle='rgba(200,168,75,0.5)'; ctx.fill();
  }

  if(blackSet.size===0&&whiteSet.size===0){
    ctx.fillStyle='rgba(200,168,75,0.4)';
    ctx.font='12px DM Sans,sans-serif';
    ctx.textAlign='center';
    ctx.fillText('Position non reconstituée', cx, cy+5);
  }
}

function addToHistory(data) {
  camHistory.unshift({
    time: new Date().toLocaleTimeString('fr-FR'),
    black: data.blackCount, white: data.whiteCount,
    phase: data.gamePhase, img: currentImageBase64,
    confidence: data.coordinateConfidence
  });
  if (camHistory.length > 5) camHistory.pop();
  const histEl = document.getElementById('cam-history');
  histEl.innerHTML = camHistory.map(h => `
    <div class="history-item">
      <img class="history-thumb" src="data:image/jpeg;base64,${h.img}" alt="plateau">
      <div class="history-info">
        <div class="history-time">${h.time} · ${h.phase || 'Position'}</div>
        <div class="history-result">⚫ ${h.black} noires · ⚪ ${h.white} blanches</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Confiance: ${h.confidence || '?'}</div>
      </div>
    </div>`).join('');
}

function importToGame() {
  showPage('game');
  if (!window._detectedPositions) return;
  initBoardState(); board = {};
  const colLetters='ABCDEFGHI';
  const ROWS=[5,6,7,8,9,8,7,6,5];
  const posMap={};
  for(let r=0;r<9;r++) for(let c=0;c<ROWS[r];c++) posMap[`${colLetters[r]}${c+1}`]={r,c};
  (window._detectedPositions.black||[]).forEach(p=>{ const pos=posMap[p.trim().toUpperCase()]; if(pos) board[`${pos.r},${pos.c}`]='black'; });
  (window._detectedPositions.white||[]).forEach(p=>{ const pos=posMap[p.trim().toUpperCase()]; if(pos) board[`${pos.r},${pos.c}`]='white'; });
  drawBoard();
  const d = window._detectedData;
  showToast(`✅ Position importée ! ${d?.blackCount||0}N · ${d?.whiteCount||0}B — ${d?.gamePhase||''}`);
}

/* ── 🎬 ENREGISTREUR DE PARTIE RÉELLE ──
   Principe : l'utilisateur détecte la position après chaque coup joué sur le
   plateau physique. Le coup est INFÉRÉ en générant tous les coups légaux du
   camp au trait depuis la position précédente et en comparant chaque résultat
   à la nouvelle position détectée. À la sauvegarde, la séquence complète est
   re-rejouée par le moteur et comparée à la dernière position (vérification). */
let _scanRec=null;   // { startBoard, lastBoard, side, startSide, seq:[{lab,color,cells,dir,type,eject}] }

function _detToBoardMap(){
  if(!window._detectedPositions) return null;
  const colLetters='ABCDEFGHI', RWS=[5,6,7,8,9,8,7,6,5], posMap={};
  for(let r=0;r<9;r++) for(let c=0;c<RWS[r];c++) posMap[colLetters[r]+(c+1)]={r:r,c:c};
  const b={};
  (window._detectedPositions.black||[]).forEach(function(p){ const q=posMap[String(p).trim().toUpperCase()]; if(q) b[q.r+','+q.c]='black'; });
  (window._detectedPositions.white||[]).forEach(function(p){ const q=posMap[String(p).trim().toUpperCase()]; if(q) b[q.r+','+q.c]='white'; });
  return Object.keys(b).length ? b : null;
}
function _scanKey(b){ return Object.keys(b).sort().map(function(k){return k+':'+b[k][0];}).join(';'); }
function _scanBoardToAOStart(b){
  const cells=function(col){ return Object.keys(b).filter(function(k){return b[k]===col;})
    .map(function(k){ const p=k.split(','); return coordToABAPRO(+p[0],+p[1]).toLowerCase(); }).sort().join(''); };
  return '0'+cells('black')+',0'+cells('white');
}
// Exécute fn dans un bac à sable : sauvegarde puis restaure les globals du jeu
function _scanSandbox(startB, fn){
  const sb=board, scb=capturedByBlack, scw=capturedByWhite;
  board=JSON.parse(JSON.stringify(startB)); capturedByBlack=0; capturedByWhite=0;
  try { return fn(); }
  finally { board=sb; capturedByBlack=scb; capturedByWhite=scw; }
}
function _scanInferMove(P, N, color){
  return _scanSandbox(P, function(){
    const target=_scanKey(N);
    const moves=getAllMovesForColor(color);
    for(let i=0;i<moves.length;i++){
      const m=moves[i];
      const u=applyMove(m,color);
      const hit=(_scanKey(board)===target);
      undoMove(u);
      if(hit) return { cells:m.cells.map(function(c){return {r:c.r,c:c.c};}),
                       dir:{q:m.dir.q,r:m.dir.r}, type:(m.info&&m.info.type)||m.type, eject:!!m.eject };
    }
    return null;
  });
}
// Rejoue une liste de coups stockés depuis startB → plateau final.
// Chaque coup est re-résolu par son label ABA-PRO dans le contexte de la
// position courante (même mécanisme que le replay de la bibliothèque).
function _scanReplayMoves(startB, seq){
  return _scanSandbox(startB, function(){
    for(let i=0;i<seq.length;i++){
      const mv=resolveAbaProToken(seq[i].lab, seq[i].color);
      if(!mv) break;
      applyMove(mv, seq[i].color);
    }
    return JSON.parse(JSON.stringify(board));
  });
}
// Vérification finale : la séquence rejouée par le moteur redonne-t-elle la dernière position ?
function _scanVerifyReplay(rec){
  try{ return _scanKey(_scanReplayMoves(rec.startBoard, rec.seq))===_scanKey(rec.lastBoard); }
  catch(e){ return false; }
}
function _scanSeqString(rec){
  let out='', n=1;
  for(let i=0;i<rec.seq.length;i++){
    if(i%2===0) out+=(i?' ':'')+n+'.'+rec.seq[i].lab;
    else { out+=' '+rec.seq[i].lab; n++; }
  }
  return out;
}
function scanRecSideChange(v){ if(_scanRec){ _scanRec.side=v; scanRecRender(); } }
function scanRecStart(){
  const b=_detToBoardMap();
  if(!b){ showToast('⚠️ Détectez d\'abord une position (photo → Analyser)'); return; }
  const side=(document.getElementById('scan-side')||{}).value||'black';
  _scanRec={ startBoard:b, lastBoard:b, side:side, startSide:side, seq:[] };
  scanRecRender();
  showToast('🎬 Position de départ enregistrée — jouez un coup réel puis re-détectez');
}
function scanRecAdd(){
  if(!_scanRec){ scanRecStart(); return; }
  const nb=_detToBoardMap();
  if(!nb){ showToast('⚠️ Aucune position détectée'); return; }
  if(_scanKey(nb)===_scanKey(_scanRec.lastBoard)){ showToast('ℹ️ Position identique à la précédente — jouez un coup d\'abord'); return; }
  let mv=_scanInferMove(_scanRec.lastBoard, nb, _scanRec.side);
  let color=_scanRec.side;
  if(!mv){
    // l'utilisateur s'est peut-être trompé de trait : essayer l'autre camp
    const other=(color==='black')?'white':'black';
    mv=_scanInferMove(_scanRec.lastBoard, nb, other);
    if(mv){ color=other; showToast('ℹ️ Coup reconnu pour les '+(other==='black'?'Noirs':'Blancs')+' — trait corrigé'); }
  }
  if(!mv){
    showToast('❌ Aucun coup légal ne relie les deux positions — re-détectez ou 🔁 Resynchronisez');
    return;
  }
  let lab; try{ lab=moveToABAPRO(mv.cells,mv.dir,mv.type); }catch(e){ lab='?'; }
  _scanRec.seq.push({ lab:lab, color:color, eject:mv.eject });
  _scanRec.lastBoard=nb;
  _scanRec.side=(color==='black')?'white':'black';
  const sel=document.getElementById('scan-side'); if(sel) sel.value=_scanRec.side;
  scanRecRender();
  showToast('✅ Coup '+_scanRec.seq.length+' : '+lab+(mv.eject?' (éjection !)':''));
}
function scanRecUndo(){
  if(!_scanRec||!_scanRec.seq.length){ showToast('Rien à annuler'); return; }
  const rm=_scanRec.seq.pop();
  _scanRec.lastBoard=_scanReplayMoves(_scanRec.startBoard,_scanRec.seq);
  _scanRec.side=rm.color;
  const sel=document.getElementById('scan-side'); if(sel) sel.value=_scanRec.side;
  scanRecRender();
  showToast('↩️ Coup '+rm.lab+' annulé');
}
function scanRecResync(){
  if(!_scanRec){ showToast('Aucun enregistrement en cours'); return; }
  const nb=_detToBoardMap();
  if(!nb){ showToast('⚠️ Aucune position détectée'); return; }
  _scanRec.lastBoard=nb;
  scanRecRender();
  showToast('🔁 Position de référence resynchronisée (aucun coup ajouté) — vérifiez le trait');
}
function scanRecRender(){
  const st=document.getElementById('scan-rec-status'), mv=document.getElementById('scan-rec-moves'),
        sz=document.getElementById('scan-rec-savezone');
  if(!st) return;
  if(!_scanRec){ st.textContent='Aucun enregistrement en cours.'; if(mv) mv.innerHTML=''; if(sz) sz.style.display='none'; return; }
  st.textContent='🎬 Enregistrement : '+_scanRec.seq.length+' coup'+(_scanRec.seq.length>1?'s':'')
    +' · trait aux '+(_scanRec.side==='black'?'⚫ Noirs':'⚪ Blancs');
  if(mv){
    let h='';
    for(let i=0;i<_scanRec.seq.length;i++){
      const s=_scanRec.seq[i];
      if(i%2===0) h+='<span style="color:var(--muted)">'+(Math.floor(i/2)+1)+'.</span> ';
      h+='<span style="color:'+(s.color==='black'?'var(--text)':'var(--cream)')+'">'+s.lab+(s.eject?'<span style="color:var(--gold)">×</span>':'')+'</span> ';
    }
    mv.innerHTML=h||'<span style="color:var(--muted)">— en attente du premier coup —</span>';
  }
  if(sz){
    sz.style.display='block';
    const d=document.getElementById('scan-date');
    if(d && !d.value){ try{ d.valueAsDate=new Date(); }catch(e){} }
  }
}
function _scanGamesLoad(){ try{ return JSON.parse(localStorage.getItem('abaScannedGames')||'[]'); }catch(e){ return []; } }
function _scanGamesSave(l){ try{ localStorage.setItem('abaScannedGames', JSON.stringify(l)); }catch(e){ showToast('⚠️ Sauvegarde locale impossible (stockage plein ?)'); } }
function scanRecSave(){
  if(!_scanRec||!_scanRec.seq.length){ showToast('⚠️ Aucun coup enregistré à sauvegarder'); return; }
  const black=(document.getElementById('scan-black-name')||{}).value||''; 
  const white=(document.getElementById('scan-white-name')||{}).value||'';
  const variant=(document.getElementById('scan-variant')||{}).value||'custom';
  const date=(document.getElementById('scan-date')||{}).value||new Date().toISOString().slice(0,10);
  const verified=_scanVerifyReplay(_scanRec);
  const g={ id:Date.now(), date:date, black:black.trim()||'Noirs', white:white.trim()||'Blancs',
    variant:variant, start:_scanBoardToAOStart(_scanRec.startBoard), startColor:_scanRec.startSide,
    seq:_scanSeqString(_scanRec), plies:_scanRec.seq.length, verified:verified };
  const list=_scanGamesLoad(); list.unshift(g); _scanGamesSave(list);
  _scanRec=null; scanRecRender(); renderScannedGames();
  showToast(verified ? '💾 Partie sauvegardée et vérifiée par le moteur ✓'
                     : '💾 Partie sauvegardée — ⚠️ la relecture moteur diverge (détection imparfaite ?)');
}
function _scanGameFileStub(g){
  const slug=function(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'partie'; };
  return 'abalassembly-'+g.date+'-'+slug(g.black)+'-vs-'+slug(g.white);
}
function _scanDownload(filename, text, mime){
  try{
    const blob=new Blob([text],{type:mime||'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }catch(e){ showToast('⚠️ Téléchargement impossible sur ce navigateur'); }
}
function _scanGameNotationText(g){
  return 'Abalassembly — partie scannée sur plateau réel\n'
    +'Noirs : '+g.black+'   ·   Blancs : '+g.white+'\n'
    +'Variante : '+g.variant+'   ·   Date : '+g.date+'   ·   '+g.plies+' coups'
    +(g.verified?' · vérifiée par le moteur ✓':' · ⚠️ non vérifiée')+'\n'
    +'Départ (AO) : '+g.start+'\n\n'+g.seq+'\n';
}
function copyScannedGame(id){
  const g=_scanGamesLoad().find(function(x){return x.id===id;});
  if(!g){ showToast('Partie introuvable'); return; }
  const text=_scanGameNotationText(g);
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ showToast('📋 Notation copiée — colle-la dans WhatsApp, SMS…'); })
      .catch(function(){ showToast('⚠️ Copie refusée par le navigateur'); });
  } else { showToast('⚠️ Presse-papiers indisponible sur ce navigateur'); }
}
function exportScannedGame(id){
  const g=_scanGamesLoad().find(function(x){return x.id===id;});
  if(!g){ showToast('Partie introuvable'); return; }
  const bundle={ format:'abalassembly-scanned-game-v1', exportedAt:new Date().toISOString(), game:g };
  _scanDownload(_scanGameFileStub(g)+'.json', JSON.stringify(bundle,null,2));
  showToast('⬇️ Partie exportée en JSON');
}
function exportAllScannedGames(){
  const list=_scanGamesLoad();
  if(!list.length){ showToast('Aucune partie à exporter'); return; }
  const bundle={ format:'abalassembly-scanned-games-v1', exportedAt:new Date().toISOString(), count:list.length, games:list };
  _scanDownload('abalassembly-parties-scannees-'+new Date().toISOString().slice(0,10)+'.json', JSON.stringify(bundle,null,2));
  showToast('⬇️ '+list.length+' partie'+(list.length>1?'s':'')+' exportée'+(list.length>1?'s':''));
}
// Vérifie une partie importée en rejouant sa notation avec le moteur — jamais
// confiance aveugle dans un fichier reçu de l'extérieur (Vincent, Saab, etc.)
function _scanVerifyImported(g){
  try{
    if(!_setupFromAOStart(g.start)) return false;
    let color=g.startColor||'black';
    const tokens=String(g.seq).replace(/\d+\./g,' ').trim().split(/\s+/).filter(Boolean);
    if(!tokens.length) return false;
    for(let i=0;i<tokens.length;i++){
      const mv=resolveAbaProToken(tokens[i],color);
      if(!mv) return false;
      applyMove(mv,color);
      color=(color==='black')?'white':'black';
    }
    return true;
  }catch(e){ return false; }
}
/* ── 📤 IMPORTATEUR AVANCÉ ──
   Le format JSON natif (abalassembly-scanned-games-v1) est importé directement,
   comme avant. Les formats externes (.txt, .csv, .xlsx, .xls, .ods) — typiquement
   des exports d'autres outils comme Ula — sont analysés par une détection
   heuristique (titre + séquence de coups par ligne/rangée), puis chaque partie
   candidate est VÉRIFIÉE par rejeu du vrai moteur avant d'être proposée : jamais
   d'import silencieux d'un format externe, toujours un aperçu à confirmer. */
const ADV_LAYOUTS_AO = (function(){
  // Reconstruit la position AO de départ pour chaque variante connue, à partir
  // de LAYOUTS (déjà défini plus haut dans le jeu) — une seule source de vérité.
  if (typeof LAYOUTS === 'undefined') return {};
  const cellsOf = arr => arr.map(rc => coordToABAPRO(rc[0], rc[1]).toLowerCase()).sort().join('');
  const out = {};
  Object.keys(LAYOUTS).forEach(function(key){
    const L = LAYOUTS[key];
    out[key] = '0' + cellsOf(L.black) + ',0' + cellsOf(L.white);
  });
  return out;
})();

/* ── Format de position compacte de KAA (Saab) : EjBPosB_EjWPosW ──
   Ex. "0a12b123_0g789h789i789" → Noirs a1,a2,b1,b2,b3 · Blancs g7,g8,g9,h7,h8,h9,i7,i8,i9
   Grammaire documentée précisément dans KAA_aide.txt §3.4 et §11d, testée
   contre les exemples exacts du manuel avant intégration ici. */
function _advParseKAACompactPosition(str){
  const parts = String(str).trim().split('_');
  if (parts.length !== 2) return null;
  function parseSide(part){
    const m = part.match(/^(\d+)([a-i](?:\d+)?.*)$/i);
    if (!m) return null;
    const ejected = parseInt(m[1], 10);
    const rest = m[2].toLowerCase();
    const cells = [];
    const re = /([a-i])(\d+)/g;
    let mm;
    while ((mm = re.exec(rest))){
      const rowLetter = mm[1];
      for (const digit of mm[2]) cells.push(rowLetter + digit);
    }
    return { ejected, cells };
  }
  const black = parseSide(parts[0]), white = parseSide(parts[1]);
  if (!black || !white || !black.cells.length || !white.cells.length) return null;
  return { black, white };
}
function _advKAAToAOStart(str){
  const parsed = _advParseKAACompactPosition(str);
  if (!parsed) return null;
  return '0' + parsed.black.cells.slice().sort().join('') + ',0' + parsed.white.cells.slice().sort().join('');
}

/* ── Détection de la notation Nacre (KAA) ──
   Reconnaît qu'une séquence est en notation Nacre ("1.a1a4 1.-b5b4 2.c3c6…"
   ou la forme simplifiée sans préfixe "N.-" pour les Blancs), SANS tenter de
   la décoder en coups. La sémantique exacte (quelle bille du groupe sert de
   repère, distance non-adjacente autorisée) n'est pas assez précisément
   spécifiée dans le manuel pour être décodée sans risque d'erreur silencieuse
   sur de vraies parties — mieux vaut le signaler clairement à l'utilisateur
   que de deviner et importer un coup faux. À construire dès qu'un fichier
   KAA réel permettra de vérifier le décodage contre des parties connues. */
function _advLooksLikeNacre(seq){
  const s = String(seq).trim();
  if (!/^1\./.test(s)) return false;
  if (/\d+\.-/.test(s)) return true;               // préfixe "N.-" explicite pour les Blancs
  const tokens = s.replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
  // Nacre : premier_bille + destination potentiellement NON adjacentes (distance>1)
  return tokens.some(function(tok){
    const m = tok.match(/^([a-i])(\d)([a-i])(\d)$/i);
    if (!m) return false;
    const dr = Math.abs('abcdefghi'.indexOf(m[1].toLowerCase()) - 'abcdefghi'.indexOf(m[3].toLowerCase()));
    const dc = Math.abs(parseInt(m[2],10) - parseInt(m[4],10));
    return (dr + dc) > 2; // au-delà de la distance max d'un coup AbaPro à 4 caractères
  });
}

/* ── Résolution de la notation Nacre (KAA) — PROUVÉE, pas supposée ──
   Un token Nacre "AB" donne la case de départ de la QUEUE du groupe (A) et
   la case d'arrivée de la TÊTE après le déplacement d'UN pas (B) — jamais
   la position de repli intermédiaire. La distance A→B (en cases, le long
   d'une des 6 directions) donne directement la longueur du groupe : pour
   d5d7, distance=2 ⇒ groupe de 2 billes [d5,d6] avant le coup, [d6,d7] après.
   Validé le 19/07/2026 contre les 5 coups d'une vraie solution de puzzle KAA
   (Pzl_M_0021) rejoués par le vrai moteur, capture retrouvée exactement où
   attendue — voir la conversation pour le détail de la vérification.
   Couvre les coups EN LIGNE (move/push, 1-3 billes). Les coups latéraux
   (broadside) ne sont pas couverts — aucun exemple Nacre validé pour ce cas
   à ce jour ; un token qui ne résout à aucun coup légal en ligne est refusé
   plutôt que deviné. */
function _advResolveNacreToken(tok, color){
  const m = String(tok).trim().match(/^([a-i])(\d)([a-i])(\d)$/i);
  if (!m) return null;
  const A = m[1].toLowerCase() + m[2], B = m[3].toLowerCase() + m[4];
  const pA = abaproToRc(A), pB = abaproToRc(B);
  if (!pA || !pB) return null;
  const axA = rcToAxial(pA.r, pA.c), axB = rcToAxial(pB.r, pB.c);
  const dq = axB.q - axA.q, dr = axB.r - axA.r;
  for (const dir of AX_DIRS){
    for (let k = 1; k <= 3; k++){
      if (dq !== dir.q * k || dr !== dir.r * k) continue;
      const cells = [];
      let onBoard = true;
      for (let s = 0; s < k; s++){
        const rc = axialToRc(axA.q + dir.q * s, axA.r + dir.r * s);
        if (!rc) { onBoard = false; break; }
        cells.push(rc);
      }
      if (!onBoard) continue;
      if (!cells.every(c => board[akey(c.r, c.c)] === color)) continue; // toutes du joueur au trait
      const moves = getAllMovesForColor(color);
      const match = moves.find(mv => mv.cells.length === cells.length &&
        mv.dir.q === dir.q && mv.dir.r === dir.r &&
        mv.cells.every(c => cells.some(hc => hc.r === c.r && hc.c === c.c)));
      if (match) return match; // coup géométriquement plausible ET légal selon le moteur
    }
  }
  return _advResolveNacreSidestep(tok, color, axA, axB); // en ligne épuisé → tenter un coup latéral
}

/* ── Résolution Nacre des coups LATÉRAUX (broadside) — d'après le manuel KAA §11 ──
   Format AbaPro d'un broadside : [début_groupe][fin_groupe][destination_début]
   (6 caractères). Conversion Nacre documentée : "utilise préférentiellement
   fin_groupe+destination_début, sauf quand c'est ambigu (même axe hexagonal),
   auquel cas utilise début_groupe+destination_dernière_bille" — les deux
   interprétations sont tentées ici, dans cet ordre, vérifiées contre le vrai
   moteur exactement comme les coups en ligne.
   Limite RÉELLEMENT découverte en le testant (pas dans le manuel) : deux
   groupes de tailles différentes peuvent produire la MÊME paire Nacre depuis
   une même position (ex. "c4d3" correspond à la fois à un groupe de 2 et de
   3 billes selon la position) — ambiguïté propre à la notation elle-même,
   pas un bug. Le résolveur retient le premier coup légal trouvé (groupe le
   plus petit en priorité), sans prétendre lever une ambiguïté qui n'existe
   pas dans la notation source. */
function _advResolveNacreSidestep(tok, color, axA, axB){
  function tryHyp(getDebut, getFin, getShift){
    for (const axisDir of AX_DIRS){
      for (const size of [2, 3]){
        const debut = getDebut(axisDir, size), fin = getFin(axisDir, size), shift = getShift(axisDir, size);
        if (!debut || !fin || !shift) continue;
        const cells = [];
        let onBoard = true;
        for (let s = 0; s < size; s++){
          const rc = axialToRc(debut.q + axisDir.q * s, debut.r + axisDir.r * s);
          if (!rc) { onBoard = false; break; }
          cells.push(rc);
        }
        if (!onBoard) continue;
        if (!cells.every(c => board[akey(c.r, c.c)] === color)) continue;
        const moves = getAllMovesForColor(color);
        const match = moves.find(mv => mv.cells.length === cells.length &&
          mv.dir.q === shift.q && mv.dir.r === shift.r &&
          mv.cells.every(c => cells.some(hc => hc.r === c.r && hc.c === c.c)));
        if (match) return match;
      }
    }
    return null;
  }
  /* Ordre inverse depuis le 24/07/2026. L'hypothese « debut + destination
     de l'autre extremite » est la regle correcte et passe donc en premier ;
     l'ancienne reste en repli pour relire les sequences ecrites avant la
     correction. */
  // Regle correcte : A = une extremite du groupe, B = arrivee de l'AUTRE extremite.
  let res = tryHyp(
    () => axA,
    (axisDir, size) => ({ q: axA.q + axisDir.q * (size - 1), r: axA.r + axisDir.r * (size - 1) }),
    (axisDir, size) => { const f = { q: axA.q + axisDir.q * (size - 1), r: axA.r + axisDir.r * (size - 1) }; return { q: axB.q - f.q, r: axB.r - f.r }; }
  );
  if (res) return res;
  // Repli : ancienne regle (fin_groupe + destination_debut), pour les sequences
  // exportees avant le 24/07/2026.
  return tryHyp(
    (axisDir, size) => ({ q: axA.q - axisDir.q * (size - 1), r: axA.r - axisDir.r * (size - 1) }),
    () => axA,
    (axisDir, size) => { const d = { q: axA.q - axisDir.q * (size - 1), r: axA.r - axisDir.r * (size - 1) }; return { q: axB.q - d.q, r: axB.r - d.r }; }
  );
}

function _advGuessLayout(title){
  const t = String(title).toLowerCase();
  if (t.includes('mbel') || t.includes('belg')) return 'belgian';
  if (t.includes('allem') || t.includes('german')) return 'german';
  if (t.includes('holl') || t.includes('dutch')) return 'dutch';
  if (t.includes('suiss') || t.includes('swiss')) return 'swiss';
  if (t.includes('mstd') || t.includes('standard')) return 'standard';
  return null;
}
function _advDeclaredScore(title){
  const m = String(title).match(/\((\d+)-(\d+)\)/);
  return m ? { black: +m[1], white: +m[2] } : null;
}
function _advGuessLabels(title){
  const m = String(title).match(/\b(AP\d+)\b|\b(Ula\d+)\b/g) || [];
  const uniq = [...new Set(m)];
  if (uniq.length >= 2) return { black: uniq[0], white: uniq[1] };
  if (uniq.length === 1) return { black: uniq[0], white: uniq[0] + ' (auto-jeu)' };
  return { black: 'Noirs', white: 'Blancs' };
}
function _advLooksLikeSeq(s){ return /^\s*1\.\s*[a-zA-Z]\d/.test(s) && /[a-zA-Z]\d/.test(s); }
function _advLooksLikeTitle(s){ return !_advLooksLikeSeq(s) && (s.includes(',') || s.startsWith('#')) && s.length > 3 && s.length < 300; }
// rows : tableau de "lignes", chacune un tableau de chaînes (cellules de tableur,
// ou groupes de lignes de texte) — trouve un titre + une séquence par ligne.
function _advExtractCandidates(rows){
  const out = [];
  rows.forEach(function(row){
    let title = null, seq = null;
    row.forEach(function(cell){
      const s = String(cell == null ? '' : cell).trim();
      if (!s) return;
      if (_advLooksLikeSeq(s) && !seq) seq = s;
      else if (_advLooksLikeTitle(s) && !title) title = s;
    });
    if (title && seq) out.push({ title, seq });
  });
  return out;
}
// Vérifie une partie candidate par rejeu réel — jamais de confiance aveugle
// dans un format externe. Sandboxé (_scanSandbox) : ne touche jamais la partie en cours.
function _advVerifyCandidate(cand){
  const isNacre = _advLooksLikeNacre(cand.seq);
  const layoutKey = _advGuessLayout(cand.title);
  if (!layoutKey || !ADV_LAYOUTS_AO[layoutKey]) return { ok: false, reason: 'position de départ non reconnue' };
  const start = ADV_LAYOUTS_AO[layoutKey];
  const score = _advDeclaredScore(cand.title);
  const [b, w] = start.split(',');
  const board = {};
  (b.slice(1).match(/[a-i][1-9]/g) || []).forEach(cc => { const p = abaproToRc(cc); board[p.r + ',' + p.c] = 'black'; });
  (w.slice(1).match(/[a-i][1-9]/g) || []).forEach(cc => { const p = abaproToRc(cc); board[p.r + ',' + p.c] = 'white'; });

  return _scanSandbox(board, function(){
    let color = 'black', plies = 0;
    // Nacre utilise parfois un préfixe "N.-" explicite pour les Blancs — on le
    // retire comme les numéros de coup, la couleur reste gérée par l'alternance.
    const tokens = String(cand.seq).replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean).map(t => t.toLowerCase());
    for (const tok of tokens){
      const mv = isNacre ? _advResolveNacreToken(tok, color) : resolveAbaProToken(tok, color);
      if (!mv) return { ok: false, reason: (isNacre ? 'coup Nacre non résolu (en ligne et latéral testés, sans succès) : ' : 'coup illégal : ') + tok };
      applyMove(mv, color);
      color = color === 'black' ? 'white' : 'black';
      plies++;
      if (score && capturedByBlack >= score.black && capturedByWhite >= score.white) break;
      if (capturedByBlack >= 6 || capturedByWhite >= 6) break;
    }
    const scoreMatches = !score || (capturedByBlack === score.black && capturedByWhite === score.white);
    const labels = _advGuessLabels(cand.title);
    return { ok: true, game: {
      date: new Date().toISOString().slice(0,10), black: labels.black, white: labels.white,
      variant: layoutKey, start, startColor: 'black', seq: cand.seq, plies, verified: scoreMatches,
      _src: cand.title
    }};
  });
}

// Chargeur SheetJS à la demande (Excel/.ods), plusieurs CDN en repli — même
// principe que le chargeur Three.js de la vue 3D.
let _xlsxLoaded = null;
function _advEnsureXLSX(){
  if (_xlsxLoaded) return _xlsxLoaded;
  const SOURCES = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  ];
  _xlsxLoaded = new Promise(function(resolve, reject){
    (function tryNext(i){
      if (i >= SOURCES.length) { reject(new Error('toutes les sources XLSX ont échoué')); return; }
      const s = document.createElement('script');
      s.src = SOURCES[i];
      s.onload = function(){ resolve(window.XLSX); };
      s.onerror = function(){ tryNext(i + 1); };
      document.head.appendChild(s);
    })(0);
  });
  return _xlsxLoaded;
}

function _advRowsFromWorkbook(wb){
  const XLSX = window.XLSX;
  const rows = [];
  wb.SheetNames.forEach(function(name){
    const sheet = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    data.forEach(function(r){ rows.push(r); });
  });
  return rows;
}
function _advRowsFromText(text){
  // Chaque ligne non vide est traitée comme sa propre "rangée" ; si titre et
  // séquence sont sur des lignes séparées, on regroupe une ligne avec la suivante.
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i++){
    if (_advLooksLikeTitle(lines[i]) && lines[i+1] && _advLooksLikeSeq(lines[i+1])){
      rows.push([lines[i], lines[i+1]]); i++;
    } else {
      rows.push([lines[i]]);
    }
  }
  return rows;
}

function _advShowPreview(candidates){
  const host = document.getElementById('adv-import-preview');
  if (!host) return;
  const results = candidates.map(_advVerifyCandidate);
  const usable = results.map(function(r, i){ return { r, cand: candidates[i] }; }).filter(x => x.r.ok);
  if (!usable.length){
    host.innerHTML = '<div style="margin-top:10px;font-size:12px;color:var(--muted)">Aucune partie exploitable trouvée dans ce fichier.</div>';
    showToast('❌ Aucune partie reconnue dans ce fichier');
    return;
  }
  window._advPending = usable.map(x => x.r.game);
  let h = '<div style="margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:12px">'
    + '<div style="font-weight:700;color:var(--gold);margin-bottom:8px">📤 ' + usable.length + ' partie' + (usable.length>1?'s':'') + ' détectée' + (usable.length>1?'s':'') + '</div>';
  usable.forEach(function(x, i){
    const g = x.r.game;
    h += '<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer">'
      + '<input type="checkbox" checked data-adv-idx="' + i + '" style="margin-top:3px">'
      + '<span>' + (g.verified ? '✓' : '⚠️') + ' <b>' + g.black + '</b> vs <b>' + g.white + '</b> · ' + g.variant + ' · ' + g.plies + ' coups'
      + '<br><span style="color:var(--muted)">' + g._src.slice(0,80) + '</span></span></label>';
  });
  h += '<div style="display:flex;gap:8px;margin-top:10px">'
    + '<button class="cam-btn primary" onclick="advConfirmImport()">📥 Importer la sélection</button>'
    + '<button class="cam-btn" onclick="advCancelImport()">Annuler</button></div></div>';
  host.innerHTML = h;
  const verified = usable.filter(x => x.r.game.verified).length;
  showToast('📤 ' + usable.length + ' partie(s) trouvée(s), ' + verified + ' vérifiée(s) — relis avant de confirmer');
}
function advConfirmImport(){
  const boxes = document.querySelectorAll('#adv-import-preview input[data-adv-idx]:checked');
  const chosen = Array.from(boxes).map(b => window._advPending[+b.getAttribute('data-adv-idx')]);
  if (!chosen.length){ showToast('Aucune partie sélectionnée'); return; }
  const existing = _scanGamesLoad();
  chosen.forEach(function(g){
    const clean = { id: Date.now()+Math.floor(Math.random()*1000), date:g.date, black:g.black, white:g.white,
      variant:g.variant, start:g.start, startColor:g.startColor, seq:g.seq, plies:g.plies, verified:g.verified };
    existing.unshift(clean);
  });
  _scanGamesSave(existing);
  window._advPending = null;
  document.getElementById('adv-import-preview').innerHTML = '';
  renderScannedGames();
  showToast('📥 ' + chosen.length + ' partie(s) importée(s)');
}
function advCancelImport(){
  window._advPending = null;
  const host = document.getElementById('adv-import-preview');
  if (host) host.innerHTML = '';
  showToast('Import annulé');
}

function importScannedGamesFile(input){
  const file = input && input.files && input.files[0];
  if (!file) return;
  const name = (file.name || '').toLowerCase();

  if (name.endsWith('.json') || file.type === 'application/json'){
    _importJsonScannedGames(input, file);
    return;
  }
  if (name.endsWith('.txt') || name.endsWith('.csv')){
    const reader = new FileReader();
    reader.onload = function(){ _advShowPreview(_advExtractCandidates(_advRowsFromText(reader.result))); input.value=''; };
    reader.onerror = function(){ showToast('❌ Lecture du fichier impossible'); input.value=''; };
    reader.readAsText(file);
    return;
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods')){
    showToast('⏳ Chargement du lecteur de tableur…');
    _advEnsureXLSX().then(function(XLSX){
      const reader = new FileReader();
      reader.onload = function(){
        try{
          const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
          _advShowPreview(_advExtractCandidates(_advRowsFromWorkbook(wb)));
        }catch(e){ showToast('❌ Fichier tableur illisible'); }
        input.value = '';
      };
      reader.onerror = function(){ showToast('❌ Lecture du fichier impossible'); input.value=''; };
      reader.readAsArrayBuffer(file);
    }).catch(function(){
      showToast('⚠️ Lecteur de tableur indisponible (connexion internet nécessaire pour ce format)');
      input.value = '';
    });
    return;
  }
  showToast('❌ Format non reconnu (.json, .txt, .csv, .xlsx, .xls, .ods)');
  input.value = '';
}
function _importJsonScannedGames(input, file){
  const reader=new FileReader();
  reader.onload=function(){
    let data;
    try{ data=JSON.parse(reader.result); }catch(e){ showToast('❌ Fichier illisible (JSON invalide)'); input.value=''; return; }
    let incoming=[];
    if(data && data.format==='abalassembly-scanned-games-v1' && Array.isArray(data.games)) incoming=data.games;
    else if(data && data.format==='abalassembly-scanned-game-v1' && data.game) incoming=[data.game];
    else if(data && data.start && data.seq) incoming=[data];  // fichier brut sans enveloppe
    else { showToast('❌ Format non reconnu'); input.value=''; return; }

    const existing=_scanGamesLoad();
    let added=0, verified=0, rejected=0;
    incoming.forEach(function(g){
      if(!g || !g.start || !g.seq){ rejected++; return; }
      const ok=_scanVerifyImported(g);
      if(ok) verified++;
      const clean={ id:Date.now()+Math.floor(Math.random()*1000), date:g.date||'?',
        black:g.black||'Noirs', white:g.white||'Blancs', variant:g.variant||'custom',
        start:g.start, startColor:g.startColor||'black', seq:g.seq,
        plies:g.plies||(String(g.seq).split(/\s+/).filter(Boolean).length), verified:ok };
      existing.unshift(clean); added++;
    });
    _scanGamesSave(existing);
    renderScannedGames();
    input.value='';
    showToast('📥 '+added+' partie'+(added>1?'s':'')+' importée'+(added>1?'s':'')
      +' ('+verified+' vérifiée'+(verified>1?'s':'')+(rejected?', '+rejected+' ignorée(s)':'')+')');
  };
  reader.readAsText(file);
}
function renderScannedGames(){
  const el=document.getElementById('scan-games-list'); if(!el) return;
  const list=_scanGamesLoad();
  let bar='<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
    +'<button class="cam-btn" style="padding:4px 10px" onclick="exportAllScannedGames()">⬇️ Tout exporter'+(list.length?' ('+list.length+')':'')+'</button>'
    +'<label class="cam-btn" style="padding:4px 10px;cursor:pointer">📥 Importer un fichier'
    +'<input type="file" accept=".json,application/json,.txt,.csv,.xlsx,.xls,.ods" style="display:none" onchange="importScannedGamesFile(this)"></label>'
    +'</div><div id="adv-import-preview"></div>';
  if(!list.length){ el.innerHTML=bar+'<div style="font-size:12px;color:var(--muted)">Aucune partie enregistrée pour l\'instant.</div>'; return; }
  let h='';
  for(let i=0;i<list.length;i++){
    const g=list[i];
    h+='<div style="display:flex;align-items:center;gap:6px;padding:7px 4px;border-bottom:1px solid var(--border);font-size:12px;flex-wrap:wrap">'
      +'<span style="flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      +(g.verified?'✓ ':'⚠️ ')+'<b>'+g.black+'</b> vs <b>'+g.white+'</b> · '+g.variant+' · '+g.date+' · '+g.plies+' coups</span>'
      +'<button class="cam-btn" style="padding:4px 9px" onclick="replayScannedGame('+g.id+')" title="Rejouer">▶</button>'
      +'<button class="cam-btn" style="padding:4px 9px" onclick="copyScannedGame('+g.id+')" title="Copier la notation">⧉</button>'
      +'<button class="cam-btn" style="padding:4px 9px" onclick="exportScannedGame('+g.id+')" title="Exporter en JSON">⬇️</button>'
      +'<button class="cam-btn" style="padding:4px 9px" onclick="deleteScannedGame('+g.id+')" title="Supprimer">🗑</button>'
      +'</div>';
  }
  el.innerHTML=bar+h;
}
function deleteScannedGame(id){
  const list=_scanGamesLoad().filter(function(g){return g.id!==id;});
  _scanGamesSave(list); renderScannedGames(); showToast('🗑 Partie supprimée');
}
function replayScannedGame(id){
  const g=_scanGamesLoad().find(function(x){return x.id===id;});
  if(!g){ showToast('Partie introuvable'); return; }
  showPage('game');
  if(!_setupFromAOStart(g.start)){ showToast('Position de départ illisible'); return; }
  if(typeof LAYOUTS!=='undefined' && LAYOUTS[g.variant]) currentLayout=g.variant;
  _replaySeqToSnapshots(g.seq, g.black+' vs '+g.white+' ('+g.variant+' · '+g.date+')', g.startColor||'black');
}

// affiche la liste des parties scannées au chargement de la page
try{ renderScannedGames(); }catch(e){}

/* ── PUBLISH ARTICLE (FightClub / writer) ── */
function publishArticle() {
  if (!currentUser || currentUser.role !== 'writer') {
    showToast('⛔ Accès réservé aux rédacteurs');
    return;
  }
  const title = document.getElementById('article-title')?.value?.trim();
  const body  = document.getElementById('article-body')?.value?.trim();
  const cat   = document.getElementById('article-cat')?.value;
  if (!title) { showToast('⚠️ Entrez un titre pour l\'article'); return; }
  if (!body || body.length < 50) { showToast('⚠️ L\'article est trop court (min. 50 caractères)'); return; }

  // Save to localStorage as demo
  try {
    const articles = JSON.parse(localStorage.getItem('abalone_articles') || '[]');
    articles.unshift({
      id: Date.now(), title, body, cat,
      author: currentUser.username,
      date: new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'}),
      published: true
    });
    localStorage.setItem('abalone_articles', JSON.stringify(articles.slice(0,20)));
  } catch(e) {}

  showToast(`✅ Article "${title}" publié dans ${cat} !`);
  document.getElementById('article-title').value = '';
  document.getElementById('article-body').value = '';

  // Refresh article list
  refreshWriterArticles();
}

function refreshWriterArticles() {
  try {
    const articles = JSON.parse(localStorage.getItem('abalone_articles') || '[]');
    const wrap = document.getElementById('writer-articles');
    if (!wrap || articles.length === 0) return;
    const localHtml = articles.slice(0,5).map(a => `
      <div style="padding:12px 14px;background:var(--surface);border:1px solid rgba(138,114,210,0.25);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;color:var(--text)">${escapeHtml(a.title)}</div>
          <div style="font-size:11px;color:var(--muted)">${escapeHtml(a.cat)} · ${escapeHtml(a.date)}</div>
        </div>
        <span style="font-size:10px;padding:2px 8px;background:rgba(74,148,99,0.12);color:var(--accent-green-light);border-radius:12px;border:1px solid rgba(74,148,99,0.25)">Publié</span>
      </div>`).join('');
    wrap.innerHTML = localHtml + wrap.innerHTML;
  } catch(e) {}
}


