// (a) Her şemadan rastgele 10 kablo (sabit tohum) arama kutusuna YAZILINCA doğru uçlar çıkıyor mu?
//   Beklenen: veri/<sema>.json (cihaz, soket, pin; ara soket; ek noktası; kaynak PDF/sayfa/yol/satır).
//   Okunan: arayüzün METİN özeti (KB.metin çıktısı) ve kaynak bloğu. Gerçek yazma: CDP Input.insertText.
//   Dağıtım ve doğrulama sürümlerinde aynı örneklem.
//   node test/tarayici/kablo-arama.mjs
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, veri, rastgeleKablolar, yazilan, beklenenUclar, beklenenKaynaklar, kaynakDenetle, kisa } from './yardimci.mjs';

const v = veri();
const t = await tarayici({ genislik: 412, yukseklik: 900, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum} · şemalar (veri dosyalı): ${v.dosyali.join(', ')}${v.dosyasiz.length ? ' · dosyasız: ' + v.dosyasiz.join(', ') : ''}`);

/** Bir kabloyu kutuya yazar, gerekirse sonuç satırına dokunur; ayrıntı kartındaki uçları veri dosyasıyla karşılaştırır. */
async function kontrol(g, hatalar) {
  const parcalar = v.gruplar.get(g);
  const yaz = yazilan(g);
  await t.yaz(yaz);
  let ekran = await p.eval('__kbt.ekran()');
  if (ekran === 'liste') {
    const tiklandi = await p.eval(`__kbt.satirTikla('kablo', ${JSON.stringify(yaz)})`);
    if (!tiklandi) {
      const satirlar = await p.eval('__kbt.satirlar().map((s) => s.tur + ":" + s.kod)');
      hatalar.ekle(`${g}: "${yaz}" yazılınca sonuç listesinde bu kablo yok (satırlar: ${satirlar.slice(0, 8).join(', ')})`);
      return;
    }
    ekran = await p.eval('__kbt.ekran()');
  }
  if (ekran !== 'detay') { hatalar.ekle(`${g}: "${yaz}" yazılınca kablo ayrıntısı açılmadı (ekran: ${ekran}; içerik: ${kisa(await p.eval('__kbt.icerik()'), 120)})`); return; }

  // başlık: numarasız kabloda şemadaki etiketin kendisi ('2,5br' ile '#2,5br' ayrı kablolar); numaralıda numara ('#' işareti olabilir)
  const baslik = String(await p.eval('__kbt.kartBasligi()'));
  const baslikTamam = g.startsWith('etiket:') ? baslik.toUpperCase() === yaz.toUpperCase() : baslik.replace(/^#/, '').toUpperCase() === yaz.toUpperCase();
  if (!baslikTamam) hatalar.ekle(`${g}: kart başlığı "${baslik}" (beklenen "${yaz}")`);

  const ozet = (await p.eval('__kbt.metinOzeti()')) || '';
  const kart = (await p.eval('__kbt.kartMetni()')) || '';
  if (!ozet) { hatalar.ekle(`${g}: METİN özeti bulunamadı`); return; }
  const kesik = /… \(\d+ satır daha\)/.test(ozet);
  for (const b of beklenenUclar(parcalar)) {
    if (b.test(ozet)) continue;
    if (kesik && b.test(kart)) continue;   // özet 40 satırda kısaltılmışsa uç kartın başka yerinde (çizim) görünebilir
    hatalar.ekle(`${g}: uç özette yok → ${b.ad}\n    özet: ${kisa(ozet, 400)}`);
  }
  // kaynak bloğu: PDF adı + sayfa + yol/satır
  const kaynak = (await p.eval('__kbt.kaynak()')) || kart;
  for (const e of kaynakDenetle(kaynak, beklenenKaynaklar(parcalar))) hatalar.ekle(`${g}: kaynak bloğunda ${e}`);
}

for (const surum of [DAGITIM, DOGRULAMA]) {
  for (const sema of v.dosyali) {
    await sinama(`[${surum.ad}] ${sema}: rastgele 10 kablo yazılınca doğru uçlar + kaynak çıkıyor`, async () => {
      await t.ac(surum);
      const secilen = rastgeleKablolar(sema, 10);
      if (secilen.length < Math.min(10, v.gruplar.size)) throw new Error(`yalnız ${secilen.length} kablo seçilebildi`);
      console.log(`  · örneklem (${sema}): ${secilen.map(yazilan).join(', ')}`);
      const hatalar = new Hatalar();
      for (const g of secilen) await kontrol(g, hatalar);
      if (p.errors.length) hatalar.ekle('konsol/özel durum hatası: ' + p.errors.join(' | ').slice(0, 300));
      hatalar.denetle(`${sema}: ${secilen.length} kablodan bazıları arayüzde yanlış`);
    });
  }
}

await t.kapat();
bitir();
