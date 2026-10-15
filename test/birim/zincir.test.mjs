// KB.izle: zincir ve dallanma kurma (API.md §4, §11). Sentetik, küçük veri; beklenenler elle yazıldı.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, D, V, K, cz, sema, yukle, kod, zincirKodlari as zk, dugumBul, kenarEtiketleri } from './yardimci.mjs';
import { izKontrol } from './degismezler.mjs';

// ---- küçük yardımcılar --------------------------------------------------------------------
const TUR = { A: 'beyin', B: 'sensor', E: 'lamba', F: 'sigorta', G: 'guc', K: 'role', M: 'motor', R: 'direnc', S: 'salter', V: 'diyot', X: 'soket', Z: 'dugum' };
/** kod harfinden türü bulup bileşen listesi girdisi üretir: cl('71A01','71B01') */
const cl = (...kodlar) => kodlar.map((k) => cz(k, TUR[/^\d+([A-Z])/.exec(k)[1]], 'Test ' + k, ['1']));

/** Her izi hem yapısal değişmezlerden geçirir hem döndürür. */
function iz(no, opts) {
  const r = KB.izle.kablo(db, no, opts);
  assert.notEqual(r, null, `kablo ${no} bulunamadı`);
  const ih = izKontrol(r);
  assert.deepEqual(ih, [], `kablo ${no}: yapısal değişmez ihlali\n  ${ih.join('\n  ')}`);
  return r;
}
function uc(ref, opts) {
  const r = KB.izle.uc(db, ref, opts);
  assert.notEqual(r, null, `uç ${JSON.stringify(ref)} bulunamadı`);
  const ih = izKontrol(r);
  assert.deepEqual(ih, [], `uç ${JSON.stringify(ref)}: yapısal değişmez ihlali\n  ${ih.join('\n  ')}`);
  return r;
}
const dugumKod = (r, k) => r.dugumler.filter((d) => kod(d) === k);
const bir = (r, k) => {
  const l = dugumKod(r, k);
  assert.equal(l.length, 1, `${k}: ${l.length} düğüm (1 bekleniyordu); izdeki düğümler: ${r.dugumler.map(kod).join(' | ')}`);
  return l[0];
};

// ---- veri -----------------------------------------------------------------------------------
const t1 = sema('t1', {
  cihazlar: [
    ...cl('71A01', '71B01', '71A02', '71B02', '72A01', '72B01', '72B02', '72Z07', '73A01', '73B01', '73B02', '73B03', '74A01', '74B01', '74B02', '75B01'),
    ...cl('76A01', '77A01', '77A02', '78A01', '78B01', '79A01', '79A02', '79B01', '79B02', '80A01', '80A02', '80B01', '81A01', '81B01', '81B02', '81B03'),
    ...cl('82A01', '82B01', '82B02', '83A01', '83B01', '83B02', '84A01', '84B01', '85G01', '85A01', '85B01', '85B02'),
    ...cl('87A01', '87B01', '88A01', '88B01', '89A01', '89B01', '89B02', '90A01', '90B01', '91A01', '91B01', '92A01', '92B01', '93A01', '93B01', '04A03', '42A01', '94B01', '95G02', '95G03', '95B01', '95B02'),
  ],
  kablolar: [
    // A1: ara soketli zincir (yön: beyin olmayan uç → beyin)
    K('a1', '7001', [C('71B01', '3', '7'), S('X71.1', '4')]),
    K('a2', '7001', [S('X71.1', '4'), C('71A01', '15', '5', 'NHB')]),
    // A2: ara soketten sonra numara değişir
    K('a3', '7010', [C('71B02', '3', '8'), S('X71.2', '1')]),
    K('a4', '7011', [S('X71.2', '1'), C('71A02', '15', '6')]),
    // A3: açık uç (ara soketin öbür tarafı şemada yok)
    K('a5', '7020', [C('71B02', '3', '9'), S('X71.3', '1')]),

    // B1: ek noktasında üç kollu dal
    K('b1', '7100', [C('72A01', '15', '7', 'LI1'), D('72Z07')]),
    K('b2', '7100', [D('72Z07'), C('72B01', '3', '1')]),
    K('b3', '7100', [D('72Z07'), C('72B02', '3', '1')]),
    // B2: cihaz pininde üç aynı numaralı parça (yıldız merkezi bir cihaz pini)
    K('b4', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B01', '3', '2')]),
    K('b5', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B02', '3', '2')]),
    K('b6', '7200', [C('73A01', '15', '9', 'EIN1'), C('73B03', '3', '2')]),
    // B3: cihaz pininde iki aynı numaralı parça = zincirin ortası
    K('b7', '7210', [C('74A01', '15', '10'), C('74B01', '3', '3')]),
    K('b8', '7210', [C('74A01', '15', '10'), C('74B02', '3', '3')]),

    // C: çevrim (yerel ek noktaları) + kuyruk
    K('c1', '7300', [D('~d1'), D('~d2')]),
    K('c2', '7300', [D('~d2'), D('~d3')]),
    K('c3', '7300', [D('~d3'), D('~d1')]),
    K('c4', '7300', [D('~d1'), C('75B01', '3', '5')]),
    // C2: kuyruksuz çevrim
    K('c5', '7301', [D('~d4'), D('~d5')]),
    K('c6', '7301', [D('~d5'), D('~d6')]),
    K('c7', '7301', [D('~d6'), D('~d4')]),

    // D1: çözülmeyen devam (cihaz)
    K('d1', '7400', [C('76A01', '15', '16'), V({ cihaz: '99Q99' })]),
    // D3: devam hedef sayfa/yol: 2/20 ↔ 3/27 (aynı şema, iki sayfa)
    K('dh1', '7420', [C('78A01', '15', '14'), V({ hedef: '3/27' })], [2, '20', 'A']),
    K('dh2', '7420', [V({ hedef: '2/20' }), C('78B01', '3', '4')], [3, '27', 'A']),
    // D3b: hedef uyuşmuyor (3/28 ≠ 3/27)
    K('dh3', '7421', [C('78A01', '15', '15'), V({ hedef: '3/28' })], [2, '21', 'A']),
    K('dh4', '7421', [V({ hedef: '2/21' }), C('78B01', '3', '5')], [3, '27', 'B']),
    // D4: belirsiz devam: 79A02'de iki farklı uç var
    K('db1', '7430', [C('79A01', '15', '18'), V({ cihaz: '79A02' })]),
    K('db2', '7430', [C('79A02', 'IV-18', '5'), C('79B01', '3', '9')]),
    K('db3', '7430', [C('79A02', 'IV-18', '6'), C('79B02', '3', '9')]),
    // D5: sayfa içi devam (yol numarası): bağlanmaz
    K('dp1', '7440', [C('80A01', '15', '19'), V({ hedef: '74' })]),
    K('dp2', '7441', [C('80A02', 'IV-18', '13'), V({ hedef: '74' })]),
    K('dp3', '7441', [C('80A01', '15', '20'), V({ hedef: '54' })]),

    // E: pin adsız uçlar birleşmemeli
    K('e1', '7500', [C('81B03', null, null), C('81B01', '3', '10')]),
    K('e2', '7500', [C('81B03', null, null), C('81B02', '3', '10')]),
    // E2: okunamayan pin ('?') birleşmemeli
    K('e3', '7510', [C('81A01', '15', '1?'), C('81B01', '3', '11')]),
    K('e4', '7510', [C('81A01', '15', '1?'), C('81B02', '3', '11')]),

    // G: cihaz içi köprü (alternatör tarzı): D+ ↔ DF
    K('h1', '7710', [C('85G01', null, 'D+'), C('85B01', '3', '23')]),
    K('h2', '7711', [C('85G01', null, 'DF'), C('85B02', '3', '23')]),
    K('h3', null, [C('85G01', null, 'DF'), C('85G01', null, 'D+')], [1, '30', 'A'], { ic: true }),

    // H: kendine dönen kablo (kesikli kutudaki körük soketi) + onu taşıyan normal kablolar
    K('i1', '7800', [S('X72.1', '1'), S('X72.1', '1')], [1, '40', 'A'], { varyant: true }),
    K('i2', '7801', [C('82A01', '15', '24'), S('X72.1', '1')]),
    K('i3', '7802', [S('X72.1', '1'), C('82B01', '3', '24')]),

    // I: aynı soket içinde köprü (CAN sonlandırma tarzı)
    K('j1', '7900', [C('83A01', '9', '5', 'CANRS'), C('83A01', '9', '6', 'CANLS')]),

    // J: aynı iletken iki yerde çizilmiş (paralel parça)
    K('l1', '7960', [C('83A01', '15', '27'), C('83B01', '3', '27')], [1, '10', 'A']),
    K('l2', '7960', [C('83A01', '15', '27'), C('83B01', '3', '27')], [1, '11', 'B']),

    // M: uzun zincir (maksKenar)
    K('m1', '7970', [C('84B01', '3', '28'), S('X73.1', '1')]),
    ...Array.from({ length: 10 }, (_, i) => K('m' + (i + 2), '7970', [S('X73.' + (i + 1), '1'), S('X73.' + (i + 2), '1')])),
    K('m12', '7970', [S('X73.11', '1'), C('84A01', '15', '28')]),

    // O: etiketli parçanın cihaz pinindeki etiketsiz parça onun dalıdır; tersi yok
    K('o1', '7980', [C('04A03', '15', '10', 'HS10'), S('X08.11', '1')]),
    K('o2', null, [C('04A03', '15', '10', 'HS10'), C('42A01', '3', '1')]),
    K('o3', '7981', [C('42A01', '3', '1'), C('94B01', '3', '29')]),

    // R: B- ile B aynı cihazın FARKLI pinleridir (API.md §11/1). İki ayrı cihazda iki ayrı durum:
    //   95G02: B- pininde yalnız 7992, B pininde yalnız 7992 (AYNI numara, iki pin) -> birleşip dal kurmamalı
    //   95G03: B- pininde yalnız 7993, B pininde yalnız 7994 (FARKLI numara, iki pin) -> çelişki doğmamalı
    // Not: aynı pinde iki farklı numara (ör. B- pininde 7992 + 7993) §4.7(1) çelişkisidir; bu fixture ona düşmez.
    K('r1', '7992', [C('95G02', null, 'B-'), C('95B01', '3', '31')]),
    K('r2', '7992', [C('95G02', null, 'B'), C('95B02', '3', '31')]),
    K('r3', '7993', [C('95G03', null, 'B-'), C('95B01', '3', '32')]),
    K('r4', '7994', [C('95G03', null, 'B'), C('95B02', '3', '32')]),

    // N: numarasız kablo
    K('n1', '70sw', [C('87A01', null, 'B+'), C('87B01', null, '30')], [1, '30', 'A'], { kesit: '70', renk: 'sw' }),
    K('n2', null, [C('88A01', '15', '3'), C('88B01', '3', '3')], [1, '31', 'A']),
  ],
});

// geçiş bileşenleri (86…): ayrı şema
const t3 = sema('t3', {
  cihazlar: [...cl('86R01', '86V01', '86F01', '86S01', '86M01', '86E01', '86K01', '86F02', '86R02', '86F03', '86A01', '86B01', '86B02'), cz('86S02', 'salter', 'Schalter dreipolig', ['5'])],
  kablolar: [
    // direnç: 7600 | R01 | 7601
    K('g1', '7600', [C('86B01', '3', '12'), C('86R01', null, '1')]),
    K('g2', '7601', [C('86R01', null, '2'), C('86A01', '15', '13')]),
    // diyot (pin 2 → 1)
    K('g3', '7610', [C('86B01', '3', '13'), C('86V01', null, '2')]),
    K('g4', '7611', [C('86V01', null, '1'), C('86A01', '15', '14')]),
    // sigorta
    K('g5', '7620', [C('86B01', '3', '14'), C('86F01', null, '2')]),
    K('g6', '7621', [C('86F01', null, '1'), C('86A01', '15', '15')]),
    // şalter (iki uçlu: 13/14)
    K('g7', '7630', [C('86B01', '3', '15'), C('86S01', null, '13')]),
    K('g8', '7631', [C('86S01', null, '14'), C('86A01', '15', '17')]),
    // üç terminalli şalter: geçmez
    K('g9', '7640', [C('86B01', '3', '16'), C('86S02', null, '1')]),
    K('g10', '7641', [C('86S02', null, '2'), C('86A01', '15', '18')]),
    K('g11', '7642', [C('86S02', null, '3'), C('86B02', '3', '16')]),
    // motor, lamba, röle: iki terminalli olsa da geçmez
    K('g12', '7650', [C('86B01', '3', '17'), C('86M01', null, '1')]),
    K('g13', '7651', [C('86M01', null, '2'), C('86A01', '15', '19')]),
    K('g14', '7660', [C('86B01', '3', '18'), C('86E01', null, '1')]),
    K('g15', '7661', [C('86E01', null, '2'), C('86A01', '15', '20')]),
    K('g16', '7670', [C('86B01', '3', '19'), C('86K01', null, '85')]),
    K('g17', '7671', [C('86K01', null, '86'), C('86A01', '15', '21')]),
    // tek terminalli sigorta: geçmez
    K('g18', '7680', [C('86B01', '3', '20'), C('86F02', null, '1')]),
    // pin adsız iki uçlu direnç: iki ayrı terminal, birleşmez, geçer
    K('g19', '7690', [C('86B01', '3', '21'), C('86R02', null, null)]),
    K('g20', '7691', [C('86R02', null, null), C('86A01', '15', '22')]),
    // sigortanın bir terminalinde iki kablo + sanal kenar = dal
    K('g21', '7700', [C('86B01', '3', '22'), C('86F03', null, '1')]),
    K('g22', '7701', [C('86F03', null, '1'), C('86B02', '3', '22')]),
    K('g23', '7702', [C('86F03', null, '2'), C('86A01', '15', '23')]),
  ],
});

// şema süzgeci denemesi: direncin iki terminali iki ayrı şemada
const t4 = sema('t4', {
  cihazlar: [...cl('96R01', '96A01', '96B01')],
  kablolar: [K('s1', '7810', [C('96B01', '3', '1'), C('96R01', null, '1')])],
});
const t5 = sema('t5', {
  cihazlar: [...cl('96R01', '96A01', '96B01')],
  kablolar: [K('s2', '7811', [C('96R01', null, '2'), C('96A01', '15', '1')])],
});

// devam çözümü: iki şema
const t6 = sema('t6', {
  cihazlar: cl('77A01', '77A02'),
  kablolar: [K('dv1', '7410', [C('77A01', '15', '12', 'EIN2'), V({ cihaz: '77A02' })], [1, '40', 'A'])],
});
const t7 = sema('t7', {
  cihazlar: cl('77A01', '77A02'),
  kablolar: [K('dv2', '7410', [V({ cihaz: '77A01' }), C('77A02', 'IV-18', '12')], [2, '41', 'B'])],
});

// devam, numara ara soketten sonra değiştikten sonra: 7520 → ara soket → 7521 (devam, başka şemada sürüyor)
const t8 = sema('t8', {
  cihazlar: cl('75B01', '75A01', '75A02'),
  kablolar: [
    K('dz1', '7520', [C('75B01', '3', '1'), S('X75.1', '1')]),
    K('dz2', '7521', [S('X75.1', '1'), C('75A01', '15', '3')]),
    K('dz3', '7521', [C('75A01', '15', '3'), V({ cihaz: '75A02' })]),
  ],
});
const t9 = sema('t9', {
  cihazlar: cl('75A01', '75A02'),
  kablolar: [K('dz4', '7521', [V({ cihaz: '75A01' }), C('75A02', 'IV-18', '5')], [2, '9', 'A'])],
});

const db = yukle([t1, t3, t4, t5, t6, t7, t8, t9]);

// ================================================================================================
//  A. ara soketli zincir
// ================================================================================================
test('ara soketli zincir: 3 düğüm, 2 kenar; yön = beyin olmayan uçtan beyine', () => {
  const r = iz('7001');
  assert.equal(r.tur, 'kablo');
  assert.equal(r.baslik, 'Kablo 7001');
  assert.equal(r.kablo.anahtar, '7001');
  assert.equal(r.kablo.no, '7001');
  assert.equal(r.kablo.etiket, '7001');
  assert.equal(r.bilesenler.length, 1);
  assert.deepEqual(zk(r), ['71B01 3/7', 'X71.1/4', '71A01 15/5']);
  assert.equal(r.dal, false);
  assert.equal(r.dongu, false);
  assert.deepEqual(r.sayilar, { kablo: 2, sanal: 0, ic: 0, kendineDonen: 0 });
  assert.deepEqual(kenarEtiketleri(r), ['7001', '7001']);
  assert.equal(r.dugumler.length, 3);
  assert.equal(r.kenarlar.length, 2);
  assert.deepEqual(r.semalar, ['t1']);
  assert.equal(r.sinirAsildi, false);
});

test('zincir uçları: yaprak cihaz düğümleri soket/pin/pinAdi taşır, ortadaki ara soket derece 2', () => {
  const r = iz('7001');
  const beyin = bir(r, '71A01 15/5');
  assert.equal(beyin.tur, 'cihaz');
  assert.equal(beyin.cihazTur, 'beyin');
  assert.equal(beyin.soket, '15');
  assert.equal(beyin.pin, '5');
  assert.equal(beyin.pinAdi, 'NHB');
  assert.equal(beyin.yaprak, true);
  assert.equal(beyin.derece, 1);
  const sensor = bir(r, '71B01 3/7');
  assert.equal(sensor.cihazTur, 'sensor');
  assert.equal(sensor.pinAdi, null);
  const orta = bir(r, 'X71.1/4');
  assert.equal(orta.tur, 'soket');
  assert.equal(orta.soket, 'X71.1');
  assert.equal(orta.pin, '4');
  assert.equal(orta.derece, 2);
  assert.equal(orta.yaprak, false);
  assert.equal(orta.dal, false);
  assert.equal(orta.acik, false);
  assert.ok(!('pinAdi' in orta), 'soket düğümünde pinAdi alanı olmamalı (uygulanamaz alan hiç yoktur)');
});

test('opts.baslangic zincirin yönünü çevirir (cihaz kodu ya da pin ile)', () => {
  assert.deepEqual(zk(iz('7001', { baslangic: '71A01' })), ['71A01 15/5', 'X71.1/4', '71B01 3/7']);
  assert.deepEqual(zk(iz('7001', { baslangic: { cihaz: '71A01', soket: '15', pin: '5' } })), ['71A01 15/5', 'X71.1/4', '71B01 3/7']);
  assert.deepEqual(zk(iz('7001', { baslangic: '71B01' })), ['71B01 3/7', 'X71.1/4', '71A01 15/5']);
});

test('zincir kenarlarında a, b den önce gelir ve kenar uçları komşu düğümlerdir', () => {
  const r = iz('7001');
  const b = r.bilesenler[0];
  b.zincirKenarlar.forEach((id, i) => {
    const e = r.kenarlar.find((k) => k.id === id);
    assert.equal(e.a, b.zincir[i]);
    assert.equal(e.b, b.zincir[i + 1]);
  });
});

test('kablo sorgusu girdi biçimleri: #7001, boşluklu, arama çıktısındaki anahtar', () => {
  const a = iz('7001');
  assert.deepEqual(zk(iz('#7001')), zk(a));
  assert.deepEqual(zk(iz(' 7001 ')), zk(a));
  const anahtar = KB.ara.ara(db, '7001').kablo[0].anahtar;
  assert.deepEqual(zk(iz(anahtar)), zk(a));
});

test('olmayan kablo ve olmayan uç null döner', () => {
  assert.equal(KB.izle.kablo(db, '6666'), null);
  assert.equal(KB.izle.kablo(db, ''), null);
  assert.equal(KB.izle.kablo(db, null), null);
  assert.equal(KB.izle.uc(db, { cihaz: '71A01', soket: '15', pin: '99' }), null);
  assert.equal(KB.izle.uc(db, { cihaz: 'YOK00', soket: null, pin: '1' }), null);
  assert.equal(KB.izle.uc(db, { soket: 'X00.0', pin: '1' }), null);
  assert.equal(KB.izle.uc(db, { dugum: 'YOK99' }), null);
});

test('ara soketten sonra numara değişir: 7010 ve 7011 aynı zincirde', () => {
  const a = iz('7010');
  const b = iz('7011');
  assert.deepEqual(zk(a), ['71B02 3/8', 'X71.2/1', '71A02 15/6']);
  assert.deepEqual(kenarEtiketleri(a), ['7010', '7011']);
  assert.equal(a.baslik, 'Kablo 7010');
  assert.equal(b.baslik, 'Kablo 7011');
  assert.deepEqual(zk(b, 0).slice().sort(), zk(a, 0).slice().sort(), 'iki numara aynı düğümleri verir');
  assert.deepEqual(a.sayilar, { kablo: 2, sanal: 0, ic: 0, kendineDonen: 0 });
});

test('ara soketin öbür tarafı şemada yoksa düğüm acik:true (yaprak)', () => {
  const r = iz('7020');
  const s = bir(r, 'X71.3/1');
  assert.equal(s.tur, 'soket');
  assert.equal(s.acik, true);
  assert.equal(s.yaprak, true);
  assert.deepEqual(zk(r).slice().sort(), ['71B02 3/9', 'X71.3/1']);
});

test('pin sorgusu: zincirin ortasındaki pinden başlanır, odak o pindir', () => {
  const r = uc({ soket: 'X71.1', pin: '4' });
  assert.equal(r.tur, 'uc');
  assert.deepEqual(r.sorgu, { soket: 'X71.1', pin: '4' });
  const b = r.bilesenler[0];
  const hedef = bir(r, 'X71.1/4');
  assert.equal(b.baslangic, hedef.id, 'pin sorgusunda başlangıç sorgulanan pindir');
  assert.equal(b.odak, hedef.id, 'odak sorgulanan düğüm');
  assert.equal(r.dugumler.length, 3, 'iki yöndeki bütün zincir gelir');
  assert.equal(b.agac.dugum, hedef.id);
  assert.equal(b.agac.cocuklar.length, 2);
  // ucundaki cihaz pini ile aynı kablo
  const c = uc({ cihaz: '71A01', soket: '15', pin: '5' });
  assert.deepEqual(c.sorgu, { cihaz: '71A01', soket: '15', pin: '5' });
  assert.equal(c.bilesenler[0].baslangic, bir(c, '71A01 15/5').id);
  assert.deepEqual(c.dugumler.map(kod).sort(), r.dugumler.map(kod).sort());
  // kablo sorgusunda odak yoktur
  assert.equal(iz('7001').bilesenler[0].odak, null);
});

test('ek noktası sorgusu: { dugum } — başlangıç ve odak o düğüm; adressiz uç sorgusu: { parca, uc }', () => {
  const r = uc({ dugum: '72Z07' });
  assert.equal(r.tur, 'uc');
  assert.deepEqual(r.sorgu, { dugum: '72Z07' });
  const z = bir(r, '72Z07');
  assert.equal(r.bilesenler[0].baslangic, z.id);
  assert.equal(r.bilesenler[0].odak, z.id);
  assert.equal(z.derece, 3);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['72A01 15/7', '72B01 3/1', '72B02 3/1', '72Z07']);
  // pini yazılmayan uç: 7505 değil, 7500 (81B03'ün adressiz iki ucu): parça kimliği şema:id, uç 0 ya da 1
  const a = uc({ parca: 't1:e1', uc: 0 });
  assert.deepEqual(a.sorgu, { parca: 't1:e1', uc: 0 });
  assert.equal(a.bilesenler[0].odak, a.bilesenler[0].baslangic);
  const odak = dugumBul0(a, a.bilesenler[0].odak);
  assert.equal(odak.cihaz, '81B03');
  assert.equal(odak.adresEksik, true);
  const b = uc({ parca: 't1:e1', uc: 1 });
  assert.equal(dugumBul0(b, b.bilesenler[0].baslangic).cihaz, '81B01', 'uc:1 = parçanın ikinci ucu (81B01 3/10)');
  assert.equal(KB.izle.uc(db, { parca: 't1:yok', uc: 0 }), null);
});

function dugumBul0(r, id) { return r.dugumler.find((d) => d.id === id); }

test('soketsiz cihaz ucu için pin sorgusu: { cihaz, soket:null, pin }', () => {
  const r = uc({ cihaz: '87A01', soket: null, pin: 'B+' });
  assert.deepEqual(r.sorgu, { cihaz: '87A01', soket: null, pin: 'B+' });
  assert.equal(r.bilesenler[0].baslangic, bir(r, '87A01 -/B+').id);
});

// ================================================================================================
//  B. dallanma
// ================================================================================================
test('ek noktasında üç kollu dal: yıldız merkezi ek noktası, 3 kol', () => {
  const r = iz('7100');
  const b = r.bilesenler[0];
  assert.equal(r.dal, true);
  assert.equal(r.dongu, false);
  assert.equal(b.zincir, null, 'dallanmada zincir null');
  assert.ok(b.yildiz, 'tek düğümde dallanma ve çevrim yok → yıldız hazır');
  const merkez = bir(r, '72Z07');
  assert.equal(merkez.tur, 'dugum');
  assert.equal(merkez.kod, '72Z07');
  assert.equal(merkez.derece, 3);
  assert.equal(merkez.dal, true);
  assert.equal(b.yildiz.merkez, merkez.id);
  assert.equal(b.merkez, merkez.id);
  assert.equal(b.yildiz.kollar.length, 3);
  for (const k of b.yildiz.kollar) {
    assert.equal(k.dugumler.length, 1);
    assert.equal(k.kenarlar.length, 1);
  }
  const uclar = b.yildiz.kollar.map((k) => kod(dugumBul(r, k.dugumler[0]))).sort();
  assert.deepEqual(uclar, ['72A01 15/7', '72B01 3/1', '72B02 3/1']);
  assert.deepEqual(r.sayilar, { kablo: 3, sanal: 0, ic: 0, kendineDonen: 0 });
  // başlangıç: beyin olmayan yapraklardan doğal sırada ilki
  assert.equal(dugumBul(r, b.baslangic).cihaz, '72B01');
  assert.equal(b.agac.dugum, b.baslangic);
});

test('dallanan ek noktası düğümü dal:true, uçlar yaprak', () => {
  const r = iz('7100');
  assert.equal(r.dugumler.filter((d) => d.dal).length, 1);
  assert.equal(r.dugumler.filter((d) => d.yaprak).length, 3);
});

test('cihaz pininde üç aynı numaralı parça: yıldız merkezi cihaz pini', () => {
  const r = iz('7200');
  const b = r.bilesenler[0];
  const merkez = bir(r, '73A01 15/9');
  assert.equal(merkez.derece, 3);
  assert.equal(merkez.dal, true);
  assert.equal(merkez.pinAdi, 'EIN1');
  assert.equal(r.dal, true);
  assert.ok(b.yildiz);
  assert.equal(b.yildiz.merkez, merkez.id);
  assert.equal(b.yildiz.kollar.length, 3);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['73A01 15/9', '73B01 3/2', '73B02 3/2', '73B03 3/2']);
});

test('cihaz pininde iki aynı numaralı parça dal değildir: zincirin ortasıdır', () => {
  const r = iz('7210');
  assert.equal(r.dal, false);
  assert.deepEqual(zk(r), ['74B01 3/3', '74A01 15/10', '74B02 3/3']);
  assert.equal(bir(r, '74A01 15/10').derece, 2);
  assert.equal(bir(r, '74A01 15/10').dal, false);
});

// ================================================================================================
//  C. çevrim
// ================================================================================================
test('çevrim: üçgen + kuyruk → dongu:true, 1 geri kenar, zincir/yıldız yok', () => {
  const r = iz('7300');
  const b = r.bilesenler[0];
  assert.equal(r.dongu, true);
  assert.equal(b.dongu, true);
  assert.equal(b.zincir, null);
  assert.equal(b.yildiz, null, 'çevrimde yıldız çizimi yok');
  assert.equal(b.geriKenarlar.length, 1);
  assert.equal(r.dugumler.length, 4);
  assert.equal(r.kenarlar.length, 4);
  assert.equal(r.kenarlar.filter((e) => e.geri).length, 1);
  assert.ok(r.uyarilar.some((u) => u.tur === 'cevrim'), "'cevrim' uyarısı");
  // yerel ek noktaları kodsuz
  const eklar = r.dugumler.filter((d) => d.tur === 'dugum');
  assert.equal(eklar.length, 3);
  assert.ok(eklar.every((d) => d.kodsuz === true));
});

test('çevrim: kuyruksuz üçgen de çökmez; tüm düğümler derece 2', () => {
  const r = iz('7301');
  assert.equal(r.dongu, true);
  assert.equal(r.dal, false);
  assert.equal(r.dugumler.length, 3);
  assert.equal(r.kenarlar.length, 3);
  assert.ok(r.dugumler.every((d) => d.derece === 2));
  assert.equal(r.bilesenler[0].geriKenarlar.length, 1);
  assert.equal(r.bilesenler[0].zincir, null);
});

// ================================================================================================
//  D. devam uçları
// ================================================================================================
test('çözülmeyen devam: yaprak devam düğümü (hedef cihaz, çözülmedi)', () => {
  const r = iz('7400');
  const d = r.dugumler.find((x) => x.tur === 'devam');
  assert.ok(d, 'devam düğümü yok');
  assert.equal(d.hedefCihaz, '99Q99');
  assert.equal(d.cozuldu, false);
  assert.equal(d.sayfaIci, false);
  assert.equal(d.yaprak, true);
  assert.equal(d.ad, 'devam → 99Q99');
  assert.equal(r.dugumler.length, 2);
  assert.equal(zk(r).length, 2);
  assert.equal(kod(d), 'devam:99Q99');
});

test('devam iki şemada çözülür: eklem düğümü gösterilmez, tek kenar iki kaynak taşır', () => {
  const r = iz('7410');
  assert.equal(r.dugumler.some((d) => d.tur === 'devam'), false, 'çözülen devam ucu düğüm olarak kalmamalı');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['77A01 15/12', '77A02 IV-18/12']);
  assert.equal(r.kenarlar.length, 1);
  const e = r.kenarlar[0];
  assert.deepEqual(e.parcalar.slice().sort(), ['t6:dv1', 't7:dv2']);
  assert.equal(e.kaynaklar.length, 2);
  assert.deepEqual(e.kaynaklar.map((k) => k.sema).sort(), ['t6', 't7']);
  assert.deepEqual(r.semalar.slice().sort(), ['t6', 't7']);
  assert.equal(r.bilesenler.length, 1);
});

test('devam, numara ara soketten sonra değiştikten sonra da çözülür (başka numaralı parçanın devamı başka şemada)', () => {
  // izlenen 7520'nin tohumları yalnız 7520 parçalarıdır; 7521'in devamı ancak ara soket üzerinden gelen parçadan bulunabilir
  const r = iz('7520');
  assert.deepEqual(zk(r), ['75B01 3/1', 'X75.1/1', '75A01 15/3', '75A02 IV-18/5']);
  assert.equal(r.dugumler.some((d) => d.tur === 'devam'), false, 'çözülen devam yaprak olarak kalmamalı');
  assert.deepEqual(r.semalar.slice().sort(), ['t8', 't9']);
  assert.deepEqual(iz('7521').dugumler.map(kod).sort(), r.dugumler.map(kod).sort());
  const son = r.kenarlar.find((e) => e.parcalar.includes('t9:dz4'));
  assert.ok(son, 'başka şemadaki 7521 parçası izde yok');
  assert.deepEqual(son.parcalar.slice().sort(), ['t8:dz3', 't9:dz4']);
});

test('devam hedefi sayfa/yol (3/27 ↔ 2/20): karşılıklı eşleşirse bağlanır', () => {
  const r = iz('7420');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['78A01 15/14', '78B01 3/4']);
  assert.equal(r.kenarlar.length, 1);
  assert.equal(r.kenarlar[0].kaynaklar.length, 2);
  assert.deepEqual(r.kenarlar[0].kaynaklar.map((k) => k.sayfa).sort(), [2, 3]);
});

test('devam hedefi uyuşmazsa (3/28 ≠ 3/27) bağlanmaz: iki bileşen, iki devam yaprağı', () => {
  const r = iz('7421');
  assert.equal(r.bilesenler.length, 2);
  const devamlar = r.dugumler.filter((d) => d.tur === 'devam');
  assert.equal(devamlar.length, 2);
  assert.ok(devamlar.every((d) => d.cozuldu === false));
  assert.ok(devamlar.every((d) => d.yaprak));
  assert.deepEqual(devamlar.map((d) => d.hedef).sort(), ['2/21', '3/28']);
});

test('belirsiz devam: hedef cihazda birden çok aday uç varsa bağlanmaz, uyarı verir', () => {
  const r = iz('7430');
  assert.equal(r.bilesenler.length, 3, 'üç ayrı bileşen kalmalı');
  const d = r.dugumler.find((x) => x.tur === 'devam');
  assert.ok(d);
  assert.equal(d.cozuldu, false);
  assert.equal(d.hedefCihaz, '79A02');
  assert.ok(r.uyarilar.some((u) => u.tur === 'belirsiz-devam'), "'belirsiz-devam' uyarısı bekleniyordu: " + JSON.stringify(r.uyarilar.map((u) => u.tur)));
});

test('sayfa içi devam ("74"): bağlanmaz, yaprak devam düğümü, "devam → yol 74"', () => {
  const r = iz('7440');
  const d = r.dugumler.find((x) => x.tur === 'devam');
  assert.ok(d);
  assert.equal(d.sayfaIci, true);
  assert.equal(d.ad, 'devam → yol 74');
  assert.equal(d.hedef, '74');
  assert.equal(d.hedefCihaz, null);
  assert.equal(d.cozuldu, false);
  assert.equal(d.yaprak, true);
  assert.equal(r.dugumler.length, 2);
});

test('sayfa içi devamlar aynı numaralı parçaları birbirine bağlamaz (74 ile 54)', () => {
  const r = iz('7441');
  assert.equal(r.bilesenler.length, 2);
  const devamlar = r.dugumler.filter((d) => d.tur === 'devam');
  assert.deepEqual(devamlar.map((d) => d.ad).sort(), ['devam → yol 54', 'devam → yol 74']);
  assert.ok(devamlar.every((d) => d.sayfaIci === true && d.cozuldu === false));
});

// ================================================================================================
//  E. adresi eksik / okunamayan uçlar birleşmez
// ================================================================================================
test('pini yazılmayan uçlar birleşmez: aynı cihazın iki adressiz ucu iki ayrı düğüm', () => {
  const r = iz('7500');
  assert.equal(r.bilesenler.length, 2, 'adressiz uçlar birleşip tek zincir kurmamalı');
  const adressiz = r.dugumler.filter((d) => d.cihaz === '81B03');
  assert.equal(adressiz.length, 2);
  assert.ok(adressiz.every((d) => d.adresEksik === true && d.pin === null && d.soket === null));
  assert.ok(adressiz.every((d) => d.yaprak));
  assert.equal(r.dugumler.length, 4);
});

test("pini '?' içeren uçlar birleşmez, düğüm belirsiz:true", () => {
  const r = iz('7510');
  assert.equal(r.bilesenler.length, 2);
  const u = r.dugumler.filter((d) => d.cihaz === '81A01');
  assert.equal(u.length, 2);
  assert.ok(u.every((d) => d.belirsiz === true && d.pin === '1?'));
  assert.equal(r.supheli, true, "'?' içeren düğüm → iz şüpheli");
});

// ================================================================================================
//  F. geçiş bileşenleri
// ================================================================================================
test('direnç iki uçlu geçiş bileşeni: sanal kenarla geçer, numara değişir', () => {
  const r = iz('7600');
  assert.deepEqual(zk(r), ['86B01 3/12', '86R01 -/1', '86R01 -/2', '86A01 15/13']);
  assert.deepEqual(r.sayilar, { kablo: 2, sanal: 1, ic: 0, kendineDonen: 0 });
  const sanal = r.kenarlar.filter((e) => e.sanal);
  assert.equal(sanal.length, 1);
  const e = sanal[0];
  assert.equal(e.etiket, null);
  assert.equal(e.no, null);
  assert.equal(e.renk, null);
  assert.equal(e.kesit, null);
  assert.equal(e.varyant, false);
  assert.equal(e.bilesen.kod, '86R01');
  assert.equal(e.bilesen.tur, 'direnc');
  assert.equal(e.bilesen.turAd, 'direnç');
  assert.equal(r.dugumler.filter((d) => d.gecisUcu).length, 2);
  assert.ok(r.dugumler.filter((d) => d.cihaz === '86R01').every((d) => d.gecisUcu === true && d.derece === 2));
  // sanal kenar kablo etiketi sayılmaz
  assert.deepEqual(kenarEtiketleri(r), ['7600', '7601']);
  // öbür numaradan başlayınca aynı iz
  assert.deepEqual(r.dugumler.map(kod).sort(), iz('7601').dugumler.map(kod).sort());
});

test('diyot, sigorta ve iki uçlu şalter de geçer', () => {
  const diyot = iz('7610');
  assert.deepEqual(zk(diyot), ['86B01 3/13', '86V01 -/2', '86V01 -/1', '86A01 15/14']);
  assert.equal(diyot.kenarlar.find((e) => e.sanal).bilesen.tur, 'diyot');
  const sigorta = iz('7620');
  assert.deepEqual(zk(sigorta), ['86B01 3/14', '86F01 -/2', '86F01 -/1', '86A01 15/15']);
  assert.equal(sigorta.kenarlar.find((e) => e.sanal).bilesen.tur, 'sigorta');
  const salter = iz('7630');
  assert.deepEqual(zk(salter), ['86B01 3/15', '86S01 -/13', '86S01 -/14', '86A01 15/17']);
  assert.equal(salter.kenarlar.find((e) => e.sanal).bilesen.tur, 'salter');
  for (const r of [diyot, sigorta, salter]) assert.deepEqual(r.sayilar, { kablo: 2, sanal: 1, ic: 0, kendineDonen: 0 });
});

test('üç terminalli şalter geçiş bileşeni değildir: iz şalterin pininde biter', () => {
  const r = iz('7640');
  assert.equal(r.sayilar.sanal, 0);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['86B01 3/16', '86S02 -/1']);
  assert.ok(r.dugumler.every((d) => d.gecisUcu === false));
  assert.equal(KB.veri.cihaz(db, '86S02').gecis, false);
});

test('motor, lamba, röle iki terminalli olsa da geçmez', () => {
  for (const [no, cihaz, pin] of [['7650', '86M01', '1'], ['7660', '86E01', '1'], ['7670', '86K01', '85']]) {
    const r = iz(no);
    assert.equal(r.sayilar.sanal, 0, `${cihaz}`);
    assert.equal(r.dugumler.length, 2, `${cihaz}`);
    assert.ok(r.dugumler.some((d) => d.cihaz === cihaz && d.pin === pin));
    assert.equal(KB.veri.cihaz(db, cihaz).gecis, false, `${cihaz}.gecis`);
  }
});

test('tek terminalli sigorta geçmez', () => {
  const r = iz('7680');
  assert.equal(r.sayilar.sanal, 0);
  assert.equal(r.dugumler.length, 2);
  assert.equal(KB.veri.cihaz(db, '86F02').gecis, false);
});

test('pin adsız iki uçlu direnç: iki ayrı terminal, yanlışlıkla birleşmez, yine de geçer', () => {
  const r = iz('7690');
  assert.equal(r.sayilar.sanal, 1);
  const uclar = r.dugumler.filter((d) => d.cihaz === '86R02');
  assert.equal(uclar.length, 2, 'iki ayrı terminal düğümü');
  assert.ok(uclar.every((d) => d.adresEksik === true && d.gecisUcu === true));
  assert.deepEqual(kenarEtiketleri(r), ['7690', '7691']);
  assert.equal(r.dugumler.length, 4);
  assert.equal(r.bilesenler.length, 1);
  assert.equal(KB.veri.cihaz(db, '86R02').gecis, true);
});

test('sigortanın bir terminalinde iki kablo + sanal kenar = dal', () => {
  const r = iz('7700');
  assert.equal(r.dal, true);
  const t = r.dugumler.find((d) => d.cihaz === '86F03' && d.pin === '1');
  assert.ok(t);
  assert.equal(t.derece, 3);
  assert.equal(t.dal, true);
  assert.equal(t.gecisUcu, true);
  assert.deepEqual(r.sayilar, { kablo: 3, sanal: 1, ic: 0, kendineDonen: 0 });
  // terminaldeki numarası farklı ama bağlı gerçek parça ize girer: 7701 de var
  assert.deepEqual(kenarEtiketleri(r), ['7700', '7701', '7702']);
  assert.equal(r.bilesenler[0].zincir, null);
});

test('KB.veri.cihaz(..).gecis ve db.istatistik.gecis', () => {
  for (const k of ['86R01', '86V01', '86F01', '86S01', '86R02', '86F03']) assert.equal(KB.veri.cihaz(db, k).gecis, true, k);
  for (const k of ['86S02', '86M01', '86E01', '86K01', '86F02', '86A01', '86B01']) assert.equal(KB.veri.cihaz(db, k).gecis, false, k);
  // t3: 86R01, 86V01, 86F01, 86S01, 86R02, 86F03 (6) + t4/t5: iki şemaya bölünmüş direnç 96R01 (1)
  assert.equal(db.istatistik.gecis, 7);
  assert.equal(KB.veri.cihaz(db, '96R01').gecis, true);
});

test('şema süzgeci: bileşenin iki terminalinin ikisi de süzgeçten geçen şemada yoksa sanal kenar kurulmaz', () => {
  // 7810 (t4) | 96R01 | 7811 (t5)
  const tum = iz('7810');
  assert.equal(tum.sayilar.sanal, 1);
  assert.deepEqual(tum.semalar.slice().sort(), ['t4', 't5']);
  const yalniz = iz('7810', { semalar: ['t4'] });
  assert.equal(yalniz.sayilar.sanal, 0);
  assert.deepEqual(yalniz.semalar, ['t4']);
  assert.deepEqual(yalniz.dugumler.map(kod).sort(), ['96B01 3/1', '96R01 -/1']);
  const yalniz5 = iz('7811', { semalar: ['t5'] });
  assert.equal(yalniz5.sayilar.sanal, 0);
  assert.deepEqual(yalniz5.dugumler.map(kod).sort(), ['96A01 15/1', '96R01 -/2']);
});

// ================================================================================================
//  G. cihaz içi köprü (ic)
// ================================================================================================
test('ic köprüsü kablo sayılmaz ama izlenir (D+ ↔ DF)', () => {
  const r = iz('7710');
  assert.deepEqual(r.sayilar, { kablo: 2, sanal: 0, ic: 1, kendineDonen: 0 });
  assert.deepEqual(zk(r), ['85B01 3/23', '85G01 -/D+', '85G01 -/DF', '85B02 3/23']);
  const ic = r.kenarlar.filter((e) => e.ic);
  assert.equal(ic.length, 1);
  assert.equal(ic[0].etiket, null);
  assert.equal(ic[0].renk, null);
  assert.equal(ic[0].kesit, null);
  assert.equal(ic[0].sanal, false);
  assert.deepEqual(kenarEtiketleri(r), ['7710', '7711'], 'ic kenarı etiket listesine girmez');
  // DF tarafından başlayınca aynı bileşen
  assert.deepEqual(iz('7711').dugumler.map(kod).sort(), r.dugumler.map(kod).sort());
});

test('ic ve kendine dönen parçalar kablo sayısına girmez (mini veri: 2 numaralı kablo + 1 ic + 1 kendine dönen)', () => {
  const mini = yukle([sema('mini', {
    cihazlar: cl('85G01', '85B01', '85B02'),
    kablolar: [
      K('p1', '7710', [C('85G01', null, 'D+'), C('85B01', '3', '1')]),
      K('p2', '7711', [C('85G01', null, 'DF'), C('85B02', '3', '1')]),
      K('p3', null, [C('85G01', null, 'DF'), C('85G01', null, 'D+')], [1, '30', 'A'], { ic: true }),
      K('p4', '7712', [S('X70.9', '1'), S('X70.9', '1')]),
    ],
  })]);
  assert.equal(mini.istatistik.parca, 4);
  assert.equal(mini.istatistik.ic, 1);
  assert.equal(mini.istatistik.kendineDonen, 1);
  assert.equal(mini.istatistik.kablo, 3, 'kablo = 7710, 7711, 7712 (ic hariç)');
  const liste = KB.ara.liste(mini, mini.sekmeler[0].id).kablo;
  assert.deepEqual(liste.map((k) => k.anahtar).sort(), ['7710', '7711', '7712']);
  // etiketsiz ic parçası aranamaz
  assert.equal(KB.ara.ara(mini, 'cihaz içi').kablo.length, 0);
  assert.equal(mini.semalar.mini.icSayisi, 1);
  assert.equal(mini.semalar.mini.kendineDonenSayisi, 1);
  assert.equal(mini.semalar.mini.parcaSayisi, 4);
});

// ================================================================================================
//  H. kendine dönen, aynı soket içinde köprü
// ================================================================================================
test('kendine dönen kablo yapıyı bozmaz: derece/zincir hesabına girmez, düğümde ve bileşende taşınır', () => {
  const r = iz('7801');
  const x = bir(r, 'X72.1/1');
  assert.equal(x.derece, 2, 'kendine dönen kenar dereceye girmez');
  assert.equal(x.dal, false);
  assert.equal(x.yaprak, false);
  assert.equal(x.kendineDonen.length, 1);
  assert.deepEqual(zk(r), ['82B01 3/24', 'X72.1/1', '82A01 15/24']);
  const b = r.bilesenler[0];
  assert.equal(b.kendineDonenKenarlar.length, 1);
  assert.equal(b.kendineDonenKenarlar[0], x.kendineDonen[0]);
  assert.equal(r.dal, false);
  assert.equal(r.dongu, false);
  assert.deepEqual(r.sayilar, { kablo: 3, sanal: 0, ic: 0, kendineDonen: 1 });
  const e = r.kenarlar.find((k) => k.kendineDonen);
  assert.equal(e.a, e.b);
  assert.equal(e.a, x.id);
  assert.equal(e.etiket, '7800');
  assert.equal(e.varyant, true);
  assert.equal(e.geri, false);
  // kendine dönen kendi numarasıyla aranınca da bulunur
  assert.deepEqual(KB.ara.ara(db, '7800').kablo.map((k) => k.anahtar), ['7800']);
  assert.ok(iz('7800').kenarlar.some((k) => k.kendineDonen));
});

test('sözleşme: Dugum.kenarlar kendine dönen kenarları içermez (API.md §4.4)', () => {
  const r = iz('7801');
  const x = bir(r, 'X72.1/1');
  const kd = r.kenarlar.filter((e) => e.kendineDonen).map((e) => e.id);
  assert.equal(kd.length, 1);
  assert.deepEqual(x.kenarlar.filter((id) => kd.includes(id)), [], `Dugum.kenarlar = ${JSON.stringify(x.kenarlar)} kendine dönen kenarı ${kd} içeriyor; derece ${x.derece}`);
  assert.equal(x.kenarlar.length, x.derece, 'kenarlar.length derece ile aynı olmalı');
});

test('aynı soket içinde köprü normal numaralı kablodur (soketIci)', () => {
  const r = iz('7900');
  assert.equal(r.kenarlar.length, 1);
  const e = r.kenarlar[0];
  assert.equal(e.soketIci, true);
  assert.equal(e.ic, false);
  assert.equal(e.kendineDonen, false);
  assert.equal(e.etiket, '7900');
  assert.deepEqual(r.sayilar, { kablo: 1, sanal: 0, ic: 0, kendineDonen: 0 });
  assert.equal(r.dugumler.length, 2);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['83A01 9/5', '83A01 9/6']);
  assert.deepEqual(KB.ara.ara(db, '7900').kablo.map((k) => k.anahtar), ['7900'], 'aranabilir');
});

test('soketIci yalnız aynı cihazın aynı soketinde farklı pinler için true', () => {
  assert.equal(iz('7001').kenarlar.every((e) => e.soketIci === false), true);
  assert.equal(iz('7210').kenarlar.every((e) => e.soketIci === false), true);
});

// ================================================================================================
//  I. paralel parçalar, sınır, etiketsiz dal
// ================================================================================================
test('aynı iki düğümü bağlayan aynı numaralı parçalar tek kenarda birleşir, iki kaynak taşır', () => {
  const r = iz('7960');
  assert.equal(r.kenarlar.length, 1);
  assert.equal(r.dugumler.length, 2);
  const e = r.kenarlar[0];
  assert.deepEqual(e.parcalar.slice().sort(), ['t1:l1', 't1:l2']);
  assert.deepEqual(e.kaynaklar.map((k) => k.yol).sort(), ['10', '11']);
  assert.equal(r.dal, false);
  assert.equal(r.dongu, false);
});

test('maksKenar: uzun zincir sınırda kesilir (sinirAsildi, kesik düğüm, sinir uyarısı)', () => {
  const tam = iz('7970');
  assert.equal(tam.sinirAsildi, false);
  assert.equal(tam.kenarlar.length, 12);
  assert.equal(tam.dugumler.length, 13);
  assert.equal(tam.bilesenler[0].zincir.length, 13);
  const kisa = iz('7970', { maksKenar: 5 });
  assert.equal(kisa.sinirAsildi, true);
  assert.ok(kisa.kenarlar.length <= 5, `kenar sayısı ${kisa.kenarlar.length} > 5`);
  assert.ok(kisa.dugumler.some((d) => d.kesik === true), 'sınırdaki düğüm kesik:true');
  assert.ok(kisa.uyarilar.some((u) => u.tur === 'sinir'));
});

test('etiketli parçanın cihaz pinindeki etiketsiz parça onun dalıdır (7980 → 42A01)', () => {
  const r = iz('7980');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['04A03 15/10', '42A01 3/1', 'X08.11/1']);
  assert.equal(r.kenarlar.length, 2);
  assert.deepEqual(r.kenarlar.map((e) => e.etiket).sort((a, b) => String(a).localeCompare(String(b))), ['7980', null]);
  assert.equal(r.kenarlar.filter((e) => e.etiket === null).length, 1, 'etiketsiz dal kenarı');
});

test('etiketsiz dal: 7980 izi 42A01 ucuna uzanır, 7981 başka kablo olarak digerKablolar da kalır', () => {
  const r = iz('7980');
  const son = bir(r, '42A01 3/1');
  assert.equal(son.yaprak, true);
  assert.ok(son.digerKablolar.some((d) => d.etiket === '7981'), `digerKablolar: ${JSON.stringify(son.digerKablolar)}`);
  assert.equal(r.dugumler.some((d) => kod(d) === '94B01 3/29'), false, '7981 in öbür ucu 7980 izine girmemeli');
  assert.equal(r.dal, false);
  assert.deepEqual(zk(r).length, 3);
});

test('tersi yok: 7981 izinde etiketsiz parça 7981 e dal olur ama onun öbür ucundaki 7980 çekilmez', () => {
  const r = iz('7981');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['04A03 15/10', '42A01 3/1', '94B01 3/29']);
  assert.equal(r.dugumler.some((d) => kod(d) === 'X08.11/1'), false, '7980 çekilmemeli');
  const pin = bir(r, '04A03 15/10');
  assert.ok(pin.digerKablolar.some((d) => d.etiket === '7980'), `digerKablolar: ${JSON.stringify(pin.digerKablolar)}`);
});

// ================================================================================================
//  R. B- ile B farklı pinler
// ================================================================================================
test('B- ile B aynı cihazın farklı pinleridir: aynı numaralı kablolar birleşip dal kurmaz', () => {
  const r = iz('7992');
  assert.equal(r.bilesenler.length, 2, `B- ile B tek pinmiş gibi birleşti: ${r.dugumler.map(kod).join(' | ')}`);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['95B01 3/31', '95B02 3/31', '95G02 -/B', '95G02 -/B-']);
  assert.equal(r.dal, false);
  assert.equal(r.celiski, false);
});

test('B- ile B: farklı numaralı kablolar çelişki yaratmaz (aynı cihazın farklı pinleri)', () => {
  const a = iz('7993');
  const b = iz('7994');
  assert.equal(a.celiski, false, 'B- pinindeki 7993, B pinindeki 7994 ile çelişki sayılmamalı');
  assert.equal(b.celiski, false);
  assert.ok(a.dugumler.every((d) => d.digerKablolar.length === 0), `digerKablolar: ${JSON.stringify(a.dugumler.map((d) => d.digerKablolar))}`);
  assert.ok(b.dugumler.every((d) => d.digerKablolar.length === 0), `digerKablolar: ${JSON.stringify(b.dugumler.map((d) => d.digerKablolar))}`);
  assert.equal(a.dugumler.some((d) => d.celiski), false);
  assert.equal(b.dugumler.some((d) => d.celiski), false);
  assert.equal(a.kenarlar.some((e) => e.celiski), false);
  assert.equal(b.kenarlar.some((e) => e.celiski), false);
  assert.deepEqual(a.dugumler.map(kod).sort(), ['95B01 3/32', '95G03 -/B-']);
  assert.deepEqual(b.dugumler.map(kod).sort(), ['95B02 3/32', '95G03 -/B']);
  assert.equal(a.bilesenler.length, 1);
  assert.equal(b.bilesenler.length, 1);
});

test('B- pin sorgusu B pininin kablosunu getirmez (aynı cihaz, iki pin)', () => {
  // 95G03: B- pininde yalnız 7993, B pininde yalnız 7994
  const r = uc({ cihaz: '95G03', soket: null, pin: 'B-' });
  assert.deepEqual(r.dugumler.map(kod).sort(), ['95B01 3/32', '95G03 -/B-']);
  assert.equal(r.bilesenler[0].baslangic, bir(r, '95G03 -/B-').id);
  assert.equal(r.celiski, false);
  const b = uc({ cihaz: '95G03', soket: null, pin: 'B' });
  assert.deepEqual(b.dugumler.map(kod).sort(), ['95B02 3/32', '95G03 -/B']);
  assert.equal(b.bilesenler[0].baslangic, bir(b, '95G03 -/B').id);
  assert.equal(b.celiski, false);
  // 95G02: iki pinde de 7992; her pin yalnız kendi ucunu getirir (öbür pinin 7992 parçası karışmaz)
  const c = uc({ cihaz: '95G02', soket: null, pin: 'B-' });
  assert.deepEqual(c.dugumler.map(kod).sort(), ['95B01 3/31', '95G02 -/B-']);
  const d = uc({ cihaz: '95G02', soket: null, pin: 'B' });
  assert.deepEqual(d.dugumler.map(kod).sort(), ['95B02 3/31', '95G02 -/B']);
});

// ================================================================================================
//  N. numarasız kablo
// ================================================================================================
test('numarasız kablo etiketle izlenir: 70sw', () => {
  const r = iz('70sw');
  assert.equal(r.kablo.no, null);
  assert.equal(r.kablo.etiket, '70sw');
  assert.equal(r.baslik, 'Kablo 70sw');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['87A01 -/B+', '87B01 -/30']);
  assert.equal(r.kenarlar[0].kesit, '70');
  assert.equal(r.kenarlar[0].renk, 'sw');
  assert.equal(r.kenarlar[0].kesitSemaNotu, false);
  assert.equal(r.kenarlar[0].renkSemaNotu, false);
  assert.deepEqual(zk(iz('70SW')), zk(r));
});

test('kablo anahtarıyla (etiket:70SW) de izlenir', () => {
  const k = KB.ara.ara(db, '70sw').kablo[0];
  assert.equal(k.anahtar, 'etiket:70SW');
  assert.deepEqual(iz(k.anahtar).dugumler.map(kod).sort(), ['87A01 -/B+', '87B01 -/30']);
});

// ================================================================================================
//  çıktı nesneleri: her çağrıda yeni nesne (API.md §0: "sorgular aynı nesneyi tekrar vermez ama db iç kayıtlarını paylaşabilir")
// ================================================================================================
test('çıktı: her sorgu yeni üst düzey nesne verir; üst düzey alanları bozmak sonraki sorguyu etkilemez', () => {
  const sorgular = [
    () => KB.izle.kablo(db, '7001'),
    () => KB.izle.kablo(db, '7100'),
    () => KB.izle.uc(db, { soket: 'X71.1', pin: '4' }),
    () => KB.ara.ara(db, '7001'),
    () => KB.ara.ara(db, '71A01'),
    () => KB.ara.liste(db, db.sekmeler[0].id),
    () => KB.cihazSorgu.cihaz(db, '71A01'),
    () => KB.soketSorgu.soket(db, 'X71.1'),
    () => KB.veri.cihaz(db, '71A01'),
    () => KB.oner.oner(db, '7OO1'),
  ];
  for (const q of sorgular) {
    const a = q();
    const b = q();
    assert.notEqual(a, b, 'aynı nesne iki kez döndü: ' + q.toString().slice(0, 60));
    const ilk = JSON.stringify(b);
    if (Array.isArray(a)) { a.length = 0; } else { for (const k of Object.keys(a)) a[k] = 'BOZULDU'; a.__ek = 1; }
    assert.equal(JSON.stringify(q()), ilk, 'üst düzey bozulması sonraki sorguyu etkiledi: ' + q.toString().slice(0, 60));
  }
});
