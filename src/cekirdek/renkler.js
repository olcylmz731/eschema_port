/* renkler: kablo renk kısaltması → Türkçe ad; kesit metni; şema varsayılanının ayrı işaretlenmesi. */
(function (kok, kur) {
  'use strict';
  var node = typeof module === 'object' && module !== null && typeof module.exports === 'object' && typeof require === 'function';
  var modul = kur();
  if (node) { module.exports = modul; } else { kok.KB = kok.KB || {}; kok.KB.renkler = modul; }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  // VERI-MODELI §1 (vi: IEC 60757 mor; tabloda olmayan kısaltma olduğu gibi yazılır)
  var TABLO = {
    ws: 'beyaz', sw: 'siyah', rt: 'kırmızı', gn: 'yeşil', ge: 'sarı', bl: 'mavi',
    br: 'kahverengi', gr: 'gri', li: 'lila', or: 'turuncu', rs: 'pembe', vi: 'mor'
  };

  var I_NOKTALI = new RegExp(String.fromCharCode(0x130), 'g'); // İ
  var I_NOKTASIZ = new RegExp(String.fromCharCode(0x131), 'g'); // ı

  function kucuk(s) {
    return String(s).replace(I_NOKTALI, 'i').replace(I_NOKTASIZ, 'i').toLowerCase();
  }

  /** 'sw/rt' → { kisaltma, ad:'siyah-kırmızı', parcalar:[{kisaltma, ad, taniniyor}], taniniyor }. Boş/null → null. */
  function coz(kisaltma) {
    if (kisaltma == null || String(kisaltma).replace(/\s+/g, '') === '') return null;
    var ham = String(kisaltma).replace(/\s+/g, '');
    var parcalar = ham.split('/').filter(function (x) { return x !== ''; }).map(function (p) {
      var k = kucuk(p);
      var bilinen = Object.prototype.hasOwnProperty.call(TABLO, k);
      return { kisaltma: bilinen ? k : p, ad: bilinen ? TABLO[k] : p, taniniyor: bilinen };
    });
    return {
      kisaltma: ham,
      ad: parcalar.map(function (p) { return p.ad; }).join('-'),
      parcalar: parcalar,
      taniniyor: parcalar.every(function (p) { return p.taniniyor; })
    };
  }

  function ad(kisaltma) {
    var c = coz(kisaltma);
    return c ? c.ad : null;
  }

  /** '2.5' → '2,5 mm²'. Boş/null → null. */
  function kesitMetni(kesit) {
    if (kesit == null || String(kesit) === '') return null;
    return String(kesit).replace('.', ',') + ' mm²';
  }

  /** Bir kablo parçasının renk/kesit değeri; yazmıyorsa şema varsayılanı (ayrı işaretle: SemaNotu). */
  function etkin(parca, varsayilan) {
    var renk = parca && parca.renk != null && parca.renk !== '' ? parca.renk : null;
    var kesit = parca && parca.kesit != null && parca.kesit !== '' ? parca.kesit : null;
    var renkSemaNotu = false, kesitSemaNotu = false;
    if (renk == null && varsayilan && varsayilan.renk != null && varsayilan.renk !== '') { renk = varsayilan.renk; renkSemaNotu = true; }
    if (kesit == null && varsayilan && varsayilan.kesit != null && varsayilan.kesit !== '') { kesit = varsayilan.kesit; kesitSemaNotu = true; }
    var c = coz(renk);
    return {
      renk: renk, renkAd: c ? c.ad : null, renkParcalari: c ? c.parcalar : [], renkSemaNotu: renkSemaNotu,
      kesit: kesit, kesitMetni: kesitMetni(kesit), kesitSemaNotu: kesitSemaNotu
    };
  }

  return { TABLO: TABLO, coz: coz, ad: ad, kesitMetni: kesitMetni, etkin: etkin };
});
