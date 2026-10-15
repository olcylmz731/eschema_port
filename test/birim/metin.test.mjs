// KB.metin: düz metin özeti biçimi (API.md §6). Beklenen satırlar elle yazıldı.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, D, V, K, cz, sema, yukle, kod } from './yardimci.mjs';
import { izKontrol } from './degismezler.mjs';

const TUR = { A: 'beyin', B: 'sensor', E: 'lamba', F: 'sigorta', G: 'guc', K: 'role', M: 'motor', R: 'direnc', S: 'salter', V: 'diyot', X: 'soket', Z: 'dugum' };
const cl = (...kodlar) => kodlar.map((k) => cz(k, TUR[/^\d+([A-Z])/.exec(k)[1]], 'Test ' + k, ['1']));

// ---- veri ------------------------------------------------------------------------------------------
const m1 = sema('m1', {
  dogrulandi: false,
  varsayilan: { renk: 'ws', kesit: '0.75', ham: 'TEST' },
  cihazlar: [
    cz('99A01', 'beyin', 'Steuergeraet', ['3'], 'Sahte Beyin 1'),
    cz('99A02', 'beyin', 'Fahrpult', ['10'], 'Sahte FPS 2'),
    cz('99S01', 'salter', 'Schalter', ['20'], 'Test şalteri'),
    cz('71A01', 'beyin', 'Steuergeraet', ['1'], 'Test Beyin'),
    cz('99G01', 'guc', 'Generator', ['5']),
    cz('99X01', 'besleme', 'Verteiler', ['6']),
    cz('99G02', 'guc', 'Generator', ['7']),
    ...cl('71B01', '72B01', '72B02', '72B03', '72Z07', '73A01', '73B01', '73B02', '73B03', '83A01', '86B01', '86R01', '86R02', '86V01', '85B01', '85B02', '82B01'),
  ],
  kablolar: [
    // T1: zincir, numara ara soketten sonra değişir
    K('t1a', '7001', [C('71B01', '3', '7'), S('X71.1', '4')]),
    K('t1b', '7001', [S('X71.1', '4'), C('71A01', '15', '5', 'NHB')]),
    K('t1c', '7010', [C('71B01', '3', '8'), S('X71.2', '1')]),
    K('t1d', '7011', [S('X71.2', '1'), C('71A01', '15', '6')]),
    // T2: FPS tarzı
    K('t2a', '4002', [C('99A02', 'IV-18', '10', 'HS10'), S('X99.1', '4')], [1, '24', 'A']),
    K('t2b', '4002', [S('X99.1', '4'), C('99A01', '15', '5', 'NHB')], [1, '24', 'B']),
    // T3: soketsiz uçlar, numarasız
    K('t3', '70sw', [C('99G01', null, 'B+'), C('99X01', null, '30')], [1, '30', 'A'], { kesit: '70', renk: 'sw' }),
    // T4: okunamayan pin (kenar şüpheli değil)
    K('t4', '8085', [C('99A01', '15', '1?'), C('71B01', '3', '1')]),
    // T5: adresi hiç yazılmayan uç
    K('t5', '7505', [C('72B03', null, null), C('72B01', '3', '1')]),
    // T6: dallar
    K('t6a', '7100', [C('99A01', '15', '7', 'LI1'), D('72Z07')]),
    K('t6b', '7100', [D('72Z07'), C('72B01', '3', '2')]),
    K('t6c', '7100', [D('72Z07'), C('72B02', '3', '2')]),
    K('t6d', '7101', [C('72B01', '3', '3'), D('~d1')]),
    K('t6e', '7101', [D('~d1'), C('72B02', '3', '3')]),
    K('t6f', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B01', '3', '2')]),
    K('t6g', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B02', '3', '2')]),
    K('t6h', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B03', '3', '2')]),
    // T7: devam
    K('t7a', '7400', [C('99A01', '15', '16'), V({ cihaz: '99Q99' })]),
    K('t7b', '7440', [C('99A01', '15', '19'), V({ hedef: '74' })]),
    K('t7c', '7441', [C('99A02', 'IV-18', '13'), V({ hedef: '74' })]),
    K('t7d', '7441', [C('99A01', '15', '21'), V({ hedef: '54' })]),
    // T8: geçiş bileşenleri
    K('t8a', '8101', [C('99A01', '15', '1', 'EIN1'), C('99S01', null, '13')]),
    K('t8b', '8102', [C('99S01', null, '14'), C('99A02', 'IV-18', '2', 'LO2')]),
    K('t8c', '7600', [C('86B01', '3', '12'), C('86R01', null, '1')]),
    K('t8d', '7601', [C('86R01', null, '2'), C('99A01', '15', '13')]),
    K('t8e', '7610', [C('86B01', '3', '13'), C('86V01', null, '2')]),
    K('t8f', '7611', [C('86V01', null, '1'), C('99A01', '15', '14')]),
    K('t8g', '7690', [C('86B01', '3', '21'), C('86R02', null, null)]),
    K('t8h', '7691', [C('86R02', null, null), C('99A01', '15', '22')]),
    // T9: cihaz içi köprü
    K('t9a', '7710', [C('99G02', null, 'D+'), C('85B01', '3', '23')]),
    K('t9b', '7711', [C('99G02', null, 'DF'), C('85B02', '3', '23')]),
    K('t9c', null, [C('99G02', null, 'DF'), C('99G02', null, 'D+')], [1, '30', 'A'], { ic: true }),
    // T10: aynı soket içinde köprü
    K('t10', '7900', [C('83A01', '9', '5', 'CANRS'), C('83A01', '9', '6', 'CANLS')]),
    // T11: kendine dönen
    K('t11a', '7800', [S('X72.1', '1'), S('X72.1', '1')], [1, '40', 'A'], { varyant: true }),
    K('t11b', '7801', [C('99A01', '15', '24'), S('X72.1', '1')]),
    K('t11c', '7802', [S('X72.1', '1'), C('82B01', '3', '24')]),
    // T12: varyant
    K('t12', '7300', [C('72B01', '3', '4'), C('72B02', '3', '4')], [1, '12', 'A'], { varyant: true }),
    // T13: çelişki
    K('t13a', '8010', [C('99A01', '15', '20'), C('72B01', '3', '6')], [1, '22', 'D']),
    K('t13b', '8011', [C('99A01', '15', '20'), C('72B02', '3', '6')], [1, '23', 'D']),
    // T14: renk / kesit / şüphe
    K('t14a', '7950', [C('72B01', '3', '10'), C('72B02', '3', '10')], [1, '24', 'A']),
    K('t14b', '7951', [C('72B01', '3', '11'), C('72B02', '3', '11')], [1, '24', 'B'], { renk: 'sw/rt', kesit: '1' }),
    K('t14c', '7952', [C('72B01', '3', '12'), C('72B02', '3', '12')], [1, '24', 'C'], {
      varyant: true,
      durum: 'suphe',
      suphe: { soru: 'Kablo 7952 ?', A: 'a', B: 'b', kirpinti: 'yok.png' },
    }),
    K('t14d', '2,5-7953', [C('72B01', '3', '13'), C('72B02', '3', '13')], [1, '24', 'D'], { renk: 'gn' }),
  ],
});
const m2 = sema('m2', {
  dogrulandi: true,
  cihazlar: cl('72B01', '72B02'),
  kablolar: [K('v1', '7960', [C('72B01', '3', '20'), C('72B02', '3', '20')], [2, '9', 'B'])],
});
const db = yukle([m1, m2]);

function iz(no, opts) {
  const r = KB.izle.kablo(db, no, opts);
  assert.notEqual(r, null, `kablo ${no} bulunamadı`);
  const ih = izKontrol(r);
  assert.deepEqual(ih, [], `kablo ${no}: yapısal değişmez ihlali\n  ${ih.join('\n  ')}`);
  return r;
}
const ozet = (no, opts) => KB.metin.ozet(iz(no, opts?.iz), opts?.metin);

// ---- cihaz ucu: soket ve pin her zaman --------------------------------------------------------------
test('zincir: kısa adı olan cihaz "kısaAd (kod)", yoksa yalnız kod; soket ve pin her cihaz ucunda; ara soket "X pin N"', () => {
  assert.equal(ozet('7001'), 'Kablo 7001 · 71B01 soket 3 pin 7 → X71.1 pin 4 → Test Beyin (71A01) soket 15 pin 5 (NHB)');
});

test('FPS tarzı: soket IV-18 pin 10 (HS10) biçimi', () => {
  assert.equal(
    ozet('4002', { iz: { baslangic: '99A02' } }),
    'Kablo 4002 · Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10) → X99.1 pin 4 → Sahte Beyin 1 (99A01) soket 15 pin 5 (NHB)'
  );
  // yön çevrilince metin de çevrilir
  assert.equal(
    ozet('4002', { iz: { baslangic: '99A01' } }),
    'Kablo 4002 · Sahte Beyin 1 (99A01) soket 15 pin 5 (NHB) → X99.1 pin 4 → Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10)'
  );
});

test('soketsiz cihaz ucu: "pin B+" (soket sözcüğü yok)', () => {
  assert.equal(ozet('70sw'), 'Kablo 70sw · 99G01 pin B+ → 99X01 pin 30');
});

test('KB.metin.dugum: tek düğümün metni', () => {
  const r = iz('4002', { baslangic: '99A02' });
  const d = r.dugumler.find((x) => x.cihaz === '99A02');
  assert.equal(KB.metin.dugum(d), 'Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10)');
  const s = r.dugumler.find((x) => x.tur === 'soket');
  assert.equal(KB.metin.dugum(s), 'X99.1 pin 4');
});

test("okunamayan karakter '?' kalır ve düğümün sonuna [şüpheli] eklenir", () => {
  assert.equal(ozet('8085'), 'Kablo 8085 · 71B01 soket 3 pin 1 → Sahte Beyin 1 (99A01) soket 15 pin 1? [şüpheli]');
});

test('şemada soket/pin hiç yazmıyorsa "(soket/pin şemada yazılı değil)"', () => {
  assert.equal(ozet('7505'), 'Kablo 7505 · 72B01 soket 3 pin 1 → 72B03 (soket/pin şemada yazılı değil)');
});

// ---- ok etiketleri -----------------------------------------------------------------------------------
test('kenar etiketi başlıktaki kablodan farklıysa →[kablo N]→', () => {
  assert.equal(ozet('7010'), 'Kablo 7010 · 71B01 soket 3 pin 8 → X71.2 pin 1 →[kablo 7011]→ Test Beyin (71A01) soket 15 pin 6');
});

test('numara ara soketten sonra değişince yeniden etiketlenir (başlık 7011: 7010 → 7011)', () => {
  assert.equal(ozet('7011'), 'Kablo 7011 · 71B01 soket 3 pin 8 →[kablo 7010]→ X71.2 pin 1 →[kablo 7011]→ Test Beyin (71A01) soket 15 pin 6');
});

test('varyant kenar: →[varyant]→', () => {
  assert.equal(ozet('7300'), 'Kablo 7300 · 72B01 soket 3 pin 4 →[varyant]→ 72B02 soket 3 pin 4');
});

test('çelişkili izde satır sonunda [çelişki]', () => {
  assert.equal(ozet('8010'), 'Kablo 8010 · 72B01 soket 3 pin 6 → Sahte Beyin 1 (99A01) soket 15 pin 20 [çelişki]');
});

// ---- dallanma --------------------------------------------------------------------------------------------
test('dallanma: ana gövde bir satır, her dal altında girintili "dal N: → …"', () => {
  const s = KB.metin.satirlar(iz('7100'));
  assert.equal(s.length, 3);
  assert.equal(s[0], 'Kablo 7100 · 72B01 soket 3 pin 2 → ek noktası 72Z07, 2 dal');
  assert.match(s[1], /^ {2}dal 1: → /);
  assert.match(s[2], /^ {2}dal 2: → /);
  const dallar = [s[1].replace(/^ {2}dal 1: → /, ''), s[2].replace(/^ {2}dal 2: → /, '')].sort();
  assert.deepEqual(dallar, ['72B02 soket 3 pin 2', 'Sahte Beyin 1 (99A01) soket 15 pin 7 (LI1)'].sort());
  assert.equal(KB.metin.ozet(iz('7100')), s.join('\n'));
});

test('cihaz pininde dal: merkez cihaz metni ", 2 dal" ile biter', () => {
  const s = KB.metin.satirlar(iz('7200'));
  assert.equal(s.length, 3);
  assert.equal(s[0], 'Kablo 7200 · 73B01 soket 3 pin 2 → 73A01 soket 15 pin 9 (EIN1), 2 dal');
  assert.deepEqual(s.slice(1).sort(), ['  dal 1: → 73B02 soket 3 pin 2', '  dal 2: → 73B03 soket 3 pin 2']);
});

test('kodsuz ek noktası: "ek noktası (kodsuz)"', () => {
  assert.equal(ozet('7101'), 'Kablo 7101 · 72B01 soket 3 pin 3 → ek noktası (kodsuz) → 72B02 soket 3 pin 3');
});

test('birden çok bileşen: her satır "parça N:" ile', () => {
  const s = KB.metin.satirlar(iz('7441'));
  assert.equal(s.length, 2);
  assert.ok(s[0].startsWith('Kablo 7441 · parça 1: '), s[0]);
  assert.ok(s[1].startsWith('Kablo 7441 · parça 2: '), s[1]);
  const govde = s.map((x) => x.replace(/^Kablo 7441 · parça \d: /, '')).sort();
  assert.deepEqual(govde, [
    'Sahte Beyin 1 (99A01) soket 15 pin 21 → devam: yol 54 (aynı sayfada devam ediyor)',
    'Sahte FPS 2 (99A02) soket IV-18 pin 13 → devam: yol 74 (aynı sayfada devam ediyor)',
  ]);
});

// ---- devam ------------------------------------------------------------------------------------------------
test('sayfa içi devam: "devam: yol 74 (aynı sayfada devam ediyor)"', () => {
  assert.equal(ozet('7440'), 'Kablo 7440 · Sahte Beyin 1 (99A01) soket 15 pin 19 → devam: yol 74 (aynı sayfada devam ediyor)');
});

test('çözülmeyen devam: hedef cihaz ve "başka şemada, verisi yok"', () => {
  const m = ozet('7400');
  assert.ok(m.startsWith('Kablo 7400 · Sahte Beyin 1 (99A01) soket 15 pin 16 → '), m);
  // API.md §6 "devam → 99Q99", §12 örneği "devam: 99Q99": ikisi de kabul
  assert.match(m, /devam(:| →) 99Q99 \(başka şemada, verisi yok\)$/);
});

// ---- geçiş bileşenleri -----------------------------------------------------------------------------------
test('geçiş bileşeni iki terminaliyle tek öğe: kısa adlı şalter "Test şalteri (99S01, şalter) pin 13–14"', () => {
  assert.equal(
    ozet('8101'),
    'Kablo 8101 · Sahte Beyin 1 (99A01) soket 15 pin 1 (EIN1) → Test şalteri (99S01, şalter) pin 13–14 →[kablo 8102]→ Sahte FPS 2 (99A02) soket IV-18 pin 2 (LO2)'
  );
});

test('direnç ve diyot: pinliyse "pin a–b" (yolda önce gelen terminal önce); pin adsızsa pin yok', () => {
  assert.equal(ozet('7600'), 'Kablo 7600 · 86B01 soket 3 pin 12 → 86R01 (direnç) pin 1–2 →[kablo 7601]→ Sahte Beyin 1 (99A01) soket 15 pin 13');
  assert.equal(ozet('7610'), 'Kablo 7610 · 86B01 soket 3 pin 13 → 86V01 (diyot) pin 2–1 →[kablo 7611]→ Sahte Beyin 1 (99A01) soket 15 pin 14');
  assert.equal(ozet('7690'), 'Kablo 7690 · 86B01 soket 3 pin 21 → 86R02 (direnç) →[kablo 7691]→ Sahte Beyin 1 (99A01) soket 15 pin 22');
});

test('KB.metin.bilesen ve sanal kenar metni', () => {
  const r = iz('8101');
  const sanal = r.kenarlar.find((e) => e.sanal);
  assert.equal(KB.metin.bilesen(sanal.bilesen), 'Test şalteri (99S01, şalter)');
  assert.equal(KB.metin.kenar(sanal), 'Test şalteri (99S01, şalter) · geçiş bileşeni (kablo değil)');
  const d = iz('7600').kenarlar.find((e) => e.sanal);
  assert.equal(KB.metin.bilesen(d.bilesen), '86R01 (direnç)');
  assert.equal(KB.metin.kenar(d), '86R01 (direnç) · geçiş bileşeni (kablo değil)');
});

test('sanal kenar özellik satırı üretmez (kablo değil)', () => {
  const r = iz('8101');
  const o = KB.metin.ozellikler(r);
  assert.equal(o.length, 2, JSON.stringify(o));
  assert.ok(o.every((x) => !x.includes('geçiş bileşeni')));
});

// ---- cihaz içi köprü, soket içi köprü, kendine dönen ---------------------------------------------------------
test('cihaz içi köprü: →[cihaz içi]→, sonrasında numara etiketi', () => {
  assert.equal(
    ozet('7710'),
    'Kablo 7710 · 85B01 soket 3 pin 23 → 99G02 pin D+ →[cihaz içi]→ 99G02 pin DF →[kablo 7711]→ 85B02 soket 3 pin 23'
  );
});

test('cihaz içi köprü özelliği: "etiketsiz · cihaz içi bağlantı (kablo değil)"', () => {
  const r = iz('7710');
  const ic = r.kenarlar.find((e) => e.ic);
  assert.equal(KB.metin.kenar(ic), 'etiketsiz · cihaz içi bağlantı (kablo değil)');
  assert.ok(KB.metin.ozellikler(r).includes('etiketsiz · cihaz içi bağlantı (kablo değil)'));
  assert.equal(KB.metin.ozellikler(r).length, 3);
});

test('aynı soket içinde köprü: →[aynı soket içinde köprü]→', () => {
  assert.equal(
    ozet('7900', { iz: { baslangic: { cihaz: '83A01', soket: '9', pin: '5' } } }),
    'Kablo 7900 · 83A01 soket 9 pin 5 (CANRS) →[aynı soket içinde köprü]→ 83A01 soket 9 pin 6 (CANLS)'
  );
});

test('kendine dönen kablo: soket iki kez yazılmaz, düğümün sonunda parantez', () => {
  const m = ozet('7801');
  assert.equal(m, 'Kablo 7801 · 82B01 soket 3 pin 24 →[kablo 7802]→ X72.1 pin 1 (kendine dönen kablo 7800, varyant) →[kablo 7801]→ Sahte Beyin 1 (99A01) soket 15 pin 24');
  assert.equal((m.match(/X72\.1/g) || []).length, 1, 'soket iki kez yazılmamalı');
});

// ---- kenar özellikleri --------------------------------------------------------------------------------------
test('KB.metin.kenar: şema notundan gelen renk/kesit "(şema notu)" ile ayrı gösterilir', () => {
  const r = iz('7950');
  assert.equal(KB.metin.kenar(r.kenarlar[0]), '7950 · beyaz (ws, şema notu) · 0,75 mm² (şema notu)');
});

test('KB.metin.kenar: kablonun kendi rengi ve kesiti şema notu etiketi taşımaz', () => {
  const r = iz('7951');
  const m = KB.metin.kenar(r.kenarlar[0]);
  assert.ok(m.startsWith('7951 · '), m);
  assert.ok(m.includes('siyah-kırmızı (sw/rt)'), m);
  assert.ok(m.includes('1 mm²'), m);
  assert.ok(!m.includes('şema notu'), m);
  const r2 = iz('7953'); // 2,5-7953: kesit etikette, renk gn
  const m2 = KB.metin.kenar(r2.kenarlar[0]);
  assert.ok(m2.includes('yeşil (gn)'), m2);
  assert.ok(m2.includes('2,5 mm²'), m2);
  assert.ok(!m2.includes('şema notu'), m2);
});

test('KB.metin.kenar: varyant ve şüpheli sırası "… · varyant · ŞÜPHELİ"', () => {
  const r = iz('7952');
  assert.equal(KB.metin.kenar(r.kenarlar[0]), '7952 · beyaz (ws, şema notu) · 0,75 mm² (şema notu) · varyant · ŞÜPHELİ');
});

test('KB.metin.ozellikler: kenar başına bir satır, aynı sırayla (aynı özellikli kenarlar tek satıra iner)', () => {
  const r = iz('7010'); // iki farklı numara → iki ayrı satır
  const o = KB.metin.ozellikler(r);
  assert.equal(o.length, 2);
  assert.deepEqual(o, r.kenarlar.map((e) => KB.metin.kenar(e)));
  // 7001: iki kenar da "7001 · beyaz (ws, şema notu) · 0,75 mm² (şema notu)" → özdeş satırlar tekrarlanmaz
  const r1 = iz('7001');
  const o1 = KB.metin.ozellikler(r1);
  assert.deepEqual(o1, [...new Set(r1.kenarlar.map((e) => KB.metin.kenar(e)))]);
  assert.equal(o1.length, 1);
});

// ---- kaynaklar, uyarılar, tam metin ---------------------------------------------------------------------------
test('KB.metin.kaynak: doğrulanmamış şemada "· DOĞRULANMADI", doğrulanmışta yok', () => {
  const u = iz('7001').kaynaklar[0];
  assert.equal(KB.metin.kaynak(u), 'm1 stromlaufplan.pdf · sayfa 1 · yol 10 · satır A · DOĞRULANMADI');
  const d = iz('7960').kaynaklar[0];
  assert.equal(KB.metin.kaynak(d), 'm2 stromlaufplan.pdf · sayfa 2 · yol 9 · satır B');
});

test('KB.metin.kaynaklar: iz kaynaklarının metinleri', () => {
  const r = iz('4002');
  assert.deepEqual(KB.metin.kaynaklar(r), r.kaynaklar.map((k) => KB.metin.kaynak(k)));
  assert.equal(KB.metin.kaynaklar(r).length, 2);
});

test('KB.metin.uyarilar: her uyarı için bir metin, mesajı içerir', () => {
  const r = iz('8010');
  const u = KB.metin.uyarilar(r);
  assert.equal(u.length, r.uyarilar.length);
  assert.ok(u.length >= 1);
  u.forEach((m, i) => assert.ok(m.includes(r.uyarilar[i].mesaj), `${m} / ${r.uyarilar[i].mesaj}`));
  assert.deepEqual(KB.metin.uyarilar(iz('7001')), []);
});

test('KB.metin.tamMetin: özet + özellikler + kaynaklar + uyarılar', () => {
  const r = iz('8010');
  const t = KB.metin.tamMetin(r);
  assert.ok(t.includes(KB.metin.ozet(r)));
  for (const x of KB.metin.ozellikler(r)) assert.ok(t.includes(x), x);
  for (const x of KB.metin.kaynaklar(r)) assert.ok(t.includes(x), x);
  for (const x of KB.metin.uyarilar(r)) assert.ok(t.includes(x), x);
  assert.ok(t.startsWith(KB.metin.ozet(r)), 'tam metin özetle başlar');
});

test('maksSatir: satır sayısını sınırlar', () => {
  const r = iz('7100');
  const tam = KB.metin.ozet(r).split('\n').length;
  const kisa = KB.metin.ozet(r, { maksSatir: 1 }).split('\n').length;
  assert.equal(tam, 3);
  assert.ok(kisa < tam + 1 && kisa <= 2, `maksSatir:1 verilince ${kisa} satır`);
});

// ---- bütün izlerde ortak özellikler ------------------------------------------------------------------------------
test('her kablo izinde: özet başlıkla başlar, satırlar özetin parçasıdır, düğüm metinleri özette geçer, çöp değer yok', () => {
  const tum = KB.ara.liste(db, db.sekmeler[0].id, { limit: 1000 }).kablo;
  assert.ok(tum.length >= 30);
  for (const k of tum) {
    const r = KB.izle.kablo(db, k.anahtar);
    const m = KB.metin.ozet(r);
    assert.ok(m.startsWith(r.baslik + ' · '), `${k.anahtar}: ${m}`);
    assert.equal(KB.metin.satirlar(r).join('\n'), m, `${k.anahtar}: satirlar ≠ ozet`);
    assert.ok(!/undefined|null|NaN|\[object|Infinity/.test(m), `${k.anahtar}: çöp değer: ${m}`);
    for (const d of r.dugumler) {
      if (d.tur === 'devam' || d.gecisUcu) continue;
      assert.ok(m.includes(KB.metin.dugum(d)), `${k.anahtar}: "${KB.metin.dugum(d)}" özette yok: ${m}`);
    }
    // her cihaz ucunda soket+pin ya da pin ya da "şemada yazılı değil"
    for (const d of r.dugumler.filter((x) => x.tur === 'cihaz' && !x.gecisUcu)) {
      const t = KB.metin.dugum(d);
      assert.ok(d.adresEksik ? t.includes('(soket/pin şemada yazılı değil)') : /pin \S+/.test(t), t);
      if (d.soket != null) assert.ok(t.includes(`soket ${d.soket} pin ${d.pin}`), t);
    }
  }
});

test('pin sorgusu izinin özeti de tüm düğümleri anlatır', () => {
  const r = KB.izle.uc(db, { soket: 'X71.1', pin: '4' });
  const m = KB.metin.ozet(r);
  assert.ok(m.includes('71B01 soket 3 pin 7'));
  assert.ok(m.includes('X71.1 pin 4'));
  assert.ok(m.includes('Test Beyin (71A01) soket 15 pin 5 (NHB)'));
});
