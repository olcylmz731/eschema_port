// gorsel-elestirmen: "ilk ekranda cevap var mi?" olcumu. Her genislik x durum icin diyagramin (ya da cihaz icin pin listesinin) ust Y'sini,
// METIN ozetinin Y'sini ve sayfa boyunu olcer. Cikti: test/gorsel/tur1/ilk-ekran.json  (aydinlik tema; yalniz olcum, goruntu almaz)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../cdp.mjs';
const BU = path.dirname(fileURLToPath(import.meta.url)); const KOK = path.resolve(BU, '..', '..') + '/';
const D = JSON.parse(fs.readFileSync(path.join(BU, 'durumlar.json'), 'utf8'));
const TUR = process.argv[2] || 'tur1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sonuc = [];
for (const g of D.genislikler) {
  const b = await launch({ width: g.w, height: g.h }); const p = b.page;
  await p.resize(g.w, g.h, g.mobil); if (g.mobil) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const dokun = async (x, y) => { if (g.mobil) { await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(50); await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } else await p.click(x, y); await sleep(150); };
  for (const d of D.durumlar) {
    if (!d.sorgu) continue;
    const url = 'file://' + path.resolve(KOK, D.uygulamalar[d.uygulama]);
    await p.goto('about:blank'); await p.goto(url); await sleep(500);
    const r = await p.eval(`(() => { const e = document.getElementById('kb-ara'); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await dokun(r.x, r.y); await p.type(d.sorgu); await sleep(900);
    await p.eval(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); 1`); await sleep(200);
    const o = await p.eval(`(() => {
      const y = (e) => e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
      const alt = (e) => e ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null;
      const ic = document.getElementById('kb-icerik');
      const serit = ic.querySelector('[class*=serit], [class*=dogrulanmadi]');
      const svg = [...ic.querySelectorAll('svg[role=img]')].find((s) => s.getBoundingClientRect().width > 60);
      const pin = ic.querySelector('.pin-tablo, [class*=pin-tablo]');
      const metin = [...ic.querySelectorAll('h3')].find((h) => /METİN/.test(h.textContent));
      const cizim = [...ic.querySelectorAll('h3')].find((h) => /ÇİZİM/.test(h.textContent));
      const baslik = ic.querySelector('h2');
      return { ustBlokAlt: alt(document.getElementById('kb-ust')), seritAlt: alt(serit), baslikY: y(baslik), diyagramY: y(svg), diyagramAlt: alt(svg), pinTabloY: y(pin), metinY: y(metin), cizimY: y(cizim), sayfaH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), vh: innerHeight };
    })()`);
    sonuc.push({ genislik: g.w, durum: d.id, sorgu: d.sorgu, ...o });
    console.log(g.w, d.id.padEnd(10), JSON.stringify(o));
  }
  await b.close();
}
fs.writeFileSync(KOK + 'test/gorsel/' + TUR + '/ilk-ekran.json', JSON.stringify(sonuc, null, 1));
