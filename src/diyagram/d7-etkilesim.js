/* d7-etkilesim: iki parmakla yakınlaştırma/kaydırma (Pointer Events), çift dokunuşla sıfırlama, fare/klavye, yapışkan soket bantları.
   Kural (DESIGN §11.5): yakınlaştırılmamışken TEK parmak sayfayı kaydırır (kapsayıcı touch-action: pan-x pan-y; tarayıcının sayfa
   yakınlaştırması bu bölgede kapalı). İki parmak değince tarayıcının kaydırma/yakınlaştırması engellenir (touchstart/touchmove
   preventDefault), böylece pointer olayları kesilmeden gelir. Yakınlaştırılmışken kapsayıcı `dy-yakin` sınıfı alır (touch-action: none):
   tek parmak çizimi kaydırır, çizimin dışına dokunarak sayfa kaydırılır. Ölçek 1…5; ölçek 1'in altına inmez (DESIGN §4).
   d8-genel `I.etkilesimKur(ornek)` ile çağırır; `ornek.etk = { sifirla(sessiz), yakinlastir(o, x, y), tikYut(), durum(), sok() }`. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};

  var MAKS = 5, ADIM = 1.25;
  var TIK_YUT_MS = 450, CIFT_MS = 350, CIFT_PX = 40, HAREKET_PX = 8;

  function simdi() { return kok.performance && kok.performance.now ? kok.performance.now() : Date.now(); }

  I.etkilesimKur = function (ornek) {
    if (ornek.etk && ornek.etk.sok) ornek.etk.sok();
    var secenek = ornek.secenek || {}, svg = ornek.svg, dunya = ornek.dunya, kutu = ornek.kutu, kap = ornek.kap;
    var W = ornek.genislik, H = ornek.yukseklik;
    var s = 1, tx = 0, ty = 0;
    var iptal = false;
    var etk = { s: 1 };
    ornek.etk = etk;

    var bantlar = dunya && dunya._bantlar ? dunya._bantlar : null;
    var yakinAcik = secenek.yakinlastirma !== false;

    // ---- durum uygulama ----------------------------------------------------------------------------------------
    function sinirla() {
      if (!(s >= 1)) s = 1;
      if (s > MAKS) s = MAKS;
      var minX = W - W * s, minY = H - H * s;
      tx = Math.min(0, Math.max(minX, tx));
      ty = Math.min(0, Math.max(minY, ty));
    }
    function uygula(sessiz) {
      sinirla();
      var eski = ornek.olcekDeger;
      if (s < 1.0005) {
        s = 1; tx = 0; ty = 0;
        dunya.removeAttribute('transform');
      } else {
        dunya.setAttribute('transform', 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + s.toFixed(4) + ')');
      }
      ornek.olcekDeger = s; etk.s = s;
      var yakin = s > 1;
      if (kutu) kutu.classList.toggle('dy-yakin', yakin);
      if (kap) kap.classList.toggle('dy-yakin', yakin);
      yapiskanGuncelle();
      if (!sessiz && eski !== s && typeof secenek.onOlcek === 'function') secenek.onOlcek(s);
    }
    function odakla(yeniS, px, py) {
      // (px, py) svg koordinatında sabit kalan nokta
      var wx = (px - tx) / s, wy = (py - ty) / s;
      s = Math.min(MAKS, Math.max(1, yeniS));
      tx = px - wx * s; ty = py - wy * s;
      uygula(false);
    }
    function svgNokta(cx, cy) {
      var r = svg.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    }

    // ---- yapışkan soket bantları ---------------------------------------------------------------------------------
    var rafBant = 0;
    function yapiskanGuncelle() {
      if (!bantlar || !bantlar.length) return;
      if (s > 1) { bantlar.forEach(function (b) { b.g.removeAttribute('transform'); }); return; }
      var ust = +secenek.yapiskanUst || 0;
      var r = svg.getBoundingClientRect();
      var gorunenUst = ust - r.top;   // ekranın (ust px) üst çizgisinin svg içindeki y'si
      bantlar.forEach(function (b) {
        var hedef = Math.max(b.y0, Math.min(gorunenUst, b.y1 - b.h));
        var dy = Math.round(hedef - b.y0);
        if (dy > 0) b.g.setAttribute('transform', 'translate(0 ' + dy + ')'); else b.g.removeAttribute('transform');
      });
    }
    function kaydirildi() {
      if (rafBant) return;
      var raf = kok.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      rafBant = raf(function () { rafBant = 0; if (!iptal) yapiskanGuncelle(); });
    }
    if (bantlar && bantlar.length) {
      kok.addEventListener('scroll', kaydirildi, { passive: true, capture: true });
      kok.addEventListener('resize', kaydirildi);
    }

    if (!yakinAcik) {
      etk.sifirla = function () { ornek.olcekDeger = 1; etk.s = 1; return 1; };
      etk.yakinlastir = function () { return 1; };
      etk.tikYut = function () { return false; };
      etk.durum = function () { return { s: 1, tx: 0, ty: 0 }; };
      etk.sok = function () {
        iptal = true;
        if (bantlar && bantlar.length) { kok.removeEventListener('scroll', kaydirildi, { capture: true }); kok.removeEventListener('resize', kaydirildi); }
      };
      yapiskanGuncelle();
      return etk;
    }

    // ---- işaretçiler ----------------------------------------------------------------------------------------------
    var ptr = {};          // id → {x, y, x0, y0, t0, tur}
    var sayi = 0;
    var cimdik = null;     // {d0, s0, wx, wy}
    var surukle = null;    // {id, sx, sy, tx0, ty0}
    var sonHareket = -1e9; // yakınlaştırma / kaydırma hareketi bittiği an (ms)
    var hareketVar = false;
    var sonTik = null;     // {t, x, y}

    function merkez() {
      var k = Object.keys(ptr), a = ptr[k[0]], b = ptr[k[1]];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(1, Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))) };
    }
    function cimdikBaslat() {
      var m = merkez(), p = svgNokta(m.x, m.y);
      cimdik = { d0: m.d, s0: s, wx: (p.x - tx) / s, wy: (p.y - ty) / s };
      surukle = null; hareketVar = true;
    }
    function surukleBaslat(id) {
      var p = ptr[id];
      surukle = { id: id, sx: p.x, sy: p.y, tx0: tx, ty0: ty, hareket: false };
      cimdik = null;
    }

    function inis(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: simdi(), tur: e.pointerType };
      sayi = Object.keys(ptr).length;
      if (sayi >= 2) {
        try { svg.setPointerCapture(e.pointerId); } catch (x) { /* */ }
        cimdikBaslat();
      } else if (s > 1) {
        surukleBaslat(e.pointerId);
        try { svg.setPointerCapture(e.pointerId); } catch (x2) { /* */ }
      }
    }
    function hareket(e) {
      var p = ptr[e.pointerId];
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      if (cimdik && sayi >= 2) {
        var m = merkez(), c = svgNokta(m.x, m.y);
        s = Math.min(MAKS, Math.max(1, cimdik.s0 * m.d / cimdik.d0));
        tx = c.x - cimdik.wx * s; ty = c.y - cimdik.wy * s;
        uygula(false);
        if (e.cancelable) e.preventDefault();
      } else if (surukle && surukle.id === e.pointerId && s > 1) {
        var dx = e.clientX - surukle.sx, dy = e.clientY - surukle.sy;
        if (!surukle.hareket && Math.abs(dx) + Math.abs(dy) < 4) return;
        surukle.hareket = true; hareketVar = true;
        tx = surukle.tx0 + dx; ty = surukle.ty0 + dy;
        uygula(false);
        if (e.cancelable) e.preventDefault();
      }
    }
    function bitis(e) {
      var p = ptr[e.pointerId];
      if (!p) return;
      var tur = e.type;
      delete ptr[e.pointerId];
      sayi = Object.keys(ptr).length;
      try { svg.releasePointerCapture(e.pointerId); } catch (x) { /* */ }
      var gecen = simdi() - p.t0;
      var uzak = Math.abs(p.x - p.x0) + Math.abs(p.y - p.y0);
      if (sayi >= 2) cimdikBaslat();
      else if (sayi === 1 && s > 1) surukleBaslat(Object.keys(ptr)[0]);
      else { cimdik = null; surukle = null; }
      if (sayi === 0) {
        if (hareketVar) { sonHareket = simdi(); hareketVar = false; }
        // çift dokunuş / çift tık: yakınlaştırmayı sıfırla
        if (tur === 'pointerup' && gecen < 300 && uzak < HAREKET_PX) {
          var simd = simdi();
          if (sonTik && simd - sonTik.t < CIFT_MS && Math.abs(p.x - sonTik.x) + Math.abs(p.y - sonTik.y) < CIFT_PX) {
            sonTik = null;
            if (s > 1) { sifirla(false); sonHareket = simd; }
          } else sonTik = { t: simd, x: p.x, y: p.y };
        }
      }
    }

    function dokunBas(e) {
      // iki parmak: tarayıcı kaydırması / yakınlaştırması devre dışı, pointer olayları kesilmesin.
      // Tek parmakta touchstart'a dokunulmaz (preventDefault tıkı da öldürür): yakınlaştırılmışken kaydırmayı touch-action: none engeller.
      if (e.touches && e.touches.length >= 2 && e.cancelable) e.preventDefault();
    }
    function dokunHareket(e) {
      if (((e.touches && e.touches.length >= 2) || s > 1) && e.cancelable) e.preventDefault();
    }
    function tekerlek(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var p = svgNokta(e.clientX, e.clientY);
      odakla(s * (e.deltaY < 0 ? ADIM : 1 / ADIM), p.x, p.y);
    }
    function tus(e) {
      if (e.target !== svg || e.ctrlKey || e.altKey || e.metaKey) return;
      var k = e.key, ok = true;
      if (k === '+' || k === '=') odakla(s * ADIM, W / 2, Math.min(H, kok.innerHeight || H) / 2);
      else if (k === '-' || k === '_') odakla(s / ADIM, W / 2, Math.min(H, kok.innerHeight || H) / 2);
      else if (k === '0') sifirla(false);
      else if (s > 1 && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) {
        tx += k === 'ArrowLeft' ? 60 : k === 'ArrowRight' ? -60 : 0;
        ty += k === 'ArrowUp' ? 60 : k === 'ArrowDown' ? -60 : 0;
        uygula(false);
      } else ok = false;
      if (ok) e.preventDefault();
    }
    function ciftTik(e) {
      // fare çift tıkı (işaretçi zamanlayıcısı farenin tıklamasını da sayar; bu yedek)
      if (s > 1 && e.pointerType === undefined) { sifirla(false); sonHareket = simdi(); }
    }

    svg.setAttribute('tabindex', '0');
    svg.addEventListener('pointerdown', inis);
    svg.addEventListener('pointermove', hareket);
    svg.addEventListener('pointerup', bitis);
    svg.addEventListener('pointercancel', bitis);
    svg.addEventListener('touchstart', dokunBas, { passive: false });
    svg.addEventListener('touchmove', dokunHareket, { passive: false });
    svg.addEventListener('wheel', tekerlek, { passive: false });
    svg.addEventListener('keydown', tus);
    svg.addEventListener('dblclick', ciftTik);

    function sifirla(sessiz) {
      s = 1; tx = 0; ty = 0; cimdik = null; surukle = null;
      if (iptal) { ornek.olcekDeger = 1; etk.s = 1; return 1; }
      uygula(!!sessiz);
      return 1;
    }

    etk.sifirla = sifirla;
    etk.yakinlastir = function (o, x, y) {
      var px = x == null ? W / 2 : x, py = y == null ? Math.min(H, kok.innerHeight || H) / 2 : y;
      odakla(+o || 1, px, py);
      return s;
    };
    etk.tikYut = function () { return simdi() - sonHareket < TIK_YUT_MS; };
    etk.durum = function () { return { s: s, tx: tx, ty: ty }; };
    etk.sok = function () {
      iptal = true;
      svg.removeEventListener('pointerdown', inis);
      svg.removeEventListener('pointermove', hareket);
      svg.removeEventListener('pointerup', bitis);
      svg.removeEventListener('pointercancel', bitis);
      svg.removeEventListener('touchstart', dokunBas);
      svg.removeEventListener('touchmove', dokunHareket);
      svg.removeEventListener('wheel', tekerlek);
      svg.removeEventListener('keydown', tus);
      svg.removeEventListener('dblclick', ciftTik);
      if (bantlar && bantlar.length) { kok.removeEventListener('scroll', kaydirildi, { capture: true }); kok.removeEventListener('resize', kaydirildi); }
      if (kutu) kutu.classList.remove('dy-yakin');
      if (kap) kap.classList.remove('dy-yakin');
    };

    uygula(true);
    return etk;
  };
})(typeof globalThis === 'object' ? globalThis : this);
