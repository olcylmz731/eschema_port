// Bütün ekranları gezen süpürme: açılış, sekmeler, bulunamadı, her kablo / cihaz / soket ayrıntısı, pin izleri, uzun listeler.
// Üç test kullanır (360 px taşma, sızıntı, DOĞRULANMADI). Gezinti ARA kutusu + sonuç satırı dokunuşu ile yapılır (SEC, yardimci.mjs).
// Beklenen değerler veri/<sema>.json'dan (veri()): hangi kablo/cihaz/soket var, hangi şemadalar.
import { SEC, veri, yazilan, olc } from './yardimci.mjs';

const bekle = (p, ifade, ms = 4000) => p.until(ifade, ms);

/** Veri dosyalarındaki bütün soket adları (ara soketler + cihaz soketleri), tekil, sıralı. */
export function soketAdlari() {
  const v = veri();
  const k = new Set();
  for (const { p } of v.parcalar) for (const u of p.uclar) {
    if (u.tur === 'soket' && u.soket) k.add(u.soket);
    if (u.tur === 'cihaz' && u.soket) k.add(u.soket);
  }
  return Array.from(k).sort();
}

/** Bir ekran görüntüsünü ölçüp döndürür (yield için). */
async function ekranOlc(p, ad, tur, ek, kok, satirlar, genislik) {
  const o = await olc(p, { kok, satirlar, genislik });
  return Object.assign({ ad, tur }, o, ek || {});
}

async function sorguyaGit(p, q) {
  await p.eval(`__kbt.ara(${JSON.stringify(q)})`);
}

/** Geri: history.back(); cihaz kartına (pin satırları var) dönülene kadar bekler. */
async function cihazKartinaDon(p, bilgi) {
  await p.eval('history.back()');
  try { await bekle(p, '__kbt.pinSatiriSayisi() > 0', 4000); } catch (e) {
    const d = await p.eval(`({ ekran: __kbt.ekran(), durum: JSON.stringify(history.state), icerik: __kbt.icerik().slice(0, 120) })`);
    throw new Error(`geri dönülemedi (${bilgi}): ekran ${d.ekran}, durum ${d.durum}, içerik "${d.icerik.replace(/\s+/g, ' ')}"`);
  }
}

/**
 * Ekranları sırayla üretir. Her ekran: { ad, tur, ekran, tasma, icerik, kart, satirSayisi, koku? }.
 * secenek: { kok: bool (kök metin + nitelikler de topla), satirlar: bool (sonuç satırlarının metni), genislik: beklenen CSS genişliği (taşma ölçümü için),
 *             kapsam: 'tam' | 'kisa', pinler: bool }
 */
export async function* ekranlar(p, secenek = {}) {
  const kok = !!secenek.kok;
  const satirlar = !!secenek.satirlar;
  const genislik = secenek.genislik || 0;
  const kisaKapsam = secenek.kapsam === 'kisa';
  const v = veri();

  // 1. açılış
  await p.eval(`__kbt.ara('')`);
  yield await ekranOlc(p, 'açılış (boş sorgu)', 'ilk', null, kok, satirlar, genislik);

  // 2. sekmeler (Tümü dahil): boş sorgu; boş sekmelerde ayrıca bir sorgu da yazılır
  const sekmeler = await p.eval('__kbt.sekmeler()');
  for (let i = 0; i < sekmeler.length; i++) {
    await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(${i})`);
    yield await ekranOlc(p, `sekme: ${sekmeler[i].metin}`, 'sekme', { sekmeSirasi: i }, kok, satirlar, genislik);
    if (!kisaKapsam && i > 0) {
      await p.eval(`__kbt.ara('4002')`);
      yield await ekranOlc(p, `sekme + sorgu 4002: ${sekmeler[i].metin}`, 'sekme-sorgu', { sekmeSirasi: i }, kok, satirlar, genislik);
      await p.eval(`__kbt.ara('')`);
    }
  }
  await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(0)`);   // Tümü

  // 3. bulunamadı (kısa, uzun boşluksuz, uzun boşluklu)
  for (const [ad, q] of [['kısa', 'ZZZ99999'], ['120 harflik boşluksuz', 'A'.repeat(120)], ['uzun boşluklu', 'ABC DEF '.repeat(14)], ['özel karakter', '<b>&"\'%$#?']]) {
    await sorguyaGit(p, q);
    yield await ekranOlc(p, `bulunamadı (${ad})`, 'bulunamadi', { q }, kok, satirlar, genislik);
  }
  await p.eval(`__kbt.ara('')`);

  // 4. geniş listeler ve "Hepsini göster"
  for (const q of ['4', '40', 'X0', 'A', '1']) {
    await sorguyaGit(p, q);
    yield await ekranOlc(p, `liste: "${q}"`, 'liste', { q }, kok, satirlar, genislik);
    if (await p.eval('__kbt.hepsiniGoster()')) yield await ekranOlc(p, `liste (hepsini göster): "${q}"`, 'liste', { q }, kok, satirlar, genislik);
  }
  await p.eval(`__kbt.ara('')`);

  // 5. her kablo
  for (const [g] of v.gruplar) {
    const q = yazilan(g);
    await sorguyaGit(p, q);
    let e = await p.eval('__kbt.ekran()');
    if (e === 'liste') { await p.eval(`__kbt.satirTikla('kablo', ${JSON.stringify(q)})`); e = await p.eval('__kbt.ekran()'); }
    yield await ekranOlc(p, `kablo ${g}`, 'kablo', { q, beklenenSema: Array.from(new Set(v.gruplar.get(g).map((x) => x.sema))) }, kok, satirlar, genislik);
  }

  // 6. her cihaz (kart: pin tablosu + çizim)
  for (const [kod, c] of v.cihazlar) {
    await sorguyaGit(p, kod);
    let e = await p.eval('__kbt.ekran()');
    if (e === 'liste') { await p.eval(`__kbt.satirTikla('cihaz', ${JSON.stringify(kod)})`); e = await p.eval('__kbt.ekran()'); }
    yield await ekranOlc(p, `cihaz ${kod}`, 'cihaz', { q: kod, beklenenSema: Array.from(c.semalar) }, kok, satirlar, genislik);
  }

  // 7. her soket (aynı adlı soketlerden en çok 6 satır)
  for (const ad of soketAdlari()) {
    await sorguyaGit(p, ad);
    const soketSatirlari = (await p.eval('__kbt.satirlar()')).filter((s) => s.tur === 'soket');
    const e0 = await p.eval('__kbt.ekran()');
    if (e0 === 'detay') { yield await ekranOlc(p, `soket ${ad}`, 'soket', { q: ad }, kok, satirlar, genislik); continue; }
    if (!soketSatirlari.length) { yield await ekranOlc(p, `soket ${ad} (soket satırı yok)`, 'soket-yok', { q: ad }, kok, satirlar, genislik); continue; }
    const n = Math.min(soketSatirlari.length, kisaKapsam ? 2 : 6);
    for (let i = 0; i < n; i++) {
      await sorguyaGit(p, ad);
      const tik = await p.eval(`(() => { const l = __kbt.satirlar().map((s, j) => [s, j]).filter((x) => x[0].tur === 'soket'); if (!l[${i}]) return false; document.querySelectorAll(${JSON.stringify(SEC.sonucSatiri)})[l[${i}][1]].click(); return true; })()`);
      if (!tik) break;
      yield await ekranOlc(p, `soket ${ad} (#${i + 1})`, 'soket', { q: ad }, kok, satirlar, genislik);
    }
  }

  // 8. pin izleri (cihaz kartındaki pin satırları): 41A01'in hepsi, öbür cihazlardan ilk 3'ü
  if (secenek.pinler !== false) {
    let kontrol = 0;
    for (const kod of ['41A01'].concat(kisaKapsam ? [] : Array.from(v.cihazlar.keys()).filter((k) => k !== '41A01'))) {
      if (!v.cihazlar.has(kod)) continue;
      await sorguyaGit(p, kod);
      if ((await p.eval('__kbt.ekran()')) === 'liste') await p.eval(`__kbt.satirTikla('cihaz', ${JSON.stringify(kod)})`);
      if ((await p.eval('__kbt.ekran()')) !== 'detay') continue;
      const toplam = await p.eval('__kbt.pinSatiriSayisi()');
      if (!toplam) continue;
      const hepsi = kod === '41A01';
      const sinir = hepsi ? Math.min(toplam, 40) : Math.min(toplam, 3);
      for (let i = 0; i < sinir; i++) {
        if (!(await p.eval(`__kbt.pinSatiriTikla(${i})`))) break;
        yield await ekranOlc(p, `pin ${kod} #${i + 1}`, 'uc', { q: kod }, kok, satirlar, genislik);
        await cihazKartinaDon(p, `${kod} pin #${i + 1}`);
      }
      if (!hepsi && ++kontrol >= 5) break;
    }
  }
}
