/* a0-yardim: küçük DOM ve yardımcı işlevler (KB.arayuz). DOM'a bağımlıdır; veri mantığı çekirdekte (KB.ara, KB.izle ...).
   Metinler her zaman textContent / createTextNode ile eklenir (innerHTML yok). */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var A = KB.arayuz = KB.arayuz || {};
  var belge = kok.document;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function ekle(ebeveyn, cocuk) {
    if (cocuk === null || cocuk === undefined || cocuk === false) return;
    if (Array.isArray(cocuk)) { for (var i = 0; i < cocuk.length; i++) ekle(ebeveyn, cocuk[i]); return; }
    if (typeof cocuk === 'string' || typeof cocuk === 'number') { ebeveyn.appendChild(belge.createTextNode(String(cocuk))); return; }
    ebeveyn.appendChild(cocuk);
  }
  A.ekle = ekle;

  /** h('div', { sinif:'x', 'aria-label':'y', ontıkla… }, [çocuklar]) */
  A.h = function (etiket, oz, cocuk) {
    var e = belge.createElement(etiket);
    if (oz) {
      for (var k in oz) {
        if (!Object.prototype.hasOwnProperty.call(oz, k)) continue;
        var v = oz[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'sinif') e.className = v;
        else if (k === 'metin') e.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : String(v));
      }
    }
    ekle(e, cocuk);
    return e;
  };

  A.bosalt = function (e) { while (e.firstChild) e.removeChild(e.firstChild); return e; };

  function svgKur(sinif, kutu, ref) {
    var s = belge.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', sinif);
    if (kutu) s.setAttribute('viewBox', kutu);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = belge.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#' + ref);
    s.appendChild(u);
    return s;
  }

  /** 24 birimlik çizgi simgesi (sprite: i-…, d-…). sinif: 'ik-k' (20 px), 'sec' … */
  A.ikon = function (id, sinif) { return svgKur('ik' + (sinif ? ' ' + sinif : ''), null, id); };

  function turGecerli(tur) {
    var T = KB.diyagram && KB.diyagram.TURLER;
    return T && T[tur] ? tur : 'diger';
  }
  /** Cihaz türü işareti (çerçeve + glif). boyut: 'b' → 56 px. */
  A.tur = function (tur, boyut) {
    tur = turGecerli(tur);
    return svgKur('tm t-' + tur + (boyut === 'b' ? ' tm-b' : ''), '0 0 40 40', 't-' + tur);
  };
  /** Tür yazı etiketi ('BEYİN', 'ŞALTER' …). */
  A.turAd = function (tur) {
    var T = KB.diyagram && KB.diyagram.TURLER;
    tur = turGecerli(tur);
    return T && T[tur] ? T[tur].ad : 'DİĞER';
  };

  /** Metindeki '?' karakterleri amber çipte (okunamayan karakter). Dönüş: DocumentFragment. */
  A.bel = function (s) {
    var f = belge.createDocumentFragment();
    String(s === null || s === undefined ? '' : s).split('?').forEach(function (parca, i) {
      if (i > 0) f.appendChild(A.h('span', { sinif: 'bel', metin: '?' }));
      if (parca) f.appendChild(belge.createTextNode(parca));
    });
    return f;
  };

  /** localStorage: her erişim try/catch (dosya yöneticisinden açılışta yok ya da hata verebilir). */
  A.depo = {
    al: function (k) { try { return kok.localStorage.getItem(k); } catch (e) { return null; } },
    yaz: function (k, v) { try { kok.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    sil: function (k) { try { kok.localStorage.removeItem(k); return true; } catch (e) { return false; } }
  };

  A.gecik = function (fn, ms) {
    var t = null;
    var f = function () { var a = arguments, ben = this; if (t) kok.clearTimeout(t); t = kok.setTimeout(function () { t = null; fn.apply(ben, a); }, ms); };
    f.iptal = function () { if (t) { kok.clearTimeout(t); t = null; } };
    f.simdi = function () { if (t) { kok.clearTimeout(t); t = null; fn.apply(null, arguments); } };
    return f;
  };

  /** Dizi tekilleştirme (ilk görülen kalır). */
  A.tekil = function (dizi) {
    var g = {}, c = [];
    dizi.forEach(function (x) { if (!g[x]) { g[x] = 1; c.push(x); } });
    return c;
  };

  /** 'N öğe' gibi Türkçe sayı metni. */
  A.sayi = function (n, bir, cok) { return n + ' ' + (n === 1 ? bir : (cok || bir)); };

  A.belge = belge;
  A.kok = kok;
})(typeof globalThis === 'object' ? globalThis : this);
