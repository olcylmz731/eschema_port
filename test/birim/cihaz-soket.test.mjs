// KB.cihazSorgu / KB.soketSorgu (API.md §5) ve arama öğelerindeki cihaz/soket özetleri
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, K, cz, sema, yukle, kod } from './yardimci.mjs';
import { duzJson } from './degismezler.mjs';

// ---- veri --------------------------------------------------------------------------------------------
const cs = sema('cs', {
  dogrulandi: false,
  cihazlar: [
    cz('51A01', 'beyin', 'Steuergeraet Fuenf', ['3'], 'Kapı 5 beyni'),
    cz('51A02', 'beyin', 'Fahrpult Fuenf', ['10'], 'FPS 5'),
    cz('51A03', 'beyin', 'Fahrpult Sechs', ['11'], 'FPS 6'),
    cz('51A04', 'beyin', 'Steuergeraet Vier', ['12']),
    cz('51B01', 'sensor', 'Sensor Eins', ['20']),
    cz('51B02', 'sensor', 'Sensor Zwei', ['21']),
    cz('51G01', 'guc', 'Generator', ['30']),
    cz('51R01', 'direnc', 'Widerstand', ['40']),
  ],
  kablolar: [
    // 51A01 soket 15: pinler 1, 2, 3, 10, 11 (doğal sıra 1,2,3,10,11; metin sırası 1,10,11,2,3 olmamalı)
    K('s1', '5001', [C('51A01', '15', '1', 'EIN1'), C('51B01', '3', '1')]),
    K('s2', '5002', [C('51A01', '15', '2', 'EIN2'), S('X51.1', '1')]),
    K('s3', '5003', [S('X51.1', '1'), C('51B02', '3', '2')]),
    K('s4', '5004', [C('51A01', '15', '3'), C('51B01', '3', '3')]),
    K('s5', '5004', [C('51A01', '15', '3'), C('51B02', '3', '3')]),
    K('s6', '5010', [C('51A01', '15', '10'), C('51B01', '3', '10')]),
    K('s7', '5011', [C('51A01', '15', '11'), C('51B01', '3', '11')]),
    // soket 9: CAN sonlandırma köprüsü (aynı soket içinde)
    K('s8', '5060', [C('51A01', '9', '5', 'CANRS'), C('51A01', '9', '6', 'CANLS')]),
    // soket 18: tek pin
    K('s9', '5018', [C('51A01', '18', '3', 'X3'), C('51B02', '3', '18')]),
    // 51A04: okunamayan pin ve adresi yazılmayan uç
    K('s10', '5070', [C('51A04', '15', '1?'), C('51B01', '3', '12')]),
    K('s11', '5071', [C('51A04', null, null), C('51B01', '3', '13')]),
    // IV-18 iki cihazda (FPS 5 ve FPS 6)
    K('s12', '5100', [C('51A02', 'IV-18', '10', 'HS10'), C('51B01', '3', '20')]),
    K('s13', '5101', [C('51A02', 'IV-18', '2', 'LO2'), C('51B01', '3', '21')]),
    K('s14', '5102', [C('51A02', 'IV-18', '11'), C('51B01', '3', '22')]),
    K('s15', '5103', [C('51A03', 'IV-18', '10', 'HS10'), C('51B02', '3', '21')]),
    // soketsiz güç cihazı: B+, B-, D+, DF ve cihaz içi köprü D+ ↔ DF
    K('s16', '5200', [C('51G01', null, 'B+'), C('51B01', '3', '30')]),
    K('s17', '5201', [C('51G01', null, 'D+'), C('51B01', '3', '31')]),
    K('s18', '5202', [C('51G01', null, 'B-'), C('51B02', '3', '30')]),
    K('s19', null, [C('51G01', null, 'D+'), C('51G01', null, 'DF')], [1, '30', 'A'], { ic: true }),
    K('s20', '5203', [C('51G01', null, 'DF'), C('51B02', '3', '31')]),
    // geçiş bileşeni: direnç 51R01 (pin 1, 2)
    K('s21', '5300', [C('51B01', '3', '40'), C('51R01', null, '1')]),
    K('s22', '5301', [C('51R01', null, '2'), C('51B02', '3', '40')]),
    // kendine dönen: X51.9 pin 1
    K('s23', '5400', [S('X51.9', '1'), S('X51.9', '1')], [1, '40', 'A'], { varyant: true }),
    K('s24', '5401', [C('51B01', '3', '50'), S('X51.9', '1')]),
    K('s25', '5402', [S('X51.9', '1'), C('51B02', '3', '50')]),
  ],
});
const db = yukle([cs]);

const satirlar = (q) => q.soketler.flatMap((g) => g.satirlar);
const grup = (q, soket) => q.soketler.find((g) => g.soket === soket);
const pinler = (g) => g.satirlar.map((s) => s.pin);

// ---- cihaz sorgusu ----------------------------------------------------------------------------------------
test('cihaz sorgusu: soketler doğal sırada (9, 15, 18), pinler doğal sırada (1, 2, 3, 10, 11)', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01');
  assert.ok(q);
  assert.equal(q.tur, 'cihaz');
  assert.equal(q.cihaz.kod, '51A01');
  assert.equal(q.cihaz.kisaAd, 'Kapı 5 beyni');
  assert.equal(q.cihaz.cihazTur, 'beyin');
  assert.deepEqual(q.soketler.map((g) => g.soket), ['9', '15', '18']);
  assert.deepEqual(pinler(grup(q, '9')), ['5', '6']);
  assert.deepEqual(pinler(grup(q, '15')), ['1', '2', '3', '10', '11']);
  assert.deepEqual(pinler(grup(q, '18')), ['3']);
  assert.equal(q.satirSayisi, 8);
  assert.equal(grup(q, '9').pinSayisi, 9, 'soket adından: 9 pinli');
  assert.equal(grup(q, '15').pinSayisi, 15);
  assert.equal(grup(q, '18').pinSayisi, 18);
});

test('cihaz sorgusu: kod normalize edilir, ad kabul edilmez, olmayan cihaz null', () => {
  assert.equal(KB.cihazSorgu.cihaz(db, '51a01').cihaz.kod, '51A01');
  assert.equal(KB.cihazSorgu.cihaz(db, ' 51 A01 ').cihaz.kod, '51A01');
  assert.equal(KB.cihazSorgu.cihaz(db, 'FPS 5'), null, "'FPS 5' ad, kod değil");
  assert.equal(KB.cihazSorgu.cihaz(db, '99Z99'), null);
  assert.equal(KB.cihazSorgu.cihaz(db, ''), null);
  assert.equal(KB.cihazSorgu.cihaz(db, null), null);
});

test('pin satırı: zincirin ilk kolu, karşı uç, varış ve ara düğümler (5001: doğrudan, 5002: ara soketli)', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01');
  const g = grup(q, '15');
  const p1 = g.satirlar.find((s) => s.pin === '1');
  assert.equal(p1.soket, '15');
  assert.equal(p1.pinAdi, 'EIN1');
  assert.equal(p1.kablolar.length, 1);
  const k1 = p1.kablolar[0];
  assert.equal(k1.kenar.etiket, '5001');
  assert.equal(kod(k1.karsiUc), '51B01 3/1');
  assert.deepEqual(k1.varis.map(kod), ['51B01 3/1']);
  assert.deepEqual(k1.ara, []);
  assert.equal(k1.dal, false);
  assert.equal(k1.sanal, false);
  assert.equal(k1.ic, false);
  assert.deepEqual(k1.gecisler, []);

  const p2 = g.satirlar.find((s) => s.pin === '2');
  const k2 = p2.kablolar[0];
  assert.equal(k2.kenar.etiket, '5002');
  assert.equal(kod(k2.karsiUc), 'X51.1/1');
  assert.deepEqual(k2.ara.map(kod), ['X51.1/1']);
  assert.deepEqual(k2.varis.map(kod), ['51B02 3/2']);
});

test('pin satırı: pinde iki aynı numaralı parça → iki kol (dallanma)', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01');
  const p3 = grup(q, '15').satirlar.find((s) => s.pin === '3');
  assert.equal(p3.kablolar.length, 2);
  assert.deepEqual(p3.kablolar.map((k) => kod(k.karsiUc)).sort(), ['51B01 3/3', '51B02 3/3']);
  assert.ok(p3.kablolar.every((k) => k.kenar.etiket === '5004'));
});

test('aynı soket içinde köprü: iki pinde de satır var, karşı uç öbür pin', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01');
  const g = grup(q, '9');
  const p5 = g.satirlar.find((s) => s.pin === '5');
  const p6 = g.satirlar.find((s) => s.pin === '6');
  assert.equal(p5.pinAdi, 'CANRS');
  assert.equal(p6.pinAdi, 'CANLS');
  assert.equal(p5.kablolar.length, 1);
  assert.equal(p5.kablolar[0].kenar.etiket, '5060');
  assert.equal(p5.kablolar[0].kenar.soketIci, true);
  assert.equal(kod(p5.kablolar[0].karsiUc), '51A01 9/6');
  assert.equal(kod(p6.kablolar[0].karsiUc), '51A01 9/5');
});

test('okunamayan pin ("1?") kendi satırında, belirsiz:true; pini yazılmayan uç kendi satırında, pin:null', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A04');
  assert.ok(q);
  const hepsi = satirlar(q);
  assert.equal(hepsi.length, 2);
  const soru = hepsi.find((s) => s.pin === '1?');
  assert.ok(soru, 'pin "1?" satırı yok');
  assert.equal(soru.belirsiz, true);
  assert.equal(soru.soket, '15');
  assert.equal(q.supheli, true);
  const adressiz = hepsi.find((s) => s.pin === null);
  assert.ok(adressiz, 'pini yazılmayan uç için satır yok');
  assert.equal(adressiz.soket, null);
  assert.ok(adressiz.uc.parca, 'pin yoksa uc = { parca, uc }');
  assert.equal(typeof adressiz.uc.uc, 'number');
  // soketsiz grup (soket:null) sonda
  assert.equal(q.soketler[q.soketler.length - 1].soket, null);
  assert.equal(q.soketler[0].soket, '15');
});

test('her pin satırının uc alanı KB.izle.uc ile tam iz verir (başlangıç = o pin)', () => {
  for (const kodu of ['51A01', '51A02', '51A04', '51G01', '51R01']) {
    const q = KB.cihazSorgu.cihaz(db, kodu);
    for (const s of satirlar(q)) {
      const r = KB.izle.uc(db, s.uc);
      assert.ok(r, `${kodu} satır ${JSON.stringify(s.uc)}: izle.uc null`);
      const b = r.bilesenler[0];
      const d = r.dugumler.find((x) => x.id === b.baslangic);
      if (s.uc.cihaz) {
        assert.equal(d.cihaz, kodu);
        assert.equal(d.pin, s.pin);
        assert.equal(d.soket, s.soket);
      }
    }
  }
});

test('soketsiz cihaz (güç): tek grup soket:null; pinler B+, B-, D+, DF', () => {
  const q = KB.cihazSorgu.cihaz(db, '51G01');
  assert.equal(q.soketler.length, 1);
  assert.equal(q.soketler[0].soket, null);
  assert.equal(q.soketler[0].pinSayisi, null);
  const p = pinler(q.soketler[0]);
  assert.deepEqual(p.slice().sort(), ['B+', 'B-', 'D+', 'DF']);
  assert.ok(p.indexOf('D+') < p.indexOf('DF'));
  assert.ok(Math.max(p.indexOf('B+'), p.indexOf('B-')) < Math.min(p.indexOf('D+'), p.indexOf('DF')), `sıra: ${p}`);
});

test('cihaz içi köprü: D+ satırında ic:true kol (karşı uç DF), varışta DF pini ve ötesi', () => {
  const q = KB.cihazSorgu.cihaz(db, '51G01');
  const dp = q.soketler[0].satirlar.find((s) => s.pin === 'D+');
  assert.equal(dp.kablolar.length, 2);
  const ic = dp.kablolar.find((k) => k.ic);
  const normal = dp.kablolar.find((k) => !k.ic);
  assert.ok(ic && normal);
  assert.equal(ic.kenar.ic, true);
  assert.equal(kod(ic.karsiUc), '51G01 -/DF');
  // varış = yapraklar + geçiş terminali olmayan cihaz pinleri (devamı olsa bile, API.md §5): DF pininin kendisi ve ötesindeki 5203 yaprağı
  assert.deepEqual(ic.varis.map(kod).sort(), ['51B02 3/31', '51G01 -/DF']);
  assert.equal(normal.kenar.etiket, '5201');
  assert.deepEqual(normal.varis.map(kod), ['51B01 3/31']);
  const df = q.soketler[0].satirlar.find((s) => s.pin === 'DF');
  assert.ok(df.kablolar.some((k) => k.ic && kod(k.karsiUc) === '51G01 -/D+'));
});

test('geçiş bileşeni cihazı: sanal kol, gecisler, karşı uç gecisUcu', () => {
  const q = KB.cihazSorgu.cihaz(db, '51R01');
  assert.equal(q.cihaz.gecis, true);
  assert.equal(q.soketler.length, 1);
  const p1 = q.soketler[0].satirlar.find((s) => s.pin === '1');
  assert.equal(p1.kablolar.length, 2);
  const sanal = p1.kablolar.find((k) => k.sanal);
  const gercek = p1.kablolar.find((k) => !k.sanal);
  assert.equal(gercek.kenar.etiket, '5300');
  assert.deepEqual(gercek.varis.map(kod), ['51B01 3/40']);
  assert.equal(sanal.kenar.sanal, true);
  assert.equal(kod(sanal.karsiUc), '51R01 -/2');
  assert.equal(sanal.karsiUc.gecisUcu, true);
  assert.deepEqual(sanal.varis.map(kod), ['51B02 3/40']);
  assert.equal(sanal.gecisler.length, 1);
  assert.equal(sanal.gecisler[0].kod, '51R01');
  assert.equal(sanal.gecisler[0].tur, 'direnc');
  assert.equal(sanal.gecisler[0].turAd, 'direnç');
});

test('cihaz sorgusu çıktısı düz JSON; bayraklar ve kaynaklar dolu', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01');
  assert.deepEqual(duzJson(q), []);
  assert.equal(q.dogrulandi, false);
  assert.deepEqual(q.dogrulanmamisSemalar, ['cs']);
  assert.equal(q.supheli, false);
  assert.ok(Array.isArray(q.uyarilar));
  assert.ok(q.kaynaklar.length >= 1);
  assert.ok(q.kaynaklar.every((k) => k.sema === 'cs'));
});

test('cihaz sorgusu semalar süzgeci: olmayan şemada boş cihaz ya da null', () => {
  const q = KB.cihazSorgu.cihaz(db, '51A01', { semalar: ['yok'] });
  assert.ok(q === null || q.satirSayisi === 0);
});

// ---- soket sorgusu -------------------------------------------------------------------------------------------
test("soket sorgusu: 'IV-18' iki cihazda (FPS 5, FPS 6) → iki eşleşme; pinler doğal sırada", () => {
  const q = KB.soketSorgu.soket(db, 'IV-18');
  assert.ok(q);
  assert.equal(q.tur, 'soket');
  assert.equal(q.soket, 'IV-18');
  assert.deepEqual(q.eslesmeler.map((e) => e.cihaz.kod).sort(), ['51A02', '51A03']);
  const e2 = q.eslesmeler.find((e) => e.cihaz.kod === '51A02');
  assert.deepEqual(e2.satirlar.map((s) => s.pin), ['2', '10', '11']);
  assert.equal(e2.ara, false);
  assert.equal(e2.pinSayisi, 18);
  assert.equal(e2.satirlar.find((s) => s.pin === '10').pinAdi, 'HS10');
  const e3 = q.eslesmeler.find((e) => e.cihaz.kod === '51A03');
  assert.deepEqual(e3.satirlar.map((s) => s.pin), ['10']);
});

test('soket sorgusu: yazım biçimleri ve cihaz süzgeci', () => {
  for (const ad of ['iv-18', 'İV-18', 'ıv18', 'IV 18']) {
    const q = KB.soketSorgu.soket(db, ad);
    assert.ok(q, ad);
    assert.equal(q.eslesmeler.length, 2, ad);
  }
  const tek = KB.soketSorgu.soket(db, 'IV-18', { cihaz: '51A02' });
  assert.equal(tek.eslesmeler.length, 1);
  assert.equal(tek.eslesmeler[0].cihaz.kod, '51A02');
  const tek2 = KB.soketSorgu.soket(db, 'IV-18', { cihaz: '51a03' });
  assert.equal(tek2.eslesmeler.length, 1);
  assert.equal(tek2.eslesmeler[0].cihaz.kod, '51A03');
  assert.equal(KB.soketSorgu.soket(db, 'YOK-99'), null);
  assert.equal(KB.soketSorgu.soket(db, ''), null);
  assert.equal(KB.soketSorgu.soket(db, 'IV-18', { cihaz: '51B01' }), null, '51B01 in IV-18 soketi yok');
});

test('ara soket sorgusu: cihaz yok, ara:true, pinSayisi null; pinin iki yanı iki kol', () => {
  const q = KB.soketSorgu.soket(db, 'X51.1');
  assert.ok(q);
  assert.equal(q.eslesmeler.length, 1);
  const e = q.eslesmeler[0];
  assert.equal(e.ara, true);
  assert.equal(e.cihaz, null);
  assert.equal(e.pinSayisi, null);
  assert.deepEqual(e.satirlar.map((s) => s.pin), ['1']);
  const kollar = e.satirlar[0].kablolar;
  assert.equal(kollar.length, 2);
  assert.deepEqual(kollar.map((k) => kod(k.karsiUc)).sort(), ['51A01 15/2', '51B02 3/2']);
  assert.deepEqual(kollar.map((k) => k.kenar.etiket).sort(), ['5002', '5003']);
  assert.deepEqual(e.satirlar[0].uc, { soket: 'X51.1', pin: '1' });
});

test('kendine dönen: ayrı listede, kol sayılmaz; kollar yalnız gerçek komşular', () => {
  const q = KB.soketSorgu.soket(db, 'X51.9');
  const s = q.eslesmeler[0].satirlar.find((x) => x.pin === '1');
  assert.equal(s.kablolar.length, 2);
  assert.deepEqual(s.kablolar.map((k) => k.kenar.etiket).sort(), ['5401', '5402']);
  assert.equal(s.kendineDonen.length, 1);
  assert.equal(s.kendineDonen[0].etiket, '5400');
  assert.equal(s.kendineDonen[0].varyant, true);
  assert.equal(s.kendineDonen[0].kendineDonen, true);
});

test('soket sorgusu çıktısı düz JSON, bayraklar', () => {
  const q = KB.soketSorgu.soket(db, 'IV-18');
  assert.deepEqual(duzJson(q), []);
  assert.equal(q.dogrulandi, false);
  assert.deepEqual(q.dogrulanmamisSemalar, ['cs']);
  assert.equal(typeof q.supheli, 'boolean');
});

test('aynı kod cihaz sorgusunda da soket sorgusunda tutarlı: bir cihazın soket grubu = soket sorgusunun o cihazlı eşleşmesi', () => {
  const c = KB.cihazSorgu.cihaz(db, '51A02');
  const g = grup(c, 'IV-18');
  const s = KB.soketSorgu.soket(db, 'IV-18', { cihaz: '51A02' }).eslesmeler[0];
  assert.deepEqual(g.satirlar.map((x) => x.pin), s.satirlar.map((x) => x.pin));
  assert.deepEqual(g.satirlar.map((x) => x.kablolar.map((k) => k.kenar.etiket)), s.satirlar.map((x) => x.kablolar.map((k) => k.kenar.etiket)));
});

// ---- arama öğelerindeki cihaz / soket özetleri ------------------------------------------------------------------
test('arama Cihaz öğesi: soketSayisi, pinSayisi (kablosu olan pin), yol, semalar', () => {
  const c = KB.ara.ara(db, '51A01').cihaz[0];
  assert.equal(c.kod, '51A01');
  assert.equal(c.soketSayisi, 3);
  assert.equal(c.pinSayisi, 8, 'kablosu olan pin: soket 9 → 2, soket 15 → 5, soket 18 → 1');
  assert.deepEqual(c.yol, { cs: ['3'] });
  assert.deepEqual(c.semalar, ['cs']);
  assert.equal(c.kisaAd, 'Kapı 5 beyni');
  assert.equal(c.adDe, 'Steuergeraet Fuenf');
  assert.equal(c.cihazBilinmiyor, false);
  const g = KB.ara.ara(db, '51G01').cihaz[0];
  assert.equal(g.pinSayisi, 4);
});

test('arama Soket öğesi: pinSayisi soket adından, bagliPinSayisi kablosu olan pin', () => {
  const s = KB.ara.ara(db, 'IV-18').soket;
  assert.equal(s.length, 2);
  const a = s.find((x) => x.cihaz === '51A02');
  const b = s.find((x) => x.cihaz === '51A03');
  assert.equal(a.pinSayisi, 18);
  assert.equal(a.bagliPinSayisi, 3);
  assert.equal(a.cihazKisaAd, 'FPS 5');
  assert.equal(a.cihazTur, 'beyin');
  assert.equal(a.ara, false);
  assert.equal(b.bagliPinSayisi, 1);
  const ara = KB.ara.ara(db, 'X51.1').soket[0];
  assert.equal(ara.ara, true);
  assert.equal(ara.cihaz, null);
  assert.equal(ara.cihazKisaAd, null);
  assert.equal(ara.cihazTur, null);
  assert.equal(ara.pinSayisi, null);
  assert.equal(ara.bagliPinSayisi, 1);
  // "15" soketinin pin sayısı adından: 15
  assert.equal(KB.ara.ara(db, '15').soket.find((x) => x.cihaz === '51A01').pinSayisi, 15);
});

test('KB.izle.kollar: ilk bileşenin kökünden çıkan kollar (pin sorgusu izinden)', () => {
  const r = KB.izle.uc(db, { cihaz: '51A01', soket: '15', pin: '2' });
  const k = KB.izle.kollar(r);
  assert.equal(k.length, 1);
  assert.equal(k[0].kenar.etiket, '5002');
  assert.equal(kod(k[0].karsiUc), 'X51.1/1');
  assert.deepEqual(k[0].ara.map(kod), ['X51.1/1']);
  assert.deepEqual(k[0].varis.map(kod), ['51B02 3/2']);
  assert.equal(k[0].dal, false);
  assert.equal(k[0].sanal, false);
  assert.equal(k[0].ic, false);
  assert.deepEqual(k[0].gecisler, []);
  // iki kollu pin (5004 dallanması)
  const k3 = KB.izle.kollar(KB.izle.uc(db, { cihaz: '51A01', soket: '15', pin: '3' }));
  assert.equal(k3.length, 2);
  // ara soketin iki yanı
  const ks = KB.izle.kollar(KB.izle.uc(db, { soket: 'X51.1', pin: '1' }));
  assert.deepEqual(ks.map((x) => kod(x.karsiUc)).sort(), ['51A01 15/2', '51B02 3/2']);
});
