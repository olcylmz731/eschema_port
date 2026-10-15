/* a1-durum: ekran durumu ve gezinti (history).
   Durum: { q: arama metni, sekme: sekme kimliği | null (Tümü), detay: null | { tur:'kablo'|'cihaz'|'soket'|'uc', … }, limit }.
   Kural: yalnız bir DETAY açılırken history'ye giriş eklenir (push); yazarken aynı giriş güncellenir (replace).
   Detaydayken yazılırsa yeni bir liste girişi eklenir (geri tuşu detaya döner).
   history kullanılamazsa (SecurityError …) uygulama iç yığınla çalışır; geri tuşu sistemde sayfadan çıkabilir. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};

  var durum = A.durum = { q: '', sekme: null, detay: null, limit: 40 };
  var derinlik = 0;          // history'de bu oturumda eklenen giriş sayısı (0 = ilk giriş)
  var historyVar = true;     // pushState/replaceState çalışıyor mu
  var yigin = [];            // history yoksa: önceki durumlar
  var yenidenCiz = function () {};

  function anlik() {
    return { kb: 1, q: durum.q, sekme: durum.sekme, detay: durum.detay, d: derinlik, y: 0 };
  }
  function kaydirma() { return kok.pageYOffset || (kok.document.documentElement && kok.document.documentElement.scrollTop) || 0; }

  function degistir(s) {      // replaceState
    if (!historyVar) return;
    try { kok.history.replaceState(s, ''); } catch (e) { historyVar = false; }
  }
  function ekle(s) {          // pushState
    if (!historyVar) return false;
    try { kok.history.pushState(s, ''); return true; } catch (e) { historyVar = false; return false; }
  }
  function kaydirmayiSakla() {
    var s = anlik(); s.y = kaydirma();
    degistir(s);
  }
  function yukle(s) {
    durum.q = typeof s.q === 'string' ? s.q : '';
    durum.sekme = s.sekme || null;
    durum.detay = s.detay || null;
    durum.limit = 40;
    derinlik = typeof s.d === 'number' ? s.d : 0;
  }

  /** Başlangıç: yeniden yükleme sonrası history.state varsa oradan sürdürür. cizici: durum değişince çağrılır. */
  A.gezinti = {
    baslat: function (cizici) {
      yenidenCiz = cizici;
      try { if ('scrollRestoration' in kok.history) kok.history.scrollRestoration = 'manual'; } catch (e) { /* önemsiz */ }
      var s = null;
      try { s = kok.history.state; } catch (e) { historyVar = false; }
      if (s && s.kb === 1) yukle(s);
      degistir(anlik());
      kok.addEventListener('popstate', function (ev) {
        var st = ev.state;
        if (st && st.kb === 1) yukle(st);
        else { yukle({ q: '', sekme: null, detay: null, d: 0 }); }
        yenidenCiz({ kaydirma: st && typeof st.y === 'number' ? st.y : 0, geri: true });
      });
    },

    /** Detay aç (karta, diyagramdaki cihaza dokunuldu): yeni giriş. */
    ac: function (detay) {
      kaydirmayiSakla();
      if (!historyVar) yigin.push({ q: durum.q, sekme: durum.sekme, detay: durum.detay, d: derinlik });
      durum.detay = detay;
      derinlik += 1;
      ekle(anlik());
      yenidenCiz({ kaydirma: 0 });
    },

    /** Arama metni değişti. Detaydaysak liste girişi eklenir, değilse mevcut giriş güncellenir. */
    yaz: function (q) {
      if (durum.detay) {
        kaydirmayiSakla();
        if (!historyVar) yigin.push({ q: durum.q, sekme: durum.sekme, detay: durum.detay, d: derinlik });
        durum.detay = null;
        derinlik += 1;
        durum.q = q;
        durum.limit = 40;
        ekle(anlik());
      } else {
        durum.q = q;
        durum.limit = 40;
        degistir(anlik());
      }
      yenidenCiz({ yazarken: true });
    },

    /** Sekme değişti: liste girişi güncellenir (detaydaysa liste girişi eklenir). */
    sekmeSec: function (sekme) {
      if (durum.detay) {
        kaydirmayiSakla();
        if (!historyVar) yigin.push({ q: durum.q, sekme: durum.sekme, detay: durum.detay, d: derinlik });
        durum.detay = null;
        derinlik += 1;
        durum.sekme = sekme || null;
        durum.limit = 40;
        ekle(anlik());
      } else {
        durum.sekme = sekme || null;
        durum.limit = 40;
        degistir(anlik());
      }
      yenidenCiz({ kaydirma: 0 });
    },

    /** Daha fazla sonuç göster. */
    limitAc: function () {
      durum.limit = 500;
      yenidenCiz({ koru: true });
    },

    /** Uygulama içi "Geri" düğmesi. */
    geri: function () {
      if (derinlik > 0) {
        if (historyVar) {
          try { kok.history.back(); return; } catch (e) { historyVar = false; }
        }
        var onceki = yigin.pop();
        if (onceki) {
          yukle(onceki);
          yenidenCiz({ kaydirma: 0, geri: true });
          return;
        }
      }
      // geri gidilecek giriş yok (doğrudan açılmış ya da history yok): listeye dön
      durum.detay = null;
      derinlik = 0;
      degistir(anlik());
      yenidenCiz({ kaydirma: 0, geri: true });
    },

    /** Başlangıç ekranına dön (başlıktaki ad). */
    derinMi: function () { return derinlik > 0; }
  };
})(typeof globalThis === 'object' ? globalThis : this);
