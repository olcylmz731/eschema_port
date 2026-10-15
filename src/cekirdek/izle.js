/* izle: kablo/pin → ara soketlerden, ek noktalarından ve devam uçlarından geçen zincir ve dallar (VERI-MODELI §4).
   Çıktı "iz" nesnesi çizime elverişlidir: dugumler + kenarlar + bilesenler (zincir / ağaç / yıldız). DOM yok.
   Kurallar özeti (ayrıntı: API.md §11):
   - Uç anahtarı aynı olan uçlar birleşir (cihaz: cihaz+soket+pin; ara soket: soket+pin; ek noktası: kod).
   - Cihaz pininde yalnız aynı numaralı (grup anahtarlı) parçalar buluşur; ek olarak etiketli parçanın pinindeki etiketsiz parça onun dalıdır
     (tersi değil). Ara soket ve ek noktasında numaraya bakılmaz.
   - devam uçları: önce karşılıklı eşleşen iki devam ucu tek eklem olur ve çökertilir; sonra tek başına cihaz gösteren devam,
     aynı numaralı bir parçanın o cihazdaki tek ucuna bağlanır. Belirsizse bağlanmaz, uyarı verilir.
   - geçiş bileşenleri (sigorta/diyot/direnç/şalter, veride tam iki terminal): iki terminal arasına SANAL parça girer (kenar.sanal);
     cihaz içi köprü (ic) cihaz pininde numara aranmadan buluşur; iki ucu aynı olan parça (kendineDonen) yapıya girmez, işaretli taşınır. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.izle = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function norm(s) { return mod('normalize').norm(s); }
  function pinKimligi(s) { return mod('normalize').pin(s); }   // pin kimliği: tire/artı korunur (B- ≠ B); veri.js ucAnahtari ile aynı kural
  function kabloAnahtari(s) { return mod('normalize').kabloAnahtari(s); }
  function belirsiz(s) { return mod('normalize').belirsiz(s); }
  function dogal(a, b) { return mod('normalize').dogal(a, b); }
  function tekil(d) { return mod('normalize').tekil(d); }
  function ic() { return mod('veri').ic; }

  var VARSAYILAN_MAKS = 150;

  // ---- küçük araçlar ---------------------------------------------------------------------------------
  function kume(dizi) {
    var k = {};
    (dizi || []).forEach(function (x) { k[x] = true; });
    return k;
  }

  function yeniUF(n) {
    var ata = [];
    for (var i = 0; i < n; i++) ata[i] = i;
    function bul(x) {
      while (ata[x] !== x) { ata[x] = ata[ata[x]]; x = ata[x]; }
      return x;
    }
    function birlestir(a, b) {
      a = bul(a); b = bul(b);
      if (a === b) return;
      if (a < b) ata[b] = a; else ata[a] = b; // küçük indeks kök: kararlı sonuç
    }
    return { bul: bul, birlestir: birlestir };
  }

  function ilkDolu(dizi) {
    for (var i = 0; i < dizi.length; i++) if (dizi[i] != null) return dizi[i];
    return null;
  }

  // ---- devam eşleştirme ------------------------------------------------------------------------------
  /** devam ucu u, q parçasını gösteriyor mu? (q'nun gerçek ucu u'nun gösterdiği cihazda ya da q, u'nun gösterdiği sayfa/yolda) */
  function eslesir(u, q) {
    if (u.cihazN) {
      for (var i = 0; i < 2; i++) {
        var v = q.uclar[i];
        if (v.tur === 'cihaz' && v.cihazN === u.cihazN) return true;
      }
    }
    if (u.hedefP && q.izgara.sayfa === u.hedefP.sayfa && q.yolN === u.hedefP.yol) return true;
    return false;
  }

  /** p parçasının devam ucu u için, aynı kablo grubundan cevap verebilecek diğer parçalar. */
  function devamAdaylari(db, p, u) {
    if (!p.grup) return [];
    var g = db._kablo[p.grup];
    if (!g) return [];
    var c = [];
    for (var i = 0; i < g.parcalar.length; i++) {
      var q = g.parcalar[i];
      if (q !== p && eslesir(u, q)) c.push(q);
    }
    return c;
  }

  // ---- 1. genişletme ----------------------------------------------------------------------------------
  /** Geçiş bileşeninin iki terminalinde de (şema süzgecinden geçen) en az bir gerçek uç var mı? */
  function gecisUygun(g, semaKume) {
    if (!semaKume) return true;
    return g.terminaller.every(function (t) {
      return t.uclar.some(function (x) { return semaKume[x.p.sema] === true; });
    });
  }

  function genislet(db, tohumlar, semaKume, maks) {
    var dahil = [], dahilUid = {}, kuyruk = [], sinir = false, kesik = {};
    function ekle(p, kaynakUc) {
      if (dahilUid[p.uid] === true) return;
      if (!p.sanal && semaKume && semaKume[p.sema] !== true) return;
      if (dahil.length >= maks) { sinir = true; if (kaynakUc) kesik[kaynakUc] = true; return; }
      dahilUid[p.uid] = true;
      dahil.push(p);
      kuyruk.push(p);
    }
    tohumlar.forEach(function (p) { ekle(p, null); });
    for (var h = 0; h < kuyruk.length; h++) {
      var p = kuyruk[h];
      if (p.sanal) {
        // sanal parça: iki terminalindeki bütün gerçek parçalar (öbür tarafta numaraya bakılmaz)
        for (var j = 0; j < 2; j++) {
          p.uclar[j].gercek.forEach(function (x) { ekle(x.p, p.uid + '#' + j); });
        }
        continue;
      }
      for (var i = 0; i < 2; i++) {
        var u = p.uclar[i], kaynakUc = p.uid + '#' + i;
        if (u.tur === 'devam') {
          devamAdaylari(db, p, u).forEach(function (q) { ekle(q, kaynakUc); });
          continue;
        }
        if (u.vkey) {
          var komsular = db._vertex[u.vkey] || [];
          for (var k = 0; k < komsular.length; k++) {
            var q = komsular[k].p;
            if (q === p) continue;
            // cihaz pininde yalnız aynı numaralı parçalar buluşur (cihaz içi köprü hariç); ara soket ve ek noktasında numaraya bakılmaz.
            // Tek ek: etiketli bir parçanın cihaz pinindeki ETİKETSİZ parça onun dalıdır (şemada etiket pin başına bir kez yazılır:
            // 04A03 HS10'da "4002" → X08.11/1 ve etiketsiz → 42A01). Tersi yok: etiketsiz parça pinde etiketli parça çekmez (iz şişmesin).
            if (u.tur === 'cihaz' && !(p.grup && (q.grup === p.grup || !q.grup)) && !p.ic && !q.ic) continue;
            ekle(q, kaynakUc);
          }
        }
        // geçiş bileşeni terminali: sanal parça iz içine girer, öbür terminale oradan geçilir
        if (u.gecisKod) {
          var g = db._gecis[u.gecisKod];
          if (g && gecisUygun(g, semaKume)) ekle(g.sanal, kaynakUc);
        }
      }
    }
    return { parcalar: dahil, sinirAsildi: sinir, kesikUclar: kesik };
  }

  // ---- 2. uçları birleştirme (slot = 2*parçaIndeksi + uçIndeksi) ------------------------------------------
  function baglanti(parcalar) {
    var n = parcalar.length, S = 2 * n;
    var uf = yeniUF(S);
    function u(s) { return parcalar[s >> 1].uclar[s & 1]; }
    function p(s) { return parcalar[s >> 1]; }

    var ilk = {};
    for (var s = 0; s < S; s++) {
      var anahtar = u(s).vkey;
      if (!anahtar) continue;
      if (ilk[anahtar] === undefined) ilk[anahtar] = s; else uf.birlestir(s, ilk[anahtar]);
    }

    // sanal parçanın iki ucu, temsil ettiği terminalin (izde bulunan) gerçek uçlarıyla birleşir (pin adsız terminaller için de)
    var indeks = {};
    parcalar.forEach(function (q, k) { indeks[q.uid] = k; });
    parcalar.forEach(function (q, k) {
      if (!q.sanal) return;
      for (var j = 0; j < 2; j++) {
        q.uclar[j].gercek.forEach(function (x) {
          var kx = indeks[x.p.uid];
          if (kx !== undefined) uf.birlestir(2 * k + j, 2 * kx + x.i);
        });
      }
    });

    var devamlar = [];
    for (s = 0; s < S; s++) if (u(s).tur === 'devam') devamlar.push(s);

    var belirsizDevam = []; // { slot, adaylar: [uid…] }
    var cozuldu = {}, belirsizSlot = {};

    // 2a) karşılıklı eşleşen iki devam ucu = bir eklem (sayfa/şema geçişi)
    var aday = {};
    devamlar.forEach(function (s1) {
      aday[s1] = [];
      devamlar.forEach(function (s2) {
        if ((s2 >> 1) === (s1 >> 1)) return;
        var p1 = p(s1), p2 = p(s2);
        if (!p1.grup || p1.grup !== p2.grup) return;
        if (eslesir(u(s1), p2) && eslesir(u(s2), p1)) aday[s1].push(s2);
      });
    });
    devamlar.forEach(function (s1) {
      var a = aday[s1];
      if (a.length === 1 && aday[a[0]].length === 1 && aday[a[0]][0] === s1) {
        if (s1 < a[0]) uf.birlestir(s1, a[0]);
        cozuldu[s1] = true; cozuldu[a[0]] = true;
      } else if (a.length >= 1 && !cozuldu[s1]) {
        // tek taraflı ya da birden çok aday: bağlanmaz
        var tumu = a.slice();
        if (a.length > 1 || aday[a[0]].length !== 1) {
          belirsizSlot[s1] = true;
          belirsizDevam.push({ slot: s1, adaylar: tumu.map(function (x) { return p(x).uid; }) });
        }
      }
    });

    // 2b) tek başına cihaz gösteren devam ucu → aynı numaralı parçanın o cihazdaki tek ucu
    devamlar.forEach(function (s1) {
      if (cozuldu[s1] || belirsizSlot[s1]) return;
      var u1 = u(s1), p1 = p(s1);
      if (!u1.cihazN || !p1.grup) return;
      var adaylar = [];
      for (var s2 = 0; s2 < S; s2++) {
        if ((s2 >> 1) === (s1 >> 1)) continue;
        var v = u(s2);
        if (p(s2).grup === p1.grup && v.tur === 'cihaz' && v.cihazN === u1.cihazN) adaylar.push(s2);
      }
      if (!adaylar.length) return;
      var siniflar = tekil(adaylar.map(function (x) { return uf.bul(x); }));
      if (siniflar.length === 1) {
        if (uf.bul(s1 ^ 1) !== uf.bul(adaylar[0])) { uf.birlestir(s1, adaylar[0]); cozuldu[s1] = true; }
      } else {
        belirsizSlot[s1] = true;
        belirsizDevam.push({ slot: s1, adaylar: adaylar.map(function (x) { return p(x).uid; }) });
      }
    });

    return { uf: uf, S: S, belirsizDevam: belirsizDevam };
  }

  // ---- 3. graf: eklemleri çökert, paralel kenarları birleştir ------------------------------------------------
  function grafKur(parcalar, bag) {
    var uf = bag.uf, S = bag.S, n = parcalar.length;
    var kok = [];
    for (var s = 0; s < S; s++) kok[s] = uf.bul(s);
    function devamMi(x) { return parcalar[x >> 1].uclar[x & 1].tur === 'devam'; }

    var sinifSlot = {};
    for (s = 0; s < S; s++) (sinifSlot[kok[s]] = sinifSlot[kok[s]] || []).push(s);

    // eklem: yalnız devam uçlarından oluşan, iki farklı parçayı bağlayan sınıf
    var eklem = {};
    Object.keys(sinifSlot).forEach(function (r) {
      var sl = sinifSlot[r];
      if (sl.length === 2 && devamMi(sl[0]) && devamMi(sl[1]) && (sl[0] >> 1) !== (sl[1] >> 1)) eklem[r] = true;
    });

    // eklemlerle uç uca gelen parçalar tek tel (tek kenar) olur
    var pu = yeniUF(n);
    Object.keys(eklem).forEach(function (r) { pu.birlestir(sinifSlot[r][0] >> 1, sinifSlot[r][1] >> 1); });
    var teller = {}, telSirasi = [];
    for (var k = 0; k < n; k++) {
      var r0 = pu.bul(k);
      if (!teller[r0]) { teller[r0] = []; telSirasi.push(r0); }
      teller[r0].push(k);
    }
    var kenarlar = [];
    function tekKenar(uyeler, serbestA, serbestB) {
      kenarlar.push({ ka: kok[serbestA], kb: kok[serbestB], parcalar: uyeler.map(function (x) { return parcalar[x]; }) });
    }
    telSirasi.forEach(function (r0) {
      var uyeler = teller[r0];
      if (uyeler.length === 1) { tekKenar(uyeler, 2 * uyeler[0], 2 * uyeler[0] + 1); return; }
      var serbest = [];
      uyeler.forEach(function (x) {
        [2 * x, 2 * x + 1].forEach(function (sl) { if (!eklem[kok[sl]]) serbest.push(sl); });
      });
      if (serbest.length === 2) { tekKenar(uyeler, serbest[0], serbest[1]); return; }
      // beklenmeyen (halka ya da dallanan eklem): çökertme, her parça ayrı kenar; eklemler düğüm olarak kalır
      uyeler.forEach(function (x) {
        [2 * x, 2 * x + 1].forEach(function (sl) { delete eklem[kok[sl]]; });
        tekKenar([x], 2 * x, 2 * x + 1);
      });
    });

    // paralel (aynı iki düğüm, aynı grup) kenarlar tek kenarda birleşir
    var gorulen = {}, birlesik = [];
    kenarlar.forEach(function (e) {
      var a = Math.min(e.ka, e.kb), b = Math.max(e.ka, e.kb);
      var grup = e.parcalar[0].grup || ('~' + e.parcalar[0].uid);
      var anahtar = a + '-' + b + '|' + grup;
      if (gorulen[anahtar] !== undefined) {
        var hedef = birlesik[gorulen[anahtar]];
        e.parcalar.forEach(function (q) { hedef.parcalar.push(q); });
      } else {
        gorulen[anahtar] = birlesik.length;
        birlesik.push(e);
      }
    });

    // düğümler: kenar uçlarındaki sınıflar, ilk görünme sırasıyla
    var dugumler = [], sinifDugum = {};
    function dugumDe(r) {
      if (sinifDugum[r] === undefined) {
        sinifDugum[r] = dugumler.length;
        dugumler.push({ kok: r, slotlar: sinifSlot[r].slice() });
      }
      return sinifDugum[r];
    }
    var son = birlesik.map(function (e) {
      return { a: dugumDe(e.ka), b: dugumDe(e.kb), parcalar: e.parcalar.sort(function (x, y) { return x.sira - y.sira; }) };
    });
    return { dugumler: dugumler, kenarlar: son, sinifSlot: sinifSlot };
  }

  // ---- 4. düğüm ve kenar nesneleri -------------------------------------------------------------------------------
  function cihazAdi(d) { return d.kisaAd ? d.kisaAd + ' (' + d.cihaz + ')' : d.cihaz; }

  function dugumAdi(d) {
    if (d.tur === 'cihaz') return cihazAdi(d);
    if (d.tur === 'soket') return d.soket;
    if (d.tur === 'dugum') return d.kodsuz ? 'ek noktası (kodsuz' + (d.kodsuzNo ? ' #' + d.kodsuzNo : '') + ')' : 'ek noktası ' + d.kod;
    var hedef = d.hedefCihaz
      ? (d.hedefCihazAd ? d.hedefCihazAd + ' (' + d.hedefCihaz + ')' : d.hedefCihaz)
      : (d.sayfaIci ? 'yol ' + d.hedef : 'sayfa/yol ' + d.hedef);
    return 'devam → ' + hedef;
  }

  function dugumNesnesi(db, nd, parcalar, kesikUclar) {
    var slotlar = nd.slotlar;
    var uclar = slotlar.map(function (s) { return parcalar[s >> 1].uclar[s & 1]; });
    var gercekTum = uclar.filter(function (u) { return u.tur !== 'devam'; });
    // sanal parçanın ucu yalnız başka uç yoksa kaynak olur (alanlar gerçek uçlardan gelir)
    var gercek = gercekTum.filter(function (u) { return !u.sanalUc; });
    if (!gercek.length) gercek = gercekTum;
    var d = { id: null, tur: gercek.length ? gercek[0].tur : 'devam', ad: null };
    var kayit;
    if (d.tur === 'cihaz') {
      var kod = gercek[0].cihaz;
      kayit = db._cihaz[gercek[0].cihazN];
      d.cihaz = kayit ? kayit.kod : kod;
      d.cihazTur = kayit ? kayit.cihazTur : ic().turdenKod(kod);
      d.kisaAd = kayit ? kayit.kisaAd : null;
      d.adTr = kayit ? kayit.adTr : null;
      d.adDe = kayit ? kayit.adDe : null;
      d.cihazBilinmiyor = kayit ? kayit.cihazBilinmiyor : true;
      d.soket = ilkDolu(gercek.map(function (u) { return u.soket; }));
      d.pin = ilkDolu(gercek.map(function (u) { return u.pin; }));
      d.pinAdi = ilkDolu(gercek.map(function (u) { return u.pinAdi; }));
      d.adresEksik = d.pin == null;
      d.gecisUcu = uclar.some(function (u) { return u.sanalUc === true; });   // bir geçiş bileşeninin (sigorta/diyot/direnç/şalter) ucu
    } else if (d.tur === 'soket') {
      d.soket = gercek[0].soket;
      d.pin = ilkDolu(gercek.map(function (u) { return u.pin; }));
    } else if (d.tur === 'dugum') {
      d.kod = gercek[0].kod;
      d.kodsuz = d.kod.charAt(0) === '~';
    } else {
      d.hedefCihaz = ilkDolu(uclar.map(function (u) { return u.cihaz; }));
      d.hedefCihazAd = null;
      if (d.hedefCihaz) {
        var h = db._cihaz[norm(d.hedefCihaz)];
        if (h) { d.hedefCihaz = h.kod; d.hedefCihazAd = h.kisaAd; }
      }
      d.hedef = ilkDolu(uclar.map(function (u) { return u.hedef; }));
      d.sayfaIci = !d.hedefCihaz && uclar.some(function (u) { return u.yolNo != null; });   // hedef yalnız yol numarası ("74"): aynı sayfada devam ediyor
      d.cozuldu = slotlar.length >= 2;
    }
    d.belirsiz = uclar.some(function (u) { return u.belirsiz === true; });
    d.derece = 0; d.yaprak = false; d.dal = false; d.acik = false;
    d.kesik = slotlar.some(function (s) { return kesikUclar[parcalar[s >> 1].uid + '#' + (s & 1)] === true; });
    d.celiski = false;
    d.digerKablolar = [];
    d.kenarlar = [];
    d.kendineDonen = [];
    var kaynakSlotlari = slotlar.filter(function (s) { return !parcalar[s >> 1].sanal; });
    if (!kaynakSlotlari.length) kaynakSlotlari = slotlar;   // yalnız sanal uç kaldıysa (sınır): sanal parçanın kendi yeri
    d.kaynaklar = ic().kaynakTekil(db, kaynakSlotlari.map(function (s) { return ic().kaynak(db, parcalar[s >> 1]); }));
    d.ham = tekil(uclar.map(function (u) { return u.ham; }));
    // sıralama anahtarı (çıktıya girmez)
    nd.vkey = gercek.length ? gercek[0].vkey : null;
    nd.beyin = d.tur === 'cihaz' && d.cihazTur === 'beyin';
    nd.anahtar = d.tur === 'cihaz' ? 'C ' + d.cihaz + ' ' + (d.soket || '') + ' ' + (d.pin || '')
      : d.tur === 'soket' ? 'S ' + d.soket + ' ' + (d.pin || '')
      : d.tur === 'dugum' ? 'D ' + d.kod
      : 'V ' + (d.hedefCihaz || '') + ' ' + (d.hedef || '');
    nd.tur = d.tur;
    return d;
  }

  var DURUM_SIRASI = { eslesti: 0, cozuldu: 1, suphe: 2 };

  /** Geçiş bileşeninin sanal kenarı: kablo değildir; yer bilgisi bileşen listesindeki yoldur (API.md §4.9). */
  function sanalKenarNesnesi(db, p, baglam) {
    var r = db._cihaz[norm(p.bilesen.kod)];
    var kaynaklar = r ? ic().cihazKaynaklari(db, r).filter(function (k) { return baglam.izSemalar[k.sema] === true; }) : [];
    if (!kaynaklar.length) {
      // bileşen listesinde yeri yok: uçlarındaki (ize girmiş) gerçek parçaların yeri
      p.uclar.forEach(function (u) {
        u.gercek.forEach(function (x) { if (baglam.dahilUid[x.p.uid] === true) kaynaklar.push(ic().kaynak(db, x.p)); });
      });
    }
    if (!kaynaklar.length) kaynaklar.push(ic().kaynak(db, p));
    kaynaklar = ic().kaynakTekil(db, kaynaklar);
    var dg = ic().dogrulandiMi(db, tekil(kaynaklar.map(function (k) { return k.sema; })));
    return {
      id: null, a: null, b: null,
      etiket: null, etiketler: [], no: null, isaret: null,
      renk: null, renkAd: null, renkParcalari: [], renkSemaNotu: false,
      kesit: null, kesitMetni: null, kesitSemaNotu: false,
      varyant: false, durum: 'eslesti', suphe: null, supheli: false, not: null,
      kaynak: kaynaklar[0], kaynaklar: kaynaklar, parcalar: [p.uid],
      dogrulandi: dg.dogrulandi, celiski: false, beyinListesi: [], geri: false,
      sanal: true,
      bilesen: {
        kod: p.bilesen.kod, tur: p.bilesen.tur, turAd: p.bilesen.turAd, ad: p.bilesen.ad,
        kisaAd: p.bilesen.kisaAd, adTr: p.bilesen.adTr, adDe: p.bilesen.adDe, cihazBilinmiyor: p.bilesen.cihazBilinmiyor
      },
      ic: false, kendineDonen: false, soketIci: false
    };
  }

  function kenarNesnesi(db, ed, uyarilar, baglam) {
    var ps = ed.parcalar;
    if (ps.length === 1 && ps[0].sanal) return sanalKenarNesnesi(db, ps[0], baglam);
    var R = mod('renkler');
    var ef = ps.map(function (p) { return R.etkin(p, db.semalar[p.sema] ? db.semalar[p.sema].varsayilan : null); });
    function sec(alan, notAlani) {
      for (var i = 0; i < ef.length; i++) if (ef[i][alan] != null && !ef[i][notAlani]) return ef[i];
      for (i = 0; i < ef.length; i++) if (ef[i][alan] != null) return ef[i];
      return ef[0];
    }
    var rs = sec('renk', 'renkSemaNotu'), ks = sec('kesit', 'kesitSemaNotu');
    var etiketler = tekil(ps.map(function (p) { return p.etiket; }));
    var kaynaklar = ic().kaynakTekil(db, ps.map(function (p) { return ic().kaynak(db, p); }));
    var durum = 'eslesti';
    ps.forEach(function (p) { if ((DURUM_SIRASI[p.durum] || 0) > DURUM_SIRASI[durum]) durum = p.durum; });
    var suphe = null;
    ps.forEach(function (p) { if (!suphe && p.suphe) suphe = p.suphe; });
    var notlar = tekil(ps.map(function (p) { return p.not; }));
    var semalar = tekil(ps.map(function (p) { return p.sema; }));
    var bl = [];
    ps.forEach(function (p) { p.bl.forEach(function (c) { bl.push({ alan: c.alan, sema: c.sema, beyinListesi: c.beyinListesi, not: c.not == null ? null : c.not, parca: p.uid }); }); });
    // aynı iletkenin farklı yerlerde çeliştirilen değerleri
    var ozelRenk = tekil(ps.map(function (p) { return p.renk; })), ozelKesit = tekil(ps.map(function (p) { return p.kesit; }));
    var yer = etiketler[0] ? 'Kablo ' + etiketler[0] : 'Etiketsiz kablo';
    if (ozelRenk.length > 1) uyarilar.push({ tur: 'ozellik', onem: 'uyari', mesaj: yer + ': renk iki yerde farklı yazılmış (' + ozelRenk.join(' / ') + ').', kenar: null, _ed: ed });
    if (ozelKesit.length > 1) uyarilar.push({ tur: 'ozellik', onem: 'uyari', mesaj: yer + ': kesit iki yerde farklı yazılmış (' + ozelKesit.join(' / ') + ').', kenar: null, _ed: ed });
    var varyantlar = tekil(ps.map(function (p) { return p.varyant; }));
    if (varyantlar.length > 1) uyarilar.push({ tur: 'varyant', onem: 'uyari', mesaj: yer + ': aynı iletken bir yerde kesikli (varyant), başka yerde düz çizilmiş.', kenar: null, _ed: ed });
    ps.forEach(function (p) {
      p.bl.forEach(function (c) {
        uyarilar.push({
          tur: 'beyin-listesi', onem: 'uyari', kenar: null, _ed: ed,
          mesaj: "Beyin Listesi'nde " + c.alan + ' "' + c.beyinListesi + '", şemada "' + c.sema + '" (şema esas alındı).' + (c.not ? ' ' + c.not : '')
        });
      });
    });
    var dg = ic().dogrulandiMi(db, semalar);
    var icKenar = ps.some(function (p) { return p.ic; });   // cihaz içi köprü: kablo değil, renk/kesit (şema notu dahil) yok
    // iki ucu da aynı cihazın AYNI soketinde (farklı pinler): numaralı, aranabilir bir kablodur (ic değil); yalnız "aynı soket içinde köprü" diye işaretlenir
    var soketIci = !icKenar && ps.every(function (p) {
      var a = p.uclar[0], b = p.uclar[1];
      return !p.kendineDonen && a.tur === 'cihaz' && b.tur === 'cihaz' && a.cihazN === b.cihazN &&
        a.soket != null && b.soket != null && norm(a.soket) === norm(b.soket);
    });
    return {
      id: null, a: null, b: null,
      etiket: etiketler[0] || null, etiketler: etiketler, no: ilkDolu(ps.map(function (p) { return p.no; })),
      isaret: ps.some(function (p) { return p.isaret; }) ? ilkDolu(ps.map(function (p) { return p.isaret; })) : null,
      renk: icKenar ? null : rs.renk, renkAd: icKenar ? null : rs.renkAd, renkParcalari: icKenar ? [] : rs.renkParcalari, renkSemaNotu: icKenar ? false : rs.renkSemaNotu,
      kesit: icKenar ? null : ks.kesit, kesitMetni: icKenar ? null : ks.kesitMetni, kesitSemaNotu: icKenar ? false : ks.kesitSemaNotu,
      varyant: ps.some(function (p) { return p.varyant; }),
      durum: durum, suphe: suphe,
      supheli: ps.some(function (p) { return p.durum === 'suphe' || belirsiz(p.etiket) || belirsiz(p.no); }),
      not: notlar.length ? notlar.join(' / ') : null,
      kaynak: kaynaklar[0], kaynaklar: kaynaklar, parcalar: ps.map(function (p) { return p.uid; }),
      dogrulandi: dg.dogrulandi, celiski: false, beyinListesi: bl, geri: false,
      sanal: false, bilesen: null, ic: icKenar, kendineDonen: false, soketIci: soketIci
    };
  }

  // ---- 5. bileşenler: kök, ağaç, zincir, yıldız --------------------------------------------------------------------
  // Zincirin hangi uçtan başlayacağı: gerçek uçlar önce (devam yaprağı sona), beyin olmayan önce (kaynak → beyin),
  // sonra cihaz < ara soket < ek noktası, eşitlikte doğal sıra.
  function yaprakSirasi(nodes, x, y) {
    var a = nodes[x], b = nodes[y];
    var da = a.tur === 'devam', db = b.tur === 'devam';
    if (da !== db) return da ? 1 : -1;
    if (a.beyin !== b.beyin) return a.beyin ? 1 : -1;
    var ta = { cihaz: 0, soket: 1, dugum: 2, devam: 3 }[a.tur], tb = { cihaz: 0, soket: 1, dugum: 2, devam: 3 }[b.tur];
    if (ta !== tb) return ta - tb;
    return dogal(a.anahtar, b.anahtar) || (x - y);
  }

  function bilesenleriBul(N, adj) {
    var gorulen = [], bilesenler = [];
    for (var i = 0; i < N; i++) {
      if (gorulen[i]) continue;
      var uyeler = [], kuyruk = [i];
      gorulen[i] = true;
      for (var h = 0; h < kuyruk.length; h++) {
        var x = kuyruk[h];
        uyeler.push(x);
        adj[x].forEach(function (k) { if (!gorulen[k.diger]) { gorulen[k.diger] = true; kuyruk.push(k.diger); } });
      }
      uyeler.sort(function (p, q) { return p - q; });
      bilesenler.push(uyeler);
    }
    return bilesenler;
  }

  /** Kökten derinlik öncelikli ağaç (kararlı komşu sırası), çocuklar en küçük yaprak anahtarına göre sıralanır. */
  function agacKur(kokIdx, adj, nodes) {
    var ziyaret = {}, kullanildi = {}, geri = [], yon = {};
    function git(u, ustKenar) {
      var d = { dugum: u, kenar: ustKenar, cocuklar: [] };
      ziyaret[u] = true;
      var komsular = adj[u].slice().sort(function (x, y) {
        return dogal(nodes[x.diger].anahtar, nodes[y.diger].anahtar) || (x.kenar - y.kenar);
      });
      komsular.forEach(function (k) {
        if (kullanildi[k.kenar]) return;
        kullanildi[k.kenar] = true;
        if (ziyaret[k.diger]) { geri.push({ kenar: k.kenar, a: u, b: k.diger }); return; }
        yon[k.kenar] = [u, k.diger];
        d.cocuklar.push(git(k.diger, k.kenar));
      });
      return d;
    }
    var kokAgac = git(kokIdx, null);
    function minYaprak(d) {
      if (!d.cocuklar.length) return nodes[d.dugum].anahtar;
      var en = null;
      d.cocuklar.forEach(function (c) { var m = minYaprak(c); if (en === null || dogal(m, en) < 0) en = m; });
      return en;
    }
    function sirala(d) {
      d.cocuklar.forEach(sirala);
      var anahtarlar = d.cocuklar.map(function (c) { return { c: c, m: minYaprak(c) }; });
      anahtarlar.sort(function (x, y) { return dogal(x.m, y.m) || (x.c.kenar - y.c.kenar); });
      d.cocuklar = anahtarlar.map(function (x) { return x.c; });
    }
    sirala(kokAgac);
    return { agac: kokAgac, geri: geri, yon: yon };
  }

  function onSira(agac, dugumler, kenarlar) {
    dugumler.push(agac.dugum);
    if (agac.kenar !== null) kenarlar.push(agac.kenar);
    agac.cocuklar.forEach(function (c) { onSira(c, dugumler, kenarlar); });
  }

  function bilesenKur(uyeler, adj, derece, nodes, odakIdx, baslangicIdx) {
    var uyeKume = kume(uyeler.map(String));
    var icinde = function (x) { return x != null && uyeKume[String(x)] === true; };
    var dal = uyeler.some(function (x) { return derece[x] >= 3; });

    // kök
    var kokIdx;
    if (icinde(baslangicIdx)) kokIdx = baslangicIdx;
    else if (icinde(odakIdx)) kokIdx = odakIdx;
    else {
      var yapraklar = uyeler.filter(function (x) { return derece[x] === 1; });
      var adaylar = (yapraklar.length ? yapraklar : uyeler).slice().sort(function (x, y) { return yaprakSirasi(nodes, x, y); });
      kokIdx = adaylar[0];
    }

    var t = agacKur(kokIdx, adj, nodes);
    var dongu = t.geri.length > 0;
    var b = { kok: kokIdx, odak: icinde(odakIdx) ? odakIdx : null, uyeler: uyeler, agac: t.agac, geri: t.geri, yon: t.yon, dal: dal, dongu: dongu };

    // zincir (dal ve çevrim yoksa)
    b.zincir = null; b.zincirKenarlari = null;
    if (!dal && !dongu) {
      var uclar = uyeler.filter(function (x) { return derece[x] === 1; });
      if (uyeler.length === 1) {
        b.zincir = [uyeler[0]]; b.zincirKenarlari = [];   // tek düğüm (yalnız kendine dönen kenarı olan uç)
      } else if (uclar.length === 2) {
        var bas = uclar.indexOf(kokIdx) >= 0 ? kokIdx : uclar.slice().sort(function (x, y) { return yaprakSirasi(nodes, x, y); })[0];
        var zincir = [bas], kenarlar = [], onceki = -1, simdi = bas;
        for (;;) {
          var sonraki = null;
          for (var i = 0; i < adj[simdi].length; i++) {
            if (adj[simdi][i].kenar !== onceki) { sonraki = adj[simdi][i]; break; }
          }
          if (!sonraki) break;
          kenarlar.push(sonraki.kenar);
          zincir.push(sonraki.diger);
          onceki = sonraki.kenar; simdi = sonraki.diger;
          if (derece[simdi] === 1) break;
        }
        b.zincir = zincir; b.zincirKenarlari = kenarlar;
      }
    }

    // yıldız: tek dallanma düğümü, çevrim yok
    b.merkez = null; b.yildiz = null;
    if (dal) {
      var dalliler = uyeler.filter(function (x) { return derece[x] >= 3; });
      dalliler.sort(function (x, y) { return (derece[y] - derece[x]) || dogal(nodes[x].anahtar, nodes[y].anahtar); });
      b.merkez = dalliler[0];
      if (dalliler.length === 1 && !dongu) {
        var kollar = adj[b.merkez].map(function (k) {
          var dugumler = [], kenarlar2 = [], kenar = k.kenar, simdi2 = k.diger;
          for (;;) {
            dugumler.push(simdi2); kenarlar2.push(kenar);
            if (derece[simdi2] !== 2) break;
            var sn = adj[simdi2].filter(function (x) { return x.kenar !== kenar; })[0];
            kenar = sn.kenar; simdi2 = sn.diger;
          }
          return { dugumler: dugumler, kenarlar: kenarlar2 };
        });
        kollar.sort(function (x, y) {
          return dogal(nodes[x.dugumler[x.dugumler.length - 1]].anahtar, nodes[y.dugumler[y.dugumler.length - 1]].anahtar);
        });
        b.yildiz = kollar;
      }
    }
    return b;
  }

  // ---- 6. çelişkiler ----------------------------------------------------------------------------------------
  function ilgiliCeliskiler(db, dahilUid, gruplar) {
    return db._celiskiler.filter(function (c) {
      if (c.tur === 'pin-numara') return c.parcalar.some(function (uid) { return dahilUid[uid] === true; });
      return gruplar[c.anahtar] === true;
    });
  }

  // ---- 7. asıl kurucu --------------------------------------------------------------------------------------------
  function kurIz(db, kimlik, tohumlar, odak, opts) {
    opts = opts || {};
    var maks = opts.maksKenar > 0 ? opts.maksKenar : VARSAYILAN_MAKS;
    var semaKume = opts.semalar && opts.semalar.length ? kume(opts.semalar) : null;
    if (semaKume) tohumlar = tohumlar.filter(function (p) { return semaKume[p.sema] === true; });
    if (!tohumlar.length) return null;

    var g = genislet(db, tohumlar, semaKume, maks);
    var parcalar = g.parcalar;
    var bag = baglanti(parcalar);
    var graf = grafKur(parcalar, bag);
    var uyarilar = [];

    // izde bulunan gerçek (sanal olmayan) parçalar
    var dahilUid = {}, gruplar = {}, gercekSemalar = [];
    parcalar.forEach(function (p) {
      if (p.sanal) return;
      dahilUid[p.uid] = true;
      if (p.grup) gruplar[p.grup] = true;
      if (gercekSemalar.indexOf(p.sema) < 0) gercekSemalar.push(p.sema);
    });
    var baglam = { izSemalar: kume(gercekSemalar), dahilUid: dahilUid };

    // düğüm nesneleri
    var nodes = graf.dugumler;
    var dugumNes = nodes.map(function (nd) { return dugumNesnesi(db, nd, parcalar, g.kesikUclar); });
    var kenarNes = graf.kenarlar.map(function (ed) { return kenarNesnesi(db, ed, uyarilar, baglam); });

    // komşuluk ve derece. Kendine dönen kenar (iki ucu aynı düğüm) yapıya girmez: derece, ağaç, zincir, çevrim hesabını bozmaz.
    var N = nodes.length;
    var adj = [], derece = [], dongular = [];
    for (var i = 0; i < N; i++) { adj[i] = []; derece[i] = 0; }
    graf.kenarlar.forEach(function (ed, ei) {
      if (ed.a === ed.b) { dongular.push(ei); return; }
      adj[ed.a].push({ kenar: ei, diger: ed.b }); adj[ed.b].push({ kenar: ei, diger: ed.a });
      derece[ed.a]++; derece[ed.b]++;
    });
    dugumNes.forEach(function (d, x) {
      d.derece = derece[x];
      d.yaprak = derece[x] === 1;
      d.dal = derece[x] >= 3;
      d.acik = (d.tur === 'soket' || d.tur === 'dugum') && derece[x] === 1 && !d.kesik;
    });

    // odak ve başlangıç düğümleri
    function dugumBul(ozellik) {
      if (!ozellik) return null;
      for (var x = 0; x < N; x++) {
        var nd = nodes[x], d = dugumNes[x];
        if (ozellik.vkey && nd.vkey === ozellik.vkey) return x;
        if (ozellik.slot !== undefined && nd.slotlar.indexOf(ozellik.slot) >= 0) return x;
        if (ozellik.cihazKodu && d.tur === 'cihaz' && norm(d.cihaz) === ozellik.cihazKodu) return x;
        if (ozellik.soketAdi && d.tur === 'soket' && norm(d.soket) === ozellik.soketAdi) return x;
      }
      return null;
    }
    var odakIdx = null;
    if (odak) {
      if (odak.vkey) odakIdx = dugumBul({ vkey: odak.vkey });
      else if (odak.uid) {
        var pi = -1;
        for (var q = 0; q < parcalar.length; q++) if (parcalar[q].uid === odak.uid) { pi = q; break; }
        if (pi >= 0) {
          var kokSlot = bag.uf.bul(2 * pi + odak.uc);
          for (var x2 = 0; x2 < N; x2++) if (nodes[x2].kok === kokSlot) { odakIdx = x2; break; }
        }
      }
    }
    var baslangicIdx = null;
    if (opts.baslangic) {
      var b0 = opts.baslangic;
      if (typeof b0 === 'string') baslangicIdx = dugumBul({ cihazKodu: norm(b0) }) !== null ? dugumBul({ cihazKodu: norm(b0) }) : dugumBul({ soketAdi: norm(b0) });
      else if (b0.cihaz || b0.soket) {
        var vk = b0.cihaz ? 'C|' + norm(b0.cihaz) + '|' + norm(b0.soket || '') + '|' + pinKimligi(b0.pin || '') : 'S|' + norm(b0.soket) + '|' + pinKimligi(b0.pin || '');
        baslangicIdx = dugumBul({ vkey: vk });
      }
    }

    // kodsuz ek noktalarını numarala (birden çoksa)
    var kodsuzlar = dugumNes.filter(function (d) { return d.tur === 'dugum' && d.kodsuz; });
    if (kodsuzlar.length > 1) kodsuzlar.forEach(function (d, s) { d.kodsuzNo = s + 1; });
    dugumNes.forEach(function (d) { d.ad = dugumAdi(d); });

    // bileşenler
    var uyeListeleri = bilesenleriBul(N, adj);
    var bilesenler = uyeListeleri.map(function (uyeler) {
      var bl = bilesenKur(uyeler, adj, derece, nodes, odakIdx, baslangicIdx);
      bl.kenarSayisi = graf.kenarlar.filter(function (ed) { return uyeler.indexOf(ed.a) >= 0; }).length;
      bl.kendineDonen = dongular.filter(function (ei) { return uyeler.indexOf(graf.kenarlar[ei].a) >= 0; });
      bl.ilkSlot = Math.min.apply(null, uyeler.map(function (x) { return Math.min.apply(null, nodes[x].slotlar); }));
      return bl;
    });
    bilesenler.sort(function (x, y) { return (y.kenarSayisi - x.kenarSayisi) || (x.ilkSlot - y.ilkSlot); });

    // kimlik atama: bileşen sırasıyla, ağaç ön sırasıyla
    var dugumSirasi = [], kenarSirasi = [];
    bilesenler.forEach(function (b) {
      var ds = [], ks = [];
      onSira(b.agac, ds, ks);
      b.onSiraDugum = ds;
      b.onSiraKenar = ks.concat(b.geri.map(function (x) { return x.kenar; }));
      ds.forEach(function (x) { dugumSirasi.push(x); });
      b.onSiraKenar.forEach(function (x) { kenarSirasi.push(x); });
      b.kendineDonen.forEach(function (x) { kenarSirasi.push(x); });   // kimlikleri en sonda
    });
    var dugumId = [], kenarId = [];
    dugumSirasi.forEach(function (x, s) { dugumId[x] = 'n' + (s + 1); });
    kenarSirasi.forEach(function (x, s) { kenarId[x] = 'e' + (s + 1); });

    // kenar yönleri: zincirde zincir sırası, ağaçta üstten alta, geri kenarlarda karşılaşma sırası
    var yonA = [], yonB = [];
    bilesenler.forEach(function (b) {
      if (b.zincir) {
        b.zincirKenarlari.forEach(function (ei, s) { yonA[ei] = b.zincir[s]; yonB[ei] = b.zincir[s + 1]; });
      } else {
        Object.keys(b.yon).forEach(function (ei) { yonA[ei] = b.yon[ei][0]; yonB[ei] = b.yon[ei][1]; });
      }
      b.geri.forEach(function (x) { yonA[x.kenar] = x.a; yonB[x.kenar] = x.b; });
    });

    // çelişkiler (yükleme sırasında bulunanların bu ize girenleri)
    var celiskiler = ilgiliCeliskiler(db, dahilUid, gruplar);
    celiskiler.forEach(function (c) {
      var uyari = { tur: 'celiski', onem: c.onem || 'hata', mesaj: c.mesaj, dugum: null, kenar: null };
      if (c.tur === 'pin-numara') {
        nodes.forEach(function (nd, x) { if (nd.vkey === c.vkey) { dugumNes[x].celiski = true; uyari._dugumIdx = x; } });
        graf.kenarlar.forEach(function (ed, ei) {
          if (ed.parcalar.some(function (p) { return c.parcalar.indexOf(p.uid) >= 0; })) kenarNes[ei].celiski = true;
        });
      } else {
        var kodN = c.cihaz ? norm(c.cihaz) : null, soketN = c.soket ? norm(c.soket) : null;
        nodes.forEach(function (nd, x) {
          var d = dugumNes[x];
          var dugumEslesir = (kodN && d.tur === 'cihaz' && norm(d.cihaz) === kodN) || (soketN && d.tur === 'soket' && norm(d.soket) === soketN);
          if (!dugumEslesir) return;
          var grupKenari = adj[x].some(function (k) { return graf.kenarlar[k.kenar].parcalar.some(function (p) { return p.grup === c.anahtar; }); });
          if (grupKenari) {
            d.celiski = true; if (uyari._dugumIdx === undefined) uyari._dugumIdx = x;
            adj[x].forEach(function (k) {
              if (graf.kenarlar[k.kenar].parcalar.some(function (p) { return p.grup === c.anahtar; })) kenarNes[k.kenar].celiski = true;
            });
          }
        });
      }
      uyarilar.push(uyari);
    });

    // diğer kablolar: cihaz pininde olup ize girmeyenler
    nodes.forEach(function (nd, x) {
      if (dugumNes[x].tur !== 'cihaz' || !nd.vkey) return;
      var goruldu = {};
      (db._vertex[nd.vkey] || []).forEach(function (r) {
        if (dahilUid[r.p.uid] === true || (semaKume && semaKume[r.p.sema] !== true) || goruldu[r.p.uid]) return;
        goruldu[r.p.uid] = true;
        dugumNes[x].digerKablolar.push({ etiket: r.p.etiket, sema: r.p.sema, parca: r.p.id });
      });
    });

    // uyarılar: devam, çevrim, sınır, açık uç
    bag.belirsizDevam.forEach(function (b) {
      var d = null;
      nodes.forEach(function (nd, x) { if (nd.slotlar.indexOf(b.slot) >= 0) d = x; });
      uyarilar.push({
        tur: 'belirsiz-devam', onem: 'uyari', kenar: null, _dugumIdx: d,
        mesaj: (d !== null ? dugumNes[d].ad : 'devam oku') + ' birden çok yere uyuyor, bağlanmadı (' + b.adaylar.join(', ') + ').'
      });
    });
    bilesenler.forEach(function (b, bi) {
      if (b.dongu) {
        uyarilar.push({ tur: 'cevrim', onem: 'uyari', kenar: null, dugum: null, mesaj: 'Kablo ' + (bilesenler.length > 1 ? 'parçası ' + (bi + 1) + ' ' : '') + 'bir çevrim oluşturuyor (' + b.geri.length + ' kenar çevrimi kapatıyor).' });
      }
    });
    if (g.sinirAsildi) {
      uyarilar.push({ tur: 'sinir', onem: 'uyari', kenar: null, dugum: null, mesaj: 'İz çok uzun: ' + maks + ' kablo parçasından sonra kesildi.' });
    }
    dugumNes.forEach(function (d, x) {
      if (d.acik) {
        uyarilar.push({
          tur: 'acik-uc', onem: 'bilgi', kenar: null, _dugumIdx: x,
          mesaj: d.tur === 'soket' ? d.ad + ' pin ' + d.pin + ': öbür tarafı şemada yok.' : d.ad + ': tek parça bağlı, öbür tarafı şemada yok.'
        });
      }
    });

    // son nesneler
    nodes.forEach(function (nd, x) { dugumNes[x].id = dugumId[x]; });
    graf.kenarlar.forEach(function (ed, ei) {
      var k = kenarNes[ei];
      k.id = kenarId[ei];
      k.a = dugumId[yonA[ei] !== undefined ? yonA[ei] : ed.a];
      k.b = dugumId[yonB[ei] !== undefined ? yonB[ei] : ed.b];
      // kendine dönen kenar (iki ucu da aynı düğüm) yalnız kendineDonen'e girer; kenarlar listesi ve derece onu saymaz (API.md §4.4)
      if (ed.b !== ed.a) { dugumNes[ed.a].kenarlar.push(k.id); dugumNes[ed.b].kenarlar.push(k.id); }
      else { k.kendineDonen = true; dugumNes[ed.a].kendineDonen.push(k.id); }
    });
    dugumNes.forEach(function (d) {
      d.kenarlar.sort(function (a, b) { return dogal(a, b); });
      d.kendineDonen.sort(function (a, b) { return dogal(a, b); });
    });
    bilesenler.forEach(function (b) {
      b.geri.forEach(function (x) { kenarNes[x.kenar].geri = true; });
    });
    // uyarıların iç başvurularını (_dugumIdx, _ed) kimliğe çevir
    uyarilar.forEach(function (u) {
      u.dugum = u._dugumIdx !== undefined && u._dugumIdx !== null ? dugumId[u._dugumIdx] : null;
      var ei = u._ed ? graf.kenarlar.indexOf(u._ed) : -1;
      u.kenar = ei >= 0 ? kenarId[ei] : null;
      delete u._dugumIdx;
      delete u._ed;
    });
    var onemSirasi = { hata: 0, uyari: 1, bilgi: 2 };
    uyarilar = uyarilar.map(function (u, s) { return { u: u, s: s }; })
      .sort(function (x, y) { return (onemSirasi[x.u.onem] - onemSirasi[y.u.onem]) || (x.s - y.s); })
      .map(function (x) { return x.u; });

    function agacNesne(a) {
      return { dugum: dugumId[a.dugum], kenar: a.kenar === null ? null : kenarId[a.kenar], cocuklar: a.cocuklar.map(agacNesne) };
    }
    var bilesenNes = bilesenler.map(function (b, bi) {
      return {
        id: 'b' + (bi + 1),
        baslangic: dugumId[b.kok],
        odak: b.odak === null ? null : dugumId[b.odak],
        dugumler: b.onSiraDugum.map(function (x) { return dugumId[x]; }),
        kenarlar: b.onSiraKenar.map(function (x) { return kenarId[x]; }),
        zincir: b.zincir ? b.zincir.map(function (x) { return dugumId[x]; }) : null,
        zincirKenarlar: b.zincirKenarlari ? b.zincirKenarlari.map(function (x) { return kenarId[x]; }) : null,
        agac: agacNesne(b.agac),
        yildiz: b.yildiz ? {
          merkez: dugumId[b.merkez],
          kollar: b.yildiz.map(function (k) {
            return { dugumler: k.dugumler.map(function (x) { return dugumId[x]; }), kenarlar: k.kenarlar.map(function (x) { return kenarId[x]; }) };
          })
        } : null,
        geriKenarlar: b.geri.map(function (x) { return kenarId[x.kenar]; }),
        kendineDonenKenarlar: b.kendineDonen.map(function (x) { return kenarId[x]; }),
        dal: b.dal, dongu: b.dongu,
        merkez: b.merkez === null ? null : dugumId[b.merkez]
      };
    });

    // iz düzeyi özetler
    var dugumSiraliNes = dugumSirasi.map(function (x) { return dugumNes[x]; });
    var kenarSiraliNes = kenarSirasi.map(function (x) { return kenarNes[x]; });
    var kaynakListe = [];
    kenarSiraliNes.forEach(function (k) { k.kaynaklar.forEach(function (s) { kaynakListe.push(s); }); });
    dugumSiraliNes.forEach(function (d) { d.kaynaklar.forEach(function (s) { kaynakListe.push(s); }); });
    var semalar = gercekSemalar.slice().sort(function (a, b) { return db._semaNo[a] - db._semaNo[b]; });
    var dg = ic().dogrulandiMi(db, semalar);

    // başlık
    var baslik;
    if (kimlik.tur === 'kablo') baslik = 'Kablo ' + kimlik.kablo.etiket;
    else {
      var etiketler = [];
      var kokId = bilesenNes[0].odak || bilesenNes[0].baslangic;
      kenarSiraliNes.forEach(function (k) { if (k.a === kokId || k.b === kokId) { if (k.etiket != null && etiketler.indexOf(k.etiket) < 0) etiketler.push(k.etiket); } });
      baslik = etiketler.length ? 'Kablo ' + etiketler.join(' / ') : 'Kablo (etiketsiz)';
    }

    return {
      tur: kimlik.tur, baslik: baslik, sorgu: kimlik.sorgu,
      kablo: kimlik.kablo ? { anahtar: kimlik.kablo.anahtar, no: kimlik.kablo.no, etiket: kimlik.kablo.etiket, isaret: kimlik.kablo.isaret, parcaSayisi: kimlik.kablo.parcalar.length } : null,
      bilesenler: bilesenNes, dugumler: dugumSiraliNes, kenarlar: kenarSiraliNes,
      dal: bilesenNes.some(function (b) { return b.dal; }), dongu: bilesenNes.some(function (b) { return b.dongu; }),
      sayilar: {
        kablo: kenarSiraliNes.filter(function (k) { return !k.sanal && !k.ic; }).length,   // kablo (kendine dönen kablolar dahil)
        sanal: kenarSiraliNes.filter(function (k) { return k.sanal; }).length,
        ic: kenarSiraliNes.filter(function (k) { return k.ic; }).length,
        kendineDonen: kenarSiraliNes.filter(function (k) { return k.kendineDonen; }).length
      },
      kaynaklar: ic().kaynakTekil(db, kaynakListe), semalar: semalar,
      dogrulandi: dg.dogrulandi, dogrulanmamisSemalar: dg.dogrulanmamisSemalar,
      supheli: kenarSiraliNes.some(function (k) { return k.supheli; }) || dugumSiraliNes.some(function (d) { return d.belirsiz; }),
      celiski: uyarilar.some(function (u) { return u.tur === 'celiski'; }),
      uyarilar: uyarilar, sinirAsildi: g.sinirAsildi
    };
  }

  // ---- 8. genel işlevler -------------------------------------------------------------------------------------------
  function bulGrup(db, anahtar) {
    if (anahtar == null) return null;
    var s = String(anahtar);
    if (db._kablo[s]) return db._kablo[s];
    var k = kabloAnahtari(s);
    if (db._kablo[k]) return db._kablo[k];
    var liste = db._kabloAra[k];
    return liste && liste.length ? liste[0] : null;
  }

  /** Kablo no / etiket / anahtar → iz. */
  function kablo(db, anahtar, opts) {
    var g = bulGrup(db, anahtar);
    if (!g) return null;
    return kurIz(db, { tur: 'kablo', sorgu: { anahtar: g.anahtar }, kablo: g }, g.parcalar.slice(), null, opts);
  }

  /** Bir uçtan (cihaz pini, ara soket pini, ek noktası, ya da anahtarsız uç) → iz. */
  function uc(db, ref, opts) {
    if (!ref) return null;
    var tohum = [], odak = null, sorgu = null, vkey = null;
    if (ref.parca != null) {
      var p = db._parcaUid[ref.parca];
      if (!p) return null;
      var i = ref.uc === 1 ? 1 : 0;
      tohum = [p]; odak = { uid: p.uid, uc: i }; sorgu = { parca: p.uid, uc: i };
    } else {
      if (ref.dugum != null) {
        var kod = String(ref.dugum);
        vkey = 'D|' + (kod.charAt(0) === '~' ? (ref.sema || '') + '|' : '') + norm(kod);
        sorgu = { dugum: kod };
      } else if (ref.cihaz != null && ref.pin != null) {
        vkey = 'C|' + norm(ref.cihaz) + '|' + norm(ref.soket || '') + '|' + pinKimligi(ref.pin);
        sorgu = { cihaz: ref.cihaz, soket: ref.soket == null ? null : ref.soket, pin: ref.pin };
      } else if (ref.soket != null && ref.pin != null) {
        vkey = 'S|' + norm(ref.soket) + '|' + pinKimligi(ref.pin);
        sorgu = { soket: ref.soket, pin: ref.pin };
      } else return null;
      var uyeler = db._vertex[vkey] || [];
      var gorulen = {};
      uyeler.forEach(function (r) { if (!gorulen[r.p.uid]) { gorulen[r.p.uid] = true; tohum.push(r.p); } });
      odak = { vkey: vkey };
    }
    if (!tohum.length) return null;
    return kurIz(db, { tur: 'uc', sorgu: sorgu, kablo: null }, tohum, odak, opts);
  }

  /** İzin ilk bileşeninin kökünden çıkan kollar: her kol için hemen karşıdaki uç, varış uçları, aradaki düğümler.
      sanal / ic: kolun ilk kenarı geçiş bileşeni içi / cihaz içi köprü mü. gecisler: kolun altında geçilen geçiş bileşenleri. */
  function kollar(iz) {
    if (!iz || !iz.bilesenler.length) return [];
    var dById = {}, kById = {};
    iz.dugumler.forEach(function (d) { dById[d.id] = d; });
    iz.kenarlar.forEach(function (k) { kById[k.id] = k; });
    var kok = iz.bilesenler[0].agac;
    return kok.cocuklar.map(function (c) {
      var varis = [], ara = [], gecisler = [];
      (function gez(a) {
        // varış = yapraklar + devamı olsa bile cihaz pinleri (HS10'dan 42A01'e devam etse de HS10 bir varıştır); geçiş bileşeninin uçları ve ara soket/ek noktaları "ara"dır
        var dg = dById[a.dugum];
        if (!a.cocuklar.length || (dg.tur === 'cihaz' && dg.gecisUcu !== true)) varis.push(dg); else ara.push(dg);
        var ke = a.kenar !== null ? kById[a.kenar] : null;
        if (ke && ke.sanal) gecisler.push({ kod: ke.bilesen.kod, tur: ke.bilesen.tur, turAd: ke.bilesen.turAd, ad: ke.bilesen.ad, kenar: ke.id });
        a.cocuklar.forEach(gez);
      })(c);
      var kenar = kById[c.kenar];
      return { kenar: kenar, karsiUc: dById[c.dugum], varis: varis, ara: ara, dal: varis.length > 1, sanal: kenar.sanal === true, ic: kenar.ic === true, gecisler: gecisler };
    });
  }

  return { kablo: kablo, uc: uc, kollar: kollar, ic: { cihazAdi: cihazAdi, dugumAdi: dugumAdi, eslesir: eslesir } };
});
