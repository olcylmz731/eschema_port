/* a5-kabuk: sayfa kabuğu. Başlık (ad + tema düğmesi), arama çubuğu, sistem sekmeleri, içerik alanı, geçmiş, durum → ekran.
   Veri: A.db (KB.veri.yukle), A.paket (ham veri paketi), A.durum (a1-durum). Kök öğeler src/index.template.html içindedir. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var h = A.h;
  var belge = kok.document;

  var GECMIS_ANAHTAR = 'kb-gecmis', TEMA_ANAHTAR = 'kb-tema', GECMIS_N = 8;
  var bellekGecmis = [];          // localStorage yoksa oturum boyunca
  var oge = {};                   // DOM öğeleri
  var sonSekmeSayfasi = null;

  function $(id) { return belge.getElementById(id); }

  /* ---------- tema ---------- */
  function sistemAcikMi() {
    try { return !!(kok.matchMedia && kok.matchMedia('(prefers-color-scheme: light)').matches); } catch (e) { return false; }
  }
  function etkinTema() {
    var t = belge.documentElement.getAttribute('data-tema');
    if (t === 'acik' || t === 'koyu') return t;
    return sistemAcikMi() ? 'acik' : 'koyu';
  }
  function temaRenginiGuncelle() {
    var meta = belge.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    try {
      var z = kok.getComputedStyle(belge.documentElement).getPropertyValue('--zemin').trim();
      if (z) meta.setAttribute('content', z);
    } catch (e) { /* önemsiz */ }
  }
  function temaDugmeleriniGuncelle() {
    var t = etkinTema();
    Array.prototype.forEach.call(belge.querySelectorAll('[data-tema-sec]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema-sec') === t ? 'true' : 'false');
    });
  }
  function temaSec(t) {
    belge.documentElement.setAttribute('data-tema', t);
    A.depo.yaz(TEMA_ANAHTAR, t);       // yazılamazsa (dosya yöneticisi) tercih yalnız bu oturumda geçerli
    temaDugmeleriniGuncelle();
    temaRenginiGuncelle();
  }
  function temaDugmesi(deger, ad, ikonId) {
    return h('button', { type: 'button', 'data-tema-sec': deger, 'aria-pressed': 'false', onclick: function () { temaSec(deger); } },
      [A.ikon('i-secili', 'sec'), A.ikon(ikonId, 'gk'), ad]);
  }

  /* ---------- geçmiş ---------- */
  function gecmisOku() {
    var ham = A.depo.al(GECMIS_ANAHTAR);
    if (ham) {
      try {
        var a = JSON.parse(ham);
        if (Array.isArray(a)) return a.filter(function (x) { return typeof x === 'string' && x; }).slice(0, GECMIS_N);
      } catch (e) { /* bozuk kayıt: yok say */ }
    }
    return bellekGecmis.slice();
  }
  function gecmisYaz(q) {
    q = String(q || '').trim();
    if (!q) return;
    var s;
    try { s = KB.ara.ara(A.db, q, { sekme: null, limit: 1 }); } catch (e) { return; }
    if (!s || s.toplam < 1) return;      // sonuç vermeyen aramalar geçmişe girmez
    var nk = KB.normalize.norm(q);
    var liste = gecmisOku().filter(function (x) { return KB.normalize.norm(x) !== nk; });
    liste.unshift(q);
    liste = liste.slice(0, GECMIS_N);
    bellekGecmis = liste.slice();
    A.depo.yaz(GECMIS_ANAHTAR, JSON.stringify(liste));
  }
  function gecmisiTemizle() {
    bellekGecmis = [];
    A.depo.sil(GECMIS_ANAHTAR);
    goster({ koru: true });
  }
  var gecmisGecikmeli = A.gecik(function () { gecmisYaz(A.durum.q); }, 1200);

  /* ---------- arama ---------- */
  function programliAra(q) {
    oge.girdi.value = q;
    A.gezinti.yaz(q);
    gecmisGecikmeli.iptal();
    gecmisYaz(q);
    try { oge.girdi.blur(); } catch (e) { /* önemsiz */ }
  }

  function aramaKur() {
    var girdi = h('input', {
      id: 'kb-ara', type: 'search', name: 'q', inputmode: 'text', enterkeyhint: 'search', autocapitalize: 'characters',
      autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Cihaz kodu, kablo numarası ya da soket ara',
      placeholder: 'Kod, kablo no, soket ara'
    });
    var temizle = h('button', { type: 'button', sinif: 'dugme dugme-ikon dugme-yalin', 'aria-label': 'Aramayı temizle', hidden: true }, A.ikon('i-temizle'));
    var kutu = h('div', { sinif: 'arama' }, [A.ikon('i-ara'), girdi, temizle]);
    var form = h('form', { sinif: 'arama-form', role: 'search', action: '#' }, kutu);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      gecmisGecikmeli.iptal();
      gecmisYaz(A.durum.q);
      try { girdi.blur(); } catch (e) { /* önemsiz */ }
    });
    girdi.addEventListener('input', function () {
      A.gezinti.yaz(girdi.value);
      gecmisGecikmeli();
    });
    temizle.addEventListener('click', function () {
      girdi.value = '';
      A.gezinti.yaz('');
      gecmisGecikmeli.iptal();
      try { girdi.focus(); } catch (e) { /* önemsiz */ }
    });
    oge.girdi = girdi; oge.temizle = temizle; oge.kutu = kutu;
    return form;
  }

  /* ---------- sekmeler ---------- */
  function sekmeSec(id) {
    A.gezinti.sekmeSec(id);
  }
  function sekmelerKur() {
    var db = A.db;
    var liste = h('div', { sinif: 'sekmeler', role: 'tablist', 'aria-label': 'Sistemler' });
    function dugme(id, ad, dolu) {
      var b = h('button', {
        type: 'button', sinif: 'sekme' + (dolu ? '' : ' pasif'), role: 'tab', 'aria-selected': 'false', 'data-sekme': id || '',
        onclick: function () { sekmeSec(id); }
      }, [A.ikon('i-secili', 'ik-k sec'), ad, dolu ? null : h('span', { sinif: 'gorunmez', metin: ' (şeması henüz eklenmedi)' })]);
      liste.appendChild(b);
    }
    dugme(null, 'Tümü', true);
    db.sekmeler.forEach(function (t) { dugme(t.id, t.ad, t.semalar.length > 0); });
    oge.sekmeler = liste;
    return liste;
  }
  function sekmeleriGuncelle(kaydir) {
    var secili = A.durum.sekme || '';
    var secilen = null;
    Array.prototype.forEach.call(oge.sekmeler.children, function (b) {
      var bu = b.getAttribute('data-sekme') === secili;
      b.setAttribute('aria-selected', bu ? 'true' : 'false');
      if (bu) { b.classList.add('secili'); secilen = b; } else b.classList.remove('secili');
    });
    if (secilen && kaydir) {
      var k = oge.sekmeler;
      var hedef = secilen.offsetLeft - Math.max(0, (k.clientWidth - secilen.offsetWidth) / 2);
      try { if (k.scrollTo) k.scrollTo({ left: hedef }); else k.scrollLeft = hedef; } catch (e) { k.scrollLeft = hedef; }
    }
  }

  /* ---------- içerik ---------- */
  function sekmeBul(id) {
    var bulunan = null;
    A.db.sekmeler.forEach(function (t) { if (t.id === id) bulunan = t; });
    return bulunan;
  }
  function ogedenDetay(o) {
    if (o.tur === 'cihaz') return { tur: 'cihaz', kod: o.kod };
    if (o.tur === 'soket') {
      if (o.pin) return { tur: 'uc', ref: o.cihaz ? { cihaz: o.cihaz, soket: o.soket, pin: o.pin } : { soket: o.soket, pin: o.pin } };
      return { tur: 'soket', ad: o.soket, cihaz: o.cihaz || null };
    }
    return { tur: 'kablo', anahtar: o.anahtar };
  }
  function ogeTikla(o) {
    try { oge.girdi.blur(); } catch (e) { /* önemsiz */ }
    gecmisGecikmeli.iptal();
    gecmisYaz(A.durum.q);
    A.gezinti.ac(ogedenDetay(o));
  }

  function listeGoster(ic) {
    var d = A.durum, db = A.db;
    var q = (d.q || '').trim();
    var sekme = d.sekme ? sekmeBul(d.sekme) : null;
    var sec = { ara: programliAra, gecmis: gecmisOku(), gecmisiTemizle: gecmisiTemizle, sekmeSec: sekmeSec };

    if (sekme && !sekme.semalar.length) { ic.appendChild(A.bosSekme(sekme, sec)); return; }
    if (!q && !sekme) { ic.appendChild(A.ilkAcilis(sec)); return; }

    var s = q ? KB.ara.ara(db, q, { sekme: d.sekme, limit: d.limit }) : KB.ara.liste(db, d.sekme, { limit: d.limit });
    if (s.bos) { ic.appendChild(A.ilkAcilis(sec)); return; }
    var kismi = sekme ? A.kismiSekmeNotu(sekme) : null;

    if (s.toplam === 0) {
      var tumunde = 0;
      if (sekme) { try { tumunde = KB.ara.ara(db, q, { sekme: null, limit: 1 }).toplam; } catch (e) { tumunde = 0; } }
      if (kismi) ic.appendChild(kismi);
      ic.appendChild(A.bulunamadi(q || d.q, sekme ? sekme.ad : null, {
        ara: programliAra, tumundeSayi: tumunde,
        tumunde: function () { sekmeSec(null); }
      }));
      return;
    }

    // tek sonuç: ayrıntı doğrudan açılır (ek dokunma gerekmez)
    if (q && s.toplam === 1) {
      var tek = s.cihaz[0] || s.soket[0] || s.kablo[0];
      var kur = A.detayKur(ogedenDetay(tek), { yapiskanUst: 0 });
      if (kismi) ic.appendChild(kismi);
      ic.appendChild(h('p', { sinif: 'tek-sonuc', role: 'status' }, '1 sonuç'));
      ic.appendChild(kur.dugum);
      kur.sonra.forEach(function (f) { f(); });
      return;
    }

    if (kismi) ic.appendChild(kismi);
    ic.appendChild(h('p', { sinif: 'sonuc-ozet', role: 'status' }, s.toplam + ' sonuç' + (sekme ? ' · ' + sekme.ad : '')));
    ic.appendChild(A.sonucGruplari(s, { tikla: ogeTikla, dahaFazla: function () { A.gezinti.limitAc(); } }));
  }

  function detayGoster(ic, detay) {
    var kur = A.detayKur(detay, { yapiskanUst: 56 });
    var bar = h('div', { sinif: 'geri-cubugu' }, [
      h('button', { type: 'button', sinif: 'dugme dugme-kucuk geri-dugme', onclick: function () { A.gezinti.geri(); } }, [A.ikon('i-geri'), 'Geri']),
      h('span', { sinif: 'geri-baslik kod', metin: kur.baslik || '' })
    ]);
    ic.appendChild(bar);
    ic.appendChild(kur.dugum);
    kur.sonra.forEach(function (f) { f(); });
  }

  function senkronBaslik(o) {
    var d = A.durum;
    if (oge.girdi.value !== d.q) oge.girdi.value = d.q;
    oge.kutu.classList.toggle('dolu', d.q.length > 0);
    if (d.q.length > 0) oge.temizle.removeAttribute('hidden'); else oge.temizle.setAttribute('hidden', '');
    sekmeleriGuncelle(!(o && o.yazarken));
  }

  /** Durumu ekrana çizer. o: { kaydirma:y, yazarken, koru, geri } */
  function goster(o) {
    o = o || {};
    var onceki = kok.pageYOffset || 0;
    A.cizimleriTemizle();
    senkronBaslik(o);
    var ic = oge.icerik;
    A.bosalt(ic);
    try {
      if (A.durum.detay) detayGoster(ic, A.durum.detay);
      else listeGoster(ic);
    } catch (e) {
      if (kok.console && kok.console.error) kok.console.error(e);
      A.bosalt(ic);
      ic.appendChild(A.bos({ ikon: 'i-kotu', baslik: 'Bir şey ters gitti', metin: String(e && e.message ? e.message : e), role: 'alert' }));
    }
    if (o.koru) kok.scrollTo(0, onceki);
    else if (typeof o.kaydirma === 'number') kok.scrollTo(0, o.kaydirma);
  }

  /** Sayfayı kurar ve ilk çizimi yapar. */
  A.kabuk = {
    kur: function () {
      oge.icerik = $('kb-icerik');
      var ust = $('kb-tema');
      A.bosalt(ust);
      ust.appendChild(h('div', { sinif: 'segment', role: 'group', 'aria-label': 'Tema' }, [temaDugmesi('koyu', 'Koyu', 'i-ay'), temaDugmesi('acik', 'Açık', 'i-gunes')]));
      var ak = $('kb-arama'); A.bosalt(ak); ak.appendChild(aramaKur());
      var sk = $('kb-sekmeler'); A.bosalt(sk); sk.appendChild(sekmelerKur());

      var st = A.db.istatistik;
      var alt = $('kb-alt');
      if (alt) {
        A.bosalt(alt);
        alt.appendChild(h('p', null, 'Veri: ' + st.sema + ' şema · ' + st.kablo + ' kablo · ' + st.cihaz + ' cihaz · ' + st.soket + ' soket' + (A.paket && A.paket.imza ? ' · imza ' + A.paket.imza : '')));
      }
      temaDugmeleriniGuncelle();
      temaRenginiGuncelle();
      try {
        var mq = kok.matchMedia('(prefers-color-scheme: light)');
        var ep = function () { if (!belge.documentElement.getAttribute('data-tema')) { temaDugmeleriniGuncelle(); temaRenginiGuncelle(); } };
        if (mq.addEventListener) mq.addEventListener('change', ep); else if (mq.addListener) mq.addListener(ep);
      } catch (e) { /* önemsiz */ }

      A.gezinti.baslat(goster);
      goster({ kaydirma: 0 });
    },
    goster: goster
  };
})(typeof globalThis === 'object' ? globalThis : this);
