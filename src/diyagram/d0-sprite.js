/* d0-sprite: gizli SVG sprite (tek kaynak). t-… (18 tür işareti) ve i-… (durum/arayüz simgeleri) test/referans.html'den
   AYNEN kopyalandır (sanat yönetmeninin sprite'ı); d-… motora özeldir (DESIGN'da karşılığı olmayan iki simge). Arayüz sprite'ı
   KB.diyagram.spriteEkle() ile bir kez ekler; ciz() de kendisi ekler. Sınıflar (.tc .tg .tf .tn .t-<tür>) diyagram.css'te. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};

  var SEMBOLLER = [
  "<symbol id=\"t-beyin\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M10 2.5h20l7.5 7.5v20L30 37.5H10L2.5 30V10z\"/><g class=\"tg\" transform=\"translate(8 8)\"><rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"1.5\"/><rect class=\"tf\" x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\" rx=\".5\"/><path d=\"M9.5 6V3M14.5 6V3M9.5 21v-3M14.5 21v-3M6 9.5H3M6 14.5H3M21 9.5h-3M21 14.5h-3\"/></g></symbol>",
  "<symbol id=\"t-soket\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M3.5 6.5h33l-5 27H8.5z\"/><g class=\"tg\" transform=\"translate(8 8)\"><circle class=\"tf\" cx=\"6.5\" cy=\"8\" r=\"1.7\"/><circle class=\"tf\" cx=\"12\" cy=\"8\" r=\"1.7\"/><circle class=\"tf\" cx=\"17.5\" cy=\"8\" r=\"1.7\"/><circle class=\"tf\" cx=\"9.2\" cy=\"14.5\" r=\"1.7\"/><circle class=\"tf\" cx=\"14.8\" cy=\"14.5\" r=\"1.7\"/></g></symbol>",
  "<symbol id=\"t-besleme\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M11 3h18l9 17-9 17H11L2 20z\"/><g class=\"tg\" transform=\"translate(8 9)\"><path d=\"M12 2v6M9 5h6M12 8v4M4 12h16M6 12v8M12 12v8M18 12v8\"/></g></symbol>",
  "<symbol id=\"t-guc\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"7\" y=\"2.5\" width=\"26\" height=\"35\" rx=\"13\"/><g class=\"tg\" transform=\"translate(8 8)\"><rect x=\"7\" y=\"5\" width=\"10\" height=\"16\" rx=\"1.5\"/><path d=\"M10 3h4M12 9v4M10 11h4M10 17h4\"/></g></symbol>",
  "<symbol id=\"t-salter\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M9.5 5.5h28.5l-7.5 29H2z\"/><g class=\"tg\" transform=\"translate(8 8)\"><circle class=\"tf\" cx=\"5\" cy=\"16\" r=\"1.8\"/><circle class=\"tf\" cx=\"19\" cy=\"16\" r=\"1.8\"/><path d=\"M2 16h1.2M20.8 16H22M5 16l12-8\"/></g></symbol>",
  "<symbol id=\"t-role\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M4.5 36.5V18a15.5 15.5 0 0 1 31 0v18.5z\"/><g class=\"tg\" transform=\"translate(9.2 12) scale(.9)\"><rect x=\"2.5\" y=\"7\" width=\"8\" height=\"10\" rx=\"1\"/><path d=\"M6.5 4v3M6.5 17v3M17 3v5M17 21v-6M17 15l4-6M10.5 12h3\"/></g></symbol>",
  "<symbol id=\"t-sigorta\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"1.5\" y=\"8\" width=\"37\" height=\"24\" rx=\"12\"/><g class=\"tg\" transform=\"translate(8 8)\"><rect x=\"5\" y=\"8.5\" width=\"14\" height=\"7\" rx=\"1\"/><path d=\"M2 12h20\"/></g></symbol>",
  "<symbol id=\"t-toprak\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M3 4.5h34V22L20 36 3 22z\"/><g class=\"tg\" transform=\"translate(8 4.5)\"><path d=\"M12 3v8M5 11h14M8 15h8M10.5 19h3\"/></g></symbol>",
  "<symbol id=\"t-motor\" viewBox=\"0 0 40 40\"><circle class=\"tc\" cx=\"20\" cy=\"20\" r=\"17.5\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M6 17V7.5l6 6.5 6-6.5V17\"/></g></symbol>",
  "<symbol id=\"t-valf\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M20 2.5L37.5 20 20 37.5 2.5 20z\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M4 7.5l8 4.5-8 4.5zM20 7.5L12 12l8 4.5z\"/></g></symbol>",
  "<symbol id=\"t-lamba\" viewBox=\"0 0 40 40\"><circle class=\"tc\" cx=\"20\" cy=\"20\" r=\"17.5\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M6.5 6.5l11 11M17.5 6.5l-11 11\"/></g></symbol>",
  "<symbol id=\"t-ikaz\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"3\" y=\"3\" width=\"34\" height=\"34\" rx=\"8\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M6 17V11a6 6 0 0 1 12 0v6l1.5 1.5h-15zM10 21a2 2 0 0 0 4 0\"/></g></symbol>",
  "<symbol id=\"t-sensor\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M2.5 6.5H28L37.5 20 28 33.5H2.5z\"/><g class=\"tg\" transform=\"translate(4 8)\"><circle class=\"tf\" cx=\"6\" cy=\"17\" r=\"2\"/><path d=\"M6 11a6 6 0 0 1 6 6M6 5a12 12 0 0 1 12 12\"/></g></symbol>",
  "<symbol id=\"t-direnc\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"2.5\" y=\"7.5\" width=\"35\" height=\"25\" rx=\"1.5\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M2 12h3.5l1.5-5 3 10 3-10 3 10 1.5-5H22\"/></g></symbol>",
  "<symbol id=\"t-diyot\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"2.5\" y=\"7.5\" width=\"35\" height=\"25\" rx=\"1.5\"/><g class=\"tg\" transform=\"translate(8 8)\"><path d=\"M7 6l10 6-10 6zM17 6v12M2 12h5M17 12h5\"/></g></symbol>",
  "<symbol id=\"t-dugum\" viewBox=\"0 0 40 40\"><circle class=\"tn\" cx=\"13\" cy=\"20\" r=\"6\"/><path class=\"tg\" d=\"M2.5 20H13M13 20L25 9h12.5M13 20l12 11h12.5\" style=\"stroke-width:2.5\"/></symbol>",
  "<symbol id=\"t-diger\" viewBox=\"0 0 40 40\"><rect class=\"tc\" x=\"3\" y=\"3\" width=\"34\" height=\"34\" rx=\"8\"/><g class=\"tg\" transform=\"translate(8 8)\"><circle class=\"tf\" cx=\"6\" cy=\"12\" r=\"1.8\"/><circle class=\"tf\" cx=\"12\" cy=\"12\" r=\"1.8\"/><circle class=\"tf\" cx=\"18\" cy=\"12\" r=\"1.8\"/></g></symbol>",
  "<symbol id=\"t-devam\" viewBox=\"0 0 40 40\"><path class=\"tc\" d=\"M2.5 6.5H28L37.5 20 28 33.5H2.5z\"/><g class=\"tg\" transform=\"translate(4 8)\"><path d=\"M3 12h11M10 7l5 5-5 5M18 5v14\"/></g></symbol>",
  "<symbol id=\"i-supheli\" viewBox=\"0 0 24 24\"><path d=\"M12 3.2L2.4 20h19.2z\"/><path d=\"M12 9.5v5M12 17.3h.01\"/></symbol>",
  "<symbol id=\"i-celiski\" viewBox=\"0 0 24 24\"><path d=\"M5 9h14M5 15h14M15.5 4.5l-7 15\"/></symbol>",
  "<symbol id=\"i-dogrulanmadi\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke-dasharray=\"4.2 3\"/><path d=\"M7.7 12.4l3 3 5.6-6.4\" stroke-dasharray=\"2.6 2.4\"/></symbol>",
  "<symbol id=\"i-dogrulandi\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M7.7 12.4l3 3 5.6-6.4\"/></symbol>",
  "<symbol id=\"i-not\" viewBox=\"0 0 24 24\"><path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4M9 12h6M9 16h6\"/></symbol>",
  "<symbol id=\"i-varyant\" viewBox=\"0 0 24 24\"><rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"3\" stroke-dasharray=\"3.5 3\"/><path d=\"M12 8.5v7M8.5 12h7\"/></symbol>",
  "<symbol id=\"i-iyi\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M7.7 12.4l3 3 5.6-6.4\"/></symbol>",
  "<symbol id=\"i-kotu\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 8.5l7 7M15.5 8.5l-7 7\"/></symbol>",
  "<symbol id=\"i-ara\" viewBox=\"0 0 24 24\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"M15.5 15.5L21 21\"/></symbol>",
  "<symbol id=\"i-temizle\" viewBox=\"0 0 24 24\"><path d=\"M6 6l12 12M18 6L6 18\"/></symbol>",
  "<symbol id=\"i-gecmis\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7v5l3.5 2\"/></symbol>",
  "<symbol id=\"i-geri\" viewBox=\"0 0 24 24\"><path d=\"M19 12H5M11 6l-6 6 6 6\"/></symbol>",
  "<symbol id=\"i-sag\" viewBox=\"0 0 24 24\"><path d=\"M9 5l7 7-7 7\"/></symbol>",
  "<symbol id=\"i-secili\" viewBox=\"0 0 24 24\"><path d=\"M5 12.5l4.5 4.5L19 7\"/></symbol>",
  "<symbol id=\"i-gunes\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8\"/></symbol>",
  "<symbol id=\"i-ay\" viewBox=\"0 0 24 24\"><path d=\"M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z\"/></symbol>",
  "<symbol id=\"i-sistem\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 3.5a8.5 8.5 0 0 0 0 17z\" fill=\"currentColor\"/></symbol>",
  "<symbol id=\"i-kaynak\" viewBox=\"0 0 24 24\"><path d=\"M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM12 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0z\"/></symbol>",
  "<symbol id=\"i-soket\" viewBox=\"0 0 24 24\"><path d=\"M3.5 6.5h17l-2.2 11H5.7z\"/><path d=\"M8 10.5h.01M12 10.5h.01M16 10.5h.01M10 14h.01M14 14h.01\" stroke-width=\"2.6\"/></symbol>",
  "<symbol id=\"d-ic\" viewBox=\"0 0 24 24\"><rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2.5\"/><path d=\"M8.5 12h7\"/><path d=\"M8.5 12h.01M15.5 12h.01\" stroke-width=\"3\"/></symbol>",
  "<symbol id=\"d-don\" viewBox=\"0 0 24 24\"><path d=\"M19 12a7 7 0 1 1-2.2-5.1\"/><path d=\"M19.4 4.2v3.8h-3.8\"/></symbol>"
  ];

  var SVG_NS = 'http://www.w3.org/2000/svg';
  /** Yazı etiketleri (DESIGN §6); büyük harf doğrudan yazılır (text-transform yok, lang="tr"). */
  D.TURLER = {
    beyin: { ad: 'BEYİN' }, soket: { ad: 'SOKET' }, besleme: { ad: 'BESLEME' }, guc: { ad: 'GÜÇ' }, salter: { ad: 'ŞALTER' },
    role: { ad: 'RÖLE' }, sigorta: { ad: 'SİGORTA' }, toprak: { ad: 'TOPRAK' }, motor: { ad: 'MOTOR' }, valf: { ad: 'VALF' },
    lamba: { ad: 'LAMBA' }, ikaz: { ad: 'İKAZ' }, sensor: { ad: 'SENSÖR' }, direnc: { ad: 'DİRENÇ' }, diyot: { ad: 'DİYOT' },
    dugum: { ad: 'EK NOKTASI' }, diger: { ad: 'DİĞER' }, devam: { ad: 'DEVAM' }
  };

  /** Sprite'ın tam metni (<svg id="kb-sprite">…</svg>). */
  D.sprite = function () {
    return '<svg id="kb-sprite" class="dy-sprite" xmlns="' + SVG_NS + '" aria-hidden="true" focusable="false">' + SEMBOLLER.join('') + '</svg>';
  };

  /** Sprite'ı <body>'nin başına bir kez ekler (zararsız tekrar). */
  D.spriteEkle = function () {
    var belge = kok.document;
    if (!belge || belge.getElementById('kb-sprite')) return;
    if (!belge.body) {
      belge.addEventListener('DOMContentLoaded', function () { D.spriteEkle(); }, { once: true });
      return;
    }
    var kap = belge.createElement('div');
    kap.innerHTML = D.sprite();
    belge.body.insertBefore(kap.firstChild, belge.body.firstChild);
  };

  /** Sembol listesi (test için). */
  D._semboller = SEMBOLLER;
})(typeof globalThis === 'object' ? globalThis : this);
