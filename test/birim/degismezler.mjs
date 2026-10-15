// Iz (KB.izle çıktısı) için yapısal değişmezler: API.md §4'ten yazıldı, çekirdek koduna bakılmadan.
// izKontrol(iz) → ihlal listesi (boş = tamam). Testler `assert.deepEqual(izKontrol(iz), [])` ile kullanır.
// Burada hiçbir beklenen değer uygulamadan türetilmez: yalnız sözleşmedeki tutarlılık kuralları.

/** Çıktı düz JSON mu? (undefined, işlev, Map/Set/Date, NaN/Infinity ve döngüsel başvuru yok) */
export function duzJson(deger, yol = '$', gorulen = new Set(), ihlal = []) {
  if (deger === null) return ihlal;
  const t = typeof deger;
  if (t === 'string' || t === 'boolean') return ihlal;
  if (t === 'number') {
    if (!Number.isFinite(deger)) ihlal.push(`${yol}: sayı sonlu değil`);
    return ihlal;
  }
  if (t === 'undefined') { ihlal.push(`${yol}: undefined`); return ihlal; }
  if (t === 'function' || t === 'symbol' || t === 'bigint') { ihlal.push(`${yol}: ${t}`); return ihlal; }
  if (gorulen.has(deger)) { ihlal.push(`${yol}: döngüsel başvuru`); return ihlal; }
  gorulen.add(deger);
  if (Array.isArray(deger)) {
    deger.forEach((x, i) => duzJson(x, `${yol}[${i}]`, gorulen, ihlal));
  } else {
    const proto = Object.getPrototypeOf(deger);
    if (proto !== Object.prototype && proto !== null) { ihlal.push(`${yol}: düz nesne değil (${proto && proto.constructor && proto.constructor.name})`); }
    for (const k of Object.keys(deger)) duzJson(deger[k], `${yol}.${k}`, gorulen, ihlal);
  }
  gorulen.delete(deger);
  return ihlal;
}

function agacKenarlari(agac, cikti = []) {
  for (const c of agac.cocuklar) { cikti.push(c.kenar); agacKenarlari(c, cikti); }
  return cikti;
}
function agacDugumleri(agac, cikti = []) {
  cikti.push(agac.dugum);
  for (const c of agac.cocuklar) agacDugumleri(c, cikti);
  return cikti;
}
const esit = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const kume = (d) => d.slice().sort();

export function izKontrol(iz) {
  const ih = [];
  const x = (kosul, mesaj) => { if (!kosul) ih.push(mesaj); };
  if (iz === null || iz === undefined) return ['iz null'];

  duzJson(iz).forEach((m) => ih.push('düz-json: ' + m));

  // kimlikler benzersiz
  const dId = iz.dugumler.map((d) => d.id);
  const eId = iz.kenarlar.map((e) => e.id);
  x(new Set(dId).size === dId.length, 'düğüm kimlikleri benzersiz değil');
  x(new Set(eId).size === eId.length, 'kenar kimlikleri benzersiz değil');
  const dugum = new Map(iz.dugumler.map((d) => [d.id, d]));
  const kenar = new Map(iz.kenarlar.map((e) => [e.id, e]));

  // kenar uçları
  for (const e of iz.kenarlar) {
    x(dugum.has(e.a) && dugum.has(e.b), `kenar ${e.id}: uç düğümü yok (${e.a}, ${e.b})`);
    x((e.a === e.b) === !!e.kendineDonen, `kenar ${e.id}: kendineDonen bayrağı a===b ile uyumsuz`);
    if (e.sanal) {
      x(e.etiket === null && e.no === null && e.renk === null && e.kesit === null && e.varyant === false, `sanal kenar ${e.id}: etiket/no/renk/kesit null, varyant false olmalı`);
      x(e.bilesen && e.bilesen.kod, `sanal kenar ${e.id}: bilesen yok`);
      x(!e.ic, `sanal kenar ${e.id} aynı anda ic`);
    } else {
      x(e.bilesen === null, `gerçek kenar ${e.id}: bilesen null olmalı`);
    }
    if (e.ic) {
      x(e.renk === null && e.kesit === null, `ic kenar ${e.id}: renk/kesit null olmalı`);
      x(!e.sanal, `ic kenar ${e.id} aynı anda sanal`);
    }
    x(Array.isArray(e.kaynaklar) && e.kaynaklar.length >= 1 && e.kaynak === e.kaynaklar[0], `kenar ${e.id}: kaynak = kaynaklar[0] değil`);
    x(Array.isArray(e.parcalar), `kenar ${e.id}: parcalar dizi değil`);
  }

  // düğüm - kenar tutarlılığı
  for (const d of iz.dugumler) {
    const bagli = iz.kenarlar.filter((e) => !e.kendineDonen && (e.a === d.id || e.b === d.id)).map((e) => e.id);
    // Sözleşme (API.md §4.4): kenarlar listesi kendine dönen kenarları içermez. Bu katı kural ayrı bir testte sınanır
    // (zincir.test.mjs); burada yalnız "gerçek bağlantıların hepsi var, fazlası yalnız kendine dönen kenarlar" denetlenir.
    const kdIds = iz.kenarlar.filter((e) => e.kendineDonen && e.a === d.id).map((e) => e.id);
    x(bagli.every((id) => d.kenarlar.includes(id)) && d.kenarlar.every((id) => bagli.includes(id) || kdIds.includes(id)), `düğüm ${d.id}: kenarlar listesi [${d.kenarlar}] gerçek bağlantılarla [${bagli}] uyuşmuyor`);
    x(d.derece === bagli.length, `düğüm ${d.id}: derece ${d.derece} ≠ ${bagli.length}`);
    x(d.yaprak === (d.derece === 1), `düğüm ${d.id}: yaprak bayrağı derece ${d.derece} ile uyumsuz`);
    x(d.dal === (d.derece >= 3), `düğüm ${d.id}: dal bayrağı derece ${d.derece} ile uyumsuz`);
    const kd = iz.kenarlar.filter((e) => e.kendineDonen && e.a === d.id).map((e) => e.id);
    x(esit(kume(d.kendineDonen), kume(kd)), `düğüm ${d.id}: kendineDonen listesi uyuşmuyor`);
    x(['cihaz', 'soket', 'dugum', 'devam'].includes(d.tur), `düğüm ${d.id}: bilinmeyen tür ${d.tur}`);
    x(Array.isArray(d.kaynaklar), `düğüm ${d.id}: kaynaklar dizi değil`);
  }

  // bileşenler: düğüm ve kenarları bölerler
  const bD = [].concat(...iz.bilesenler.map((b) => b.dugumler));
  const bE = [].concat(...iz.bilesenler.map((b) => b.kenarlar.concat(b.kendineDonenKenarlar.filter((id) => !b.kenarlar.includes(id)))));
  x(esit(kume(bD), kume(dId)), 'bileşenlerin düğümleri iz.dugumler ile aynı küme değil / çakışıyor');
  x(esit(kume(bE), kume(eId)), 'bileşenlerin kenarları iz.kenarlar ile aynı küme değil / çakışıyor');
  x(iz.bilesenler.length >= 1, 'bileşen yok');

  for (const b of iz.bilesenler) {
    const ad = `bileşen ${b.id}`;
    x(b.dugumler.includes(b.baslangic), `${ad}: baslangic bileşende değil`);
    if (b.odak !== null) x(b.dugumler.includes(b.odak), `${ad}: odak bileşende değil`);
    x(b.agac && b.agac.dugum === b.baslangic, `${ad}: ağaç kökü baslangic değil`);
    if (b.agac) {
      const an = agacDugumleri(b.agac);
      x(esit(kume(an), kume(b.dugumler)), `${ad}: ağaç düğümleri bileşen düğümleriyle aynı değil`);
      const ak = agacKenarlari(b.agac);
      x(new Set(ak).size === ak.length, `${ad}: ağaçta tekrarlı kenar`);
      x(ak.length === b.dugumler.length - 1, `${ad}: ağaç kenar sayısı ${ak.length} ≠ düğüm-1 (${b.dugumler.length - 1})`);
      const gk = b.geriKenarlar;
      const kd = b.kendineDonenKenarlar;
      x(gk.every((id) => !ak.includes(id)), `${ad}: geri kenar ağaçta da var`);
      x(kd.every((id) => !ak.includes(id) && !gk.includes(id)), `${ad}: kendine dönen kenar ağaçta/geri kenarlarda da var`);
      x(esit(kume(ak.concat(gk)), kume(b.kenarlar.filter((id) => !kd.includes(id)))), `${ad}: ağaç + geri kenarları bileşen kenarlarına (kendine dönenler hariç) eşit değil`);
      // ağaç kenarının bir ucu üst, öbür ucu alt düğüm
      (function gez(a) {
        for (const c of a.cocuklar) {
          const e = kenar.get(c.kenar);
          x(e && ((e.a === a.dugum && e.b === c.dugum) || (e.b === a.dugum && e.a === c.dugum)), `${ad}: ağaç kenarı ${c.kenar} ${a.dugum}-${c.dugum} arasında değil`);
          gez(c);
        }
      })(b.agac);
    }
    for (const id of b.geriKenarlar) x(kenar.get(id) && kenar.get(id).geri === true, `${ad}: geri kenar ${id} geri:true taşımıyor`);
    for (const id of b.kendineDonenKenarlar) x(kenar.get(id) && kenar.get(id).kendineDonen === true, `${ad}: ${id} kendineDonen değil`);
    const dalVar = b.dugumler.some((id) => dugum.get(id).derece >= 3);
    x(b.dal === dalVar, `${ad}: dal bayrağı (${b.dal}) düğüm derecesiyle (${dalVar}) uyumsuz`);
    x(b.dongu === (b.geriKenarlar.length > 0), `${ad}: dongu bayrağı geri kenarlarla uyumsuz`);
    if (b.zincir) {
      x(!b.dal && !b.dongu, `${ad}: zincir var ama dal/dongu işaretli`);
      x(esit(kume(b.zincir), kume(b.dugumler)), `${ad}: zincir bütün düğümleri içermiyor`);
      x(b.zincirKenarlar.length === b.zincir.length - 1, `${ad}: zincirKenarlar uzunluğu zincir-1 değil`);
      for (let i = 0; i < b.zincirKenarlar.length; i++) {
        const e = kenar.get(b.zincirKenarlar[i]);
        const p = b.zincir[i], q = b.zincir[i + 1];
        x(e && ((e.a === p && e.b === q) || (e.a === q && e.b === p)), `${ad}: zincirKenarlar[${i}] ${p}-${q} arasında değil`);
        x(e && e.a === p && e.b === q, `${ad}: zincir kenarı ${b.zincirKenarlar[i]} için a, b'den önce gelmeli (a=${e && e.a}, b=${e && e.b})`);
      }
      if (b.zincir.length >= 2) {
        x(dugum.get(b.zincir[0]).derece === 1 && dugum.get(b.zincir[b.zincir.length - 1]).derece === 1, `${ad}: zincir uçları yaprak değil`);
      }
    } else {
      x(b.dal || b.dongu, `${ad}: zincir yok ama ne dal ne çevrim`);
    }
    if (b.yildiz) {
      x(b.dal && !b.dongu, `${ad}: yildiz var ama dal yok ya da çevrim var`);
      x(b.dugumler.filter((id) => dugum.get(id).derece >= 3).length === 1, `${ad}: yildiz var ama dallanan düğüm tek değil`);
      x(dugum.get(b.yildiz.merkez) && dugum.get(b.yildiz.merkez).derece >= 3, `${ad}: yildiz merkezi dal değil`);
      x(b.merkez === b.yildiz.merkez, `${ad}: merkez ≠ yildiz.merkez`);
      x(b.yildiz.kollar.length === dugum.get(b.yildiz.merkez).derece, `${ad}: kol sayısı merkez derecesine eşit değil`);
      const kolDugumleri = [].concat(...b.yildiz.kollar.map((k) => k.dugumler));
      x(esit(kume(kolDugumleri.concat([b.yildiz.merkez])), kume(b.dugumler)), `${ad}: kollar + merkez bütün düğümleri tam bir kez kapsamıyor`);
      for (const k of b.yildiz.kollar) {
        x(k.kenarlar.length === k.dugumler.length, `${ad}: kol kenar/düğüm sayıları eşit değil`);
        const e0 = kenar.get(k.kenarlar[0]);
        x(e0 && (e0.a === b.yildiz.merkez || e0.b === b.yildiz.merkez), `${ad}: kolun ilk kenarı merkeze değmiyor`);
      }
    } else if (b.dal && !b.dongu && b.dugumler.filter((id) => dugum.get(id).derece >= 3).length === 1) {
      x(false, `${ad}: tek düğümde dallanma var, çevrim yok, ama yildiz null`);
    }
    if (b.dal) x(b.merkez !== null && dugum.has(b.merkez), `${ad}: dal var ama merkez yok`);
  }

  x(iz.dal === iz.bilesenler.some((b) => b.dal), 'iz.dal bileşenlerle uyumsuz');
  x(iz.dongu === iz.bilesenler.some((b) => b.dongu), 'iz.dongu bileşenlerle uyumsuz');

  // sayılar
  const s = iz.sayilar;
  x(s.kablo === iz.kenarlar.filter((e) => !e.sanal && !e.ic).length, `sayilar.kablo ${s.kablo} ≠ gerçek kenar sayısı`);
  x(s.sanal === iz.kenarlar.filter((e) => e.sanal).length, 'sayilar.sanal uyumsuz');
  x(s.ic === iz.kenarlar.filter((e) => e.ic).length, 'sayilar.ic uyumsuz');
  x(s.kendineDonen === iz.kenarlar.filter((e) => e.kendineDonen).length, 'sayilar.kendineDonen uyumsuz');

  // geçiş uçları: her gecisUcu düğümü tam bir sanal kenara bağlı
  for (const d of iz.dugumler) {
    const sanallar = iz.kenarlar.filter((e) => e.sanal && (e.a === d.id || e.b === d.id));
    if (d.gecisUcu) x(sanallar.length === 1, `gecisUcu düğümü ${d.id} tam bir sanal kenara bağlı değil (${sanallar.length})`);
    else x(sanallar.length === 0, `gecisUcu olmayan düğüm ${d.id} sanal kenara bağlı`);
  }

  // kaynaklar, şemalar
  x(Array.isArray(iz.kaynaklar), 'iz.kaynaklar dizi değil');
  const semaKumesi = new Set([].concat(...iz.kenarlar.map((e) => e.kaynaklar.map((k) => k.sema))));
  for (const sm of semaKumesi) x(iz.semalar.includes(sm), `kenar kaynağındaki şema ${sm} iz.semalar'da yok`);
  x(typeof iz.dogrulandi === 'boolean' && typeof iz.supheli === 'boolean' && typeof iz.celiski === 'boolean', 'bayraklar boolean değil');
  if (iz.sinirAsildi) x(iz.dugumler.some((d) => d.kesik), 'sinirAsildi true ama kesik düğüm yok');
  else x(!iz.dugumler.some((d) => d.kesik), 'sinirAsildi false ama kesik düğüm var');
  return ih;
}
