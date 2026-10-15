// Tarayıcı testleri için ortak yardımcılar. Arayüz yapısına bağlı HER ŞEY burada toplanır: arayüz değişirse yalnız bu dosya (SEC) düzeltilir.
//
// Bağımlılık sırası (en sağlam → en kırılgan):
//   1. window.KB API'si ve gömülü veri (KB.arayuz.db.meta.surum, istatistik)    2. #kb-ara, role="tab", aria-label, görünür metin
//   3. SEC içindeki sınıf adları (yalnız sonuç satırı, pin satırı, tema düğmesi, "Hepsini göster")
//
// Beklenen değerler veri/<sema>.json dosyalarından türetilir (uygulama çıktısından DEĞİL).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, tarayicilariOldur } from '../cdp.mjs';

export const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Arayüzde tek yerden değiştirilecek seçiciler. */
export const SEC = {
  kok: '#kb-kok',
  girdi: '#kb-ara',
  icerik: '#kb-icerik',
  sekme: '[role="tab"]',
  temaDugmesi: '[data-tema-sec]',
  sonucSatiri: 'button.sonuc',        // arama sonucu satırı (cihaz / soket / kablo); sınıf: sonuc-kablo | sonuc-cihaz | sonuc-soket
  pinSatiri: 'button.pin-satir',      // cihaz/soket kartındaki pin satırı
  hepsiniGoster: 'button.daha-fazla',
  kart: 'article',
  kartBasligi: 'article h2',
  metinOzeti: '[aria-label="Metin özeti"]',
  kaynak: '[aria-label="Kaynak"]',
  yukleniyor: '#kb-yukleniyor'
};

/** Testlerin ekrandan okuduğu arayüz cümleleri (metin değişirse yalnız burası düzeltilir). Hepsi alt dize/düzenli ifade parçasıdır. */
export const YAZI = {
  ilkEkran: 'Ne arıyorsun',                 // ilk ekran başlığı ("Ne arıyorsun?")
  bosSekme: 'şeması henüz eklenmedi',       // şeması olmayan sekme ekranı ("Bu sistemin şeması henüz eklenmedi")
  bulunamadi: 'bulunamadı',                 // arama sonuçsuz ("“zzz” bulunamadı")
  dogrulanmadi: 'DOĞRULANMADI',             // doğrulanmamış şema etiketi / şeridi
  dogrulandi: 'DOĞRULANDI',                 // doğrulanmış şema rozeti
  hata: ['Uygulama başlatılamadı', 'Bir şey ters gitti']
};

// ------------------------------------------------------------------------------------------------------------
//  dağıtım dosyaları
// ------------------------------------------------------------------------------------------------------------
function surum(ad, dosya, kod) {
  const tam = path.join(KOK, 'dist', dosya);
  return { ad, kod, dosya: tam, url: pathToFileURL(tam).href };
}
export const DAGITIM = surum('dağıtım', 'kablo-bulucu.html', 'dagitim');
export const DOGRULAMA = surum('doğrulama', 'kablo-bulucu-dogrulama.html', 'dogrulama');
// Sınanacak dosya değiştirilebilir (bilerek bozulmuş bir kopyayla testlerin gerçekten yakaladığını göstermek için):
//   KB_DAGITIM=/yol/kopya.html node test/tarayici/kablo-arama.mjs
if (process.env.KB_DAGITIM) { DAGITIM.dosya = path.resolve(process.env.KB_DAGITIM); DAGITIM.url = pathToFileURL(DAGITIM.dosya).href; }
if (process.env.KB_DOGRULAMA) { DOGRULAMA.dosya = path.resolve(process.env.KB_DOGRULAMA); DOGRULAMA.url = pathToFileURL(DOGRULAMA.dosya).href; }

export function distVarMi() {
  for (const s of [DAGITIM, DOGRULAMA]) {
    if (!fs.existsSync(s.dosya)) throw new Error(`${s.dosya} yok: önce \`python3 build.py\` (dağıtım) ve \`python3 build.py --notlar\` (doğrulama) çalıştırın`);
  }
}

// ------------------------------------------------------------------------------------------------------------
//  mini koşucu (bağımlılıksız; her test dosyası ayrı süreç olarak da çalışır)
// ------------------------------------------------------------------------------------------------------------
const kayit = [];
let kesildi = false;
const baslangic = Date.now();

/** Bir sınama: fn hata atarsa başarısız. Birden çok bulguyu tek hatada toplamak için `Hatalar` kullanın. */
export async function sinama(ad, fn, { zamanAsimi = 120000 } = {}) {
  if (kesildi) { kayit.push({ ad, ok: false, atlandi: true, hata: 'önceki sınama zaman aşımına uğradığı için çalışmadı' }); console.log(`not ok - ${ad}  # atlandı (önceki zaman aşımı)`); return; }
  const t0 = Date.now(); let zaman;
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, rej) => { zaman = setTimeout(() => rej(Object.assign(new Error(`zaman aşımı (${zamanAsimi} ms)`), { zamanAsimi: true })), zamanAsimi); })
    ]);
    const ms = Date.now() - t0;
    kayit.push({ ad, ok: true, ms });
    console.log(`ok - ${ad}  (${ms} ms)`);
  } catch (e) {
    const ms = Date.now() - t0;
    if (e && e.zamanAsimi) { kesildi = true; tarayicilariOldur(); }
    const ileti = String((e && e.message) || e);
    kayit.push({ ad, ok: false, ms, hata: ileti });
    console.log(`not ok - ${ad}  (${ms} ms)`);
    for (const s of ileti.split('\n')) console.log('    ' + s);
  } finally { clearTimeout(zaman); }
}

/** Bulguları toplayıp tek hata olarak atmak için. */
export class Hatalar {
  constructor(sinir = 40) { this.liste = []; this.sinir = sinir; this.say = 0; }
  ekle(m) { this.say++; if (this.liste.length < this.sinir) this.liste.push(m); }
  denetle(ozet) {
    if (!this.say) return;
    const fazla = this.say - this.liste.length;
    throw new Error(`${ozet}: ${this.say} bulgu\n` + this.liste.map((m) => '- ' + m).join('\n') + (fazla > 0 ? `\n… (${fazla} bulgu daha)` : ''));
  }
}

/** Koşuyu bitirir: özet yazar, JSON sonucu (KB_SONUC_DOSYASI) kaydeder, açık tarayıcıları kapatır, çıkış kodunu ayarlar. */
export function bitir() {
  tarayicilariOldur();
  const gecen = kayit.filter((k) => k.ok).length, kalan = kayit.length - gecen;
  console.log(`# ${kayit.length} sınama, ${gecen} geçti, ${kalan} kaldı (${((Date.now() - baslangic) / 1000).toFixed(1)} sn)`);
  if (process.env.KB_SONUC_DOSYASI) {
    try { fs.writeFileSync(process.env.KB_SONUC_DOSYASI, JSON.stringify({ kayit, gecen, kalan })); } catch (e) { /* */ }
  }
  process.exit(kalan ? 1 : 0);
}

// ------------------------------------------------------------------------------------------------------------
//  sayfa içi yardımcı (window.__kbt): yalnız SEC'e ve görünür metne dayanır. Fonksiyon kaynak metni olarak sayfaya gönderilir.
// ------------------------------------------------------------------------------------------------------------
function kbtKur(SEC, YAZI) {
  const q = (s, k) => (k || document).querySelector(s);
  const qa = (s, k) => Array.prototype.slice.call((k || document).querySelectorAll(s));
  const T = {
    girdi() { return q(SEC.girdi); },
    /** programlı yazma: değeri koyar, input olayını yollar (arayüz eşzamanlı yeniden çizer) */
    ara(s) { const i = q(SEC.girdi); i.value = s; i.dispatchEvent(new Event('input', { bubbles: true })); return true; },
    odakla() { const i = q(SEC.girdi); i.focus(); return document.activeElement === i; },
    icerik() { const e = q(SEC.icerik); return e ? e.innerText : ''; },
    ekran() {
      const ic = q(SEC.icerik); if (!ic) return 'yok';
      if (q(SEC.kart, ic)) return 'detay';
      if (qa(SEC.sonucSatiri, ic).length) return 'liste';
      const t = ic.innerText;
      if (t.indexOf(YAZI.bosSekme) >= 0) return 'bos-sekme';
      if (t.indexOf(YAZI.bulunamadi) >= 0) return 'bulunamadi';
      if (t.indexOf(YAZI.ilkEkran) >= 0) return 'ilk';
      if (YAZI.hata.some((x) => t.indexOf(x) >= 0)) return 'hata';
      return 'bilinmiyor';
    },
    satirlar() {
      const ic = q(SEC.icerik);
      return qa(SEC.sonucSatiri, ic).map((el) => {
        const s = el.innerText.split('\n').map((x) => x.trim()).filter(Boolean);
        const sinif = el.className || '';
        const tur = /sonuc-kablo/.test(sinif) || s[0] === 'KABLO' ? 'kablo' : /sonuc-soket/.test(sinif) ? 'soket' : 'cihaz';
        return { tur, ust: s[0] || '', kod: s[1] || '', satirlar: s, metin: el.innerText };
      });
    },
    /** tür ('kablo'|'cihaz'|'soket') ve koda göre sonuç satırına dokunur. Büyük/küçük harf yok sayılır; önce TAM eşleşme aranır
        (numarasız '2,5br' ile '#2,5br' ayrı kablolardır), bulunamazsa numaralı kablo biçimi '#'+kod denenir (4002 → #4002). */
    satirTikla(tur, kod) {
      const b = (x) => String(x).toUpperCase();
      const s = T.satirlar();
      const ic = qa(SEC.sonucSatiri, q(SEC.icerik));
      const dene = (hedef) => { for (let i = 0; i < s.length; i++) if (s[i].tur === tur && b(s[i].kod) === b(hedef)) { ic[i].click(); return true; } return false; };
      return dene(kod) || (tur === 'kablo' && dene('#' + kod));
    },
    pinSatiriSayisi() { return qa(SEC.pinSatiri, q(SEC.icerik)).length; },
    pinSatiriTikla(i) { const l = qa(SEC.pinSatiri, q(SEC.icerik)); if (!l[i]) return false; l[i].click(); return true; },
    hepsiniGoster() { const b = q(SEC.hepsiniGoster, q(SEC.icerik)); if (!b) return false; b.click(); return true; },
    kartBasligi() { const h = q(SEC.kartBasligi, q(SEC.icerik)); return h ? h.innerText.trim() : null; },
    metinOzeti() { const e = q(SEC.metinOzeti, q(SEC.icerik)); return e ? e.innerText : null; },
    kaynak() { const e = q(SEC.kaynak, q(SEC.icerik)); return e ? e.innerText : null; },
    kartMetni() { const e = q(SEC.kart, q(SEC.icerik)); return e ? e.innerText : null; },
    sekmeler() {
      return qa(SEC.sekme).map((el) => {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        return {
          metin: el.textContent.replace(/\s+/g, ' ').trim(), secili: el.getAttribute('aria-selected') === 'true',
          gorunur: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
          sol: Math.round(r.left), sag: Math.round(r.right), genislik: Math.round(r.width), yukseklik: Math.round(r.height)
        };
      });
    },
    sekmeTikla(i) { const l = qa(SEC.sekme); if (!l[i]) return false; l[i].click(); return true; },
    /** Sayfanın yatay taşması. hedef: beklenen CSS genişliği (360 …); verilmezse innerWidth.
        DİKKAT: mobil emülasyonda içerik hedeften genişse Chrome görüntü alanını içeriğe göre büyütür (innerWidth = içerik genişliği),
        yani `scrollWidth <= innerWidth` taşan sayfada da doğru çıkar. Bu yüzden ölçüt: max(scrollWidth, body.scrollWidth, innerWidth) <= hedef.
        Taşıyorsa hangi öğelerin sağ kenarı hedefin dışında (kendi yatay kaydırma kabı içindekiler sayılmaz) listelenir. */
    tasma(hedef) {
      const de = document.documentElement, b = document.body, iw = window.innerWidth, h = hedef || iw;
      const o = { hedef: h, iw, sw: de.scrollWidth, bw: b ? b.scrollWidth : 0, taşanlar: [] };
      if (Math.max(o.sw, o.bw, iw) <= h) return o;
      const kaydirilir = (e) => {
        for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
        }
        return false;
      };
      qa('body *').forEach((e) => {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return;
        const r = e.getBoundingClientRect();
        if (!r.width && !r.height) return;
        if ((r.right > h + 0.5 || r.left < -0.5) && !kaydirilir(e)) {
          if (o.taşanlar.length < 8) o.taşanlar.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + '] "' + (e.textContent || '').trim().slice(0, 40) + '"');
        }
      });
      return o;
    },
    /** uygulama kökündeki görünür + gizli (kapalı <details> dahil) metin ve niteliklerdeki metinler; <script>/<style> hariç */
    kokMetni() {
      const kok = q(SEC.kok).cloneNode(true);
      qa('script,style', kok).forEach((e) => e.remove());
      const nitelik = [];
      qa('*', kok).forEach((e) => { for (const a of Array.prototype.slice.call(e.attributes)) { if (!/^(class|id|d|points|viewBox|transform|style|x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|fill|stroke|stroke-width|stroke-dasharray|font-size|text-anchor|href|xlink:href|type|role|tabindex|focusable|aria-hidden|aria-selected|aria-pressed|hidden|name|action|inputmode|enterkeyhint|autocapitalize|autocomplete|autocorrect|spellcheck)$/i.test(a.name)) nitelik.push(a.name + '=' + a.value); } });
      const baslik = [document.title].concat(qa('meta').map((m) => m.getAttribute('content') || '')).join('\n');
      return { metin: kok.textContent, nitelik: nitelik.join('\n'), baslik };
    },
    temaDugmeleri() { return qa(SEC.temaDugmesi).map((e) => ({ tema: e.getAttribute('data-tema-sec'), basili: e.getAttribute('aria-pressed') })); },
    temaTikla(t) { const e = qa(SEC.temaDugmesi).find((x) => x.getAttribute('data-tema-sec') === t); if (!e) return false; e.click(); return true; }
  };
  window.__kbt = T;
  return true;
}
export const KBT_KAYNAK = `(${kbtKur.toString()})(${JSON.stringify(SEC)}, ${JSON.stringify(YAZI)})`;

// ------------------------------------------------------------------------------------------------------------
//  tarayıcı oturumu
// ------------------------------------------------------------------------------------------------------------
/**
 * Brave'i açar. genislik/yukseklik/mobil: görüntü alanı emülasyonu (mobil: true → resize(w,h,true)).
 * Dönen nesne: { p (sayfa), b (cdp), ac(surum, {oncesi:[betik…]}), kapat() }
 */
export async function tarayici({ genislik = 360, yukseklik = 800, mobil = true } = {}) {
  distVarMi();
  const b = await launch({ width: genislik, height: yukseklik, zamanAsimi: 10 * 60 * 1000 });
  const p = b.page;
  if (mobil) await p.resize(genislik, yukseklik, true);
  const o = {
    b, p, surum: b.surum,
    async boyut(g, y, m = true) { await p.resize(g, y, m); },
    /** Sürümü (DAGITIM | DOGRULAMA) açar, uygulama hazır olana kadar bekler, yardımcıyı yükler. */
    async ac(s = DAGITIM, { oncesi = [], bekle = true } = {}) {
      for (const k of oncesi) await p.onNewDocument(k);
      // aynı adrese yeniden gitmek bir "yeniden yükleme" sayılır ve history.state korunur (uygulama kaldığı ekrandan devam eder):
      // önceki sınamanın ekranı sızmasın diye önce boş sayfaya gidilir
      await p.goto('about:blank');
      await p.goto(s.url);
      if (!bekle) return p;
      try {
        await p.until(`(() => { const e = document.querySelector(${JSON.stringify(SEC.icerik)}); return !!(e && !document.querySelector(${JSON.stringify(SEC.yukleniyor)}) && e.innerText.trim().length > 0); })()`, 10000);
      } catch (e) {
        const ic = await p.eval(`(document.querySelector(${JSON.stringify(SEC.icerik)}) || {}).innerText || '(içerik alanı yok)'`);
        throw new Error('uygulama açılmadı: ' + String(ic).slice(0, 200) + (p.errors.length ? ' · hatalar: ' + p.errors.join(' | ').slice(0, 300) : ''));
      }
      await p.eval(KBT_KAYNAK);
      return p;
    },
    /** gerçek yazma (CDP Input.insertText): kutuyu temizler, odaklar, yazar */
    async yaz(metin) {
      await p.eval(`(() => { __kbt.ara(''); __kbt.odakla(); })()`);
      if (metin) await p.type(metin);
    },
    async kapat() { await b.close(); }
  };
  return o;
}

/** Ekran okuması: tek çağrıda ekran türü, taşma ve içerik metni. */
export async function olc(p, { kok = false, satirlar = false, genislik = 0 } = {}) {
  return p.eval(`(() => ({ ekran: __kbt.ekran(), tasma: __kbt.tasma(${genislik || 0}), icerik: __kbt.icerik(), kart: __kbt.kartBasligi(), ${kok ? 'koku: __kbt.kokMetni(),' : ''} ${satirlar ? 'satirlar: __kbt.satirlar(),' : ''} satirSayisi: __kbt.satirlar().length }))()`);
}

// ------------------------------------------------------------------------------------------------------------
//  veri: veri/<sema>.json (beklenenler buradan)
// ------------------------------------------------------------------------------------------------------------
export const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
export const kacis = (s) => String(s).replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');

/** Basit, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
export function tohum(t) {
  let a = t >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const jsonOku = (yol) => JSON.parse(fs.readFileSync(path.join(KOK, yol), 'utf8'));

/** kablo grubu anahtarı: numaralıysa no:…, numarasızsa etiket:…; ic ve etiketsiz parçalar kablo değildir */
export function grupAnahtari(p) {
  if (p.ic) return null;
  if (p.no != null) return 'no:' + p.no;
  if (p.etiket != null) return 'etiket:' + p.etiket;
  return null;
}
/** kullanıcının kutuya yazacağı metin */
export const yazilan = (g) => (g.startsWith('no:') ? g.slice(3) : g.slice(7));

const GECIS_TURLERI = ['sigorta', 'diyot', 'direnc', 'salter'];

let onbellek = null;
/** Bütün veri dosyalarını yükler: { semalarJson, dosyali, dosyasiz, ham, parcalar, gruplar, cihazlar, gecis, semaAd, sekmeler } */
export function veri() {
  if (onbellek) return onbellek;
  const semalarJson = jsonOku('veri/semalar.json');
  const tum = Object.keys(semalarJson.semalar);
  const dosyali = tum.filter((s) => fs.existsSync(path.join(KOK, 'veri', s + '.json')));
  const dosyasiz = tum.filter((s) => !dosyali.includes(s));
  const ham = Object.fromEntries(dosyali.map((s) => [s, jsonOku(`veri/${s}.json`)]));
  const parcalar = [];
  for (const s of dosyali) for (const p of ham[s].kablolar) parcalar.push({ sema: s, p });
  const gruplar = new Map();
  for (const x of parcalar) {
    const g = grupAnahtari(x.p);
    if (g === null) continue;
    if (!gruplar.has(g)) gruplar.set(g, []);
    gruplar.get(g).push(x);
  }
  // cihazlar: kod → { tur, semalar:Set }
  const cihazlar = new Map();
  for (const s of dosyali) for (const c of ham[s].cihazlar) {
    if (!cihazlar.has(c.kod)) cihazlar.set(c.kod, { kod: c.kod, tur: c.tur, kisaAd: c.kisaAd || null, adTr: c.adTr || null, adDe: c.adDe || null, semalar: new Set() });
    cihazlar.get(c.kod).semalar.add(s);
  }
  // geçiş bileşenleri (API.md §4.9): türü sigorta/diyot/direnç/şalter, veride TAM iki terminal, cihaz içi köprüsü yok
  const terminal = new Map(); // kod → Set(terminal anahtarı)
  const icli = new Set();
  let anonim = 0;
  for (const { p } of parcalar) for (const u of p.uclar) {
    if (u.tur !== 'cihaz') continue;
    if (p.ic) icli.add(u.cihaz);
    if (!terminal.has(u.cihaz)) terminal.set(u.cihaz, new Set());
    const belirsiz = u.pin == null || String(u.pin).includes('?') || String(u.soket == null ? '' : u.soket).includes('?');
    terminal.get(u.cihaz).add(belirsiz ? 'anonim-' + (++anonim) : String(u.soket == null ? '' : u.soket).toUpperCase() + '|' + String(u.pin).toUpperCase());
  }
  const gecis = new Set();
  for (const [kod, c] of cihazlar) {
    if (GECIS_TURLERI.includes(c.tur) && !icli.has(kod) && terminal.has(kod) && terminal.get(kod).size === 2) gecis.add(kod);
  }
  // şema adları ve doğrulanma
  const semaAd = (id) => (semalarJson.semalar[id] && semalarJson.semalar[id].ad) || id;
  onbellek = { semalarJson, dosyali, dosyasiz, ham, parcalar, gruplar, cihazlar, gecis, semaAd, sekmeler: semalarJson.sekmeler };
  return onbellek;
}

/** Bir şemadan sabit tohumla rastgele n kablo grubu (anahtar dizisi). tohumEk: farklı turlar için. */
export function rastgeleKablolar(sema, n = 10, tohumEk = 20261015) {
  const v = veri();
  const anahtarlar = [], gorulen = new Set();
  for (const p of v.ham[sema].kablolar) {
    const g = grupAnahtari(p);
    if (g !== null && !gorulen.has(g)) { gorulen.add(g); anahtarlar.push(g); }
  }
  anahtarlar.sort();
  const rnd = tohum(tohumEk + sema.length);
  for (let i = anahtarlar.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [anahtarlar[i], anahtarlar[j]] = [anahtarlar[j], anahtarlar[i]];
  }
  return anahtarlar.slice(0, n);
}

/**
 * Bir kablo grubunun parçalarından beklenen uç denetimleri (veri dosyasından). Her biri { ad, test(metin) → true/false }.
 * Metin: arayüzdeki METİN özeti (KB.metin.satirlar çıktısı). Biçim: API.md §6.
 */
export function beklenenUclar(parcalar) {
  const v = veri();
  const liste = [], gorulen = new Set();
  const ekle = (anahtar, ad, test) => { if (!gorulen.has(anahtar)) { gorulen.add(anahtar); liste.push({ ad, test }); } };
  for (const { p } of parcalar) {
    for (const u of p.uclar) {
      if (u.tur === 'cihaz') {
        const kodRe = new RegExp('(^|[^A-Za-z0-9.])' + kacis(u.cihaz) + '(?![A-Za-z0-9.])');
        if (v.gecis.has(u.cihaz)) { ekle('gecis:' + u.cihaz, `${u.cihaz} (geçiş bileşeni; yalnız kod)`, (m) => kodRe.test(m)); continue; }
        if (u.pin == null) {
          ekle('pinsiz:' + u.cihaz, `${u.cihaz} (soket/pin şemada yazılı değil)`, (m) => kodRe.test(m) && m.includes('(soket/pin şemada yazılı değil)'));
          continue;
        }
        const soketli = u.soket != null;
        const re = new RegExp(kacis(u.cihaz) + '\\)? ' + (soketli ? 'soket ' + kacis(u.soket) + ' ' : '') + 'pin ' + kacis(u.pin) + '(?=$|[\\s,;)\\]])', 'm');
        ekle(`c:${u.cihaz}|${u.soket}|${u.pin}`, `${u.cihaz} ${soketli ? 'soket ' + u.soket + ' ' : ''}pin ${u.pin}`, (m) => re.test(m));
      } else if (u.tur === 'soket') {
        const re = new RegExp('(^|[^A-Za-z0-9.])' + kacis(u.soket) + ' pin ' + kacis(u.pin) + '(?=$|[\\s,;)\\]])', 'm');
        ekle(`s:${u.soket}|${u.pin}`, `ara soket ${u.soket} pin ${u.pin}`, (m) => re.test(m));
      } else if (u.tur === 'dugum' && u.kod && !String(u.kod).startsWith('~')) {
        const re = new RegExp('ek noktası ' + kacis(u.kod) + '(?![A-Za-z0-9.])');
        ekle(`d:${u.kod}`, `ek noktası ${u.kod}`, (m) => re.test(m));
      }
    }
  }
  return liste;
}

/** Parçaların kaynak yerleri (yol + satır) ve PDF: kaynak bloğunda görünmesi gerekenler. */
export function beklenenKaynaklar(parcalar) {
  const v = veri();
  const liste = [], gorulen = new Set();
  for (const { sema, p } of parcalar) {
    const g = p.izgara || {};
    const pdf = nfc(v.ham[sema].kaynak.pdf);
    const yol = String(g.yol == null ? '' : g.yol).replace(/^~/, '');
    const anahtar = [sema, g.sayfa, yol, g.satir].join('|');
    if (gorulen.has(anahtar)) continue; gorulen.add(anahtar);
    const re = new RegExp('yol ~?' + kacis(yol) + (g.satir ? ' · satır ' + kacis(g.satir) : '') + '(?![A-Za-z0-9])');
    liste.push({ ad: `${pdf} · sayfa ${g.sayfa} · yol ${yol}${g.satir ? ' · satır ' + g.satir : ''}`, pdf, sayfa: g.sayfa, re });
  }
  return liste;
}

/** Kaynak metninde (NFC) PDF adı + sayfa + yol/satır var mı. */
export function kaynakDenetle(kaynakMetni, beklenen) {
  const t = nfc(kaynakMetni);
  const eksik = [];
  for (const b of beklenen) {
    if (!t.includes(b.pdf)) eksik.push(`PDF adı yok: ${b.pdf}`);
    if (!t.includes('sayfa ' + b.sayfa)) eksik.push(`sayfa ${b.sayfa} yok (${b.pdf})`);
    if (!b.re.test(t)) eksik.push(`yer yok: ${b.ad}`);
  }
  return eksik;
}

export const kisa = (s, n = 160) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
