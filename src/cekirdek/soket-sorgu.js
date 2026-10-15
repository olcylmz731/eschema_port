/* soket-sorgu: soket → pin listesi (her pin için kablo ve karşı uç). Aynı ad birçok cihazda olabilir (FPS 1–4'ün hepsinde IV-18). DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.soketSorgu = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function norm(s) { return mod('normalize').norm(s); }
  function dogal(a, b) { return mod('normalize').dogal(a, b); }
  function tekil(d) { return mod('normalize').tekil(d); }
  function ic() { return mod('veri').ic; }

  function kume(dizi) {
    var k = {};
    (dizi || []).forEach(function (x) { k[x] = true; });
    return k;
  }

  /** Soket adından sorgu. secenek: { cihaz, semalar }  (cihaz: yalnız o cihazın soketi) */
  function soket(db, ad, secenek) {
    secenek = secenek || {};
    var q = ad == null ? '' : norm(ad);
    if (q === '') return null;
    var cihazN = secenek.cihaz ? norm(secenek.cihaz) : null;
    var semaKume = secenek.semalar && secenek.semalar.length ? kume(secenek.semalar) : null;
    var girdiler = db._soketListe.filter(function (e) {
      if (e.soketN !== q) return false;
      if (cihazN && e.cihazN !== cihazN) return false;
      if (semaKume) return e.semalar.some(function (s) { return semaKume[s] === true; });
      return true;
    });
    if (!girdiler.length) return null;
    girdiler.sort(function (a, b) { return dogal(a.cihaz || '', b.cihaz || ''); });

    var csorgu = mod('cihazSorgu');
    var eslesmeler = girdiler.map(function (e) {
      var r = e.cihazN ? db._cihaz[e.cihazN] : null;
      var satirlar = csorgu.ic.satirlariKur(db, e.uclar, secenek);
      var semalar = e.semalar.filter(function (s) { return !semaKume || semaKume[s] === true; });
      var uc = [];
      satirlar.forEach(function (s) { s.kablolar.forEach(function (k) { k.kenar.kaynaklar.forEach(function (x) { uc.push(x); }); }); });
      return {
        cihaz: r ? ic().cihazOzeti(r) : null, soket: e.soket, ara: e.ara, pinSayisi: e.pinSayisi,
        satirlar: satirlar, kaynaklar: ic().kaynakTekil(db, uc), semalar: semalar,
        dogrulandi: ic().dogrulandiMi(db, semalar).dogrulandi,
        supheli: satirlar.some(function (s) { return s.supheli; }), celiski: satirlar.some(function (s) { return s.celiski; })
      };
    });
    var tumSemalar = tekil([].concat.apply([], eslesmeler.map(function (m) { return m.semalar; })));
    var dg = ic().dogrulandiMi(db, tumSemalar);
    return {
      tur: 'soket', soket: girdiler[0].soket, eslesmeler: eslesmeler,
      dogrulandi: dg.dogrulandi, dogrulanmamisSemalar: dg.dogrulanmamisSemalar,
      supheli: eslesmeler.some(function (m) { return m.supheli; }), celiski: eslesmeler.some(function (m) { return m.celiski; })
    };
  }

  return { soket: soket };
});
