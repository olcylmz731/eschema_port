// gorsel-elestirmen cekim betigi (TEST ARACI, urun kodu degil).
// Kullanim:  node test/gorsel/cek.mjs [tur1] [--cekirdek] [--ek] [--genislik=360] [--devam] [--olcum-yok]
//   --cekirdek : yalniz 4 genislik x 2 tema x 7 durum = 56 goruntu
//   --ek       : yalniz ek durumlar (durumlar.json "ek") + yazi olcegi (%175/%200)
//   --devam    : olcum.json'da olan vakalari atla
// Her vaka icin: temiz acilis -> tema dugmesine DOKUN -> arama alanina dokun + yaz -> bekle ->
//   olcum (olcum-sayfa.js) -> tam sayfa PNG (test/gorsel/<tur>/) -> kaydirarak gorunum dilimleri (.gecici/gorsel-elestirmen/<tur>/dilim/).
// Mobil genisliklerde dokunma (Input.dispatchTouchEvent), 1280'de fare. localStorage'a guvenilmez: tema her vakada dugmeyle secilir.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../cdp.mjs';

const BU = path.dirname(fileURLToPath(import.meta.url));          // test/gorsel
const KOK = path.resolve(BU, '..', '..') + '/';
const args = process.argv.slice(2);
const TUR = args.find((a) => /^tur\d+$/.test(a)) || 'tur1';
const bayrak = (ad) => args.includes('--' + ad);
const deger = (ad) => { const a = args.find((x) => x.startsWith('--' + ad + '=')); return a ? a.split('=')[1] : null; };

const D = JSON.parse(fs.readFileSync(path.join(BU, 'durumlar.json'), 'utf8'));
const CIKTI = path.join(BU, TUR) + '/';
const DILIM = path.join(KOK, '.gecici/gorsel-elestirmen', TUR, 'dilim') + '/';
const METIN = path.join(KOK, '.gecici/gorsel-elestirmen', TUR, 'metin') + '/';
fs.mkdirSync(CIKTI, { recursive: true }); fs.mkdirSync(DILIM, { recursive: true }); fs.mkdirSync(METIN, { recursive: true });
const OLCUM_SRC = fs.readFileSync(path.join(BU, 'olcum-sayfa.js'), 'utf8');
const urlOf = (uyg) => 'file://' + path.resolve(KOK, D.uygulamalar[uyg]);
const OLCUM_YOLU = CIKTI + (deger('olcum-dosya') || 'olcum.json');
let sonuclar = [];
if (bayrak('devam') && fs.existsSync(OLCUM_YOLU)) sonuclar = JSON.parse(fs.readFileSync(OLCUM_YOLU, 'utf8'));
const yapildi = new Set(sonuclar.map((s) => s.id));
const kaydet = () => fs.writeFileSync(OLCUM_YOLU, JSON.stringify(sonuclar, null, 1));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const merkez = (p, expr) => p.eval(`(() => { const e = (${expr}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; })()`);

async function dokun(p, mobil, x, y) {
  if (mobil) {
    await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await sleep(50);
    await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await p.click(x, y);
  }
  await sleep(150);
}

async function vaka(b, p, g, tema, durum, { id, dosya, olcek = 1, ek = false }) {
  const url = urlOf(durum.uygulama);
  const mobil = g.mobil;
  // temiz acilis
  // (uygulama son sorguyu history.state'ten geri yukler: ayni URL'ye yeniden gitmek bunu korur; bu yuzden her seferinde about:blank uzerinden temiz acilir)
  const olcekli = olcek !== 1;
  await p.goto('about:blank');
  await p.goto(url);
  await p.eval(`try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} 1`);
  await p.goto('about:blank');
  // yazi olcegi (Android "yazi boyutu" ayarinin karsiligi = Chrome varsayilan yazi boyutu) sayfa yuklenmeden once uygulanir.
  // DIKKAT: Page.captureScreenshot'in captureBeyondViewport kipi bu ayari sifirliyor; olcekli vakalarda tam sayfa PNG alinmaz, yalniz kaydirmali gorunum dilimleri.
  if (olcekli) await p.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * olcek), fixed: Math.round(13 * olcek) } });
  await p.goto(url);
  await p.eval(`document.fonts && document.fonts.ready ? document.fonts.ready.then(() => 1) : 1`);
  await sleep(600);
  let olcekYontem = null;
  if (olcekli) {
    const kok = await p.eval(`parseFloat(getComputedStyle(document.documentElement).fontSize)`);
    olcekYontem = Math.abs(kok - 16 * olcek) < 1 ? 'Page.setFontSizes (kok ' + kok + 'px)' : 'UYGULANMADI (kok ' + kok + 'px)';
  }
  // tema dugmesi (dokunarak)
  const ad = tema === 'acik' ? 'Açık' : 'Koyu';
  const temaHedef = await merkez(p, `[...document.querySelectorAll('#kb-tema button')].find((x) => x.textContent.trim().indexOf(${JSON.stringify(ad)}) === 0)`);
  let temaSonuc = 'dugme-yok';
  if (temaHedef) {
    await dokun(p, mobil, temaHedef.x, temaHedef.y);
    await sleep(300);
    const t = await p.eval(`document.documentElement.getAttribute('data-tema')`);
    temaSonuc = t === tema ? 'tamam' : 'olmadi(' + t + ')';
  }
  // sorgu
  if (durum.sorgu) {
    const ara = await merkez(p, `document.getElementById('kb-ara')`);
    if (ara) { await dokun(p, mobil, ara.x, ara.y); await p.type(durum.sorgu); }
    await sleep(1000);
    await p.eval(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); 1`);
    await sleep(300);
  }
  await p.eval(`window.scrollTo(0, 0); 1`);
  await sleep(300);

  const kay = { id, genislik: g.w, yukseklik: g.h, mobil, tema, durum: durum.id, durumAd: durum.ad, sorgu: durum.sorgu, uygulama: durum.uygulama, olcek, olcekYontem, ek, temaSonuc, dosya };
  // olcum
  if (!bayrak('olcum-yok')) {
    try { Object.assign(kay, await p.eval(OLCUM_SRC)); } catch (e) { kay.olcumHatasi = e.message.slice(0, 300); }
    if (kay.govdeMetni !== undefined) { fs.writeFileSync(METIN + id + '.txt', kay.govdeMetni); delete kay.govdeMetni; }
  }
  kay.konsolHata = [...p.errors];
  kay.konsolUyari = p.logs.filter((l) => l.type === 'warning' || l.type === 'warn').map((l) => l.text.slice(0, 200)).slice(0, 10);
  if (bayrak('resim-yok')) { kay.sayfaYuksekligi = await p.eval(`Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)`); return kay; }
  // tam sayfa (olcekli vakalarda yok: bkz. yukaridaki not)
  const boyut = await p.eval(`({ sh: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), iw: innerWidth, ih: innerHeight })`);
  kay.sayfaYuksekligi = boyut.sh;
  if (!olcekli) {
    try {
      const tam = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: boyut.iw, height: boyut.sh, scale: 1 } });
      fs.writeFileSync(CIKTI + dosya, Buffer.from(tam.data, 'base64'));
    } catch (e) { kay.tamSayfaHatasi = e.message.slice(0, 200); }
  }
  // kaydirarak gorunum dilimleri
  const adim = boyut.ih - 80; let n = 0;
  const dilimKlasor = olcekli ? CIKTI + 'olcek/' : DILIM;
  if (olcekli) fs.mkdirSync(dilimKlasor, { recursive: true });
  const enCok = olcekli ? 6 : 14;
  for (let y = 0; ; y += adim) {
    const yy = Math.min(y, Math.max(0, boyut.sh - boyut.ih));
    await p.eval(`window.scrollTo(0, ${yy}); 1`);
    await sleep(150);
    await p.shot(dilimKlasor + id + '_' + n + '.png');
    n++;
    if (yy >= boyut.sh - boyut.ih - 1 || n >= enCok) break;
  }
  await p.eval(`window.scrollTo(0, 0); 1`);
  kay.dilimSayisi = n;
  if (olcek !== 1) { await p.send('Page.setFontSizes', { fontSizes: { standard: 16, fixed: 13 } }).catch(() => {}); }
  return kay;
}

const secGenislik = deger('genislik');
const genislikler = D.genislikler.filter((g) => !secGenislik || String(g.w) === secGenislik);

for (const g of genislikler) {
  const b = await launch({ width: g.w, height: g.h });
  const p = b.page;
  try {
    await p.resize(g.w, g.h, g.mobil);
    if (g.mobil) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    // --- 56 cekirdek goruntu
    if (!bayrak('ek') && !bayrak('olcek')) {
      for (const tema of D.temalar) for (const durum of D.durumlar) {
        const id = `${g.w}-${tema}-${durum.id}`;
        if (yapildi.has(id)) continue;
        try {
          const kay = await vaka(b, p, g, tema, durum, { id, dosya: id + '.png' });
          sonuclar.push(kay); kaydet();
          console.log(`[${id}] yukseklik=${kay.sayfaYuksekligi} dilim=${kay.dilimSayisi} tema=${kay.temaSonuc} tasma=${kay.yatayTasma} kucukHedef=${kay.kucukHedefSayisi} konsolHata=${kay.konsolHata.length}`);
        } catch (e) { console.log(`[${id}] HATA: ${e.message}`); sonuclar.push({ id, hata: e.message }); kaydet(); }
      }
    }
    // --- ek durumlar ve yazi olcegi (yalniz 360 mobil, acik)
    if (!bayrak('cekirdek') && g.w === 360) {
      for (const ek of (bayrak('olcek') ? [] : D.ek)) {
        const id = `ek-${ek.id}-${g.w}-${ek.tema}`;
        if (yapildi.has(id)) continue;
        try {
          const kay = await vaka(b, p, g, ek.tema, { id: ek.id, ad: ek.id, sorgu: ek.sorgu, uygulama: ek.uygulama }, { id, dosya: id + '.png', ek: true });
          sonuclar.push(kay); kaydet();
          console.log(`[${id}] yukseklik=${kay.sayfaYuksekligi} dilim=${kay.dilimSayisi} tasma=${kay.yatayTasma} kucukHedef=${kay.kucukHedefSayisi}`);
        } catch (e) { console.log(`[${id}] HATA: ${e.message}`); sonuclar.push({ id, hata: e.message }); kaydet(); }
      }
      for (const olcek of D.yaziOlcegi.olcekler) for (const dId of D.yaziOlcegi.goruntu) {
        const durum = D.durumlar.find((x) => x.id === dId);
        const id = `olcek${Math.round(olcek * 100)}-${g.w}-acik-${dId}`;
        if (yapildi.has(id)) continue;
        try {
          const kay = await vaka(b, p, g, 'acik', durum, { id, dosya: id + '.png', olcek, ek: true });
          sonuclar.push(kay); kaydet();
          console.log(`[${id}] kokYazi=${kay.kokYaziPx} yontem=${kay.olcekYontem} yukseklik=${kay.sayfaYuksekligi} tasma=${kay.yatayTasma}(${kay.yatayTasmaPx}px) kucukHedef=${kay.kucukHedefSayisi}`);
        } catch (e) { console.log(`[${id}] HATA: ${e.message}`); sonuclar.push({ id, hata: e.message }); kaydet(); }
      }
    }
  } finally {
    await b.close();
  }
}
kaydet();
console.log('bitti: ' + sonuclar.length + ' vaka -> ' + OLCUM_YOLU);
