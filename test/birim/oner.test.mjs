// KB.oner: "şunu mu demek istediniz" (API.md §8)
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, K, cz, sema, yukle } from './yardimci.mjs';

const p1 = sema('p1', {
  cihazlar: [
    cz('60A01', 'beyin', 'Steuergeraet Sechs', ['1'], 'Kapı 6 beyni'),
    cz('61A01', 'beyin', 'Steuergeraet Eins', ['2']),
    cz('61B01', 'sensor', 'Sensor', ['3']),
  ],
  kablolar: [
    K('a', '4502', [C('60A01', '15', '1'), C('61B01', '3', '1')]),
    K('b', '4002', [C('60A01', '15', '2'), C('61B01', '3', '2')]),
    K('c', '8001', [C('60A01', '15', '3'), C('61B01', '3', '3')]),
    K('d', '2020', [C('60A01', '15', '4'), C('61B01', '3', '4')]),
    K('e', '1001', [C('60A01', '15', '5'), C('61B01', '3', '5')]),
    K('f', '4020', [C('60A01', '15', '6'), C('61B01', '3', '6')]),
    K('g', '9999', [C('61A01', 'IV-18', '1'), S('X60.1', '1')]),
  ],
});
const p2 = sema('p2', {
  cihazlar: [cz('62A01', 'beyin', 'Steuergeraet Zwei', ['1']), cz('62B01', 'sensor', 'Sensor', ['2'])],
  kablolar: [K('h', '7001', [C('62A01', '15', '1'), C('62B01', '3', '1')])],
});
const db = yukle([p1, p2], {
  sekmeler: [
    { id: 'sa', ad: 'A', semalar: ['p1'] },
    { id: 'sb', ad: 'B', semalar: ['p2'] },
  ],
});
const ilk = (q, o) => KB.oner.oner(db, q, o)[0];

test('O/0 karışıklığı: 6OA01 → 60A01 (cihaz)', () => {
  const o = ilk('6OA01');
  assert.equal(o.tur, 'cihaz');
  assert.equal(o.deger, '60A01');
  assert.equal(o.sorgu, '60A01', 'sorgu alanı arama kutusuna yazılacak metin');
  assert.equal(o.ad, 'Kapı 6 beyni');
  assert.equal(typeof o.uzaklik, 'number');
});

test('I/1 karışıklığı: 6IA01 → 61A01; küçük harf de çalışır (6oa01 → 60A01)', () => {
  assert.equal(ilk('6IA01').deger, '61A01');
  assert.equal(ilk('6oa01').deger, '60A01');
});

test('kablo numarasında S/5, B/8, Z/2, O/0 karışıklığı', () => {
  assert.deepEqual([ilk('4S02').tur, ilk('4S02').deger], ['kablo', '4502']);
  assert.deepEqual([ilk('B001').tur, ilk('B001').deger], ['kablo', '8001']);
  assert.deepEqual([ilk('Z020').tur, ilk('Z020').deger], ['kablo', '2020']);
  assert.deepEqual([ilk('4O02').tur, ilk('4O02').deger], ['kablo', '4002']);
  assert.deepEqual([ilk('1OO1').tur, ilk('1OO1').deger], ['kablo', '1001']);
});

test('soket adında karışıklık: IV-I8 → IV-18 (soket)', () => {
  const o = ilk('IV-I8');
  assert.equal(o.tur, 'soket');
  assert.equal(o.deger, 'IV-18');
  assert.equal(o.sorgu, 'IV-18');
  assert.equal(ilk('X6O.1').deger, 'X60.1');
  assert.equal(ilk('X6O.1').tur, 'soket');
});

test('karışabilen karakter değişimi sıradan yazım hatasından ucuzdur', () => {
  const ucuz = ilk('4S02'); // S → 5 (ucuz) ile 4502
  const siradan = ilk('4003'); // 3 → 2 (sıradan) ile 4002
  assert.equal(siradan.deger, '4002');
  assert.ok(ucuz.uzaklik < siradan.uzaklik, `${ucuz.uzaklik} < ${siradan.uzaklik} olmalı`);
  assert.ok(ucuz.uzaklik > 0);
});

test('bir karakter eksik/fazla: 60A0 → 60A01', () => {
  assert.equal(ilk('60A0').deger, '60A01');
  assert.equal(ilk('60A011').deger, '60A01');
});

test('sonuçlar uzaklığa göre artan sırada, her öğe tam alanlı', () => {
  for (const q of ['4003', '40O2', '6OA01', 'IV-I8', '4S0Z']) {
    const l = KB.oner.oner(db, q);
    for (let i = 1; i < l.length; i++) assert.ok(l[i - 1].uzaklik <= l[i].uzaklik, `${q}: sıra bozuk`);
    for (const o of l) {
      assert.ok(['cihaz', 'kablo', 'soket'].includes(o.tur), o.tur);
      assert.equal(typeof o.deger, 'string');
      assert.equal(typeof o.sorgu, 'string');
      assert.ok(o.ad === null || typeof o.ad === 'string');
      assert.ok(Number.isFinite(o.uzaklik) && o.uzaklik >= 0);
    }
    const anahtarlar = l.map((o) => o.tur + '|' + o.deger);
    assert.equal(new Set(anahtarlar).size, anahtarlar.length, `${q}: aynı öneri iki kez`);
  }
});

test('öneri kutuya yazılınca arama sonuç verir (sorgu alanı geçerli bir arama)', () => {
  for (const q of ['4003', '40O2', '6OA01', 'IV-I8', 'X6O.1', '60A0']) {
    for (const o of KB.oner.oner(db, q)) {
      const s = KB.ara.ara(db, o.sorgu);
      assert.ok(s.toplam >= 1, `${q} → ${o.sorgu}: arama sonuç vermedi`);
    }
  }
});

test('n: varsayılan 5, istenen sayıyla sınırlı', () => {
  // 5100..5109 ve 5110, 5111: '510' sorgusuna bir karakter eklenerek ulaşılan 10 aday
  const kablolar = Array.from({ length: 12 }, (_, i) => K('n' + i, String(5100 + i), [C('63A01', '15', String(i + 1)), C('63B01', '3', String(i + 1))]));
  const d = yukle([sema('n', { cihazlar: [cz('63A01', 'beyin', 'x'), cz('63B01', 'sensor', 'y')], kablolar })]);
  const hepsi = KB.oner.oner(d, '510', { n: 50 });
  assert.ok(hepsi.length >= 10, `bu sorguda en az 10 aday olmalı (${hepsi.length})`);
  assert.equal(KB.oner.oner(d, '510').length, 5, 'n varsayılan 5');
  assert.equal(KB.oner.oner(d, '510', { n: 3 }).length, 3);
  assert.equal(KB.oner.oner(d, '510', { n: 1 }).length, 1);
  // sınırlı liste, tam listenin en iyi başı
  assert.deepEqual(KB.oner.oner(d, '510', { n: 3 }).map((o) => o.deger), hepsi.slice(0, 3).map((o) => o.deger));
});

test('sekme süzgeci: öneriler yalnız o sekmedeki öğelerden', () => {
  assert.equal(KB.oner.oner(db, '4O02', { sekme: 'sa' })[0].deger, '4002');
  assert.ok(!KB.oner.oner(db, '4O02', { sekme: 'sb' }).some((o) => o.deger === '4002'), 'sb sekmesinde 4002 yok');
  assert.equal(KB.oner.oner(db, '7OO1', { sekme: 'sb' })[0].deger, '7001');
  assert.ok(!KB.oner.oner(db, '7OO1', { sekme: 'sa' }).some((o) => o.deger === '7001'));
});

test('boş ve alakasız sorgu öneri vermez; özel karakterler hata vermez', () => {
  for (const q of ['', '   ', null, undefined]) assert.deepEqual(KB.oner.oner(db, q), [], JSON.stringify(q));
  assert.deepEqual(KB.oner.oner(db, 'QQQQQQQQQQ'), []);
  for (const q of ['(', '[', '.*', '\\', '?', '%', '\u0000', 'a'.repeat(3000)]) assert.doesNotThrow(() => KB.oner.oner(db, q), JSON.stringify(q).slice(0, 20));
});

test('çok uzun sorgu hızlı biter', () => {
  const t0 = Date.now();
  KB.oner.oner(db, '40O2'.repeat(500));
  assert.ok(Date.now() - t0 < 3000, 'uzun sorguda öneri üretimi çok yavaş');
});
