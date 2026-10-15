#!/usr/bin/env node
// Dokunma / yakınlaştırma testleri (başsız Brave, Input.dispatchTouchEvent).
// Yardımcılar dışa açıktır (arayüz testleri de kullanabilir): dokunmaHazirla, dokun, ciftDokun, surukle, cimdik, merkez.
// Doğrudan çalıştırınca gerçek veriyle şunları dener: cihaza dokununca onCihaz(kod) · soket/kablo/uç geri çağrıları ·
// iki parmakla yakınlaştırma · yakınlaştırılmışken tek parmak kaydırma (+ sahte tık yutma) · çift dokunuşla sıfırlama ·
// yakınlaştırılmamışken tek parmağın sayfayı kaydırması · klavye (+ - 0) · Ctrl+tekerlek · yapışkan soket bandı ·
// yakinlastirma:false · yatay kaydırma yok. Çıkış kodu ≠ 0 = hata.
import { pathToFileURL } from 'node:url';
import { launch } from '../cdp.mjs';
import { derle, temizle, SAYFA_JS } from './ortak.mjs';

// ---- yardımcılar -------------------------------------------------------------------------------------------------
export async function dokunmaHazirla(p) {
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}
const olay = (p, type, noktalar) => p.send('Input.dispatchTouchEvent', { type, touchPoints: noktalar.map((n) => ({ x: n.x, y: n.y, id: n.id, radiusX: 1, radiusY: 1, force: 1 })) });

/** Tek parmak dokunuşu (basıp bırak). */
export async function dokun(p, x, y, ms = 40) {
  await olay(p, 'touchStart', [{ x, y, id: 1 }]);
  await p.sleep(ms);
  await olay(p, 'touchEnd', []);
}
/** Çift dokunuş: iki kısa dokunuş, aralık ms. */
export async function ciftDokun(p, x, y, aralik = 90) {
  await dokun(p, x, y, 30); await p.sleep(aralik); await dokun(p, x, y, 30);
}
/** Tek parmak sürükleme (x0,y0 → x1,y1). */
export async function surukle(p, x0, y0, x1, y1, adim = 10, bekle = 16) {
  await olay(p, 'touchStart', [{ x: x0, y: y0, id: 1 }]);
  for (let i = 1; i <= adim; i++) { await olay(p, 'touchMove', [{ x: x0 + (x1 - x0) * i / adim, y: y0 + (y1 - y0) * i / adim, id: 1 }]); await p.sleep(bekle); }
  await olay(p, 'touchEnd', []);
}
/** İki parmakla açma/kapama: merkez (cx,cy), parmaklar arası d0 → d1, yatay eksende. kay: bu arada merkezin kayması {x,y}. */
export async function cimdik(p, cx, cy, d0, d1, { adim = 8, bekle = 16, kay = { x: 0, y: 0 } } = {}) {
  const nok = (d, k) => [{ x: cx - d / 2 + kay.x * k, y: cy + kay.y * k, id: 1 }, { x: cx + d / 2 + kay.x * k, y: cy + kay.y * k, id: 2 }];
  await olay(p, 'touchStart', [nok(d0, 0)[0]]);
  await olay(p, 'touchStart', nok(d0, 0));
  for (let i = 1; i <= adim; i++) { await olay(p, 'touchMove', nok(d0 + (d1 - d0) * i / adim, i / adim)); await p.sleep(bekle); }
  await olay(p, 'touchEnd', [nok(d1, 1)[0]]);
  await olay(p, 'touchEnd', []);
}
/** Seçicinin ilk eşleşen öğesinin ekran merkezi {x,y,w,h}. */
export function merkez(p, secici, filtreJs = '() => true') {
  return p.eval(`(() => { const l = [...document.querySelectorAll(${JSON.stringify(secici)})].filter((e) => (${filtreJs})(e)); const e = l[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, ad: e.getAttribute('aria-label') }; })()`);
}

// ---- ana sınama ---------------------------------------------------------------------------------------------------
async function main() {
  const html = derle('veri');
  const sonuc = [];
  const ok = (ad, kosul, detay) => { sonuc.push({ ad, kosul: !!kosul, detay }); console.log((kosul ? '  geçti  ' : '  KALDI  ') + ad + (detay !== undefined ? ' — ' + detay : '')); };
  const atla = (ad, neden) => { sonuc.push({ ad, kosul: true, atlandi: true }); console.log('  atlandı ' + ad + ' — ' + neden); };
  const VW = 412, W = VW - 32;
  const b = await launch({ width: VW, height: 800 });
  try {
    const p = await b.open('file://' + html);
    await p.sleep(150);
    await p.eval(SAYFA_JS);
    await dokunmaHazirla(p);
    const ciz = (tur, a, ek) => p.eval(`(() => { __T.log.length = 0; window.scrollTo(0, 0); const kap = __T.kapsayici(${W}, 'koyu'); window.__olc = []; window.__c = KB.diyagram.ciz(kap, __T.nesne(${JSON.stringify(tur)}, ${JSON.stringify(a)}), __T.secenek(Object.assign({ onOlcek: (o) => window.__olc.push(o) }, ${JSON.stringify(ek || {})}))); return __c ? { h: __c.yukseklik, y: __c.yerlesim } : null; })()`);
    const olcek = () => p.eval('__c.olcek()');
    const donusum = () => p.eval('document.querySelector(".dy-dunya").getAttribute("transform")');
    const log = () => p.eval('__T.log.join(" | ")');
    const ust = (y) => p.eval(`window.scrollTo(0, ${y}), window.scrollY`);
    // sayfa olabildiğince yüksek: ekran görüntüsü / kaydırma için görünüm penceresi sabit 800
    console.log('1) Dokunma → geri çağrılar (kablo 4046, dikey zincir)');
    await ciz('kablo', '4046');
    let h = await merkez(p, '.dy-dokun', '(e) => /^Cihaz 41A01/.test(e.getAttribute("aria-label"))');
    await p.eval('window.scrollTo(0, ' + Math.max(0, Math.round(h.y - 400)) + ')');
    h = await merkez(p, '.dy-dokun', '(e) => /^Cihaz 41A01/.test(e.getAttribute("aria-label"))');
    ok('hedef ≥ 48 px', h.w >= 47.5 && h.h >= 47.5, Math.round(h.w) + '×' + Math.round(h.h));
    await dokun(p, h.x - h.w / 2 + 28, h.y - h.h / 2 + 24); await p.sleep(150);
    ok('cihaza dokununca onCihaz("41A01")', (await log()) === 'cihaz 41A01', await log());
    await p.eval('__T.log.length = 0');
    let s = await merkez(p, '.dy-dokun', '(e) => /^Soket X08/.test(e.getAttribute("aria-label"))');
    await p.eval('window.scrollTo(0, ' + Math.max(0, Math.round(s.y - 300)) + ')');
    s = await merkez(p, '.dy-dokun', '(e) => /^Soket X08/.test(e.getAttribute("aria-label"))');
    await dokun(p, s.x - s.w / 2 + 28, s.y - s.h / 2 + 24); await p.sleep(150);   // tür işareti (içteki pin kapsülü ayrı hedef; tarayıcı yakın dokunuşu iç hedefe çekebilir)
    ok('ara sokete dokununca onSoket(ad)', /^soket X08\.\d+$/.test(await log()), await log());
    await p.eval('__T.log.length = 0');
    await ciz('kablo', '1084');   // zincirde başka numaralı kablo çipleri (1082, 2029) var
    const kb = await merkez(p, '.dy-dokun', '(e) => /^Kablo /.test(e.getAttribute("aria-label"))');
    if (kb) { await p.eval('window.scrollTo(0, ' + Math.max(0, Math.round((await p.eval('scrollY')) + kb.y - 400)) + ')'); const kb2 = await merkez(p, '.dy-dokun', '(e) => /^Kablo /.test(e.getAttribute("aria-label"))'); await dokun(p, kb2.x, kb2.y); await p.sleep(150); ok('kablo çipine dokununca onKablo(anahtar)', /^kablo /.test(await log()), kb2.ad + ' → ' + await log()); } else atla('onKablo', 'bu izde başka numaralı kablo çipi yok');
    await ciz('kablo', '4046');
    await p.eval('__T.log.length = 0');
    const pn = await merkez(p, '.dy-dokun', '(e) => /^Pin /.test(e.getAttribute("aria-label"))');
    if (pn) { await p.eval('window.scrollTo(0, ' + Math.max(0, Math.round((await p.eval('scrollY')) + pn.y - 400)) + ')'); const pn2 = await merkez(p, '.dy-dokun', '(e) => /^Pin /.test(e.getAttribute("aria-label"))'); await dokun(p, pn2.x, pn2.y); await p.sleep(150); ok('pin kapsülüne dokununca onUc(ref)', /^uc \{/.test(await log()), await log()); }

    console.log('2) İki parmakla yakınlaştırma / kaydırma / çift dokunuşla sıfırlama');
    await ciz('kablo', '4046');
    await p.eval('window.scrollTo(0, 0)');
    const cy = 300;
    ok('başlangıç: ölçek 1, dönüşüm yok', (await olcek()) === 1 && (await donusum()) === null);
    await cimdik(p, VW / 2, cy, 80, 240);
    await p.sleep(80);
    const o1 = await olcek();
    ok('iki parmak açma → ölçek ≈ 3 (≤ 5)', o1 > 2.5 && o1 <= 5, o1.toFixed(2));
    ok('yakınlaşınca kapsayıcıya dy-yakin sınıfı', await p.eval('document.getElementById("k").classList.contains("dy-yakin") && document.querySelector(".dy-kap").classList.contains("dy-yakin")'));
    ok('onOlcek çağrıldı', (await p.eval('window.__olc.length')) > 0, await p.eval('JSON.stringify(window.__olc.slice(-1))'));
    ok('sayfa yatay kaydırmıyor (yakınlaşmışken)', await p.eval('document.documentElement.scrollWidth <= innerWidth'));
    const d1 = await donusum();
    await cimdik(p, VW / 2, cy, 240, 120);
    await p.sleep(80);
    const o2 = await olcek();
    ok('iki parmak kapama → ölçek azalır', o2 < o1 && o2 >= 1, o2.toFixed(2));
    await cimdik(p, VW / 2, cy, 80, 200);   // tekrar yakınlaştır
    const o3 = await olcek();
    const d2 = await donusum();
    await surukle(p, 200, 400, 120, 320, 8);
    await p.sleep(80);
    const d3 = await donusum();
    ok('yakınken tek parmak sürükleme çizimi kaydırır (dönüşüm değişir, ölçek aynı)', d3 !== d2 && Math.abs((await olcek()) - o3) < 1e-6, d2 + ' → ' + d3);
    const d3a = await donusum();
    await cimdik(p, VW / 2, cy, 160, 160, { kay: { x: -50, y: -30 } });   // iki parmak aynı yöne: kaydırma (mesafe sabit)
    await p.sleep(80);
    const d3b = await donusum();
    ok('iki parmakla kaydırma (mesafe sabit) dönüşümü kaydırır, ölçek değişmez', d3b !== d3a && Math.abs((await olcek()) - o3) < 0.02 * o3, d3a + ' → ' + d3b);
    // sürükleme bir cihaz hedefinin üstünde başlarsa tık yutulur
    await p.eval('__T.log.length = 0');
    await ciftDokun(p, VW / 2, 300);
    await p.sleep(150);
    ok('çift dokunuş yakınlaştırmayı sıfırlar', (await olcek()) === 1 && (await donusum()) === null, 'ölçek ' + (await olcek()));
    ok('sıfırlayınca dy-yakin kalkar', await p.eval('!document.getElementById("k").classList.contains("dy-yakin")'));
    ok('çift dokunuş çağrı yapmadı (boş alan)', (await log()) === '', await log());

    // yakınlaşmışken cihaza dokunma çalışmalı (tık yutma yalnız hareketten hemen sonra)
    await ciz('kablo', '4046');
    await p.eval('window.scrollTo(0, 0)');
    const hz = await merkez(p, '.dy-dokun', '(e) => /^Cihaz 41A01/.test(e.getAttribute("aria-label"))');
    await p.eval('window.scrollTo(0, ' + Math.max(0, Math.round(hz.y - 400)) + ')');
    const hz2 = await merkez(p, '.dy-dokun', '(e) => /^Cihaz 41A01/.test(e.getAttribute("aria-label"))');
    const sv = await p.eval('(() => { const r = document.querySelector("svg.dy").getBoundingClientRect(); return { l: r.left, t: r.top }; })()');
    const tx = hz2.x - hz2.w / 2 + 28, ty = hz2.y - hz2.h / 2 + 24;
    await p.eval(`__c.yakinlastir(2.5, ${tx - sv.l}, ${ty - sv.t})`);
    await p.sleep(700);
    ok('yakınlaştırıldı (API)', (await olcek()) > 2, (await olcek()).toFixed(2));
    await p.eval('__T.log.length = 0');
    await dokun(p, tx, ty); await p.sleep(150);
    ok('yakınlaşmışken cihaza dokununca onCihaz çalışır', (await log()) === 'cihaz 41A01', await log());
    await p.eval('__c.sifirla()');

    console.log('3) Yakınlaştırılmamışken tek parmak sayfayı kaydırır');
    const st = await ciz('kablo', '1084');
    await p.eval('window.scrollTo(0, 0)');
    const y0 = await p.eval('scrollY');
    await surukle(p, 200, 600, 200, 200, 12, 12);
    await p.sleep(400);
    const y1 = await p.eval('scrollY');
    if (y1 > y0 + 50) ok('tek parmak dikey kaydırma sayfayı kaydırdı', true, y0 + ' → ' + y1);
    else atla('tek parmak sayfa kaydırması', 'başsız emülasyonda dokunmayla kaydırma üretilmedi (scrollY ' + y0 + ' → ' + y1 + '); elle telefonda sına');
    ok('tek parmak kaydırması yakınlaştırma yapmadı', (await olcek()) === 1);

    console.log('4) Sahte tıkı yutma (hareketten sonra)');
    await ciz('kablo', '4046');
    await p.eval('window.scrollTo(0, 0)');
    await cimdik(p, VW / 2, 300, 80, 240);
    await p.sleep(30);
    const sh = await p.eval(`(() => { const g = [...document.querySelectorAll('.dy-dokun')].find((e) => /^Cihaz/.test(e.getAttribute('aria-label'))); g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return __T.log.join('|'); })()`);
    ok('yakınlaştırma hareketinden hemen sonra gelen tık yutuldu', sh === '', sh);
    await p.sleep(600);
    const sh2 = await p.eval(`(() => { const g = [...document.querySelectorAll('.dy-dokun')].find((e) => /^Cihaz/.test(e.getAttribute('aria-label'))); g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return __T.log.join('|'); })()`);
    ok('bir süre sonra tık yine çalışır', /^cihaz /.test(sh2), sh2);

    console.log('5) Klavye ve fare');
    await ciz('kablo', '4046');
    await p.eval('document.querySelector("svg.dy").focus()');
    await p.key('+', 'Equal'); await p.sleep(50);
    const k1 = await olcek();
    ok('"+" tuşu yakınlaştırır', k1 > 1.1, k1.toFixed(2));
    await p.key('0', 'Digit0'); await p.sleep(50);
    ok('"0" tuşu sıfırlar', (await olcek()) === 1 && (await donusum()) === null);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y: 300, deltaX: 0, deltaY: -120, modifiers: 2 });
    await p.sleep(80);
    ok('Ctrl+tekerlek yakınlaştırır', (await olcek()) > 1.1, (await olcek()).toFixed(2));
    await p.eval('__c.sifirla()');
    ok('API: sifirla() ölçeği 1 yapar', (await olcek()) === 1);
    await p.eval('__c.yakinlastir(2, 100, 100)');
    ok('API: yakinlastir(2, x, y)', Math.abs((await olcek()) - 2) < 1e-6);
    await p.eval('__c.sifirla()');

    console.log('6) yakinlastirma:false ve genişlik değişimi');
    await ciz('kablo', '4046', { yakinlastirma: false });
    await cimdik(p, VW / 2, 300, 80, 240);
    ok('yakinlastirma:false iken iki parmak ölçeği değiştirmez', (await olcek()) === 1 && (await donusum()) === null);
    await ciz('kablo', '4046');
    await cimdik(p, VW / 2, 300, 80, 240);
    const before = await olcek();
    await p.eval('document.getElementById("k").style.width = "300px"'); await p.sleep(250);
    ok('kapsayıcı daralınca yeniden çizilir ve ölçek 1\'e döner', before > 1 && (await olcek()) === 1, before.toFixed(2) + ' → ' + (await olcek()));
    ok('daralınca yatay kaydırma yok', await p.eval('document.documentElement.scrollWidth <= innerWidth'));

    console.log('7) Yapışkan soket bandı (cihaz 41A01, 412 px)');
    const c41 = await ciz('cihaz', '41A01');
    await p.eval('window.scrollTo(0, 0)');
    await p.sleep(60);
    const bant0 = await p.eval('(() => { const b = document.querySelector(".dy-bant-grup"); return b ? b.getAttribute("transform") : "yok"; })()');
    ok('kaydırılmamışken bant yerinde', bant0 === null, String(bant0));
    const bandY = await p.eval('(() => { const b = document.querySelector(".dy-bant-grup .dy-bant"); const r = b.getBoundingClientRect(); return r.top + scrollY; })()');
    await p.eval(`window.scrollTo(0, ${Math.round(bandY + 400)})`);
    await p.sleep(120);
    const bt = await p.eval('(() => { const b = document.querySelector(".dy-bant-grup"); const r = b.querySelector(".dy-bant").getBoundingClientRect(); return { tr: b.getAttribute("transform"), top: r.top }; })()');
    ok('aşağı kaydırınca bant ekranın üstünde kalır', bt.tr && bt.top >= -1 && bt.top <= 2, JSON.stringify(bt));
    await p.eval('window.scrollTo(0, 0)');
    await p.sleep(120);
    ok('başa dönünce bant yerine döner', (await p.eval('document.querySelector(".dy-bant-grup").getAttribute("transform")')) === null);

    console.log('8) Erişilebilirlik');
    await ciz('kablo', '1084');
    const er = await p.eval('(() => { const s = document.querySelector("svg.dy"); return { rol: s.getAttribute("role"), al: (s.getAttribute("aria-label") || "").length, hedef: [...s.querySelectorAll(".dy-dokun")].every((g) => g.getAttribute("role") === "link" && g.getAttribute("tabindex") === "0" && (g.getAttribute("aria-label") || "").length > 0) }; })()');
    ok('svg role="img" ve aria-label dolu', er.rol === 'img' && er.al > 20, 'aria-label ' + er.al + ' karakter');
    ok('dokunulabilir bölgeler role="link", tabindex, aria-label taşıyor', er.hedef);
    ok('sayfada hata yok', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
    console.log('9) Geniş ekran, yatay yerleşim (1280 px, kablo 4004)');
    await p.resize(1280, 800);
    const yw = 928;
    const yt = await p.eval(`(() => { __T.log.length = 0; window.scrollTo(0, 0); const kap = __T.kapsayici(${yw}, 'koyu'); window.__c = KB.diyagram.ciz(kap, __T.nesne('kablo', '4004'), __T.secenek()); return { y: __c.yerlesim, h: __c.yukseklik }; })()`);
    ok('kısa zincir yatay çizilir', yt.y === 'yatay', JSON.stringify(yt));
    const yc = await merkez(p, '.dy-dokun', '(e) => /^Cihaz/.test(e.getAttribute("aria-label"))');
    if (yc) { await dokun(p, yc.x - yc.w / 2 + 28, yc.y - yc.h / 2 + 24); await p.sleep(150); ok('yatay kartta cihaza dokununca onCihaz', /^cihaz /.test(await log()), yc.ad + ' → ' + await log()); }
    await cimdik(p, 640, 90, 100, 300);
    ok('yatay çizimde iki parmakla yakınlaştırma', (await olcek()) > 2, (await olcek()).toFixed(2));
    await ciftDokun(p, 640, 90); await p.sleep(100);
    ok('yatay çizimde çift dokunuş sıfırlar', (await olcek()) === 1);
    ok('1280 px: yatay kaydırma yok', await p.eval('document.documentElement.scrollWidth <= innerWidth'));
    ok('sayfada hata yok (yatay)', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  } finally { await b.close(); temizle(html); }
  const kalan = sonuc.filter((x) => !x.kosul);
  console.log('\n' + sonuc.length + ' sınama, ' + kalan.length + ' hata, ' + sonuc.filter((x) => x.atlandi).length + ' atlandı.' + (kalan.length ? ' BAŞARISIZ' : ' TEMİZ'));
  process.exit(kalan.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
