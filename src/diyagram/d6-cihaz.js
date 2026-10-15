/* d6-cihaz: cihaz sorgusu ve soket sorgusu çizimi (DESIGN §8, §11.3).
   Üstte cihaz başlığı; altında soket başlık bantları (yapışkan) ve pin satırları. Her pin satırı küçük bir ağaçtır:
   pin ── kablo çipi ── karşı uç (ara soket/ek noktası ise "ÜZERİNDEN" zinciri, sonra varış uçları).
   Yerleşim d3-agac ile aynıdır: geniş ekranda yatay satırlar, dar ekranda her satır dikey mini zincir. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el, r = I.r;
  var MARJ = 4;

  function metinDugum(d) { return KB.metin && KB.metin.dugum ? KB.metin.dugum(d) : (d.ad || ''); }

  // ---- mini kart (cihaz satırlarında karşı uç): işaret + etiket/kod + kapsül yan yana ----------------------------------
  I.kartMini = function (B, d, o) {
    o = o || {};
    var b = I.dugumBilgi(B, d, { kisa: true, gecis: o.gecis });
    var PAD = 8, IK = 40;
    var kap = b.pinCifti ? I.pinCifti(B, b.pinCifti, 250) : (b.kapsulSpec ? I.kapsul(B, b.kapsulSpec, 250) : null);
    var geriVar = b.tikla && B.o[{ cihaz: 'onCihaz', soket: 'onSoket' }[b.tikla.eylem]];
    var etW = B.gen(b.etiket, 'e'), kodW = b.kod ? B.parcaGen(B.parcala(b.kod), b.kodSinif) : 0;
    var yazW = Math.max(etW, kodW);
    var baslikW = IK + 8 + yazW;
    var rozetler = [];
    if (b.hata) rozetler.push(I.rozet(B, 'hata'));
    if (b.belirsiz && !(kap && kap.eksik)) rozetler.push(I.rozet(B, 'supheli'));
    var rs = rozetler.length ? I.rozetSirasi(B, rozetler, 260) : null;
    var satirH = Math.max(IK, B.satir('e') + (b.kod ? B.satir(b.kodSinif) : 0));
    if (kap) satirH = Math.max(satirH, kap.h);
    var w = PAD + baslikW + (kap ? 12 + kap.w : 0) + (geriVar ? 8 + 20 : 0) + PAD + 4;
    var notlar = [];
    b.notlar.forEach(function (n) { notlar.push(n[0] + ' · ' + n[1]); });
    var notSar = notlar.length ? B.sar(notlar.join('  '), 'i', Math.max(160, w - 2 * PAD - 4), 3) : null;
    if (notSar) w = Math.max(w, notSar.w + 2 * PAD + 4);
    if (rs) w = Math.max(w, rs.w + 2 * PAD + 4);
    var y = PAD + 2, satirY = y; y += satirH;
    var rsY = null; if (rs) { y += 6; rsY = y; y += rs.h; }
    var nY = null; if (notSar) { y += 6; nY = y; y += notSar.satirlar.length * B.satir('i'); }
    var h = Math.ceil(y + PAD + 2);
    var kalin = b.ik === 'beyin' ? 3 : 2;
    return {
      w: Math.ceil(w), h: h, telY: satirY + satirH / 2, d: d,
      ciz: function (g, x, y0) {
        var gk = b.tikla ? B.dokun(g, b.tikla.eylem, b.tikla.deger, d, { x: x, y: y0, w: Math.ceil(w), h: h }, b.aria) : g;
        el('rect', { class: 'dy-kart' + (b.ik === 'beyin' ? ' dy-kart-beyin' : b.hata ? ' dy-kart-hata' : ''), x: r(x) + kalin / 2, y: r(y0) + kalin / 2, width: Math.ceil(w) - kalin, height: h - kalin, rx: 8 }, gk);
        var cx = x + PAD + 2, cy = y0 + satirY;
        B.turIkon(gk, b.ik, cx, cy + (satirH - IK) / 2, IK);
        var tx = cx + IK + 8, ty = cy + (satirH - (B.satir('e') + (b.kod ? B.satir(b.kodSinif) : 0))) / 2;
        if (b.kod) {
          B.yazi(gk, tx, ty + B.satir('e') / 2, b.etiket, 'e');
          B.yaziCiz(gk, tx, ty + B.satir('e') + B.satir(b.kodSinif) / 2, b.kod, b.kodSinif, b.kodSinif === 'i' ? 'dy-yz2' : '');
        } else B.yazi(gk, tx, cy + satirH / 2, b.etiket, 'e');
        if (kap && b.pinCifti) {
          kap.ciz(gk, cx + baslikW + 12, cy + (satirH - kap.h) / 2);
        } else if (kap) {
          var kx = cx + baslikW + 12, ky = cy + (satirH - kap.h) / 2;
          var gp = B.dokun(gk, 'uc', I.ucRef(d), d, { x: kx, y: ky, w: kap.w, h: kap.h }, 'Pin ' + (d.pin || '') + ' izini aç');
          kap.ciz(gp, kx, ky);
          B.odakHalka(gp);
        }
        if (geriVar) B.ikon(gk, 'i-sag', x + w - PAD - 2 - 20, cy + (satirH - 20) / 2, 20, 'ik-yz2');
        if (rs) rs.ciz(gk, cx, y0 + rsY);
        if (notSar) notSar.satirlar.forEach(function (t, i) { B.yazi(gk, cx, y0 + nY + B.satir('i') * (i + 0.5), t, 'i', 'dy-yz2'); });
        B.odakHalka(gk === g ? null : gk);
      }
    };
  };

  // ---- pin düğümü (satır kökü / cihaz içi hedef): ters renkli pin kutusu + pin adı ------------------------------------------
  var DONEN_W = 170;
  /** Kendine dönen kablolar: "kablo 4201, 4202", numarasız olanlar "numarasız kablo" (D13 sözlüğü). */
  function donenAdlari(liste) {
    var no = [], nsiz = 0;
    (liste || []).forEach(function (k) { if (k.etiket != null) no.push(k.etiket); else nsiz++; });
    var p = [];
    if (no.length) p.push('kablo ' + no.join(', '));
    if (nsiz) p.push(nsiz > 1 ? nsiz + ' numarasız kablo' : 'numarasız kablo');
    return p.join(' · ');
  }
  function donenMetni(spec) {
    var t = donenAdlari(spec.donen);
    return t ? 'KENDİNE DÖNEN · ' + t : null;
  }
  function pinOlc(B, spec) {
    var pinVar = spec.pin != null && spec.pin !== '';
    var txtW = pinVar ? B.parcaGen(B.parcala(spec.pin), 'k') : 0;
    var boxW = pinVar ? Math.max(36, Math.ceil(txtW) + 16) : Math.ceil(B.gen('pin yok', 'i')) + 16;
    var adVar = spec.pinAdi != null && spec.pinAdi !== '';
    var adW = adVar ? B.parcaGen(B.parcala(spec.pinAdi), 'pa') : 0;
    var dm = donenMetni(spec), donen = dm ? B.sar(dm, 'i', DONEN_W, 3) : null;
    return { pinVar: pinVar, txtW: txtW, boxW: boxW, adVar: adVar, adW: adW, donen: donen };
  }
  function pinH(B) { return Math.max(40, B.satir('k') + 10); }   // pin satırı yüksekliği (yazı büyüyünce büyür)
  function pinKutuCiz(B, g, spec, m, x, cy) {
    var bh = pinH(B) - 8;
    if (m.pinVar) {
      el('rect', { class: 'dy-pinkutu', x: r(x), y: r(cy - bh / 2), width: m.boxW, height: bh, rx: 4 }, g);
      B.yaziCiz(g, x + (m.boxW - m.txtW) / 2, cy, spec.pin, 'k', 'dy-ters');
    } else {
      el('rect', { class: 'dy-kapsul-bos', x: r(x) + 1, y: r(cy - bh / 2) + 1, width: m.boxW - 2, height: bh - 2, rx: 4 }, g);
      B.yazi(g, x + 8, cy, 'pin yok', 'i', 'dy-yz2');
    }
  }
  /** spec: { pin, pinAdi, soket?, belirsiz, supheli, uc, donen?: [Kenar] }. Dönen: kartFn/blokFn çifti için kurucular. */
  I.pinDugumu = function (B, spec, secenek) {
    var m = pinOlc(B, spec);
    var sup = spec.supheli || spec.belirsiz;
    function aria() { return 'Pin ' + (spec.pin || '') + ' izini aç'; }
    function donenCiz(g, x, y0) {
      m.donen.satirlar.forEach(function (t, i) { B.yazi(g, x, y0 + B.satir('i') * (i + 0.5), t, 'i', 'dy-yz2'); });
    }
    return {
      kart: function (o) {
        var soketVar = secenek && secenek.soketGoster && spec.soket != null;
        var soketW = soketVar ? 20 + 4 + B.parcaGen(B.parcala(spec.soket), 'p') : 0;
        var satirW = m.boxW + (m.adVar ? 10 + m.adW : 0);
        var w = Math.max((secenek && secenek.minW) || 0, satirW, soketW, m.donen ? m.donen.w : 0) + 8;
        var rz = sup ? I.rozet(B, 'supheli') : null;
        var ph = pinH(B), y = 4, bY = y; y += ph;
        var sY = null; if (soketVar) { sY = y; y += Math.max(28, B.satir('p') + 4); }
        var zY = null; if (rz) { y += 2; zY = y; y += rz.h; }
        var dY = null; if (m.donen) { y += 4; dY = y; y += m.donen.satirlar.length * B.satir('i'); }
        var h = y + 4;
        w = Math.max(w, rz ? rz.w + 8 : 0);
        return {
          w: Math.ceil(w), h: Math.ceil(h), telY: bY + ph / 2,
          ciz: function (g, x, y0) {
            var gp = B.dokun(g, 'uc', spec.uc, spec, { x: x, y: y0, w: Math.ceil(w), h: Math.ceil(h) }, aria());
            pinKutuCiz(B, gp, spec, m, x + 4, y0 + bY + ph / 2);
            if (m.adVar) B.yaziCiz(gp, x + 4 + m.boxW + 10, y0 + bY + ph / 2, spec.pinAdi, 'pa');
            if (soketVar) { var sh = Math.max(28, B.satir('p') + 4); B.ikon(gp, 'i-soket', x + 4, y0 + sY + (sh - 20) / 2, 20, 'ik-yazi'); B.yaziCiz(gp, x + 28, y0 + sY + sh / 2, spec.soket, 'p'); }
            if (rz) rz.ciz(gp, x + 4, y0 + zY);
            if (m.donen) donenCiz(gp, x + 4, y0 + dY);
            B.odakHalka(gp === g ? null : gp);
          }
        };
      },
      blok: function (o) {
        var left = Math.max(MARJ, o.spineX - m.boxW / 2), right = left + m.boxW;
        var tx = Math.max(o.xMetin, right + 10);
        var soketVar = secenek && secenek.soketGoster && spec.soket != null;
        var rz = sup ? I.rozet(B, 'supheli') : null;
        var ph = pinH(B), y = ph, sY = null, zY = null, dY = null;
        if (soketVar) { y += 2; sY = y; y += Math.max(24, B.satir('p') + 2); }
        if (rz) { y += 4; zY = y; y += rz.h; }
        if (m.donen) { y += 4; dY = y; y += m.donen.satirlar.length * B.satir('i'); }
        return {
          h: Math.ceil(y), ikonY: ph / 2,
          ciz: function (g, y0) {
            var gp = B.dokun(g, 'uc', spec.uc, spec, { x: o.spineX - 24, y: y0, w: (o.xMetin + o.maksW) - (o.spineX - 24), h: Math.ceil(y) }, aria());
            pinKutuCiz(B, gp, spec, m, left, y0 + ph / 2);
            if (m.adVar) B.yaziCiz(gp, tx, y0 + ph / 2, spec.pinAdi, 'pa');
            if (soketVar) { var sh = Math.max(24, B.satir('p') + 2); B.ikon(gp, 'i-soket', tx, y0 + sY + (sh - 20) / 2, 20, 'ik-yazi'); B.yaziCiz(gp, tx + 24, y0 + sY + sh / 2, spec.soket, 'p'); }
            if (rz) rz.ciz(gp, tx, y0 + zY);
            if (m.donen) donenCiz(gp, o.xMetin, y0 + dY);
            B.odakHalka(gp === g ? null : gp);
          }
        };
      }
    };
  };


  // ---- ara soketler: tek kartta, sırayla, sarılan kapsüllerle (uzun zincirler satırı şişirmesin) ----------------------------------
  /** "pin 2–1" (soketliyse "soket X pin 2–1"); iki ucun da pini yoksa boş. a: { d0, d1 }. */
  function gecisPinMetni(a) {
    var d0 = a.d0, d1 = a.d1;
    if (!d0 || !d1 || (d0.pin == null && d1.pin == null)) return '';
    var p0 = d0.pin != null ? d0.pin : '(yazılı değil)', p1 = d1.pin != null ? d1.pin : '(yazılı değil)';
    return (d0.soket != null && d0.soket === d1.soket ? 'soket ' + d0.soket + ' ' : '') + 'pin ' + p0 + '–' + p1;
  }
  /** ÜZERİNDEN akışında geçiş bileşeni: tür işareti (32) + kod (mono) + "ŞALTER · pin 2–1". a: { bilesen:{kod,tur}, d0, d1 }. */
  function gecisOge(B, a, maksW) {
    var IK = 32, PAD = 6, tur = D.TURLER[a.bilesen.tur] ? a.bilesen.tur : 'diger';
    var alt = D.TURLER[tur].ad + (gecisPinMetni(a) ? ' · ' + gecisPinMetni(a) : '');
    var kodW = B.parcaGen(B.parcala(a.bilesen.kod), 'p');
    var bos = PAD + IK + 8 + PAD + 2;
    var altS = B.sar(alt, 'e', Math.max(60, (maksW || 330) - bos, kodW), 3), lE = B.satir('e');
    var w = Math.ceil(bos + Math.max(kodW, altS.w));
    var yaz = B.satir('p') + altS.satirlar.length * lE;
    var h = Math.ceil(Math.max(IK + 2 * PAD, yaz + 2 * PAD));
    return {
      w: w, h: h, gecis: true,
      ciz: function (g, x, y) {
        var gr = el('g', { class: 'dy-halo-ust' }, g);
        el('rect', { class: 'dy-kapsul', x: r(x) + 1, y: r(y) + 1, width: w - 2, height: h - 2, rx: 8 }, gr);
        B.turIkon(gr, tur, x + PAD, y + (h - IK) / 2, IK);
        var ty = y + (h - yaz) / 2;
        B.yaziCiz(gr, x + PAD + IK + 8, ty + B.satir('p') / 2, a.bilesen.kod, 'p');
        altS.satirlar.forEach(function (t, i) { B.yazi(gr, x + PAD + IK + 8, ty + B.satir('p') + lE * (i + 0.5), t, 'e'); });
      }
    };
  }
  function araOge(B, a, maksW) {
    if (a.tur === 'gecis') return gecisOge(B, a, maksW);
    if (a.tur === 'dugum') {
      var t = I.ekNoktasiAdi(a);
      var w = Math.ceil(B.parcaGen(B.parcala(t), 'g')) + 20, eh = Math.max(36, B.satir('g') + 10);
      return { w: w, h: eh, ciz: function (g, x, y) { var gr = el('g', { class: 'dy-halo-ust' }, g); el('rect', { class: 'dy-kapsul', x: r(x) + 1, y: r(y) + 1, width: w - 2, height: eh - 2, rx: 8 }, gr); B.yaziCiz(gr, x + 10, y + eh / 2, t, 'g'); } };
    }
    return I.kapsul(B, { soket: a.soket, pin: a.pin, belirsiz: a.belirsiz }, maksW);
  }
  /** Sıralı kapsül akışı: [k] → [k] → …; maksW'ye göre satır kırar. Dönen {w,h,ciz(g,x,y)}. */
  function araAkis(B, liste, maksW) {
    var OK = 22, ARA = 4, ogeler = liste.map(function (a) { return araOge(B, a, maksW); });
    var satirlar = [[]], cur = 0, w = 0;
    ogeler.forEach(function (o, i) {
      var ek = (i > 0 ? OK : 0) + o.w;
      var s = satirlar[satirlar.length - 1];
      if (s.length && cur + ek > maksW) { satirlar.push([]); s = satirlar[satirlar.length - 1]; cur = 0; ek = o.w; }
      s.push({ o: o, ilk: s.length === 0 && satirlar.length === 1 && false });
      cur += ek; if (cur > w) w = cur;
    });
    var satirH = ogeler.reduce(function (m, o) { return Math.max(m, o.h); }, 36);
    var h = satirlar.length * satirH + (satirlar.length - 1) * ARA;
    return {
      w: Math.ceil(w), h: h,
      ciz: function (g, x, y) {
        satirlar.forEach(function (s, si) {
          var cx = x, cy = y + si * (satirH + ARA);
          s.forEach(function (e, ei) {
            if (ei > 0 || (si > 0)) { B.yazi(g, cx + (ei > 0 ? 3 : 0), cy + satirH / 2, '→', 'g', 'dy-yz2'); if (ei > 0) cx += OK; }
            e.o.ciz(g, cx, cy + (satirH - e.o.h) / 2);
            cx += e.o.w;
          });
        });
      }
    };
  }
  function hepSoket(liste) { return liste.every(function (x) { return x.tur === 'soket'; }); }
  function araEtiket(liste, baslik) {
    if (baslik) return baslik;
    if (hepSoket(liste)) return liste.length > 1 ? liste.length + ' ARA SOKET' : 'ARA SOKET';
    return 'ÜZERİNDEN' + (liste.length > 1 ? ' ×' + liste.length : '');
  }
  function araIkon(liste) { return hepSoket(liste) ? 'soket' : 'dugum'; }
  function araKartiKur(B, liste, baslik) {
    var PAD = 8, IK = 40;
    return {
      kart: function (o) {
        var etiket = araEtiket(liste, baslik);
        var akis = araAkis(B, liste, 330);
        var basW = IK + 8 + B.gen(etiket, 'e');
        var iw = Math.max(basW, akis.w);
        var w = Math.ceil(iw + 2 * PAD + 4), y = PAD + 2, bY = y; y += IK + 6;
        var aY = y; y += akis.h;
        var h = Math.ceil(y + PAD + 2);
        return {
          w: w, h: h, telY: aY + Math.min(22, akis.h / 2),
          ciz: function (g, x, y0) {
            el('rect', { class: 'dy-kart', x: r(x) + 1, y: r(y0) + 1, width: w - 2, height: h - 2, rx: 8 }, g);
            B.turIkon(g, araIkon(liste), x + PAD + 2, y0 + bY, IK);
            B.yazi(g, x + PAD + 2 + IK + 8, y0 + bY + IK / 2, etiket, 'e');
            akis.ciz(g, x + PAD + 2, y0 + aY);
          }
        };
      },
      blok: function (o) {
        var etiket = araEtiket(liste, baslik);
        var bs = B.sar(etiket, 'e', o.maksW, 2), lE = B.satir('e');
        var akis = araAkis(B, liste, o.maksW);
        var y = Math.max(19, bs.satirlar.length * lE) + 4, aY = y; y += akis.h;
        return {
          h: Math.ceil(Math.max(40, y)), ikonY: 20,
          ciz: function (g, y0) {
            B.turIkon(g, araIkon(liste), o.spineX - 20, y0, 40);
            bs.satirlar.forEach(function (t, i) { B.yazi(g, o.xMetin, y0 + 10 + lE * i, t, 'e'); });
            akis.ciz(g, o.xMetin, y0 + aY);
          }
        };
      }
    };
  }

  // ---- bir pin satırı → soyut ağaç --------------------------------------------------------------------------------------
  function dugumDugumu(B, d, odak) {
    return {
      d: d, giris: null, cocuklar: [], cipGoster: false, ic: false,
      kartFn: function (o) { return I.kartMini(B, d, o); },
      blokFn: function (o) { return I.blokDikey(B, d, { spineX: o.spineX, xMetin: o.xMetin, maksW: o.maksW, kisa: true }); }
    };
  }

  /** Tek geçiş bileşeni düğümü (satırda ara öğe): bileşen kartı, iki ucun pini yan yana. a: { bilesen, d0, d1 }. */
  function gecisDugumu(B, a) {
    var gec = { kenar: { bilesen: a.bilesen }, d0: a.d0, d1: a.d1 };
    return {
      d: a.d0, giris: null, cocuklar: [], cipGoster: false, ic: false,
      kartFn: function (o) { return I.kartMini(B, a.d0, { gecis: gec }); },
      blokFn: function (o) { return I.blokDikey(B, a.d0, { spineX: o.spineX, xMetin: o.xMetin, maksW: o.maksW, kisa: true, gecis: gec }); }
    };
  }
  /** Ardışık aynı kodlu iki geçiş ucu (gecisUcu) tek 'gecis' öğesine katlanır (KB.metin ile aynı kural). */
  function gecisGrupla(liste, gecisler) {
    var cikti = [];
    for (var i = 0; i < liste.length; i++) {
      var a = liste[i], b2 = liste[i + 1];
      if (a.gecisUcu === true && a.tur === 'cihaz' && b2 && b2.gecisUcu === true && b2.tur === 'cihaz' && b2.cihaz === a.cihaz) {
        var bl = null;
        (gecisler || []).forEach(function (x) { if (!bl && x.kod === a.cihaz) bl = x; });
        if (!bl) bl = { kod: a.cihaz, tur: a.cihazTur, turAd: (D.TURLER[a.cihazTur] || D.TURLER.diger).ad.toLowerCase(), ad: a.cihaz };
        cikti.push({ tur: 'gecis', bilesen: bl, d0: a, d1: b2, id: a.id });
        i++;
      } else cikti.push(a);
    }
    return cikti;
  }

  function araKartDugumu(B, liste, baslik) {
    var ak = araKartiKur(B, liste, baslik);
    return { d: liste[0], giris: null, cocuklar: [], cipGoster: false, ic: false, kartFn: ak.kart, blokFn: ak.blok };
  }

  function satirAgaci(B, satir, cihazKod, minW) {
    var pinSpec = { pin: satir.pin, pinAdi: satir.pinAdi, belirsiz: satir.belirsiz, supheli: satir.supheli, uc: satir.uc || null, donen: satir.kendineDonen || [] };
    var pd = I.pinDugumu(B, pinSpec, { minW: minW || 0 });
    var kokN = { d: pinSpec, giris: null, cocuklar: [], cipGoster: false, ic: false, kartFn: pd.kart, blokFn: pd.blok, kokPin: true };
    (satir.kablolar || []).forEach(function (kb) {
      var k = kb.kenar, uc = kb.karsiUc;
      var ic = k.ic === true || k.sanal === true;
      var cocuk;
      if (ic) {
        // cihaz içi bağlantı / geçiş bileşeninin içi: hedef yalnız pin kutusu (aynı cihaz kartı tekrarlanmaz)
        var pd2 = I.pinDugumu(B, { pin: uc.pin, pinAdi: uc.pinAdi, soket: uc.soket, belirsiz: uc.belirsiz, supheli: uc.belirsiz, uc: I.ucRef(uc) }, { soketGoster: uc.soket != null && uc.soket !== satir.soket });
        cocuk = { d: uc, giris: k, cocuklar: [], cipGoster: true, ic: true, kartFn: pd2.kart, blokFn: pd2.blok };
        kokN.cocuklar.push(cocuk);
        return;
      }
      var varis = kb.varis || [];
      var karsiFinal = varis.some(function (v) { return v.id === uc.id; });
      var via = (kb.ara || []).slice();
      if (!karsiFinal && !via.some(function (a) { return a.id === uc.id; })) via.unshift(uc);
      var nihai = varis.filter(function (v) { return v.id !== uc.id || karsiFinal; });
      if (kb.dal) {
        // dal sırası verilmez: ilk dallanma düğümüne (ek noktası) kadar zincir, sonra varış uçları yelpazesi
        var kes = -1;
        for (var i = 0; i < via.length; i++) { if (via[i].tur === 'dugum' || via[i].dal) { kes = i; break; } }
        if (kes >= 0) via = via.slice(0, kes + 1);
      }
      var zincir = [];
      // ardışık ara soketler tek kartta; son ek noktası (dallanma) ayrı düğüm
      var govde = via.slice(), dalDugumu = null;
      if (kb.dal && govde.length && (govde[govde.length - 1].tur === 'dugum' || govde[govde.length - 1].dal)) dalDugumu = govde.pop();
      if (karsiFinal && !kb.dal) { govde = []; }
      if (dalDugumu && dalDugumu.gecisUcu === true && govde.length) {
        var onc = govde[govde.length - 1];
        if (onc.gecisUcu === true && onc.tur === 'cihaz' && onc.cihaz === dalDugumu.cihaz) { govde.pop(); dalDugumu = gecisGrupla([onc, dalDugumu], kb.gecisler)[0]; }
      }
      govde = gecisGrupla(govde, kb.gecisler);
      if (govde.length >= 2) zincir.push(araKartDugumu(B, govde));
      else if (govde.length === 1) zincir.push(govde[0].tur === 'gecis' ? gecisDugumu(B, govde[0]) : dugumDugumu(B, govde[0]));
      if (dalDugumu) zincir.push(dalDugumu.tur === 'gecis' ? gecisDugumu(B, dalDugumu) : dugumDugumu(B, dalDugumu));
      // zincirde yeri belli olmayan (dalların altında kalan) geçiş bileşenleri: bilgi kaybolmasın, ayrı kartta yazılır
      var gosterilen = {};
      govde.concat(dalDugumu ? [dalDugumu] : []).forEach(function (x) { if (x.tur === 'gecis') gosterilen[x.bilesen.kod] = true; });
      var eksikGecis = (kb.gecisler || []).filter(function (g) { return !gosterilen[g.kod]; });
      if (eksikGecis.length) {
        zincir.push(araKartDugumu(B, eksikGecis.map(function (g) { return { tur: 'gecis', bilesen: g, d0: null, d1: null }; }), kb.dal ? 'DALLARDA GEÇEN BİLEŞENLER' : 'GEÇİŞ BİLEŞENLERİ'));
      }
      var ilk = zincir.length ? zincir[0] : null;
      var finals = karsiFinal && !kb.dal ? [uc] : nihai;
      if (!ilk) {
        // karşı uç doğrudan varış; dallanıyorsa her varış ucu aynı kablo çipiyle ayrı dal olur (hiçbiri atlanmaz)
        (finals.length ? finals : [uc]).forEach(function (v) {
          cocuk = dugumDugumu(B, v);
          cocuk.giris = k; cocuk.cipGoster = true;
          kokN.cocuklar.push(cocuk);
        });
        return;
      }
      ilk.giris = k; ilk.cipGoster = true;
      kokN.cocuklar.push(ilk);
      var son = ilk;
      for (var z = 1; z < zincir.length; z++) { son.cocuklar.push(zincir[z]); son = zincir[z]; }
      finals.forEach(function (v) { son.cocuklar.push(dugumDugumu(B, v)); });
    });
    return kokN;
  }

  // ---- başlık ve bantlar ---------------------------------------------------------------------------------------------------
  function cihazBaslik(B, c, sorgu, W, ozetSatir) {
    var IK = 56, x0 = MARJ + 4, tx = x0 + IK + 12, maksW = Math.max(120, W - MARJ - tx);
    var turAd = (D.TURLER[c.cihazTur] || D.TURLER.diger).ad;
    var kod = c.kod || '';
    var ad = c.kisaAd || c.adTr || c.adDe || null;
    var kodW = B.parcaGen(B.parcala(kod), 'kb');
    var altta = kodW > maksW;   // uzun kod (büyük yazı ayarında) simgenin yanına sığmaz: altına, tam genişliğe iner (kısaltılmaz)
    var kodX = altta ? x0 : tx, ustW = altta ? W - MARJ - x0 : maksW;
    var adS = ad ? B.sar(ad, 'g', ustW, 2) : null;
    var rz = [];
    if (sorgu && sorgu.supheli) rz.push(I.rozet(B, 'supheli'));
    var rs = rz.length ? I.rozetSirasi(B, rz, ustW) : null;
    var y = 0, eY = y; y += B.satir('e');
    if (altta) y = Math.max(y, IK) + 4;
    var kY = y; y += B.satir('kb');
    var aY = null; if (adS) { y += 2; aY = y; y += adS.satirlar.length * B.satir('g'); }
    var sY = null; if (ozetSatir) { y += 2; sY = y; y += B.satir('i'); }
    var rY = null; if (rs) { y += 6; rY = y; y += rs.h; }
    var h = Math.max(IK, y);
    return {
      h: Math.ceil(h),
      ciz: function (g, oy) {
        B.turIkon(g, D.TURLER[c.cihazTur] ? c.cihazTur : 'diger', x0, oy, IK);
        B.yazi(g, tx, oy + eY + B.satir('e') / 2, turAd, 'e');
        B.yaziCiz(g, kodX, oy + kY + B.satir('kb') / 2, kod, 'kb');
        if (adS) adS.satirlar.forEach(function (t, i) { B.yazi(g, kodX, oy + aY + B.satir('g') * (i + 0.5), t, 'g'); });
        if (ozetSatir) B.yazi(g, kodX, oy + sY + B.satir('i') / 2, ozetSatir, 'i');
        if (rs) rs.ciz(g, kodX, oy + rY);
      }
    };
  }
  function araBaslik(B, soketAd, W) {
    var IK = 40, x0 = MARJ + 4, tx = x0 + IK + 12;
    var eH = B.satir('e'), kH = B.satir('kb'), h = Math.max(IK, eH + kH);
    return {
      h: h,
      ciz: function (g, oy) {
        B.turIkon(g, 'soket', x0, oy + (h - IK) / 2, IK);
        B.yazi(g, tx, oy + eH / 2, 'ARA SOKET', 'e');
        B.yaziCiz(g, tx, oy + eH + kH / 2, soketAd, 'kb');
      }
    };
  }

  /** Soket başlık bandı (DESIGN §8): ≥ 48 px, --yuzey-ust, üst/alt 2 px çizgi; solda soket simgesi + ad, sağda "N pin"
      (yazı büyüyüp sığmazsa "N pin" adın altına iner). */
  function bandKur(B, grup, W) {
    var H1 = Math.max(48, B.satir('p') + 14), ad = grup.soket != null ? grup.soket : 'SOKETSİZ UÇLAR';
    var n = grup.satirlar.length;
    var sag = n + (grup.pinSayisi ? ' / ' + grup.pinSayisi : '') + ' pin';
    var sagW = B.gen(sag, 'i');
    var solX = MARJ + 4 + (grup.soket != null ? 32 : 0);
    var solW = B.parcaGen(B.parcala(ad), grup.soket != null ? 'p' : 'e');
    var geriVar = !!(B.o.onSoket && grup.soket != null);
    var sagGeri = geriVar ? 28 : 0;
    var alta = solX + solW + 16 + sagW + MARJ + 8 + sagGeri > W;
    var H = alta ? H1 + B.satir('i') + 6 : H1;
    return {
      h: H, ad: ad,
      ciz: function (g, oy) {
        var gb = B.dokun(g, 'soket', grup.soket, grup, { x: 0, y: oy, w: W, h: H }, 'Soket ' + grup.soket + ' sorgusunu aç');
        var kg = el('g', { class: 'dy-halo-ust' }, gb);
        el('rect', { class: 'dy-bant', x: 0, y: r(oy), width: W, height: H }, kg);
        el('line', { class: 'dy-bant-cizgi', x1: 0, y1: r(oy) + 1, x2: W, y2: r(oy) + 1 }, kg);
        el('line', { class: 'dy-bant-cizgi', x1: 0, y1: r(oy) + H - 1, x2: W, y2: r(oy) + H - 1 }, kg);
        if (grup.soket != null) B.ikon(kg, 'i-soket', MARJ + 4, oy + (H1 - 24) / 2, 24, 'ik-yazi');
        B.yaziCiz(kg, solX, oy + H1 / 2, ad, grup.soket != null ? 'p' : 'e');
        if (alta) B.yazi(kg, solX, oy + H1 - 4 + B.satir('i') / 2, sag, 'i', 'dy-yz2');
        else B.yazi(kg, W - MARJ - 8 - sagGeri, oy + H1 / 2, sag, 'i', 'dy-yz2', 'end');
        if (geriVar && gb !== g) B.ikon(kg, 'i-sag', W - MARJ - 8 - 20, oy + H1 / 2 - 10, 20, 'ik-yz2');
        B.odakHalka(gb === g ? null : gb);
        return gb;
      }
    };
  }

  /** Bir grup (soket) için satır sahneleri. Yatay modda her satır sığarsa yatay, sığmazsa dikey (satır başına karar). */
  function grupSatirlari(B, grup, W, cihazKod, mod) {
    var satirlar = [], telMin = 0, pinMin = 0;
    if (mod === 'yatay') {
      grup.satirlar.forEach(function (s) {
        var m = pinOlc(B, s);
        pinMin = Math.max(pinMin, Math.max(m.boxW + (m.adVar ? 10 + m.adW : 0), m.donen ? m.donen.w : 0) + 8);
        (s.kablolar || []).forEach(function (kb) { var c = I.cip(B, kb.kenar, { maksW: 300, ic: kb.kenar.ic === true }); telMin = Math.max(telMin, c.w + 32); });
      });
    }
    for (var i = 0; i < grup.satirlar.length; i++) {
      var sahne = null;
      if (mod === 'yatay') sahne = I.yatayAgac(B, satirAgaci(B, grup.satirlar[i], cihazKod, pinMin), W, { telMin: telMin, kendiKablo: null });
      if (!sahne) sahne = I.dikeyAgac(B, satirAgaci(B, grup.satirlar[i], cihazKod, 0), W, { kendiKablo: null });
      satirlar.push(sahne);
    }
    return satirlar;
  }

  /** Ortak: başlık(lar) + gruplar. basliklar: [{h, ciz(g, oy)}], gruplar: [{ grup, cihazKod }]. */
  function sorguSahnesi(B, basliklar, gruplar, secenek) {
    var W = B.W;
    var mod = secenek.yerlesim === 'yatay' ? 'yatay' : secenek.yerlesim === 'dikey' ? 'dikey' : (W > 480 ? 'yatay' : 'dikey');
    var hazir = gruplar.map(function (gr) { return grupSatirlari(B, gr.grup, W, gr.cihazKod, mod); });

    var y = 8, adimlar = [], bantlar = [];
    basliklar.forEach(function (b) {
      if (b.araBosluk) { y += b.araBosluk; return; }
      adimlar.push({ tur: 'baslik', y: y, p: b }); y += b.h + 12;
    });
    gruplar.forEach(function (gr, gi) {
      if (gr.baslik) { adimlar.push({ tur: 'baslik', y: y, p: gr.baslik }); y += gr.baslik.h + 12; }
      var band = bandKur(B, gr.grup, W);
      var bandY = y;
      y += band.h;
      var satirlar = hazir[gi];
      var satirAdimlari = [];
      satirlar.forEach(function (s, si) {
        y += 12;
        satirAdimlari.push({ y: y, s: s });
        y += s.h + 12;
        if (si < satirlar.length - 1) { satirAdimlari[satirAdimlari.length - 1].ayrac = y - 6; }
      });
      if (!satirlar.length) y += 8;
      adimlar.push({ tur: 'grup', bandY: bandY, band: band, satirlar: satirAdimlari, bitis: y, idx: bantlar.length });
      bantlar.push({ y0: bandY, y1: y, h: band.h });
      y += 8;
    });
    var h = Math.ceil(y);
    return {
      w: W, h: h, yerlesim: mod, bantlar: bantlar,
      ciz: function (g) {
        var bandGruplari = [];
        adimlar.forEach(function (a) {
          if (a.tur === 'baslik') { a.p.ciz(g, a.y); return; }
          // satırlar önce, bant en son (yapışınca üstte kalsın)
          a.satirlar.forEach(function (sa) {
            sa.s.ciz(g, 0, sa.y);
            if (sa.ayrac) el('line', { class: 'dy-ince', x1: MARJ, y1: r(sa.ayrac) + 0.5, x2: W - MARJ, y2: r(sa.ayrac) + 0.5 }, g);
          });
        });
        adimlar.forEach(function (a) {
          if (a.tur !== 'grup') return;
          var kapGrup = el('g', { class: 'dy-bant-grup' }, g);
          a.band.ciz(kapGrup, a.bandY);
          bandGruplari.push({ g: kapGrup, y0: a.bandY, y1: a.bitis, h: a.band.h });
        });
        g._bantlar = bandGruplari;
      }
    };
  }

  // ---- dış: cihaz ve soket sahneleri ---------------------------------------------------------------------------------------------
  I.cihazSahne = function (B, sorgu, secenek) {
    var c = sorgu.cihaz;
    var pinler = 0;
    sorgu.soketler.forEach(function (g) { pinler += g.satirlar.length; });
    var ozet = sorgu.soketler.length + ' soket · ' + pinler + ' pin';
    var baslik = cihazBaslik(B, c, sorgu, B.W, ozet);
    var gruplar = sorgu.soketler.map(function (g) { return { grup: g, cihazKod: c.kod }; });
    return sorguSahnesi(B, [baslik], gruplar, secenek);
  };
  I.soketSahne = function (B, sorgu, secenek) {
    var basliklar = [], gruplar = [];
    sorgu.eslesmeler.forEach(function (e, i) {
      var grup = { soket: e.soket, pinSayisi: e.pinSayisi, satirlar: e.satirlar };
      var bas = e.cihaz ? cihazBaslik(B, e.cihaz, null, B.W, null) : araBaslik(B, e.soket, B.W);
      gruplar.push({ grup: grup, cihazKod: e.cihaz ? e.cihaz.kod : null, baslik: bas });
    });
    return sorguSahnesi(B, [], gruplar, secenek);
  };

  // ---- erişilebilirlik özeti ---------------------------------------------------------------------------------------------------
  function satirOzeti(s) {
    var p = 'pin ' + (s.pin != null ? s.pin : 'yazılı değil') + (s.pinAdi ? ' (' + s.pinAdi + ')' : '');
    var donen = s.kendineDonen && s.kendineDonen.length ? 'kendine dönen ' + donenAdlari(s.kendineDonen) : '';
    if (!s.kablolar || !s.kablolar.length) return p + (donen ? ': ' + donen : '');
    return s.kablolar.map(function (kb) {
      var k = kb.kenar;
      var hedef = (kb.varis && kb.varis.length ? kb.varis : [kb.karsiUc]).map(metinDugum).join(' ; ');
      var ustunden = (kb.gecisler || []).map(function (g) { return g.kod + ' (' + g.turAd + ')'; });
      return p + ': ' + (k.sanal ? 'geçiş bileşeninin içinden' : k.ic ? 'cihaz içi bağlantı' : (k.etiket != null ? 'kablo ' + k.etiket : 'numarasız kablo') + (k.soketIci ? ' (aynı soket içinde köprü)' : ''))
        + (ustunden.length ? ' (üzerinden ' + ustunden.join(', ') + ')' : '') + ' → ' + hedef + (k.supheli ? ' [şüpheli]' : '');
    }).concat(donen ? [p + ': ' + donen] : []).join('. ');
  }
  I.cihazOzeti = function (s) {
    var c = s.cihaz, t = ['Cihaz ' + (c.kisaAd ? c.kisaAd + ' (' + c.kod + ')' : c.kod) + ': ' + s.soketler.length + ' soket.'];
    s.soketler.forEach(function (g) {
      t.push('Soket ' + (g.soket != null ? g.soket : 'yok (soketsiz uçlar)') + ':');
      g.satirlar.forEach(function (sr) { t.push(satirOzeti(sr) + '.'); });
    });
    return t.join(' ');
  };
  I.soketOzeti = function (s) {
    var t = ['Soket ' + s.soket + ': ' + s.eslesmeler.length + ' eşleşme.'];
    s.eslesmeler.forEach(function (e) {
      t.push((e.cihaz ? 'Cihaz ' + (e.cihaz.kisaAd ? e.cihaz.kisaAd + ' (' + e.cihaz.kod + ')' : e.cihaz.kod) : 'Ara soket') + ':');
      e.satirlar.forEach(function (sr) { t.push(satirOzeti(sr) + '.'); });
    });
    return t.join(' ');
  };
})(typeof globalThis === 'object' ? globalThis : this);
