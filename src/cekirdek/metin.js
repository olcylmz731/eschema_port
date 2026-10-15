/* metin: izden düz metin özeti.
   Biçim: "Kablo 9999 · Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10) → X99.1 pin 4 → Sahte Beyin 1 (99A01) soket 15 pin 5 (NHB)"
   Bir cihaza giden her uçta soket ve pin yazılır. Okunamayan değer '?' kalır ve "[şüpheli]" eklenir.
   Geçiş bileşeni (sigorta/diyot/direnç/şalter) iki ucuyla TEK öğe olur: "… → X03.53 pin 4 → 01R02 (direnç) → X03.20 pin 3 → …",
   pinliyse "01V01 (diyot) pin 1–2". Cihaz içi köprü ok notunda: " →[cihaz içi]→ ". Kendine dönen kablo düğümün sonunda parantezle. DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.metin = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function norm(s) { return mod('normalize').norm(s); }
  function kabloAnahtari(s) { return mod('normalize').kabloAnahtari(s); }

  var VARSAYILAN_MAKS_SATIR = 40;

  // ---- tek düğüm -----------------------------------------------------------------------------------
  /** Cihaz ucunun soket/pin/pin adı kısmı: "soket IV-18 pin 10 (HS10)", "pin B+", "(soket/pin şemada yazılı değil)". */
  function adres(d) {
    var parcalar = [];
    if (d.soket != null) parcalar.push('soket ' + d.soket);
    if (d.pin != null) parcalar.push('pin ' + d.pin);
    var s = parcalar.join(' ');
    if (d.pin == null) s += (s ? ' ' : '') + '(' + (d.soket == null ? 'soket/pin' : 'pin') + ' şemada yazılı değil)';
    if (d.pinAdi != null) s += ' (' + d.pinAdi + ')';
    return s;
  }

  /** Bir düğümün metni: ad + soket/pin (+ pin adı) + işaretler. */
  function dugum(d) {
    var s;
    if (d.tur === 'cihaz') s = d.ad + ' ' + adres(d);
    else if (d.tur === 'soket') s = d.ad + ' ' + (d.pin != null ? 'pin ' + d.pin : '(pin şemada yazılı değil)');
    else if (d.tur === 'dugum') s = d.ad;
    else s = 'devam: ' + d.ad.replace(/^devam → /, '') + (d.cozuldu ? ' (şema geçişi)' : d.sayfaIci ? ' (aynı sayfada devam ediyor)' : ' (başka şemada, verisi yok)');
    if (d.acik) s += ' (öbür taraf şemada yok)';
    if (d.kesik) s += ' (devamı kesildi)';
    if (d.belirsiz) s += ' [şüpheli]';
    if (d.celiski) s += ' [çelişki]';
    return s;
  }

  // ---- kenar ---------------------------------------------------------------------------------------
  /** Özellik satırı: "9999 · beyaz (ws, şema notu) · 0,75 mm² (şema notu) · varyant · ŞÜPHELİ". */
  function kenar(k) {
    if (k.sanal) return bilesen(k.bilesen) + ' · geçiş bileşeni (kablo değil)';
    var p = [k.etiket != null ? k.etiket : 'etiketsiz'];
    if (k.ic) p.push('cihaz içi bağlantı (kablo değil)');
    if (k.renk != null) {
      var ad = k.renkAd && k.renkAd !== k.renk ? k.renkAd + ' (' + k.renk + (k.renkSemaNotu ? ', şema notu' : '') + ')'
        : k.renk + (k.renkSemaNotu ? ' (şema notu)' : '');
      p.push(ad);
    }
    if (k.kesit != null) p.push((k.kesitMetni || k.kesit + ' mm²') + (k.kesitSemaNotu ? ' (şema notu)' : ''));
    if (k.varyant) p.push('varyant');
    if (k.soketIci) p.push('aynı soket içinde köprü');
    if (k.kendineDonen) p.push('kendine dönen');
    if (k.supheli) p.push('ŞÜPHELİ');
    if (k.celiski) p.push('çelişki');
    if (k.not) p.push('not: ' + k.not);
    return p.join(' · ');
  }

  // ---- geçiş bileşeni ------------------------------------------------------------------------------
  /** Bileşen adı: "01R02 (direnç)"; kısa adı varsa "Ana sigorta (41F01, sigorta)". b: Kenar.bilesen */
  function bilesen(b) {
    return b.kisaAd ? b.kisaAd + ' (' + b.kod + ', ' + b.turAd + ')' : b.kod + ' (' + b.turAd + ')';
  }

  /** İki ucuyla tek öğe: "01V01 (diyot) pin 1–2", "01R02 (direnç)". d0: yolda önce gelen uç. */
  function gecis(d0, d1, k) {
    var s = bilesen(k.bilesen);
    if (d0.pin != null || d1.pin != null) {
      var pin = function (d) { return d.pin != null ? d.pin : '(yazılı değil)'; };
      if (d0.soket === d1.soket) s += (d0.soket != null ? ' soket ' + d0.soket : '') + ' pin ' + pin(d0) + '–' + pin(d1);
      else s += ' ' + adres(d0) + ' – ' + adres(d1);   // iki terminal farklı soketlerde (nadir)
    }
    var adlar = [];
    [d0.pinAdi, d1.pinAdi].forEach(function (x) { if (x != null && adlar.indexOf(x) < 0) adlar.push(x); });
    if (adlar.length) s += ' (' + adlar.join('/') + ')';
    if (d0.kesik || d1.kesik) s += ' (devamı kesildi)';
    if (d0.belirsiz || d1.belirsiz) s += ' [şüpheli]';
    if (d0.celiski || d1.celiski) s += ' [çelişki]';
    return s;
  }

  /** Kenarın kablo kimliği: numara varsa numara, yoksa etiket; ikisi de yoksa null. */
  function kenarAnahtari(k) {
    if (k.no != null) return kabloAnahtari(k.no);
    if (k.etiket != null) return 'etiket:' + norm(k.etiket);
    return null;
  }

  /** İki düğüm arasındaki ok. Kablo değişiyorsa ya da kenar varyant/şüpheliyse köşeli notla: " →[kablo 9998, varyant]→ ".
      (Çelişki düğümde "[çelişki]" olarak görünür; okta tekrarlanmaz.) */
  function ok(k, onceki) {
    var n = [];
    if (k.ic) n.push('cihaz içi');
    else if (kenarAnahtari(k) !== onceki) n.push('kablo ' + (k.etiket != null ? k.etiket : 'etiketsiz'));
    if (k.soketIci) n.push('aynı soket içinde köprü');
    if (k.varyant) n.push('varyant');
    if (k.supheli) n.push('şüpheli');
    return n.length ? ' →[' + n.join(', ') + ']→ ' : ' → ';
  }

  // ---- kaynak / uyarı --------------------------------------------------------------------------------
  /** "Sahte 1 stromlaufplan.pdf · sayfa 1 · yol 24 · satır A · DOĞRULANMADI" */
  function kaynak(k) {
    return (k.metin || k.semaAd || k.sema) + (k.dogrulandi ? '' : ' · DOĞRULANMADI');
  }

  var ONEM_ONEK = { hata: 'HATA: ', uyari: 'Uyarı: ', bilgi: 'Not: ' };
  function uyarilar(iz) {
    return iz.uyarilar.map(function (u) { return (ONEM_ONEK[u.onem] || '') + u.mesaj; });
  }
  function kaynaklar(iz) {
    return iz.kaynaklar.map(kaynak);
  }

  /** Kenar başına bir özellik satırı (aynı satır tekrarlanmaz). */
  function ozellikler(iz) {
    var goruldu = {}, cikti = [];
    iz.kenarlar.forEach(function (k) {
      if (k.sanal) return;   // geçiş bileşeni kablo değil: özet satırında adıyla geçer
      var s = kenar(k);
      if (!goruldu[s]) { goruldu[s] = true; cikti.push(s); }
    });
    return cikti;
  }

  // ---- ana özet ---------------------------------------------------------------------------------------
  /** Zincir (dallanmasız) için doğrusal ağaç: zincir[0] kök. */
  function zincirAgaci(b) {
    var son = null;
    for (var i = b.zincir.length - 1; i >= 0; i--) {
      son = { dugum: b.zincir[i], kenar: i === 0 ? null : b.zincirKenarlar[i - 1], cocuklar: son ? [son] : [] };
    }
    return son;
  }

  /** Metin ağacı: geçiş bileşeninin iki ucu (sanal kenarla bağlı) tek öğeye katlanır.
      öğe = { ds:[d] ya da [d0, d1], kenar: öğeye giren kenar|null, bilesen: sanal kenar|null, cocuklar:[öğe…] } */
  function ogeKur(a, dById, kById) {
    var oge = { ds: [dById[a.dugum]], kenar: a.kenar === null ? null : kById[a.kenar], bilesen: null, cocuklar: [] };
    var kalan = a.cocuklar.slice();
    for (var i = 0; i < kalan.length; i++) {
      var ke = kById[kalan[i].kenar];
      if (ke.sanal) {
        var es = kalan.splice(i, 1)[0];
        oge.bilesen = ke;
        oge.ds.push(dById[es.dugum]);
        kalan = kalan.concat(es.cocuklar);
        break;
      }
    }
    oge.cocuklar = kalan.map(function (c) { return ogeKur(c, dById, kById); });
    return oge;
  }

  /** Öğenin metni: düğüm (ya da katlanmış bileşen) + kendine dönen kabloların notu. */
  function ogeMetni(oge, kById) {
    var s = oge.bilesen ? gecis(oge.ds[0], oge.ds[1], oge.bilesen) : dugum(oge.ds[0]);
    var notlar = [];
    oge.ds.forEach(function (d) {
      (d.kendineDonen || []).forEach(function (id) {
        var k = kById[id];
        notlar.push('kendine dönen kablo ' + (k.etiket != null ? k.etiket : 'etiketsiz') + (k.varyant ? ', varyant' : ''));
      });
    });
    return notlar.length ? s + ' (' + notlar.join('; ') + ')' : s;
  }

  /** Cihaz içi köprüden sonra "önceki kablo" değişmez (köprü kablo değil). */
  function sonOnceki(k, onceki) {
    return k.ic ? onceki : kenarAnahtari(k);
  }

  function bilesenSatirlari(iz, b, dById, kById) {
    var ilk = null;
    if (iz.kablo) ilk = iz.kablo.anahtar;
    else {
      for (var i = 0; i < b.agac.cocuklar.length; i++) {
        var k0 = kById[b.agac.cocuklar[i].kenar];
        if (!k0.ic && !k0.sanal) { ilk = kenarAnahtari(k0); break; }
      }
    }

    // zincir: odak zincirin başındaysa (ya da odak yoksa) tek satır
    var zincirMi = b.zincir && (b.odak === null || b.odak === b.zincir[0]);
    var kok = ogeKur(zincirMi ? zincirAgaci(b) : b.agac, dById, kById);

    // ağaç: gövde tek satır, her dal girintili ayrı satır
    var satirlar = [];
    function kolYuru(oge, onceki2) {
      var metin = '', cur = oge;
      while (cur.cocuklar.length === 1) {
        var c = cur.cocuklar[0];
        metin += ok(c.kenar, onceki2) + ogeMetni(c, kById);
        onceki2 = sonOnceki(c.kenar, onceki2);
        cur = c;
      }
      return { metin: metin, son: cur, onceki: onceki2 };
    }
    function yaz(oge, onceki2, ilkMetin, girinti, onek) {
      var r = kolYuru(oge, onceki2);
      var satir = ilkMetin + r.metin + (r.son.cocuklar.length >= 2 ? ', ' + r.son.cocuklar.length + ' dal' : '');
      satirlar.push(girinti + satir);
      r.son.cocuklar.forEach(function (c, n) {
        var etiket = onek + (n + 1);
        yaz(c, sonOnceki(c.kenar, r.onceki), 'dal ' + etiket + ':' + ok(c.kenar, r.onceki) + ogeMetni(c, kById), girinti + '  ', etiket + '.');
      });
    }
    yaz(kok, ilk, ogeMetni(kok, kById), '', '');
    // aynı satırın girintisi yalnız dallarda; gövde satırı girintisizdir
    b.geriKenarlar.forEach(function (id) {
      var k2 = kById[id];
      var ek = k2.sanal ? 'geçiş bileşeni: ' + bilesen(k2.bilesen) : k2.ic ? 'cihaz içi bağlantı' : 'kablo ' + (k2.etiket != null ? k2.etiket : 'etiketsiz');
      satirlar.push('çevrim kapanışı: ' + dById[k2.a].ad + ' ↔ ' + dById[k2.b].ad + ' (' + ek + ')');
    });
    return satirlar;
  }

  /** Özet satırları. Dallanma ve çok bileşen satırlara bölünür; maksSatir aşılırsa kısaltılır. */
  function satirlar(iz, secenek) {
    var maks = secenek && secenek.maksSatir > 0 ? secenek.maksSatir : VARSAYILAN_MAKS_SATIR;
    var dById = {}, kById = {};
    iz.dugumler.forEach(function (d) { dById[d.id] = d; });
    iz.kenarlar.forEach(function (k) { kById[k.id] = k; });
    var cikti = [];
    iz.bilesenler.forEach(function (b, bi) {
      var s = bilesenSatirlari(iz, b, dById, kById);
      var onek = iz.baslik + ' · ' + (iz.bilesenler.length > 1 ? 'parça ' + (bi + 1) + ': ' : '');
      s[0] = onek + s[0];
      s.forEach(function (x) { cikti.push(x); });
    });
    if (cikti.length > maks) {
      var fazla = cikti.length - (maks - 1);
      cikti = cikti.slice(0, maks - 1);
      cikti.push('… (' + fazla + ' satır daha)');
    }
    return cikti;
  }

  function ozet(iz, secenek) {
    return satirlar(iz, secenek).join('\n');
  }

  /** Kopyala/paylaş için tam metin: özet + özellikler + kaynak + etiketler + uyarılar. */
  function tamMetin(iz) {
    var s = satirlar(iz);
    var oz = ozellikler(iz);
    if (oz.length) { s.push(''); oz.forEach(function (x) { s.push(x); }); }
    var ks = kaynaklar(iz);
    if (ks.length) { s.push(''); s.push('Kaynak:'); ks.forEach(function (x) { s.push('  ' + x); }); }
    if (!iz.dogrulandi) {
      var adlar = [];
      iz.kaynaklar.forEach(function (x) { if (!x.dogrulandi && adlar.indexOf(x.semaAd) < 0) adlar.push(x.semaAd); });
      s.push('DOĞRULANMADI: ' + (adlar.length ? adlar.join(', ') : iz.dogrulanmamisSemalar.join(', ')));
    }
    if (iz.supheli) s.push('ŞÜPHELİ: bu sonuçta okunamayan ya da emin olunmayan değer var.');
    var u = uyarilar(iz);
    if (u.length) { s.push(''); u.forEach(function (x) { s.push(x); }); }
    return s.join('\n');
  }

  return {
    ozet: ozet, satirlar: satirlar, dugum: dugum, kenar: kenar, ozellikler: ozellikler,
    kaynak: kaynak, kaynaklar: kaynaklar, uyarilar: uyarilar, tamMetin: tamMetin, adres: adres, bilesen: bilesen
  };
});
