// (b) Çevrimdışı garantisi: ağ isteği SIFIR.
//   1. Canlı: sayfa açılırken ve bütün ekranlar gezilirken CDP `Network.requestWillBeSent` (ana belge hariç) ve
//      `performance.getEntriesByType('resource')` boş; fetch / XHR / sendBeacon / WebSocket / EventSource çağrısı yok.
//   2. Statik: HTML'de dış başvuru (http(s)://, <link>, <script src>, <img>, @import, url(http…), protokolsüz //…) yok.
//   node test/tarayici/cevrimdisi.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, kisa } from './yardimci.mjs';
import { ekranlar } from './supurme.mjs';

// ağ API'lerini sayfa yüklenmeden ÖNCE sarar: çağrı olursa __agCagrilari'na yazar
const AG_KANCASI = `(() => {
  const kayit = (window.__agCagrilari = []);
  const sar = (nesne, ad, etiket) => { try { const o = nesne[ad]; if (typeof o !== 'function') return; nesne[ad] = function () { kayit.push(etiket + ' ' + String(arguments[0]).slice(0, 120)); return o.apply(this, arguments); }; } catch (e) { /* */ } };
  sar(window, 'fetch', 'fetch');
  if (window.XMLHttpRequest) sar(XMLHttpRequest.prototype, 'open', 'XMLHttpRequest.open');
  if (navigator.sendBeacon) sar(navigator, 'sendBeacon', 'sendBeacon');
  for (const ad of ['WebSocket', 'EventSource', 'Worker', 'SharedWorker']) {
    try { const O = window[ad]; if (!O) continue; window[ad] = function () { kayit.push(ad + ' ' + String(arguments[0]).slice(0, 120)); return new O(...arguments); }; window[ad].prototype = O.prototype; } catch (e) { /* */ }
  }
  try { if (navigator.serviceWorker && navigator.serviceWorker.register) sar(navigator.serviceWorker, 'register', 'serviceWorker.register'); } catch (e) { /* */ }
})()`;

const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum}`);

for (const surum of [DAGITIM, DOGRULAMA]) {
  await sinama(`[${surum.ad}] ağ isteği sıfır: açılış ve bütün ekranların gezilmesi boyunca (Network.requestWillBeSent + performance resource)`, async () => {
    await t.ac(surum, { oncesi: [AG_KANCASI] });
    // pozitif kontrol: dinleyici gerçekten çalışıyor mu? Ana belge isteği listede olmalı
    const belge = p.requests.filter((r) => r.tur === 'Document');
    assert.ok(belge.length >= 1 && belge.some((r) => r.url === surum.url), `Network dinleyicisi ana belge isteğini görmedi (istekler: ${JSON.stringify(p.requests).slice(0, 300)}): test çalışmıyor olabilir`);
    let ekranSayisi = 0;
    for await (const e of ekranlar(p, { kapsam: 'tam' })) { ekranSayisi++; void e; }
    // tema, "Hepsini göster", boş sekme dokunuşları süpürmede var; ek olarak temayı elle çevir
    await p.eval(`__kbt.temaTikla('acik'); __kbt.temaTikla('koyu')`);
    const dis = p.requestsDisarida();
    const kaynaklar = await p.eval(`performance.getEntriesByType('resource').map((r) => r.initiatorType + ' ' + r.name.slice(0, 120))`);
    const ag = await p.eval('window.__agCagrilari || []');
    const hatalar = new Hatalar();
    if (dis.length) hatalar.ekle(`${dis.length} dış ağ isteği (Network.requestWillBeSent): ` + dis.slice(0, 6).map((r) => `${r.tur} ${r.method} ${kisa(r.url, 100)}`).join(' | '));
    if (kaynaklar.length) hatalar.ekle(`performance.getEntriesByType('resource') boş değil: ` + kaynaklar.slice(0, 6).join(' | '));
    if (ag.length) hatalar.ekle(`ağ API'si çağrıldı: ` + ag.slice(0, 6).join(' | '));
    const toplamIstek = p.requests.length;
    if (toplamIstek !== 1) hatalar.ekle(`oturum boyunca toplam istek sayısı 1 (yalnız ana belge) olmalı, ${toplamIstek}: ` + p.requests.map((r) => r.tur + ' ' + kisa(r.url, 80)).join(' | '));
    if (p.errors.length) hatalar.ekle('konsol hatası: ' + p.errors.slice(0, 3).join(' | '));
    hatalar.denetle(`çevrimdışı garantisi bozuk (${ekranSayisi} ekran gezildi)`);
    console.log(`  · ${ekranSayisi} ekran gezildi; toplam ağ isteği ${toplamIstek} (yalnız ana belge); resource girdisi 0; ağ API çağrısı 0`);
  });
}

// ---- statik tarama: HTML dosyasında dış başvuru ----------------------------------------------------------------
const XML_AD_ALANLARI = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xhtml', 'http://www.w3.org/XML/1998/namespace', 'http://www.w3.org/2000/xmlns/'];
function veriYukunuAyir(html) {
  const m = /<script type="application\/json" id="kb-veri">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return { veri: '', kod: html };
  return { veri: m[1], kod: html.slice(0, m.index) + html.slice(m.index + m[0].length) };
}
for (const surum of [DAGITIM, DOGRULAMA]) {
  await sinama(`[${surum.ad}] HTML'de dış başvuru yok (statik tarama: http(s)://, <link>, <script src>, <img>, <iframe>, @import, url(http…), fetch/XHR kodu)`, async () => {
    const html = fs.readFileSync(surum.dosya, 'utf8');
    const { veri: yuk, kod } = veriYukunuAyir(html);
    const hatalar = new Hatalar();
    const baglam = (metin, i, n = 50) => kisa(metin.slice(Math.max(0, i - n), i + n), 110);
    let temiz = kod;
    for (const ad of XML_AD_ALANLARI) temiz = temiz.split(ad).join('');
    for (const [ad, metin] of [['kod/biçim', temiz], ['veri', yuk]]) {
      for (const m of metin.matchAll(/https?:\/\/[^\s"'<>)]+/g)) hatalar.ekle(`${ad}: dış adres "${kisa(m[0], 80)}" — …${baglam(metin, m.index)}…`);
    }
    const desenler = [
      [/<link\b[^>]*>/gi, '<link> öğesi'],
      [/<script\b[^>]*\bsrc\s*=/gi, '<script src=…>'],
      [/<(img|iframe|embed|object|video|audio|source|track)\b/gi, 'harici içerik öğesi'],
      [/@import\b/gi, '@import'],
      [/url\(\s*["']?(?!#|data:)[^)"'\s]/gi, 'url(…) dış/göreli başvuru'],
      [/\b(src|href|action|poster)\s*=\s*["']\/\//gi, 'protokolsüz // başvuru'],
      [/\b(src|href)\s*=\s*["'](?!#|data:)[^"']*\.(js|css|png|jpe?g|gif|svg|woff2?|ttf|json)\b/gi, 'harici dosya başvurusu'],
      [/\bfetch\s*\(/g, 'fetch( çağrısı'],
      [/\bXMLHttpRequest\b/g, 'XMLHttpRequest'],
      [/\bsendBeacon\b/g, 'sendBeacon'],
      [/\bnew\s+(WebSocket|EventSource|Worker|SharedWorker)\b/g, 'ağ/işçi kurucusu'],
      [/\bimportScripts\s*\(/g, 'importScripts'],
      [/\bserviceWorker\b/g, 'serviceWorker']
    ];
    for (const [re, ad] of desenler) {
      for (const m of kod.matchAll(re)) hatalar.ekle(`${ad}: "${kisa(m[0], 60)}" — …${baglam(kod, m.index)}…`);
    }
    // gömülü veri paketi geçerli JSON ve beklenen şemaları taşıyor
    const paket = JSON.parse(yuk);
    assert.ok(paket && paket.veri && Object.keys(paket.veri).length >= 1, 'gömülü veri paketi boş');
    hatalar.denetle('dış başvuru bulundu');
  });
}

await t.kapat();
bitir();
