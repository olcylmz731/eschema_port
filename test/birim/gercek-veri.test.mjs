// Gerçek veri (veri/<sema>.json) ile sınamalar. Beklenen değerler veri dosyalarından türetilir (uygulama çıktısından değil).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { KB, KOK, kod, jsonOku, tohum } from './yardimci.mjs';
import { izKontrol, duzJson } from './degismezler.mjs';

const VERI = path.join(KOK, 'veri');
const semalarJson = jsonOku('veri/semalar.json');
// dosyası olan şemalar, semalar.json sırasıyla
const dosyali = Object.keys(semalarJson.semalar).filter((s) => fs.existsSync(path.join(VERI, s + '.json')));
const dosyasiz = Object.keys(semalarJson.semalar).filter((s) => !dosyali.includes(s));
const ham = Object.fromEntries(dosyali.map((s) => [s, jsonOku(`veri/${s}.json`)]));

const t0 = Date.now();
const db = KB.veri.klasordenYukle(VERI, { sessiz: true });
const yuklemeMs = Date.now() - t0;

// ---- veri dosyalarından beklenenler (bağımsız, çekirdeğe bakmadan) -----------------------------------------------
const tumParcalar = [];
for (const s of dosyali) for (const p of ham[s].kablolar) tumParcalar.push({ sema: s, p });

/** kablo grubu anahtarı: numaralıysa no, numarasızsa etiket; ic / etiketsiz parçalar kablo değildir */
function grupAnahtari(p) {
  if (p.ic) return null;
  if (p.no != null) return 'no:' + p.no;
  if (p.etiket != null) return 'etiket:' + p.etiket;
  return null;
}
const gruplar = new Map(); // anahtar → [{sema,p}]
for (const x of tumParcalar) {
  const g = grupAnahtari(x.p);
  if (g === null) continue;
  if (!gruplar.has(g)) gruplar.set(g, []);
  gruplar.get(g).push(x);
}
/** kullanıcının kutuya yazacağı metin */
const yazilan = (g) => (g.startsWith('no:') ? g.slice(3) : g.slice(7));

/** veri uç → izdeki düğüm kodu (devam için null) */
function ucKodu(u) {
  if (u.tur === 'cihaz') return `${u.cihaz} ${u.soket == null ? '-' : u.soket}/${u.pin == null ? '-' : u.pin}`;
  if (u.tur === 'soket') return `${u.soket}/${u.pin}`;
  if (u.tur === 'dugum') return u.kod;
  return null;
}

const sayfaYol = (y) => String(y).replace(/^~/, '');

// ================================================================================================
//  yükleme ve dizinleme
// ================================================================================================
test('her veri/<sema>.json yükleniyor: şema sırası, parça sayıları, cihaz sayıları veri dosyalarıyla aynı', () => {
  assert.ok(dosyali.length >= 2, `veri/ altında en az 2 şema dosyası bekleniyordu: ${dosyali}`);
  assert.ok(dosyali.includes('alternator-mars') && dosyali.includes('kapi-1'));
  assert.deepEqual(db.semaSirasi, dosyali);
  for (const s of dosyali) {
    const d = ham[s];
    const o = db.semalar[s];
    assert.ok(o, `${s}: db.semalar'da yok`);
    assert.equal(o.id, s);
    assert.equal(o.parcaSayisi, d.kablolar.length, `${s}: parça sayısı`);
    assert.equal(o.cihazSayisi, d.cihazlar.length, `${s}: cihaz sayısı`);
    assert.equal(o.icSayisi, d.kablolar.filter((p) => p.ic).length, `${s}: ic sayısı`);
    assert.equal(o.dogrulandi, d.dogrulandi, `${s}: doğrulandı bayrağı`);
    assert.equal(o.pdf, semalarJson.semalar[s].pdf);
    assert.equal(o.ad, semalarJson.semalar[s].ad);
  }
  assert.equal(db.istatistik.sema, dosyali.length);
  assert.equal(db.istatistik.parca, tumParcalar.length);
  assert.equal(db.istatistik.ic, tumParcalar.filter((x) => x.p.ic).length);
  assert.equal(db.istatistik.dogrulanmamisSema, dosyali.filter((s) => !ham[s].dogrulandi).length);
});

test('veri dosyası olmayan şemalar atlanır ve "sema-yok" uyarısıyla bildirilir; başka uyarı yok', () => {
  assert.deepEqual(db.uyarilar.filter((u) => u.tur === 'sema-yok').map((u) => u.sema).sort(), dosyasiz.slice().sort());
  const baska = db.uyarilar.filter((u) => u.tur !== 'sema-yok');
  assert.deepEqual(baska, [], 'beklenmeyen yükleme uyarıları: ' + JSON.stringify(baska));
  // sekmeler: eksik şemalar eksikSemalar'da
  for (const t of db.sekmeler) {
    const tanim = semalarJson.sekmeler.find((x) => x.id === t.id);
    assert.deepEqual(t.semalar, tanim.semalar.filter((s) => dosyali.includes(s)), `sekme ${t.id}`);
    assert.deepEqual(t.eksikSemalar, tanim.semalar.filter((s) => !dosyali.includes(s)), `sekme ${t.id} eksik`);
  }
});

test('kablo sayısı = veri dosyalarındaki ayrı kablo grupları (ic ve etiketsiz parçalar hariç)', () => {
  assert.equal(db.istatistik.kablo, gruplar.size);
  const cihazKodlari = new Set();
  for (const s of dosyali) {
    for (const c of ham[s].cihazlar) cihazKodlari.add(c.kod);
    for (const p of ham[s].kablolar) for (const u of p.uclar) if (u.tur === 'cihaz') cihazKodlari.add(u.cihaz);
  }
  // devam hedefi olan ama hiçbir uçta/listede bulunmayan cihazlar da cihaz sorgusunda bulunabilir (24F01 gibi)
  assert.ok(db.istatistik.cihaz >= cihazKodlari.size - 0, `cihaz sayısı ${db.istatistik.cihaz} < ${cihazKodlari.size}`);
});

test('yükleme ve ilk dizinleme hızlı (< 2 sn)', () => {
  assert.ok(yuklemeMs < 2000, `yükleme ${yuklemeMs} ms`);
});

test('db.ornekler gerçek veride sonuç verir', () => {
  assert.ok(db.ornekler.kablo && db.ornekler.cihaz && db.ornekler.soket);
  assert.ok(KB.ara.ara(db, db.ornekler.kablo).kablo.length >= 1);
  assert.ok(KB.cihazSorgu.cihaz(db, db.ornekler.cihaz));
  assert.ok(KB.soketSorgu.soket(db, db.ornekler.soket));
});

test('çıktılar düz JSON: db.semalar, db.sekmeler, db.istatistik, bir arama, bir iz', () => {
  assert.deepEqual(duzJson(db.semalar), []);
  assert.deepEqual(duzJson(db.sekmeler), []);
  assert.deepEqual(duzJson(db.istatistik), []);
  assert.deepEqual(duzJson(KB.ara.ara(db, '4002')), []);
  assert.deepEqual(duzJson(KB.izle.kablo(db, '4002')), []);
});

// ================================================================================================
//  cihaz bilgileri
// ================================================================================================
test('bileşen listesindeki her cihaz: kod, tür, kısa ad, Almanca ad veri dosyasındaki gibi', () => {
  for (const s of dosyali) {
    for (const c of ham[s].cihazlar) {
      const v = KB.veri.cihaz(db, c.kod);
      assert.ok(v, `${s}/${c.kod}: cihaz bulunamadı`);
      assert.equal(v.kod, c.kod);
      assert.ok(v.semalar.includes(s), `${c.kod}: ${s} şeması cihazın semalar listesinde yok`);
      assert.equal(v.cihazBilinmiyor, false, `${c.kod}: bileşen listesinde olduğu halde bilinmiyor`);
      assert.deepEqual(v.yol[s], c.yol, `${c.kod}: yol`);
      if (c.kisaAd) assert.equal(v.kisaAd, c.kisaAd);
      if (c.adDe) assert.equal(v.adDe, c.adDe);
      if (c.tur !== 'diger') assert.equal(v.cihazTur, c.tur, `${c.kod}: tür`);
    }
  }
});

test('her cihaz aramada kendi koduyla tam eşleşir, cihaz sorgusu çalışır, pin satırlarının uc alanı izlenebilir', () => {
  const kodlar = new Set();
  for (const s of dosyali) for (const c of ham[s].cihazlar) kodlar.add(c.kod);
  for (const k of kodlar) {
    const a = KB.ara.ara(db, k);
    const bulundu = a.cihaz.find((x) => x.kod === k);
    assert.ok(bulundu, `${k}: aramada yok`);
    assert.equal(bulundu.eslesme, 'tam', k);
    const q = KB.cihazSorgu.cihaz(db, k);
    assert.ok(q, `${k}: cihaz sorgusu null`);
    for (const g of q.soketler) for (const sat of g.satirlar) {
      const r = KB.izle.uc(db, sat.uc);
      assert.ok(r, `${k} ${JSON.stringify(sat.uc)}: izle.uc null`);
      const ih = izKontrol(r);
      assert.deepEqual(ih, [], `${k} ${JSON.stringify(sat.uc)}: ${ih.join('; ')}`);
    }
  }
});

// ================================================================================================
//  her şemadan rastgele 10 kablo (sabit tohum)
// ================================================================================================
function rastgele10(sema) {
  const anahtarlar = [];
  const gorulen = new Set();
  for (const p of ham[sema].kablolar) {
    const g = grupAnahtari(p);
    if (g !== null && !gorulen.has(g)) { gorulen.add(g); anahtarlar.push(g); }
  }
  anahtarlar.sort();
  const rnd = tohum(20261014 + sema.length);
  for (let i = anahtarlar.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [anahtarlar[i], anahtarlar[j]] = [anahtarlar[j], anahtarlar[i]];
  }
  return anahtarlar.slice(0, 10);
}

for (const sema of dosyali) {
  test(`${sema}: rastgele 10 kablo (sabit tohum) aranınca ve izlenince uçlar veri dosyasındakilerle örtüşüyor`, () => {
    const secilen = rastgele10(sema);
    assert.ok(secilen.length >= Math.min(10, gruplar.size), 'kablo seçilemedi');
    for (const g of secilen) {
      const yaz = yazilan(g);
      const parcalar = gruplar.get(g);
      // --- arama
      const s = KB.ara.ara(db, yaz);
      const hedef = s.kablo.filter((k) => (g.startsWith('no:') ? k.no === g.slice(3) : k.no === null && k.etiket === g.slice(7)));
      assert.equal(hedef.length, 1, `${g}: aramada ${hedef.length} eşleşme (arama metni "${yaz}", bulunan: ${s.kablo.map((k) => k.etiket)})`);
      const item = hedef[0];
      assert.equal(item.eslesme, 'tam', g);
      assert.equal(item.parcaSayisi, parcalar.length, `${g}: parça sayısı`);
      for (const sm of new Set(parcalar.map((x) => x.sema))) assert.ok(item.semalar.includes(sm), `${g}: ${sm} semalar içinde yok`);
      // --- iz
      const iz = KB.izle.kablo(db, item.anahtar);
      assert.ok(iz, `${g}: izle.kablo(${item.anahtar}) null`);
      const ih = izKontrol(iz);
      assert.deepEqual(ih, [], `${g}: ${ih.join('; ')}`);
      // her veri parçası bir kenarda ve uçları örtüşüyor
      for (const { sema: sm, p } of parcalar) {
        const e = iz.kenarlar.find((k) => k.parcalar.includes(`${sm}:${p.id}`));
        assert.ok(e, `${g}: ${sm}:${p.id} hiçbir kenarda yok`);
        const a = iz.dugumler.find((d) => d.id === e.a);
        const b = iz.dugumler.find((d) => d.id === e.b);
        const beklenen = p.uclar.map(ucKodu);
        if (beklenen.every((x) => x !== null)) {
          assert.deepEqual([kod(a), kod(b)].sort(), beklenen.slice().sort(), `${g}: ${sm}:${p.id} uçları`);
        } else {
          // devam ucu: öbür (gerçek) uç kenarın uçlarından biri olmalı
          const gercek = beklenen.filter((x) => x !== null);
          for (const x of gercek) assert.ok([kod(a), kod(b)].includes(x), `${g}: ${sm}:${p.id} gerçek ucu ${x} kenarda yok (${kod(a)} / ${kod(b)})`);
        }
        // kaynak: şema/sayfa/yol/satır izde
        assert.ok(
          iz.kaynaklar.some((k) => k.sema === sm && k.sayfa === p.izgara.sayfa && sayfaYol(k.yol) === sayfaYol(p.izgara.yol) && k.satir === p.izgara.satir),
          `${g}: ${sm}:${p.id} kaynağı (${JSON.stringify(p.izgara)}) izde yok`
        );
        // etiket / durum
        if (p.durum === 'suphe') assert.equal(e.durum, 'suphe');
        assert.equal(e.varyant, e.parcalar.some((id) => {
          const [smx, idx] = id.split(':');
          return ham[smx].kablolar.find((q) => q.id === idx).varyant;
        }));
      }
      // --- metin: her cihaz ucunda soket+pin (veri dosyasından beklenen)
      const metin = KB.metin.ozet(iz, { maksSatir: 500 });
      assert.ok(metin.startsWith(iz.baslik + ' · '), g);
      for (const { p } of parcalar) {
        for (const u of p.uclar.filter((x) => x.tur === 'cihaz')) {
          if (KB.veri.cihaz(db, u.cihaz).gecis) continue; // geçiş bileşenleri tek öğede birleşir (başka testte)
          if (u.pin == null) { assert.ok(metin.includes('(soket/pin şemada yazılı değil)'), `${g}: ${u.cihaz} adressiz uç metinde yok`); continue; }
          const beklenenMetin = u.soket != null ? `soket ${u.soket} pin ${u.pin}` : `pin ${u.pin}`;
          assert.ok(metin.includes(beklenenMetin), `${g}: "${beklenenMetin}" metinde yok:\n${metin}`);
        }
        for (const u of p.uclar.filter((x) => x.tur === 'soket')) assert.ok(metin.includes(`${u.soket} pin ${u.pin}`), `${g}: ara soket ${u.soket} pin ${u.pin} metinde yok`);
      }
    }
  });
}

test('her kablo (hepsi): aranabilir, izlenebilir, yapısal değişmezler tutuyor, metin çöp içermiyor', () => {
  const t1 = Date.now();
  for (const [g, parcalar] of gruplar) {
    const yaz = yazilan(g);
    const item = KB.ara.ara(db, yaz).kablo.find((k) => (g.startsWith('no:') ? k.no === g.slice(3) : k.no === null && k.etiket === g.slice(7)));
    assert.ok(item, `${g}: aranamıyor ("${yaz}")`);
    assert.equal(item.parcaSayisi, parcalar.length);
    const iz = KB.izle.kablo(db, item.anahtar);
    assert.ok(iz, g);
    assert.deepEqual(izKontrol(iz), [], g);
    const m = KB.metin.tamMetin(iz);
    assert.ok(!/undefined|null|NaN|\[object|Infinity/.test(m), `${g}: metinde çöp değer\n${m}`);
    assert.ok(iz.sayilar.kablo >= 1);
    assert.equal(iz.sinirAsildi, false, `${g}: maksKenar'a takıldı`);
  }
  assert.ok(Date.now() - t1 < 5000, 'tüm kabloların izlenmesi çok yavaş');
});

test('ic kayıtları aranamaz (kablo değil) ama izde bağlantı olarak görünür', () => {
  const icler = tumParcalar.filter((x) => x.p.ic);
  assert.ok(icler.length >= 1);
  for (const { sema, p } of icler) {
    assert.equal(p.etiket, null, 'ic kaydı etiketli (bu test etiketsiz varsayar)');
    const [u0, u1] = p.uclar;
    const r = KB.izle.uc(db, { cihaz: u0.cihaz, soket: u0.soket, pin: u0.pin });
    assert.ok(r, `${sema}:${p.id}`);
    const e = r.kenarlar.find((k) => k.parcalar.includes(`${sema}:${p.id}`));
    assert.ok(e && e.ic === true, 'ic kenarı izde yok');
    assert.equal(e.etiket, null);
    assert.ok(r.dugumler.some((d) => d.cihaz === u1.cihaz && d.pin === u1.pin), 'köprünün öbür ucu izde yok');
  }
});

// ================================================================================================
//  belirli senaryolar
// ================================================================================================
test('1084 → 24F01: alternatörden sigortaya kesintisiz yol (direnç ve diyot üzerinden), tek bileşen', () => {
  const p1084 = ham['alternator-mars'].kablolar.find((p) => p.no === '1084');
  const p2029 = ham['alternator-mars'].kablolar.find((p) => p.no === '2029');
  assert.ok(p1084 && p2029, 'veri dosyasında 1084 ve 2029 yok');
  const baslangicUc = p1084.uclar.find((u) => u.tur === 'cihaz'); // 01G02 D+
  const devamUc = p2029.uclar.find((u) => u.tur === 'devam');
  assert.equal(devamUc.cihaz, '24F01');

  const iz = KB.izle.kablo(db, '1084');
  assert.deepEqual(izKontrol(iz), []);
  assert.equal(iz.bilesenler.length, 1, 'iz tek bileşen olmalı (kesintisiz)');
  const bas = iz.dugumler.find((d) => d.cihaz === baslangicUc.cihaz && d.pin === baslangicUc.pin);
  const son = iz.dugumler.find((d) => d.tur === 'devam' && d.hedefCihaz === '24F01');
  assert.ok(bas, `${baslangicUc.cihaz} pin ${baslangicUc.pin} izde yok`);
  assert.ok(son, 'devam → 24F01 yaprağı izde yok');

  // izin kendi grafında bas'tan son'a yol ara (genişlik öncelikli)
  const komsu = new Map(iz.dugumler.map((d) => [d.id, []]));
  for (const e of iz.kenarlar) if (!e.kendineDonen) { komsu.get(e.a).push([e.b, e]); komsu.get(e.b).push([e.a, e]); }
  const onceki = new Map([[bas.id, null]]);
  const kuyruk = [bas.id];
  while (kuyruk.length) {
    const x = kuyruk.shift();
    for (const [y, e] of komsu.get(x)) if (!onceki.has(y)) { onceki.set(y, [x, e]); kuyruk.push(y); }
  }
  assert.ok(onceki.has(son.id), '01G02 D+ ile devam → 24F01 arasında yol yok');
  const yol = [];
  for (let x = son.id; onceki.get(x); x = onceki.get(x)[0]) yol.unshift(onceki.get(x)[1]);
  const etiketli = yol.filter((e) => !e.sanal && e.etiket !== null).map((e) => e.etiket);
  assert.deepEqual(etiketli, ['1084', '1082', '2029'], `yol üzerindeki numaralı kablolar; yol: ${yol.map((e) => e.etiket || (e.sanal ? 'sanal:' + e.bilesen.kod : '-')).join(' > ')}`);
  const sanal = yol.filter((e) => e.sanal).map((e) => e.bilesen.kod).sort();
  assert.deepEqual(sanal, ['01R02', '01V01'], 'yol direnç 01R02 ve diyot 01V01 üzerinden geçmeli');
  // veri dosyasındaki bütün bu parçalar izde
  for (const no of ['1084', '1082', '2029']) {
    const p = ham['alternator-mars'].kablolar.find((q) => q.no === no);
    assert.ok(iz.kenarlar.some((e) => e.parcalar.includes(`alternator-mars:${p.id}`)), `${no} izde yok`);
  }
  // metinde yol: diyot pin 2–1, direnç, 24F01
  const metin = KB.metin.ozet(iz);
  assert.match(metin, /01V01 \(diyot\) pin 2–1/);
  assert.match(metin, /01R02 \(direnç\)/);
  assert.match(metin, /devam: 24F01/);
  // öbür uçtan da aynı bileşen
  const iz2 = KB.izle.kablo(db, '2029');
  assert.deepEqual(iz2.dugumler.map(kod).sort(), iz.dugumler.map(kod).sort());
});

test('4002 izinde HS10 → 42A01 dalı: etiketsiz devam parçası etiketli parçanın dalı olarak izde', () => {
  const kapi = ham['kapi-1'];
  const etiketli = kapi.kablolar.filter((p) => p.no === '4002' && p.uclar.some((u) => u.tur === 'cihaz'));
  assert.equal(etiketli.length, 1);
  const hs10 = etiketli[0].uclar.find((u) => u.tur === 'cihaz'); // 04A03 IV-18/10 HS10
  assert.equal(hs10.pinAdi, 'HS10');
  // aynı cihaz pininde etiketsiz bir parça, öbür ucu devam → 42A01
  const dal = kapi.kablolar.find((p) => p.etiket === null && p.uclar.some((u) => u.tur === 'cihaz' && u.cihaz === hs10.cihaz && u.soket === hs10.soket && u.pin === hs10.pin) && p.uclar.some((u) => u.tur === 'devam' && u.cihaz === '42A01'));
  assert.ok(dal, 'veri dosyasında HS10 pininde 42A01’e giden etiketsiz parça yok');

  const iz = KB.izle.kablo(db, '4002');
  assert.deepEqual(izKontrol(iz), []);
  const pin = iz.dugumler.find((d) => d.cihaz === hs10.cihaz && d.soket === hs10.soket && d.pin === hs10.pin);
  assert.ok(pin, `${hs10.cihaz} ${hs10.soket}/${hs10.pin} izde yok`);
  assert.equal(pin.pinAdi, 'HS10');
  const e = iz.kenarlar.find((k) => k.parcalar.includes(`kapi-1:${dal.id}`));
  assert.ok(e, 'etiketsiz dal kenarı izde yok');
  assert.equal(e.etiket, null);
  const karsi = iz.dugumler.find((d) => d.id === (e.a === pin.id ? e.b : e.a));
  assert.equal(karsi.tur, 'devam');
  assert.equal(karsi.hedefCihaz, '42A01');
  assert.equal(karsi.cozuldu, false);
  assert.match(KB.metin.ozet(iz), /\(HS10\) →\[kablo etiketsiz\]→ devam: .*42A01/);
});

test('41A01 cihaz sorgusu: soketler 9, 15, 18; her soketin pinleri ve toplam pin sayısı veriyle aynı', () => {
  const beklenen = new Map(); // soket → Set(pin)
  for (const { sema, p } of tumParcalar) {
    for (const u of p.uclar) {
      if (u.tur === 'cihaz' && u.cihaz === '41A01') {
        const s = u.soket == null ? '∅' : u.soket;
        if (!beklenen.has(s)) beklenen.set(s, new Set());
        beklenen.get(s).add(u.pin);
      }
    }
  }
  assert.deepEqual([...beklenen.keys()].sort((a, b) => Number(a) - Number(b)), ['9', '15', '18'], 'veri dosyasında 41A01 soketleri');
  const toplam = [...beklenen.values()].reduce((a, s) => a + s.size, 0);

  const q = KB.cihazSorgu.cihaz(db, '41A01');
  assert.ok(q);
  assert.deepEqual(q.soketler.map((g) => g.soket), ['9', '15', '18']);
  for (const g of q.soketler) {
    const pinler = g.satirlar.map((s) => s.pin);
    assert.deepEqual(pinler.slice().sort((a, b) => Number(a) - Number(b)), [...beklenen.get(g.soket)].sort((a, b) => Number(a) - Number(b)), `soket ${g.soket} pinleri`);
    // doğal sıra: sayısal artan
    assert.deepEqual(pinler, pinler.slice().sort((a, b) => Number(a) - Number(b)), `soket ${g.soket}: pinler doğal sırada değil: ${pinler}`);
    assert.equal(g.pinSayisi, Number(g.soket));
  }
  assert.equal(q.satirSayisi, toplam);
  const item = KB.ara.ara(db, '41A01').cihaz.find((c) => c.kod === '41A01');
  assert.equal(item.soketSayisi, 3);
  assert.equal(item.pinSayisi, toplam);
  assert.equal(item.kisaAd, 'Kapı 1 beyni');
  // her pin satırında veriden beklenen kablolar (etiketler) var
  for (const g of q.soketler) for (const s of g.satirlar) {
    const beklenenEtiketler = new Set();
    for (const { p } of tumParcalar) if (p.uclar.some((u) => u.tur === 'cihaz' && u.cihaz === '41A01' && u.soket === g.soket && u.pin === s.pin) && !p.ic) {
      if (p.no != null) beklenenEtiketler.add(p.no); else if (p.etiket != null) beklenenEtiketler.add(p.etiket);
    }
    const gelen = new Set(s.kablolar.map((k) => k.kenar.no != null ? k.kenar.no : k.kenar.etiket).filter((x) => x != null));
    for (const b of beklenenEtiketler) assert.ok(gelen.has(b), `41A01 ${g.soket}/${s.pin}: ${b} kablosu satırda yok (var: ${[...gelen]})`);
  }
});

test('4060 aranınca bulunur; aynı soket içinde köprü, çelişki değil', () => {
  const s = KB.ara.ara(db, '4060');
  assert.deepEqual(s.kablo.map((k) => k.anahtar), ['4060']);
  assert.equal(s.kablo[0].eslesme, 'tam');
  assert.equal(s.kablo[0].celiski, false);
  assert.deepEqual(s.kablo[0].cihazlar.map((c) => c.kod), ['41A01']);
  const p = ham['kapi-1'].kablolar.find((q) => q.no === '4060');
  const iz = KB.izle.kablo(db, '4060');
  assert.deepEqual(izKontrol(iz), []);
  assert.equal(iz.kenarlar.length, 1);
  assert.equal(iz.kenarlar[0].soketIci, true);
  assert.equal(iz.kenarlar[0].ic, false);
  assert.deepEqual(iz.dugumler.map(kod).sort(), p.uclar.map(ucKodu).sort());
  assert.equal(iz.celiski, false);
  assert.match(KB.metin.ozet(iz), /soket 9 pin 5 \(CANRS\) →\[aynı soket içinde köprü\]→ .*soket 9 pin 6 \(CANLS\)$/);
});

test('1sw/rt ile 1ws/li birbirine bağlı görünmez (CANHS ve CANLS ayrı teller)', () => {
  const hs = ham['kapi-1'].kablolar.find((p) => p.etiket === '1sw/rt');
  const ls = ham['kapi-1'].kablolar.find((p) => p.etiket === '1ws/li');
  assert.ok(hs && ls);
  const pinHs = hs.uclar.find((u) => u.tur === 'cihaz'); // 41A01 9/4 CANHS
  const pinLs = ls.uclar.find((u) => u.tur === 'cihaz'); // 41A01 9/6 CANLS
  const a = KB.izle.kablo(db, '1sw/rt');
  const b = KB.izle.kablo(db, '1ws/li');
  for (const iz of [a, b]) assert.deepEqual(izKontrol(iz), []);
  const kodA = a.dugumler.map(kod);
  const kodB = b.dugumler.map(kod);
  assert.ok(kodA.includes(ucKodu(pinHs)), 'CANHS pini 1sw/rt izinde yok');
  assert.ok(!kodA.includes(ucKodu(pinLs)), '1sw/rt izinde CANLS pini görünüyor (bağlı sanılmış)');
  assert.ok(kodB.includes(ucKodu(pinLs)), 'CANLS pini 1ws/li izinde yok');
  assert.ok(!kodB.includes(ucKodu(pinHs)), '1ws/li izinde CANHS pini görünüyor (bağlı sanılmış)');
  assert.ok(!a.kenarlar.some((e) => e.etiket === '1ws/li'), '1sw/rt izinde 1ws/li kenarı var');
  assert.ok(!b.kenarlar.some((e) => e.etiket === '1sw/rt'), '1ws/li izinde 1sw/rt kenarı var');
  assert.equal(a.kenarlar.length, 1);
  assert.equal(b.kenarlar.length, 1);
  const ma = KB.metin.ozet(a);
  const mb = KB.metin.ozet(b);
  assert.ok(ma.includes('CANHS') && !ma.includes('CANLS') && !ma.includes('1ws/li'), ma);
  assert.ok(mb.includes('CANLS') && !mb.includes('CANHS') && !mb.includes('1sw/rt'), mb);
  // "1sw/rt" yazımı (eğik çizgi) arama kutusunda kablo olarak aranır, cihaz grubu boştur
  const s = KB.ara.ara(db, '1sw/rt');
  assert.deepEqual(s.kablo.map((k) => k.etiket), ['1sw/rt']);
  assert.deepEqual(s.cihaz, []);
  assert.deepEqual(KB.ara.ara(db, '1ws/li').kablo.map((k) => k.etiket), ['1ws/li']);
});

test('41A01 9/6 pininde 1ws/li ve 4060 birlikte listelenir (iki farklı kol), çelişki değil', () => {
  const q = KB.cihazSorgu.cihaz(db, '41A01');
  const g = q.soketler.find((x) => x.soket === '9');
  const s6 = g.satirlar.find((x) => x.pin === '6');
  assert.deepEqual(s6.kablolar.map((k) => k.kenar.etiket).sort(), ['1ws/li', '4060']);
  assert.equal(s6.celiski, false);
  assert.equal(s6.pinAdi, 'CANLS');
});

test('alternatör: B+ / B- / D+ pinleri ayrı satırlar; her satırın karşı uçları veri dosyasındaki gibi', () => {
  for (const kodu of ['01G01', '01G02']) {
    const q = KB.cihazSorgu.cihaz(db, kodu);
    const g = q.soketler.find((x) => x.soket === null);
    const pinler = g.satirlar.map((s) => s.pin);
    for (const beklenen of ['B+', 'B-', 'D+']) assert.ok(pinler.includes(beklenen), `${kodu}: ${beklenen} yok (${pinler})`);
    assert.equal(new Set(pinler).size, pinler.length, `${kodu}: tekrarlı pin satırı`);
    for (const satir of g.satirlar) {
      // veri dosyasından: bu pindeki (ic olmayan) parçaların öbür uçları
      const beklenen = new Set();
      for (const { p } of tumParcalar) {
        if (p.ic) continue;
        const i = p.uclar.findIndex((u) => u.tur === 'cihaz' && u.cihaz === kodu && u.soket == null && u.pin === satir.pin);
        if (i < 0) continue;
        const diger = ucKodu(p.uclar[1 - i]);
        if (diger !== null) beklenen.add(diger);
      }
      const gelen = new Set(satir.kablolar.filter((k) => !k.ic).map((k) => kod(k.karsiUc)));
      assert.deepEqual([...gelen].sort(), [...beklenen].sort(), `${kodu} pin ${satir.pin}: karşı uçlar`);
    }
    // B- pininin karşı ucu ile B+ pininin karşı ucu karışmamış: ikisi de en az bir kola sahip ve kümeler ayrık
    const kume = (pin) => new Set(g.satirlar.find((s) => s.pin === pin).kablolar.filter((k) => !k.ic).map((k) => kod(k.karsiUc)));
    const bm = kume('B-');
    const bp = kume('B+');
    assert.ok(bm.size >= 1 && bp.size >= 1);
    for (const x of bm) assert.ok(!bp.has(x), `${kodu}: B- ve B+ aynı karşı ucu (${x}) gösteriyor`);
  }
  // 01G02: D+ pininde 1084 ve cihaz içi köprü kolu
  const q2 = KB.cihazSorgu.cihaz(db, '01G02');
  const dp = q2.soketler.find((x) => x.soket === null).satirlar.find((s) => s.pin === 'D+');
  assert.ok(dp.kablolar.some((k) => k.kenar.etiket === '1084'));
  assert.ok(dp.kablolar.some((k) => k.ic === true));
});

test('kendine dönen X11.42 (körük soketi): normal kablodur, bulunur; iz bozulmaz', () => {
  const kd = ham['alternator-mars'].kablolar.filter((p) => p.uclar[0].tur === 'soket' && p.uclar[0].soket === p.uclar[1].soket && p.uclar[0].pin === p.uclar[1].pin);
  assert.ok(kd.length >= 1);
  assert.equal(db.istatistik.kendineDonen, kd.length + ham['kapi-1'].kablolar.filter((p) => p.uclar.length === 2 && p.uclar[0].tur === 'soket' && p.uclar[1].tur === 'soket' && p.uclar[0].soket === p.uclar[1].soket && p.uclar[0].pin === p.uclar[1].pin).length);
  for (const p of kd) {
    const s = KB.ara.ara(db, p.no);
    assert.ok(s.kablo.some((k) => k.no === p.no), `${p.etiket} aranamıyor`);
    const iz = KB.izle.kablo(db, p.no);
    assert.deepEqual(izKontrol(iz), []);
    assert.ok(iz.kenarlar.some((e) => e.kendineDonen && e.parcalar.includes(`alternator-mars:${p.id}`)));
    const m = KB.metin.ozet(iz);
    assert.match(m, new RegExp(`${p.uclar[0].soket.replace('.', '\\.')} pin ${p.uclar[0].pin}`));
  }
});

// ================================================================================================
//  sekmeler
// ================================================================================================
test('sekme süzgeci gerçek veride: 4002 yalnız Kapı sekmesinde, 1084 yalnız Alternatör sekmesinde', () => {
  assert.deepEqual(KB.ara.ara(db, '4002', { sekme: 'kapi' }).kablo.map((k) => k.no), ['4002']);
  assert.equal(KB.ara.ara(db, '4002', { sekme: 'alternator-mars' }).toplam, 0);
  assert.deepEqual(KB.ara.ara(db, '1084', { sekme: 'alternator-mars' }).kablo.map((k) => k.no), ['1084']);
  assert.equal(KB.ara.ara(db, '1084', { sekme: 'kapi' }).toplam, 0);
  assert.equal(KB.ara.ara(db, '1084', { sekme: 'dmux' }).toplam, 0, 'verisi olmayan sekmede hiçbir şey çıkmamalı');
  assert.deepEqual(KB.ara.ara(db, '1084').kablo.map((k) => k.no), ['1084']);
});

test('boş sorgu + sekme: o sekmenin bütün kabloları ve cihazları listelenir', () => {
  for (const sema of dosyali) {
    const sekme = db.sekmeler.find((t) => t.semalar.includes(sema));
    const l = KB.ara.liste(db, sekme.id, { limit: 10000 });
    const beklenenKablolar = new Set();
    for (const { sema: sm, p } of tumParcalar) if (sekme.semalar.includes(sm)) { const g = grupAnahtari(p); if (g) beklenenKablolar.add(g); }
    assert.equal(l.kablo.length, beklenenKablolar.size, `${sekme.id}: kablo sayısı`);
    assert.equal(l.sayilar.kablo, beklenenKablolar.size);
    const beklenenCihazlar = new Set(ham[sema].cihazlar.map((c) => c.kod));
    for (const k of beklenenCihazlar) assert.ok(l.cihaz.some((c) => c.kod === k), `${sekme.id}: ${k} listede yok`);
    assert.equal(l.bos, false);
  }
});

test('doğrulama: veri dosyaları dogrulandi:false ise iz ve arama "doğrulanmadı" bildirir', () => {
  for (const s of dosyali) {
    if (ham[s].dogrulandi) continue;
    const g = [...gruplar.entries()].find(([, ps]) => ps.every((x) => x.sema === s));
    const yaz = yazilan(g[0]);
    const item = KB.ara.ara(db, yaz).kablo[0];
    assert.equal(item.dogrulandi, false);
    const iz = KB.izle.kablo(db, item.anahtar);
    assert.equal(iz.dogrulandi, false);
    assert.ok(iz.dogrulanmamisSemalar.includes(s));
    assert.match(KB.metin.kaynak(iz.kaynaklar[0]), /DOĞRULANMADI$/);
  }
});

test('temizlenmiş paketle yükleme (build.py gömme biçimi) ham yüklemeyle aynı metni verir (tüm kablolar)', () => {
  const paket = {
    surum: 1, imza: 'x',
    sekmeler: semalarJson.sekmeler,
    semalar: semalarJson.semalar,
    veri: Object.fromEntries(dosyali.map((s) => [s, KB.veri.temizle(ham[s])])),
  };
  const t = KB.veri.yukle(paket);
  assert.deepEqual(t.semaSirasi, db.semaSirasi);
  assert.deepEqual(t.istatistik, db.istatistik);
  for (const [g] of gruplar) {
    const yaz = yazilan(g);
    const a = KB.ara.ara(db, yaz).kablo.find((k) => (g.startsWith('no:') ? k.no === g.slice(3) : k.no === null && k.etiket === g.slice(7)));
    const ia = KB.izle.kablo(db, a.anahtar);
    const ib = KB.izle.kablo(t, a.anahtar);
    assert.equal(KB.metin.tamMetin(ib), KB.metin.tamMetin(ia), g);
  }
});
