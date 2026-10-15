/* oner: bulunamayan sorgu için yakın öneriler ("şunu mu demek istediniz").
   Ağırlıklı düzenleme uzaklığı: ekleme/silme 1, yer değiştirme 1, bitişik harflerin yer değişimi 0.8,
   sık karışan çiftler (O/0, I/1, L/1, I/L, S/5, B/8, Z/2) 0.4. DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.oner = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function arama(s) { return mod('normalize').arama(s); }   // sorgu: tire/boşluk farkı yok sayılır, kenar tiresi de
  function kabloAnahtari(s) { return mod('normalize').kabloAnahtari(s); }
  function dogal(a, b) { return mod('normalize').dogal(a, b); }

  var KARISAN = { '0O': 1, 'O0': 1, '1I': 1, 'I1': 1, '1L': 1, 'L1': 1, 'IL': 1, 'LI': 1, '5S': 1, 'S5': 1, '8B': 1, 'B8': 1, '2Z': 1, 'Z2': 1 };
  var TUR_SIRASI = { cihaz: 0, kablo: 1, soket: 2 };

  function degisim(x, y) {
    if (x === y) return 0;
    return KARISAN[x + y] === 1 ? 0.4 : 1;
  }

  /** Ağırlıklı Damerau-Levenshtein. esik aşılırsa erken Infinity döner. */
  function mesafe(a, b, esik) {
    var n = a.length, m = b.length;
    if (Math.abs(n - m) > esik) return Infinity;
    var onceki2 = null, onceki = [], simdi;
    var i, j;
    for (j = 0; j <= m; j++) onceki[j] = j;
    for (i = 1; i <= n; i++) {
      simdi = [i];
      var enAz = i;
      for (j = 1; j <= m; j++) {
        var d = Math.min(
          onceki[j] + 1,
          simdi[j - 1] + 1,
          onceki[j - 1] + degisim(a.charAt(i - 1), b.charAt(j - 1))
        );
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d = Math.min(d, onceki2[j - 2] + 0.8);
        }
        simdi[j] = d;
        if (d < enAz) enAz = d;
      }
      if (enAz > esik) return Infinity;
      onceki2 = onceki; onceki = simdi;
    }
    return onceki[m] <= esik ? onceki[m] : Infinity;
  }

  function kume(dizi) {
    var k = {};
    (dizi || []).forEach(function (x) { k[x] = true; });
    return k;
  }

  /** Öneriler: [{ tur, deger, ad, sorgu, uzaklik }]. secenek: { sekme, n (varsayılan 5) }. Çok kısa sorguda boş döner. */
  function oner(db, sorgu, secenek) {
    secenek = secenek || {};
    var n = secenek.n > 0 ? secenek.n : 5;
    var q = arama(sorgu), qk = kabloAnahtari(sorgu);
    if (q.length < 2) return [];
    var k = secenek.sekme ? kume(db._sekmeSema[secenek.sekme] || []) : null;
    var izinli = function (semalar) {
      if (!k) return true;
      for (var i = 0; i < semalar.length; i++) if (k[semalar[i]] === true) return true;
      return false;
    };
    var esik = Math.max(1, Math.min(2.5, q.length / 3));
    var adaylar = [], goruldu = {};
    function dene(tur, deger, anahtarlar, ad, qq) {
      var imza = tur + '|' + deger;
      if (goruldu[imza]) return;
      var en = Infinity;
      for (var i = 0; i < anahtarlar.length; i++) {
        if (anahtarlar[i] === qq) return; // aynısı zaten var (bulunamayan sorgu bu değil)
        var m = mesafe(qq, anahtarlar[i], esik);
        if (m < en) en = m;
      }
      if (en === Infinity) return;
      goruldu[imza] = true;
      adaylar.push({ tur: tur, deger: deger, ad: ad || null, sorgu: deger, uzaklik: Math.round(en * 100) / 100 });
    }
    db._cihazListe.forEach(function (r) { if (izinli(r.semalar)) dene('cihaz', r.kod, [r.kodN], r.kisaAd, q); });
    db._kabloListe.forEach(function (g) { if (izinli(g.semalar)) dene('kablo', g.no != null ? g.no : g.etiket, g.araAnahtarlari, null, qk || q); });
    db._soketListe.forEach(function (e) {
      if (!izinli(e.semalar)) return;
      var r = e.cihazN ? db._cihaz[e.cihazN] : null;
      dene('soket', e.soket, [e.soketN], r ? r.kisaAd || r.kod : null, q);
    });
    adaylar.sort(function (a, b) {
      return (a.uzaklik - b.uzaklik) || (TUR_SIRASI[a.tur] - TUR_SIRASI[b.tur]) || dogal(a.deger, b.deger);
    });
    // en iyi adaydan yarım puandan fazla uzak olanlar alakasız sayılır (99AO1 için 99A01 varken 99A02 önerilmez)
    var enIyi = adaylar.length ? adaylar[0].uzaklik : 0;
    return adaylar.filter(function (a) { return a.uzaklik <= enIyi + 0.5; }).slice(0, n);
  }

  return { oner: oner, mesafe: mesafe };
});
