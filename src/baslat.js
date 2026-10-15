/* baslat: uygulamayı başlatır (en son yüklenir). Gömülü veri paketini okur, çekirdeğe yükler, ekranı kurar.
   Dış istek yok: veri sayfanın içindeki <script type="application/json" id="kb-veri"> öğesindedir. */
(function (kok) {
  'use strict';
  var KB = kok.KB, A = KB && KB.arayuz, belge = kok.document;

  function hataGoster(e) {
    if (kok.console && kok.console.error) kok.console.error(e);
    var yer = belge.getElementById('kb-icerik');
    if (!yer) return;
    yer.textContent = '';
    var p = belge.createElement('p');
    p.className = 'bilgi';
    p.setAttribute('role', 'alert');
    p.textContent = 'Uygulama başlatılamadı: ' + (e && e.message ? e.message : e);
    yer.appendChild(p);
  }

  try {
    if (!KB || !A) throw new Error('çekirdek ya da arayüz dosyaları yüklenmedi');
    var damga = belge.getElementById('kb-veri');
    if (!damga) throw new Error('gömülü veri bulunamadı');
    A.paket = JSON.parse(damga.textContent);
    A.db = KB.veri.yukle(A.paket);
    if (KB.diyagram && KB.diyagram.spriteEkle) KB.diyagram.spriteEkle();
    A.kabuk.kur();
  } catch (e) {
    hataGoster(e);
  }
})(typeof globalThis === 'object' ? globalThis : this);
