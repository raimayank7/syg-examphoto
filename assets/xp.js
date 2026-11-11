/* Exam Photo: the in-browser resizer, the cm to pixel calculator and the exam filter on the home page.
   Nothing is uploaded: the picture is read, cropped and saved inside the browser. */
(function () {
  'use strict';
  var d = document, $ = function (id) { return d.getElementById(id); };
  var esc = function (s) { return window.SYG ? SYG.esc(s) : String(s); };

  /* ---------- home: filter the exam cards ---------- */
  var q = $('xp-q');
  if (q) {
    var cards = [].slice.call(d.querySelectorAll('[data-xp-exam]')), none = $('xp-none');
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase(), n = 0;
      cards.forEach(function (c) { var hit = !v || c.getAttribute('data-xp-exam').indexOf(v) > -1; c.hidden = !hit; if (hit) n++; });
      if (none) none.hidden = n > 0;
    });
  }

  /* ---------- cm to pixels ---------- */
  var cw = $('cm-w');
  if (cw) {
    var ch = $('cm-h'), dp = $('cm-dpi'), out = $('cm-out');
    var calc = function () {
      var w = parseFloat(cw.value), h = parseFloat(ch.value), dpi = parseFloat(dp.value);
      if (!(w > 0) || !(h > 0) || !(dpi > 0)) { out.hidden = true; return; }
      var pw = Math.round(w / 2.54 * dpi), ph = Math.round(h / 2.54 * dpi);
      out.hidden = false;
      out.innerHTML = '<h2>' + esc(w) + ' cm × ' + esc(h) + ' cm at ' + esc(dpi) + ' dots per inch</h2><p class="big">' + pw + ' × ' + ph + ' pixels</p>' +
        '<p class="hint">Width: ' + esc(w) + ' ÷ 2.54 × ' + esc(dpi) + ' = ' + pw + '. Height: ' + esc(h) + ' ÷ 2.54 × ' + esc(dpi) + ' = ' + ph + '.</p>' +
        '<div class="acts"><a class="btn" href="/resize/?w=' + pw + '&amp;h=' + ph + '">Resize a picture to ' + pw + ' × ' + ph + '</a>' +
        '<button class="btn ghost" type="button" data-copy="' + pw + ' x ' + ph + ' pixels">Copy</button></div>';
    };
    [cw, ch, dp].forEach(function (e) { e.addEventListener('input', calc); e.addEventListener('change', calc); });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cm]'); if (!b) return;
      var p = b.getAttribute('data-cm').split(','); cw.value = p[0]; ch.value = p[1]; calc();
    });
    calc();
  }

  /* ---------- the resizer ---------- */
  var tool = $('xp-tool');
  if (!tool) return;
  var DATA = JSON.parse($('xp-data').textContent);
  var selE = $('xp-exam'), selD = $('xp-doc'), rule = $('xp-rule'), custom = $('xp-custom'), file = $('xp-file'), work = $('xp-work'),
    cv = $('xp-cv'), zoom = $('xp-zoom'), shapes = $('xp-shapes'), clean = $('xp-clean'), bw = $('xp-bw'), cleanRow = $('xp-clean-row'),
    make = $('xp-make'), res = $('xp-res'), liveBox = $('xp-live'), pick = $('xp-pick');
  var ctx = cv.getContext('2d');
  var S = { img: null, rot: 0, zoom: 1, ox: 0, oy: 0, outW: 413, outH: 531, kb: [10, 200], free: false, name: 'photo', url: null };
  var SHAPES = [['Wide strip 3:1', 3], ['Signature 7:3', 7 / 3], ['2:1', 2], ['Square', 1], ['Tall 3:4', 0.75]];

  function exam() { for (var i = 0; i < DATA.length; i++) if (DATA[i].id === selE.value) return DATA[i]; return null; }
  function doc() { var e = exam(); if (!e) return null; for (var i = 0; i < e.docs.length; i++) if (e.docs[i].key === selD.value) return e.docs[i]; return e.docs[0]; }

  function fillDocs() {
    var e = exam();
    selD.innerHTML = '';
    if (!e) { selD.disabled = true; selD.innerHTML = '<option>Any picture</option>'; return; }
    selD.disabled = false;
    e.docs.forEach(function (x) { var o = d.createElement('option'); o.value = x.key; o.textContent = x.label; selD.appendChild(o); });
  }

  function num(id, lo, hi, def) { var v = parseFloat($(id).value); return v >= lo && v <= hi ? v : def; }

  function apply() {
    var e = exam(), x = doc();
    res.hidden = true;
    custom.hidden = !!e;
    if (!e) {
      S.outW = Math.round(num('xp-cw', 20, 4000, 413)); S.outH = Math.round(num('xp-chh', 20, 4000, 531));
      var mn = num('xp-min', 0, 20000, 10), mx = num('xp-max', 1, 20000, 200); if (mx <= mn) mx = mn + 10;
      S.kb = [mn, mx]; S.free = false; S.name = 'picture';
      rule.innerHTML = 'Your own size: <b>' + S.outW + ' × ' + S.outH + ' pixels</b>, between <b>' + mn + ' and ' + mx + ' KB</b>, JPG.';
      liveBox.hidden = true; pick.hidden = false; cleanRow.hidden = false; shapes.hidden = true;
    } else if (x.live) {
      rule.innerHTML = '';
      liveBox.hidden = false; pick.hidden = true; work.hidden = true;
      liveBox.innerHTML = '<b>No file needed.</b> For ' + esc(e.name) + ' the ' + esc(x.label.toLowerCase()) + ' is taken live by the application form with your camera. ' +
        '<a href="/' + e.id + '/">See how to get it right</a>.';
      return;
    } else {
      S.outW = x.out[0]; S.outH = x.out[1]; S.kb = x.kb.slice(); S.free = x.shape === 'free'; S.name = e.id + '-' + x.key;
      rule.innerHTML = '<b>' + esc(e.name) + ', ' + esc(x.label.toLowerCase()) + ':</b> ' + esc(x.fmt) + ', ' + x.kb[0] + ' to ' + x.kb[1] + ' KB' +
        (x.px ? ', ' + x.px[0] + ' × ' + x.px[1] + ' pixels' : '') + (x.cm ? ', ' + x.cm[0] + ' cm × ' + x.cm[1] + ' cm' : '') +
        '. <a href="/' + e.id + '/">Full rules and source</a>.' + (x.px ? '' : ' <span class="hint">The pixel size we make (' + (S.free ? 'up to ' + Math.max(x.out[0], x.out[1]) + ' on the long side' : x.out[0] + ' × ' + x.out[1]) + ') is our choice; the notice gives none.</span>');
      liveBox.hidden = true; pick.hidden = false;
      cleanRow.hidden = x.kind === 'photo';
      clean.checked = x.kind !== 'photo'; bw.checked = false;
      shapes.hidden = !S.free;
      if (S.free) setShape(x.kind === 'thumb' ? 4 / 3 : 1, x);
    }
    if (S.img) { fit(); draw(); work.hidden = false; }
  }

  function setShape(r, x) {
    var long = x ? Math.max(x.out[0], x.out[1]) : Math.max(S.outW, S.outH);
    if (r >= 1) { S.outW = long; S.outH = Math.round(long / r); } else { S.outH = long; S.outW = Math.round(long * r); }
    [].forEach.call(shapes.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', Math.abs(parseFloat(b.value) - r) < 0.01 ? 'true' : 'false'); });
    if (S.img) { fit(); draw(); }
  }
  shapes.innerHTML = SHAPES.concat([['Wide 4:3', 4 / 3]]).map(function (s) { return '<button type="button" value="' + s[1] + '" aria-pressed="false">' + s[0] + '</button>'; }).join('');
  shapes.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setShape(parseFloat(b.value), doc()); });

  /* size of the picture after turning it */
  function iw() { return S.rot % 2 ? S.img.height : S.img.width; }
  function ih() { return S.rot % 2 ? S.img.width : S.img.height; }

  function fit() {
    var max = Math.min(tool.clientWidth - 2, 460), a = S.outW / S.outH, w = max, h = w / a;
    if (h > 400) { h = 400; w = h * a; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = Math.round(w) + 'px'; cv.style.height = Math.round(h) + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    S.cw = w; S.ch = h; S.dpr = dpr;
    clamp();
  }
  function base() { return Math.max(S.cw / iw(), S.ch / ih()); }
  function clamp() {
    var s = base() * S.zoom, mx = Math.max(0, (iw() * s - S.cw) / 2), my = Math.max(0, (ih() * s - S.ch) / 2);
    S.ox = Math.max(-mx, Math.min(mx, S.ox)); S.oy = Math.max(-my, Math.min(my, S.oy));
  }
  /* paint the chosen part of the picture on any canvas whose size is k times the stage */
  function paint(c, k) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, S.cw * k + 2, S.ch * k + 2);
    c.save();
    c.translate((S.cw / 2 + S.ox) * k, (S.ch / 2 + S.oy) * k);
    c.rotate(S.rot * Math.PI / 2);
    var s = base() * S.zoom * k; c.scale(s, s);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(S.img, -S.img.width / 2, -S.img.height / 2);
    c.restore();
  }
  function draw() { if (S.img) paint(ctx, S.dpr); }

  /* drag to move, pinch or slider to zoom */
  var pts = {}, last = null, pinch = 0;
  cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; last = [e.clientX, e.clientY]; pinch = 0; });
  cv.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) { S.zoom = Math.max(0.5, Math.min(6, S.zoom * dist / pinch)); zoom.value = S.zoom; }
      pinch = dist;
    } else if (last) { S.ox += e.clientX - last[0]; S.oy += e.clientY - last[1]; last = [e.clientX, e.clientY]; }
    clamp(); draw();
  });
  var up = function (e) { delete pts[e.pointerId]; last = null; pinch = 0; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('keydown', function (e) {
    var k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
    if (!k) return; e.preventDefault(); S.ox += k[0]; S.oy += k[1]; clamp(); draw();
  });
  zoom.addEventListener('input', function () { S.zoom = parseFloat(zoom.value); clamp(); draw(); });
  $('xp-rot').addEventListener('click', function () { S.rot = (S.rot + 1) % 4; S.ox = S.oy = 0; clamp(); draw(); });
  window.addEventListener('resize', function () { if (S.img && !work.hidden) { fit(); draw(); } });

  function load(f) {
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i.test(f.name)) { SYG.toast('Please choose a picture file'); return; }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      S.img = im; S.rot = 0; S.zoom = 1; S.ox = S.oy = 0; zoom.value = 1;
      work.hidden = false; res.hidden = true; fit(); draw();
      work.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    im.onerror = function () { SYG.toast('This picture could not be opened. Try a JPG or PNG.'); };
    im.src = url;
  }
  file.addEventListener('change', function () { load(file.files[0]); });
  tool.addEventListener('dragover', function (e) { e.preventDefault(); });
  tool.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); });

  /* make the paper white and the ink dark: stretch the levels between the darkest ink and the paper */
  function levels(c, w, h, gray, white) {
    var im = c.getImageData(0, 0, w, h), p = im.data, i, hist = new Uint32Array(256), n = w * h;
    for (i = 0; i < p.length; i += 4) hist[(p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000 | 0]++;
    var acc = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > n * 0.01) { lo = i; break; } }
    acc = 0;
    for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > n * 0.5) { hi = i; break; } }   /* the paper is most of the picture */
    hi = Math.max(lo + 40, hi * 0.9); lo = Math.min(lo, 70);
    var k = 255 / (hi - lo);
    for (i = 0; i < p.length; i += 4) {
      var r = p[i], g = p[i + 1], b = p[i + 2];
      if (gray) { r = g = b = (r * 299 + g * 587 + b * 114) / 1000; }
      if (white) { r = (r - lo) * k; g = (g - lo) * k; b = (b - lo) * k; }
      p[i] = r < 0 ? 0 : r > 255 ? 255 : r; p[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; p[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    c.putImageData(im, 0, 0);
  }

  function blobOf(c, q) { return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', q); }); }

  /* add harmless comment blocks to a JPEG so a very small file reaches the minimum size the form asks for */
  function pad(blob, bytes) {
    return blob.arrayBuffer().then(function (buf) {
      var src = new Uint8Array(buf), need = bytes - src.length, parts = [src.subarray(0, 2)];
      while (need > 0) {
        var len = Math.min(need, 65000), seg = new Uint8Array(len + 4);
        seg[0] = 0xFF; seg[1] = 0xFE; seg[2] = (len + 2) >> 8; seg[3] = (len + 2) & 255; seg.fill(0x20, 4);
        parts.push(seg); need -= len + 4;
      }
      parts.push(src.subarray(2));
      return new Blob(parts, { type: 'image/jpeg' });
    });
  }

  function render() {
    /* draw large first, then halve step by step: much sharper than one big jump down */
    var f = S.outW / S.cw, crop = Math.min((S.cw / (base() * S.zoom)) / S.outW, 8), k = 1;
    while (k * 2 <= crop && S.outW * k * 2 <= 4096 && S.outH * k * 2 <= 4096) k *= 2;
    var c = d.createElement('canvas'); c.width = S.outW * k; c.height = S.outH * k;
    paint(c.getContext('2d'), f * k);
    while (k > 1) {
      k /= 2;
      var n = d.createElement('canvas'); n.width = S.outW * k; n.height = S.outH * k;
      var nc = n.getContext('2d'); nc.imageSmoothingEnabled = true; nc.imageSmoothingQuality = 'high';
      nc.drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    if (clean.checked && !cleanRow.hidden || bw.checked) levels(c.getContext('2d'), c.width, c.height, bw.checked, clean.checked && !cleanRow.hidden);
    return c;
  }

  function build() {
    if (!S.img) { SYG.toast('Choose a picture first'); return; }
    make.disabled = true; make.textContent = 'Working…';
    var c = render(), minB = S.kb[0] * 1024, maxB = S.kb[1] * 1000, lo = 0.2, hi = 0.97, best = null, padded = false, small = false;
    var step = function (i) {
      if (i === 0) return blobOf(c, hi).then(function (b) { if (b.size <= maxB) { best = b; return null; } return step(1); });
      if (i > 8) return Promise.resolve();
      var mid = (lo + hi) / 2;
      return blobOf(c, mid).then(function (b) { if (b.size <= maxB) { best = b; lo = mid; } else hi = mid; return step(i + 1); });
    };
    step(0).then(function () {
      if (best) return best;
      small = true; return blobOf(c, 0.1);   /* cannot fit even at low quality: say so */
    }).then(function (b) {
      if (!small && b.size < minB) { padded = true; return pad(b, Math.min(maxB, Math.round(minB * 1.04) + 200)); }
      return b;
    }).then(function (b) {
      if (S.url) URL.revokeObjectURL(S.url);
      S.url = URL.createObjectURL(b);
      var kb = b.size / 1024, okKb = b.size >= minB && b.size <= maxB;
      res.hidden = false;
      res.innerHTML = '<h2>Your file is ready</h2><p><img src="' + S.url + '" alt="Your resized picture" width="' + S.outW + '" height="' + S.outH + '" class="xp-out"></p>' +
        '<dl class="facts"><dt>Pixels</dt><dd>' + S.outW + ' × ' + S.outH + '</dd><dt>File size</dt><dd>' + kb.toFixed(1) + ' KB ' +
        (okKb ? '<span class="tag yes">inside ' + S.kb[0] + ' to ' + S.kb[1] + ' KB</span>' : '<span class="tag xp-bad">outside ' + S.kb[0] + ' to ' + S.kb[1] + ' KB</span>') +
        '</dd><dt>Format</dt><dd>JPG</dd></dl>' +
        (padded ? '<p class="hint">The picture was smaller than the minimum, so blank filler was added inside the file to reach it. The picture itself is unchanged.</p>' : '') +
        (small ? '<p class="hint">This size cannot fit in ' + S.kb[1] + ' KB. Choose a smaller pixel size or a larger KB limit.</p>' : '') +
        '<div class="acts"><a class="btn" id="xp-dl" href="' + S.url + '" download="' + S.name + '.jpg">Download the file</a>' +
        '<button class="btn ghost" type="button" id="xp-again">Change the crop</button></div>' +
        '<p class="hint">Look at the picture before you upload it: is the face or the ink sharp and easy to see? The form may still refuse a picture that is unclear.</p>';
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(function () { SYG.toast('Something went wrong. Please try another picture.'); })
      .then(function () { make.disabled = false; make.textContent = 'Make my file'; });
  }
  make.addEventListener('click', build);
  res.addEventListener('click', function (e) { if (e.target.id === 'xp-again') { res.hidden = true; work.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });

  selE.addEventListener('change', function () { fillDocs(); apply(); try { localStorage.setItem('xp-exam', selE.value); } catch (e) {} });
  selD.addEventListener('change', apply);
  ['xp-cw', 'xp-chh', 'xp-min', 'xp-max'].forEach(function (id) { $(id).addEventListener('change', apply); });

  /* start: ?exam=ssc&doc=signature, or ?w=413&h=531, or the exam used last time */
  var P = new URLSearchParams(location.search), want = P.get('exam');
  if (!want && !P.get('w')) { try { want = localStorage.getItem('xp-exam'); } catch (e) {} }
  if (want && DATA.some(function (x) { return x.id === want; })) selE.value = want; else selE.value = '';
  if (P.get('w')) { $('xp-cw').value = P.get('w'); $('xp-chh').value = P.get('h') || P.get('w'); }
  if (P.get('min')) $('xp-min').value = P.get('min');
  if (P.get('max')) $('xp-max').value = P.get('max');
  fillDocs();
  if (P.get('doc')) { selD.value = P.get('doc'); if (selD.selectedIndex < 0) selD.selectedIndex = 0; }
  apply();
})();
