// (c) file:// ile açılış ve ilk ekran · (d) konsolda hata yok · (e) dosya boyutu < 1 MB — iki sürüm için.
//   node test/tarayici/acilis.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, veri, kisa } from './yardimci.mjs';
import { ekranlar } from './supurme.mjs';

const v = veri();
const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum}`);

for (const surum of [DAGITIM, DOGRULAMA]) {
  await sinama(`[${surum.ad}] file:// ile açılıyor, ilk ekran geliyor (arama kutusu, "Ne arıyorsun?", yükleniyor yazısı gitti, veri sayıları veri/*.json ile aynı)`, async () => {
    await t.ac(surum);
    const o = await p.eval(`({
      protokol: location.protocol, adres: location.href,
      baslik: document.title, dil: document.documentElement.lang,
      viewport: (document.querySelector('meta[name=viewport]') || {}).content || null,
      ara: !!document.querySelector('#kb-ara'), yukleniyor: !!document.querySelector('#kb-yukleniyor'),
      ekran: __kbt.ekran(), icerik: __kbt.icerik(),
      surum: window.KB && KB.arayuz && KB.arayuz.db && KB.arayuz.db.meta ? KB.arayuz.db.meta.surum : null,
      ist: window.KB && KB.arayuz && KB.arayuz.db ? KB.arayuz.db.istatistik : null,
      sekmeSayisi: document.querySelectorAll('[role=tab]').length,
      h1: (document.querySelector('h1') || {}).innerText || null
    })`);
    const h = new Hatalar();
    if (o.protokol !== 'file:') h.ekle(`protokol ${o.protokol} (file: bekleniyordu)`);
    if (o.baslik !== 'Kablo Bulucu') h.ekle(`sayfa başlığı "${o.baslik}"`);
    if (o.dil !== 'tr') h.ekle(`html lang="${o.dil}" (tr bekleniyordu)`);
    if (!o.viewport || !/width=device-width/.test(o.viewport) || !/initial-scale=1/.test(o.viewport)) h.ekle(`viewport meta: ${o.viewport}`);
    if (!o.ara) h.ekle('#kb-ara arama kutusu yok');
    if (o.yukleniyor) h.ekle('"Yükleniyor…" yazısı hâlâ ekranda');
    if (o.ekran !== 'ilk') h.ekle(`ilk ekran gelmedi (ekran: ${o.ekran}; içerik: ${kisa(o.icerik, 140)})`);
    if (o.surum !== surum.kod) h.ekle(`gömülü sürüm "${o.surum}" (beklenen "${surum.kod}")`);
    if (!/Kablo Bulucu/.test(o.h1 || '')) h.ekle(`başlık (h1): ${o.h1}`);
    if (o.sekmeSayisi !== v.sekmeler.length + 1) h.ekle(`sekme düğmesi ${o.sekmeSayisi} (Tümü + ${v.sekmeler.length} = ${v.sekmeler.length + 1} bekleniyordu)`);
    if (o.ist) {
      const beklenen = { sema: v.dosyali.length, parca: v.parcalar.length, kablo: v.gruplar.size, cihaz: v.cihazlar.size };
      for (const [k, b] of Object.entries(beklenen)) if (o.ist[k] !== b) h.ekle(`gömülü veri: istatistik.${k} = ${o.ist[k]} (veri/*.json'dan beklenen ${b})`);
    } else h.ekle('KB.arayuz.db.istatistik okunamadı');
    if (p.errors.length) h.ekle('açılışta konsol hatası: ' + p.errors.join(' | ').slice(0, 300));
    h.denetle('açılış');
  });

  await sinama(`[${surum.ad}] konsolda hata yok (açılış + bütün ekranların gezilmesi: ${'sekmeler, bulunamadı, listeler, her kablo/cihaz/soket, pin izleri'})`, async () => {
    await t.ac(surum);
    let n = 0;
    for await (const e of ekranlar(p, { kapsam: 'tam' })) { n++; void e; }
    await p.eval(`__kbt.temaTikla('acik'); __kbt.temaTikla('koyu')`);
    const uyarilar = p.logs.filter((l) => l.type === 'warning').map((l) => l.text);
    if (uyarilar.length) console.log(`  · bilgi: ${uyarilar.length} konsol uyarısı: ${kisa(uyarilar.slice(0, 3).join(' | '), 200)}`);
    assert.ok(n >= 100, `süpürme yalnız ${n} ekran gezdi`);
    assert.deepEqual(p.errors, [], `konsolda ${p.errors.length} hata (${n} ekran gezildi):\n` + p.errors.slice(0, 6).join('\n'));
    if (p.dialogs.length) throw new Error(`beklenmeyen alert/confirm penceresi: ${JSON.stringify(p.dialogs[0])}`);
  });
}

await sinama('dosya boyutu < 1 MB (iki sürüm)', () => {
  const h = new Hatalar();
  const sat = [];
  for (const s of [DAGITIM, DOGRULAMA]) {
    const b = fs.statSync(s.dosya).size;
    sat.push(`${s.ad}: ${(b / 1024).toFixed(0)} KB (${b} bayt)`);
    if (b >= 1024 * 1024) h.ekle(`${s.dosya}: ${b} bayt ≥ 1 MB (1048576)`);
  }
  console.log('  · ' + sat.join(' · '));
  h.denetle('dosya boyutu');
});

await t.kapat();
bitir();
