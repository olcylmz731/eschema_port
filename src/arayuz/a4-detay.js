/* a4-detay: ayrıntı kartları (kablo / pin izi, cihaz sorgusu, soket sorgusu).
   Kart sırası (DESIGN §9): DOĞRULANMADI şeritleri → başlık + rozetler → özellik satırı → ŞÜPHELİ / ÇELİŞKİLİ şeritleri (nedenleriyle)
   → çizim (KB.diyagram) → METİN özeti (KB.metin) → kaynak satırı → okuma notları.
   Şeritler kapatılamaz, daraltılamaz. Çizim hata verirse metin yine gösterilir. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var h = A.h;

  var canli = A.canli = [];       // ekrandaki çizimler (yeniden çizimde yokEt ile sökülür)
  A.cizimleriTemizle = function () {
    while (canli.length) {
      var c = canli.pop();
      try { c.yokEt(); } catch (e) { /* önemsiz */ }
    }
  };

  /* ---------- çizim bağlantıları ---------- */
  function cizimSecenekleri(detay, sec) {
    var o = {
      onCihaz: function (kod) { A.gezinti.ac({ tur: 'cihaz', kod: kod }); },
      onSoket: function (ad, dugum) {
        var cihaz = (dugum && dugum.cihaz) || (detay.tur === 'cihaz' ? detay.kod : null);
        A.gezinti.ac({ tur: 'soket', ad: ad, cihaz: cihaz || null });
      },
      onKablo: function (anahtar) { A.gezinti.ac({ tur: 'kablo', anahtar: anahtar }); },
      yapiskanUst: sec.yapiskanUst || 0
    };
    // Pin izi (onUc) yalnız pin satırlarının asıl içerik olduğu cihaz ve soket çiziminde açık: kablo çiziminde pin kapsülü ayrı
    // dokunma hedefi olup cihaz kartına dokunmayı bozmasın (motor API §9).
    if (detay.tur === 'cihaz' || detay.tur === 'soket') o.onUc = function (ref) { A.gezinti.ac({ tur: 'uc', ref: ref }); };
    return o;
  }

  function cizimAlani(nesne, secenek, sonraListe) {
    var kap = h('div', { sinif: 'cizim' });
    sonraListe.push(function () {
      try {
        var c = KB.diyagram.ciz(kap, nesne, secenek);
        if (c) canli.push(c);
        else kap.appendChild(h('p', { sinif: 'bilgi' }, 'Çizim yapılamadı. Aşağıdaki metin yine de doğrudur.'));
      } catch (e) {
        if (kok.console && kok.console.error) kok.console.error(e);
        kap.appendChild(h('p', { sinif: 'bilgi' }, 'Çizim yapılamadı (' + e.message + '). Aşağıdaki metin yine de doğrudur.'));
      }
    });
    return kap;
  }

  /* ---------- şüphe / çelişki nedenleri ---------- */
  function ekleTekil(liste, m) { if (m && liste.indexOf(m) < 0) liste.push(m); }

  function kenarSupheNedeni(k, liste) {
    var ad = k.etiket ? 'Kablo ' + k.etiket : 'Etiketsiz tel';
    if (k.durum === 'suphe' && k.suphe && k.suphe.soru) ekleTekil(liste, (k.etiket && k.suphe.soru.indexOf(k.etiket) >= 0 ? '' : ad + ': ') + k.suphe.soru);
    else if (k.supheli) ekleTekil(liste, ad + ': etiket ya da numarada okunamayan karakter (?).');
  }
  function izSupheNedenleri(iz) {
    var n = [];
    iz.kenarlar.forEach(function (k) { if (!k.sanal) kenarSupheNedeni(k, n); });
    iz.dugumler.forEach(function (d) { if (d.belirsiz) ekleTekil(n, d.ad + ': soket, pin ya da adda okunamayan karakter (?).'); });
    if (!n.length && iz.supheli) n.push('Şemada net okunamadı.');
    return n;
  }
  function sorguSupheNedenleri(q) {
    var n = [];
    var gruplar = q.tur === 'cihaz' ? q.soketler : q.eslesmeler;
    gruplar.forEach(function (g) {
      (g.satirlar || []).forEach(function (s) {
        var yer = (g.soket ? 'soket ' + g.soket + ' ' : '') + 'pin ' + (s.pin === null ? '(yazılı değil)' : s.pin);
        if (s.belirsiz) ekleTekil(n, yer + ': okunamayan karakter (?).');
        (s.kablolar || []).forEach(function (kol) {
          var k = kol.kenar;
          if (k && k.durum === 'suphe' && k.suphe && k.suphe.soru) ekleTekil(n, yer + ' · ' + (k.etiket ? 'kablo ' + k.etiket : 'tel') + ': ' + k.suphe.soru);
          else if (k && k.supheli) ekleTekil(n, yer + ' · ' + (k.etiket ? 'kablo ' + k.etiket : 'tel') + ': okunamayan karakter (?).');
          (kol.varis || []).forEach(function (d) { if (d.belirsiz) ekleTekil(n, yer + ' → ' + d.ad + ': okunamayan karakter (?).'); });
        });
      });
    });
    if (!n.length && q.supheli) n.push('Şemada net okunamadı.');
    return n;
  }
  function celiskiNedenleri(nesne) {
    var n = [];
    (nesne.uyarilar || []).forEach(function (u) { if (u.tur === 'celiski') ekleTekil(n, u.mesaj); });
    return n;
  }
  // Cihaz / soket sorgusunda çelişki satır düzeyindedir (PinSatiri.celiski); nedeni pinin kendi izindeki uyarıdan gelir.
  function sorguCeliskiNedenleri(q) {
    var n = celiskiNedenleri(q);
    var gruplar = q.tur === 'cihaz' ? q.soketler : q.eslesmeler;
    gruplar.forEach(function (g) {
      (g.satirlar || []).forEach(function (s) {
        if (!s.celiski) return;
        var yer = (g.soket ? 'soket ' + g.soket + ' ' : '') + 'pin ' + (s.pin === null ? '(yazılı değil)' : s.pin);
        var neden = [];
        try { var iz = s.uc ? KB.izle.uc(A.db, s.uc) : null; if (iz) neden = celiskiNedenleri(iz); } catch (e) { neden = []; }
        if (!neden.length) ekleTekil(n, yer + ': şemada çelişkili okunuyor.');
        neden.forEach(function (m) { ekleTekil(n, yer + ': ' + m); });
      });
    });
    return n;
  }
  function neden(liste) {      // düz metin: '?' burada çoğunlukla gerçek bir soru işaretidir (örn. "pin 11 mi, pin 17 mi?")
    return liste.map(function (m) { return h('span', { sinif: 'neden-satir', metin: m }); });
  }
  function durumSeritleri(supheli, supheNedenleri, celiski, celiskiListesi) {
    var s = [];
    if (celiski) {
      s.push(A.serit('celiski', 'ÇELİŞKİLİ', celiskiListesi.length ? neden(celiskiListesi).concat([h('span', { sinif: 'neden-satir', metin: 'İkisi de gösteriliyor; şemadan teyit et.' })]) : 'Şemada bu kayıt çelişkili. Şemadan teyit et.'));
    }
    if (supheli) {
      s.push(A.serit('supheli', 'ŞÜPHELİ', neden(supheNedenleri).concat([h('span', { sinif: 'neden-satir', metin: 'Aracı sökmeden önce şemadan kontrol et.' })])));
    }
    return s;
  }

  /* ---------- Beyin Listesi farkları (şema esas alınır, değer değişmez; ama fark gizlenmez: kart tepesinde görünür şerit) ---------- */
  var BL_ALAN = { soket: 'soket', pin: 'pin', pinAdi: 'pin adı', hedef: 'karşı uç', kablo: 'kablo', renk: 'renk', kesit: 'kesit', cihaz: 'cihaz' };
  function blTopla(liste, yer, kenar) {
    ((kenar && kenar.beyinListesi) || []).forEach(function (c) {
      var anahtar = [yer, c.alan, c.sema, c.beyinListesi].join('|');
      if (liste.some(function (x) { return x.anahtar === anahtar; })) return;
      liste.push({ anahtar: anahtar, yer: yer, alan: c.alan, sema: c.sema, bl: c.beyinListesi, not: c.not || null });
    });
  }
  function izBeyinFarklari(iz) {
    var l = [];
    iz.kenarlar.forEach(function (k) { if (!k.sanal) blTopla(l, k.etiket ? 'kablo ' + k.etiket : 'etiketsiz tel', k); });
    if (iz.tur === 'kablo' && A.tekil(l.map(function (x) { return x.yer; })).length < 2) l.forEach(function (x) { x.yer = ''; });
    if (!l.length) (iz.uyarilar || []).forEach(function (u) { if (u.tur === 'beyin-listesi') l.push({ anahtar: u.mesaj, ham: u.mesaj, yer: '' }); });
    return l;
  }
  function sorguBeyinFarklari(q) {
    var l = [];
    (q.tur === 'cihaz' ? q.soketler : q.eslesmeler).forEach(function (g) {
      (g.satirlar || []).forEach(function (s) {
        var yer = (g.soket ? 'soket ' + g.soket + ' ' : '') + 'pin ' + (s.pin === null ? '(yazılı değil)' : s.pin);
        (s.kablolar || []).forEach(function (kol) { blTopla(l, yer, kol.kenar); });
      });
    });
    return l;
  }
  function beyinSeridi(liste) {
    if (!liste.length) return null;
    var satirlar = liste.map(function (x) {
      if (x.ham) return h('span', { sinif: 'neden-satir', metin: x.ham });
      return h('span', { sinif: 'neden-satir' }, [
        x.yer ? h('span', { sinif: 'kod', metin: x.yer }) : null, x.yer ? ' · ' : null,
        (BL_ALAN[x.alan] || x.alan) + ': Beyin Listesi’nde ', h('span', { sinif: 'kod' }, A.bel(x.bl)),
        ', şemada ', h('span', { sinif: 'kod' }, A.bel(x.sema)), '.'
      ]);
    });
    var aciklama = A.tekil(liste.map(function (x) { return x.not; }).filter(Boolean));
    var govde = satirlar.concat([h('span', { sinif: 'neden-satir', metin: 'Şema esas alındı; değer Beyin Listesi’ne göre değiştirilmedi.' })]);
    if (aciklama.length) {
      govde.push(h('details', { sinif: 'daha' }, [
        h('summary', null, 'Açıklama (' + aciklama.length + ')'),
        h('ul', { sinif: 'not-liste' }, aciklama.map(function (m) { return h('li', null, m); }))
      ]));
    }
    return A.serit('not', 'BEYİN LİSTESİ FARKLI', govde);
  }

  /* ---------- kablo özellikleri (renk / kesit) ---------- */
  function ozellikGruplari(iz) {
    var gruplar = [], harita = {};
    iz.kenarlar.forEach(function (k) {
      if (k.sanal) return;
      if (k.ic) {
        if (!harita.ic) { harita.ic = { ic: true }; gruplar.push(harita.ic); }
        return;
      }
      var anahtar = [k.renk || '', k.renkSemaNotu ? 1 : 0, k.kesit || '', k.kesitSemaNotu ? 1 : 0, k.varyant ? 1 : 0].join('|');
      var g = harita[anahtar];
      if (!g) {
        g = harita[anahtar] = { renk: k.renk, renkNot: !!k.renkSemaNotu, kesitMetni: k.kesitMetni, kesitNot: !!k.kesitSemaNotu, varyant: !!k.varyant, etiketler: [], kimlikler: [], etiketsiz: false };
        gruplar.push(g);
      }
      if (k.etiket) {
        var kim = String(k.no || k.etiket).replace(/^#/, '');        // '#4002' ve '4002' aynı numara: bir kez yazılır
        var sira = g.kimlikler.indexOf(kim);
        if (sira < 0) { g.kimlikler.push(kim); g.etiketler.push(k.etiket); }
        else if (k.etiket.charAt(0) === '#' && g.etiketler[sira].charAt(0) !== '#') g.etiketler[sira] = k.etiket;
      } else g.etiketsiz = true;
    });
    return gruplar.filter(function (g) { return g.ic || g.renk || g.kesitMetni || g.varyant; });
  }
  function ozellikSatiri(g) {
    if (g.ic) {
      return h('li', { sinif: 'ozellik' }, [h('span', { sinif: 'ozellik-ic' }, [A.ikon('d-ic', 'ik-k'), 'Cihaz içi bağlantı (kablo değil)'])]);
    }
    var etiketler = g.etiketler.slice();
    if (g.etiketsiz) etiketler.push('etiketsiz');
    var kendi = [], not = [];
    if (g.renk) (g.renkNot ? not : kendi).push(A.renkCipi(g.renk, true));
    if (g.kesitMetni) (g.kesitNot ? not : kendi).push(h('span', { sinif: 'kesit', metin: g.kesitMetni }));
    var degerler = [];
    kendi.forEach(function (x) { degerler.push(x); });
    if (not.length) {
      var nb = [A.ikon('i-not', 'ik-k')];
      not.forEach(function (x, i) { if (i) nb.push(' · '); nb.push(x); });
      nb.push(h('span', { sinif: 'nota-yazi', metin: '(şema notu)' }));
      degerler.push(h('span', { sinif: 'nota' }, nb));
    }
    if (g.varyant) degerler.push(A.rozet('varyant'));
    return h('li', { sinif: 'ozellik' }, [
      h('span', { sinif: 'ozellik-etiket kod', metin: etiketler.join(' · ') }),
      h('span', { sinif: 'ozellik-deger' }, degerler)
    ]);
  }
  function ozellikListesi(iz) {
    var g = ozellikGruplari(iz);
    if (!g.length) return null;
    return h('ul', { sinif: 'ozellik-liste', 'aria-label': 'Renk ve kesit' }, g.map(ozellikSatiri));
  }

  /* ---------- METİN özeti ---------- */
  function metinKutusu(iz) {
    var satirlar = [];
    try { satirlar = KB.metin.satirlar(iz); } catch (e) { satirlar = ['Metin üretilemedi.']; }
    var kutu = h('section', { sinif: 'ozet', 'aria-label': 'Metin özeti' }, [h('h3', { sinif: 'ozet-baslik', metin: 'METİN' })]);
    satirlar.forEach(function (s) {
      var bosluk = (s.match(/^ */) || [''])[0].length;
      var duz = s.replace(/^ +/, '');
      kutu.appendChild(h('p', { sinif: 'ozet-satir kod g' + Math.min(4, Math.round(bosluk / 2)) }, A.bel(duz)));
    });
    return kutu;
  }

  /* ---------- okuma notları (kapalı; ŞÜPHELİ / ÇELİŞKİLİ buraya konmaz) ---------- */
  var NOT_UYARI_TURLERI = { 'cevrim': 1, 'belirsiz-devam': 1, 'ozellik': 1, 'varyant': 1 };
  function notKutusu(m) {
    if (!m.length) return null;
    return h('details', { sinif: 'daha notlar' }, [
      h('summary', null, 'Okuma notları (' + m.length + ')'),
      h('ul', { sinif: 'not-liste' }, m.map(function (x) { return h('li', null, [h('b', { sinif: 'kod', metin: x.baslik }), ' ', x.metin]); }))
    ]);
  }
  function notlar(iz) {
    var m = [];
    iz.kenarlar.forEach(function (k) {
      if (k.sanal || !k.not) return;
      var baslik = k.etiket || 'etiketsiz tel';
      var anahtar = baslik + '|' + k.not;
      if (!m.some(function (x) { return x.anahtar === anahtar; })) m.push({ anahtar: anahtar, baslik: baslik, metin: k.not });
    });
    (iz.uyarilar || []).forEach(function (u) {
      if (!NOT_UYARI_TURLERI[u.tur]) return;
      var anahtar = u.tur + '|' + u.mesaj;
      if (!m.some(function (x) { return x.anahtar === anahtar; })) m.push({ anahtar: anahtar, baslik: 'Not', metin: u.mesaj });
    });
    return notKutusu(m);
  }
  // Cihaz / soket sorgusu: çizimdeki not çipleri kısaltılabilir; tam metin burada (pin satırının ilk kablosunun şema notu).
  function sorguNotlari(q) {
    var m = [];
    (q.tur === 'cihaz' ? q.soketler : q.eslesmeler).forEach(function (g) {
      (g.satirlar || []).forEach(function (s) {
        var yer = (g.soket ? 'soket ' + g.soket + ' ' : '') + 'pin ' + (s.pin === null ? '(yazılı değil)' : s.pin);
        (s.kablolar || []).forEach(function (kol) {
          var k = kol.kenar;
          if (!k || k.sanal || !k.not) return;
          var baslik = yer + (k.etiket ? ' · kablo ' + k.etiket : '');
          var anahtar = baslik + '|' + k.not;
          if (!m.some(function (x) { return x.anahtar === anahtar; })) m.push({ anahtar: anahtar, baslik: baslik, metin: k.not });
        });
      });
    });
    return notKutusu(m);
  }

  function kabloIsareti(iz) { return iz.kablo && (iz.kablo.etiket || iz.kablo.no) ? (iz.kablo.etiket || iz.kablo.no) : iz.baslik; }

  /* ---------- kablo / pin izi ---------- */
  function izKarti(detay, iz, sec, sonra) {
    var dogrulanmadi = A.dogrulanmadiSeritleri(iz.dogrulanmamisSemalar);
    var varyant = iz.kenarlar.some(function (k) { return k.varyant && !k.sanal; });
    var rozetler = A.rozetler({ supheli: iz.supheli, celiski: iz.celiski, varyant: varyant, dogrulandi: iz.dogrulandi === true ? true : null });

    var bas;
    var baslik;
    if (iz.tur === 'kablo') {
      baslik = 'Kablo ' + kabloIsareti(iz);
      bas = h('div', { sinif: 'kart-bas' }, [
        h('div', { sinif: 'kart-bas-metin' }, [h('span', { sinif: 'z-tur', metin: 'KABLO' }), h('h2', { sinif: 'kart-no' }, A.bel(kabloIsareti(iz)))]),
        rozetler.length ? h('div', { sinif: 'kart-etiketler' }, rozetler) : null
      ]);
    } else {
      var s = iz.sorgu || {};
      var etiket = 'PİN', kod = '', kapsul = null;
      var pinAdi = null;
      iz.dugumler.forEach(function (d) {
        if (pinAdi || d.tur !== 'cihaz') return;
        if (d.cihaz === s.cihaz && d.soket === (s.soket === undefined ? null : s.soket) && d.pin === s.pin) pinAdi = d.pinAdi;
      });
      if (s.cihaz) { kod = s.cihaz; kapsul = A.pinKapsul(s.soket, s.pin, pinAdi); }
      else if (s.soket) { etiket = 'ARA SOKET PİNİ'; kod = s.soket; kapsul = A.pinKapsul(null, s.pin, null); }
      else if (s.dugum) { etiket = 'DÜĞÜM'; kod = s.dugum; }
      else { etiket = 'UÇ'; kod = iz.baslik; }
      baslik = 'Pin ' + kod;
      bas = h('div', { sinif: 'kart-bas' }, [
        h('div', { sinif: 'kart-bas-metin' }, [h('span', { sinif: 'z-tur', metin: etiket }), h('h2', { sinif: 'kart-no' }, A.bel(kod)), kapsul]),
        rozetler.length ? h('div', { sinif: 'kart-etiketler' }, rozetler) : null
      ]);
    }

    var sinirSerit = [];
    if (iz.sinirAsildi) {
      var sm = (iz.uyarilar || []).filter(function (u) { return u.tur === 'sinir'; }).map(function (u) { return u.mesaj; });
      sinirSerit.push(A.serit('not', 'ÇİZİM KISALTILDI', sm.length ? sm[0] : 'Kablo çok büyük; çizimin bir kısmı gösterilmedi.'));
    }

    var kart = h('article', { sinif: 'kart detay-kart' }, [
      dogrulanmadi,
      bas,
      ozellikListesi(iz),
      durumSeritleri(iz.supheli, izSupheNedenleri(iz), iz.celiski, celiskiNedenleri(iz)),
      beyinSeridi(izBeyinFarklari(iz)),
      sinirSerit,
      cizimAlani(iz, cizimSecenekleri(detay, sec), sonra),
      metinKutusu(iz),
      A.kaynakBlogu(iz.kaynaklar),
      notlar(iz)
    ]);
    return { dugum: kart, baslik: baslik };
  }

  /* ---------- cihaz / soket sorgusu ---------- */
  // Tablo (a4b-tablo) önce: bir bakışta pin → kablo → karşı uç. Çizim (motor) en altta: uzun olabilir (30 pinli beyin: binlerce piksel).
  function sorguKarti(detay, q, sec, sonra, baslik) {
    var cihazMi = q.tur === 'cihaz';
    var kaynaklar = q.kaynaklar || (q.eslesmeler || []).reduce(function (t, e) { return t.concat(e.kaynaklar || []); }, []);
    var celiski = sorguCeliskiNedenleri(q);
    var kart = h('article', { sinif: 'kart detay-kart' }, [
      A.dogrulanmadiSeritleri(q.dogrulanmamisSemalar),
      cihazMi ? A.cihazBasligi(q) : A.soketBasligi(q),
      durumSeritleri(q.supheli, sorguSupheNedenleri(q), celiski.length > 0, celiski),
      beyinSeridi(sorguBeyinFarklari(q)),
      A.pinTablosu(q, { tikla: function (satir) { A.gezinti.ac({ tur: 'uc', ref: satir.uc }); }, yapiskanUst: sec.yapiskanUst || 0 }),
      A.kaynakBlogu(kaynaklar),
      sorguNotlari(q),
      h('h3', { sinif: 'bolum-baslik', metin: 'ÇİZİM' }),
      cizimAlani(q, cizimSecenekleri(detay, sec), sonra)
    ]);
    return { dugum: kart, baslik: baslik };
  }

  function hataKarti(baslik, mesaj) {
    return { dugum: h('article', { sinif: 'kart detay-kart' }, [A.bos({ ikon: 'i-kotu', baslik: baslik, metin: mesaj, role: 'alert' })]), baslik: baslik };
  }

  /** detay → { dugum, baslik, sonra: [fn] }. dugum DOM'a eklendikten sonra sonra[] işlevleri çağrılır (çizimler genişlik ölçer). */
  A.detayKur = function (detay, sec) {
    sec = sec || {};
    var sonra = [];
    var db = A.db, sonuc;
    try {
      if (detay.tur === 'kablo') {
        var iz = KB.izle.kablo(db, detay.anahtar);
        sonuc = iz ? izKarti(detay, iz, sec, sonra) : hataKarti('Kablo bulunamadı', 'Bu kayıt veride yok: ' + detay.anahtar);
      } else if (detay.tur === 'uc') {
        var uz = KB.izle.uc(db, detay.ref);
        sonuc = uz ? izKarti(detay, uz, sec, sonra) : hataKarti('Pin bulunamadı', 'Bu pin veride yok.');
      } else if (detay.tur === 'cihaz') {
        var cq = KB.cihazSorgu.cihaz(db, detay.kod, undefined);
        sonuc = cq ? sorguKarti(detay, cq, sec, sonra, 'Cihaz ' + cq.cihaz.kod) : hataKarti('Cihaz bulunamadı', 'Bu kod veride yok: ' + detay.kod);
      } else if (detay.tur === 'soket') {
        var sq = KB.soketSorgu.soket(db, detay.ad, detay.cihaz ? { cihaz: detay.cihaz } : undefined);
        sonuc = sq ? sorguKarti(detay, sq, sec, sonra, 'Soket ' + detay.ad) : hataKarti('Soket bulunamadı', 'Bu soket veride yok: ' + detay.ad);
      } else {
        sonuc = hataKarti('Açılamadı', 'Bilinmeyen kayıt türü.');
      }
    } catch (e) {
      if (kok.console && kok.console.error) kok.console.error(e);
      sonuc = hataKarti('Bir şey ters gitti', String(e && e.message ? e.message : e));
    }
    sonuc.sonra = sonra;
    return sonuc;
  };
})(typeof globalThis === 'object' ? globalThis : this);
