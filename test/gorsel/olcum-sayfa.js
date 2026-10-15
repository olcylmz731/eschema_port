// gorsel-elestirmen: sayfa ici otomatik olcum (cek.mjs bunu p.eval ile calistirir). Uygulama kodu degildir; yalniz okur.
// Dondurdugu nesne olcum.json'a yazilir.
(() => {
  const de = document.documentElement;
  const iw = innerWidth, ih = innerHeight;
  const sayfaY = (r) => Math.round(r.top + scrollY);
  const kisalt = (s, n = 40) => { s = (s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const gorunur = (e) => {
    if (!e || !e.getBoundingClientRect) return false;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const sinifOf = (e) => { const c = e.className; return (c && c.baseVal !== undefined ? c.baseVal : c) || ''; };
  const yol = (e) => { const p = []; for (let x = e, i = 0; x && x.nodeType === 1 && i < 3; x = x.parentElement, i++) p.push(x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (sinifOf(x) ? '.' + String(sinifOf(x)).trim().split(/\s+/)[0] : '')); return p.join('<'); };

  const o = {
    iw, ih, dpr: devicePixelRatio,
    kokYaziPx: parseFloat(getComputedStyle(de).fontSize),
    tema: de.getAttribute('data-tema'),
    scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
    scrollHeight: Math.max(de.scrollHeight, document.body.scrollHeight),
  };
  o.yatayTasma = o.scrollWidth > iw || o.bodyScrollWidth > iw;
  o.yatayTasmaPx = Math.max(o.scrollWidth, o.bodyScrollWidth) - iw;

  // ---- dokunma hedefleri
  const hedefSel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=checkbox], [role=switch], [onclick], [tabindex]:not([tabindex="-1"])';
  const hedefler = [];
  for (const e of document.querySelectorAll(hedefSel)) {
    if (!gorunur(e)) continue;
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'a' && !e.hasAttribute('tabindex')) continue;
    const r = e.getBoundingClientRect();
    hedefler.push({
      e, etiket: kisalt(e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('title') || e.id || '', 34),
      etiketTur: e.tagName.toLowerCase() + (e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''), sinif: String(sinifOf(e)).trim().split(/\s+/).slice(0, 3).join('.'),
      x: Math.round(r.left), y: sayfaY(r), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, pasif: !!e.disabled || e.getAttribute('aria-disabled') === 'true',
    });
  }
  o.hedefSayisi = hedefler.length;
  o.kucukHedefler = hedefler.filter((h) => h.w < 47.5 || h.h < 47.5).map(({ e, ...k }) => k).slice(0, 40);
  o.kucukHedefSayisi = hedefler.filter((h) => h.w < 47.5 || h.h < 47.5).length;
  o.enKucukHedef = hedefler.length ? hedefler.reduce((m, h) => (Math.min(h.w, h.h) < Math.min(m.w, m.h) ? h : m), hedefler[0]) : null;
  if (o.enKucukHedef) { const { e, ...k } = o.enKucukHedef; o.enKucukHedef = k; }
  // hedefler arasi bosluk < 8 px (ic ice olmayan, birbirine <8px yakin hedefler)
  const yakin = [];
  for (let i = 0; i < hedefler.length; i++) for (let j = i + 1; j < hedefler.length; j++) {
    const a = hedefler[i], b = hedefler[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ra = a.e.getBoundingClientRect(), rb = b.e.getBoundingClientRect();
    const dx = Math.max(rb.left - ra.right, ra.left - rb.right, 0), dy = Math.max(rb.top - ra.bottom, ra.top - rb.bottom, 0);
    const kesisim = dx === 0 && dy === 0;
    const bosluk = Math.hypot(dx, dy);
    if (kesisim || bosluk < 7.5) { if (yakin.length < 30) yakin.push({ a: a.etiket, b: b.etiket, bosluk: kesisim ? 'KESISIYOR' : Math.round(bosluk * 10) / 10, y: a.y }); }
  }
  o.yakinHedefler = yakin;

  // ---- metin: yazi boyutu, kontrast, ince-kucuk, cakisma
  const rgbAyir = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const karis = (on, arka) => ({ r: on.r * on.a + arka.r * (1 - on.a), g: on.g * on.a + arka.g * (1 - on.a), b: on.b * on.a + arka.b * (1 - on.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const oran = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const ortu = (c) => ({ r: c.r * 0.7 + 255 * 0.3, g: c.g * 0.7 + 255 * 0.3, b: c.b * 0.7 + 255 * 0.3, a: 1 });
  const arkaRenk = (el) => {
    // ata zincirinde ilk opak zemin; desen/gradyan gorulurse 'desen' isaretle
    const katmanlar = []; let desen = false;
    for (let x = el; x && x.nodeType === 1; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/^url\(/.test(cs.backgroundImage)) desen = true;
      let fillZemin = null;
      const bg = rgbAyir(cs.backgroundColor);
      if (bg && bg.a > 0) katmanlar.push(bg);
      if (bg && bg.a >= 0.99) break;
    }
    let zemin = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = katmanlar.length - 1; i >= 0; i--) zemin = karis(katmanlar[i], zemin);
    return { zemin, desen };
  };

  // ekran okuyucuya ozel (gorunmez) metinler: konum absolute + 1px + kirpilmis
  const gizliMi = (el) => {
    for (let x = el; x && x !== document.body; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (x.tagName === 'DETAILS' && !x.open && !el.closest('summary')) return true;   // kapali <details> govdesi
      if (!(x instanceof SVGElement) && cs.position === 'absolute' && parseFloat(cs.width) <= 1.5 && parseFloat(cs.height) <= 1.5 && cs.overflow !== 'visible') return true;
      if (/rect\(0(px)?,? ?0(px)?,? ?0(px)?,? ?0(px)?\)/.test(cs.clip) || cs.clipPath === 'inset(50%)') return true;
    }
    return false;
  };
  // SVG metninin gercek zemini: ayni SVG'de metinden ONCE boyanmis, merkezini kapsayan dolgulu sekil
  const svgSekilCache = new Map();
  const svgZemin = (el) => {
    const svg = el.ownerSVGElement; if (!svg) return null;
    if (!svgSekilCache.has(svg)) {
      svgSekilCache.set(svg, [...svg.querySelectorAll('rect,path,circle,ellipse,polygon')].filter((e) => !e.closest('symbol,defs,mask,clipPath')).map((e) => { const cs = getComputedStyle(e); const f = rgbAyir(cs.fill); const r = e.getBoundingClientRect(); return { e, f, op: parseFloat(cs.fillOpacity) * parseFloat(cs.opacity), r }; }).filter((x) => x.f && x.f.a * x.op > 0.05 && x.r.width > 3 && x.r.height > 3));
    }
    const tr = el.getBoundingClientRect(); const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
    const aday = svgSekilCache.get(svg).filter((x) => cx >= x.r.left && cx <= x.r.right && cy >= x.r.top && cy <= x.r.bottom && (x.e.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (!aday.length) return null;
    // sondan basa: ilk opak olana kadar karistir
    const kat = []; for (let i = aday.length - 1; i >= 0; i--) { const a = aday[i]; kat.push({ ...a.f, a: a.f.a * a.op }); if (a.f.a * a.op >= 0.99) break; }
    return kat.reverse();
  };

  const metinler = []; // {n, el, metin, fs, agirlik, mono, renk, zemin, desen}
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,symbol,defs,title')) continue;
    if (!gorunur(el)) continue;
    if (gizliMi(el)) continue;
    const cs = getComputedStyle(el);
    let fs = parseFloat(cs.fontSize);
    const svgMi = el instanceof SVGElement;
    if (svgMi) { const m = el.getScreenCTM && el.getScreenCTM(); if (m) fs = fs * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); }
    let renk = rgbAyir(svgMi ? (cs.fill && cs.fill.startsWith('rgb') ? cs.fill : cs.color) : cs.color) || { r: 0, g: 0, b: 0, a: 1 };
    const { zemin, desen } = arkaRenk(el);
    if (svgMi) {
      const kat = svgZemin(el);
      if (kat) { let z = { r: zemin.r, g: zemin.g, b: zemin.b, a: 1 }; for (const k of kat) z = karis(k, z); zemin.r = z.r; zemin.g = z.g; zemin.b = z.b; }
    }
    const yaz = karis(renk, zemin);
    metinler.push({ n, el, metin: t, fs, agirlik: parseInt(cs.fontWeight, 10) || 400, mono: /mono|courier|consol/i.test(cs.fontFamily), svg: svgMi, yaz, zemin, desen, yol: yol(el) });
  }
  o.metinSayisi = metinler.length;
  const grupla = (liste, anahtarFn, azami = 25) => {
    const g = new Map();
    for (const m of liste) { const k = anahtarFn(m); if (!g.has(k)) g.set(k, { anahtar: k, adet: 0, ornek: kisalt(m.metin, 40), yol: m.yol }); g.get(k).adet++; }
    return [...g.values()].slice(0, azami);
  };
  o.enKucukYaziPx = metinler.length ? Math.round(Math.min(...metinler.map((m) => m.fs)) * 10) / 10 : null;
  o.kucukYazi14 = grupla(metinler.filter((m) => m.fs < 13.95), (m) => Math.round(m.fs * 10) / 10 + 'px' + (m.svg ? ' svg' : ''));
  o.monoKucuk18 = grupla(metinler.filter((m) => m.mono && m.fs < 17.95), (m) => Math.round(m.fs * 10) / 10 + 'px w' + m.agirlik);
  o.inceKucuk = grupla(metinler.filter((m) => m.agirlik <= 400 && m.fs < 16), (m) => Math.round(m.fs * 10) / 10 + 'px w' + m.agirlik);
  // kontrast
  const kontrastlar = metinler.map((m) => ({ m, k: oran(m.yaz, m.zemin), kg: oran(ortu(m.yaz), ortu(m.zemin)) }));
  o.minKontrast = kontrastlar.length ? Math.round(Math.min(...kontrastlar.map((x) => x.k)) * 100) / 100 : null;
  o.minKontrastGunes = kontrastlar.length ? Math.round(Math.min(...kontrastlar.map((x) => x.kg)) * 100) / 100 : null;
  const dusukGrup = (esik, alan) => {
    const g = new Map();
    for (const x of kontrastlar) {
      if (x[alan] >= esik) continue;
      const k = Math.round(x[alan] * 10) / 10 + ' ' + (x.m.desen ? 'desen ' : '') + x.m.yol.split('<')[0];
      if (!g.has(k)) g.set(k, { oran: Math.round(x[alan] * 100) / 100, adet: 0, ornek: kisalt(x.m.metin, 40), yol: x.m.yol, desen: x.m.desen, fs: Math.round(x.m.fs * 10) / 10 });
      g.get(k).adet++;
    }
    return [...g.values()].sort((a, b) => a.oran - b.oran).slice(0, 15);
  };
  o.kontrast45 = dusukGrup(4.5, 'k');       // 4,5 altindaki (DESIGN: hicbir metin)
  o.kontrast7 = kontrastlar.filter((x) => x.k < 7).length; // govde 7 alti metin adedi
  o.kontrast7ornek = dusukGrup(7, 'k').slice(0, 8);
  o.gunes45 = dusukGrup(4.5, 'kg'); // %30 beyaz ortu altinda 4,5 alti

  // cakisma: farkli metin dugumlerinin satir kutulari
  const kutular = [];
  for (const m of metinler) {
    const rg = document.createRange(); rg.selectNodeContents(m.n);
    for (const r of rg.getClientRects()) { if (r.width < 2 || r.height < 2) continue; kutular.push({ m, l: r.left, t: r.top, r: r.right, b: r.bottom }); }
  }
  const cak = [];
  for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
    const a = kutular[i], b = kutular[j];
    if (a.m === b.m) continue;
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (w <= 1.5 || h <= 1.5) continue;
    const alan = w * h, kucuk = Math.min((a.r - a.l) * (a.b - a.t), (b.r - b.l) * (b.b - b.t));
    if (alan / kucuk < 0.2) continue;
    if (cak.length < 30) cak.push({ a: kisalt(a.m.metin, 24), b: kisalt(b.m.metin, 24), oran: Math.round((alan / kucuk) * 100) / 100, w: Math.round(w), h: Math.round(h), y: Math.round(a.t + scrollY), yolA: a.m.yol, yolB: b.m.yol });
  }
  o.cakisma = cak;

  // sayfa kirpilmasi: metni kutusundan tasan (overflow) ya da '…' ile kesilen ogeler
  const kesik = [];
  for (const m of metinler) {
    const e = m.el; if (e instanceof SVGElement) continue;
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && /hidden|clip/.test(getComputedStyle(e).overflowX)) kesik.push({ metin: kisalt(m.metin, 30), sw: e.scrollWidth, cw: e.clientWidth, yol: m.yol });
  }
  o.kirpilan = kesik.slice(0, 15);

  // ---- yapi: basliklar, sabit ogeler, 'basa don', ozet
  o.basliklar = [...document.querySelectorAll('h1,h2,h3,h4,[role=heading]')].filter(gorunur).map((h) => ({ d: h.tagName.toLowerCase(), t: kisalt(h.innerText, 50), y: sayfaY(h.getBoundingClientRect()), fs: Math.round(parseFloat(getComputedStyle(h).fontSize)) })).slice(0, 40);
  const sabit = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && gorunur(e)) { const r = e.getBoundingClientRect(); if (sabit.length < 12) sabit.push({ yol: yol(e), konum: cs.position, top: cs.top, bottom: cs.bottom, y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }); }
  }
  o.sabitOgeler = sabit;
  o.ustAlanYuksekligi = (() => { const h = document.getElementById('kb-ust'); return h ? Math.round(h.getBoundingClientRect().height) : null; })();
  o.bastaDon = [...document.querySelectorAll('a,button,[role=button]')].filter(gorunur).filter((e) => /başa dön|yukarı|en üst|başa git/i.test((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || ''))).map((e) => kisalt(e.innerText || e.getAttribute('aria-label'), 30));
  o.sonucKartlari = [...document.querySelectorAll('#kb-icerik section, #kb-icerik article, #kb-icerik .kart, #kb-icerik [class*=kart]')].filter(gorunur).length;
  o.svgSayisi = [...document.querySelectorAll('#kb-icerik svg')].filter(gorunur).filter((s) => s.getBoundingClientRect().width > 60).length;
  o.imgRole = [...document.querySelectorAll('#kb-icerik [role=img]')].filter(gorunur).length;

  // ---- dil taramasi (gelistirici/teknik dil)
  const govde = document.body.innerText || '';
  o.metinUzunlugu = govde.length;
  const jargon = [
    ['emin:false', /emin\s*[:=]\s*(true|false)/i], ['VERI-MODELI', /VER[Iİ][-_ ]MODEL[Iİ]/i], ['Beyin Listesi', /Beyin\s*Listesi/i], ['BEYIN LISTESI FARKLI', /B[Eİ]Y[Iİ]N\s*L[Iİ]STES[Iİ]\s*FARKLI/i],
    ['Okuma notu', /Okuma\s*not/i], ['undefined/null/NaN', /\b(undefined|NaN)\b|\[object|\bnull\b/], ['json/pdf dosya adi', /\.json|\.pdf\b|\.html\b/i], ['sema kimligi (kapi-1)', /\b(kapi|fps|alternator)-[a-z0-9-]+\b/i],
    ['debug/TODO', /\b(debug|TODO|FIXME|lorem)\b/i], ['dugum/kenar/iz (dahili)', /\b(düğüm|dugum|kenar|parça|bilesen|bileşen|iz)\b/i], ['asama/kayit', /\bkayıt\b|\bkayit\b/i],
  ];
  o.jargon = jargon.map(([ad, re]) => { const m = govde.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')); return m ? { ad, adet: m.length, ornek: [...new Set(m)].slice(0, 5) } : null; }).filter(Boolean);
  o.govdeMetni = govde;
  return o;
})()
