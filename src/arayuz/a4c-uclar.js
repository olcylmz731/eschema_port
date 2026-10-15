/* a4c-uclar: kablo / pin izinin "UÇLAR" özeti (D1). İz nesnesinden arayüzde hesaplanır (çekirdek değişmez).
   Uç = izin gerçekten bittiği ya da bir cihaza bağlandığı yer: cihaz ucu, başka şemaya giden DEVAM, ucu açık ara soket / ek noktası.
   Ara soket, ek noktası ve geçiş bileşenleri (sigorta / diyot / direnç / şalter) "yolda" sayılır, listeye girmez.
   Sıra: 1) aranan numaranın bulunduğu uç, 2) beyin / kumanda, 3) kalanlar (iz sırasıyla). Aynı cihazın birden çok pini tek satırdadır. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};

  function sayisal(id) { return parseInt(String(id).replace(/\D/g, ''), 10) || 0; }

  function ucMu(d) {
    if (d.tur === 'cihaz') return !d.gecisUcu;
    if (d.tur === 'devam') return true;
    return !!d.acik;              // ara soket / ek noktası: yalnız öbür tarafı şemada yoksa uç sayılır
  }

  /** iz → satır dizisi (DOM yok). db: cihaz adı / türü için (KB.veri.cihaz). Her satır:
      { anahtar, tur: 'cihaz'|'devam'|'soket'|'dugum', kod, cihazTur, ad, pinler:[{soket,pin,pinAdi,belirsiz,eksik}],
        etiket: 'BAŞKA ŞEMADA'|'UCU AÇIK'|'DEVAM'|null, ayrinti: string|null, aranan, beyin, icBaglanti, git: detay|null } */
  A.uclariBul = function (iz, db) {
    var dugum = {}, komsu = {};
    iz.dugumler.forEach(function (d) { dugum[d.id] = d; komsu[d.id] = []; });
    iz.kenarlar.forEach(function (e) {
      if (komsu[e.a] && komsu[e.b]) { komsu[e.a].push(e.b); komsu[e.b].push(e.a); }
    });

    // aranan numaralı kenarlar (kablo sorgusu) ya da sorgulanan pin (uç sorgusu): BFS başlangıcı
    var bas = [];
    if (iz.tur === 'kablo' && iz.kablo) {
      iz.kenarlar.forEach(function (e) {
        if (e.sanal || e.ic) return;
        var uyar = iz.kablo.no ? e.no === iz.kablo.no : (!e.no && e.etiket === iz.kablo.etiket);
        if (uyar) { bas.push(e.a); bas.push(e.b); }
      });
    } else {
      iz.bilesenler.forEach(function (b) { var o = b.odak || b.baslangic; if (o) bas.push(o); });
    }
    var mesafe = {}, kuyruk = [];
    bas.forEach(function (id) { if (mesafe[id] === undefined) { mesafe[id] = 0; kuyruk.push(id); } });
    for (var q = 0; q < kuyruk.length; q++) {
      var id = kuyruk[q];
      komsu[id].forEach(function (k) { if (mesafe[k] === undefined) { mesafe[k] = mesafe[id] + 1; kuyruk.push(k); } });
    }
    var enYakin = Infinity;
    iz.dugumler.forEach(function (d) { if (ucMu(d) && mesafe[d.id] !== undefined && mesafe[d.id] < enYakin) enYakin = mesafe[d.id]; });

    // cihaz içi köprü (ic): aynı cihazın iki pini
    var icCihaz = {};
    iz.kenarlar.forEach(function (e) {
      if (!e.ic) return;
      var a = dugum[e.a], b = dugum[e.b];
      if (a && b && a.tur === 'cihaz' && b.tur === 'cihaz' && a.cihaz === b.cihaz) icCihaz[a.cihaz] = true;
    });

    var satirlar = [], harita = {};
    function cihazBilgi(kod) {
      var c = null;
      try { c = db ? KB.veri.cihaz(db, kod) : null; } catch (e) { c = null; }
      return c;
    }
    iz.dugumler.forEach(function (d) {
      if (!ucMu(d)) return;
      var anahtar, s;
      if (d.tur === 'cihaz') anahtar = 'c:' + d.cihaz;
      else if (d.tur === 'devam') anahtar = 'd:' + (d.hedefCihaz || d.hedef || d.id);
      else if (d.tur === 'soket') anahtar = 's:' + d.soket;
      else anahtar = 'k:' + d.id;
      s = harita[anahtar];
      var aranan = mesafe[d.id] !== undefined && mesafe[d.id] === enYakin;
      if (!s) {
        s = harita[anahtar] = { anahtar: anahtar, sira: sayisal(d.id), tur: d.tur, kod: '', cihazTur: null, ad: '', pinler: [], etiket: null, ayrinti: null,
                                aranan: false, beyin: false, icBaglanti: false, git: null };
        satirlar.push(s);
        if (d.tur === 'cihaz') {
          s.kod = d.cihaz; s.cihazTur = d.cihazTur; s.ad = d.kisaAd || d.adTr || d.adDe || '';
          s.git = { tur: 'cihaz', kod: d.cihaz };
          s.beyin = d.cihazTur === 'beyin';
        } else if (d.tur === 'devam') {
          var c = d.hedefCihaz ? cihazBilgi(d.hedefCihaz) : null;
          s.kod = d.hedefCihaz || '';
          s.cihazTur = c ? c.cihazTur : null;
          s.ad = c ? (c.kisaAd || c.adTr || c.adDe || '') : (d.hedefCihazAd || '');
          s.beyin = !!(c && c.cihazTur === 'beyin');
          if (d.sayfaIci) { s.etiket = 'DEVAM'; s.ayrinti = 'aynı sayfada, yol ' + d.hedef; }
          else {
            s.etiket = 'BAŞKA ŞEMADA';
            if (!d.hedefCihaz && d.hedef) s.ayrinti = 'hedef: ' + d.hedef;
            else s.ayrinti = 'şeması henüz eklenmedi';
          }
          if (d.hedefCihaz && c) s.git = { tur: 'cihaz', kod: d.hedefCihaz };
        } else if (d.tur === 'soket') {
          s.kod = d.soket; s.cihazTur = 'soket'; s.etiket = 'UCU AÇIK'; s.ayrinti = 'öbür taraf şemada yok';
          s.git = { tur: 'soket', ad: d.soket, cihaz: null };
        } else {
          s.kod = d.kodsuz ? 'EK NOKTASI' : 'EK NOKTASI ' + d.kod; s.cihazTur = 'dugum'; s.etiket = 'UCU AÇIK'; s.ayrinti = 'öbür taraf şemada yok';
        }
      }
      if (aranan) s.aranan = true;
      if (d.tur === 'cihaz') {
        var eksik = d.pin === null || d.pin === undefined;
        s.pinler.push({ soket: d.soket, pin: d.pin, pinAdi: d.pinAdi, belirsiz: !!d.belirsiz, eksik: eksik && d.adresEksik !== false });
        if (icCihaz[d.cihaz]) s.icBaglanti = true;
      } else if (d.tur === 'soket') {
        s.pinler.push({ soket: d.soket, pin: d.pin, pinAdi: null, belirsiz: !!d.belirsiz, eksik: false });
      }
    });

    // sıra: aranan uç → beyin / kumanda → kalanlar; her grupta iz sırası
    satirlar.forEach(function (s) { s.grup = s.aranan ? 0 : (s.beyin ? 1 : 2); });
    satirlar.sort(function (x, y) { return x.grup - y.grup || x.sira - y.sira; });
    return satirlar;
  };
})(typeof globalThis === 'object' ? globalThis : this);
