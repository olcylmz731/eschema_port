/* a4b-tablo: cihaz ve soket sorgusunun pin tablosu (HTML; DESIGN §8 "Pin listesi satırı").
   soket başlık bandı (yapışkan) + her pin için satır: pin kutusu · pin adı · kablo no → karşı uç (soket, pin). Satıra dokununca pinin izi açılır.
   Çizim (KB.diyagram.cihaz / soket) bu tablonun altındadır; 30 pinli bir beyinde çizim binlerce piksel olabilir, tablo ise bir bakışta tarar. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var h = A.h;

  function kod(metin) { return h('b', { sinif: 'kod' }, A.bel(metin)); }

  /** Karşı uç düğümünün satır içi yazısı: cihazlarda kod / kısa ad / soket / pin / pin adı kalın-mono; diğerleri KB.metin ile. */
  function dugumYazisi(d) {
    if (d.tur !== 'cihaz') return [KB.metin.dugum(d)];
    var p = [kod(d.cihaz)];
    if (d.kisaAd) p.push(' ' + d.kisaAd);
    if (d.soket != null) { p.push(' · soket '); p.push(kod(d.soket)); }
    if (d.pin != null) { p.push(' · pin '); p.push(kod(d.pin)); }
    else p.push(' · ' + (d.soket == null ? 'soket/pin' : 'pin') + ' şemada yazılı değil');
    if (d.pinAdi != null) { p.push(' ('); p.push(kod(d.pinAdi)); p.push(')'); }
    if (d.acik) p.push(' · öbür taraf şemada yok');
    return p;
  }

  /** Yolda geçilen ara noktalar: ara soketler, ek noktaları, geçiş bileşenleri (terminal çiftleri tek öğe). */
  function uzerinden(kol) {
    var ogeler = [];
    (kol.ara || []).forEach(function (d) {
      if (d.gecisUcu) return;                       // bileşen kendi satırından (gecisler) yazılır
      if (d.tur === 'soket') ogeler.push(d.soket + (d.pin != null ? ' pin ' + d.pin : ''));
      else if (d.tur === 'dugum') ogeler.push(d.kodsuz ? 'ek noktası' : 'ek ' + d.kod);
    });
    (kol.gecisler || []).forEach(function (g) { ogeler.push(g.kod + ' (' + g.turAd + ')'); });
    if (!ogeler.length) return null;
    var goster = ogeler.slice(0, 4);
    return 'üzerinden: ' + goster.join(' · ') + (ogeler.length > goster.length ? ' · +' + (ogeler.length - goster.length) : '');
  }

  function kolSatiri(kol) {
    var k = kol.kenar || {};
    var onek;
    if (kol.ic) onek = [A.ikon('d-ic', 'ik-k'), 'cihaz içi bağlantı'];
    else if (kol.sanal && k.bilesen) onek = [k.bilesen.kod + ' (' + k.bilesen.turAd + ') üzerinden'];
    else {
      onek = [k.etiket ? 'kablo ' : 'etiketsiz tel'];
      if (k.etiket) onek.push(kod(k.etiket));
      if (k.renk && !k.renkSemaNotu) { onek.push(' '); onek.push(A.renkCipi(k.renk, false)); }
      if (k.varyant) { onek.push(' '); onek.push(A.rozet('varyant')); }
    }
    var varis = kol.varis || [];
    var govde = [];
    if (!varis.length) {
      govde.push(h('span', { sinif: 'kol-varis', metin: kol.karsiUc ? KB.metin.dugum(kol.karsiUc) : 'karşı uç yok' }));
    } else if (varis.length === 1) {
      govde.push(h('span', { sinif: 'kol-varis' }, dugumYazisi(varis[0])));
    } else {
      varis.forEach(function (d, i) { govde.push(h('span', { sinif: 'kol-varis kol-dal' }, [h('span', { sinif: 'kol-dal-no', metin: 'dal ' + (i + 1) + ': ' }), dugumYazisi(d)])); });
    }
    var uz = kol.ic ? null : uzerinden(kol);
    return h('span', { sinif: 'kol' }, [
      h('span', { sinif: 'kol-bas' }, [onek, ' → ']),
      govde,
      uz ? h('span', { sinif: 'kol-uzerinden', metin: uz }) : null
    ]);
  }

  function satirDugmesi(s, tikla) {
    var kollar = (s.kablolar || []).map(kolSatiri);
    (s.kendineDonen || []).forEach(function (k) {
      kollar.push(h('span', { sinif: 'kol' }, ['kendine dönen kablo ', k.etiket ? kod(k.etiket) : 'etiketsiz', k.varyant ? ' (varyant)' : '']));
    });
    if (!kollar.length) kollar.push(h('span', { sinif: 'kol kol-yok', metin: 'kablo yok' }));
    var rozet = A.rozetler({ supheli: s.supheli, celiski: s.celiski });
    if (kollar.length && (s.kablolar || []).some(function (k) { return k.kenar && k.kenar.beyinListesi && k.kenar.beyinListesi.length; })) rozet.push(A.rozet('not', 'BEYİN LİSTESİ FARKLI'));
    var yer = (s.soket != null ? 'soket ' + s.soket + ' ' : '') + 'pin ' + (s.pin === null ? '(yazılı değil)' : s.pin);
    return h('button', { type: 'button', sinif: 'pin-satir', 'aria-label': yer + (s.pinAdi ? ' ' + s.pinAdi : '') + ': pinin izini aç', onclick: function () { tikla(s); } }, [
      h('b', { sinif: 'pin-no' }, s.pin === null ? '—' : A.bel(s.pin)),
      h('span', { sinif: 'pin-satir-metin' }, [
        s.pinAdi ? h('span', { sinif: 'pin-satir-ad' }, A.bel(s.pinAdi)) : null,
        kollar,
        rozet.length ? h('span', { sinif: 'satir-rozet' }, rozet) : null
      ]),
      A.ikon('i-sag', 'sag')
    ]);
  }

  function grup(baslikParcalari, sayiYazisi, satirlar, tikla) {
    var bant = h('div', { sinif: 'soket-bas' }, [A.ikon('i-soket'), h('span', { sinif: 'soket-bas-ad' }, baslikParcalari), h('span', { sinif: 'soket-bas-say', metin: sayiYazisi })]);
    return h('section', { sinif: 'soket-grup' }, [bant, h('div', { sinif: 'pin-liste' }, satirlar.map(function (s) { return satirDugmesi(s, tikla); }))]);
  }
  function sayiMetni(adet, pinSayisi) {
    return adet + ' pin' + (pinSayisi ? ' · ' + pinSayisi + ' pinli' : '');
  }

  /** q: CihazSorgusu | SoketSorgusu. sec: { tikla(satir), yapiskanUst } → pin tablosu (Node). */
  A.pinTablosu = function (q, sec) {
    var tikla = sec.tikla;
    var gruplar = [];
    if (q.tur === 'cihaz') {
      q.soketler.forEach(function (g) {
        gruplar.push(grup(g.soket == null ? 'Soketsiz uçlar' : g.soket, sayiMetni(g.satirlar.length, g.soket == null ? null : g.pinSayisi), g.satirlar, tikla));
      });
    } else {
      q.eslesmeler.forEach(function (e) {
        var ad = [e.soket];
        if (e.cihaz) { ad.push(' · '); ad.push(e.cihaz.kod); if (e.cihaz.kisaAd) ad.push(' ' + e.cihaz.kisaAd); }
        else ad.push(' · ara soket');
        gruplar.push(grup(ad, sayiMetni(e.satirlar.length, e.pinSayisi), e.satirlar, tikla));
      });
    }
    var tablo = h('div', { sinif: 'pin-tablo' }, gruplar);
    tablo.style.setProperty('--sabit-ust', sec.yapiskanUst ? 'var(--dokunma-buyuk)' : '0px');
    return tablo;
  };

  /** Cihaz sorgusunun başlığı: tür işareti + tür etiketi + kod + adlar + sayılar. */
  A.cihazBasligi = function (q) {
    var c = q.cihaz;
    var sayi = q.soketler.filter(function (g) { return g.soket != null; }).length + ' soket · ' + q.satirSayisi + ' pin/uç';
    var adlar = [];
    if (c.kisaAd) adlar.push(h('span', { sinif: 'z-isim', metin: c.kisaAd }));
    if (c.adTr && c.adTr !== c.kisaAd) adlar.push(h('span', { sinif: 'z-isim', metin: c.adTr }));
    if (c.adDe) adlar.push(h('span', { sinif: 'z-isim z-isim-de' }, [h('span', { sinif: 'z-de', metin: 'Şemada: ' }), c.adDe]));
    var rozetler = A.rozetler({ supheli: q.supheli, dogrulandi: q.dogrulandi === true ? true : null });
    return h('div', { sinif: 'cihaz-bas' }, [
      A.tur(c.cihazTur, 'b'),
      h('div', { sinif: 'cihaz-bas-metin' }, [
        h('span', { sinif: 'z-tur', metin: A.turAd(c.cihazTur) }),
        h('h2', { sinif: 'kart-no kart-no-orta' }, A.bel(c.kod)),
        adlar,
        h('span', { sinif: 'satir-alt', metin: sayi }),
        c.cihazBilinmiyor ? h('span', { sinif: 'satir-alt', metin: 'Şemadaki bileşen listesinde yok; türü koddan çıkarıldı.' }) : null,
        rozetler.length ? h('span', { sinif: 'satir-rozet' }, rozetler) : null
      ])
    ]);
  };

  /** Soket sorgusunun başlığı. */
  A.soketBasligi = function (q) {
    var n = q.eslesmeler.length;
    return h('div', { sinif: 'cihaz-bas' }, [
      A.tur('soket', 'b'),
      h('div', { sinif: 'cihaz-bas-metin' }, [
        h('span', { sinif: 'z-tur', metin: 'SOKET' }),
        h('h2', { sinif: 'kart-no kart-no-orta' }, A.bel(q.soket)),
        n > 1 ? h('span', { sinif: 'satir-alt', metin: 'Bu adla ' + n + ' soket var; hepsi aşağıda.' }) : null
      ])
    ]);
  };
})(typeof globalThis === 'object' ? globalThis : this);
