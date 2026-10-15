/* d3-agac: genel ağaç yerleşimi (yatay ve dikey). Düğümler soyuttur: {d, giris (kenar), cocuklar[], cipGoster, ic, odak, kartFn?, blokFn?}.
   Hem kablo izi (d4-kablo) hem cihaz satırları (d6-cihaz) bunu kullanır.
   Yatay (geniş): kök solda, çocuklar sağa; dallanmada dikey sıralı, her dalın kendi yatay teli. Sığmazsa null; dallanmasız zincir için yatayZincir satır kırar; o da olmazsa çağıran dikeye döner.
   Dikey (dar): sol 48 px omurga; dallar girintili, solda 3 px ayraç, `DAL n` başlığı (DESIGN §11). Ölçek hiç küçültülmez. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el, r = I.r;

  var MARJ = 4;

  /** Kenarın dokunulabilir kablo anahtarı (KB.izle.kablo'ya verilebilir); numarasız ya da cihaz içi bağlantıda null. */
  I.kabloAnahtari = function (kenar) {
    if (!kenar || kenar.ic || kenar.sanal) return null;
    var a = kenar.no != null ? kenar.no : kenar.etiket;
    return a == null || a === '' ? null : String(a);
  };

  function cipCiz(B, g, n, c, x, y, o) {
    var anahtar = I.kabloAnahtari(n.giris);
    var gc = g;
    if (anahtar && anahtar !== (o && o.kendiKablo)) {
      gc = B.dokun(g, 'kablo', anahtar, n.giris, { x: x, y: y, w: c.w, h: c.h }, 'Kablo ' + anahtar + ' çizimini aç');
    }
    c.ciz(gc, x, y);
    if (gc !== g) B.odakHalka(gc);
  }

  // =============================================================================================================
  // YATAY
  // =============================================================================================================
  /** Ağacı yatay yerleştir. Sığarsa {w, h, ciz(g, ox, oy)}, sığmazsa null. */
  I.yatayAgac = function (B, kokDugum, W, o) {
    o = o || {};
    var ARA = 16, BUS = 20, MINTEL = Math.max(56, o.telMin || 0), DAL_H = Math.max(22, B.satir('e') + 4);

    function hazirla(n, ebeveyn, dalNo, onek) {
      var taraf = !ebeveyn ? (n.cocuklar.length ? 'sag' : 'orta') : (n.cocuklar.length ? 'orta' : 'sol');
      n.dalNo = dalNo;
      n.k = n.kartFn ? n.kartFn({ taraf: taraf }) : I.kartYatay(B, n.d, { taraf: taraf, odak: n.odak, gecis: n.gecis, kisa: n.kisa });
      n.c = (n.giris && n.cipGoster) ? I.cip(B, n.giris, { maksW: 300, ic: n.ic }) : null;
      var dalli = n.cocuklar.length > 1;
      n.cocuklar.forEach(function (c, i) {
        var no = dalli ? (onek ? onek + '.' : '') + (i + 1) : null;
        hazirla(c, n, no, no || onek);
      });
    }
    hazirla(kokDugum, null, null, '');

    // 1) dikey uzantılar (tel çizgisine göre)
    function dikeyOlc(n) {
      var ust = n.k.telY + (n.dalNo ? DAL_H : 0), alt = n.k.h - n.k.telY;
      if (n.c) { ust = Math.max(ust, n.c.h / 2 + 4); alt = Math.max(alt, n.c.h / 2 + 4); }
      var c = n.cocuklar;
      if (!c.length) { n.ust = ust; n.alt = alt; n.rel = []; return; }
      c.forEach(dikeyOlc);
      var rel = [0], i;
      for (i = 1; i < c.length; i++) rel[i] = rel[i - 1] + c[i - 1].alt + ARA + c[i].ust;
      var orta = (rel[0] + rel[c.length - 1]) / 2;
      n.rel = rel.map(function (v) { return v - orta; });
      var ustC = c[0].ust - n.rel[0], altC = n.rel[c.length - 1] + c[c.length - 1].alt;
      n.ust = Math.max(ust, ustC); n.alt = Math.max(alt, altC);
    }
    dikeyOlc(kokDugum);

    // 2) yatay konum
    var sag = 0;
    function yatayYer(n, x, wy) {
      n.x = x; n.wy = wy;
      if (x + n.k.w > sag) sag = x + n.k.w;
      var dalli = n.cocuklar.length > 1;
      var tel = MINTEL;
      n.cocuklar.forEach(function (c) { if (c.c) tel = Math.max(tel, c.c.w + 32); });
      var x1 = x + n.k.w + (dalli ? BUS : 0);
      n.bx = dalli ? x1 : null; n.tel = tel; n.x1 = x1;
      n.cocuklar.forEach(function (c, i) { yatayYer(c, x1 + tel, wy + n.rel[i]); });
    }
    yatayYer(kokDugum, MARJ, kokDugum.ust);
    if (sag + MARJ > W + 0.5) return null;

    var h = Math.ceil(kokDugum.ust + kokDugum.alt);
    return {
      w: Math.ceil(sag + MARJ), h: h,
      ciz: function (g, ox, oy) {
        var teller = el('g', null, g), kartlar = el('g', null, g), cipler = el('g', null, g);
        (function ciz(n) {
          // kart
          n.k.ciz(kartlar, ox + n.x, oy + n.wy - n.k.telY);
          if (n.dalNo) B.yazi(kartlar, ox + n.x + 2, oy + n.wy - n.k.telY - (B.satir('e') / 2 + 2), 'DAL ' + n.dalNo + (n.dalEk || ''), 'e');
          // teller
          var dalli = n.cocuklar.length > 1;
          if (dalli) {
            var ys = n.cocuklar.map(function (c) { return c.wy; });
            I.bagCiz(teller, [[ox + n.x + n.k.w, oy + n.wy], [ox + n.bx, oy + n.wy]]);
            I.bagCiz(teller, [[ox + n.bx, oy + Math.min.apply(null, ys)], [ox + n.bx, oy + Math.max.apply(null, ys)]]);
          }
          n.cocuklar.forEach(function (c) {
            var x1 = n.x1, x2 = n.x1 + n.tel;
            I.telCiz(B, teller, [[ox + x1, oy + c.wy], [ox + x2, oy + c.wy]], c.giris, c.ic);
            if (c.c) cipCiz(B, cipler, c, c.c, ox + (x1 + x2) / 2 - c.c.w / 2, oy + c.wy - c.c.h / 2, o);
            ciz(c);
          });
        })(kokDugum);
      }
    };
  };

  // =============================================================================================================
  // YATAY ZİNCİR, ÇOK SATIRLI (DESIGN §11.2: sığmayan zincir satır kırar)
  // =============================================================================================================
  /** Dallanmasız zincir tek satıra sığmazsa satırlara böler: her satır soldan sağa; satır sonundaki tel sağda aşağı iner,
      iki satır arasındaki kanaldan sola döner (etiket çipi kanalın ortasında), sonraki satırın başına girer.
      Sığmazsa ya da zincir değilse null (çağıran dikeye döner). Dönen: {w, h, ciz(g, ox, oy)}. */
  I.yatayZincir = function (B, kokDugum, W, o) {
    o = o || {};
    var MINTEL = 56, GUT = 22, KANAL_ARA = 16;
    var liste = [], n = kokDugum;
    while (n) { if (n.cocuklar.length > 1) return null; liste.push(n); n = n.cocuklar.length ? n.cocuklar[0] : null; }
    if (liste.length < 2) return null;
    liste.forEach(function (x, i) {
      var taraf = i === 0 ? 'sag' : (i === liste.length - 1 ? 'sol' : 'orta');
      x.k = x.kartFn ? x.kartFn({ taraf: taraf }) : I.kartYatay(B, x.d, { taraf: taraf, odak: x.odak, gecis: x.gecis, kisa: x.kisa });
      x.c = (x.giris && x.cipGoster) ? I.cip(B, x.giris, { maksW: 300, ic: x.ic }) : null;
    });
    var avail = W - 2 * MARJ - 2 * GUT;
    var satirlar = [[]], cur = 0, i;
    for (i = 0; i < liste.length; i++) {
      var x = liste[i];
      if (x.k.w > avail) return null;
      var s = satirlar[satirlar.length - 1];
      var tel = s.length ? Math.max(MINTEL, x.c ? x.c.w + 32 : 0) : 0;
      if (s.length && cur + tel + x.k.w > avail) { satirlar.push([]); s = satirlar[satirlar.length - 1]; cur = 0; tel = 0; }
      x.tel = tel; cur += tel + x.k.w; s.push(x);
    }
    if (satirlar.length < 2) return null;

    // dikey geometri: her satırın tel çizgisi (wy) ve satırlar arası kanal (yc)
    var y = 0, geo = [];
    satirlar.forEach(function (sat, si) {
      var ust = 0, alt = 0;
      sat.forEach(function (x, j) {
        ust = Math.max(ust, x.k.telY); alt = Math.max(alt, x.k.h - x.k.telY);
        if (x.c && j > 0) { ust = Math.max(ust, x.c.h / 2 + 4); alt = Math.max(alt, x.c.h / 2 + 4); }
      });
      var xc0 = MARJ + GUT;
      sat.forEach(function (x) { xc0 += x.tel; x.x = xc0; xc0 += x.k.w; });   // yatay konumlar çizimden önce belli olmalı (satır geçiş teli sonraki satırın başına gider)
      var wy = y + ust, sonraki = satirlar[si + 1];
      var kanal = sonraki ? (sonraki[0].c ? sonraki[0].c.h + 2 * KANAL_ARA : 2 * KANAL_ARA + 8) : 0;
      geo.push({ s: sat, wy: wy, yc: wy + alt + kanal / 2 });
      y = wy + alt + kanal;
    });
    var h = Math.ceil(y);
    return {
      w: W, h: h, satirSayisi: satirlar.length,
      ciz: function (g, ox, oy) {
        var teller = el('g', null, g), kartlar = el('g', null, g), cipler = el('g', null, g);
        geo.forEach(function (r, si) {
          r.s.forEach(function (x, j) {
            var xc = x.x;
            x.k.ciz(kartlar, ox + xc, oy + r.wy - x.k.telY);
            if (j > 0) {
              var p = r.s[j - 1], x1 = p.x + p.k.w, x2 = xc;
              I.telCiz(B, teller, [[ox + x1, oy + r.wy], [ox + x2, oy + r.wy]], x.giris, x.ic);
              if (x.c) cipCiz(B, cipler, x, x.c, ox + (x1 + x2) / 2 - x.c.w / 2, oy + r.wy - x.c.h / 2, o);
            }
          });
          var sn = geo[si + 1];
          if (sn) {
            var son = r.s[r.s.length - 1], ilk = sn.s[0];
            var xr = son.x + son.k.w, xl = MARJ + 8, xs = W - MARJ - 8;
            var pts = [[xr, r.wy], [xs, r.wy], [xs, r.yc], [xl, r.yc], [xl, sn.wy], [ilk.x, sn.wy]];
            I.telCiz(B, teller, pts.map(function (q) { return [ox + q[0], oy + q[1]]; }), ilk.giris, ilk.ic);
            if (ilk.c) cipCiz(B, cipler, ilk, ilk.c, ox + W / 2 - ilk.c.w / 2, oy + r.yc - ilk.c.h / 2, o);
          }
        });
      }
    };
  };

  // =============================================================================================================
  // DİKEY
  // =============================================================================================================
  /** Ağacı dikey yerleştir (her zaman sığar). Dönen: {w, h, ciz(g, ox, oy)}. */
  I.dikeyAgac = function (B, kokDugum, W, o) {
    o = o || {};
    var dar = W < 340, ADIM = dar ? 24 : 32, KOL0 = 24, DAL_SATIR = Math.max(28, B.satir('e') + 8), MAKS_SEVIYE = dar ? 2 : 3, MAKS_METIN = 420;   // çok dar ekranda (katlanır telefon dış ekranı ≈ 280 px) girinti küçülür
    function spineX(L) { return KOL0 + ADIM * Math.min(L, MAKS_SEVIYE); }
    var ogeler = [];   // çizim komutları: { sira, cizFn }
    var teller = [], bloklar = [], cipler = [], baglar = [], basliklar = [];
    var yMax = 0;

    /** n düğümünü yerleştir. onceki: önceki öğenin alt kenarı; telBasY: giriş telinin başladığı y. Dönen: alt kenar. */
    function yerles(n, L, onceki, telBasY, kokMu, onek) {
      var sx = spineX(L), xMetin = sx + ADIM, maksW = Math.min(W - MARJ - xMetin, MAKS_METIN);
      var blokTop;
      if (!kokMu) {
        var cip = (n.giris && n.cipGoster) ? I.cip(B, n.giris, { maksW: Math.max(120, Math.min(W - MARJ - (sx + 14), MAKS_METIN + 40)), ic: n.ic }) : null;
        var bosluk = cip ? Math.max(76, cip.h + 24) : 44;
        blokTop = onceki + bosluk;
        if (cip) cipler.push({ n: n, c: cip, x: Math.max(sx + 6, Math.min(sx + 14, W - MARJ - cip.w)), y: onceki + (bosluk - cip.h) / 2 });   // sığmayan çip (büyük yazı) omurgaya yaklaşır
      } else blokTop = onceki;
      var blok = n.blokFn ? n.blokFn({ spineX: sx, xMetin: xMetin, maksW: maksW }) : I.blokDikey(B, n.d, { spineX: sx, xMetin: xMetin, maksW: maksW, odak: n.odak, gecis: n.gecis, kisa: n.kisa });
      var ikY = blokTop + blok.ikonY;
      if (!kokMu) teller.push({ x: sx, y1: telBasY, y2: ikY, kenar: n.giris || null, ic: n.ic });
      bloklar.push({ blok: blok, y: blokTop });
      var alt = blokTop + blok.h;
      if (alt > yMax) yMax = alt;
      var c = n.cocuklar;
      if (!c.length) return alt;
      if (c.length === 1) return yerles(c[0], L, alt, ikY, false, onek);

      // dallanma: her dal girintili, solda ayraç, başlık `DAL n`
      var cursor = alt, ys = [];
      c.forEach(function (ch, i) {
        var no = (onek ? onek + '.' : '') + (i + 1);
        cursor += 12;
        var yh = cursor + DAL_SATIR / 2;
        ys.push(yh);
        var sx2 = spineX(L + 1);
        baglar.push([[sx, yh], [sx2, yh]]);
        basliklar.push({ x: sx2 + 14, y: yh, t: 'DAL ' + no + (ch.dalEk || '') });
        cursor += DAL_SATIR;
        cursor = yerles(ch, L + 1, cursor, yh, false, no);
      });
      baglar.push([[sx, ikY], [sx, ys[ys.length - 1]]]);
      return cursor;
    }
    var son = yerles(kokDugum, 0, o.ustBosluk || 0, 0, true, '');
    var h = Math.ceil(Math.max(son, yMax) + MARJ);
    return {
      w: W, h: h,
      ciz: function (g, ox, oy) {
        var gT = el('g', null, g), gB = el('g', null, g), gC = el('g', null, g);
        baglar.forEach(function (p) { I.bagCiz(gT, p.map(function (q) { return [ox + q[0], oy + q[1]]; })); });
        teller.forEach(function (t) { I.telCiz(B, gT, [[ox + t.x, oy + t.y1], [ox + t.x, oy + t.y2]], t.kenar, t.ic); });
        bloklar.forEach(function (b) { b.blok.ciz(gB, oy + b.y); });
        cipler.forEach(function (c) { cipCiz(B, gC, c.n, c.c, ox + c.x, oy + c.y, o); });
        basliklar.forEach(function (b) { B.yazi(gC, ox + b.x, oy + b.y, b.t, 'e'); });
      }
    };
  };
})(typeof globalThis === 'object' ? globalThis : this);
