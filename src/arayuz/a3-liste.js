/* a3-liste: arama sonuç listesi (cihaz / soket / kablo satırları), ilk açılış, bulunamadı ve boş sekme durumları.
   Satır = tek dokunma hedefi (>= 56 px). Her satırda doğrulama / şüphe rozeti; ayrıntıda şerit (a4-detay). */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var h = A.h;

  /* ---------- satırlar ---------- */
  function semaAdlari(semalar) {
    return (semalar || []).map(A.semaAd).join(' · ');
  }
  function cihazAdi(c) {      // kısa ad (Beyin Listesi) varsa o, yoksa Türkçe ad, yoksa şemadaki Almanca ad
    return c.kisaAd || c.adTr || c.adDe || '';
  }
  function satirKabuk(oge, tur, etiketYazi, kod, govdeAlt, tikla, mark) {
    var metin = h('span', { sinif: 'satir-metin' }, [
      h('span', { sinif: 'z-tur', metin: etiketYazi }),
      h('span', { sinif: 'satir-kod' }, A.bel(kod)),
      govdeAlt
    ]);
    return h('button', { type: 'button', sinif: 'satir sonuc sonuc-' + tur, onclick: function () { tikla(oge); } },
      [mark || null, metin, A.ikon('i-sag', 'sag')]);
  }

  function rozetKumesi(oge) {
    var r = A.rozetler({ supheli: oge.supheli, celiski: oge.celiski, dogrulandi: oge.dogrulandi === true ? true : (oge.dogrulandi === false ? false : null) });
    return r.length ? h('span', { sinif: 'satir-rozet' }, r) : null;
  }

  A.satirCihaz = function (c, tikla) {
    var ad = cihazAdi(c);
    var sayi;
    if (c.soketSayisi > 0) sayi = c.soketSayisi + ' soket · ' + c.pinSayisi + ' pin';
    else if (c.pinSayisi > 0) sayi = c.pinSayisi + ' uç';
    else sayi = 'şemada bağlantısı yok';
    var alt = [
      ad ? h('span', { sinif: 'satir-ad', metin: ad }) : null,
      h('span', { sinif: 'satir-alt' }, [sayi, c.semalar && c.semalar.length ? ' · ' + semaAdlari(c.semalar) : '']),
      rozetKumesi(c)
    ];
    return satirKabuk(c, 'cihaz', A.turAd(c.cihazTur), c.kod, alt, tikla, A.tur(c.cihazTur));
  };

  A.satirSoket = function (s, tikla) {
    var adSatiri;
    if (s.ara) adSatiri = h('span', { sinif: 'satir-ad', metin: 'Ara soket (kablo demetleri arası)' });
    else adSatiri = h('span', { sinif: 'satir-ad' }, [h('b', { sinif: 'kod', metin: s.cihaz || '' }), s.cihazKisaAd ? ' ' + s.cihazKisaAd : '']);
    var kod = s.soket;
    var bagli = s.bagliPinSayisi + ' pin bağlı' + (s.pinSayisi ? ' · ' + s.pinSayisi + ' pinli soket' : '');
    var alt = [
      adSatiri,
      h('span', { sinif: 'satir-alt' }, [bagli, s.semalar && s.semalar.length ? ' · ' + semaAdlari(s.semalar) : '']),
      s.pin ? h('span', { sinif: 'satir-pin' }, [A.pinKapsul(null, s.pin, null), h('span', { sinif: 'satir-alt', metin: 'bu pinin izi açılır' })]) : null,
      rozetKumesi(s)
    ];
    return satirKabuk(s, 'soket', s.ara ? 'ARA SOKET' : 'SOKET', kod, alt, tikla, A.tur('soket'));
  };

  A.satirKablo = function (k, tikla) {
    var cihazlar = (k.cihazlar || []);
    var ilk = cihazlar.slice(0, 3);
    var uclar = null;
    if (ilk.length) {
      var parcalar = [];
      ilk.forEach(function (c, i) {
        if (i) parcalar.push(' · ');
        parcalar.push(h('b', { sinif: 'kod', metin: c.kod }));
        if (c.kisaAd) parcalar.push(' ' + c.kisaAd);
      });
      if (cihazlar.length > ilk.length) parcalar.push(' · +' + (cihazlar.length - ilk.length));
      uclar = h('span', { sinif: 'satir-ad' }, [h('span', { sinif: 'satir-on', metin: 'Cihaz uçları: ' }), parcalar]);
    }
    var alt = [
      uclar,
      h('span', { sinif: 'satir-alt' }, [A.sayi(k.parcaSayisi, 'parça') + (k.semalar && k.semalar.length ? ' · ' + semaAdlari(k.semalar) : '')]),
      rozetKumesi(k)
    ];
    return satirKabuk(k, 'kablo', 'KABLO', k.etiket, alt, tikla, null);
  };

  var GRUP = {
    cihaz: { baslik: 'CİHAZLAR', satir: A.satirCihaz },
    soket: { baslik: 'SOKETLER', satir: A.satirSoket },
    kablo: { baslik: 'KABLOLAR', satir: A.satirKablo }
  };

  /** Gruplu sonuç listesi. s: KB.ara Sonuc. sec: { tikla(oge), dahaFazla() } */
  A.sonucGruplari = function (s, sec) {
    var f = A.belge.createDocumentFragment();
    s.gruplar.forEach(function (g) {
      var oge = s[g] || [];
      if (!oge.length) return;
      var G = GRUP[g];
      var tamam = s.sayilar[g];
      var bas = h('h2', { sinif: 'grup-baslik' }, [G.baslik, h('span', { sinif: 'grup-say', metin: String(tamam) })]);
      var liste = h('ul', { sinif: 'sonuc-liste' }, oge.map(function (o) { return h('li', null, G.satir(o, sec.tikla)); }));
      var blok = h('section', { sinif: 'grup', 'aria-label': G.baslik }, [bas, liste]);
      if (tamam > oge.length) {
        blok.appendChild(h('button', { type: 'button', sinif: 'dugme daha-fazla', onclick: sec.dahaFazla }, 'Hepsini göster (' + tamam + ')'));
      }
      f.appendChild(blok);
    });
    return f;
  };

  /* ---------- şema durumu (hangi sistemlerin verisi var) ---------- */
  A.sekmeDurumu = function () {
    var db = A.db;
    var dolu = [], bos = [], eksikSema = [];
    db.sekmeler.forEach(function (t) {
      if (t.semalar.length) dolu.push(t);
      else bos.push(t);
      t.eksikSemalar.forEach(function (id) { eksikSema.push(id); });
    });
    return { dolu: dolu, bos: bos, eksikSema: eksikSema };
  };

  /** "Şeması eklenmiş: … / Henüz eklenmemiş: …" kısa gerçek durum bilgisi (neden ya da tarih uydurulmaz). */
  A.semaDurumuNotu = function () {
    var db = A.db;
    var eklenen = db.semaSirasi.map(A.semaAd);
    var eksik = [];
    db.sekmeler.forEach(function (t) { t.eksikSemalar.forEach(function (id) { eksik.push(A.semaAd(id)); }); });
    var parcalar = [];
    parcalar.push(h('p', null, [h('b', { metin: 'Şeması eklenmiş: ' }), eklenen.length ? eklenen.join(' · ') : 'henüz yok']));
    if (eksik.length) parcalar.push(h('p', null, [h('b', { metin: 'Henüz eklenmemiş: ' }), eksik.join(' · ')]));
    return h('div', { sinif: 'sema-durumu' }, parcalar);
  };

  /* ---------- ilk açılış ---------- */
  var ORNEK_ADAYLARI = [
    { etiket: 'CİHAZ KODU', degerler: ['41A01', '04A03', '01G02'] },
    { etiket: 'KABLO NUMARASI', degerler: ['4002', '1084', '1sw/rt'] },
    { etiket: 'SOKET', degerler: ['X08.11', 'IV-18'] },
    { etiket: 'ŞEMADAKİ ADLA', degerler: ['D+'] }
  ];
  function sonucuVarMi(q) {
    try { return KB.ara.ara(A.db, q, { sekme: null, limit: 1 }).toplam > 0; } catch (e) { return false; }
  }

  /** İlk açılış: nasıl aranır + örnek aramalar (yalnız gerçek veride sonuç verenler) + son aramalar. */
  A.ilkAcilis = function (sec) {
    var db = A.db;
    var cocuk = [];

    var gecmis = sec.gecmis || [];
    if (gecmis.length) {
      cocuk.push(h('div', { sinif: 'ornek-satir' }, [
        h('span', { sinif: 'z-tur', metin: 'SON ARAMALAR' }),
        h('div', { sinif: 'yan yan-orta' }, gecmis.map(function (q) { return A.oneriCipi(q, sec.ara); })),
        h('button', { type: 'button', sinif: 'dugme dugme-kucuk dugme-sakin', onclick: sec.gecmisiTemizle }, [A.ikon('i-temizle', 'ik-k'), 'Geçmişi temizle'])
      ]));
    }

    var gosterilen = 0;
    ORNEK_ADAYLARI.forEach(function (g) {
      var var_ = g.degerler.filter(sonucuVarMi);
      if (!var_.length) return;
      gosterilen += var_.length;
      cocuk.push(h('div', { sinif: 'ornek-satir' }, [
        h('span', { sinif: 'z-tur', metin: g.etiket }),
        h('div', { sinif: 'yan yan-orta' }, var_.map(function (q) { return A.oneriCipi(q, sec.ara); }))
      ]));
    });
    if (!gosterilen && db.ornekler) {
      var yedek = [db.ornekler.cihaz, db.ornekler.kablo, db.ornekler.soket].filter(Boolean);
      if (yedek.length) cocuk.push(h('div', { sinif: 'ornek-satir' }, [h('span', { sinif: 'z-tur', metin: 'ÖRNEK ARAMALAR' }), h('div', { sinif: 'yan yan-orta' }, yedek.map(function (q) { return A.oneriCipi(q, sec.ara); }))]));
    }
    cocuk.push(h('p', { sinif: 'kucuk' }, 'Büyük/küçük harf, boşluk ve tire fark etmez.'));

    return h('div', { sinif: 'ilk' }, [
      A.bos({ ikon: 'i-ara', baslik: 'Ne arıyorsun?', metin: 'Cihaz kodu, kablo numarası ya da soket yaz.', cocuk: cocuk }),
      A.semaDurumuNotu()
    ]);
  };

  /* ---------- bulunamadı ---------- */
  /** s: aramanın Sonuc'u (toplam 0). sec: { ara(q), tumunde(), tumundeSayi } */
  A.bulunamadi = function (q, sekmeAd, sec) {
    var oneriler = [];
    try { oneriler = KB.oner.oner(A.db, q, { sekme: A.durum.sekme, n: 5 }) || []; } catch (e) { oneriler = []; }
    var cocuk = [];
    if (oneriler.length) {
      cocuk.push(h('p', null, 'Şunu mu demek istediniz?'));
      cocuk.push(h('div', { sinif: 'yan yan-orta' }, oneriler.map(function (o) { return A.oneriCipi(o.sorgu, sec.ara, o.ad || null); })));
    } else {
      cocuk.push(h('p', null, 'Benzer bir kayıt bulunamadı.'));
    }
    if (sekmeAd && sec.tumundeSayi > 0) {
      cocuk.push(h('button', { type: 'button', sinif: 'dugme dugme-ana', onclick: sec.tumunde }, [A.ikon('i-ara'), 'Tüm sistemlerde ara (' + sec.tumundeSayi + ' sonuç)']));
    }
    cocuk.push(h('p', { sinif: 'kucuk' }, 'Büyük/küçük harf, boşluk ve tire fark etmez.'));
    var baslik = '“' + q + '” bulunamadı';
    return h('div', { sinif: 'ilk' }, [
      A.bos({ ikon: 'i-ara', baslik: baslik, metin: sekmeAd ? 'Aranan sistem: ' + sekmeAd : null, cocuk: cocuk, role: 'status' }),
      A.semaDurumuNotu()
    ]);
  };

  /* ---------- şeması henüz eklenmemiş sekme ---------- */
  A.bosSekme = function (sekme, sec) {
    var d = A.sekmeDurumu();
    var cocuk = [];
    if (d.dolu.length) {
      cocuk.push(h('p', null, 'Şeması eklenmiş sistemler:'));
      cocuk.push(h('div', { sinif: 'yan yan-orta' }, d.dolu.map(function (t) {
        return h('button', { type: 'button', sinif: 'oneri oneri-ad', onclick: function () { sec.sekmeSec(t.id); } }, t.ad);
      })));
    }
    return A.bos({ ikon: 'i-not', baslik: 'Bu sistemin şeması henüz eklenmedi', metin: sekme.ad + ' için kayıt yok.', cocuk: cocuk, role: 'status' });
  };

  /** Kısmen dolu sekme (ör. Kapı 1–4'te yalnız Kapı 1 var): kısa bilgi. */
  A.kismiSekmeNotu = function (sekme) {
    if (!sekme.eksikSemalar.length || !sekme.semalar.length) return null;
    return h('p', { sinif: 'bilgi' }, [
      h('b', { metin: 'Bu sistemde şu an: ' }), sekme.semalar.map(A.semaAd).join(' · '),
      '. ', h('b', { metin: 'Henüz eklenmedi: ' }), sekme.eksikSemalar.map(A.semaAd).join(' · '), '.'
    ]);
  };
})(typeof globalThis === 'object' ? globalThis : this);
