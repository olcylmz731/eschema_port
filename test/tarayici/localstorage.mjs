// (g) localStorage KULLANILAMAZKEN (dosya yöneticisi / gizli kip / çerez engeli) uygulama açılıyor ve arama çalışıyor.
//   Sayfa yüklenmeden ÖNCE (Page.addScriptToEvaluateOnNewDocument) localStorage bozulur:
//     erişim hata verir · null döner · getItem hata verir (SecurityError) · setItem hata verir (kota dolu)
//   Her varyant temiz bir tarayıcıda. node test/tarayici/localstorage.mjs
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, kisa } from './yardimci.mjs';

const VARYANTLAR = [
  {
    ad: 'window.localStorage erişimi hata veriyor (get() { throw })',
    betik: `Object.defineProperty(window, 'localStorage', { get() { throw new Error('x'); } });`,
    kanit: `(() => { try { window.localStorage; return false; } catch (e) { return true; } })()`
  },
  {
    ad: 'window.localStorage SecurityError veriyor (gizli kip / çerez engeli)',
    betik: `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('izin yok', 'SecurityError'); } });`,
    kanit: `(() => { try { window.localStorage; return false; } catch (e) { return e.name === 'SecurityError'; } })()`
  },
  {
    ad: 'window.localStorage null',
    betik: `Object.defineProperty(window, 'localStorage', { value: null, configurable: true });`,
    kanit: `window.localStorage === null`
  },
  {
    ad: 'getItem hata veriyor',
    betik: `Storage.prototype.getItem = function () { throw new DOMException('izin yok', 'SecurityError'); };`,
    kanit: `(() => { try { localStorage.getItem('x'); return false; } catch (e) { return true; } })()`
  },
  {
    ad: 'setItem hata veriyor (kota dolu)',
    betik: `Storage.prototype.setItem = function () { throw new DOMException('kota', 'QuotaExceededError'); };`,
    kanit: `(() => { try { localStorage.setItem('x', '1'); return false; } catch (e) { return e.name === 'QuotaExceededError'; } })()`
  }
];

/** Bozulmuş localStorage ile uygulamayı açıp kullanır; bulguları Hatalar'a ekler. */
async function kullan(t, surum, v) {
  const p = t.p;
  await t.ac(surum, { oncesi: [v.betik] });
  const h = new Hatalar();
  const kanit = await p.eval(v.kanit);
  if (kanit !== true) throw new Error(`test geçersiz: localStorage bozma betiği etkili değil (${v.ad}); kanıt sonucu ${kanit}`);
  // 1. açılış
  const ilk = await p.eval('__kbt.ekran()');
  if (ilk !== 'ilk') h.ekle(`ilk ekran gelmedi (ekran: ${ilk}; içerik: ${kisa(await p.eval('__kbt.icerik()'), 120)})`);
  // 2. arama (gerçek yazma): kablo → ayrıntı, cihaz → ayrıntı, olmayan → bulunamadı
  await t.yaz('4002');
  if ((await p.eval('__kbt.ekran()')) !== 'detay') h.ekle('"4002" yazılınca kablo ayrıntısı açılmadı');
  else if (!/Kablo #?4002/.test((await p.eval('__kbt.metinOzeti()')) || '')) h.ekle('4002 kartında METİN özeti "Kablo 4002" ile başlamıyor');
  await p.key('Enter');                               // arama gönderimi (form submit → geçmişe yazmayı dener)
  if ((await p.eval('__kbt.ekran()')) !== 'detay') h.ekle('Enter sonrası ekran bozuldu');
  await t.yaz('41A01');
  if ((await p.eval('__kbt.ekran()')) !== 'detay' || (await p.eval('__kbt.pinSatiriSayisi()')) < 1) h.ekle('"41A01" yazılınca cihaz tablosu açılmadı');
  await t.yaz('ZZZ99999');
  if ((await p.eval('__kbt.ekran()')) !== 'bulunamadi') h.ekle('olmayan kayıt "bulunamadı" göstermedi');
  // 3. sekme değiştirme
  await t.yaz('');
  await p.eval(`__kbt.sekmeTikla(1)`);
  const sekmeler = await p.eval('__kbt.sekmeler()');
  if (!sekmeler[1] || !sekmeler[1].secili) h.ekle('sekme düğmesi seçilmedi');
  if ((await p.eval('__kbt.ekran()')) !== 'liste') h.ekle(`dolu sekme listesi gelmedi (ekran: ${await p.eval('__kbt.ekran()')})`);
  await p.eval(`__kbt.sekmeTikla(0)`);
  // 4. tema: tercih kaydedilemese de bu oturumda uygulanır
  await p.eval(`__kbt.temaTikla('acik')`);
  const acik = await p.eval(`document.documentElement.getAttribute('data-tema')`);
  if (acik !== 'acik') h.ekle(`tema "açık" uygulanmadı (data-tema=${acik})`);
  await p.eval(`__kbt.temaTikla('koyu')`);
  const koyu = await p.eval(`document.documentElement.getAttribute('data-tema')`);
  if (koyu !== 'koyu') h.ekle(`tema "koyu" uygulanmadı (data-tema=${koyu})`);
  // 5. listeden ayrıntıya, tarayıcı geri tuşuyla listeye dönüş
  await t.yaz('40');
  if (!(await p.eval(`__kbt.satirTikla('kablo', '4002')`))) h.ekle('"40" listesinde kablo 4002 satırı yok');
  else if ((await p.eval('__kbt.ekran()')) !== 'detay') h.ekle('listeden kablo satırına dokununca ayrıntı açılmadı');
  else {
    await p.eval('history.back()');
    try { await p.until(`__kbt.ekran() === 'liste'`, 3000); } catch (e) { h.ekle(`geri tuşu listeye dönmedi (ekran: ${await p.eval('__kbt.ekran()')})`); }
  }
  if (p.errors.length) h.ekle('konsol/özel durum hatası: ' + p.errors.slice(0, 3).join(' | '));
  h.denetle(`${v.ad}`);
}

for (const v of VARYANTLAR) {
  await sinama(`[dağıtım] ${v.ad}: uygulama açılıyor, arama + sekme + tema çalışıyor, hata yok`, async () => {
    const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
    try { await kullan(t, DAGITIM, v); } finally { await t.kapat(); }
  });
}

await sinama('[doğrulama] window.localStorage erişimi hata veriyor: uygulama açılıyor, arama çalışıyor', async () => {
  const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
  try { await kullan(t, DOGRULAMA, VARYANTLAR[0]); } finally { await t.kapat(); }
});

await sinama('(karşıt kontrol) localStorage sağlamken tema tercihi yeniden açılışta korunur (testin localStorage ile gerçekten ilişkili olduğunu gösterir)', async () => {
  const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
  try {
    const p = await t.ac(DAGITIM);
    await p.eval(`__kbt.temaTikla('acik')`);
    const kayitli = await p.eval(`localStorage.getItem('kb-tema')`);
    assert.equal(kayitli, 'acik', `tema tercihi localStorage'a yazılmadı (kb-tema=${kayitli})`);
    await t.ac(DAGITIM);
    assert.equal(await p.eval(`document.documentElement.getAttribute('data-tema')`), 'acik', 'yeniden açılışta kayıtlı tema uygulanmadı');
  } finally { await t.kapat(); }
});

bitir();
