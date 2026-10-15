/* cihaz-sorgu: cihaz → soket → pin → pin adı → kablo no → karşı uç tablosu.
   Aynı satır kurucu soket-sorgu tarafından da kullanılır. DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.cihazSorgu = modul; }
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

  /** Pin sırası: soketsiz/pinsiz sonda, kalanı doğal sıra. */
  function pinSirala(a, b) {
    if ((a == null) !== (b == null)) return a == null ? 1 : -1;
    if (a == null) return 0;
    return dogal(a, b);
  }

  /**
   * Bir uç listesinden ({p, i}) pin satırları kurar. Aynı (soket, pin) tek satırdır; pini yazılmayan/okunamayan uçlar ayrı satır.
   * Her satırın kolları, o pinden başlayan iz (KB.izle.uc) üzerinden hesaplanır.
   * secenek: { semalar }
   */
  function satirlariKur(db, uclar, secenek) {
    var izle = mod('izle');
    var semaKume = secenek && secenek.semalar && secenek.semalar.length ? kume(secenek.semalar) : null;
    var harita = {}, sira = [];
    uclar.forEach(function (x) {
      if (semaKume && semaKume[x.p.sema] !== true) return;
      var u = x.p.uclar[x.i];
      var anahtar = u.vkey || (x.p.uid + '#' + x.i);
      var s = harita[anahtar];
      if (!s) {
        var ref;
        if (!u.vkey) ref = { parca: x.p.uid, uc: x.i };
        else if (u.tur === 'cihaz') ref = { cihaz: u.cihaz, soket: u.soket, pin: u.pin };
        else ref = { soket: u.soket, pin: u.pin };
        s = harita[anahtar] = { soket: u.soket == null ? null : u.soket, pin: u.pin == null ? null : u.pin, pinAdi: null, belirsiz: false, supheli: false, uc: ref, parcalar: [] };
        sira.push(s);
      }
      if (u.pinAdi != null && s.pinAdi == null) s.pinAdi = u.pinAdi;
      if (u.belirsiz) s.belirsiz = true;
      if (x.p.supheli) s.supheli = true;
      s.parcalar.push(x.p);
    });
    sira.sort(function (a, b) {
      var d = pinSirala(a.soket, b.soket);
      return d || pinSirala(a.pin, b.pin);
    });
    return sira.map(function (s) {
      var iz = izle.uc(db, s.uc, secenek && secenek.semalar ? { semalar: secenek.semalar } : undefined);
      var kablolar = iz ? izle.kollar(iz) : [];
      var semalar = tekil(s.parcalar.map(function (p) { return p.sema; }));
      var celiski = kablolar.some(function (k) {
        return k.kenar.celiski || k.karsiUc.celiski || k.varis.some(function (d) { return d.celiski; });
      }) || !!(iz && iz.bilesenler.length && iz.dugumler.some(function (d) { return d.id === iz.bilesenler[0].baslangic && d.celiski; }));
      // bu pindeki kendine dönen kablolar (iki ucu da bu pin; kol değildir, ayrı verilir)
      var donen = [];
      if (iz && iz.bilesenler.length) {
        var kokId = iz.bilesenler[0].agac.dugum;
        var kokDugum = iz.dugumler.filter(function (d) { return d.id === kokId; })[0];
        if (kokDugum && kokDugum.kendineDonen.length) {
          donen = iz.kenarlar.filter(function (k) { return kokDugum.kendineDonen.indexOf(k.id) >= 0; });
        }
      }
      return {
        soket: s.soket, pin: s.pin, pinAdi: s.pinAdi, belirsiz: s.belirsiz,
        kablolar: kablolar, kendineDonen: donen, supheli: s.supheli || !!(iz && iz.supheli), celiski: celiski,
        dogrulandi: ic().dogrulandiMi(db, semalar).dogrulandi, uc: s.uc
      };
    });
  }

  /** Satırları sokete göre gruplar: [{ soket, pinSayisi, satirlar }] — soketsiz uçlar sonda. */
  function soketleGrupla(satirlar) {
    var harita = {}, gruplar = [];
    satirlar.forEach(function (s) {
      var a = s.soket == null ? '' : norm(s.soket);
      var g = harita[a];
      if (!g) {
        g = harita[a] = { soket: s.soket, pinSayisi: s.soket == null ? null : ic().soketPinSayisi(s.soket, false), satirlar: [] };
        gruplar.push(g);
      }
      g.satirlar.push(s);
    });
    gruplar.sort(function (a, b) { return pinSirala(a.soket, b.soket); });
    return gruplar;
  }

  /** Cihaz kodundan sorgu: soket → pin → pin adı → kablo → karşı uç. secenek: { semalar } */
  function cihaz(db, kod, secenek) {
    var r = kod == null ? null : db._cihaz[norm(kod)];
    if (!r) return null;
    var semaKume = secenek && secenek.semalar && secenek.semalar.length ? kume(secenek.semalar) : null;
    var satirlar = satirlariKur(db, db._cihazUc[r.kodN] || [], secenek);
    var soketler = soketleGrupla(satirlar);

    var semalar = r.semalar.filter(function (s) { return !semaKume || semaKume[s] === true; });
    var dg = ic().dogrulandiMi(db, semalar);
    var kaynaklar = ic().cihazKaynaklari(db, r).filter(function (k) { return !semaKume || semaKume[k.sema] === true; });
    if (!kaynaklar.length) {
      var uc = [];
      satirlar.forEach(function (s) { s.kablolar.forEach(function (k) { k.kenar.kaynaklar.forEach(function (x) { uc.push(x); }); }); });
      kaynaklar = ic().kaynakTekil(db, uc);
    } else {
      kaynaklar = ic().kaynakTekil(db, kaynaklar);
    }

    var uyarilar = [];
    if (r.cihazBilinmiyor) uyarilar.push({ tur: 'cihaz-bilinmiyor', onem: 'bilgi', mesaj: 'Bu cihaz hiçbir bileşen listesinde yok; türü kod harfinden türetildi.' });
    r.celiski.forEach(function (c) {
      uyarilar.push({
        tur: 'cihaz-celiski', onem: 'uyari',
        mesaj: 'Cihaz bilgisi şemalar arasında farklı: ' + c.alan + ' (' +
          Object.keys(c.degerler).map(function (s) { return (db.semalar[s] ? db.semalar[s].ad : s) + ': ' + c.degerler[s]; }).join(' · ') + ').'
      });
    });
    return {
      tur: 'cihaz', cihaz: ic().cihazOzeti(r), soketler: soketler, satirSayisi: satirlar.length, kaynaklar: kaynaklar,
      dogrulandi: dg.dogrulandi, dogrulanmamisSemalar: dg.dogrulanmamisSemalar,
      supheli: satirlar.some(function (s) { return s.supheli; }), celiski: satirlar.some(function (s) { return s.celiski; }),
      uyarilar: uyarilar
    };
  }

  return { cihaz: cihaz, ic: { satirlariKur: satirlariKur, soketleGrupla: soketleGrupla, pinSirala: pinSirala } };
});
