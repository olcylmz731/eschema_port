// (j) 8 sistem sekmesinin (+ "Tümü") hepsi görünür; şeması olmayan sekmede DÜRÜST boş durum; dolu sekme yalnız kendi şemalarını gösterir.
//   Beklenen: veri/semalar.json "sekmeler" (ad, sıra, hangi şemalar) ve hangi şemaların veri dosyası var.
//   node test/tarayici/sekmeler.mjs
import assert from 'node:assert/strict';
import { sinama, bitir, Hatalar, tarayici, DAGITIM, DOGRULAMA, veri, olc, kisa, nfc, YAZI } from './yardimci.mjs';

const v = veri();
const SEKMELER = v.sekmeler.map((s) => ({ id: s.id, ad: s.ad, semalar: s.semalar, bos: !s.semalar.some((x) => v.dosyali.includes(x)) }));
const BOS = SEKMELER.map((s, i) => ({ ...s, sira: i + 1 })).filter((s) => s.bos);
const DOLU = SEKMELER.map((s, i) => ({ ...s, sira: i + 1 })).filter((s) => !s.bos);
console.log(`# sekmeler (semalar.json): ${SEKMELER.map((s) => s.ad + (s.bos ? ' [boş]' : '')).join(' · ')}`);
assert.equal(SEKMELER.length, 8, `semalar.json'da 8 sekme bekleniyordu, ${SEKMELER.length} var`);

const tumu = (m) => nfc(m).replace(/\s+/g, ' ').trim();

/** o anda tam bir sekme seçili ve bu, beklenen sıradaki mi */
async function seciliSira(p) {
  const l = await p.eval('__kbt.sekmeler()');
  const secili = l.map((s, i) => (s.secili ? i : -1)).filter((i) => i >= 0);
  return secili;
}

for (const surum of [DAGITIM, DOGRULAMA]) {
  await sinama(`[${surum.ad}] 8 sistem sekmesi + Tümü masaüstünde (1280 px) görünür, adları ve sırası semalar.json ile aynı`, async () => {
    const t = await tarayici({ genislik: 1280, yukseklik: 800, mobil: false });
    try {
      const p = await t.ac(surum);
      const l = await p.eval('__kbt.sekmeler()');
      const h = new Hatalar();
      if (l.length !== SEKMELER.length + 1) h.ekle(`sekme düğmesi ${l.length} (Tümü + ${SEKMELER.length} = ${SEKMELER.length + 1} bekleniyordu)`);
      if (!/^Tümü/.test(tumu(l[0] && l[0].metin))) h.ekle(`ilk sekme "${l[0] && l[0].metin}" (Tümü bekleniyordu)`);
      SEKMELER.forEach((s, i) => {
        const g = l[i + 1];
        if (!g) { h.ekle(`"${s.ad}" sekmesi yok`); return; }
        if (!tumu(g.metin).startsWith(tumu(s.ad))) h.ekle(`${i + 1}. sekme "${g.metin}" (beklenen "${s.ad}")`);
        if (!g.gorunur) h.ekle(`"${s.ad}" sekmesi görünmüyor`);
        if (g.sol < 0 || g.sag > 1280) h.ekle(`"${s.ad}" sekmesi ekran dışında [${g.sol}..${g.sag}]`);
        const bosIsareti = g.metin.includes(YAZI.bosSekme);
        if (bosIsareti !== s.bos) h.ekle(`"${s.ad}" sekmesi ${s.bos ? 'boş olduğu hâlde işaretsiz' : 'dolu olduğu hâlde "şeması henüz eklenmedi" diyor'}`);
      });
      if (!l[0].secili) h.ekle('açılışta "Tümü" seçili değil');
      const sec = await seciliSira(p);
      if (sec.length !== 1) h.ekle(`aynı anda ${sec.length} sekme seçili`);
      h.denetle('sekmeler');
    } finally { await t.kapat(); }
  });

  await sinama(`[${surum.ad}] 360 px: her sekme görünür (gizli/kesik değil), dokunma yüksekliği >= 44 px, kaydırılınca ekrana giriyor; sayfa yatay kaymıyor`, async () => {
    const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
    try {
      const p = await t.ac(surum);
      const h = new Hatalar();
      const l = await p.eval('__kbt.sekmeler()');
      assert.equal(l.length, SEKMELER.length + 1, `sekme düğmesi ${l.length}`);
      for (let i = 0; i < l.length; i++) {
        const ad = i ? SEKMELER[i - 1].ad : 'Tümü';
        if (!l[i].gorunur) h.ekle(`"${ad}" sekmesi görünmüyor (genişlik ${l[i].genislik}, yükseklik ${l[i].yukseklik})`);
        if (l[i].yukseklik < 44) h.ekle(`"${ad}" sekmesi ${l[i].yukseklik} px yüksek (dokunma için en az 44)`);
        const r = await p.eval(`(() => { const e = document.querySelectorAll('[role="tab"]')[${i}]; e.scrollIntoView({ inline: 'center', block: 'nearest' }); const b = e.getBoundingClientRect(); return { sol: Math.round(b.left), sag: Math.round(b.right) }; })()`);
        if (r.sol < -1 || r.sag > 361) h.ekle(`"${ad}" sekmesi kaydırılınca bile ekrana sığmıyor [${r.sol}..${r.sag}]`);
      }
      const o = await olc(p, { genislik: 360 });
      if (Math.max(o.tasma.sw, o.tasma.bw, o.tasma.iw) > 360) h.ekle(`sekme çubuğu sayfayı yatay kaydırıyor: ${o.tasma.sw}/${o.tasma.bw}/${o.tasma.iw}`);
      h.denetle('360 px sekmeler');
    } finally { await t.kapat(); }
  });

  await sinama(`[${surum.ad}] şeması olmayan ${BOS.length} sekme (${BOS.map((s) => s.ad).join(', ')}): dürüst boş durum — sonuç/uydurma kayıt yok, "bulunamadı" demiyor, sorgu yazılsa da aynı`, async () => {
    assert.ok(BOS.length >= 1, 'veride şeması olmayan sekme kalmadı: bu test için en az bir boş sekme gerekir (veri dolunca test bilerek elenir)');
    const t = await tarayici({ genislik: 360, yukseklik: 800, mobil: true });
    try {
      const p = await t.ac(surum);
      const h = new Hatalar();
      for (const s of BOS) {
        await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(${s.sira})`);
        for (const [durum, yaz] of [['boş sorgu', ''], ['sorgu 4002', '4002'], ['sorgu 41A01', '41A01']]) {
          if (yaz) await t.yaz(yaz);
          const o = await p.eval(`({ ekran: __kbt.ekran(), satir: __kbt.satirlar().length, kart: !!document.querySelector('${'article'}'), metin: __kbt.icerik(), sec: __kbt.sekmeler().map((x, i) => x.secili ? i : -1).filter((i) => i >= 0) })`);
          const yer = `"${s.ad}" (${durum})`;
          if (o.sec.length !== 1 || o.sec[0] !== s.sira) h.ekle(`${yer}: seçili sekme ${JSON.stringify(o.sec)} (beklenen [${s.sira}])`);
          if (o.ekran !== 'bos-sekme') h.ekle(`${yer}: ekran "${o.ekran}" (boş sekme durumu bekleniyordu): ${kisa(o.metin, 100)}`);
          if (o.satir) h.ekle(`${yer}: ${o.satir} sonuç satırı gösteriyor`);
          if (o.kart) h.ekle(`${yer}: ayrıntı kartı gösteriyor`);
          if (!o.metin.includes('henüz eklenmedi')) h.ekle(`${yer}: "henüz eklenmedi" demiyor: ${kisa(o.metin, 100)}`);
          if (o.metin.includes(YAZI.bulunamadi)) h.ekle(`${yer}: "bulunamadı" diyor (veri aranmadı, şema yok; yanıltıcı)`);
          if (/\d+ sonuç/.test(o.metin)) h.ekle(`${yer}: sonuç sayısı yazıyor: ${kisa(o.metin, 100)}`);
          if (/yükleniyor|hata|ters gitti/i.test(o.metin)) h.ekle(`${yer}: hata/yükleniyor metni: ${kisa(o.metin, 100)}`);
        }
      }
      h.denetle('boş sekme durumu');
    } finally { await t.kapat(); }
  });

  await sinama(`[${surum.ad}] dolu sekmeler (${DOLU.map((s) => s.ad).join(', ')}) yalnız kendi şemalarının kayıtlarını listeler; başka sistemin kaydı bulunamadı; Tümü ilk ekrana döner`, async () => {
    const t = await tarayici({ genislik: 412, yukseklik: 900, mobil: true });
    try {
      const p = await t.ac(surum);
      const h = new Hatalar();
      // tek şemaya özgü örnek kablolar (veri dosyalarından)
      const ozgu = {};
      for (const sema of v.dosyali) {
        for (const [g, parcalar] of v.gruplar) {
          const kume = new Set(parcalar.map((x) => x.sema));
          if (kume.size === 1 && kume.has(sema) && g.startsWith('no:')) { ozgu[sema] = g.slice(3); break; }
        }
      }
      for (const s of DOLU) {
        await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(${s.sira})`);
        await p.eval('__kbt.hepsiniGoster()');
        const o = await p.eval(`({ ekran: __kbt.ekran(), satirlar: __kbt.satirlar() })`);
        if (o.ekran !== 'liste') { h.ekle(`"${s.ad}" sekmesi liste göstermiyor (ekran: ${o.ekran})`); continue; }
        if (!o.satirlar.length) h.ekle(`"${s.ad}" sekmesi boş liste`);
        const izinli = s.semalar.filter((x) => v.dosyali.includes(x)).map((x) => nfc(v.semaAd(x)));
        const yasak = v.dosyali.filter((x) => !s.semalar.includes(x)).map((x) => nfc(v.semaAd(x)));
        for (const r of o.satirlar) {
          const m = nfc(r.metin);
          if (!izinli.some((a) => m.includes(a))) h.ekle(`"${s.ad}" sekmesi: ${r.tur} satırı "${r.kod}" kendi şemalarından (${izinli.join(', ')}) birini taşımıyor: ${kisa(r.metin, 90)}`);
          const baskasi = yasak.filter((a) => m.includes(a) && !izinli.some((i) => m.includes(i)));
          if (baskasi.length) h.ekle(`"${s.ad}" sekmesi: ${r.tur} satırı "${r.kod}" başka sistemin şemasından: ${baskasi.join(', ')}`);
        }
        // başka şemaya özgü kayıt bu sekmede bulunamaz
        for (const sema of v.dosyali) {
          if (s.semalar.includes(sema) || !ozgu[sema]) continue;
          await t.yaz(ozgu[sema]);
          const e = await p.eval('__kbt.ekran()');
          if (e !== 'bulunamadi') h.ekle(`"${s.ad}" sekmesinde ${sema}'ya özgü kablo ${ozgu[sema]} aranınca ekran "${e}" (bulunamadı bekleniyordu)`);
        }
        // kendi şemasına özgü kayıt bulunur
        for (const sema of s.semalar.filter((x) => v.dosyali.includes(x))) {
          if (!ozgu[sema]) continue;
          await t.yaz(ozgu[sema]);
          const e = await p.eval('__kbt.ekran()');
          if (e !== 'detay' && e !== 'liste') h.ekle(`"${s.ad}" sekmesinde kendi kablosu ${ozgu[sema]} aranınca ekran "${e}"`);
        }
      }
      // Tümü: başka sekmeden dönünce ilk ekran
      await p.eval(`__kbt.ara(''); __kbt.sekmeTikla(${DOLU[0].sira})`);
      await p.eval(`__kbt.sekmeTikla(0)`);
      const sec = await seciliSira(p);
      if (sec.length !== 1 || sec[0] !== 0) h.ekle(`Tümü'ne dönünce seçili sekme ${JSON.stringify(sec)}`);
      const ilk = await p.eval('__kbt.ekran()');
      if (ilk !== 'ilk') h.ekle(`Tümü + boş sorguda ilk ekran gelmedi (ekran: ${ilk})`);
      // Tümü'nde iki şemanın kaydı da bulunur
      for (const [sema, no] of Object.entries(ozgu)) {
        await t.yaz(no);
        const e = await p.eval('__kbt.ekran()');
        if (e !== 'detay' && e !== 'liste') h.ekle(`Tümü'nde ${sema}'ya özgü kablo ${no} bulunamadı (ekran: ${e})`);
      }
      h.denetle('dolu sekmeler');
    } finally { await t.kapat(); }
  });
}

bitir();
