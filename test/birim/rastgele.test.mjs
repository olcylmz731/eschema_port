// Rastgele (sabit tohumlu) veri kümeleriyle iki sınama:
//  1) Referans karşılaştırması: sade kurallı rastgele şemalarda iz (düğüm/kenar/bileşen) bağımsız küçük bir referans
//     gerçeklemeyle (aşağıda, API.md §11'den) karşılaştırılır.
//  2) Zengin rastgele veri (devam, geçiş bileşeni, ic, etiketsiz, '?', çok şema …): çökme yok, her iz yapısal değişmezleri
//     sağlıyor, arama/izleme/metin/sorgu tutarlı. Hata mesajı tohumu ve veri kümesini verir (yeniden üretmek için).
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, D, V, K, cz, sema, yukle, kod, tohum } from './yardimci.mjs';
import { izKontrol, duzJson } from './degismezler.mjs';

const norm = (x) => KB.normalize.norm(x); // yalnız anahtar biçimi için (referans sınıf anahtarları)

// =============================================================================================================
//  1) referans karşılaştırması
// =============================================================================================================
function sadeUret(seed) {
  const r = tohum(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const semaSayisi = 1 + Math.floor(r() * 2);
  const numaralar = ['1001', '1002', '1003', '1004'];
  const cihazlar = ['A1', 'A2', 'B1', 'B2', 'B3'].map((k, i) => (i < 2 ? '81A0' : '81B0') + (k[1]));
  const soketler = ['15', '3', null];
  const pinler = ['1', '2', '3', '4'];
  const araSoketler = ['X1', 'X2'];
  const ekNoktalari = ['Z1', '~d1', '~d2'];
  const uc = () => {
    const t = r();
    if (t < 0.55) return { tur: 'cihaz', cihaz: pick(cihazlar), soket: pick(soketler), pin: pick(pinler) };
    if (t < 0.85) return { tur: 'soket', soket: pick(araSoketler), pin: pick(['1', '2']) };
    return { tur: 'dugum', kod: pick(ekNoktalari) };
  };
  const anahtar = (sm, u) => (u.tur === 'cihaz' ? `C|${u.cihaz}|${u.soket}|${u.pin}` : u.tur === 'soket' ? `S|${u.soket}|${u.pin}` : `D|${u.kod[0] === '~' ? sm + '|' : ''}${u.kod}`);
  const semalar = [];
  for (let s = 0; s < semaSayisi; s++) {
    const id = 'r' + (s + 1);
    const n = 3 + Math.floor(r() * 9);
    const kablolar = [];
    for (let i = 0; i < n; i++) {
      let a = uc(), b = uc(), say = 0;
      while (anahtar(id, a) === anahtar(id, b) && say++ < 20) b = uc();
      if (anahtar(id, a) === anahtar(id, b)) continue; // kendine dönen üretme
      kablolar.push({ id: 'p' + i, no: pick(numaralar), uclar: [a, b] });
    }
    semalar.push({ id, kablolar });
  }
  return { semalar };
}

function sadeKur(veri) {
  return yukle(veri.semalar.map((s) => sema(s.id, {
    cihazlar: [...new Set(s.kablolar.flatMap((p) => p.uclar.filter((u) => u.tur === 'cihaz').map((u) => u.cihaz)))].map((k) => cz(k, k[2] === 'A' ? 'beyin' : 'sensor', 'Test ' + k)),
    kablolar: s.kablolar.map((p, i) => K(p.id, p.no, p.uclar.map((u) => (u.tur === 'cihaz' ? C(u.cihaz, u.soket, u.pin) : u.tur === 'soket' ? S(u.soket, u.pin) : D(u.kod))), [1, String(i + 1), 'A'])),
  })));
}

/** referans: API.md §11'e göre (cihaz pininde aynı numara, ara soket ve ek noktasında numara aranmaz) */
function referansIz(veri, no) {
  const parcalar = [];
  for (const s of veri.semalar) for (const p of s.kablolar) parcalar.push({ sema: s.id, ...p });
  const tepe = (sm, u) => (u.tur === 'cihaz' ? `C|${u.cihaz}|${u.soket}|${u.pin}` : u.tur === 'soket' ? `S|${u.soket}|${u.pin}` : `D|${u.kod[0] === '~' ? sm + '|' : ''}${u.kod}`);
  const dahil = new Set(parcalar.filter((p) => p.no === no));
  const kuyruk = [...dahil];
  while (kuyruk.length) {
    const p = kuyruk.shift();
    for (const u of p.uclar) {
      const t = tepe(p.sema, u);
      for (const q of parcalar) {
        if (dahil.has(q)) continue;
        for (const v of q.uclar) {
          if (tepe(q.sema, v) !== t) continue;
          if (u.tur === 'cihaz' && q.no !== p.no) continue;
          dahil.add(q); kuyruk.push(q);
          break;
        }
      }
    }
  }
  if (!dahil.size) return null;
  // Düğüm = uç anahtarı. Ize hangi parçaların gireceği numara kuralıyla belirlenir (yukarıdaki dolaşma); ize girmiş parçalar
  // aynı uçta buluşuyorsa tek düğümdür (cihaz pininde farklı numaralar birlikte ize girmişse düğüm `celiski` taşır, API.md §4.4/§4.7).
  const sinif = (p, u) => tepe(p.sema, u);
  const gorunum = (u) => (u.tur === 'cihaz' ? `${u.cihaz} ${u.soket == null ? '-' : u.soket}/${u.pin}` : u.tur === 'soket' ? `${u.soket}/${u.pin}` : u.kod);
  const dugumler = new Map(); // sınıf → görünüm
  const kenarlar = new Map(); // "sınıfA|sınıfB|no" → [görünümA, görünümB]
  for (const p of dahil) {
    const [a, b] = p.uclar;
    const ca = sinif(p, a), cb = sinif(p, b);
    dugumler.set(ca, gorunum(a)); dugumler.set(cb, gorunum(b));
    const anahtar = [ca, cb].sort().join('||') + '||' + p.no;
    kenarlar.set(anahtar, [gorunum(a), gorunum(b)].sort().join(' | ') + ' | ' + p.no);
  }
  // bileşen sayısı
  const ata = new Map([...dugumler.keys()].map((k) => [k, k]));
  const bul = (x) => { while (ata.get(x) !== x) { ata.set(x, ata.get(ata.get(x))); x = ata.get(x); } return x; };
  for (const k of kenarlar.keys()) { const [x, y] = k.split('||'); ata.set(bul(x), bul(y)); }
  const bilesen = new Set([...dugumler.keys()].map(bul)).size;
  return { dugumler: [...dugumler.values()].sort(), kenarlar: [...kenarlar.values()].sort(), bilesen };
}

function izOzet(iz) {
  const ad = new Map(iz.dugumler.map((d) => [d.id, kod(d)]));
  return {
    dugumler: iz.dugumler.map(kod).sort(),
    kenarlar: iz.kenarlar.map((e) => [ad.get(e.a), ad.get(e.b)].sort().join(' | ') + ' | ' + e.etiket).sort(),
    bilesen: iz.bilesenler.length,
  };
}

test('referans karşılaştırması: 400 rastgele sade veri kümesinde iz = bağımsız gerçekleme (düğümler, kenarlar, bileşen sayısı)', () => {
  let karsilastirilan = 0, dalli = 0, cevrimli = 0, cokBilesenli = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const veri = sadeUret(seed);
    const db = sadeKur(veri);
    const numaralar = new Set(veri.semalar.flatMap((s) => s.kablolar.map((p) => p.no)));
    for (const no of numaralar) {
      const beklenen = referansIz(veri, no);
      const iz = KB.izle.kablo(db, no);
      const ayrinti = `\n  tohum ${seed}, kablo ${no}\n  veri: ${JSON.stringify(veri.semalar.map((s) => ({ id: s.id, kablolar: s.kablolar.map((p) => [p.no, p.uclar.map((u) => (u.tur === 'cihaz' ? `${u.cihaz} ${u.soket}/${u.pin}` : u.tur === 'soket' ? `${u.soket}/${u.pin}` : u.kod)).join(' -- ')]) })))}`;
      assert.ok(iz, 'iz null' + ayrinti);
      const ih = izKontrol(iz);
      assert.deepEqual(ih, [], 'yapısal değişmez ihlali: ' + ih.join('; ') + ayrinti);
      const gercek = izOzet(iz);
      assert.deepEqual(gercek.dugumler, beklenen.dugumler, 'düğümler' + ayrinti);
      assert.deepEqual(gercek.kenarlar, beklenen.kenarlar, 'kenarlar' + ayrinti);
      assert.equal(gercek.bilesen, beklenen.bilesen, 'bileşen sayısı' + ayrinti);
      karsilastirilan++;
      if (iz.dal) dalli++;
      if (iz.dongu) cevrimli++;
      if (iz.bilesenler.length > 1) cokBilesenli++;
    }
  }
  // sınama anlamlı mı: dal, çevrim, çok bileşen gerçekten üretiliyor
  assert.ok(karsilastirilan >= 600, `karşılaştırılan iz sayısı ${karsilastirilan}`);
  assert.ok(dalli >= 50, `dallı iz sayısı ${dalli}`);
  assert.ok(cevrimli >= 5, `çevrimli iz sayısı ${cevrimli}`);
  assert.ok(cokBilesenli >= 20, `çok bileşenli iz sayısı ${cokBilesenli}`);
});

// =============================================================================================================
//  2) zengin rastgele veri: çökme yok + değişmezler
// =============================================================================================================
function zenginUret(seed) {
  const r = tohum(seed * 7919);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ihtimal = (p) => r() < p;
  const kodlar = ['91A01', '91A02', '91B01', '91B02', '91B03', '91G01', '91F01', '91R01', '91V01', '91S01', '91S02', '91M01', '91K01', '91E01'];
  const tur = (k) => ({ A: 'beyin', B: 'sensor', G: 'guc', F: 'sigorta', R: 'direnc', V: 'diyot', S: 'salter', M: 'motor', K: 'role', E: 'lamba' }[k[2]]);
  const soketler = ['15', '9', 'IV-18', null, null];
  const pinler = ['1', '2', '3', '4', '10', 'B+', 'B-', 'B', 'D+', '1?', null];
  const numaralar = ['2001', '2002', '2003', '2004', '2005', '2006', '#2007', '2,5-2008'];
  const etiketler = ['70sw', '1sw/rt', '#br', null, null];
  const araSoketler = ['X91.1', 'X91.2', 'X91.3'];
  const ekNoktalari = ['91Z07', '91Z08', '~d1', '~d2', '~d3'];
  const hedefler = [{ cihaz: '91A01' }, { cihaz: '99Q99' }, { hedef: '2/27' }, { hedef: '1/10' }, { hedef: '74' }, { cihaz: '91B02' }];
  const uc = () => {
    const t = r();
    if (t < 0.55) return C(pick(kodlar), pick(soketler), pick(pinler), ihtimal(0.3) ? 'PN' + Math.floor(r() * 9) : null);
    if (t < 0.75) return S(pick(araSoketler), pick(['1', '2', '3']));
    if (t < 0.88) return D(pick(ekNoktalari));
    return V(pick(hedefler));
  };
  const semaSayisi = 1 + Math.floor(r() * 3);
  const semalar = [];
  const hepsiKod = new Set();
  for (let s = 0; s < semaSayisi; s++) {
    const id = 'z' + (s + 1);
    const n = 2 + Math.floor(r() * 26);
    const kablolar = [];
    for (let i = 0; i < n; i++) {
      const etiket = ihtimal(0.8) ? pick(numaralar) : pick(etiketler);
      const o = {};
      if (etiket === '70sw') { o.kesit = '70'; o.renk = 'sw'; } else if (etiket === '1sw/rt') { o.kesit = '1'; o.renk = 'sw/rt'; } else if (etiket === '#br') { o.no = null; o.isaret = '#'; o.renk = 'br'; }
      if (ihtimal(0.1)) o.varyant = true;
      if (ihtimal(0.08)) { o.durum = 'suphe'; o.suphe = { soru: 'Test sorusu?', A: 'a', B: 'b', kirpinti: 'yok.png' }; } else if (ihtimal(0.05)) { o.durum = 'cozuldu'; o.not = 'test'; }
      if (ihtimal(0.1)) o.renk = pick(['ws', 'rt', 'sw/rt', 'xx']);
      let uclar = [uc(), uc()];
      if (ihtimal(0.08)) { // ic: aynı cihazın iki pini
        const k = pick(kodlar);
        uclar = [C(k, null, pick(['D+', 'DF', 'B+']), null), C(k, null, pick(['W', 'B-', '31']), null)];
        o.ic = true;
      } else if (ihtimal(0.05)) { // kendine dönen
        const u = S(pick(araSoketler), '1');
        uclar = [u, { ...u }];
      } else if (ihtimal(0.05)) { // soket içi köprü
        const k = pick(['91A01', '91A02']);
        uclar = [C(k, '9', '5', 'CANRS'), C(k, '9', '6', 'CANLS')];
      }
      for (const u of uclar) if (u.tur === 'cihaz') hepsiKod.add(u.cihaz);
      kablolar.push(K('p' + i, o.ic ? null : etiket, uclar, [1 + Math.floor(r() * 3), String(1 + Math.floor(r() * 76)), pick(['A', 'B', 'C', 'D'])], o));
    }
    semalar.push({ id, kablolar, dogrulandi: ihtimal(0.4) });
  }
  const cihazListesi = [...hepsiKod].filter(() => ihtimal(0.85)).map((k) => cz(k, tur(k), 'Test ' + k, [String(1 + Math.floor(r() * 76))], ihtimal(0.3) ? 'Kısa ' + k : null));
  // listede olmayan cihazlar da olsun (cihazBilinmiyor), ayrıca hiç bağlantısı olmayan bir cihaz
  cihazListesi.push(cz('91A09', 'beyin', 'Yalnız listede'));
  const celiskiler = (s) => (s.kablolar.length && ihtimal(0.3) ? [{ kablo: pick([s.kablolar[0].id, 'yok-id']), alan: 'pin', sema: '1', beyinListesi: '2', not: 'test' }] : []);
  return {
    seed,
    semalar: semalar.map((s) => sema(s.id, { cihazlar: cihazListesi, kablolar: s.kablolar, dogrulandi: s.dogrulandi, varsayilan: ihtimal(0.7) ? { renk: 'ws', kesit: '0.75', ham: 'T' } : null, celiskiler: celiskiler(s) })),
  };
}

function kablolariBul(db) {
  // veri kümesindeki bütün kablo gruplarını aramadan bağımsız olarak bulmak için listeyi kullan
  const l = KB.ara.liste(db, db.sekmeler[0].id, { limit: 100000 });
  return l.kablo;
}

test('zengin rastgele veri: 250 küme — çökme yok, her iz yapısal değişmezleri sağlıyor, sorgular tutarlı', () => {
  let izSayisi = 0, devamli = 0, gecisli = 0, icli = 0, kendineDonenli = 0, cokBilesenli = 0, celiskili = 0;
  for (let seed = 1; seed <= 250; seed++) {
    const veri = zenginUret(seed);
    const ayrinti = () => `\n  tohum ${seed}\n  veri: ${JSON.stringify(veri.semalar.map((s) => ({ id: s.sema, kablolar: s.kablolar.map((p) => [p.id, p.etiket, p.ic ? 'ic' : '', p.uclar.map((u) => (u.tur === 'cihaz' ? `${u.cihaz} ${u.soket}/${u.pin}` : u.tur === 'soket' ? `S:${u.soket}/${u.pin}` : u.tur === 'dugum' ? `D:${u.kod}` : `V:${u.cihaz || u.hedef}`)).join(' -- ')]) })))}`;
    let db;
    try {
      db = yukle(veri.semalar);
    } catch (e) { assert.fail(`yükleme çöktü: ${e.stack}${ayrinti()}`); }
    const parca = veri.semalar.reduce((t, s) => t + s.kablolar.length, 0);
    assert.equal(db.istatistik.parca, parca, 'parça sayısı' + ayrinti());
    for (const k of kablolariBul(db)) {
      let iz;
      try { iz = KB.izle.kablo(db, k.anahtar); } catch (e) { assert.fail(`izle.kablo(${k.anahtar}) çöktü: ${e.stack}${ayrinti()}`); }
      assert.ok(iz, `izle.kablo(${k.anahtar}) null${ayrinti()}`);
      const ih = izKontrol(iz);
      assert.deepEqual(ih, [], `kablo ${k.anahtar}: ${ih.join('; ')}${ayrinti()}`);
      let metin;
      try { metin = KB.metin.tamMetin(iz); } catch (e) { assert.fail(`tamMetin(${k.anahtar}) çöktü: ${e.stack}${ayrinti()}`); }
      assert.ok(!/undefined|NaN|\[object|Infinity/.test(metin), `kablo ${k.anahtar}: metinde çöp değer\n${metin}${ayrinti()}`);
      assert.equal(KB.metin.satirlar(iz).join('\n'), KB.metin.ozet(iz, { maksSatir: 100000 }), `satirlar ≠ ozet ${k.anahtar}${ayrinti()}`);
      assert.deepEqual(KB.izle.kablo(db, k.anahtar), iz, `izleme kararlı değil ${k.anahtar}${ayrinti()}`);
      // aranabilirlik: kablo kendi etiketiyle bulunur
      const yaz = k.no !== null ? k.no : k.etiket;
      const bulunan = KB.ara.ara(db, yaz).kablo.find((x) => x.anahtar === k.anahtar);
      assert.ok(bulunan, `kablo ${k.anahtar} "${yaz}" ile aranamıyor${ayrinti()}`);
      assert.equal(bulunan.eslesme, 'tam');
      // her kenar bir veri parçasına, her parça bir kenara bağlı (sanal kenar hariç)
      for (const e of iz.kenarlar) if (!e.sanal) assert.ok(e.parcalar.length >= 1, `kenar parçasız${ayrinti()}`);
      izSayisi++;
      if (iz.dugumler.some((d) => d.tur === 'devam')) devamli++;
      if (iz.sayilar.sanal) gecisli++;
      if (iz.sayilar.ic) icli++;
      if (iz.sayilar.kendineDonen) kendineDonenli++;
      if (iz.bilesenler.length > 1) cokBilesenli++;
      if (iz.celiski) celiskili++;
    }
    // cihaz ve soket sorguları, pin satırlarından iz
    for (const sm of veri.semalar) {
      const kodlar = new Set(sm.kablolar.flatMap((p) => p.uclar.filter((u) => u.tur === 'cihaz').map((u) => u.cihaz)));
      for (const kd of kodlar) {
        const q = KB.cihazSorgu.cihaz(db, kd);
        assert.ok(q, `cihaz sorgusu ${kd} null${ayrinti()}`);
        assert.deepEqual(duzJson(q), [], `cihaz sorgusu düz JSON değil${ayrinti()}`);
        for (const g of q.soketler) for (const s of g.satirlar) {
          const r = KB.izle.uc(db, s.uc);
          assert.ok(r, `${kd} ${JSON.stringify(s.uc)}: izle.uc null${ayrinti()}`);
          const ih = izKontrol(r);
          assert.deepEqual(ih, [], `${kd} ${JSON.stringify(s.uc)}: ${ih.join('; ')}${ayrinti()}`);
        }
        const a = KB.ara.ara(db, kd).cihaz.find((x) => x.kod === kd);
        assert.ok(a && a.eslesme === 'tam', `cihaz ${kd} aranamıyor${ayrinti()}`);
      }
      const soketler = new Set(sm.kablolar.flatMap((p) => p.uclar.filter((u) => u.tur === 'soket' || (u.tur === 'cihaz' && u.soket)).map((u) => u.soket)));
      for (const so of soketler) {
        const q = KB.soketSorgu.soket(db, so);
        assert.ok(q, `soket sorgusu ${so} null${ayrinti()}`);
        for (const e of q.eslesmeler) for (const s of e.satirlar) assert.ok(KB.izle.uc(db, s.uc), `${so} ${JSON.stringify(s.uc)}: izle.uc null${ayrinti()}`);
      }
    }
    // öneri ve arama dayanıklılığı
    for (const q of ['9lA01', '2OO1', 'X9l.1', '7Osw', 'zz', '#', '1sw/rt', '91A0', 'IV-I8']) {
      assert.doesNotThrow(() => KB.oner.oner(db, q), `oner(${q}) çöktü${ayrinti()}`);
      assert.doesNotThrow(() => KB.ara.ara(db, q), `ara(${q}) çöktü${ayrinti()}`);
    }
  }
  // sınama anlamlı mı: özelliklerin hepsi gerçekten üretilmiş
  assert.ok(izSayisi >= 800, `iz sayısı ${izSayisi}`);
  assert.ok(devamli >= 50, `devamlı iz ${devamli}`);
  assert.ok(gecisli >= 20, `geçişli iz ${gecisli}`);
  assert.ok(icli >= 10, `ic'li iz ${icli}`);
  assert.ok(kendineDonenli >= 10, `kendine dönenli iz ${kendineDonenli}`);
  assert.ok(cokBilesenli >= 50, `çok bileşenli iz ${cokBilesenli}`);
  assert.ok(celiskili >= 20, `çelişkili iz ${celiskili}`);
});
