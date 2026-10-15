#!/usr/bin/env node
// Kablo Bulucu — kontrast ve token denetimi.  Bağımlılık yok (Node >= 18).
//
//   node test/kontrast.mjs          Denetler; tablo basar. Eşik altı çift ya da yapı hatası varsa
//                                   çıkış kodu 1. DESIGN.md / test/referans.html güncel değilse yine 1.
//   node test/kontrast.mjs --yaz    Denetler, sonra DESIGN.md içindeki token + kontrast tablolarını ve
//                                   test/referans.html içindeki token kopyasını + çift listesini yeniden üretir.
//   node test/kontrast.mjs --ayrinti  Her (ön, arka) çiftini ayrı ayrı basar.
//
// Kaynak: src/tokens.css (satır başına tek tanım; açıklama satır sonu yorumu).
// Bu dosya, çift listesinin de TEK kaynağıdır (referans sayfası ve DESIGN.md buradan beslenir).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YOL = {
  css: path.join(KOK, 'src/tokens.css'),
  tasarim: path.join(KOK, 'DESIGN.md'),
  referans: path.join(KOK, 'test/referans.html'),
};
const ARGV = new Set(process.argv.slice(2));

// ---------------------------------------------------------------------------
// Sabit listeler (tasarım sözleşmesi)
// ---------------------------------------------------------------------------
const TURLER = ['beyin', 'soket', 'besleme', 'guc', 'salter', 'role', 'sigorta', 'toprak', 'motor', 'valf', 'lamba', 'ikaz', 'sensor', 'direnc', 'diyot', 'dugum', 'diger', 'devam'];
const TONLAR = ['mavi', 'turkuaz', 'celik', 'gul', 'turuncu', 'zeytin', 'sari', 'kahve'];
const DURUMLAR = ['supheli', 'hata', 'dogrulanmadi', 'dogrulandi', 'not'];
const KABLO_RENKLERI = ['ws', 'sw', 'rt', 'gn', 'ge', 'bl', 'br', 'gr', 'li', 'or', 'rs'];
const YUZEY = ['--zemin', '--yuzey', '--yuzey-ust'];
const YUZEY_EK = [...YUZEY, '--secili-zemin', '--yuzey-basili'];

// Eşikler (görev tanımı): gövde metni 7, hiçbir metin 4,5 altında değil, çizgi/simge 3.
// Çizgilerde iç hedefimiz daha yüksek: güneş altında 3:1 sınırda kalır.
const E_GOVDE = 7, E_ASGARI = 4.5, E_CIZGI = 3, E_CIZGI_IC = 4.5;

// Güneş benzetimi (bilgi + birkaç zorunlu eşik): ekranın önüne %30 beyaz örtü (yansıma) bindiğini varsayar.
// Her renk c' = c*(1-a) + 255*a olur; oran bunlarla hesaplanır. Referans sayfasındaki "Güneş" düğmesi aynı örtüyü uygular.
const GUNES_ALFA = 0.30;
const GUNES = [
  // [ad, ön, arka, eşik (null: yalnız bilgi)]
  ['Ana metin', '--yazi', '--yuzey', 4.5],
  ['İkincil metin', '--yazi-2', '--yuzey', 4.5],
  ['İpucu, yer tutucu, pasif', '--yazi-pasif', '--yuzey', 3],
  ['Çerçeve, ayırıcı', '--cizgi', '--yuzey', null],
  ['Kablo çizgisi', '--cizgi-guclu', '--yuzey', 3],
  ['Pin numarası kutusu', '--ters-yazi', '--ters-zemin', 4.5],
  ['ŞÜPHELİ', '--supheli-yazi', '--supheli-zemin', 4.5],
  ['ÇELİŞKİLİ', '--hata-yazi', '--hata-zemin', 4.5],
  ['DOĞRULANMADI', '--dogrulanmadi-yazi', '--dogrulanmadi-zemin', 4.5],
];

const capraz = (onler, arkalar) => onler.flatMap((o) => arkalar.map((a) => [o, a]));
const esle = (onler, arkalar) => onler.map((o, i) => [o, arkalar[i]]);

/** Bir satır = bir kontrol grubu. cift: [[ön, arka], ...] */
const SATIRLAR = [
  // --- Metin ---
  { grup: 'Metin', ad: 'Ana metin', esik: E_GOVDE, cift: capraz(['--yazi'], YUZEY_EK) },
  { grup: 'Metin', ad: 'İkincil metin', esik: E_GOVDE, cift: capraz(['--yazi-2'], YUZEY_EK) },
  { grup: 'Metin', ad: 'Bağlantı, vurgulu metin', esik: E_GOVDE, cift: capraz(['--yazi-vurgu'], YUZEY_EK) },
  { grup: 'Metin', ad: 'İpucu, yer tutucu, devre dışı', esik: E_ASGARI, cift: capraz(['--yazi-pasif'], YUZEY) },
  { grup: 'Metin', ad: 'Ana düğme yazısı', esik: E_GOVDE, cift: capraz(['--vurgu-yazi'], ['--vurgu', '--vurgu-basili']) },
  { grup: 'Metin', ad: 'Ters çift (pin numarası kutusu)', esik: E_GOVDE, cift: [['--ters-yazi', '--ters-zemin']] },
  { grup: 'Metin', ad: 'ŞÜPHELİ yazısı', esik: E_GOVDE, cift: [['--supheli-yazi', '--supheli-zemin']] },
  { grup: 'Metin', ad: 'ÇELİŞKİLİ yazısı', esik: E_GOVDE, cift: [['--hata-yazi', '--hata-zemin']] },
  { grup: 'Metin', ad: 'DOĞRULANMADI yazısı', esik: E_GOVDE, cift: [['--dogrulanmadi-yazi', '--dogrulanmadi-zemin']] },
  { grup: 'Metin', ad: 'DOĞRULANDI yazısı', esik: E_GOVDE, cift: [['--dogrulandi-yazi', '--dogrulandi-zemin']] },
  { grup: 'Metin', ad: 'ŞEMA NOTU yazısı', esik: E_GOVDE, cift: [['--not-yazi', '--not-zemin']] },
  { grup: 'Metin', ad: 'Ana metin, cihaz türü dolgusu (8 ton)', esik: E_GOVDE, cift: esle(TONLAR.map(() => '--yazi'), TONLAR.map((t) => `--ton-${t}-zemin`)) },
  // --- Çizgi, simge, çerçeve ---
  { grup: 'Çizgi ve simge', ad: 'Çerçeve, ayırıcı, tablo çizgisi', esik: E_CIZGI, cift: capraz(['--cizgi'], YUZEY_EK) },
  { grup: 'Çizgi ve simge', ad: 'Diyagram ve kablo çizgisi, şerit kenarı', esik: E_GOVDE, cift: capraz(['--cizgi-guclu', '--kablo-cizgi'], YUZEY) },
  { grup: 'Çizgi ve simge', ad: 'Ana renk (düğme, seçili sekme dolgusu)', esik: E_CIZGI, cift: capraz(['--vurgu'], YUZEY) },
  { grup: 'Çizgi ve simge', ad: 'Odak halkası', esik: E_CIZGI, cift: capraz(['--odak'], YUZEY_EK) },
  { grup: 'Çizgi ve simge', ad: 'Durum çerçeveleri (5 durum)', esik: E_CIZGI_IC, cift: capraz(DURUMLAR.map((d) => `--${d}-cizgi`), YUZEY) },
  { grup: 'Çizgi ve simge', ad: 'Cihaz türü çerçevesi (8 ton)', esik: E_CIZGI_IC, cift: capraz(TONLAR.map((t) => `--ton-${t}`), YUZEY) },
];

// DESIGN.md token tablosu için grup başlıkları (tokens.css tema bloğundaki boş satırla ayrılmış gruplar)
const GRUP_BASLIKLARI = ['Yüzey, metin, çizgi, vurgu', 'Durum etiketleri', 'Cihaz tonları'];

// ---------------------------------------------------------------------------
// tokens.css ayrıştırıcı (satır tabanlı; biçim kuralı dosyanın başında)
// ---------------------------------------------------------------------------
function cssOku(metin) {
  const kurallar = [];
  const ctxYigin = [];
  let yorumIci = false, seciciTampon = '', mevcut = null;
  for (const ham of metin.split(/\r?\n/)) {
    const s = ham.trim();
    if (yorumIci) { if (s.includes('*/')) yorumIci = false; continue; }
    if (s.startsWith('/*')) { if (!s.includes('*/')) yorumIci = true; continue; }
    if (s === '') {
      if (mevcut && mevcut.kalemler.some((k) => k.ad.startsWith('--') && k.grup === mevcut.grup)) mevcut.grup++;
      continue;
    }
    if (s.endsWith('{')) {
      const sel = (seciciTampon + ' ' + s.slice(0, -1)).trim().replace(/\s+/g, ' ');
      seciciTampon = '';
      if (sel.startsWith('@')) { ctxYigin.push(sel); continue; }
      mevcut = { ctx: ctxYigin.join(' / ') || null, sel, kalemler: [], grup: 0 };
      kurallar.push(mevcut);
      continue;
    }
    if (s === '}') { if (mevcut) mevcut = null; else ctxYigin.pop(); continue; }
    if (mevcut) {
      const m = s.match(/^([\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?$/);
      if (!m) throw new Error(`tokens.css: tek tanım biçimine uymayan satır: "${s}"`);
      mevcut.kalemler.push({ ad: m[1], deger: m[2].trim(), yorum: m[3] || '', grup: mevcut.grup });
      continue;
    }
    seciciTampon += ' ' + s;
  }
  return kurallar;
}

function hexRgb(h) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h || '');
  if (!m) return null;
  let x = m[1];
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
}
const dogrusal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const parlaklik = (rgb) => 0.2126 * dogrusal(rgb[0]) + 0.7152 * dogrusal(rgb[1]) + 0.0722 * dogrusal(rgb[2]);
const oran = (a, b) => { const x = parlaklik(a), y = parlaklik(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const kes1 = (x) => (Math.floor(x * 10) / 10).toFixed(1).replace('.', ','); // aşağı yuvarla: "7,0" demek >= 7,0
const tr = (x) => String(x).replace('.', ',');

function varCoz(harita) {
  const cikti = {};
  const al = (ad, d = 0) => {
    if (d > 12) throw new Error(`var() döngüsü: ${ad}`);
    const v = harita.get(ad);
    if (v === undefined) return undefined;
    return v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, a, yedek) => {
      const r = al(a, d + 1);
      if (r === undefined) { if (yedek !== undefined) return yedek.trim(); throw new Error(`${ad} → tanımsız ${a}`); }
      return r;
    });
  };
  for (const ad of harita.keys()) cikti[ad] = al(ad);
  return cikti;
}

// ---------------------------------------------------------------------------
// Yükle
// ---------------------------------------------------------------------------
const hatalar = [];
const uyarilar = [];
const hata = (m) => hatalar.push(m);

const cssMetin = fs.readFileSync(YOL.css, 'utf8');
let kurallar;
try { kurallar = cssOku(cssMetin); } catch (e) { console.error('HATA: ' + e.message); process.exit(1); }

const ortak = kurallar.find((k) => k.sel === ':root' && !k.ctx);
const koyuK = kurallar.find((k) => !k.ctx && /\[data-tema="koyu"\]/.test(k.sel));
const acikK = kurallar.find((k) => !k.ctx && k.sel === ':root[data-tema="acik"]');
const acikMedyaK = kurallar.find((k) => k.ctx && /prefers-color-scheme:\s*light/.test(k.ctx) && k.sel === ':root:not([data-tema])');
if (!ortak || !koyuK || !acikK || !acikMedyaK) { console.error('HATA: tokens.css blok yapısı beklenenden farklı (ortak, koyu, açık, açık-medya).'); process.exit(1); }

const tokenlar = (k) => k.kalemler.filter((x) => x.ad.startsWith('--'));
const harita = (tema) => new Map([...tokenlar(ortak), ...tokenlar(tema)].map((k) => [k.ad, k.deger]));
let KOYU, ACIK;
try { KOYU = varCoz(harita(koyuK)); ACIK = varCoz(harita(acikK)); } catch (e) { console.error('HATA: ' + e.message); process.exit(1); }
const TEMALAR = { koyu: KOYU, acik: ACIK };

// ---------------------------------------------------------------------------
// Yapı denetimleri
// ---------------------------------------------------------------------------
{
  const ad = (k) => tokenlar(k).map((x) => x.ad);
  const kS = new Set(ad(koyuK)), aS = new Set(ad(acikK)), mS = new Set(ad(acikMedyaK));
  for (const n of kS) if (!aS.has(n)) hata(`tema: ${n} koyu blokta var, açık blokta yok`);
  for (const n of aS) if (!kS.has(n)) hata(`tema: ${n} açık blokta var, koyu blokta yok`);
  for (const n of aS) if (!mS.has(n)) hata(`tema: ${n} 3. blokta var, 4. blokta (sistem açık) yok`);
  for (const n of mS) if (!aS.has(n)) hata(`tema: ${n} 4. blokta var, 3. blokta yok`);
  const aDeger = new Map(tokenlar(acikK).map((x) => [x.ad, x.deger]));
  for (const x of tokenlar(acikMedyaK)) if (aDeger.has(x.ad) && aDeger.get(x.ad) !== x.deger) hata(`tema: ${x.ad} 3. ve 4. blokta farklı (${aDeger.get(x.ad)} ≠ ${x.deger})`);
  const cs = (k) => (k.kalemler.find((x) => x.ad === 'color-scheme') || {}).deger;
  if (cs(koyuK) !== 'dark' || cs(acikK) !== 'light' || cs(acikMedyaK) !== 'light') hata('tema: color-scheme değerleri (dark/light/light) beklenenden farklı');
}
{
  const var_ = (tema, ad) => tema[ad];
  const hexMi = (tema, ad) => !!hexRgb(var_(tema, ad));
  for (const [tAd, tema] of Object.entries(TEMALAR)) {
    for (const t of TURLER) for (const s of ['', '-zemin']) if (!hexMi(tema, `--tur-${t}${s}`)) hata(`${tAd}: --tur-${t}${s} yok ya da renk değil`);
    for (const t of TONLAR) for (const s of ['', '-zemin']) if (!hexMi(tema, `--ton-${t}${s}`)) hata(`${tAd}: --ton-${t}${s} yok ya da renk değil`);
    for (const d of DURUMLAR) for (const s of ['zemin', 'yazi', 'cizgi']) if (!hexMi(tema, `--${d}-${s}`)) hata(`${tAd}: --${d}-${s} yok ya da renk değil`);
    for (const r of KABLO_RENKLERI) if (!hexMi(tema, `--kablo-${r}`)) hata(`${tAd}: --kablo-${r} yok ya da renk değil`);
    for (const n of ['--zemin', '--yuzey', '--yuzey-ust', '--yuzey-basili', '--yazi', '--yazi-2', '--yazi-pasif', '--cizgi', '--cizgi-guclu', '--ters-zemin', '--ters-yazi', '--vurgu', '--vurgu-yazi', '--vurgu-basili', '--yazi-vurgu', '--secili-zemin', '--odak', '--kablo-cizgi']) if (!hexMi(tema, n)) hata(`${tAd}: ${n} yok ya da renk değil`);
    // yazı ve dokunma boyutları
    const px = (ad) => { const v = tema[ad]; const m = /^([\d.]+)(rem|px)$/.exec(v || ''); return m ? parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : NaN; };
    for (const n of ['--boyut-ipucu', '--boyut-govde', '--boyut-pin', '--boyut-kod', '--boyut-baslik', '--boyut-ekran', '--boyut-vurgu']) if (!(px(n) >= 14)) hata(`${tAd}: ${n} = ${tema[n]} (${px(n)} px) → 14 px altı yazı yok`);
    for (const n of ['--boyut-pin', '--boyut-kod']) if (!(px(n) >= 16)) hata(`${tAd}: ${n} = ${px(n)} px → pin / soket / kod etiketi 16 px altına inmez`);
    for (const n of ['--dokunma', '--dokunma-buyuk', '--tur-boyut']) if (!(px(n) >= (n === '--tur-boyut' ? 40 : 48))) hata(`${tAd}: ${n} = ${px(n)} px → çok küçük`);
  }
}

// ---------------------------------------------------------------------------
// Çift denetimi
// ---------------------------------------------------------------------------
const sonuc = []; // { satir, koyu: {min, kotu:[on,arka], tum:[...]}, acik: {...} }
for (const s of SATIRLAR) {
  const satir = { s, temalar: {} };
  for (const [tAd, tema] of Object.entries(TEMALAR)) {
    const tum = s.cift.map(([on, arka]) => {
      const a = hexRgb(tema[on]), b = hexRgb(tema[arka]);
      if (!a || !b) { hata(`${tAd}: çift hesaplanamadı ${on} / ${arka}`); return { on, arka, oran: 0 }; }
      return { on, arka, oran: oran(a, b) };
    });
    const kotu = tum.reduce((m, x) => (x.oran < m.oran ? x : m), tum[0]);
    satir.temalar[tAd] = { min: kotu.oran, kotu, tum };
    for (const x of tum) if (x.oran < s.esik) hata(`${tAd}: ${x.on} / ${x.arka} = ${x.oran.toFixed(2)} < ${s.esik}  (${s.ad})`);
  }
  sonuc.push(satir);
}


// ---------------------------------------------------------------------------
// Güneş benzetimi
// ---------------------------------------------------------------------------
const orttu = (rgb) => rgb.map((v) => v * (1 - GUNES_ALFA) + 255 * GUNES_ALFA);
const gunesSonuc = GUNES.map(([ad, on, arka, esik]) => {
  const r = { ad, on, arka, esik, temalar: {} };
  for (const [tAd, tema] of Object.entries(TEMALAR)) {
    const a = hexRgb(tema[on]), b = hexRgb(tema[arka]);
    if (!a || !b) { hata(`${tAd}: güneş çifti hesaplanamadı ${on} / ${arka}`); r.temalar[tAd] = 0; continue; }
    r.temalar[tAd] = oran(orttu(a), orttu(b));
    if (esik !== null && r.temalar[tAd] < esik) hata(`${tAd}: güneş örtüsü altında ${on} / ${arka} = ${r.temalar[tAd].toFixed(2)} < ${esik}  (${ad})`);
  }
  return r;
});

// ---------------------------------------------------------------------------
// Tablolar
// ---------------------------------------------------------------------------
const tokenListesi = (cift, i) => [...new Set(cift.map((c) => c[i]))];
const kisalt = (liste) => (liste.length <= 3 ? liste : [...liste.slice(0, 2), `… (${liste.length})`]).map((x) => (x.startsWith('…') ? x : '`' + x + '`')).join(', ');

function mdKontrast() {
  const satirlar = ['| Çift (ön / arka) | Kullanım | Koyu | Açık | Eşik |', '|---|---|---:|---:|---:|'];
  let grup = null;
  for (const r of sonuc) {
    if (r.s.grup !== grup) { grup = r.s.grup; satirlar.push(`| **${grup}** | | | | |`); }
    const on = kisalt(tokenListesi(r.s.cift, 0)), arka = kisalt(tokenListesi(r.s.cift, 1));
    satirlar.push(`| ${on} / ${arka} | ${r.s.ad} | ${kes1(r.temalar.koyu.min)} | ${kes1(r.temalar.acik.min)} | ≥ ${tr(r.s.esik)} |`);
  }
  const toplam = sonuc.reduce((t, r) => t + r.s.cift.length, 0);
  satirlar.push('', `Her satırda **en kötü** çiftin oranı yazılı (aşağı yuvarlanmış). Toplam ${toplam} çift × 2 tema denetlendi; \`node test/kontrast.mjs --ayrinti\` hepsini tek tek listeler.`);
  return satirlar.join('\n');
}

function mdGunes() {
  const satirlar = ['| Çift | Koyu | Açık | Eşik |', '|---|---:|---:|---:|'];
  for (const r of gunesSonuc) satirlar.push(`| ${r.ad} (\`${r.on}\` / \`${r.arka}\`) | ${kes1(r.temalar.koyu)} | ${kes1(r.temalar.acik)} | ${r.esik === null ? 'bilgi' : '≥ ' + tr(r.esik)} |`);
  const ort = (t) => gunesSonuc.slice(0, 1)[0].temalar[t];
  satirlar.push('', `Örtü: %${Math.round(GUNES_ALFA * 100)} beyaz (yansıma benzetimi). "bilgi" satırları hata saymaz; eşiği olanlar sağlanmak zorunda.`);
  return satirlar.join('\n');
}

function mdTokenlar() {
  const acikDeger = new Map(tokenlar(acikK).map((x) => [x.ad, x.deger]));
  const gruplar = [];
  for (const k of tokenlar(koyuK)) (gruplar[k.grup] ||= []).push(k);
  const cikti = [];
  gruplar.filter(Boolean).forEach((g, i) => {
    cikti.push(`**${GRUP_BASLIKLARI[i] || 'Grup ' + (i + 1)}**`, '', '| Token | Koyu | Açık | Kullanım |', '|---|---|---|---|');
    for (const k of g) {
      const a = acikDeger.get(k.ad);
      const gos = (v) => (/^#[0-9a-f]{3,6}$/i.test(v) ? '`' + v.toUpperCase() + '`' : '`' + v + '`');
      cikti.push(`| \`${k.ad}\` | ${gos(k.deger)} | ${gos(a)} | ${k.yorum} |`);
    }
    cikti.push('');
  });
  return cikti.join('\n').trim();
}

function konsolGunes() {
  const sut = (m, n) => String(m).padEnd(n);
  console.log(`\nGÜNEŞ BENZETİMİ  (%${Math.round(GUNES_ALFA * 100)} beyaz örtü)`);
  console.log(sut('Çift', 46) + sut('Koyu', 8) + sut('Açık', 8) + 'Eşik');
  for (const r of gunesSonuc) console.log(sut(r.ad, 46) + sut(r.temalar.koyu.toFixed(2), 8) + sut(r.temalar.acik.toFixed(2), 8) + (r.esik === null ? 'bilgi' : '≥ ' + r.esik));
}

function konsolTablo() {
  const sut = (m, n) => String(m).padEnd(n);
  console.log('\nKONTRAST ÖZETİ  (her satır: en kötü çift)');
  console.log(sut('Kullanım', 46) + sut('Koyu', 8) + sut('Açık', 8) + sut('Eşik', 6) + 'Durum');
  console.log('-'.repeat(76));
  for (const r of sonuc) {
    const durum = r.temalar.koyu.min >= r.s.esik && r.temalar.acik.min >= r.s.esik ? 'TAMAM' : 'HATA';
    console.log(sut(r.s.ad, 46) + sut(r.temalar.koyu.min.toFixed(2), 8) + sut(r.temalar.acik.min.toFixed(2), 8) + sut('≥ ' + r.s.esik, 6) + durum);
    if (ARGV.has('--ayrinti')) for (const t of ['koyu', 'acik']) for (const x of r.temalar[t].tum) console.log('      ' + t.padEnd(5) + ' ' + (x.on + ' / ' + x.arka).padEnd(48) + x.oran.toFixed(2));
  }
}

// ---------------------------------------------------------------------------
// Üretilen bölgeler (DESIGN.md ve test/referans.html)
// ---------------------------------------------------------------------------
function bolgeDegistir(metin, bas, bit, yeni) {
  const i = metin.indexOf(bas), j = metin.indexOf(bit);
  if (i < 0 || j < 0 || j < i) return null;
  return metin.slice(0, i + bas.length) + '\n' + yeni + '\n' + metin.slice(j);
}
function bolgeOku(metin, bas, bit) {
  const i = metin.indexOf(bas), j = metin.indexOf(bit);
  if (i < 0 || j < 0 || j < i) return null;
  return metin.slice(i + bas.length, j).replace(/^\n/, '').replace(/\n$/, '');
}

const ciftlerJson = JSON.stringify(SATIRLAR.map((s) => ({ grup: s.grup, ad: s.ad, esik: s.esik, cift: s.cift })));
const URETIM = [
  { dosya: YOL.tasarim, bolgeler: [
    { bas: '<!-- TOKENLAR:BASLA -->', bit: '<!-- TOKENLAR:BITIS -->', icerik: mdTokenlar() },
    { bas: '<!-- KONTRAST:BASLA -->', bit: '<!-- KONTRAST:BITIS -->', icerik: mdKontrast() },
    { bas: '<!-- GUNES:BASLA -->', bit: '<!-- GUNES:BITIS -->', icerik: mdGunes() },
  ] },
  { dosya: YOL.referans, bolgeler: [
    { bas: '/*TOKENS:BASLA*/', bit: '/*TOKENS:BITIS*/', icerik: cssMetin.replace(/\s+$/, '') },
    { bas: '/*CIFTLER:BASLA*/', bit: '/*CIFTLER:BITIS*/', icerik: 'const CIFTLER = ' + ciftlerJson + ';' },
  ] },
];

const yaz = ARGV.has('--yaz');
for (const u of URETIM) {
  if (!fs.existsSync(u.dosya)) { (yaz ? uyarilar : hatalar).push(`${path.relative(KOK, u.dosya)} yok`); continue; }
  let metin = fs.readFileSync(u.dosya, 'utf8');
  let degisti = false;
  for (const b of u.bolgeler) {
    const mevcut = bolgeOku(metin, b.bas, b.bit);
    if (mevcut === null) { hata(`${path.relative(KOK, u.dosya)}: ${b.bas} ... ${b.bit} işaretleri yok`); continue; }
    if (mevcut !== b.icerik) {
      if (yaz) { metin = bolgeDegistir(metin, b.bas, b.bit, b.icerik); degisti = true; }
      else hata(`${path.relative(KOK, u.dosya)}: ${b.bas} bölgesi güncel değil → node test/kontrast.mjs --yaz`);
    }
  }
  if (yaz && degisti) { fs.writeFileSync(u.dosya, metin); console.log('güncellendi: ' + path.relative(KOK, u.dosya)); }
}

// ---------------------------------------------------------------------------
// Rapor
// ---------------------------------------------------------------------------
konsolTablo();
konsolGunes();
const toplamCift = sonuc.reduce((t, r) => t + r.s.cift.length, 0);
console.log(`\n${toplamCift} çift × 2 tema, ${TURLER.length} cihaz türü, ${TONLAR.length} ton, ${DURUMLAR.length} durum, ${KABLO_RENKLERI.length} kablo rengi denetlendi.`);
for (const u of uyarilar) console.log('uyarı: ' + u);
if (hatalar.length) {
  console.log('\nHATALAR (' + hatalar.length + '):');
  for (const h of hatalar) console.log('  - ' + h);
  process.exitCode = 1;
} else {
  console.log('SONUÇ: TEMİZ');
}
