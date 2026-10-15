// (h) Sızıntı testi: DAĞITIM sürümünde geliştirici / doğrulama dili ve yerel ortam bilgisi geçmemeli.
//   Yasak terimler: "Beyin Listesi", "emin:false", "VERI-MODELI", "kararlar", "A/B okuma", "karar bekliyor"
//   (büyük/küçük harf ve aksan farkı yok sayılır: BEYİN LİSTESİ de yakalanır) + yerel ortam: /home/, olcay, İndirilenler, Yeni Klasör, kaynakKlasor, .gecici
//   Üç katman: (1) gömülü veri paketi (+ build sözleşmesi: not / celiskiler / suphe ayıklanmış), (2) ekranlarda görünen + gizli metin + nitelikler
//   (bütün kablo/cihaz/soket/pin ekranları gezilir), (3) HAM HTML kaynağı (kod yorumları ve arayüz metin sabitleri dahil; harfiyen istenen ölçüt).
//   DOĞRULAMA sürümü pozitif kontroldür: bu terimler orada bulunmalı (yoksa tarama çalışmıyordur).
//   node test/tarayici/sizinti.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, kisa } from './yardimci.mjs';
import { ekranlar } from './supurme.mjs';

const GELISTIRICI = ['Beyin Listesi', 'emin:false', 'VERI-MODELI', 'kararlar', 'A/B okuma', 'karar bekliyor'];
const YEREL = ['/home/', 'olcay', 'İndirilenler', 'Yeni Klasör', 'kaynakKlasor', '.gecici'];

/** Aksanları ve büyük/küçük harf farkını atar (İ/ı dahil); uzunluk korunur. */
const katla = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/İ/g, 'i').toLowerCase();

/** metinde terimleri arar; [{terim, i, baglam}] */
function bul(metin, terimler, sinir = 50) {
  const f = katla(metin), kayit = [];
  for (const terim of terimler) {
    const k = katla(terim);
    let i = -1;
    while ((i = f.indexOf(k, i + 1)) >= 0) {
      const kaynak = f.length === String(metin).length ? String(metin) : f;   // katlama uzunluğu korur; bağlam özgün yazımla gösterilir
      kayit.push({ terim, i, baglam: kisa(kaynak.slice(Math.max(0, i - sinir), i + k.length + sinir), 2 * sinir + k.length + 4) });
      if (kayit.length > 200) return kayit;
    }
  }
  return kayit;
}

function veriYuku(html) {
  const m = /<script type="application\/json" id="kb-veri">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('gömülü veri paketi (script#kb-veri) bulunamadı');
  return { ham: m[1], bas: m.index, son: m.index + m[0].length };
}

const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
const p = t.p;
console.log(`# tarayıcı: ${t.surum} · yasak terimler: ${GELISTIRICI.join(' | ')} · yerel: ${YEREL.join(' | ')}`);

// ------------------------------------------------------------------------------------------------------------
await sinama('[dağıtım] (h1) gömülü veri paketinde geliştirici dili ve yerel yol yok; build sözleşmesi: parça notu, çelişki listesi, şüphe ayrıntıları ayıklanmış', async () => {
  const html = fs.readFileSync(DAGITIM.dosya, 'utf8');
  const { ham } = veriYuku(html);
  const h = new Hatalar();
  for (const b of bul(ham, GELISTIRICI.concat(YEREL))) h.ekle(`veri paketinde "${b.terim}": …${b.baglam}…`);
  const paket = JSON.parse(ham);
  if (paket.meta && paket.meta.surum !== 'dagitim') h.ekle(`meta.surum "${paket.meta.surum}" (dagitim bekleniyordu)`);
  for (const [sid, sema] of Object.entries(paket.veri || {})) {
    if (Array.isArray(sema.celiskiler) ? sema.celiskiler.length : sema.celiskiler) h.ekle(`${sid}: celiskiler listesi gömülmüş`);
    for (const k of sema.kablolar || []) {
      if (k.not) h.ekle(`${sid}:${k.id}: parça notu gömülmüş ("${kisa(k.not, 60)}")`);
      if (k.suphe) for (const alan of Object.keys(k.suphe)) if (alan !== 'soru') h.ekle(`${sid}:${k.id}: suphe.${alan} gömülmüş (yalnız "soru" kalmalı)`);
    }
    for (const c of sema.cihazlar || []) if (c.not) h.ekle(`${sid}:${c.kod}: cihaz notu gömülmüş ("${kisa(c.not, 60)}")`);
  }
  h.denetle('veri paketinde sızıntı');
});

// ------------------------------------------------------------------------------------------------------------
await sinama('[dağıtım] (h2) ekranlarda (görünen + gizli metin + nitelikler + sayfa başlığı) geliştirici dili ve yerel yol yok — bütün kablo/cihaz/soket/pin ekranları gezilerek', async () => {
  await t.ac(DAGITIM);
  const h = new Hatalar();
  let n = 0;
  for await (const e of ekranlar(p, { kok: true, kapsam: 'tam' })) {
    n++;
    for (const [yer, metin] of [['metin', e.koku.metin], ['nitelik', e.koku.nitelik], ['başlık/meta', e.koku.baslik], ['görünen içerik', e.icerik]]) {
      for (const b of bul(metin, GELISTIRICI.concat(YEREL))) h.ekle(`ekran "${e.ad}" (${yer}): "${b.terim}" — …${b.baglam}…`);
    }
  }
  assert.ok(n >= 150, `süpürme yalnız ${n} ekran gezdi`);
  console.log(`  · ${n} ekranın görünen/gizli metni ve nitelikleri tarandı`);
  h.denetle(`${n} ekranda sızıntı`);
});

// ------------------------------------------------------------------------------------------------------------
await sinama('[dağıtım] (h3) HAM HTML kaynağında (kod yorumları ve arayüz metin sabitleri dahil) geliştirici dili ve yerel yol yok — harfiyen ölçüt', async () => {
  const html = fs.readFileSync(DAGITIM.dosya, 'utf8');
  const { bas, son } = veriYuku(html);
  const kod = html.slice(0, bas) + ' '.repeat(son - bas) + html.slice(son);   // konumlar korunur, veri yükü boşaltılır
  const bloklar = Array.from(kod.matchAll(/\/\*[\s\S]*?\*\//g)).map((m) => [m.index, m.index + m[0].length]);
  const siniflar = { 'kod yorumu': 0, 'arayüz metin sabiti (yalnız doğrulama verisiyle görünür)': 0, 'veri yükü': 0 };
  const h = new Hatalar();
  for (const [ad, metin] of [['kod', kod]]) {
    for (const b of bul(metin, GELISTIRICI.concat(YEREL))) {
      const satirBas = metin.lastIndexOf('\n', b.i) + 1;
      const onek = metin.slice(satirBas, b.i);
      const yorum = bloklar.some(([a, z]) => b.i >= a && b.i < z) || /^\s*\/\//.test(onek) || /\s\/\/\s/.test(onek);
      siniflar[yorum ? 'kod yorumu' : 'arayüz metin sabiti (yalnız doğrulama verisiyle görünür)']++;
      h.ekle(`${yorum ? 'kod yorumu' : 'metin sabiti'}: "${b.terim}" — …${b.baglam}…`);
    }
  }
  const { ham } = veriYuku(html);
  for (const b of bul(ham, GELISTIRICI.concat(YEREL))) { siniflar['veri yükü']++; h.ekle(`veri yükü: "${b.terim}" — …${b.baglam}…`); }
  if (h.say) console.log('  · isabet sınıfları: ' + Object.entries(siniflar).map(([k, n]) => `${k} ${n}`).join(' · '));
  h.denetle('ham HTML kaynağında yasak terim var');
});

// ------------------------------------------------------------------------------------------------------------
await sinama('[doğrulama] (h4) pozitif kontrol: aynı terimler doğrulama sürümünün veri paketinde ve ekranlarında BULUNUYOR (tarama gerçekten çalışıyor); yerel yol yine yok', async () => {
  const html = fs.readFileSync(DOGRULAMA.dosya, 'utf8');
  const { ham } = veriYuku(html);
  const yukte = bul(ham, GELISTIRICI);
  assert.ok(yukte.length >= 1, 'doğrulama sürümünün veri paketinde yasak terimlerden hiçbiri yok: tarama ya da build (--notlar) çalışmıyor');
  const yerel = bul(ham, YEREL);
  assert.equal(yerel.length, 0, 'doğrulama sürümünün veri paketinde yerel yol: ' + yerel.map((b) => b.terim + ' …' + b.baglam).slice(0, 3).join(' | '));
  await t.ac(DOGRULAMA);
  const bulunan = new Map();
  let n = 0;
  for await (const e of ekranlar(p, { kok: true, kapsam: 'tam' })) {
    n++;
    for (const b of bul(e.koku.metin + '\n' + e.icerik, GELISTIRICI)) if (!bulunan.has(b.terim)) bulunan.set(b.terim, e.ad);
    const y = bul(e.koku.metin + '\n' + e.koku.nitelik + '\n' + e.icerik, YEREL);
    assert.equal(y.length, 0, `doğrulama ekranında "${e.ad}" yerel yol: ${y[0] && y[0].terim}`);
  }
  assert.ok(bulunan.size >= 1, `doğrulama sürümünün ${n} ekranında yasak terimlerden hiçbiri görünmedi: ekran taraması pozitif kontrolü geçemedi`);
  console.log(`  · veri paketinde ${new Set(yukte.map((b) => b.terim)).size} terim; ekranlarda: ` + Array.from(bulunan).map(([k, v]) => `"${k}" (${v})`).join(' · '));
});

await t.kapat();
bitir();
