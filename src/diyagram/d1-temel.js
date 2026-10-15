/* d1-temel: SVG yardımcıları, yazı ölçümü, yazı sarma, '?' çipleri, kablo rengi/kenar stili, dokunma bölgesi kaydı.
   Ölçü birimi: SVG 1 birim = 1 CSS px (ölçek ≥ 1, DESIGN §0). Yazı boyutları CSS sınıflarından (rem tokenları) okunur. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var NS = 'http://www.w3.org/2000/svg';
  var sayac = 0;

  I.NS = NS;

  /** SVG öğesi üret; null/false öznitelik atlanır. */
  I.el = function (ad, oz, ebeveyn) {
    var e = kok.document.createElementNS(NS, ad);
    if (oz) { for (var k in oz) { if (oz[k] != null && oz[k] !== false) e.setAttribute(k, oz[k]); } }
    if (ebeveyn) ebeveyn.appendChild(e);
    return e;
  };
  I.r = function (n) { return Math.round(n); };
  I.maks = function (a, b) { return a > b ? a : b; };

  // ---- yazı sınıfları (diyagram.css): ad → sınıf ------------------------------------------------------
  // e: etiket 14 kalın · i: ipucu 14 · g: gövde 16 · p: pin/soket 18 mono kalın · pa: pin adı 18 mono · k: kod 20 mono kalın
  // kb: başlık kodu 28 mono kalın · ki: 14 mono kalın
  var VARSAYILAN_PX = { e: 14, i: 14, g: 16, p: 18, pa: 18, k: 20, kb: 28, ki: 14 };

  /** Bir çizim için bağlam: ölçüm + benzersiz kimlikler + desen tanımları + dokunma kaydı. */
  I.baglam = function (svg, W, secenek) {
    var B = {
      svg: svg, W: W, o: secenek || {}, kimlik: 'dy' + (++sayac),
      defs: I.el('defs', null, svg), desenler: {}, dokunlar: [], sinifOnb: {}, olcOnb: {}, tuval: null, tuvalFont: '', prob: null, kimlikN: 0
    };
    B.prob = I.el('g', { class: 'dy-prob', 'aria-hidden': 'true' }, svg);

    B.yeniId = function (onek) { return B.kimlik + '-' + (onek || 'x') + (++B.kimlikN); };

    /** Yazı sınıfının gerçek (hesaplanmış) ölçüleri. */
    B.sinif = function (ad) {
      var s = B.sinifOnb[ad];
      if (s) return s;
      var p = I.el('text', { class: 'dy-' + ad }, B.prob);
      p.textContent = 'Mg';
      var cs = kok.getComputedStyle(p);
      var px = parseFloat(cs.fontSize);
      if (!(px > 0)) px = VARSAYILAN_PX[ad] || 16;
      var ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      s = B.sinifOnb[ad] = { ad: ad, px: px, agirlik: cs.fontWeight || '400', aile: cs.fontFamily || 'sans-serif', ls: isNaN(ls) ? 0 : ls, satir: Math.ceil(px * 1.3) };
      return s;
    };
    B.px = function (ad) { return B.sinif(ad).px; };
    /** Yazı satır kutusu yüksekliği (px). */
    B.satir = function (ad) { return B.sinif(ad).satir; };

    function tuvalHazir() {
      if (B.tuval !== null) return B.tuval;
      try {
        var c = kok.document.createElement('canvas');
        B.tuval = c.getContext ? c.getContext('2d') : false;
      } catch (e) { B.tuval = false; }
      return B.tuval;
    }
    /** Yazı genişliği (px): tuval ölçümü; yoksa SVG ölçümü. Harf aralığı elle eklenir. */
    B.gen = function (str, ad) {
      if (!str) return 0;
      var anahtar = ad + '|' + str, w = B.olcOnb[anahtar];
      if (w !== undefined) return w;
      var s = B.sinif(ad), t = tuvalHazir();
      if (t) {
        var f = s.agirlik + ' ' + s.px + 'px ' + s.aile;
        if (B.tuvalFont !== f) { t.font = f; B.tuvalFont = f; }
        w = t.measureText(str).width + str.length * s.ls;
      } else {
        var p = I.el('text', { class: 'dy-' + ad }, B.prob);
        p.textContent = str;
        w = p.getComputedTextLength();
        B.prob.removeChild(p);
      }
      B.olcOnb[anahtar] = w;
      return w;
    };

    /** Yazıyı en çok maksSatir satıra, maksW genişliğe sar. Çok uzun kelime karakterden bölünür. Kesilirse son satır '…' ile biter. */
    B.sar = function (str, ad, maksW, maksSatir) {
      var kelimeler = String(str).split(/\s+/).filter(Boolean), satirlar = [], cur = '', kesildi = false, i;
      function ekle(s) { satirlar.push(s); }
      for (i = 0; i < kelimeler.length; i++) {
        var k = kelimeler[i], aday = cur ? cur + ' ' + k : k;
        if (B.gen(aday, ad) <= maksW) { cur = aday; continue; }
        if (cur) { ekle(cur); cur = ''; }
        // tek başına sığmayan kelime: karakterden böl
        while (B.gen(k, ad) > maksW && k.length > 1) {
          var n = k.length - 1;
          while (n > 1 && B.gen(k.slice(0, n), ad) > maksW) n--;
          ekle(k.slice(0, n)); k = k.slice(n);
        }
        cur = k;
      }
      if (cur) ekle(cur);
      if (maksSatir && satirlar.length > maksSatir) {
        satirlar = satirlar.slice(0, maksSatir);
        var son = satirlar[maksSatir - 1];
        while (son.length > 1 && B.gen(son + '…', ad) > maksW) son = son.slice(0, -1);
        satirlar[maksSatir - 1] = son.replace(/\s+$/, '') + '…';
        kesildi = true;
      }
      var w = 0;
      satirlar.forEach(function (s) { var x = B.gen(s, ad); if (x > w) w = x; });
      return { satirlar: satirlar, w: w, kesildi: kesildi };
    };

    // ---- '?' çipleri: okunamayan karakter amber çipte (DESIGN §8) ----------------------------------
    /** "1?" → [{t:'1'},{q:true}] */
    B.parcala = function (str) {
      var out = [], cur = '';
      String(str).split('').forEach(function (ch) {
        if (ch === '?') { if (cur) { out.push({ t: cur }); cur = ''; } out.push({ q: true }); } else { cur += ch; }
      });
      if (cur) out.push({ t: cur });
      return out;
    };
    var SORU_DOLGU = 5, SORU_ARA = 2;
    B.parcaGen = function (parcalar, ad) {
      var w = 0;
      parcalar.forEach(function (p) { w += p.q ? B.gen('?', ad) + 2 * SORU_DOLGU + 2 * SORU_ARA : B.gen(p.t, ad); });
      return w;
    };
    /** Metin (gerekirse '?' çipleriyle) çiz; geri: kullanılan genişlik. yc: satır orta çizgisi. sinifEk: ters/ikincil gibi yazı rengi. */
    B.yaziCiz = function (g, x, yc, str, ad, sinifEk) {
      var parcalar = B.parcala(str), cx = x;
      var yuksek = B.satir(ad);
      parcalar.forEach(function (p) {
        if (p.q) {
          var qw = B.gen('?', ad);
          var cw = qw + 2 * SORU_DOLGU, ch = Math.min(yuksek, B.px(ad) + 8);
          cx += SORU_ARA;
          I.el('rect', { class: 'dy-soru', x: I.r(cx), y: I.r(yc - ch / 2), width: I.r(cw), height: I.r(ch), rx: 4 }, g);
          var t = I.el('text', { class: 'dy-' + ad + ' dy-soru-y', x: cx + SORU_DOLGU, y: yc }, g);
          t.textContent = '?';
          cx += cw + SORU_ARA;
        } else {
          var t2 = I.el('text', { class: 'dy-' + ad + (sinifEk ? ' ' + sinifEk : ''), x: cx, y: yc }, g);
          t2.textContent = p.t;
          cx += B.gen(p.t, ad);
        }
      });
      return cx - x;
    };
    /** Düz metin (çip yok) çiz. anchor: 'start'|'end'|'middle'. */
    B.yazi = function (g, x, yc, str, ad, sinifEk, anchor) {
      var t = I.el('text', { class: 'dy-' + ad + (sinifEk ? ' ' + sinifEk : ''), x: x, y: yc, 'text-anchor': anchor && anchor !== 'start' ? anchor : null }, g);
      t.textContent = str;
      return t;
    };

    // ---- simgeler -------------------------------------------------------------------------------------
    /** Tür işareti (40×40 sprite). */
    B.turIkon = function (g, tur, x, y, boyut, kesikli) {
      var u = I.el('use', { href: '#t-' + tur, x: I.r(x), y: I.r(y), width: boyut, height: boyut, class: 't-' + tur, style: kesikli ? '--t-kesik:var(--kablo-kesik)' : null }, g);
      u.setAttribute('aria-hidden', 'true');
      return u;
    };
    /** Çizgi simgesi (24×24 sprite i-…/d-…). renk: ik-… sınıfı. */
    B.ikon = function (g, ad, x, y, boyut, renkSinif) {
      return I.el('use', { href: '#' + ad, x: I.r(x), y: I.r(y), width: boyut, height: boyut, class: 'dy-ik' + (renkSinif ? ' ' + renkSinif : ''), 'aria-hidden': 'true' }, g);
    };

    // ---- kablo rengi -----------------------------------------------------------------------------------
    /** İki renkli kablo için 45° çizgili desen (DESIGN §7: 10 px periyot, 4 px iz). Dönen: boya değeri. */
    B.desen = function (ana, iz) {
      var anahtar = ana + '/' + iz;
      if (B.desenler[anahtar]) return B.desenler[anahtar];
      var id = B.yeniId('d');
      var p = I.el('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: 10, height: 10, patternTransform: 'rotate(45)' }, B.defs);
      I.el('rect', { width: 10, height: 10, style: 'fill:var(--kablo-' + ana + ')' }, p);
      I.el('rect', { width: 4, height: 10, style: 'fill:var(--kablo-' + iz + ')' }, p);
      return (B.desenler[anahtar] = 'url(#' + id + ')');
    };

    // ---- dokunma bölgeleri -------------------------------------------------------------------------------
    var GERI = { cihaz: 'onCihaz', soket: 'onSoket', kablo: 'onKablo', uc: 'onUc' };
    /** Dokunulabilir grup: geri çağrı yoksa ebeveynin kendisini döndürür (çizim aynı kodla sürer).
        kutu {x,y,w,h}: en az 48×48'e genişletilir. nesne: geri çağrıya ikinci argüman. */
    B.dokun = function (ebeveyn, eylem, deger, nesne, kutu, aria) {
      if (!B.o[GERI[eylem]] || deger == null || deger === '') return ebeveyn;
      var g = I.el('g', { class: 'dy-dokun', tabindex: '0', role: 'link', 'aria-label': aria, 'data-i': B.dokunlar.length }, ebeveyn);
      B.dokunlar.push({ eylem: eylem, deger: deger, nesne: nesne });
      var k = I.hedef(kutu);
      I.el('rect', { class: 'dy-zemin', x: I.r(k.x), y: I.r(k.y), width: I.r(k.w), height: I.r(k.h), rx: 8 }, g);
      g._kutu = k;
      return g;
    };
    /** Dokunma grubunun üstüne odak halkası (klavye); grup değilse hiçbir şey yapmaz. */
    B.odakHalka = function (g) {
      if (!g || !g._kutu) return;
      var k = g._kutu;
      I.el('rect', { class: 'dy-odak-halka', x: I.r(k.x), y: I.r(k.y), width: I.r(k.w), height: I.r(k.h), rx: 8 }, g);
    };
    return B;
  };

  /** Dokunma kutusunu en az 48 px'e (DESIGN §10) merkezden genişlet. */
  I.hedef = function (kutu) {
    var min = 48, x = kutu.x, y = kutu.y, w = kutu.w, h = kutu.h;
    if (w < min) { x -= (min - w) / 2; w = min; }
    if (h < min) { y -= (min - h) / 2; h = min; }
    return { x: x, y: y, w: w, h: h };
  };

  // ---- kablo rengi / kenar stili ---------------------------------------------------------------------------
  var RENK_TOKEN = { ws: 1, sw: 1, rt: 1, gn: 1, ge: 1, bl: 1, br: 1, gr: 1, li: 1, or: 1, rs: 1 };
  I.renkTokenVar = function (k) { return RENK_TOKEN[k] === 1; };

  /** Kenarın İÇ renkleri: şema notundan gelenler çizgiyi renklendirmez (DESIGN §7 "renk uydurulmaz"). */
  I.kenarRenk = function (k) {
    var parcalar = k.renkParcalari || [];
    return {
      kendi: !!(k.renk && !k.renkSemaNotu),   // renk kablonun kendisinde yazıyor
      not: !!(k.renk && k.renkSemaNotu),
      parcalar: parcalar,
      kisaltma: k.renk || null
    };
  };
  /** Ek noktasının usta dilindeki adı: "ek noktası 99Z07"; kodsuzsa (birden çoksa numaralı) "ek noktası 3" / "ek noktası". */
  I.ekNoktasiAdi = function (d) {
    var kod = d.kodsuz ? (d.kodsuzNo ? String(d.kodsuzNo) : '') : (d.kod != null ? String(d.kod) : '');
    return 'ek noktası' + (kod ? ' ' + kod : '');
  };
  /** Cihaz içi bağlantı mı? `ic:true` ya da iki ucu aynı cihaz kodu (API.md §7.2). dMap: id → düğüm. */
  I.icBaglanti = function (kenar, dMap) {
    if (kenar.ic === true) return true;
    var a = dMap && dMap[kenar.a], b = dMap && dMap[kenar.b];
    return !!(a && b && a.id !== b.id && a.tur === 'cihaz' && b.tur === 'cihaz' && a.cihaz && a.cihaz === b.cihaz);
  };

  /** Kenarı çiz (noktalar: [[x,y],…]); tüp / düz / kesik / noktalı. */
  I.telCiz = function (B, g, noktalar, kenar, ic) {
    var pts = noktalar.map(function (p) { return I.r(p[0]) + ',' + I.r(p[1]); }).join(' ');
    if (ic) { I.el('polyline', { class: 'dy-tel dy-tel-nokta', points: pts }, g); return; }
    var kes = kenar && kenar.varyant ? ' dy-tel-kesik' : '';
    var r = kenar ? I.kenarRenk(kenar) : { kendi: false };
    if (r.kendi) {
      var tanin = r.parcalar.filter(function (p) { return I.renkTokenVar(p.kisaltma); });
      var boya = null;
      if (tanin.length >= 2) boya = B.desen(tanin[0].kisaltma, tanin[1].kisaltma);
      else if (tanin.length === 1) boya = 'var(--kablo-' + tanin[0].kisaltma + ')';
      if (boya) {
        I.el('polyline', { class: 'dy-tel dy-tel-tup' + kes, points: pts }, g);
        I.el('polyline', { class: 'dy-tel dy-tel-ic' + kes, points: pts, style: 'stroke:' + boya }, g);
        return;
      }
    }
    I.el('polyline', { class: 'dy-tel dy-tel-duz' + kes, points: pts }, g);
  };
  /** Düz tel yok-renkli bağlantı (bus/ayraç): kablo değil. */
  I.bagCiz = function (g, noktalar, sinif) {
    var pts = noktalar.map(function (p) { return I.r(p[0]) + ',' + I.r(p[1]); }).join(' ');
    return I.el('polyline', { class: sinif || 'dy-bag', points: pts }, g);
  };
})(typeof globalThis === 'object' ? globalThis : this);
