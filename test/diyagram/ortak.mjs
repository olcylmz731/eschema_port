// diyagram testleri için ortak parçalar: derleme (build.py), sayfa kurulumu ve sayfa içi yardımcılar (window.__T).
// test/cdp.mjs içe aktarılır, düzenlenmez.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Verilen veri klasörüyle tek HTML derler; geçici klasöre yazar. Dönen: dosya yolu. */
export function derle(veri = 'veri') {
  const mutlak = path.resolve(KOK, veri);
  const ad = path.basename(mutlak).replace(/[^a-z0-9_-]/gi, '_');
  const cikti = path.join(process.env.KB_TMP || os.tmpdir(), `kb-diyagram-${process.pid}-${ad}.html`);
  try {
    execFileSync('python3', [path.join(KOK, 'build.py'), '--veri', mutlak, '--cikti', cikti, '--sessiz', '--notlar'], { cwd: KOK, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    throw new Error('build.py başarısız (' + veri + '): ' + (e.stderr ? String(e.stderr).slice(0, 600) : e.message));
  }
  return cikti;
}

export function temizle(dosya) { try { fs.rmSync(dosya, { force: true }); } catch (e) { /* */ } }

/** Sayfa içi yardımcılar: window.__T (db, nesne üretimi, kapsayıcı, senaryo listesi, ölçümler). */
export const SAYFA_JS = String.raw`(() => {
  const T = window.__T = {};
  T.db = KB.veri.yukle(JSON.parse(document.getElementById('kb-veri').textContent));
  T.log = [];
  T.secenek = (ek) => Object.assign({
    onCihaz: (k) => T.log.push('cihaz ' + k),
    onSoket: (k) => T.log.push('soket ' + k),
    onKablo: (k) => T.log.push('kablo ' + k),
    onUc: (r) => T.log.push('uc ' + JSON.stringify(r)),
  }, ek || {});
  T.nesne = (tur, a) => {
    if (tur === 'kablo') return KB.izle.kablo(T.db, a);
    if (tur === 'uc') return KB.izle.uc(T.db, a);
    if (tur === 'cihaz') return KB.cihazSorgu.cihaz(T.db, a);
    return KB.soketSorgu.soket(T.db, a);
  };
  T.yaziOlcek = 1;   // telefonun yazı boyutu ayarını taklit eder (kök yazı boyutu çarpanı)
  T.kapsayici = (W, tema) => {
    document.documentElement.setAttribute('data-tema', tema || 'koyu');
    document.documentElement.style.fontSize = (T.yaziOlcek * 100) + '%';
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:var(--zemin);color:var(--yazi)';
    const k = document.createElement('div');
    k.id = 'k'; k.style.cssText = 'width:' + W + 'px;margin:0 auto;background:var(--yuzey)';
    document.body.appendChild(k);
    return k;
  };
  /** Bütün kablo / cihaz / soket sorguları + her adim'inci uç (pin) sorgusu. */
  T.senaryolar = (adim) => {
    const liste = [], goruldu = {};
    const ekle = (tur, a, ad) => { const k = tur + ':' + JSON.stringify(a); if (goruldu[k]) return; goruldu[k] = 1; liste.push({ tur, a, ad }); };
    const cihazKodlari = [];
    T.db.sekmeler.forEach((s) => {
      const r = KB.ara.liste(T.db, s.id, { limit: 100000 });
      r.kablo.forEach((k) => ekle('kablo', k.anahtar, 'kablo ' + k.etiket));
      r.cihaz.forEach((c) => { ekle('cihaz', c.kod, 'cihaz ' + c.kod); cihazKodlari.push(c.kod); });
      r.soket.forEach((x) => ekle('soket', x.soket, 'soket ' + x.soket));
    });
    let n = 0;
    cihazKodlari.forEach((kod) => {
      const q = KB.cihazSorgu.cihaz(T.db, kod);
      if (!q) return;
      q.soketler.forEach((g) => {
        if (g.soket) ekle('soket', g.soket, 'soket ' + g.soket);
        g.satirlar.forEach((s) => { if (s.uc && (n++ % adim) === 0) ekle('uc', s.uc, 'uç ' + kod + ' ' + (s.soket || '-') + '/' + (s.pin || '?')); });
      });
    });
    liste.filter((x) => x.tur === 'kablo').forEach((x) => { const iz = KB.izle.kablo(T.db, x.a); if (iz) iz.dugumler.forEach((d) => { if (d.tur === 'soket' && d.soket) ekle('soket', d.soket, 'soket ' + d.soket); }); });
    return liste;
  };

  const CERCEVE = /(^|\s)dy-(kart|kapsul|kapsul-bos|cip|cip-supheli|cip-hata|roz-supheli|roz-hata|roz-varyant|roz-not|roz-yok|roz-sorgu|bant|pinkutu|soru)(\s|$)/;
  const KART_CIP = /(^|\s)dy-(kart|cip|cip-supheli|cip-hata)(\s|$)/;
  const ac = (r, sr) => ({ x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height });
  const kes = (a, b) => ({ x: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), y: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) });
  const iceride = (ic, dis, tol) => ic.x >= dis.x - tol && ic.y >= dis.y - tol && ic.x + ic.w <= dis.x + dis.w + tol && ic.y + ic.h <= dis.y + dis.h + tol;
  const kisa = (s) => (s.length > 28 ? s.slice(0, 27) + '…' : s);

  /** Çizilmiş bir svg için ölçüm. Dönen: { sorunlar:[{k,m}], uyarilar:[{k,m}], n:{metin,hedef} }. */
  T.olc = (svg, W) => {
    const sorun = [], uyari = [];
    const ekle = (liste, k, m) => { if (liste.filter((x) => x.k === k).length < 6) liste.push({ k, m }); };
    const sr = svg.getBoundingClientRect();
    if (svg.getAttribute('role') !== 'img') ekle(sorun, 'erisilebilirlik', 'svg role="img" yok');
    if (!(svg.getAttribute('aria-label') || '').trim()) ekle(sorun, 'erisilebilirlik', 'svg aria-label boş');
    const metinler = [...svg.querySelectorAll('text')].filter((t) => !t.closest('.dy-prob') && t.textContent.trim() !== '');
    const kutu = metinler.map((t) => ({ t, s: t.textContent, ...ac(t.getBoundingClientRect(), sr) })).filter((b) => b.w > 0 && b.h > 0);
    // 1) metin ↔ metin
    for (let i = 0; i < kutu.length; i++) {
      for (let j = i + 1; j < kutu.length; j++) {
        const k = kes(kutu[i], kutu[j]);
        if (k.x > 1 && k.y > 1) ekle(sorun, 'metin-cakisma', '"' + kisa(kutu[i].s) + '" ↔ "' + kisa(kutu[j].s) + '" @' + Math.round(kutu[i].x) + ',' + Math.round(kutu[i].y) + ' (' + k.x.toFixed(1) + '×' + k.y.toFixed(1) + ')');
      }
    }
    // 2) metin svg dışına taşıyor mu, yazı boyutu
    kutu.forEach((b) => {
      if (b.x < -0.5 || b.x + b.w > W + 0.5) ekle(sorun, 'metin-tasma', '"' + kisa(b.s) + '" svg dışında x=' + Math.round(b.x) + ' w=' + Math.round(b.w) + ' W=' + W);
      const cs = getComputedStyle(b.t), px = parseFloat(cs.fontSize), sn = b.t.getAttribute('class') || '';
      const kod = /(^|\s)dy-(p|pa|k|kb)(\s|$)/.test(sn);
      if (px < (kod ? 17.99 : 13.99)) ekle(sorun, 'yazi-boyutu', '"' + kisa(b.s) + '" ' + px + ' px (' + (kod ? '≥18' : '≥14') + ' olmalı)');
    });
    // 3) metin kendi çerçevesinin dışına taşıyor mu
    kutu.forEach((b) => {
      let cer = null;
      for (let g = b.t.parentNode; g && g !== svg; g = g.parentNode) {
        const rl = [...g.children].filter((c) => c.tagName === 'rect' && CERCEVE.test(c.getAttribute('class') || ''));
        if (rl.length) { cer = rl; break; }
      }
      if (!cer) return;
      const rr = cer.map((r) => ac(r.getBoundingClientRect(), sr));
      const ok = rr.some((r) => iceride(b, r, 2.5));
      const yarim = rr.some((r) => { const k = kes(b, r); return k.x > 1 && k.y > 1; });   // kenarı aşıyor (tamamen dışarıdaki başka öğenin yazısı sayılmaz)
      if (!ok && yarim) ekle(sorun, 'kutu-tasma', '"' + kisa(b.s) + '" çerçevesine sığmıyor @' + Math.round(b.x) + ',' + Math.round(b.y));
    });
    // 4) kart/çip çerçeveleri birbirine biniyor mu, svg dışına çıkıyor mu
    const cerc = [...svg.querySelectorAll('rect')].filter((r) => KART_CIP.test(r.getAttribute('class') || '')).map((r) => ac(r.getBoundingClientRect(), sr));
    cerc.forEach((c, i) => {
      if (c.x < -0.5 || c.x + c.w > W + 0.5) ekle(sorun, 'cerceve-tasma', 'çerçeve svg dışında x=' + Math.round(c.x) + ' w=' + Math.round(c.w));
      for (let j = i + 1; j < cerc.length; j++) {
        const d = cerc[j], k = kes(c, d);
        if (k.x > 2 && k.y > 2 && !iceride(c, d, 1) && !iceride(d, c, 1)) ekle(sorun, 'cerceve-cakisma', 'iki çerçeve kesişiyor @' + Math.round(c.x) + ',' + Math.round(c.y) + ' / ' + Math.round(d.x) + ',' + Math.round(d.y));
      }
    });
    // 5) dokunma hedefleri
    const hedefler = [...svg.querySelectorAll('.dy-dokun')].map((g) => {
      const z = g.querySelector(':scope > .dy-zemin');
      return { g, ...ac((z || g).getBoundingClientRect(), sr), ad: g.getAttribute('aria-label') || '' };
    });
    hedefler.forEach((h, i) => {
      if (h.w < 47.5 || h.h < 47.5) ekle(sorun, 'hedef-kucuk', '"' + kisa(h.ad) + '" ' + Math.round(h.w) + '×' + Math.round(h.h));
      for (let j = i + 1; j < hedefler.length; j++) {
        const d = hedefler[j];
        if (h.g.contains(d.g) || d.g.contains(h.g)) continue;
        const k = kes(h, d);
        if (k.x > 0.5 && k.y > 0.5) { ekle(uyari, 'hedef-ic-ice', '"' + kisa(h.ad) + '" ↔ "' + kisa(d.ad) + '" dokunma alanları kesişiyor'); continue; }
        const bosluk = Math.max(k.x < 0 ? -k.x : 0, k.y < 0 ? -k.y : 0);
        if (bosluk < 7.5) ekle(uyari, 'hedef-aralik', '"' + kisa(h.ad) + '" ↔ "' + kisa(d.ad) + '" arası ' + Math.round(bosluk) + ' px');
      }
    });
    return { sorunlar: sorun, uyarilar: uyari, n: { metin: kutu.length, hedef: hedefler.length } };
  };

  /** Çizimde olması gereken bilgiler (KB.metin ile aynı bilgi): cihaz kodları, soket adları, kablo numaraları, bileşen kodları. */
  T.bilgi = (tur, nesne, svg) => {
    const yaz = [...svg.querySelectorAll('text')].filter((t) => !t.closest('.dy-prob')).map((t) => t.textContent).join('');
    const eksik = [], gor = {};
    const iste = (ad, deger) => { if (deger == null || deger === '') return; const d = ad === 'kablo' ? String(deger).replace(/^#/, '') : String(deger); if (gor[ad + d]) return; gor[ad + d] = 1; if (!yaz.includes(d)) eksik.push(ad + ' "' + deger + '"'); };
    const dugum = (d) => {
      // soket + pin + pin adı yan yana (kapsül) yazılmış olmalı; '?' çipleri de aynı sırada
      if (d.tur === 'cihaz' && !d.gecisUcu && d.pin != null) iste('uç adresi', (d.soket || '') + d.pin + (d.pinAdi || ''));
      else if (d.tur === 'soket' && d.pin != null) iste('uç adresi', d.soket + d.pin);
      if (d.tur === 'cihaz') { if (!d.gecisUcu) iste('cihaz', d.cihaz); iste('soket', d.soket); }
      else if (d.tur === 'soket') iste('soket', d.soket);
      else if (d.tur === 'dugum' && !d.kodsuz) iste('düğüm', d.kod);
      else if (d.tur === 'devam') iste('devam', d.hedefCihaz);
    };
    if (tur === 'kablo' || tur === 'uc') {
      nesne.dugumler.forEach(dugum);
      nesne.kenarlar.forEach((k) => { if (k.sanal) iste('bileşen', k.bilesen.kod); else if (!k.ic) iste('kablo', k.etiket); if (k.soketIci) iste('köprü notu', 'köprü'); });
    } else {
      const satir = (sr) => { iste('pin', sr.pin); iste('pin adı', sr.pinAdi); (sr.kablolar || []).forEach((kb) => { if (kb.kenar.ic || kb.kenar.sanal) return; /* cihaz/bileşen içi kol: karşı pinin kendi satırı gösterir */ iste('kablo', kb.kenar.etiket); (kb.varis || []).forEach(dugum); (kb.gecisler || []).forEach((g) => iste('bileşen', g.kod)); }); };
      if (tur === 'cihaz') { iste('cihaz', nesne.cihaz.kod); nesne.soketler.forEach((g) => { iste('soket', g.soket); g.satirlar.forEach(satir); }); }
      else nesne.eslesmeler.forEach((e) => { iste('soket', e.soket); iste('cihaz', e.cihaz && e.cihaz.kod); e.satirlar.forEach(satir); });
    }
    return eksik;
  };

  /** Tek senaryoyu çiz + ölç. */
  T.dene = (s, W, tema) => {
    const kap = T.kapsayici(W, tema);
    const t0 = performance.now();
    let c = null, hata = null;
    try {
      const nesne = T.nesne(s.tur, s.a);
      if (!nesne) return { yok: true };
      c = KB.diyagram.ciz(kap, nesne, T.secenek());
    } catch (e) { hata = String(e && e.stack || e).slice(0, 500); }
    if (hata || !c) return { hata: hata || 'ciz() null döndü' };
    const svg = kap.querySelector('svg.dy');
    const o = T.olc(svg, W);
    T.bilgi(s.tur, T.nesne(s.tur, s.a), svg).slice(0, 6).forEach((m) => o.sorunlar.push({ k: 'bilgi-eksik', m: 'çizimde yok: ' + m }));
    const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
    if (sw > iw) o.sorunlar.push({ k: 'yatay-kaydirma', m: 'scrollWidth ' + sw + ' > innerWidth ' + iw });
    const bilgi = { yerlesim: c.yerlesim, h: Math.round(c.yukseklik), ms: Math.round(performance.now() - t0) };
    c.yokEt();
    return { ...o, bilgi };
  };
  /** Düzenek sınaması: bilerek bozuk bir çizimde ölçümün dört sorun türünü de yakaladığını doğrular. */
  T.sinama = () => {
    const NS = 'http://www.w3.org/2000/svg', kap = T.kapsayici(300);
    const e = (ad, oz, ata, metin) => { const x = document.createElementNS(NS, ad); Object.keys(oz || {}).forEach((k) => x.setAttribute(k, oz[k])); if (metin) x.textContent = metin; (ata || svg).appendChild(x); return x; };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'dy'); svg.setAttribute('width', 300); svg.setAttribute('height', 140); svg.setAttribute('viewBox', '0 0 300 140');
    kap.appendChild(svg);
    e('text', { class: 'dy-g', x: 10, y: 20 }, svg, 'ABCDEFGHIJ');
    e('text', { class: 'dy-g', x: 30, y: 24 }, svg, 'KLMNOPRSTU');
    e('text', { class: 'dy-g', x: 250, y: 60 }, svg, 'TAŞAN METİN');
    const g = e('g', {}, svg);
    e('rect', { class: 'dy-kart', x: 10, y: 80, width: 60, height: 30 }, g);
    e('text', { class: 'dy-g', x: 20, y: 95 }, g, 'ÇOK UZUN BİR YAZI');
    const d = e('g', { class: 'dy-dokun' }, svg);
    e('rect', { class: 'dy-zemin', x: 200, y: 100, width: 20, height: 20 }, d);
    const o = T.olc(svg, 300);
    return [...new Set(o.sorunlar.map((x) => x.k))].sort();
  };
  return Object.keys(T).length;
})()`;
