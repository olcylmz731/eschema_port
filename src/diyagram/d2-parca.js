/* d2-parca: çizimin parçaları. Hepsi {w, h, ciz(g, x, y)} döner (x,y sol-üst); ölçüm çizimden ayrıdır, çizim sonra yapılır.
   Rozet (DESIGN §9), pin kapsülü (§8), kablo etiket çipi (§7), düğüm içeriği (§6). */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el, r = I.r;

  // ---- rozet ----------------------------------------------------------------------------------------------
  var ROZET = {
    supheli: { yaz: 'ŞÜPHELİ', ikon: 'i-supheli', roz: 'dy-roz-supheli', yazi: 'dy-yz-supheli', halo: 'dy-halo-supheli', ik: 'ik-supheli' },
    hata: { yaz: 'ÇELİŞKİLİ', ikon: 'i-celiski', roz: 'dy-roz-hata', yazi: 'dy-yz-hata', halo: 'dy-halo-hata', ik: 'ik-hata' },
    varyant: { yaz: 'VARYANT', ikon: 'i-varyant', roz: 'dy-roz-varyant', yazi: '', halo: 'dy-halo-ust', ik: 'ik-yazi' },
    sorgu: { yaz: 'SORGULANAN', ikon: 'i-secili', roz: 'dy-roz-sorgu', yazi: 'dy-yz-sorgu', halo: 'dy-halo-sorgu', ik: 'ik-sorgu' }
  };
  /** Durum rozeti: simge (20) + büyük harfli yazı (14 kalın) + çerçeve. tur: supheli|hata|varyant|sorgu. */
  I.rozet = function (B, tur, yazi) {
    var t = ROZET[tur], yaz = yazi || t.yaz;
    var h = Math.max(28, B.satir('e') + 8), w = 6 + 20 + 4 + B.gen(yaz, 'e') + 8;
    return {
      w: Math.ceil(w), h: h, tur: tur,
      ciz: function (g, x, y) {
        var gr = el('g', { class: t.halo }, g);
        el('rect', { class: t.roz, x: r(x) + 1, y: r(y) + 1, width: Math.ceil(w) - 2, height: h - 2, rx: 4 }, gr);
        B.ikon(gr, t.ikon, x + 6, y + (h - 20) / 2, 20, t.ik);
        B.yazi(gr, x + 6 + 20 + 4, y + h / 2, yaz, 'e', t.yazi);
      }
    };
  };
  /** Rozetleri satırlara diz (maksW'ye sığacak biçimde). Dönen: {w, h, ciz}. */
  I.rozetSirasi = function (B, rozetler, maksW) {
    if (!rozetler.length) return { w: 0, h: 0, ciz: function () {} };
    var satirlar = [[]], cur = 0, w = 0, GAP = 4;
    rozetler.forEach(function (z) {
      var s = satirlar[satirlar.length - 1];
      if (cur && cur + GAP + z.w > maksW) { satirlar.push([]); s = satirlar[satirlar.length - 1]; cur = 0; }
      cur += (cur ? GAP : 0) + z.w; s.push(z);
      if (cur > w) w = cur;
    });
    var rh = rozetler[0].h;
    var h = satirlar.length * rh + (satirlar.length - 1) * GAP;
    return {
      w: w, h: h,
      ciz: function (g, x, y) {
        satirlar.forEach(function (s, i) {
          var cx = x;
          s.forEach(function (z) { z.ciz(g, cx, y + i * (rh + GAP)); cx += z.w + GAP; });
        });
      }
    };
  };

  // ---- pin kapsülü (DESIGN §8) ------------------------------------------------------------------------------
  /** s: { soket, pin, pinAdi, belirsiz }. Soket yoksa yalnız pin kutusu; ikisi de yoksa "soket/pin şemada yazılı değil". */
  I.kapsul = function (B, s, maksW) {
    var KH = Math.max(44, B.satir('k') + 12), PH = KH - 12, PADL = 8, GAP = 10, SATIR2 = Math.max(30, B.satir('pa') + 6);
    var soketVar = s.soket != null && s.soket !== '', pinVar = s.pin != null && s.pin !== '', adVar = s.pinAdi != null && s.pinAdi !== '';
    var belirsiz = !!s.belirsiz || (soketVar && String(s.soket).indexOf('?') >= 0) || (pinVar && String(s.pin).indexOf('?') >= 0) || (adVar && String(s.pinAdi).indexOf('?') >= 0);

    // hiçbiri yok: şemada yazmıyor
    if (!soketVar && !pinVar) {
      var yaz = B.sar('soket/pin şemada yazılı değil', 'g', Math.max(80, maksW - 2 * PADL - 4), 3);
      var hh = yaz.satirlar.length * B.satir('g') + 14, ww = Math.ceil(yaz.w) + 2 * PADL + 4;
      return {
        w: ww, h: hh, belirsiz: false, eksik: true,
        ciz: function (g, x, y) {
          var gr = el('g', { class: 'dy-halo-ust' }, g);
          el('rect', { class: 'dy-kapsul-bos', x: r(x) + 1, y: r(y) + 1, width: ww - 2, height: hh - 2, rx: 8 }, gr);
          yaz.satirlar.forEach(function (t, i) { B.yazi(gr, x + PADL + 2, y + 7 + B.satir('g') * (i + 0.5), t, 'g', 'dy-yz2'); });
        }
      };
    }

    var soketW = soketVar ? 20 + 4 + B.parcaGen(B.parcala(s.soket), 'p') : 0;
    var pinTxtW = pinVar ? B.parcaGen(B.parcala(s.pin), 'k') : 0;
    var pinW = pinVar ? Math.max(32, Math.ceil(pinTxtW) + 16) : 0;
    var pinYokW = !pinVar ? B.gen('pin şemada yazılı değil', 'g') : 0;
    var adW = adVar ? B.parcaGen(B.parcala(s.pinAdi), 'pa') : 0;

    var satir1 = PADL + soketW + (soketVar && (pinVar || !pinVar) ? GAP : 0) + (pinVar ? pinW : pinYokW);
    var iki = false, topW;
    topW = satir1 + (adVar ? GAP + adW : 0) + GAP;
    if (adVar && topW > maksW) iki = true;
    var w = iki ? Math.max(satir1 + GAP, PADL + adW + GAP) : topW;
    var h = KH + (iki ? SATIR2 : 0);
    w = Math.ceil(w);
    if (!soketVar && pinVar) w = Math.max(w, 52);
    return {
      w: w, h: h, belirsiz: belirsiz, eksik: false, iki: iki,
      ciz: function (g, x, y) {
        var gr = el('g', { class: 'dy-halo-ust' }, g);
        el('rect', { class: 'dy-kapsul', x: r(x) + 1, y: r(y) + 1, width: w - 2, height: h - 2, rx: 8 }, gr);
        var cy = y + KH / 2, cx = x + PADL;
        if (soketVar) {
          B.ikon(gr, 'i-soket', cx, cy - 10, 20, 'ik-yazi');
          cx += 24;
          cx += B.yaziCiz(gr, cx, cy, s.soket, 'p');
          cx += GAP;
        }
        if (pinVar) {
          el('rect', { class: 'dy-pinkutu', x: r(cx), y: r(cy - PH / 2), width: pinW, height: PH, rx: 4 }, gr);
          // pin numarası ters renkli kutuda
          var tx = cx + (pinW - pinTxtW) / 2;
          var kutu = el('g', null, gr);
          B.yaziCiz(kutu, tx, cy, s.pin, 'k', 'dy-ters');
          cx += pinW + GAP;
        } else {
          B.yazi(gr, cx, cy, 'pin şemada yazılı değil', 'g', 'dy-yz2');
          cx += pinYokW + GAP;
        }
        if (adVar) {
          if (iki) B.yaziCiz(gr, x + PADL, y + KH + SATIR2 / 2 - 6, s.pinAdi, 'pa');
          else B.yaziCiz(gr, cx, cy, s.pinAdi, 'pa');
        }
      }
    };
  };

  // ---- kablo etiket çipi (DESIGN §7) --------------------------------------------------------------------------
  /** Kenar için çip. o: { maksW, ic }. Çip: durum rengi + (rozetler) + kablo no + renk şeridi/kesit + not bandı. */
  I.cip = function (B, kenar, o) {
    o = o || {};
    var maksW = o.maksW || 300, PAD = 8, GAP = 4;
    var supheli = !!kenar.supheli, hata = !!kenar.celiski && !supheli;
    var yazSinif = supheli ? 'dy-yz-supheli' : hata ? 'dy-yz-hata' : '';
    var haloSinif = supheli ? 'dy-halo-supheli' : hata ? 'dy-halo-hata' : 'dy-halo-ust';
    var cipSinif = supheli ? 'dy-cip-supheli' : hata ? 'dy-cip-hata' : 'dy-cip';
    var icW = maksW - 2 * PAD - 4 - ((supheli || hata) ? 2 : 0);   // toplam genişlik maksW'yi aşmasın
    var BH = Math.max(24, B.satir('p') + 4), NH = Math.max(28, B.satir('i') + 8);   // satır yükseklikleri yazı boyutuyla büyür
    var satirlar = [];   // { w, h, ciz(g, x, y) }

    if (o.ic || kenar.ic === true || kenar.sanal === true) {
      // cihaz içi bağlantı / geçiş bileşeninin içi: kablo değil (API.md §7.1)
      var yic = kenar.sanal === true ? 'GEÇİŞ BİLEŞENİ' : 'CİHAZ İÇİ BAĞLANTI';
      var sy = B.sar(yic, 'e', Math.max(60, icW - 24), 3), lh = B.satir('e'), yh = Math.max(24, sy.satirlar.length * lh);
      satirlar.push({
        w: 24 + sy.w, h: yh,
        ciz: function (g, x, y) {
          B.ikon(g, 'd-ic', x, y + (yh - 20) / 2, 20, 'ik-yz2');
          sy.satirlar.forEach(function (t, i) { B.yazi(g, x + 24, y + (yh - sy.satirlar.length * lh) / 2 + lh * (i + 0.5), t, 'e', yazSinif); });
        }
      });
      satirlar.push({ w: B.gen('kablo değil', 'i'), h: B.satir('i'), ciz: function (g, x, y) { B.yazi(g, x, y + B.satir('i') / 2, 'kablo değil', 'i', yazSinif); } });
    } else {
      // 1) rozetler
      var rozetler = [];
      if (kenar.supheli) rozetler.push(I.rozet(B, 'supheli'));
      if (kenar.celiski) rozetler.push(I.rozet(B, 'hata'));
      if (kenar.varyant) rozetler.push(I.rozet(B, 'varyant'));
      if (rozetler.length) satirlar.push(I.rozetSirasi(B, rozetler, icW));
      // 2) kablo no
      var etk = kenar.etiket != null ? kenar.etiket : null;
      if (etk != null) {
        var etkW = B.parcaGen(B.parcala(etk), 'k');
        // numara kısaltılmaz; çipe sığmayacak kadar uzunsa (büyük yazı ayarı) satırlara bölünür, bilgi kaybolmaz
        var etkS = etkW > icW ? B.sar(etk, 'k', icW, 3).satirlar : [etk];
        etkS.forEach(function (t) {
          satirlar.push({ w: B.parcaGen(B.parcala(t), 'k'), h: B.satir('k'), ciz: function (g, x, y) { B.yaziCiz(g, x, y + B.satir('k') / 2, t, 'k', yazSinif); } });
        });
        var digerleri = (kenar.etiketler || []).filter(function (e) { return e !== etk; });
        if (digerleri.length) {
          var dm = '= ' + digerleri.join(' · ');
          satirlar.push({ w: B.gen(dm, 'ki'), h: B.satir('ki'), ciz: function (g, x, y) { B.yazi(g, x, y + B.satir('ki') / 2, dm, 'ki', yazSinif || 'dy-yz2'); } });
        }
      } else {
        satirlar.push({ w: B.gen('numarasız', 'i'), h: B.satir('i'), ciz: function (g, x, y) { B.yazi(g, x, y + B.satir('i') / 2, 'numarasız', 'i', yazSinif); } });
      }
      // 2b) aynı soketin iki pini arasındaki köprü (çekirdek: kenar.soketIci): normal kablo, ama yazıyla belirtilir (KB.metin ile aynı)
      if (kenar.soketIci === true) {
        var ks = B.sar('aynı soket içinde köprü', 'i', icW, 2), lhi = B.satir('i');
        satirlar.push({ w: ks.w, h: ks.satirlar.length * lhi, ciz: function (g, x, y) { ks.satirlar.forEach(function (t, i) { B.yazi(g, x, y + lhi * (i + 0.5), t, 'i', yazSinif || 'dy-yz2'); }); } });
      }
      // 3) kendi rengi + kendi kesiti
      var rr = I.kenarRenk(kenar);
      var birimler = [];
      if (rr.kendi && kenar.renk) {
        var tanin = rr.parcalar.filter(function (p) { return I.renkTokenVar(p.kisaltma); });
        var kisaltma = kenar.renk, kW = B.gen(kisaltma, 'p');
        var tumTanin = rr.parcalar.length > 0 && tanin.length === rr.parcalar.length;
        birimler.push({
          w: 36 + 6 + kW, h: BH,
          ciz: function (g, x, y) {
            var boya;
            if (tumTanin && tanin.length >= 2) boya = B.desen(tanin[0].kisaltma, tanin[1].kisaltma);
            else if (tumTanin && tanin.length === 1) boya = 'var(--kablo-' + tanin[0].kisaltma + ')';
            else boya = null;
            el('rect', { class: 'dy-serit' + (boya ? '' : ' dy-serit-pasif'), x: r(x) + 1, y: r(y + BH / 2 - 7) + 1, width: 34, height: 12, rx: 6, style: boya ? 'fill:' + boya : null }, g);
            B.yazi(g, x + 42, y + BH / 2, kisaltma, 'p', yazSinif);
          }
        });
      }
      if (kenar.kesit != null && !kenar.kesitSemaNotu) {
        var km = kenar.kesitMetni || (String(kenar.kesit).replace('.', ',') + ' mm²');
        birimler.push({ w: B.gen(km, 'i'), h: BH, ciz: function (g, x, y) { B.yazi(g, x, y + BH / 2, km, 'i', yazSinif); } });
      }
      if (birimler.length) {
        // yan yana sığıyorsa tek satır, değilse alt alta
        var toplam = birimler.reduce(function (a, b) { return a + b.w; }, 0) + (birimler.length - 1) * 8;
        if (toplam <= icW) {
          satirlar.push({ w: toplam, h: BH, ciz: function (g, x, y) { var cx = x; birimler.forEach(function (b) { b.ciz(g, cx, y); cx += b.w + 8; }); } });
        } else {
          birimler.forEach(function (b) { satirlar.push(b); });
        }
      }
      // 4) şema notu bandı (renk/kesit kabloda yazmıyor): çizgi renklendirilmez
      var notParca = [];
      if (rr.not && kenar.renk) notParca.push(kenar.renk);
      if (kenar.kesit != null && kenar.kesitSemaNotu) notParca.push(kenar.kesitMetni || (String(kenar.kesit).replace('.', ',') + ' mm²'));
      if (notParca.length) {
        var nm = notParca.join(' · '), nW = B.gen(nm, 'i'), bw = Math.ceil(6 + 20 + 4 + nW + 6);
        satirlar.push({
          w: bw, h: NH,
          ciz: function (g, x, y) {
            var gr = el('g', { class: 'dy-halo-not' }, g);
            el('rect', { class: 'dy-roz-not', x: r(x) + 1, y: r(y) + 1, width: bw - 2, height: NH - 2, rx: 4 }, gr);
            B.ikon(gr, 'i-not', x + 6, y + (NH - 20) / 2, 20, 'ik-not');
            B.yazi(gr, x + 6 + 20 + 4, y + NH / 2, nm, 'i', 'dy-yz-not');
          }
        });
      }
      // 5) serbest not: tek satır (uzunsa … ile kesilir); tam metin metin özetinde / <title>'da
      if (kenar.not) {
        var nt = B.sar(String(kenar.not), 'i', icW - 36, 1);
        var ntM = nt.satirlar[0] || '';
        var ntBw = Math.ceil(6 + 20 + 4 + B.gen(ntM, 'i') + 6);
        satirlar.push({
          w: ntBw, h: NH, not: String(kenar.not),
          ciz: function (g, x, y) {
            var gr = el('g', { class: 'dy-halo-not' }, g);
            el('rect', { class: 'dy-roz-not', x: r(x) + 1, y: r(y) + 1, width: ntBw - 2, height: NH - 2, rx: 4 }, gr);
            B.ikon(gr, 'i-not', x + 6, y + (NH - 20) / 2, 20, 'ik-not');
            B.yazi(gr, x + 6 + 20 + 4, y + NH / 2, ntM, 'i', 'dy-yz-not');
            var tt = el('title', null, gr); tt.textContent = 'Not: ' + kenar.not;
          }
        });
      }
    }

    var iw = 0, ih = 0;
    satirlar.forEach(function (s) { if (s.w > iw) iw = s.w; ih += s.h; });
    ih += (satirlar.length - 1) * GAP;
    var w = Math.ceil(iw + 2 * PAD + 4), h = Math.ceil(ih + 2 * PAD);
    if (supheli || hata) { w += 2; h += 2; }
    var ekPad = (supheli || hata) ? 1 : 0;
    return {
      w: w, h: h, supheli: supheli,
      ciz: function (g, x, y) {
        var gr = el('g', { class: haloSinif }, g);
        var kal = (supheli || hata) ? 3 : 2;
        el('rect', { class: cipSinif, x: r(x) + kal / 2, y: r(y) + kal / 2, width: w - kal, height: h - kal, rx: 4 }, gr);
        var cy = y + PAD + ekPad;
        satirlar.forEach(function (s) { s.ciz(gr, x + PAD + 2 + ekPad, cy); cy += s.h + GAP; });
      }
    };
  };
})(typeof globalThis === 'object' ? globalThis : this);
