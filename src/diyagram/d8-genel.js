/* d8-genel: KB.diyagram genel API'si (src/diyagram/API.md). Kapsayıcıyı kurar, çizer, yeniden boyutlandırır,
   dokunma/klavye tıklamalarını geri çağrılara dağıtır; yakınlaştırma d7-etkilesim.js'te. */
(function (kok) {
  'use strict';
  var KB = kok.KB = kok.KB || {};
  var D = KB.diyagram = KB.diyagram || {};
  var I = D._ = D._ || {};
  var el = I.el;

  var ONB = '__kbDiyagram';

  function Ornek(kap, nesne, secenek, tur) {
    var self = this;
    self.kap = kap; self.nesne = nesne; self.secenek = secenek || {}; self.tur = tur;
    self.olcekDeger = 1; self.yokEdildi = false; self.cizilenW = -1; self.bekle = false;
    kap.classList.add('dy-kok');
    self.kutu = kok.document.createElement('div');
    self.kutu.className = 'dy-kap';
    kap.appendChild(self.kutu);
    self.kutu.setAttribute('data-dy-tur', tur);
    self.svg = null; self.B = null;
    self._rafId = 0;

    // kapsayıcı genişliği değişince yeniden çiz
    var RO = kok.ResizeObserver;
    if (RO) {
      self._ro = new RO(function () { self._boyutDegisti(); });
      self._ro.observe(self.kutu);
    } else {
      self._onResize = function () { self._boyutDegisti(); };
      kok.addEventListener('resize', self._onResize);
    }
    self.cizim();
  }

  Ornek.prototype._boyutDegisti = function () {
    var self = this;
    if (self.yokEdildi || self.secenek.genislik) return;
    if (self._rafId) return;
    var raf = kok.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    self._rafId = raf(function () {
      self._rafId = 0;
      if (self.yokEdildi) return;
      var w = Math.floor(self.kutu.getBoundingClientRect().width);
      if (w !== self.cizilenW) self.cizim();
    });
  };

  /** Sahneyi kurup SVG'yi yeniden oluştur. */
  Ornek.prototype.cizim = function () {
    var self = this, o = self.secenek;
    var W = o.genislik ? Math.floor(o.genislik) : Math.floor(self.kutu.getBoundingClientRect().width);
    if (!(W > 0)) { self.bekle = true; self.cizilenW = 0; return; }   // gizli: görünür olunca RO tetikler
    self.bekle = false;
    D.spriteEkle();
    if (self.etk && self.etk.sifirla) self.etk.sifirla(true);
    var eski = self.svg;
    var svg = el('svg', { class: 'dy', xmlns: I.NS, width: W, height: 10, viewBox: '0 0 ' + W + ' 10', role: 'img', focusable: 'false' });
    var B = I.baglam(svg, W, o);
    self.kutu.appendChild(svg);   // ölçüm için belgede olmalı
    var sahne = null, ozet = '';
    try {
      var s;
      if (self.tur === 'kablo') { s = I.kabloSahne(B, self.nesne, o); ozet = o.ozet || (KB.metin ? KB.metin.ozet(self.nesne) : ''); }
      else if (self.tur === 'cihaz') { s = I.cihazSahne(B, self.nesne, o); ozet = o.ozet || I.cihazOzeti(self.nesne); }
      else { s = I.soketSahne(B, self.nesne, o); ozet = o.ozet || I.soketOzeti(self.nesne); }
      sahne = s;
      var dunya = el('g', { class: 'dy-dunya' }, svg);
      s.ciz(dunya);
      self.dunya = dunya; self.sahne = s;
      svg.setAttribute('height', s.h);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + s.h);
      svg.style.height = s.h + 'px'; svg.style.width = W + 'px';
      self.yerlesim = s.yerlesim || 'dikey';
    } finally {
      if (B.prob && B.prob.parentNode) B.prob.parentNode.removeChild(B.prob);
    }
    svg.setAttribute('aria-label', ozet);
    if (eski && eski.parentNode) eski.parentNode.removeChild(eski);
    self.svg = svg; self.B = B; self.ozet = ozet;
    self.cizilenW = W; self.genislik = W; self.yukseklik = sahne ? sahne.h : 0;
    self.olcekDeger = 1;
    self._baglaTikla();
    if (I.etkilesimKur) I.etkilesimKur(self);
    if (self.sahne && self.sahne.sonra) self.sahne.sonra(self);
  };

  Ornek.prototype._baglaTikla = function () {
    var self = this, svg = self.svg;
    function tetikle(e, hedef) {
      var g = hedef && hedef.closest ? hedef.closest('.dy-dokun') : null;
      if (!g || !svg.contains(g)) return false;
      var rec = self.B.dokunlar[+g.getAttribute('data-i')];
      if (!rec) return false;
      var cb = self.secenek[{ cihaz: 'onCihaz', soket: 'onSoket', kablo: 'onKablo', uc: 'onUc' }[rec.eylem]];
      if (typeof cb === 'function') { e.preventDefault(); cb(rec.deger, rec.nesne); }
      return true;
    }
    svg.addEventListener('click', function (e) {
      if (self.etk && self.etk.tikYut && self.etk.tikYut()) { e.preventDefault(); e.stopPropagation(); return; }
      tetikle(e, e.target);
    });
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var t = e.target;
      if (t && t.classList && t.classList.contains('dy-dokun')) tetikle(e, t);
    });
  };

  // ---- dış API -------------------------------------------------------------------------------------------
  Ornek.prototype.olcek = function () { return this.olcekDeger; };
  Ornek.prototype.yakinlastir = function (o, x, y) { if (this.etk && this.etk.yakinlastir) this.etk.yakinlastir(o, x, y); return this.olcekDeger; };
  Ornek.prototype.sifirla = function () { if (this.etk && this.etk.sifirla) this.etk.sifirla(); return this.olcekDeger; };
  Ornek.prototype.yenile = function () { this.cizim(); };
  Ornek.prototype.yokEt = function () {
    var self = this;
    if (self.yokEdildi) return;
    self.yokEdildi = true;
    if (self._ro) self._ro.disconnect();
    if (self._onResize) kok.removeEventListener('resize', self._onResize);
    if (self.etk && self.etk.sok) self.etk.sok();
    if (self.kutu && self.kutu.parentNode) self.kutu.parentNode.removeChild(self.kutu);
    if (self.kap) { self.kap.classList.remove('dy-kok'); if (self.kap[ONB] === self) self.kap[ONB] = null; }
  };

  function yeni(kap, nesne, secenek, tur) {
    if (!kap || !nesne) return null;
    if (kap[ONB]) kap[ONB].yokEt();
    var o = new Ornek(kap, nesne, secenek, tur);
    kap[ONB] = o;
    return o;
  }

  D.kablo = function (kap, iz, secenek) { return yeni(kap, iz, secenek, 'kablo'); };
  D.cihaz = function (kap, sorgu, secenek) { return yeni(kap, sorgu, secenek, 'cihaz'); };
  D.soket = function (kap, sorgu, secenek) { return yeni(kap, sorgu, secenek, 'soket'); };
  D.ciz = function (kap, nesne, secenek) {
    if (!nesne) return null;
    if (nesne.tur === 'kablo' || nesne.tur === 'uc') return D.kablo(kap, nesne, secenek);
    if (nesne.tur === 'cihaz') return D.cihaz(kap, nesne, secenek);
    if (nesne.tur === 'soket') return D.soket(kap, nesne, secenek);
    return null;
  };
})(typeof globalThis === 'object' ? globalThis : this);
