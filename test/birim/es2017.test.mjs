// API.md §0: "ES2017 yazım düzeyi (eski Android WebView'lar için; ?. ve ?? kullanılmaz)". Statik tarama (src/cekirdek/*.js).
// Basit bir ayrıştırıcıyla yorum / metin / düzenli ifade sabitleri ayıklanır, kalan koda ES2018+ sözdizimi desenleri aranır.
// Tam bir ES ayrıştırıcısı değildir; ES2018+ sözdizimini ve yaygın ES2019+ API'lerini yakalamak için yeterlidir.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CEKIRDEK } from './yardimci.mjs';

/** { kod, duzenliIfadeler }: yorumlar ve metin içerikleri boşluklanır; düzenli ifade sabitleri ayrıca toplanır */
function ayikla(src) {
  let kod = '';
  const regexler = [];
  let i = 0;
  let onceki = ''; // son anlamlı karakter (düzenli ifade mi bölme mi ayrımı için)
  let sonKelime = '';
  const regexOncesi = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
  const bosluk = (s) => s.replace(/[^\n]/g, ' ');
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? src.length : j; kod += bosluk(src.slice(i, e)); i = e; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; kod += bosluk(src.slice(i, e)); i = e; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      kod += c + bosluk(src.slice(i + 1, j)) + c;
      i = j + 1; onceki = c; sonKelime = '';
      continue;
    }
    if (c === '/' && (regexOncesi.has(onceki) || ['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw'].includes(sonKelime))) {
      let j = i + 1, sinif = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') sinif = true;
        else if (src[j] === ']') sinif = false;
        else if (src[j] === '/' && !sinif) break;
        else if (src[j] === '\n') break;
        j++;
      }
      let e = j + 1;
      while (e < src.length && /[a-z]/.test(src[e])) e++;
      regexler.push(src.slice(i, e));
      kod += 'R' + bosluk(src.slice(i + 1, e));
      i = e; onceki = ')'; sonKelime = '';
      continue;
    }
    kod += c;
    if (!/\s/.test(c)) {
      onceki = c;
      if (/[A-Za-z_$]/.test(c)) sonKelime = (/[A-Za-z0-9_$]/.test(src[i - 1] || '') ? sonKelime : '') + c;
      else if (!/[0-9]/.test(c)) sonKelime = '';
    } else if (/[A-Za-z_$]/.test(onceki) === false) sonKelime = '';
    i++;
  }
  return { kod, regexler };
}

const YASAK_KOD = [
  [/\?\.(?![0-9])/, 'isteğe bağlı zincirleme ?. (ES2020)'],
  [/\?\?/, 'null birleştirme ?? (ES2020)'],
  [/\bcatch\s*\{/, 'catch bağlayıcısız (ES2019)'],
  [/\{\s*\.\.\./, 'nesne yayılımı { ...x } (ES2018)'],
  [/\b\d[\d]*_\d/, 'sayısal ayraç 1_000 (ES2021)'],
  [/\b\d+n\b/, 'BigInt sabiti (ES2020)'],
  [/\bBigInt\b/, 'BigInt (ES2020)'],
  [/\bfor\s+await\b/, 'for await (ES2018)'],
  [/\.flatMap\s*\(|\.flat\s*\(/, 'Array.prototype.flat/flatMap (ES2019)'],
  [/\bObject\.fromEntries\b/, 'Object.fromEntries (ES2019)'],
  [/\.replaceAll\s*\(/, 'String.prototype.replaceAll (ES2021)'],
  [/\.at\s*\(\s*-?\d/, 'Array/String.prototype.at (ES2022)'],
  [/\.matchAll\s*\(/, 'String.prototype.matchAll (ES2020)'],
  [/\.trimStart\s*\(|\.trimEnd\s*\(/, 'trimStart/trimEnd (ES2019)'],
  [/\bPromise\.allSettled\b/, 'Promise.allSettled (ES2020)'],
  [/\bstructuredClone\b/, 'structuredClone (2022)'],
];
const YASAK_REGEX = [
  [/\(\?<[=!]/, 'regex lookbehind (ES2018)'],
  [/\(\?<[A-Za-z_]/, 'regex adlandırılmış grup (ES2018)'],
  [/\\[pP]\{/, 'regex unicode özellik kaçışı (ES2018)'],
  [/\/[a-z]*s[a-z]*$/, 'regex s bayrağı (ES2018)'],
];

const dosyalar = fs.readdirSync(CEKIRDEK).filter((f) => f.endsWith('.js')).sort();

test('ayrıştırıcı kendini sınar: yorum ve metin içindeki ?. yok sayılır, koddaki yakalanır', () => {
  const temiz = ayikla("var a = 'x?.y'; // b?.c\n/* d ?? e */ var f = /a?.b/g.test(a);");
  assert.ok(!/\?\./.test(temiz.kod) && !/\?\?/.test(temiz.kod), temiz.kod);
  assert.equal(temiz.regexler.length, 1);
  const kotu = ayikla('var a = b?.c; var d = e ?? f; try {} catch { }');
  assert.ok(YASAK_KOD.some(([re]) => re.test(kotu.kod) && re.source.includes('\\?\\.')));
  assert.ok(/\?\?/.test(kotu.kod));
  assert.ok(/\bcatch\s*\{/.test(kotu.kod));
  assert.equal(/\?\.(?![0-9])/.test('x?.5:1'), false, 'koşullu ifade x?.5:1 yanlış yakalanmamalı');
});

for (const dosya of dosyalar) {
  test(`${dosya}: ES2017 üstü sözdizimi ve API yok`, () => {
    const { kod, regexler } = ayikla(fs.readFileSync(path.join(CEKIRDEK, dosya), 'utf8'));
    const bulgu = [];
    kod.split('\n').forEach((satir, n) => {
      for (const [re, ad] of YASAK_KOD) if (re.test(satir)) bulgu.push(`${dosya}:${n + 1}: ${ad}: ${satir.trim().slice(0, 100)}`);
    });
    for (const r of regexler) for (const [re, ad] of YASAK_REGEX) if (re.test(r)) bulgu.push(`${dosya}: ${ad}: ${r}`);
    assert.deepEqual(bulgu, []);
  });
}

test('çekirdek dosyaları UTF-8 ve BOM / görünmez denetim karakteri içermiyor (normalize.js notu)', () => {
  // görünmez / denetim karakterleri: kod noktalarından kurulur (kaynak dosyada görünmez karakter bırakmamak için)
  const yasak = new Set();
  const ekle = (a, b) => { for (let k = a; k <= b; k++) yasak.add(k); };
  ekle(0, 8); ekle(0x0b, 0x0c); ekle(0x0e, 0x1f); ekle(0x200b, 0x200f); ekle(0x2028, 0x2029); ekle(0xfeff, 0xfeff);
  for (const dosya of dosyalar) {
    const ham = fs.readFileSync(path.join(CEKIRDEK, dosya));
    assert.ok(!(ham[0] === 0xef && ham[1] === 0xbb && ham[2] === 0xbf), `${dosya}: BOM var`);
    const s = ham.toString('utf8');
    assert.ok(!s.includes(String.fromCharCode(0xfffd)), `${dosya}: geçersiz UTF-8`);
    for (let k = 0; k < s.length; k++) assert.ok(!yasak.has(s.charCodeAt(k)), `${dosya}: görünmez denetim karakteri U+${s.charCodeAt(k).toString(16)} (konum ${k})`);
  }
});
