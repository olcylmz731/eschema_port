/* veri: gömülü veri paketini yükler ve dizinler (kablo no, etiket, cihaz, soket, sekme, uç anahtarı).
   Aynı kablo numarası birden çok şemada tek kabloda birleşir; her parça kendi şema/sayfa/ızgarasını korur.
   Çelişen uçlar yükleme sırasında bulunur (celiskiler). DOM yok. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var oku = node
    ? function (ad) { return require('./' + ({ cihazSorgu: 'cihaz-sorgu', soketSorgu: 'soket-sorgu' }[ad] || ad) + '.js'); }
    : function (ad) { return kok.KB[ad]; };
  var modul = kur(oku);
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.veri = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function (oku) {
  'use strict';

  var onbellek = {};
  function mod(ad) { return onbellek[ad] || (onbellek[ad] = oku(ad)); }
  function norm(s) { return mod('normalize').norm(s); }
  function pinKimligi(s) { return mod('normalize').pin(s); }   // pin kimliği: tire/artı korunur (B- ≠ B)
  function arama(s) { return mod('normalize').arama(s); }
  function kabloAnahtari(s) { return mod('normalize').kabloAnahtari(s); }
  function belirsiz(s) { return mod('normalize').belirsiz(s); }
  function dogal(a, b) { return mod('normalize').dogal(a, b); }
  function tekil(d) { return mod('normalize').tekil(d); }

  var HARF_TUR = {
    A: 'beyin', B: 'sensor', E: 'lamba', F: 'sigorta', G: 'guc', H: 'ikaz', K: 'role', M: 'motor',
    R: 'direnc', S: 'salter', V: 'diyot', W: 'toprak', X: 'soket', Y: 'valf', Z: 'dugum'
  };
  var TURLER = ['beyin', 'sensor', 'lamba', 'sigorta', 'guc', 'ikaz', 'role', 'motor', 'direnc', 'salter',
    'diyot', 'toprak', 'soket', 'valf', 'dugum', 'besleme', 'diger'];
  // Geçiş bileşenleri: iz bu türlerden (tam iki ucu varsa) geçer. Değer = metinde yazılan Türkçe tür adı.
  var GECIS_TURLERI = { sigorta: 'sigorta', diyot: 'diyot', direnc: 'direnç', salter: 'şalter' };

  /** Kod harfinden cihaz türü (bileşen listesinde olmayan kodlar için): 41A01 → A → beyin. */
  function turdenKod(kod) {
    var m = /^[0-9]*([A-Z])/.exec(norm(kod));
    return (m && HARF_TUR[m[1]]) || 'diger';
  }

  function str(x) {
    if (x == null) return null;
    var s = String(x).trim();
    return s === '' ? null : s;
  }

  // ---- ayıklama (build.py'nin yaptığının JS eşi) -------------------------------------------
  /** goruldu / emin / null alanlarını ayıklayıp yeni nesne döndürür. */
  function temizle(x) {
    if (Array.isArray(x)) return x.map(temizle);
    if (x && typeof x === 'object') {
      var c = {};
      Object.keys(x).forEach(function (k) {
        if (k === 'goruldu' || k === 'emin') return;
        var v = x[k];
        if (v === null || v === undefined) return;
        c[k] = temizle(v);
      });
      return c;
    }
    return x;
  }

  // ---- uç anahtarı (VERI-MODELI §4) -----------------------------------------------------------
  /** İki uç aynı noktada buluşuyorsa aynı anahtarı üretir. Pini/soketi yazılmayan ya da '?' içeren uç: null (hiçbir şeyle birleşmez).
      Pin kimliği pinKimligi() ile kurulur (tire/artı korunur: 'B-' ile 'B' ayrı pindir); cihaz ve soket adı norm() ile (IV-18 = IV18). */
  function ucAnahtari(sema, u) {
    if (u.tur === 'cihaz') {
      if (u.pin == null || belirsiz(u.pin) || belirsiz(u.soket) || belirsiz(u.cihaz)) return null;
      return 'C|' + norm(u.cihaz) + '|' + norm(u.soket || '') + '|' + pinKimligi(u.pin);
    }
    if (u.tur === 'soket') {
      if (u.soket == null || u.pin == null || belirsiz(u.soket) || belirsiz(u.pin)) return null;
      return 'S|' + norm(u.soket) + '|' + pinKimligi(u.pin);
    }
    if (u.tur === 'dugum') {
      if (u.kod == null || belirsiz(u.kod)) return null;
      // '~' ile başlayan kodlar şemada yazmıyor: okuyucunun yerel adı, yalnız o şemada geçerli
      return 'D|' + (u.kod.charAt(0) === '~' ? sema + '|' : '') + norm(u.kod);
    }
    return null;
  }

  function hedefCoz(h) {
    if (h == null) return null;
    var m = /^\s*(\d+)\s*\/\s*([0-9A-Za-z.~]+)\s*$/.exec(String(h));
    return m ? { sayfa: parseInt(m[1], 10), yol: m[2].replace(/^~/, '') } : null;
  }

  /** Yalnız yol numarası yazan hedef ("74"): aynı sayfadaki akım yolu. Bağlanmaz; "devam ediyor" olarak taşınır. */
  function yolNoCoz(h) {
    if (h == null) return null;
    var m = /^\s*~?(\d+[A-Za-z]?)\s*$/.exec(String(h));
    return m ? m[1] : null;
  }

  function ucKur(sema, e) {
    var tur = e && e.tur;
    if (tur !== 'cihaz' && tur !== 'soket' && tur !== 'dugum' && tur !== 'devam') return null;
    var u = { tur: tur, ham: str(e.ham) };
    if (tur === 'cihaz') {
      u.cihaz = str(e.cihaz); u.soket = str(e.soket); u.pin = str(e.pin); u.pinAdi = str(e.pinAdi);
      if (!u.cihaz) return null;
      u.cihazN = norm(u.cihaz);
      u.belirsiz = belirsiz(u.cihaz) || belirsiz(u.soket) || belirsiz(u.pin) || belirsiz(u.pinAdi);
    } else if (tur === 'soket') {
      u.soket = str(e.soket); u.pin = str(e.pin);
      if (!u.soket) return null;
      u.belirsiz = belirsiz(u.soket) || belirsiz(u.pin);
    } else if (tur === 'dugum') {
      u.kod = str(e.kod);
      if (!u.kod) return null;
      u.belirsiz = belirsiz(u.kod);
    } else {
      u.cihaz = str(e.cihaz); u.hedef = str(e.hedef);
      if (!u.cihaz && !u.hedef) return null;
      u.cihazN = u.cihaz ? norm(u.cihaz) : null;
      u.hedefP = hedefCoz(u.hedef);
      u.yolNo = u.hedefP ? null : yolNoCoz(u.hedef);
      u.belirsiz = belirsiz(u.cihaz) || belirsiz(u.hedef);
    }
    u.vkey = ucAnahtari(sema, u);
    return u;
  }

  /** Kablo grup anahtarı: numaralıysa numara, numarasızsa etiket, ikisi de yoksa null. */
  function grupAnahtari(no, etiket) {
    if (no != null && String(no) !== '') return kabloAnahtari(no);
    if (etiket != null && String(etiket) !== '') return 'etiket:' + norm(etiket);
    return null;
  }

  function soketPinSayisi(soket, ara) {
    if (ara || soket == null) return null;
    var m = /-(\d+)$/.exec(soket) || /^(\d+)$/.exec(soket);
    return m ? parseInt(m[1], 10) : null;
  }

  // ---- yükleme -------------------------------------------------------------------------------
  function yukle(paket) {
    paket = paket || {};
    var db = {
      surum: 1, imza: paket.imza || null,
      meta: { surum: paket.meta && typeof paket.meta.surum === 'string' ? paket.meta.surum : null },   // 'dagitim' | 'dogrulama' | null (build.py gömer)
      semaSirasi: [], sekmeler: [], semalar: {}, eksikSemalar: {}, istatistik: {}, ornekler: {}, uyarilar: [],
      _parcalar: [], _parcaUid: {}, _vertex: {}, _kablo: {}, _kabloListe: [], _kabloAra: {},
      _cihaz: {}, _cihazListe: [], _cihazUc: {}, _soketMap: {}, _soketListe: [], _celiskiler: [],
      _sekmeSema: {}, _semaSekme: {}, _semaNo: {}, _kaynakOnbellek: {}
    };
    var uyar = function (tur, sema, id, mesaj) { db.uyarilar.push({ tur: tur, sema: sema || null, id: id || null, mesaj: mesaj }); };

    // paket.veri: nesne ya da dizi
    var veri = {};
    if (Array.isArray(paket.veri)) {
      paket.veri.forEach(function (d) { if (d && d.sema) veri[d.sema] = d; });
    } else if (paket.veri && typeof paket.veri === 'object') {
      Object.keys(paket.veri).forEach(function (k) { veri[k] = paket.veri[k]; });
    }
    var meta = paket.semalar || {};

    // şema sırası: yapılandırma sırası, sonra yapılandırmada olmayanlar
    var sira = Object.keys(meta).filter(function (id) { return veri[id]; });
    Object.keys(veri).forEach(function (id) { if (sira.indexOf(id) < 0) sira.push(id); });
    Object.keys(meta).forEach(function (id) {
      if (!veri[id]) {
        db.eksikSemalar[id] = { id: id, ad: meta[id].ad || id, pdf: meta[id].pdf || null, sayfalar: meta[id].sayfalar || [], kapak: meta[id].kapak || [], dilim: meta[id].dilim == null ? null : meta[id].dilim };
        uyar('sema-yok', id, null, 'Şema verisi yok, atlandı: ' + id);
      }
    });
    db.semaSirasi = sira;
    sira.forEach(function (id, i) { db._semaNo[id] = i; });

    // sekmeler
    var sekmeler = Array.isArray(paket.sekmeler) && paket.sekmeler.length ? paket.sekmeler
      : sira.map(function (id) { return { id: id, ad: (meta[id] && meta[id].ad) || id, semalar: [id] }; });
    sekmeler.forEach(function (t) {
      var tum = t.semalar || [];
      var yuklu = tum.filter(function (id) { return veri[id]; });
      db.sekmeler.push({ id: t.id, ad: t.ad || t.id, semalar: yuklu, eksikSemalar: tum.filter(function (id) { return !veri[id]; }) });
      db._sekmeSema[t.id] = yuklu;
      yuklu.forEach(function (id) { if (!db._semaSekme[id]) db._semaSekme[id] = t.id; });
    });

    // her şema: meta + parçalar + cihaz listesi
    var cihazListeleri = {};
    sira.forEach(function (id) {
      var d = veri[id], m = meta[id] || {}, k = d.kaynak || {};
      db.semalar[id] = {
        id: id, ad: m.ad || id, pdf: m.pdf || k.pdf || null,
        sayfalar: m.sayfalar || k.sayfalar || [], kapak: m.kapak || [], dilim: m.dilim == null ? null : m.dilim,
        sekme: db._semaSekme[id] || null, dogrulandi: d.dogrulandi === true,
        kunye: d.kunye || null, varsayilan: d.varsayilan || null,
        parcaSayisi: 0, cihazSayisi: 0, supheSayisi: 0, celiskiSayisi: 0, icSayisi: 0, kendineDonenSayisi: 0
      };
      cihazListeleri[id] = Array.isArray(d.cihazlar) ? d.cihazlar : [];
      var bl = {};
      (Array.isArray(d.celiskiler) ? d.celiskiler : []).forEach(function (c) {
        if (c && c.kablo != null) (bl[c.kablo] = bl[c.kablo] || []).push(c);
      });
      var kablolar = Array.isArray(d.kablolar) ? d.kablolar : [];
      var kullanilanBL = {};
      kablolar.forEach(function (h, n) {
        var pid = h && h.id != null ? String(h.id) : '#' + n;
        var uid = id + ':' + pid;
        if (!h || !Array.isArray(h.uclar) || h.uclar.length !== 2) { uyar('parca-bozuk', id, pid, 'Kablo parçası atlandı: tam iki ucu yok'); return; }
        var u0 = ucKur(id, h.uclar[0]), u1 = ucKur(id, h.uclar[1]);
        if (!u0 || !u1) { uyar('parca-bozuk', id, pid, 'Kablo parçası atlandı: uç eksik ya da tanınmayan türde'); return; }
        if (db._parcaUid[uid]) { uyar('parca-tekrar', id, pid, 'Aynı kimlikli ikinci kayıt atlandı'); return; }
        var iz = h.izgara || {};
        var yol = iz.yol == null ? null : String(iz.yol);
        var p = {
          uid: uid, sema: id, id: pid,
          etiket: str(h.etiket), no: str(h.no), isaret: str(h.isaret), kesit: str(h.kesit), renk: str(h.renk),
          varyant: h.varyant === true, durum: h.durum || 'eslesti', not: str(h.not), suphe: h.suphe || null,
          izgara: { sayfa: iz.sayfa == null ? null : iz.sayfa, yol: yol, satir: iz.satir == null ? null : String(iz.satir) },
          yolN: yol == null ? null : yol.replace(/^~/, ''),
          uclar: [u0, u1], grup: null, sira: db._parcalar.length, bl: bl[pid] || [],
          ic: h.ic === true,                                        // cihaz içi köprü: kablo değil
          kendineDonen: !!(u0.vkey && u0.vkey === u1.vkey)          // iki ucu aynı soket-pin (bilinçli veri, ör. Gelenk soketi)
        };
        if (bl[pid]) kullanilanBL[pid] = true;
        // cihaz içi köprü kablo grubu kurmaz: kablo aramasında ve kablo sayılarında görünmez
        p.grup = p.ic ? null : grupAnahtari(p.no, p.etiket);
        if (p.ic) {
          db.semalar[id].icSayisi++;
          if (!(u0.tur === 'cihaz' && u1.tur === 'cihaz' && u0.cihazN === u1.cihazN)) {
            uyar('ic-uc', id, pid, 'ic:true kayıtta iki uç aynı cihazın pini değil; yine de cihaz içi bağlantı sayıldı');
          }
        }
        if (p.kendineDonen) db.semalar[id].kendineDonenSayisi++;
        p.supheli = p.durum === 'suphe' || belirsiz(p.etiket) || belirsiz(p.no) || u0.belirsiz === true || u1.belirsiz === true;
        db._parcalar.push(p);
        db._parcaUid[uid] = p;
        db.semalar[id].parcaSayisi++;
        if (p.durum === 'suphe') db.semalar[id].supheSayisi++;
        [u0, u1].forEach(function (u, i) {
          if (u.vkey) (db._vertex[u.vkey] = db._vertex[u.vkey] || []).push({ p: p, i: i });
        });
      });
      Object.keys(bl).forEach(function (kid) {
        if (!kullanilanBL[kid]) uyar('celiski-kaydi', id, kid, 'celiskiler kaydındaki kablo bulunamadı: ' + kid);
      });
    });

    kablolariKur(db);
    cihazlariKur(db, cihazListeleri);
    gecisleriKur(db);
    soketleriKur(db);
    celiskileriBul(db);
    istatistikHesapla(db);
    sekmeSayilari(db);
    return db;
  }

  /** Sekme başına sayaçlar: arayüz boş sekmeyi ("bu sistemin verisi henüz yok") ve rozetleri bunlardan çizer. */
  function sekmeSayilari(db) {
    db.sekmeler.forEach(function (t) {
      var k = {};
      t.semalar.forEach(function (s) { k[s] = true; });
      var kesisir = function (semalar) { return semalar.some(function (s) { return k[s] === true; }); };
      var parca = 0, suphe = 0, dogrulanmamis = 0;
      t.semalar.forEach(function (s) {
        parca += db.semalar[s].parcaSayisi;
        suphe += db.semalar[s].supheSayisi;
        if (!db.semalar[s].dogrulandi) dogrulanmamis++;
      });
      t.veriVar = t.semalar.length > 0;
      t.parcaSayisi = parca;
      t.kabloSayisi = db._kabloListe.filter(function (g) { return kesisir(g.semalar); }).length;
      t.cihazSayisi = db._cihazListe.filter(function (r) { return kesisir(r.semalar); }).length;
      t.supheSayisi = suphe;
      t.dogrulandi = t.semalar.length > 0 && dogrulanmamis === 0;
    });
  }

  function kablolariKur(db) {
    db._parcalar.forEach(function (p) {
      if (!p.grup) return;
      var g = db._kablo[p.grup];
      if (!g) {
        g = db._kablo[p.grup] = {
          anahtar: p.grup, no: null, etiket: null, isaret: null, etiketler: [], parcalar: [],
          semalar: [], cihazlar: [], supheli: false, celiski: false, araAnahtarlari: []
        };
        db._kabloListe.push(g);
      }
      g.parcalar.push(p);
    });
    db._kabloListe.forEach(function (g) {
      var etiketler = [], semalar = [], cihazlar = [], cihazKod = {};
      g.parcalar.forEach(function (p) {
        if (p.etiket != null && etiketler.indexOf(p.etiket) < 0) etiketler.push(p.etiket);
        if (semalar.indexOf(p.sema) < 0) semalar.push(p.sema);
        if (p.no != null && g.no == null) g.no = p.no;
        if (p.isaret) g.isaret = p.isaret;
        if (p.supheli) g.supheli = true;
        p.uclar.forEach(function (u) {
          if (u.tur === 'cihaz' && !cihazKod[norm(u.cihaz)]) { cihazKod[norm(u.cihaz)] = true; cihazlar.push(u.cihaz); }
        });
      });
      semalar.sort(function (a, b) { return db._semaNo[a] - db._semaNo[b]; });
      g.etiketler = etiketler;
      g.semalar = semalar;
      g.cihazlar = cihazlar.sort(dogal);
      // numaralıda '#' işareti ayrı alandır; numarasız etikette ('#br', '#2,5br') etiketin kendisi zaten '#' ile başlar
      g.etiket = g.no != null ? (g.isaret ? g.isaret : '') + g.no : (etiketler[0] || '');
      // arama anahtarları: numara ve her etiketin normalize hâli
      var an = [];
      if (g.no != null) an.push(kabloAnahtari(g.no));
      etiketler.forEach(function (e) { an.push(arama(e)); an.push(kabloAnahtari(e)); });
      g.araAnahtarlari = tekil(an);
      g.araAnahtarlari.forEach(function (k) {
        var liste = db._kabloAra[k] = db._kabloAra[k] || [];
        if (liste.indexOf(g) < 0) liste.push(g);
      });
    });
    db._kabloListe.sort(function (a, b) {
      // numaralılar önce, sonra etiketliler; doğal sıra ('#' sıralamayı etkilemez)
      var an = a.no != null ? 0 : 1, bn = b.no != null ? 0 : 1;
      return an !== bn ? an - bn : dogal(a.no != null ? a.no : a.etiketler[0] || '', b.no != null ? b.no : b.etiketler[0] || '');
    });
  }

  function cihazKaydi(db, kod) {
    var n = norm(kod);
    var r = db._cihaz[n];
    if (!r) {
      r = db._cihaz[n] = {
        kod: kod, kodN: n, kisaAd: null, adTr: null, adDe: null, cihazTur: null, cihazBilinmiyor: true,
        yol: {}, semalar: [], celiski: [], not: null, supheli: false, soketSayisi: 0, pinSayisi: 0, _listede: false, gecis: false
      };
      db._cihazListe.push(r);
    }
    return r;
  }

  function cihazlariKur(db, listeler) {
    var alanDegerleri = {}; // 'kodN|alan' → { sema: değer }
    function semaEkle(r, sema) {
      if (r.semalar.indexOf(sema) < 0) r.semalar.push(sema);
    }
    db.semaSirasi.forEach(function (sema) {
      (listeler[sema] || []).forEach(function (c) {
        var kod = c && str(c.kod);
        if (!kod) return;
        var r = cihazKaydi(db, kod);
        r._listede = true;
        r.cihazBilinmiyor = false;
        semaEkle(r, sema);
        r.yol[sema] = (Array.isArray(c.yol) ? c.yol : (c.yol == null ? [] : [c.yol])).map(String);
        var yeni = { kisaAd: str(c.kisaAd), adTr: str(c.adTr), adDe: str(c.adDe), cihazTur: str(c.tur), not: str(c.not) };
        if (yeni.cihazTur && TURLER.indexOf(yeni.cihazTur) < 0) yeni.cihazTur = 'diger';
        Object.keys(yeni).forEach(function (alan) {
          var v = yeni[alan];
          if (v == null) return;
          var anahtar = r.kodN + '|' + alan;
          (alanDegerleri[anahtar] = alanDegerleri[anahtar] || {})[sema] = v;
          if (r[alan] == null) r[alan] = v; // ilk dolu değer kalır (build.py'deki cihazlar.json ile aynı kural)
        });
      });
    });
    // şemalar arası alan çelişkileri
    Object.keys(alanDegerleri).forEach(function (k) {
      var degerler = alanDegerleri[k];
      var farkli = tekil(Object.keys(degerler).map(function (s) { return degerler[s]; }));
      if (farkli.length > 1) {
        var parca = k.split('|');
        db._cihaz[parca[0]].celiski.push({ alan: parca[1], degerler: degerler });
      }
    });
    // uçlardan: bilinmeyen cihaz kayıtları, uç dizini, şema listesi
    db._parcalar.forEach(function (p) {
      p.uclar.forEach(function (u, i) {
        if (u.tur !== 'cihaz') return;
        var r = cihazKaydi(db, u.cihaz);
        semaEkle(r, p.sema);
        (db._cihazUc[r.kodN] = db._cihazUc[r.kodN] || []).push({ p: p, i: i });
        if (p.supheli) r.supheli = true;
      });
    });
    db._cihazListe.forEach(function (r) {
      if (!r._listede) r.cihazTur = turdenKod(r.kod);
      else if (!r.cihazTur) r.cihazTur = 'diger';
      r.semalar.sort(function (a, b) { return db._semaNo[a] - db._semaNo[b]; });
      var soketler = {}, pinler = {};
      (db._cihazUc[r.kodN] || []).forEach(function (x) {
        var u = x.p.uclar[x.i];
        soketler[norm(u.soket || '')] = true;
        pinler[u.vkey || (x.p.uid + '#' + x.i)] = true;
      });
      r.soketSayisi = Object.keys(soketler).length;
      r.pinSayisi = Object.keys(pinler).length;
    });
    db._cihazListe.sort(function (a, b) { return dogal(a.kod, b.kod); });
    db.semaSirasi.forEach(function (sema) { db.semalar[sema].cihazSayisi = 0; });
    db._cihazListe.forEach(function (r) { r.semalar.forEach(function (s) { db.semalar[s].cihazSayisi++; }); });
  }

  // ---- geçiş bileşenleri (API.md §4.9) -----------------------------------------------------------------
  /** Türü sigorta / diyot / direnç / şalter olan ve veride TAM İKİ AYRI ucu (terminali) bulunan cihazlar için, iz o cihazdan geçebilsin diye
      iki ucu arasında "sanal parça" kurar. Terminal = aynı uç anahtarlı uçlar tek terminaldir (pinli: aynı soket+pin);
      pini yazılmayan ya da '?' içeren her uç AYRI bir terminaldir (yanlışlıkla birleşmez). İkiden az/çok terminalli cihaz (potansiyometre, 3 pinli şalter),
      cihaz içi köprü (ic) taşıyan cihaz ve başka türler geçiş sayılmaz. */
  function gecisleriKur(db) {
    db._gecis = {};
    db._cihazListe.forEach(function (r) {
      if (!Object.prototype.hasOwnProperty.call(GECIS_TURLERI, r.cihazTur)) return;
      var harita = {}, terminaller = [], icVar = false;
      (db._cihazUc[r.kodN] || []).forEach(function (x) {
        if (x.p.ic) icVar = true;
        var u = x.p.uclar[x.i];
        var an = u.vkey || (x.p.uid + '#' + x.i);
        var t = harita[an];
        if (!t) { t = harita[an] = { vkey: u.vkey || null, uclar: [] }; terminaller.push(t); }
        t.uclar.push({ p: x.p, i: x.i });
      });
      if (icVar || terminaller.length !== 2) return;
      var ucNesnesi = function (t) {
        var u = t.uclar[0].p.uclar[t.uclar[0].i], pinAdi = null;
        t.uclar.forEach(function (x) { var v = x.p.uclar[x.i]; if (pinAdi == null && v.pinAdi != null) pinAdi = v.pinAdi; });
        return {
          tur: 'cihaz', ham: null, cihaz: u.cihaz, soket: u.soket, pin: u.pin, pinAdi: pinAdi, cihazN: u.cihazN,
          belirsiz: t.uclar.some(function (x) { return x.p.uclar[x.i].belirsiz === true; }),
          vkey: t.vkey, sanalUc: true, gercek: t.uclar
        };
      };
      var turAd = GECIS_TURLERI[r.cihazTur];
      var sanal = {
        uid: 'sanal:' + r.kodN, sema: terminaller[0].uclar[0].p.sema, id: 'sanal:' + r.kodN, sanal: true, ic: false, kendineDonen: false,
        etiket: null, no: null, isaret: null, kesit: null, renk: null, varyant: false, durum: 'eslesti', not: null, suphe: null,
        izgara: { sayfa: null, yol: null, satir: null }, yolN: null,
        uclar: [ucNesnesi(terminaller[0]), ucNesnesi(terminaller[1])], grup: null, sira: -1, bl: [], supheli: false,
        bilesen: {
          kod: r.kod, tur: r.cihazTur, turAd: turAd, ad: r.kisaAd ? r.kisaAd + ' (' + r.kod + ')' : r.kod,
          kisaAd: r.kisaAd, adTr: r.adTr, adDe: r.adDe, cihazBilinmiyor: r.cihazBilinmiyor
        }
      };
      terminaller.forEach(function (t) {
        t.uclar.forEach(function (x) { x.p.uclar[x.i].gecisKod = r.kodN; });
      });
      r.gecis = true;
      db._gecis[r.kodN] = { kodN: r.kodN, kod: r.kod, tur: r.cihazTur, turAd: turAd, terminaller: terminaller, sanal: sanal };
    });
  }

  function soketleriKur(db) {
    db._parcalar.forEach(function (p) {
      p.uclar.forEach(function (u, i) {
        var ara, cihaz;
        if (u.tur === 'cihaz' && u.soket != null) { ara = false; cihaz = u.cihaz; }
        else if (u.tur === 'soket') { ara = true; cihaz = null; }
        else return;
        var anahtar = (cihaz ? norm(cihaz) : '') + '|' + norm(u.soket);
        var e = db._soketMap[anahtar];
        if (!e) {
          e = db._soketMap[anahtar] = {
            soket: u.soket, soketN: norm(u.soket), cihaz: cihaz, cihazN: cihaz ? norm(cihaz) : null, ara: ara,
            pinSayisi: soketPinSayisi(u.soket, ara), uclar: [], semalar: [], supheli: false, pinler: {}
          };
          db._soketListe.push(e);
        }
        e.uclar.push({ p: p, i: i });
        if (e.semalar.indexOf(p.sema) < 0) e.semalar.push(p.sema);
        if (p.supheli) e.supheli = true;
        if (u.pin != null) e.pinler[u.vkey || (p.uid + '#' + i)] = true;
        else e.pinler[p.uid + '#' + i] = true;
      });
    });
    db._soketListe.forEach(function (e) {
      e.semalar.sort(function (a, b) { return db._semaNo[a] - db._semaNo[b]; });
      e.bagliPinSayisi = Object.keys(e.pinler).length;
    });
    db._soketListe.sort(function (a, b) { return dogal(a.soket, b.soket) || dogal(a.cihaz || '', b.cihaz || ''); });
  }

  // ---- çelişkiler ----------------------------------------------------------------------------
  function semaAdi(db, id) { return db.semalar[id] ? db.semalar[id].ad : id; }

  function celiskileriBul(db) {
    var liste = db._celiskiler;
    var isaretle = function (grup) { if (db._kablo[grup]) db._kablo[grup].celiski = true; };

    // 1) aynı cihaz pininde farklı numaralı kablolar
    Object.keys(db._vertex).forEach(function (vk) {
      if (vk.charAt(0) !== 'C') return;
      var gruplar = [], parcalar = [];
      db._vertex[vk].forEach(function (r) {
        if (r.p.grup && r.p.grup.indexOf('etiket:') !== 0 && gruplar.indexOf(r.p.grup) < 0) gruplar.push(r.p.grup);
        if (parcalar.indexOf(r.p.uid) < 0) parcalar.push(r.p.uid);
      });
      if (gruplar.length < 2) return;
      var u = db._vertex[vk][0].p.uclar[db._vertex[vk][0].i];
      gruplar.sort(dogal);
      var semalar = tekil(parcalar.map(function (uid) { return db._parcaUid[uid].sema; }));
      liste.push({
        tur: 'pin-numara', vkey: vk, cihaz: u.cihaz, soket: u.soket, pin: u.pin, kablolar: gruplar, parcalar: parcalar, semalar: semalar,
        onem: u.soket != null ? 'hata' : 'uyari',
        mesaj: 'Aynı pinde farklı numaralı kablolar var: ' + u.cihaz + (u.soket != null ? ' soket ' + u.soket : '') + ' pin ' + u.pin + ' → ' + gruplar.join(', ') + '.'
      });
      gruplar.forEach(isaretle);
    });

    // 2) aynı numaralı kablo, aynı cihaz/sokette iki şemada ayrık (hiç ortak olmayan) uç gösteriyor
    db._kabloListe.forEach(function (g) {
      if (g.semalar.length < 2 || g.anahtar.indexOf('etiket:') === 0) return;
      var byDev = {}, adlar = {};
      g.parcalar.forEach(function (p) {
        p.uclar.forEach(function (u) {
          if (!u.vkey || u.tur === 'dugum') return;
          var dk = u.tur === 'cihaz' ? 'C|' + norm(u.cihaz) : 'S|' + norm(u.soket);
          adlar[dk] = u.tur === 'cihaz' ? u.cihaz : u.soket;
          var adres = u.tur === 'cihaz' ? norm(u.soket || '') + '/' + pinKimligi(u.pin) : pinKimligi(u.pin);
          var gosterim = u.tur === 'cihaz' ? (u.soket != null ? u.soket + '/' + u.pin : u.pin) : u.pin;
          var bySema = byDev[dk] = byDev[dk] || {};
          var s = bySema[p.sema] = bySema[p.sema] || {};
          s[adres] = gosterim;
        });
      });
      Object.keys(byDev).forEach(function (dk) {
        var semalar = Object.keys(byDev[dk]);
        if (semalar.length < 2) return;
        var ayrik = {};
        for (var i = 0; i < semalar.length; i++) {
          for (var j = i + 1; j < semalar.length; j++) {
            var a = Object.keys(byDev[dk][semalar[i]]), b = byDev[dk][semalar[j]];
            if (a.length && Object.keys(b).length && a.every(function (x) { return !Object.prototype.hasOwnProperty.call(b, x); })) {
              ayrik[semalar[i]] = true; ayrik[semalar[j]] = true;
            }
          }
        }
        var ilgili = semalar.filter(function (s) { return ayrik[s]; });
        if (ilgili.length < 2) return;
        var adresler = {};
        ilgili.forEach(function (s) { adresler[s] = Object.keys(byDev[dk][s]).map(function (k) { return byDev[dk][s][k]; }); });
        liste.push({
          tur: 'sema-uc', anahtar: g.anahtar, cihaz: dk.charAt(0) === 'C' ? adlar[dk] : null, soket: dk.charAt(0) === 'S' ? adlar[dk] : null,
          adresler: adresler, semalar: ilgili, onem: 'hata',
          mesaj: 'Kablo ' + g.etiket + ': ' + adlar[dk] + ' için şemalar farklı uç gösteriyor (' +
            ilgili.map(function (s) { return semaAdi(db, s) + ': ' + adresler[s].join(', '); }).join(' · ') + ').'
        });
        isaretle(g.anahtar);
      });
    });

    liste.forEach(function (c) { (c.semalar || []).forEach(function (s) { db.semalar[s].celiskiSayisi++; }); });
  }

  function istatistikHesapla(db) {
    var dm = 0;
    db.semaSirasi.forEach(function (id) { if (!db.semalar[id].dogrulandi) dm++; });
    var suphe = 0;
    db.semaSirasi.forEach(function (id) { suphe += db.semalar[id].supheSayisi; });
    db.istatistik = {
      sema: db.semaSirasi.length, parca: db._parcalar.length, kablo: db._kabloListe.length,
      cihaz: db._cihazListe.length, soket: db._soketListe.length, suphe: suphe, dogrulanmamisSema: dm,
      ic: db._parcalar.filter(function (p) { return p.ic; }).length,                    // cihaz içi köprü (kablo değil)
      kendineDonen: db._parcalar.filter(function (p) { return p.kendineDonen; }).length,
      gecis: Object.keys(db._gecis).length                                              // geçiş bileşeni sayısı (sigorta/diyot/direnç/şalter, tam iki uçlu)
    };
    // örnek aramalar: veriden (ilk ekranda "örnek: …"). Temiz (çelişkisiz, şüphesiz), birkaç parçalı, numaralı kablo tercih edilir.
    var kablo = null;
    var tercihler = [
      function (g) { return g.no != null && g.parcalar.length >= 2 && g.parcalar.length <= 4 && !g.celiski && !g.supheli; },
      function (g) { return g.no != null && g.parcalar.length >= 2; },
      function (g) { return g.no != null; },
      function () { return true; }
    ];
    for (var t = 0; t < tercihler.length && kablo == null; t++) {
      for (var i = 0; i < db._kabloListe.length; i++) {
        var g = db._kabloListe[i];
        if (tercihler[t](g)) { kablo = g.no != null ? g.no : g.etiket; break; }
      }
    }
    var enCihaz = null;
    db._cihazListe.forEach(function (r) {
      if (!enCihaz || r.pinSayisi > enCihaz.pinSayisi) enCihaz = r;
    });
    var soket = null;
    if (enCihaz) {
      var en = null;
      db._soketListe.forEach(function (e) {
        if (e.cihazN === enCihaz.kodN && (!en || e.bagliPinSayisi > en.bagliPinSayisi)) en = e;
      });
      if (en) soket = en.soket;
    }
    if (!soket) {
      for (var j = 0; j < db._soketListe.length; j++) { soket = db._soketListe[j].soket; break; }
    }
    db.ornekler = { kablo: kablo, cihaz: enCihaz ? enCihaz.kod : null, soket: soket };
  }

  // ---- kaynak referansı ------------------------------------------------------------------------
  function izgaraMetni(sayfa, yol, satir) {
    var d = [];
    if (sayfa != null) d.push('sayfa ' + sayfa);
    if (yol != null) d.push('yol ' + yol);
    if (satir != null) d.push('satır ' + satir);
    return d.length ? d.join(' · ') : null;
  }

  function kaynakKur(db, sema, sayfa, yol, satir, parca) {
    var s = db.semalar[sema] || { ad: sema, pdf: null, dogrulandi: false };
    var izgara = izgaraMetni(sayfa, yol, satir);
    return {
      sema: sema, semaAd: s.ad, pdf: s.pdf, sayfa: sayfa, yol: yol, satir: satir,
      kesin: !((yol != null && String(yol).charAt(0) === '~') || (satir != null && String(satir).charAt(0) === '~')),
      izgara: izgara,
      metin: [s.pdf, izgara].filter(function (x) { return x; }).join(' · '),
      dogrulandi: s.dogrulandi === true, parca: parca == null ? null : parca
    };
  }

  /** Bir kablo parçasının şemadaki yeri. */
  function kaynak(db, p) {
    var k = db._kaynakOnbellek[p.uid];
    if (!k) k = db._kaynakOnbellek[p.uid] = kaynakKur(db, p.sema, p.izgara.sayfa, p.izgara.yol, p.izgara.satir, p.id);
    return k;
  }

  /** Bir cihazın bileşen listesindeki yeri (yol; sayfa yalnız şema tek sayfalıysa bilinir). */
  function cihazKaynaklari(db, r) {
    var cikti = [];
    r.semalar.forEach(function (sema) {
      var yollar = r.yol[sema] || [];
      var s = db.semalar[sema];
      var sayfa = s && s.sayfalar && s.sayfalar.length === 1 ? s.sayfalar[0] : null;
      if (!yollar.length) return;
      yollar.forEach(function (y) { cikti.push(kaynakKur(db, sema, sayfa, y, null, null)); });
    });
    return cikti;
  }

  function kaynakSirala(db, liste) {
    return liste.slice().sort(function (a, b) {
      var d = (db._semaNo[a.sema] || 0) - (db._semaNo[b.sema] || 0);
      if (d) return d;
      d = (a.sayfa == null ? 0 : a.sayfa) - (b.sayfa == null ? 0 : b.sayfa);
      if (d) return d;
      return dogal(a.yol == null ? '' : String(a.yol).replace(/^~/, ''), b.yol == null ? '' : String(b.yol).replace(/^~/, '')) ||
        dogal(a.satir || '', b.satir || '');
    });
  }

  function kaynakTekil(db, liste) {
    var goruldu = {}, c = [];
    liste.forEach(function (k) {
      var a = k.sema + '|' + k.sayfa + '|' + k.yol + '|' + k.satir;
      if (goruldu[a]) return;
      goruldu[a] = true;
      c.push(k);
    });
    return kaynakSirala(db, c);
  }

  // ---- genel yardımcılar -------------------------------------------------------------------------
  function cihaz(db, kod) {
    var r = kod == null ? null : db._cihaz[norm(kod)];
    return r ? cihazOzeti(r) : null;
  }

  function cihazOzeti(r) {
    return {
      kod: r.kod, kisaAd: r.kisaAd, adTr: r.adTr, adDe: r.adDe, cihazTur: r.cihazTur, cihazBilinmiyor: r.cihazBilinmiyor,
      yol: r.yol, semalar: r.semalar, gecis: r.gecis === true
    };
  }

  function sekmeSemalari(db, sekmeId) {
    if (sekmeId == null || sekmeId === '') return db.semaSirasi.slice();
    return (db._sekmeSema[sekmeId] || []).slice();
  }

  function celiskiler(db) { return db._celiskiler.slice(); }

  function dogrulandiMi(db, semalar) {
    var dm = semalar.filter(function (s) { return !(db.semalar[s] && db.semalar[s].dogrulandi); });
    return { dogrulandi: dm.length === 0 && semalar.length > 0, dogrulanmamisSemalar: dm };
  }

  /** Node'a özel: klasor/semalar.json + klasor/<sema>.json. Dosyası olmayan şemayı atlar, db.uyarilar'a yazar. */
  function klasordenYukle(klasor, secenek) {
    if (typeof require !== 'function') throw new Error('klasordenYukle yalnız Node.js içindir');
    var fs = require('fs'), path = require('path');
    var cfg = JSON.parse(fs.readFileSync(path.join(klasor, 'semalar.json'), 'utf8'));
    var veri = {};
    Object.keys(cfg.semalar || {}).forEach(function (id) {
      var yol = path.join(klasor, id + '.json');
      if (!fs.existsSync(yol)) return;
      veri[id] = temizle(JSON.parse(fs.readFileSync(yol, 'utf8')));
    });
    // ham veri hiçbir not/çelişki ayıklanmadan yüklenir: içerik olarak "doğrulama" sürümüdür
    var db = yukle({ surum: 1, meta: { surum: 'dogrulama' }, sekmeler: cfg.sekmeler, semalar: cfg.semalar, veri: veri });
    if (!(secenek && secenek.sessiz)) {
      db.uyarilar.forEach(function (u) { if (u.tur === 'sema-yok') console.warn('[uyarı] ' + u.mesaj); });
    }
    return db;
  }

  return {
    yukle: yukle, klasordenYukle: klasordenYukle, temizle: temizle,
    cihaz: cihaz, sekmeSemalari: sekmeSemalari, celiskiler: celiskiler,
    // çekirdek içi yardımcılar (diğer modüller kullanır; arayüz kullanmamalı)
    ic: {
      turdenKod: turdenKod, kaynak: kaynak, cihazKaynaklari: cihazKaynaklari, kaynakTekil: kaynakTekil, kaynakSirala: kaynakSirala,
      cihazOzeti: cihazOzeti, dogrulandiMi: dogrulandiMi, ucAnahtari: ucAnahtari, grupAnahtari: grupAnahtari, izgaraMetni: izgaraMetni,
      soketPinSayisi: soketPinSayisi, semaAdi: semaAdi, GECIS_TURLERI: GECIS_TURLERI
    }
  };
});
