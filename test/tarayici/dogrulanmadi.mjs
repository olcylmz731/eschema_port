// (i) Doğrulanmamış şemanın HER sonucunda "DOĞRULANMADI" etiketi var (gerçek veri şemaları doğrulanmadı: veri/<sema>.json "dogrulandi": false).
//   Kapsam: arama sonucu satırları (liste, sekme listesi, "Hepsini göster"), kablo / cihaz / soket / pin ayrıntı kartları (şema adıyla şerit).
//   Ters yön: doğrulanmamış veri varken hiçbir yerde "DOĞRULANDI" yazmamalı. Beklenen: veri dosyalarındaki bayraklar ve parça/cihaz şema üyeliği.
//   Karşıt kontrol: kapi-1 "doğrulandı" işaretli bir kopyada etiket değişmeli (test gerçekten ayırt ediyor).
//   node test/tarayici/dogrulanmadi.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, veri, kacis, kisa, nfc, YAZI } from './yardimci.mjs';
import { ekranlar } from './supurme.mjs';

const v = veri();
const t = await tarayici({ genislik: 412, yukseklik: 900, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum} · şemalar: ` + v.dosyali.map((s) => `${s} (dogrulandi=${v.ham[s].dogrulandi})`).join(', '));

/** Bir satırın/kartın şemaları belliyse onlardan, bilinmiyorsa bütün şemalardan: doğrulanmamış var mı */
function dogrulanmamisVarMi(semalar, dogrulanan) {
  const l = semalar && semalar.length ? semalar : v.dosyali;
  return l.some((s) => !dogrulanan.has(s));
}
/** Kablo satırının kodundan ('#4002', '4001', '1sw/rt') veri grubunun şemaları */
function kabloSemalari(kod) {
  for (const g of [`no:${kod.replace(/^#/, '')}`, `etiket:${kod}`]) if (v.gruplar.has(g)) return Array.from(new Set(v.gruplar.get(g).map((x) => x.sema)));
  return null;
}
/** Soket adının geçtiği parçaların şemaları (ara soket ya da cihaz soketi) */
function soketSemalari(ad) {
  const k = new Set();
  for (const { sema, p } of v.parcalar) for (const u of p.uclar) if ((u.tur === 'soket' || u.tur === 'cihaz') && u.soket && String(u.soket).toUpperCase() === String(ad).toUpperCase()) k.add(sema);
  return k.size ? Array.from(k) : null;
}
function satirSemalari(s) {
  if (s.tur === 'kablo') return kabloSemalari(s.kod);
  if (s.tur === 'cihaz' && v.cihazlar.has(s.kod)) return Array.from(v.cihazlar.get(s.kod).semalar);
  if (s.tur === 'soket') return soketSemalari(s.kod);
  return null;
}
/** Ekranın ayrıntı kartı için şema kümesi (bilinmiyorsa null) */
function kartSemalari(e) {
  if (e.tur === 'kablo' || e.tur === 'cihaz') return e.beklenenSema || null;
  if (e.tur === 'soket') return soketSemalari(e.q);
  return null;   // pin izi: iz başka şemalardaki parçalara uzanabilir
}

/** Bir ekranı denetler: etiketi olması gereken yerde olmalı, olmaması gereken yerde olmamalı.
 *  kesin: şeması belli olmayan öğeler atlanır (bazı şemalar doğrulanmışken); aksi hâlde "bütün şemalar" varsayılır (hepsi doğrulanmamışken kesin sonuç verir). */
function denetle(h, e, dogrulanan, kesin = false) {
  const tamam = (m) => m.includes(YAZI.dogrulanmadi);
  // 1. sonuç satırları
  for (const s of e.satirlar || []) {
    const semalar = satirSemalari(s);
    if (kesin && !semalar) continue;
    const beklenen = dogrulanmamisVarMi(semalar, dogrulanan);
    if (beklenen && !tamam(s.metin)) h.ekle(`ekran "${e.ad}": ${s.tur} satırı "${s.kod}" DOĞRULANMADI etiketsiz (satır: ${kisa(s.metin, 100)})`);
    if (!beklenen && tamam(s.metin)) h.ekle(`ekran "${e.ad}": ${s.tur} satırı "${s.kod}" doğrulanmış şemada ama DOĞRULANMADI yazıyor`);
  }
  // 2. ayrıntı kartları
  if (['kablo', 'cihaz', 'soket', 'uc'].includes(e.tur) && e.ekran === 'detay') {
    const semalar = kartSemalari(e);
    if (!(kesin && !semalar)) {
      const beklenen = dogrulanmamisVarMi(semalar, dogrulanan);
      const var_ = tamam(e.icerik);
      if (beklenen && !var_) h.ekle(`ekran "${e.ad}": kartta DOĞRULANMADI şeridi yok`);
      if (!beklenen && var_) h.ekle(`ekran "${e.ad}": doğrulanmış şemada ama kartta DOĞRULANMADI yazıyor`);
      // şeritte şema adı: "DOĞRULANMADI  Kapı 1: Bu şema henüz kontrol edilmedi."
      if (beklenen && var_ && semalar) {
        for (const s of semalar) {
          if (dogrulanan.has(s)) continue;
          const ad = nfc(v.semaAd(s));
          if (!new RegExp(kacis(YAZI.dogrulanmadi) + '\\s*' + kacis(ad) + ':').test(nfc(e.icerik))) h.ekle(`ekran "${e.ad}": DOĞRULANMADI şeridinde şema adı "${ad}" yok`);
        }
      }
    }
  }
  // 3. tersi: hiç doğrulanmış şema yokken doğrulanmış görünmesin
  if (dogrulanan.size === 0 && (e.icerik.includes(YAZI.dogrulandi) || (e.satirlar || []).some((s) => s.metin.includes(YAZI.dogrulandi)))) h.ekle(`ekran "${e.ad}": hiçbir şema doğrulanmadığı hâlde "DOĞRULANDI" yazıyor`);
}

async function sup(surum, kapsam, dogrulanan, kesin = false) {
  await t.ac(surum);
  const h = new Hatalar();
  const sayac = { satir: 0, kart: 0, ekran: 0 };
  for await (const e of ekranlar(p, { satirlar: true, kapsam })) {
    sayac.ekran++; sayac.satir += (e.satirlar || []).length; if (e.ekran === 'detay') sayac.kart++;
    denetle(h, e, dogrulanan, kesin);
  }
  assert.ok(sayac.satir >= 100 && sayac.kart >= 100, `süpürme yetersiz: ${JSON.stringify(sayac)}`);
  console.log(`  · ${sayac.ekran} ekran, ${sayac.satir} sonuç satırı, ${sayac.kart} ayrıntı kartı denetlendi`);
  h.denetle(`DOĞRULANMADI etiketi (${surum.ad})`);
}

const dogrulananGercek = new Set(v.dosyali.filter((s) => v.ham[s].dogrulandi === true));

await sinama(`[dağıtım] her sonuç satırında ve ayrıntı kartında DOĞRULANMADI var (doğrulanmamış şema: ${v.dosyali.filter((s) => !dogrulananGercek.has(s)).join(', ')}); "DOĞRULANDI" hiç yok`, async () => {
  await sup(DAGITIM, 'tam', dogrulananGercek);
});

await sinama('[doğrulama] aynı kural doğrulama sürümünde de geçerli (kısa kapsam)', async () => {
  await sup(DOGRULAMA, 'kisa', dogrulananGercek);
});

await sinama('(karşıt kontrol) kapi-1 "doğrulandı" işaretli kopyada kapi-1\'e özgü sonuçlarda DOĞRULANMADI kalkıyor, DOĞRULANDI görünüyor; test bunu ayırt ediyor', async () => {
  const html = fs.readFileSync(DAGITIM.dosya, 'utf8');
  const m = /(<script type="application\/json" id="kb-veri">)([\s\S]*?)(<\/script>)/.exec(html);
  const paket = JSON.parse(m[2]);
  paket.veri['kapi-1'].dogrulandi = true;
  const kopya = html.slice(0, m.index) + m[1] + JSON.stringify(paket) + m[3] + html.slice(m.index + m[0].length);
  const klasor = fs.mkdtempSync(path.join(process.env.KB_TMP || os.tmpdir(), 'kb-dogr-'));
  const dosya = path.join(klasor, 'kopya.html');
  fs.writeFileSync(dosya, kopya);
  try {
    const surum = { ad: 'kopya', dosya, url: pathToFileURL(dosya).href };
    const dogrulanan = new Set(['kapi-1']);
    await t.ac(surum);
    const h = new Hatalar();
    let dogrulandiGoruldu = 0, kapiSadece = 0;
    for await (const e of ekranlar(p, { satirlar: true, kapsam: 'kisa' })) {
      denetle(h, e, dogrulanan, true);
      if (e.icerik.includes(YAZI.dogrulandi) || (e.satirlar || []).some((s) => s.metin.includes(YAZI.dogrulandi))) dogrulandiGoruldu++;
      if (['kablo', 'cihaz'].includes(e.tur) && e.beklenenSema && e.beklenenSema.every((s) => s === 'kapi-1')) kapiSadece++;
    }
    assert.ok(kapiSadece >= 20, `yalnız kapi-1'e ait ${kapiSadece} ayrıntı ekranı gezildi`);
    assert.ok(dogrulandiGoruldu >= 1, 'kapi-1 doğrulandı işaretli olduğu hâlde hiçbir ekranda "DOĞRULANDI" görünmedi');
    console.log(`  · kapi-1'e özgü ${kapiSadece} ayrıntı ekranı; DOĞRULANDI görülen ekran: ${dogrulandiGoruldu}`);
    h.denetle('doğrulanmış kapi-1 kopyasında etiketler');
  } finally { fs.rmSync(klasor, { recursive: true, force: true }); }
});

await t.kapat();
bitir();
