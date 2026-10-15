/* d4-kablo: Iz (KB.izle) → çizim. Bileşen başına ağaç kurar (zincirde doğrusal), yatay/dikey yerleşimi seçer,
   çevrim kapanışı / kendine dönen parçaları dipnot olarak yazar. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el, r = I.r;
  var MARJ = 4, UST = 8;

  function norm(s) { return KB.normalize && KB.normalize.norm ? KB.normalize.norm(s) : String(s).toUpperCase(); }
  function kabloAnahtari(s) { return KB.normalize && KB.normalize.kabloAnahtari ? KB.normalize.kabloAnahtari(s) : String(s).replace(/^#/, ''); }
  /** KB.metin ile aynı kablo kimliği: numara varsa numara, yoksa etiket. */
  function kenarAnahtari(k) {
    if (k.no != null) return kabloAnahtari(k.no);
    if (k.etiket != null) return 'etiket:' + norm(k.etiket);
    return null;
  }
  /** Çipin gösterilmesi gereken özelliklerinin imzası: önceki kenarla aynıysa çip tekrarlanmaz. */
  function imza(k) {
    return [kenarAnahtari(k), k.renk || '', k.kesit || '', k.renkSemaNotu ? 1 : 0, k.kesitSemaNotu ? 1 : 0].join('|');
  }
  function cipGoster(k, onceki) {
    if (k.ic || k.soketIci || k.varyant || k.supheli || k.celiski || k.not) return true;
    return !onceki || imza(k) !== onceki;
  }

  /** Iz bileşenlerinden soyut ağaçlar. Zincirde sıra zincir[]'den (odak ortada olabilir), değilse agac'tan.
      Geçiş bileşeni (sigorta/diyot/direnç/şalter): iki terminali ve aralarındaki SANAL kenar tek düğüme katlanır
      (KB.metin ile aynı kural): düğüm.gecis = { kenar, d0, d1 }; terminallerin öbür kenarları bileşenin çocuğu olur,
      çocuk.taraf 'a' (giriş terminali) / 'b' (çıkış terminali) ve dallanmada dal başlığına terminalin pini eklenir. */
  I.izAgaclari = function (B, iz, secenek) {
    var dMap = {}, kMap = {};
    iz.dugumler.forEach(function (d) { dMap[d.id] = d; });
    iz.kenarlar.forEach(function (k) { kMap[k.id] = k; });
    B.kMap = kMap; B.dMap = dMap;
    var odakId = secenek.odak || null;
    return iz.bilesenler.map(function (b) {
      var odak = odakId || b.odak || null, agac;
      if (b.zincir && b.zincir.length) {
        agac = { dugum: b.zincir[0], kenar: null, cocuklar: [] };
        var p = agac;
        for (var i = 1; i < b.zincir.length; i++) {
          var c = { dugum: b.zincir[i], kenar: b.zincirKenarlar[i - 1], cocuklar: [] };
          p.cocuklar.push(c); p = c;
        }
      } else agac = b.agac;
      function kur(a, onceki, taraf) {
        var k = a.kenar ? kMap[a.kenar] : null;
        var d = dMap[a.dugum];
        var n = { d: d, giris: k, cocuklar: [], odak: odak === a.dugum, ic: k ? k.ic === true : false, kisa: k ? k.ic === true : false, taraf: taraf || null, cipGoster: k ? cipGoster(k, onceki) : false };
        var kalan = [], bil = null, i2;
        var cs = a.cocuklar || [];
        for (i2 = 0; i2 < cs.length; i2++) {
          var ck = cs[i2].kenar ? kMap[cs[i2].kenar] : null;
          if (ck && ck.sanal === true) { bil = cs[i2]; n.gecis = { kenar: ck, d0: d, d1: dMap[bil.dugum] }; break; }
        }
        if (bil) {
          n.odak = n.odak || odak === bil.dugum;
          cs.forEach(function (c) { if (c !== bil) kalan.push({ c: c, t: 'a' }); });
          (bil.cocuklar || []).forEach(function (c) { kalan.push({ c: c, t: 'b' }); });
        } else cs.forEach(function (c) { kalan.push({ c: c, t: null }); });
        // kablo kimliği: bileşenden sonra yeniden başlar (KB.metin: sanal kenar kablo değil); cihaz içi köprüden sonra değişmez
        var kendi = bil ? null : (k && !k.ic ? imza(k) : onceki);
        kalan.forEach(function (x) { n.cocuklar.push(kur(x.c, kendi, x.t)); });
        if (n.gecis && n.cocuklar.length > 1) {
          n.cocuklar.forEach(function (c) {
            var t = c.taraf === 'a' ? n.gecis.d0 : c.taraf === 'b' ? n.gecis.d1 : null;
            if (t && t.pin != null) c.dalEk = ' · pin ' + t.pin;
          });
        }
        return n;
      }
      return kur(agac, null, null);
    });
  };

  function adresMetni(d) {
    if (KB.metin && KB.metin.dugum) return KB.metin.dugum(d);
    return d.ad || '';
  }

  /** Çevrim kapanışı: çizilmez, dipnotta yazılır (API.md §7.2). Kendine dönen kablolar düğümün yanında not olarak yazılır (d2b). */
  function kapanislar(B, iz, W) {
    var kMap = {}, dMap = {}, liste = [], goruldu = {};
    iz.kenarlar.forEach(function (k) { kMap[k.id] = k; });
    iz.dugumler.forEach(function (d) { dMap[d.id] = d; });
    iz.bilesenler.forEach(function (b) { (b.geriKenarlar || []).forEach(function (id) { if (!goruldu[id] && kMap[id]) { goruldu[id] = true; liste.push(kMap[id]); } }); });
    if (!liste.length) return null;
    var maksW = W - 2 * MARJ - 8, ogeler = [], y = 0;
    liste.forEach(function (k) {
      var a = dMap[k.a], b2 = dMap[k.b];
      var metin = adresMetni(a) + ' ↔ ' + adresMetni(b2);
      var aciklama = k.sanal ? 'Geçiş bileşeni ' + (KB.metin && KB.metin.bilesen ? KB.metin.bilesen(k.bilesen) : k.bilesen.kod) + ' çevrimi kapatıyor; çizilmedi.'
        : k.ic ? 'Cihaz içi bağlantı çevrimi kapatıyor; çizilmedi.' : 'Çevrimi kapatan parça; çizilmedi.';
      var yaz = B.sar(metin, 'g', maksW, 4), ac = B.sar(aciklama, 'i', maksW, 3);
      var cip = k.sanal ? null : I.cip(B, k, { maksW: Math.min(maksW, 320), ic: k.ic === true });
      var hh = Math.max(24, B.satir('e') + 4);
      var h = hh + 4 + yaz.satirlar.length * B.satir('g') + 2 + ac.satirlar.length * B.satir('i') + (cip ? 8 + cip.h : 0);
      ogeler.push({ y: y, h: h, hh: hh, yaz: yaz, ac: ac, cip: cip });
      y += h + 16;
    });
    return {
      h: y - 16,
      ciz: function (g, ox, oy) {
        ogeler.forEach(function (o) {
          var yy = oy + o.y, x = ox + MARJ + 4;
          B.ikon(g, 'd-don', x, yy + (o.hh - 24) / 2, 24, 'ik-yz2');
          B.yazi(g, x + 32, yy + o.hh / 2, 'ÇEVRİM KAPANIŞI', 'e');
          var ty = yy + o.hh + 4;
          o.yaz.satirlar.forEach(function (t, i) { B.yazi(g, x, ty + B.satir('g') * (i + 0.5), t, 'g'); });
          ty += o.yaz.satirlar.length * B.satir('g') + 2;
          o.ac.satirlar.forEach(function (t, i) { B.yazi(g, x, ty + B.satir('i') * (i + 0.5), t, 'i'); });
          ty += o.ac.satirlar.length * B.satir('i') + 8;
          if (o.cip) o.cip.ciz(g, x, ty);
        });
      }
    };
  }

  /** Iz için sahne: { w, h, yerlesim, ciz(g) }. */
  I.kabloSahne = function (B, iz, secenek) {
    var W = B.W, agaclar = I.izAgaclari(B, iz, secenek);
    var kendiKablo = iz.kablo ? iz.kablo.anahtar : null;
    var o = { kendiKablo: kendiKablo };
    var mod = secenek.yerlesim === 'yatay' ? 'yatay' : secenek.yerlesim === 'dikey' ? 'dikey' : (W > 480 ? 'yatay' : 'dikey');
    var parcalar = null;
    if (mod === 'yatay') {
      parcalar = agaclar.map(function (a) { return I.yatayAgac(B, a, W, o) || I.yatayZincir(B, a, W, o); });
      if (parcalar.some(function (p) { return !p; })) { parcalar = null; mod = 'dikey'; }
    }
    if (!parcalar) parcalar = agaclar.map(function (a) { return I.dikeyAgac(B, a, W, o); });

    var coklu = agaclar.length > 1, y = UST, adimlar = [];
    parcalar.forEach(function (p, i) {
      if (coklu) { adimlar.push({ tur: 'baslik', y: y, t: 'PARÇA ' + (i + 1) }); y += Math.max(28, B.satir('e') + 8); }
      adimlar.push({ tur: 'agac', y: y, p: p });
      y += p.h + 20;
    });
    var kap = kapanislar(B, iz, W);
    if (kap) {
      adimlar.push({ tur: 'ayrac', y: y - 4 });
      y += 12;
      adimlar.push({ tur: 'kap', y: y, p: kap });
      y += kap.h + 20;
    }
    var h = Math.ceil(y - 20 + UST);
    return {
      w: W, h: h, yerlesim: mod,
      ciz: function (g) {
        adimlar.forEach(function (a) {
          if (a.tur === 'baslik') B.yazi(g, MARJ + 4, a.y + Math.max(28, B.satir('e') + 8) / 2 - 2, a.t, 'e');
          else if (a.tur === 'ayrac') el('line', { class: 'dy-ince', x1: MARJ, y1: r(a.y) + 0.5, x2: W - MARJ, y2: r(a.y) + 0.5 }, g);
          else if (a.tur === 'agac') a.p.ciz(g, 0, a.y);
          else a.p.ciz(g, 0, a.y);
        });
      }
    };
  };
})(typeof globalThis === 'object' ? globalThis : this);
