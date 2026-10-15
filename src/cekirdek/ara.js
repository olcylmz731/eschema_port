/* ara: önce tam eşleşme, sonra önek; sonuç türe göre gruplu (cihaz, soket, kablo); sekme süzgeci.
   Boş sorgu + sekme = o sistemin cihaz ve kablo listesi. DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.ara = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function norm(s) { return mod('normalize').norm(s); }
  function arama(s) { return mod('normalize').arama(s); }          // arama sorgusu: tire/boşluk farkı yok sayılır (PROMPT §4), kenar tiresi de
  function pinKimligi(s) { return mod('normalize').pin(s); }       // pin kimliği: tire/artı korunur (soket/pin yazımında B- ≠ B)
  function kabloAnahtari(s) { return mod('normalize').kabloAnahtari(s); }
  function dogal(a, b) { return mod('normalize').dogal(a, b); }
  function ic() { return mod('veri').ic; }

  var VARSAYILAN_LIMIT = 40;
  var ESLESME_AD = ['tam', 'onek', 'ad', 'ad', 'ad']; // kademe → eslesme
  var GRUP_SIRASI = ['cihaz', 'soket', 'kablo'];

  function kume(dizi) {
    var k = {};
    (dizi || []).forEach(function (x) { k[x] = true; });
    return k;
  }
  function kesisir(semalar, k) {
    for (var i = 0; i < semalar.length; i++) if (k[semalar[i]] === true) return true;
    return false;
  }
  function sekmelerOf(db, semalar) {
    var cikti = [];
    db.sekmeler.forEach(function (t) {
      for (var i = 0; i < t.semalar.length; i++) {
        if (semalar.indexOf(t.semalar[i]) >= 0) { cikti.push(t.id); return; }
      }
    });
    return cikti;
  }
  function boslukSayilari() { return { cihaz: 0, soket: 0, kablo: 0 }; }

  // ---- öğe kurucular ------------------------------------------------------------------------------
  function cihazOgesi(db, r, kademe) {
    var d = ic().dogrulandiMi(db, r.semalar);
    return {
      tur: 'cihaz', eslesme: kademe == null ? null : ESLESME_AD[kademe],
      kod: r.kod, kisaAd: r.kisaAd, adTr: r.adTr, adDe: r.adDe, cihazTur: r.cihazTur, cihazBilinmiyor: r.cihazBilinmiyor,
      yol: r.yol, soketSayisi: r.soketSayisi, pinSayisi: r.pinSayisi,
      semalar: r.semalar, sekmeler: sekmelerOf(db, r.semalar), supheli: r.supheli, dogrulandi: d.dogrulandi
    };
  }

  function soketOgesi(db, e, kademe, pin) {
    var r = e.cihazN ? db._cihaz[e.cihazN] : null;
    var d = ic().dogrulandiMi(db, e.semalar);
    return {
      tur: 'soket', eslesme: kademe == null ? null : ESLESME_AD[kademe],
      soket: e.soket, cihaz: r ? r.kod : null, cihazKisaAd: r ? r.kisaAd : null, cihazTur: r ? r.cihazTur : null,
      ara: e.ara, pinSayisi: e.pinSayisi, bagliPinSayisi: e.bagliPinSayisi, pin: pin == null ? null : pin,
      semalar: e.semalar, sekmeler: sekmelerOf(db, e.semalar), supheli: e.supheli, dogrulandi: d.dogrulandi
    };
  }

  function kabloOgesi(db, g, kademe) {
    var d = ic().dogrulandiMi(db, g.semalar);
    return {
      tur: 'kablo', eslesme: kademe == null ? null : ESLESME_AD[kademe],
      anahtar: g.anahtar, no: g.no, etiket: g.etiket, etiketler: g.etiketler, parcaSayisi: g.parcalar.length,
      cihazlar: g.cihazlar.map(function (kod) {
        var r = db._cihaz[norm(kod)];
        return { kod: kod, kisaAd: r ? r.kisaAd : null };
      }),
      celiski: g.celiski, semalar: g.semalar, sekmeler: sekmelerOf(db, g.semalar), supheli: g.supheli, dogrulandi: d.dogrulandi
    };
  }

  // ---- eşleşme kademeleri ---------------------------------------------------------------------------
  // cihaz: 0 kod tam · 1 kod önek · 2 ad tam · 3 ad önek · 4 ad içinde
  function cihazKademe(r, q) {
    if (r.kodN === q) return 0;
    if (r.kodN.indexOf(q) === 0) return 1;
    var en = -1;
    function dene(ad, icerdeMin) {
      if (!ad) return;
      var n = arama(ad);
      if (!n) return;
      var k = -1;
      if (n === q) k = 2;
      else if (n.indexOf(q) === 0) k = 3;
      else if (q.length >= icerdeMin && n.indexOf(q) > 0) k = 4;
      if (k >= 0 && (en < 0 || k < en)) en = k;
    }
    dene(r.kisaAd, 3);
    dene(r.adTr, 3);
    dene(r.adDe, 4);
    return en;
  }

  // soket / kablo: 0 tam · 1 önek
  function anahtarKademe(anahtarlar, q) {
    var en = -1;
    for (var i = 0; i < anahtarlar.length; i++) {
      var k = anahtarlar[i];
      if (k === q) return 0;
      if (k.indexOf(q) === 0) en = 1;
    }
    return en;
  }

  function sirala(dizi, anahtarFn) {
    dizi.sort(function (a, b) {
      if (a.kademe !== b.kademe) return a.kademe - b.kademe;
      return dogal(anahtarFn(a), anahtarFn(b));
    });
    return dizi;
  }

  function ozet(sonuc, limit) {
    GRUP_SIRASI.forEach(function (g) {
      sonuc.sayilar[g] = sonuc[g].length;
      if (sonuc[g].length > limit) { sonuc[g] = sonuc[g].slice(0, limit); sonuc.kesildi = true; }
    });
    sonuc.toplam = sonuc.sayilar.cihaz + sonuc.sayilar.soket + sonuc.sayilar.kablo;
    // gruplar: en iyi eşleşme önde, eşitse cihaz < soket < kablo
    var rank = { tam: 0, onek: 1, ad: 2 };
    var dolu = GRUP_SIRASI.filter(function (g) { return sonuc[g].length > 0; });
    var en = {};
    dolu.forEach(function (g) {
      var e = sonuc[g][0].eslesme;
      en[g] = e == null ? 0 : rank[e];
    });
    sonuc.gruplar = dolu.sort(function (a, b) { return en[a] - en[b] || GRUP_SIRASI.indexOf(a) - GRUP_SIRASI.indexOf(b); });
    return sonuc;
  }

  // ---- ana işlevler ----------------------------------------------------------------------------------
  /** Arama. secenek: { sekme, limit }. */
  function ara(db, sorgu, secenek) {
    secenek = secenek || {};
    var limit = secenek.limit == null ? VARSAYILAN_LIMIT : secenek.limit;
    var sekme = secenek.sekme || null;
    var ham = sorgu == null ? '' : String(sorgu);
    var q = arama(ham);
    var sonuc = {
      sorgu: ham, anahtar: q, sekme: sekme, bos: false, gruplar: [], cihaz: [], soket: [], kablo: [],
      sayilar: boslukSayilari(), toplam: 0, kesildi: false, pin: null
    };
    if (q === '') {
      if (!sekme) { sonuc.bos = true; return sonuc; }
      return liste(db, sekme, secenek, ham);
    }
    var k = sekme ? kume(db._sekmeSema[sekme] || []) : null;
    var sorguSokPin = null; // 'X99.1/4' ya da 'IV-18/10' yazımı
    var ix = ham.lastIndexOf('/');
    if (ix > 0 && ix < ham.length - 1) {
      var qs = arama(ham.slice(0, ix)), qp = pinKimligi(ham.slice(ix + 1));
      if (qs !== '' && qp !== '') sorguSokPin = { qs: qs, qp: qp };
    }

    if (!sorguSokPin) {
      var cihazlar = [];
      db._cihazListe.forEach(function (r) {
        if (k && !kesisir(r.semalar, k)) return;
        var kd = cihazKademe(r, q);
        if (kd >= 0) cihazlar.push({ r: r, kademe: kd });
      });
      sirala(cihazlar, function (x) { return x.r.kod; });
      sonuc.cihaz = cihazlar.map(function (x) { return cihazOgesi(db, x.r, x.kademe); });
    }

    // kablo: '/' içeren sorgu da aranır; numarasız iki renkli etiketler ('1sw/rt', '1ws/li') soket/pin yazımına benzer
    var qk = kabloAnahtari(ham);
    if (qk !== '') {
      var kablolar = [];
      db._kabloListe.forEach(function (g) {
        if (k && !kesisir(g.semalar, k)) return;
        var kd = anahtarKademe(g.araAnahtarlari, qk);
        if (kd >= 0) kablolar.push({ g: g, kademe: kd });
      });
      sirala(kablolar, function (x) { return x.g.no != null ? x.g.no : (x.g.etiketler[0] || ''); });
      sonuc.kablo = kablolar.map(function (x) { return kabloOgesi(db, x.g, x.kademe); });
    }

    var qSoket = sorguSokPin ? sorguSokPin.qs : q;
    var soketler = [];
    db._soketListe.forEach(function (e) {
      if (k && !kesisir(e.semalar, k)) return;
      var kd = anahtarKademe([e.soketN], qSoket);
      if (kd >= 0) soketler.push({ e: e, kademe: kd });
    });
    sirala(soketler, function (x) { return x.e.soket + ' ' + (x.e.cihaz || ''); });
    sonuc.soket = soketler.map(function (x) {
      var pin = null;
      if (sorguSokPin) {
        for (var i = 0; i < x.e.uclar.length; i++) {
          var u = x.e.uclar[i].p.uclar[x.e.uclar[i].i];
          if (u.pin != null && pinKimligi(u.pin) === sorguSokPin.qp) { pin = u.pin; break; }
        }
      }
      return soketOgesi(db, x.e, x.kademe, pin);
    });
    if (sorguSokPin && sonuc.soket.length) {
      var ilk = sonuc.soket[0];
      sonuc.pin = { soket: ilk.soket, pin: ilk.pin != null ? ilk.pin : ham.slice(ix + 1).trim() };
    }
    return ozet(sonuc, limit);
  }

  /** Boş sorgu + sekme: o sistemin cihaz ve kablo listesi (doğal sıra). sekmeId boşsa hepsi. */
  function liste(db, sekmeId, secenek, hamSorgu) {
    secenek = secenek || {};
    var limit = secenek.limit == null ? Infinity : secenek.limit;
    var sekme = sekmeId || null;
    var k = sekme ? kume(db._sekmeSema[sekme] || []) : null;
    var sonuc = {
      sorgu: hamSorgu == null ? '' : hamSorgu, anahtar: '', sekme: sekme, bos: false, gruplar: [], cihaz: [], soket: [], kablo: [],
      sayilar: boslukSayilari(), toplam: 0, kesildi: false, pin: null
    };
    sonuc.cihaz = db._cihazListe.filter(function (r) { return !k || kesisir(r.semalar, k); })
      .map(function (r) { return cihazOgesi(db, r, null); });
    sonuc.kablo = db._kabloListe.filter(function (g) { return !k || kesisir(g.semalar, k); })
      .map(function (g) { return kabloOgesi(db, g, null); });
    return ozet(sonuc, limit);
  }

  return { ara: ara, liste: liste };
});
