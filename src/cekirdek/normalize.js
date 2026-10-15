/* normalize: anahtar biçimi, doğal sıralama. DOM yok; Node'da require, tarayıcıda KB.normalize.
   Kural: yerel ayara bağlı büyük harf dönüşümü kullanılmaz (Türkçe ı/İ tuzağı): İ→I, ı→I elle yapılır.
   Not: özel karakterler kaçış yazımı yerine karakter kodundan kurulur (kaynak dosyada görünmez karakter bırakmamak için). */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var modul = kur();
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.normalize = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function aralik(a, b) {
    var s = '';
    for (var i = a; i <= b; i++) s += String.fromCharCode(i);
    return s;
  }
  var C = String.fromCharCode;

  // anahtardan her zaman atılanlar: boşluk türleri, sıfır genişlikli karakterler
  var BOSLUK = new RegExp(
    '[\\s' + C(0xa0) + aralik(0x2000, 0x200f) + C(0x2028, 0x2029, 0x202f, 0x205f, 0x2060, 0x3000, 0xfeff) + ']+', 'g');
  // tire benzeri işaretler (tire-eksi, U+2010-2015, eksi işareti): anahtarda hepsi tek tür '-' olur
  var TIRE = new RegExp('[\\-' + aralik(0x2010, 0x2015) + C(0x2212) + ']', 'g');
  var ISARETLER = new RegExp('[' + aralik(0x300, 0x36f) + ']', 'g'); // birleşen aksan işaretleri
  var I_NOKTALI = new RegExp(C(0x130), 'g'); // İ
  var I_NOKTASIZ = new RegExp(C(0x131), 'g'); // ı

  /** Türkçe-güvenli büyük harf. İ→I, ı→I, aksanlar atılır (ş→S, ğ→G, ö→O, ü→U, ç→C). Boşluk korunur. */
  function buyuk(s) {
    if (s == null) return '';
    s = String(s).replace(I_NOKTALI, 'I').replace(I_NOKTASIZ, 'i');
    if (typeof s.normalize === 'function') s = s.normalize('NFD').replace(ISARETLER, '');
    return s.toUpperCase();
  }

  /** Cihaz PİNİNİN kimliği: büyük harf, boşluk yok, ',' → '.', tire türleri tek '-' olur ve KORUNUR, '+' korunur.
      'B-' ile 'B', 'B+' ile 'B' AYRI pindir (alternatörde B+, B-, D+, DF, W). Tireyi ayraç sayıp atan norm() soket/cihaz adları içindir
      (IV-18 → IV18); pin kimliğinde (uç anahtarı, düğüm, cihaz/soket sorgusunun pin satırı) kullanılmaz. */
  function pin(s) {
    return buyuk(s).replace(/,/g, '.').replace(BOSLUK, '').replace(TIRE, '-');
  }

  /** Ad anahtarı (cihaz kodu, soket adı, ek noktası kodu): büyük harf, boşluk yok, ',' → '.'.  '61a01' → '61A01', 'X08. 11' → 'X08.11'.
      Tire iki yanında karakter varsa AYRAÇTIR ve atılır ('IV-18' → 'IV18'); baştaki/sondaki tire işarettir (kutup 'B-') ve kalır,
      yani norm('B-') ≠ norm('B'). Pin kimliği için pin(), arama sorgusu için arama() kullanılır. */
  function norm(s) {
    var t = pin(s);
    return t.replace(/-+/g, function (m, i) { return i > 0 && i + m.length < t.length ? '' : '-'; });
  }

  /** Arama anahtarı: norm gibi, ama baştaki/sondaki tire de atılır (PROMPT §4: arama tire/boşluk farkını yok sayar;
      kullanıcı "IV-" ya da "2,5-" yazarken ayracı bırakmış olabilir). Kimlik karşılaştırmasında kullanılmaz. */
  function arama(s) {
    return norm(s).replace(/^-+|-+$/g, '');
  }

  /** Kablo anahtarı: baştaki '#' (sistem tedarikçisi işareti) ve boşluklar atılır, sonra arama (kablo anahtarında kutup tiresi yoktur). */
  function kabloAnahtari(s) {
    if (s == null) return '';
    return arama(String(s).replace(/^[\s#]+/, ''));
  }

  /** Değer okunamayan karakter ('?') içeriyor mu? */
  function belirsiz(s) {
    return s != null && String(s).indexOf('?') >= 0;
  }

  function parcala(s) {
    return String(s == null ? '' : s).toUpperCase().match(/\d+|\D+/g) || [];
  }
  function rakam(x) {
    var c = x.charCodeAt(0);
    return c >= 48 && c <= 57;
  }

  /** Doğal sıralama karşılaştırıcısı: sayılar sayı gibi (2 < 10), sayı önce harf sonra. */
  function dogal(a, b) {
    if (a === b) return 0;
    var A = parcala(a), B = parcala(b);
    var n = Math.min(A.length, B.length);
    for (var i = 0; i < n; i++) {
      var x = A[i], y = B[i];
      var dx = rakam(x), dy = rakam(y);
      if (dx && dy) {
        var nx = parseInt(x, 10), ny = parseInt(y, 10);
        if (nx !== ny) return nx < ny ? -1 : 1;
        if (x.length !== y.length) return x.length < y.length ? -1 : 1;
      } else if (dx !== dy) {
        return dx ? -1 : 1;
      } else if (x !== y) {
        return x < y ? -1 : 1;
      }
    }
    if (A.length !== B.length) return A.length < B.length ? -1 : 1;
    var sa = String(a == null ? '' : a), sb = String(b == null ? '' : b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }

  /** Dizideki tekrarları atar (ilk görülen kalır); null/undefined atılır. */
  function tekil(dizi) {
    var goruldu = {}, cikti = [];
    for (var i = 0; i < dizi.length; i++) {
      var k = dizi[i];
      if (k == null || goruldu[k] === true) continue;
      goruldu[k] = true;
      cikti.push(k);
    }
    return cikti;
  }

  return { buyuk: buyuk, norm: norm, pin: pin, arama: arama, kabloAnahtari: kabloAnahtari, belirsiz: belirsiz, dogal: dogal, tekil: tekil };
});
