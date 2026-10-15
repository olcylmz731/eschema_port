#!/usr/bin/env node
// Çakışma testi: gerçek veriyle bütün kablo / cihaz / soket (ve örnek uç) çizimlerini 4 genişlikte çizer;
// bütün <text> kutularını ikili karşılaştırır (kesişim = hata) + kutu taşması, yatay kaydırma, en küçük yazı,
// dokunma hedefi boyutu, role/aria-label. Çıkış kodu ≠ 0 = hata.
//
//   node test/diyagram/cakisma.mjs [--veri klasör ...] [--genislik 360,412,768,1280] [--tema koyu|acik]
//                                  [--sadece kablo:4002] [--uc-adim 6] [--ilk 40] [--uyari]
//   --veri       birden çok verilebilir (varsayılan: veri + sahte; 'sahte' = test/diyagram/sahte-veri.mjs'in ürettiği zorlayıcı uydurma veri)
//   --genislik   görüntü alanı genişlikleri; çizim kapsayıcısı = genişlik − 32 (sayfa kenarı 16 px), en çok 928
//   --yazi       telefonun yazı boyutu ayarını taklit eder (kök yazı 1,3 / 2 katı); yazı büyüyünce de çakışma çıkmamalı
//   --kenar      32 yerine başka fark (0: kapsayıcı görüntü alanı kadar; 320 px gibi dar telefonları denemek için)
//   --sadece     "tür:anahtar" ya da yalnız anahtar parçası ("4002", "kablo:", "cihaz:41A01")
//   --uc-adim    uç (pin) sorgularından her N'incisini dene (0 = hiç)
//   --uyari      uyarıları da yazdır (dokunma alanı aralıkları)
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../cdp.mjs';
import os from 'node:os';
import { derle, temizle, SAYFA_JS, KOK } from './ortak.mjs';
import { sahteVeriYaz } from './sahte-veri.mjs';

const arg = process.argv.slice(2);
function deger(ad, varsayilan) { const i = arg.indexOf('--' + ad); return i >= 0 ? arg[i + 1] : varsayilan; }
function degerler(ad) { const o = []; arg.forEach((a, i) => { if (a === '--' + ad && arg[i + 1]) o.push(arg[i + 1]); }); return o; }
const GENISLIKLER = deger('genislik', '360,412,768,1280').split(',').map(Number);
const TEMA = deger('tema', 'koyu');
const SADECE = deger('sadece', '');
const UC_ADIM = +deger('uc-adim', '6');
const ILK = +deger('ilk', '40');
const UYARI = arg.includes('--uyari');
const YAZI = +deger('yazi', '1');   // telefon yazı boyutu çarpanı (1,3 / 2 gibi)
const KENAR = +deger('kenar', '32');   // görüntü alanı − kapsayıcı genişliği (sayfa kenarları: 2 × 16 px)
const veriler = degerler('veri');
if (!veriler.length) veriler.push('veri', 'sahte');
const SAHTE_KLASOR = path.join(process.env.KB_TMP || os.tmpdir(), 'kb-sahte-veri-' + process.pid);
for (let i = 0; i < veriler.length; i++) if (veriler[i] === 'sahte') veriler[i] = sahteVeriYaz(SAHTE_KLASOR);

const sorunSatirlari = [], uyariSatirlari = [];
let toplamSorun = 0, toplamUyari = 0, toplamCizim = 0, sinandi = false;
const gorunenAd = (v) => (v === SAHTE_KLASOR ? 'sahte' : path.basename(v));

// Sprite denetimi: motordaki t-… / i-… simgeleri test/referans.html'deki (sanat yönetmeninin) simgelerle birebir aynı olmalı.
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  require(path.join(KOK, 'src/diyagram/d0-sprite.js'));
  const norm = (x) => x.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  const al = (metin) => { const m = {}; for (const r of metin.matchAll(/<symbol id="((?:t|i)-[a-z0-9-]+)"[^>]*>[\s\S]*?<\/symbol>/g)) m[r[1]] = norm(r[0]); return m; };
  const ref = al(fs.readFileSync(path.join(KOK, 'test/referans.html'), 'utf8')), motor = al(globalThis.KB.diyagram.sprite());
  const farkli = Object.keys(ref).filter((k) => motor[k] !== ref[k]);
  const eksik = Object.keys(motor).filter((k) => !ref[k]);
  if (farkli.length || eksik.length) { toplamSorun++; sorunSatirlari.push('[sprite] motorun simgeleri referans.html ile aynı değil: ' + farkli.concat(eksik).slice(0, 8).join(', ')); }
  else console.log(`sprite: ${Object.keys(ref).length} simge referans.html ile birebir aynı`);
}

for (const veri of veriler) {
  const html = derle(veri);
  try {
    for (const vw of GENISLIKLER) {
      const W = Math.min(vw - KENAR, 928);
      const b = await launch({ width: vw, height: 900 });
      try {
        const p = await b.open('file://' + html);
        await p.sleep(150);
        await p.eval(SAYFA_JS);
        if (YAZI !== 1) await p.eval(`__T.yaziOlcek = ${YAZI}`);
        if (!sinandi) {
          const bulunan = await p.eval('__T.sinama()');
          const beklenen = ['hedef-kucuk', 'kutu-tasma', 'metin-cakisma', 'metin-tasma'];
          const eksik = beklenen.filter((k) => !bulunan.includes(k));
          if (eksik.length) { console.error('TEST DÜZENEĞİ BOZUK: bilerek bozuk çizimde yakalanamayan sorun türleri: ' + eksik.join(', ')); process.exit(2); }
          sinandi = true;
        }
        const liste = await p.eval(`__T.senaryolar(${UC_ADIM > 0 ? UC_ADIM : 1e9})`);
        const secili = liste.filter((s) => !SADECE || (s.tur + ':' + (typeof s.a === 'string' ? s.a : JSON.stringify(s.a))).toLowerCase().includes(SADECE.toLowerCase()));
        const sayilar = {};
        let wSorun = 0, wUyari = 0, yatay = 0, dikey = 0, enYavas = 0;
        const PARCA = 25;
        for (let i = 0; i < secili.length; i += PARCA) {
          const dilim = secili.slice(i, i + PARCA);
          const sonuc = await p.eval(`(async () => {
            const cikti = [];
            for (const s of ${JSON.stringify(dilim)}) { cikti.push(__T.dene(s, ${W}, ${JSON.stringify(TEMA)})); await new Promise((r) => setTimeout(r, 0)); }
            return cikti;
          })()`);
          sonuc.forEach((r, k) => {
            const s = dilim[k];
            sayilar[s.tur] = (sayilar[s.tur] || 0) + 1;
            toplamCizim++;
            const etiket = `[${gorunenAd(veri)} · ${vw}px · ${s.tur}:${typeof s.a === 'string' ? s.a : JSON.stringify(s.a)}]`;
            if (r.yok) return;
            if (r.hata) { wSorun++; toplamSorun++; sorunSatirlari.push(`${etiket} ÇİZİM HATASI: ${r.hata.split('\n').slice(0, 3).join(' | ')}`); return; }
            if (r.bilgi.yerlesim === 'yatay') yatay++; else dikey++;
            if (r.bilgi.ms > enYavas) enYavas = r.bilgi.ms;
            r.sorunlar.forEach((x) => { wSorun++; toplamSorun++; sorunSatirlari.push(`${etiket} ${x.k}: ${x.m}`); });
            r.uyarilar.forEach((x) => { wUyari++; toplamUyari++; uyariSatirlari.push(`${etiket} ${x.k}: ${x.m}`); });
          });
        }
        if (p.errors.length) { wSorun += p.errors.length; toplamSorun += p.errors.length; p.errors.slice(0, 5).forEach((e) => sorunSatirlari.push(`[${gorunenAd(veri)} · ${vw}px] SAYFA HATASI: ${e}`)); }
        console.log(`${gorunenAd(veri).padEnd(10)} ${String(vw).padStart(4)} px (kapsayıcı ${W}): ${Object.entries(sayilar).map(([k, v]) => v + ' ' + k).join(', ')} · yatay ${yatay} / dikey ${dikey} · en yavaş ${enYavas} ms · sorun ${wSorun}` + (wUyari ? ` · uyarı ${wUyari}` : ''));
      } finally { await b.close(); }
    }
  } finally { temizle(html); }
}

if (UYARI && uyariSatirlari.length) { console.log('\nUYARILAR (' + uyariSatirlari.length + '):'); uyariSatirlari.slice(0, ILK).forEach((l) => console.log('  ' + l)); }
if (sorunSatirlari.length) {
  console.log('\nSORUNLAR (' + sorunSatirlari.length + (sorunSatirlari.length > ILK ? ', ilk ' + ILK + ' gösteriliyor' : '') + '):');
  sorunSatirlari.slice(0, ILK).forEach((l) => console.log('  ' + l));
}
console.log(`\n${toplamCizim} çizim, ${toplamSorun} sorun, ${toplamUyari} uyarı.` + (toplamSorun ? ' BAŞARISIZ' : ' TEMİZ'));
try { fs.rmSync(SAHTE_KLASOR, { recursive: true, force: true }); } catch (e) { /* */ }
process.exit(toplamSorun ? 1 : 0);
