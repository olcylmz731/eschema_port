/* a2-bilesen: tekrar kullanılan HTML bileşenleri (DESIGN.md §6–§10; görünüm test/referans.html ile aynı sınıf adları).
   Durum etiketleri (ŞÜPHELİ, ÇELİŞKİLİ, DOĞRULANMADI …) doğrudan büyük harfle yazılır (i/İ tuzağı), CSS text-transform kullanılmaz. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var h = A.h;

  var R_IKON = { supheli: 'i-supheli', celiski: 'i-celiski', dogrulanmadi: 'i-dogrulanmadi', dogrulandi: 'i-dogrulandi', not: 'i-not', varyant: 'i-varyant' };
  var R_YAZI = { supheli: 'ŞÜPHELİ', celiski: 'ÇELİŞKİLİ', dogrulanmadi: 'DOĞRULANMADI', dogrulandi: 'DOĞRULANDI', not: 'ŞEMA NOTU', varyant: 'VARYANT' };

  /** Satır içi durum rozeti: simge + büyük harfli yazı + çerçeve. */
  A.rozet = function (tur, yazi) {
    return h('span', { sinif: 'rozet r-' + tur }, [A.ikon(R_IKON[tur], 'ik-k'), yazi || R_YAZI[tur]]);
  };

  /** Kart tepesi şeridi: kapatılamaz, daraltılamaz (DESIGN §0.3). metin: string | Node | dizi */
  A.serit = function (tur, baslik, metin) {
    return h('div', { sinif: 'serit s-' + tur, role: 'note' }, [
      A.ikon(R_IKON[tur]),
      h('div', null, [h('b', { metin: baslik || R_YAZI[tur] }), h('span', null, metin)])
    ]);
  };

  /** Şemaların adları (veri paketinden; verisi olmayan şema da adıyla). */
  A.semaAd = function (id) {
    var db = A.db, paket = A.paket;
    if (db && db.semalar && db.semalar[id]) return db.semalar[id].ad;
    if (paket && paket.semalar && paket.semalar[id]) return paket.semalar[id].ad;
    return id;
  };

  /** Doğrulanmamış her şema için ayrı DOĞRULANMADI şeridi. */
  A.dogrulanmadiSeritleri = function (semalar) {
    return (semalar || []).map(function (id) {
      return A.serit('dogrulanmadi', 'DOĞRULANMADI', [h('b', { sinif: 'sema-adi', metin: A.semaAd(id) + ': ' }), 'Bu şema henüz kontrol edilmedi. Şemadan teyit et.']);
    });
  };

  /** Bir sonucun rozet kümesi. o: { supheli, celiski, dogrulandi, varyant } */
  A.rozetler = function (o) {
    var r = [];
    if (o.celiski) r.push(A.rozet('celiski'));
    if (o.supheli) r.push(A.rozet('supheli'));
    if (o.varyant) r.push(A.rozet('varyant'));
    if (o.dogrulandi === true) r.push(A.rozet('dogrulandi'));
    else if (o.dogrulandi === false) r.push(A.rozet('dogrulanmadi'));
    return r;
  };

  /** [soket simgesi SOKET] [PIN] [pin adı] kapsülü (DESIGN §8). */
  A.pinKapsul = function (soket, pin, pinAdi) {
    return h('span', { sinif: 'pin' }, [
      soket ? h('span', { sinif: 'pin-soket' }, [A.ikon('i-soket'), A.bel(soket)]) : null,
      pin ? h('b', { sinif: 'pin-no' }, A.bel(pin)) : h('span', { sinif: 'pin-ad' }, 'pin şemada yazılı değil'),
      pinAdi ? h('span', { sinif: 'pin-ad' }, A.bel(pinAdi)) : null
    ]);
  };

  /** Kablo rengi: şerit + yazılı kısaltma (+ tam ad). Bilinmeyen kısaltma nötr şerit. */
  var BILINEN = { ws: 1, sw: 1, rt: 1, gn: 1, ge: 1, bl: 1, br: 1, gr: 1, li: 1, or: 1, rs: 1 };
  function renkDegiskeni(k) { return BILINEN[k] ? 'var(--kablo-' + k + ')' : 'var(--yazi-pasif)'; }
  A.renkCipi = function (renk, adGoster) {
    if (!renk) return null;
    var p = String(renk).split('/');
    var sw = h('span', { sinif: 'ksw' + (p.length > 1 ? ' iki' : '') });
    sw.style.setProperty('--c1', renkDegiskeni(p[0]));
    if (p[1]) sw.style.setProperty('--c2', renkDegiskeni(p[1]));
    var ad = adGoster && KB.renkler ? KB.renkler.ad(renk) : null;
    return h('span', { sinif: 'kcip' }, [sw, renk, ad && ad !== renk ? h('span', { sinif: 'kcip-ad', metin: ad }) : null]);
  };

  /** Büyük simgeli boş durum bloğu. */
  A.bos = function (o) {
    return h('section', { sinif: 'bos' + (o.sinif ? ' ' + o.sinif : ''), role: o.role || null }, [
      A.ikon(o.ikon || 'i-ara', 'ik-b'),
      h('h2', { sinif: 'bos-baslik' }, o.baslik),
      o.metin ? h('p', null, o.metin) : null,
      o.cocuk || null
    ]);
  };

  /** Örnek / öneri çipi (48 px, mono). */
  A.oneriCipi = function (metin, fn, ek) {
    return h('button', { type: 'button', sinif: 'oneri', onclick: function () { fn(metin); } }, [metin, ek ? h('span', { sinif: 'oneri-ek', metin: ek }) : null]);
  };

  /* ---------- kaynak referansı ---------- */
  function yerMetni(k) {
    var y = [];
    if (k.yol) y.push('yol ' + k.yol);
    if (k.satir) y.push('satır ' + k.satir);
    return y.join(' · ');
  }
  /** Kaynakları PDF + sayfa'ya göre gruplar: "Kapı 1stromlaufplan.pdf · sayfa 1" + yol/satır çipleri. ~ = yaklaşık. */
  A.kaynakBlogu = function (kaynaklar) {
    kaynaklar = kaynaklar || [];
    var gruplar = [], harita = {}, yaklasik = false;
    kaynaklar.forEach(function (k) {
      var anahtar = (k.pdf || '') + '|' + (k.sayfa || '');
      var g = harita[anahtar];
      if (!g) { g = harita[anahtar] = { pdf: k.pdf, sayfa: k.sayfa, yerler: [], gorulen: {} }; gruplar.push(g); }
      var m = yerMetni(k);
      if (k.kesin === false || (k.yol && String(k.yol).charAt(0) === '~')) yaklasik = true;
      if (!m || g.gorulen[m]) return;
      g.gorulen[m] = 1;
      g.yerler.push(m);
    });
    if (!gruplar.length) {
      return h('section', { sinif: 'kaynak', 'aria-label': 'Kaynak' }, [A.ikon('i-kaynak', 'ik-k'), h('div', { sinif: 'kaynak-icerik' }, 'Kaynak bilgisi yok.')]);
    }
    var icerik = gruplar.map(function (g) {
      var bas = h('div', { sinif: 'kaynak-pdf' }, [h('span', { sinif: 'kaynak-ad', metin: g.pdf || 'PDF adı yok' }), g.sayfa ? ' · sayfa ' + g.sayfa : '']);
      var ilk = g.yerler.slice(0, 12), kalan = g.yerler.slice(12);
      var liste = h('ul', { sinif: 'yer-liste' }, ilk.map(function (m) { return h('li', { sinif: 'yer', metin: m }); }));
      var d = null;
      if (kalan.length) {
        d = h('details', { sinif: 'daha' }, [
          h('summary', null, '+ ' + kalan.length + ' yer daha'),
          h('ul', { sinif: 'yer-liste' }, kalan.map(function (m) { return h('li', { sinif: 'yer', metin: m }); }))
        ]);
      }
      return h('div', { sinif: 'kaynak-grup' }, [bas, g.yerler.length ? liste : null, d]);
    });
    if (yaklasik) icerik.push(h('p', { sinif: 'kaynak-not' }, '~ işareti: yer yaklaşık (şemada tam seçilemedi).'));
    return h('section', { sinif: 'kaynak', 'aria-label': 'Kaynak' }, [A.ikon('i-kaynak', 'ik-k'), h('div', { sinif: 'kaynak-icerik' }, icerik)]);
  };
})(typeof globalThis === 'object' ? globalThis : this);
