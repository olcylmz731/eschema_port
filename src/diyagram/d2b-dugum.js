/* d2b-dugum: düğüm (uç) içeriği ve iki görünümü: yatay KART (geniş ekran) ve dikey BLOK (dar ekran, omurga üstünde).
   İçerik (DESIGN §6, §8): tür işareti · tür etiketi · kod · ad · pin kapsülü · durum rozetleri · notlar. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el, r = I.r;

  function turAd(tur) { var t = D.TURLER[tur]; return t ? t.ad : D.TURLER.diger.ad; }

  function pinSpec(d) { return { soket: d.soket != null ? d.soket : null, pin: d.pin != null ? d.pin : null, pinAdi: d.pinAdi != null ? d.pinAdi : null, belirsiz: !!d.belirsiz, d: d }; }

  /** Kendine dönen kablo notları (iki ucu da aynı pin): düğümün yanında küçük not; soket tekrar yazılmaz. B.kMap: kenar id → kenar. */
  function donenNotlari(B, dugumler, notlar) {
    dugumler.forEach(function (x) {
      (x.kendineDonen || []).forEach(function (id) {
        var k = B.kMap ? B.kMap[id] : null;
        notlar.push(['KENDİNE DÖNEN', (k && k.etiket != null ? 'kablo ' + k.etiket : 'numarasız kablo') + (k && k.varyant ? ' (varyant)' : '') + ', iki ucu da bu pinde']);
      });
    });
  }

  /** Düğümün gösterilecek bilgisi (ölçüden bağımsız). o.gecis = { kenar (sanal, .bilesen), d0, d1 }: geçiş bileşeni (sigorta/diyot/direnç/şalter) tek öğe. */
  I.dugumBilgi = function (B, d, o) {
    o = o || {};
    var b = { d: d, ik: 'diger', etiket: '', kod: null, kodSinif: 'k', ad: null, kapsulSpec: null, pinCifti: null, notlar: [], tikla: null, odak: !!o.odak, hata: !!d.celiski, belirsiz: !!d.belirsiz, aria: '' };
    if (o.gecis) {
      var gc = o.gecis, bl = gc.kenar.bilesen, t0 = gc.d0, t1 = gc.d1;
      b.ik = D.TURLER[bl.tur] ? bl.tur : 'diger';
      b.kod = bl.kod; b.kodSinif = 'k'; b.ad = bl.kisaAd || bl.adTr || bl.adDe || null;
      if (o.kisa) b.ad = null;
      if (t0 && t1 && (t0.pin != null || t1.pin != null)) b.pinCifti = [pinSpec(t0), pinSpec(t1)];
      b.tikla = { eylem: 'cihaz', deger: bl.kod };
      b.aria = 'Geçiş bileşeni ' + bl.kod + ' (' + (bl.turAd || turAd(b.ik)) + ') sorgusunu aç';
      var ts = [t0, t1].filter(Boolean);
      b.belirsiz = ts.some(function (x) { return x.belirsiz; });
      b.hata = ts.some(function (x) { return x.celiski; });
      b.etiket = turAd(b.ik);
      ts.forEach(function (x) {
        if (x.acik) b.notlar.push(['UCU AÇIK', 'öbür taraf şemada yok']);
        if (x.kesik) b.notlar.push(['KESİK', 'devamı gösterilmedi']);
      });
      if (b.hata) b.notlar.push(['ÇELİŞKİLİ', 'bu pinde farklı numaralı kablolar var']);
      donenNotlari(B, ts, b.notlar);
      return b;
    }
    if (d.tur === 'cihaz') {
      b.ik = D.TURLER[d.cihazTur] ? d.cihazTur : 'diger';
      b.kod = d.cihaz; b.ad = d.kisaAd || d.adTr || d.adDe || null;
      b.kapsulSpec = { soket: d.soket, pin: d.pin, pinAdi: d.pinAdi, belirsiz: d.belirsiz };
      if (o.kisa) b.ad = null;
      if (d.cihaz) b.tikla = { eylem: 'cihaz', deger: d.cihaz };
      b.aria = 'Cihaz ' + d.cihaz + (b.ad ? ', ' + b.ad : '') + ' sorgusunu aç';
    } else if (d.tur === 'soket') {
      b.ik = 'soket'; b.kapsulSpec = { soket: d.soket, pin: d.pin, belirsiz: d.belirsiz };
      if (d.soket) b.tikla = { eylem: 'soket', deger: d.soket };
      b.aria = 'Soket ' + d.soket + ' sorgusunu aç';
    } else if (d.tur === 'dugum') {
      b.ik = 'dugum'; b.kod = d.kodsuz ? 'kodsuz' + (d.kodsuzNo ? ' ' + d.kodsuzNo : '') : d.kod; b.kodSinif = d.kodsuz ? 'i' : 'k';
    } else {
      b.ik = 'devam'; b.kod = d.hedefCihaz || d.hedef || null; b.ad = d.hedefCihazAd || null;
      if (d.sayfaIci) {
        // devam oku yalnız yol numarası gösteriyor: aynı sayfada devam eder (KB.metin: "devam: yol 74 (aynı sayfada devam ediyor)")
        b.kod = 'yol ' + d.hedef; b.kodSinif = 'k';
        b.notlar.push(['AYNI SAYFADA', 'devam ediyor']);
      } else {
        if (d.hedefCihaz) { b.tikla = { eylem: 'cihaz', deger: d.hedefCihaz }; b.aria = 'Cihaz ' + d.hedefCihaz + ' sorgusunu aç'; }
        if (d.hedefCihaz && d.hedef) b.notlar.push(['HEDEF', 'sayfa/yol ' + d.hedef]);
        b.notlar.push(d.cozuldu ? ['ŞEMA GEÇİŞİ', 'devamı bağlandı'] : ['BAŞKA ŞEMADA', 'verisi yok']);
      }
    }
    b.etiket = turAd(b.ik);
    if (d.acik) b.notlar.push(['UCU AÇIK', 'öbür taraf şemada yok']);
    if (d.kesik) b.notlar.push(['KESİK', 'devamı gösterilmedi']);
    if (d.celiski) b.notlar.push(['ÇELİŞKİLİ', 'bu pinde farklı numaralı kablolar var']);
    donenNotlari(B, [d], b.notlar);
    return b;
  };

  /** Geçiş bileşeninin iki ucu: [soket │ pin] – [soket │ pin]. Sığmazsa alt alta. specler: [pinSpec, pinSpec]. */
  I.pinCifti = function (B, specler, maksW) {
    var GAP = 20, ARA = 8, KH = 44;
    var kaplar = specler.map(function (s) {
      if (s.pin == null || s.pin === '') {
        var t = '(yazılı değil)', tw = Math.ceil(B.gen(t, 'i')), w = tw + 16;
        return {
          w: w, h: KH, bos: true, spec: s,
          ciz: function (g, x, y) {
            var gr = el('g', { class: 'dy-halo-ust' }, g);
            el('rect', { class: 'dy-kapsul-bos', x: r(x) + 1, y: r(y) + 1, width: w - 2, height: KH - 2, rx: 8 }, gr);
            B.yazi(gr, x + 8, y + KH / 2, t, 'i', 'dy-yz2');
          }
        };
      }
      var k = I.kapsul(B, { soket: s.soket, pin: s.pin, pinAdi: s.pinAdi, belirsiz: s.belirsiz }, maksW);
      k.spec = s;
      return k;
    });
    var yan = kaplar[0].w + GAP + kaplar[1].w <= maksW;
    var w = yan ? kaplar[0].w + GAP + kaplar[1].w : Math.max(kaplar[0].w, kaplar[1].w);
    var h = yan ? Math.max(kaplar[0].h, kaplar[1].h) : kaplar[0].h + ARA + kaplar[1].h;
    return {
      w: Math.ceil(w), h: Math.ceil(h), belirsiz: kaplar.some(function (k) { return k.belirsiz; }), eksik: false, cifti: true,
      ciz: function (g, x, y) {
        var cx = x, cy = y;
        kaplar.forEach(function (k, i) {
          if (i === 1) {
            if (yan) { I.bagCiz(g, [[cx + 2, y + h / 2], [cx + GAP - 2, y + h / 2]]); cx += GAP; } else { cy += kaplar[0].h + ARA; }
          }
          var ky = yan ? y + (h - k.h) / 2 : cy;
          var ref = k.spec && k.spec.d ? ucRef(k.spec.d) : null;
          var gp = B.dokun(g, 'uc', ref, k.spec ? k.spec.d : null, { x: cx, y: ky, w: k.w, h: k.h }, 'Pin ' + (k.spec && k.spec.pin != null ? k.spec.pin : '') + ' izini aç');
          k.ciz(gp, cx, ky);
          B.odakHalka(gp === g ? null : gp);
          if (yan) cx += k.w;
        });
      }
    };
  };

  // ---- ortak: not satırları (etiket kalın + açıklama) ------------------------------------------------------
  function notSatirlari(B, notlar, maksW) {
    var satirlar = [];
    notlar.forEach(function (n) {
      var yaz = n[0] + ' · ' + n[1];
      var s = B.sar(yaz, 'i', maksW, 3);
      s.satirlar.forEach(function (t, i) { satirlar.push({ t: t, ilk: i === 0, bas: n[0] }); });
    });
    return satirlar;
  }
  function notCiz(B, g, satirlar, x, y) {
    var lh = B.satir('i');
    satirlar.forEach(function (s, i) { B.yazi(g, x, y + lh * (i + 0.5), s.t, 'i', 'dy-yz2'); });
  }

  function rozetListesi(B, b) {
    var l = [];
    if (b.odak) l.push(I.rozet(B, 'sorgu'));
    if (b.hata) l.push(I.rozet(B, 'hata'));
    return l;
  }

  // ---- yatay KART ------------------------------------------------------------------------------------------
  /** o: { odak, taraf: 'sol'|'sag'|'orta' (kapsülün hizası), kok }. Dönen: {w,h,telY,ciz(g,x,y)}. */
  I.kartYatay = function (B, d, o) {
    o = o || {};
    var b = I.dugumBilgi(B, d, o), PAD = 10, IK = 40, KALIN = (b.ik === 'beyin' || b.odak || b.hata) ? 3 : 2;
    var kap = b.pinCifti ? I.pinCifti(B, b.pinCifti, 250) : (b.kapsulSpec ? I.kapsul(B, b.kapsulSpec, 250) : null);
    var geriVar = b.tikla && B.o[{ cihaz: 'onCihaz', soket: 'onSoket' }[b.tikla.eylem]];
    var etW = B.gen(b.etiket, 'e'), kodW = b.kod ? B.parcaGen(B.parcala(b.kod), b.kodSinif) : 0;
    var baslikW = IK + 8 + Math.max(etW, kodW) + (geriVar ? 8 + 20 : 0);
    var icW0 = Math.max(baslikW, kap ? kap.w : 0, 150);
    var ad = b.ad ? B.sar(b.ad, 'g', Math.min(Math.max(icW0, 190), 250), 3) : null;
    var icW = Math.max(icW0, ad ? ad.w : 0);
    var kapW = kap ? kap.w : 0;
    var notlar = notSatirlari(B, b.notlar, icW);
    var rozetler = rozetListesi(B, b), rs = rozetler.length ? I.rozetSirasi(B, rozetler, icW) : null;
    var sup = (b.belirsiz && !(kap && kap.eksik)) ? I.rozetSirasi(B, [I.rozet(B, 'supheli')], icW) : null;

    var y = PAD + 2;
    var rsY = null; if (rs) { rsY = y; y += rs.h + 6; }
    var basY = y; var basH = Math.max(IK, B.satir('e') + (b.kod ? B.satir(b.kodSinif) : 0)); y += basH + 6;
    var adY = null; if (ad) { adY = y; y += ad.satirlar.length * B.satir('g') + 6; }
    var kapY = null; if (kap) { kapY = y; y += kap.h + 6; }
    var supY = null; if (sup) { supY = y; y += sup.h + 6; }
    var notY = null; if (notlar.length) { notY = y; y += notlar.length * B.satir('i') + 6; }
    var h = Math.ceil(y - 6 + PAD + 2);
    var w = Math.ceil(icW + 2 * PAD + 4);
    var telY = (kap && !b.pinCifti) ? kapY + Math.min(22, kap.h / 2) : basY + IK / 2;
    var haloSinif = b.odak ? 'dy-halo-secili' : '';
    return {
      w: w, h: h, telY: telY, kapY: kapY, d: d,
      ciz: function (g, x, y0) {
        var gk = b.tikla ? B.dokun(g, b.tikla.eylem, b.tikla.deger, d, { x: x, y: y0, w: w, h: h }, b.aria) : g;
        var kg = el('g', { class: haloSinif }, gk);
        var sinif = 'dy-kart' + (b.odak ? ' dy-kart-odak' : b.hata ? ' dy-kart-hata' : b.ik === 'beyin' ? ' dy-kart-beyin' : '');
        el('rect', { class: sinif, x: r(x) + KALIN / 2, y: r(y0) + KALIN / 2, width: w - KALIN, height: h - KALIN, rx: 8 }, kg);
        var cx = x + PAD + 2;
        if (rs) rs.ciz(kg, cx, y0 + rsY);
        B.turIkon(kg, b.ik, cx, y0 + basY, IK);
        var tx = cx + IK + 8;
        if (b.kod) {
          B.yazi(kg, tx, y0 + basY + B.satir('e') / 2 + 1, b.etiket, 'e');
          B.yaziCiz(kg, tx, y0 + basY + B.satir('e') + B.satir(b.kodSinif) / 2, b.kod, b.kodSinif, b.kodSinif === 'i' ? 'dy-yz2' : '');
        } else {
          B.yazi(kg, tx, y0 + basY + IK / 2, b.etiket, 'e');
        }
        if (geriVar) B.ikon(kg, 'i-sag', x + w - PAD - 2 - 20, y0 + basY + (IK - 20) / 2, 20, 'ik-yz2');
        if (ad) ad.satirlar.forEach(function (t, i) { B.yazi(kg, cx, y0 + adY + B.satir('g') * (i + 0.5), t, 'g'); });
        if (ad && ad.kesildi) { var tt = el('title', null, kg); tt.textContent = b.ad; }   // kısaltılan ad: tam metin ipucu
        if (kap && b.pinCifti) {
          kap.ciz(kg, cx, y0 + kapY);
        } else if (kap) {
          var kx = o.taraf === 'sag' ? x + w - PAD - 2 - kapW : o.taraf === 'orta' ? x + (w - kapW) / 2 : cx;
          var gp = B.dokun(kg, 'uc', b.d.tur === 'cihaz' || b.d.tur === 'soket' ? ucRef(b.d) : null, d, { x: kx, y: y0 + kapY, w: kapW, h: kap.h }, 'Pin ' + (b.d.pin || '') + ' izini aç');
          kap.ciz(gp, kx, y0 + kapY);
          B.odakHalka(gp);
        }
        if (sup) sup.ciz(kg, cx, y0 + supY);
        if (notlar.length) notCiz(B, kg, notlar, cx, y0 + notY);
        B.odakHalka(gk === g ? null : gk);
      }
    };
  };

  /** KB.izle.uc'a verilecek başvuru. Pin yoksa null (dokunulamaz). */
  function ucRef(d) {
    if (d.pin == null || String(d.pin).indexOf('?') >= 0) return null;
    if (d.tur === 'cihaz') return d.cihaz ? { cihaz: d.cihaz, soket: d.soket != null ? d.soket : null, pin: d.pin } : null;
    return d.soket ? { soket: d.soket, pin: d.pin } : null;
  }
  I.ucRef = ucRef;

  // ---- dikey BLOK -------------------------------------------------------------------------------------------
  /** o: { spineX, xMetin, maksW, odak }. Dönen: {h, ikonY, ciz(g, y), kutu(y)}.  İşaret omurga üstünde (spineX ortalı, 40 px). */
  I.blokDikey = function (B, d, o) {
    var b = I.dugumBilgi(B, d, o), IK = 40, GAP = 4;
    var kap = b.pinCifti ? I.pinCifti(B, b.pinCifti, o.maksW) : (b.kapsulSpec ? I.kapsul(B, b.kapsulSpec, o.maksW) : null);
    var geriVar = b.tikla && B.o[{ cihaz: 'onCihaz', soket: 'onSoket' }[b.tikla.eylem]];
    var ad = b.ad ? B.sar(b.ad, 'g', o.maksW, 3) : null;
    var notlar = notSatirlari(B, b.notlar, o.maksW);
    var rozetler = rozetListesi(B, b), rs = rozetler.length ? I.rozetSirasi(B, rozetler, o.maksW) : null;
    var sup = (b.belirsiz && !(kap && kap.eksik)) ? I.rozetSirasi(B, [I.rozet(B, 'supheli')], o.maksW) : null;
    var lE = B.satir('e'), lK = b.kod ? B.satir(b.kodSinif) : 0, lG = B.satir('g'), lI = B.satir('i');

    var y = 0, rsY = null, etY, kodY = null, adY = null, kapY = null, supY = null, notY = null;
    if (rs) { rsY = y; y += rs.h + GAP; }
    etY = y; y += lE;
    if (b.kod) { kodY = y; y += lK; }
    if (ad) { y += GAP; adY = y; y += ad.satirlar.length * lG; }
    if (kap) { y += GAP + 2; kapY = y; y += kap.h; }
    if (sup) { y += GAP; supY = y; y += sup.h; }
    if (notlar.length) { y += GAP; notY = y; y += notlar.length * lI; }
    var icY = (rsY != null ? rs.h + GAP : 0);   // işaret etiket satırıyla aynı hizada başlar
    var h = Math.max(y, icY + IK);
    return {
      h: Math.ceil(h), ikonY: icY + IK / 2, d: d, kapY: kapY,
      ciz: function (g, y0) {
        var kutu = { x: o.spineX - 24, y: y0, w: (o.xMetin + o.maksW) - (o.spineX - 24) + 4, h: Math.ceil(h) };
        var gk = b.tikla ? B.dokun(g, b.tikla.eylem, b.tikla.deger, d, kutu, b.aria) : g;
        var kg = el('g', { class: b.odak ? 'dy-halo-secili' : '' }, gk);
        if (b.odak) el('rect', { class: 'dy-kart dy-kart-odak', x: r(kutu.x) + 1.5, y: r(y0 - 4) + 1.5, width: kutu.w - 3, height: Math.ceil(h) + 8 - 3, rx: 8 }, kg);
        if (rs) rs.ciz(kg, o.xMetin, y0 + rsY);
        B.turIkon(kg, b.ik, o.spineX - IK / 2, y0 + icY, IK);
        B.yazi(kg, o.xMetin, y0 + etY + lE / 2, b.etiket, 'e');
        if (b.kod) B.yaziCiz(kg, o.xMetin, y0 + kodY + lK / 2, b.kod, b.kodSinif, b.kodSinif === 'i' ? 'dy-yz2' : '');
        if (geriVar) B.ikon(kg, 'i-sag', o.xMetin + o.maksW - 20, y0 + etY + (lE + lK) / 2 - 10, 20, 'ik-yz2');
        if (ad) ad.satirlar.forEach(function (t, i) { B.yazi(kg, o.xMetin, y0 + adY + lG * (i + 0.5), t, 'g'); });
        if (ad && ad.kesildi) { var tt = el('title', null, kg); tt.textContent = b.ad; }
        if (kap && b.pinCifti) {
          kap.ciz(kg, o.xMetin, y0 + kapY);
        } else if (kap) {
          var gp = B.dokun(kg, 'uc', ucRef(b.d), d, { x: o.xMetin, y: y0 + kapY, w: kap.w, h: kap.h }, 'Pin ' + (b.d.pin || '') + ' izini aç');
          kap.ciz(gp, o.xMetin, y0 + kapY);
          B.odakHalka(gp);
        }
        if (sup) sup.ciz(kg, o.xMetin, y0 + supY);
        if (notlar.length) notCiz(B, kg, notlar, o.xMetin, y0 + notY);
        B.odakHalka(gk === g ? null : gk);
      }
    };
  };
})(typeof globalThis === 'object' ? globalThis : this);
