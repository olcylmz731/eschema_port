// (f) 360 px'te (mobil emülasyon) yatay kaydırma YOK: document.documentElement.scrollWidth <= innerWidth.
//   İstenen ekranlar: boş açılış, kablo sonucu, cihaz tablosu (41A01), bulunamadı, boş sekme ekranları.
//   Ek: bütün kablo / cihaz / soket / pin ayrıntıları ve listeler (süpürme), 320 px, büyük yazı (kök yazı 1,3× ve 2×; arayüz rem kullanıyor).
//   node test/tarayici/tasma360.mjs
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, veri, olc, kisa } from './yardimci.mjs';
import { ekranlar } from './supurme.mjs';

const v = veri();
const GENISLIK = 360;
const t = await tarayici({ genislik: GENISLIK, yukseklik: 800, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum} · görüntü alanı ${GENISLIK}x800 (mobil emülasyon)`);

/** Ekranın ölçümünde (olc / ekranlar sonucu) yatay taşma varsa bulgu ekler. Ölçüt: max(scrollWidth, body.scrollWidth, innerWidth) <= hedef genişlik
 *  (mobil emülasyonda taşan sayfada innerWidth içeriğe göre büyüdüğünden `scrollWidth <= innerWidth` tek başına yetmez; bkz. yardimci.mjs tasma()). */
function taşmaDenetle(h, ad, o, genislik = GENISLIK) {
  const { hedef, iw, sw, bw } = o.tasma;
  if (hedef !== genislik) { h.ekle(`${ad}: ölçüm hedefi ${hedef} (${genislik} bekleniyordu; ölçüm geçersiz)`); return; }
  if (Math.max(sw, bw, iw) > genislik) h.ekle(`${ad}: yatay kaydırma var: scrollWidth ${sw} / body ${bw} / innerWidth ${iw} > ${genislik}; taşan öğeler: ${(o.tasma['taşanlar'] || []).join(' ; ') || '(bulunamadı)'}`);
}

for (const surum of [DAGITIM, DOGRULAMA]) {
  await sinama(`[${surum.ad}] 360 px: boş açılış ekranında yatay kaydırma yok`, async () => {
    await t.ac(surum);
    const h = new Hatalar();
    const o = await olc(p, { genislik: GENISLIK });
    if (o.ekran !== 'ilk') h.ekle(`ilk ekran gelmedi (${o.ekran})`);
    taşmaDenetle(h, 'boş açılış', o);
    h.denetle('taşma');
  });

  await sinama(`[${surum.ad}] 360 px: kablo sonucu (gerçek yazma) ve cihaz tablosu (41A01) ekranlarında yatay kaydırma yok`, async () => {
    await t.ac(surum);
    const h = new Hatalar();
    for (const [ad, q, beklenen] of [['kablo 4002 (dallı, uzun zincir)', '4002', 'detay'], ['kablo 1084', '1084', 'detay'], ['kablo listesi "40"', '40', 'liste'], ['cihaz tablosu 41A01 (30 pin)', '41A01', 'detay'], ['cihaz 04A03', '04A03', 'detay']]) {
      await t.yaz(q);
      const o = await olc(p, { genislik: GENISLIK });
      if (o.ekran !== beklenen) h.ekle(`${ad}: ekran ${o.ekran} (beklenen ${beklenen}) — içerik "${kisa(o.icerik, 100)}"`);
      taşmaDenetle(h, ad, o);
    }
    h.denetle('taşma');
  });

  await sinama(`[${surum.ad}] 360 px: bulunamadı ekranında yatay kaydırma yok (kısa, 120 harflik boşluksuz, uzun boşluklu, özel karakterli sorgu)`, async () => {
    await t.ac(surum);
    const h = new Hatalar();
    for (const [ad, q] of [['kısa', 'ZZZ99999'], ['120 harflik boşluksuz', 'A'.repeat(120)], ['uzun boşluklu', 'ABC DEF '.repeat(14)], ['özel karakterli', '<b>&"\'%$#?']]) {
      await t.yaz(q);
      const o = await olc(p, { genislik: GENISLIK });
      if (o.ekran !== 'bulunamadi') h.ekle(`${ad}: ekran ${o.ekran} (bulunamadı bekleniyordu)`);
      taşmaDenetle(h, `bulunamadı (${ad})`, o);
    }
    h.denetle('taşma');
  });

  await sinama(`[${surum.ad}] 360 px: şeması olmayan (boş) sekme ekranlarında yatay kaydırma yok`, async () => {
    await t.ac(surum);
    const h = new Hatalar();
    const sekmeler = await p.eval('__kbt.sekmeler()');
    const bosIdler = v.sekmeler.map((s, i) => ({ s, i: i + 1 })).filter(({ s }) => !s.semalar.some((x) => v.dosyali.includes(x)));
    assert.ok(bosIdler.length >= 1, 'veride boş sekme kalmamış: bu test için en az bir şemasız sekme gerekir');
    for (const { s, i } of bosIdler) {
      await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(${i})`);
      const o = await olc(p, { genislik: GENISLIK });
      if (o.ekran !== 'bos-sekme') h.ekle(`sekme "${s.ad}": ekran ${o.ekran} (boş sekme bekleniyordu)`);
      taşmaDenetle(h, `boş sekme ${sekmeler[i] ? sekmeler[i].metin : s.ad}`, o);
      await t.yaz('4002');                     // boş sekmede sorgu yazılırsa da taşmamalı
      taşmaDenetle(h, `boş sekme + sorgu ${s.ad}`, await olc(p, { genislik: GENISLIK }));
    }
    h.denetle(`${bosIdler.length} boş sekme`);
  });

  await sinama(`[${surum.ad}] 360 px: süpürme — bütün kablo/cihaz/soket/pin ayrıntıları, listeler ve sekmeler (yatay kaydırma yok, ekran sayıları veriyle uyumlu)`, async () => {
    await t.ac(surum);
    const h = new Hatalar();
    const sayac = {};
    for await (const e of ekranlar(p, { kapsam: 'tam', genislik: GENISLIK })) {
      sayac[e.tur] = (sayac[e.tur] || 0) + 1;
      taşmaDenetle(h, e.ad, e);
      if (e.ekran === 'hata' || e.ekran === 'bilinmiyor') h.ekle(`${e.ad}: ekran türü ${e.ekran}: ${kisa(e.icerik, 100)}`);
    }
    if (p.errors.length) h.ekle('konsol hatası: ' + p.errors.slice(0, 3).join(' | '));
    // kapsam: gezilen ekranlar gerçekten istenenler mi
    if (sayac.kablo !== v.gruplar.size) h.ekle(`kablo ekranı ${sayac.kablo} (veri: ${v.gruplar.size} kablo)`);
    if (sayac.cihaz !== v.cihazlar.size) h.ekle(`cihaz ekranı ${sayac.cihaz} (veri: ${v.cihazlar.size} cihaz)`);
    if (!(sayac.uc >= 30)) h.ekle(`pin izi ekranı ${sayac.uc} (41A01'in 30 pini dahil en az 30 bekleniyordu)`);
    if (!(sayac.soket >= 10)) h.ekle(`soket ekranı ${sayac.soket}`);
    if (sayac.sekme !== v.sekmeler.length + 1) h.ekle(`sekme ekranı ${sayac.sekme} (Tümü + ${v.sekmeler.length})`);
    console.log('  · ' + Object.entries(sayac).map(([k, n]) => `${k} ${n}`).join(' · '));
    h.denetle('taşma');
  });
}

await sinama('[dağıtım] 320 px (küçük telefon): süpürmede yatay kaydırma yok', async () => {
  await t.boyut(320, 700, true);
  await t.ac(DAGITIM);
  const h = new Hatalar();
  for await (const e of ekranlar(p, { kapsam: 'tam', genislik: 320 })) taşmaDenetle(h, e.ad, e, 320);
  h.denetle('320 px taşma');
  await t.boyut(GENISLIK, 800, true);
});

for (const carpan of [1.3, 2]) {
  await sinama(`[dağıtım] 360 px, sistem yazı boyutu büyütülmüş (kök yazı ${carpan}×, Android "büyük yazı"): süpürmede yatay kaydırma yok`, async () => {
    await t.boyut(GENISLIK, 800, true);
    await t.ac(DAGITIM);
    await p.eval(`document.documentElement.style.fontSize = '${carpan * 100}%'`);
    const olcum = await p.eval(`parseFloat(getComputedStyle(document.body).fontSize)`);
    assert.ok(Math.abs(olcum - 16 * carpan) < 0.5, `kök yazı ${carpan}× uygulanmadı (gövde yazısı ${olcum}px, beklenen ${16 * carpan}px): arayüz rem kullanmıyor olabilir`);
    const h = new Hatalar();
    for await (const e of ekranlar(p, { kapsam: 'tam', genislik: GENISLIK })) taşmaDenetle(h, e.ad, e);
    h.denetle(`yazı ${carpan}×`);
  });
}

await t.kapat();
bitir();
