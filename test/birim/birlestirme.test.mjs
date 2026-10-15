// Şemalar arası birleştirme, çelişki bayrakları, doğrulama/şüphe bilgisi, kaynaklar, yükleme (API.md §1, §4.6–4.7, §11)
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, D, K, cz, sema, yukle, kod, zincirKodlari as zk } from './yardimci.mjs';
import { izKontrol } from './degismezler.mjs';

function iz(no, opts) {
  const r = KB.izle.kablo(db, no, opts);
  assert.notEqual(r, null, `kablo ${no} bulunamadı`);
  const ih = izKontrol(r);
  assert.deepEqual(ih, [], `kablo ${no}: yapısal değişmez ihlali\n  ${ih.join('\n  ')}`);
  return r;
}
const bul = (r, k) => {
  const l = r.dugumler.filter((d) => kod(d) === k);
  assert.equal(l.length, 1, `${k}: ${l.length} düğüm; izde: ${r.dugumler.map(kod).join(' | ')}`);
  return l[0];
};

// ---- veri: u1 (doğrulanmamış) + u2 (doğrulanmış) + u3 (doğrulanmamış, ayrı sekme) ------------------
const u1 = sema('u1', {
  dogrulandi: false,
  cihazlar: [
    cz('81A01', 'beyin', 'Steuergeraet Eins', ['3'], null, null),
    cz('81B01', 'sensor', 'Sensor Eins', ['22']),
    cz('81G01', 'guc', 'Generator', ['30']),
    cz('81X01', 'besleme', 'Verteiler', ['31']),
    cz('81Z07', 'dugum', 'Verbindungspunkt', ['32']),
  ],
  kablolar: [
    // tutarlı: aynı uçlar iki şemada
    K('a1', '8030', [C('81A01', '15', '21'), C('81B01', '3', '7')], [1, '24', 'C']),
    // çelişki (2): aynı numara, aynı cihaz, iki farklı pin, iki ayrı şema
    K('a2', '8020', [C('81A01', '15', '22'), C('81B01', '3', '8')], [1, '24', 'D']),
    // çelişki DEĞİL: aynı şema iki pini birden gösteriyor
    K('a3', '8021', [C('81A01', '15', '23'), C('81B01', '3', '10')], [1, '25', 'A']),
    K('a4', '8021', [C('81A01', '15', '23'), C('81B01', '3', '11')], [1, '25', 'B']),
    // çelişki (1): aynı cihaz pininde farklı numaralı iki kablo
    K('a5', '8010', [C('81A01', '15', '20'), C('81B01', '3', '6')], [1, '22', 'D']),
    K('a6', '8011', [C('81A01', '15', '20'), C('81B01', '3', '5')], [1, '23', 'D']),
    // Beyin Listesi çelişkisi
    K('a7', '8070', [C('81A01', '15', '2', 'UREF'), C('81B01', '3', '2')], [1, '26', 'A']),
    // şüpheli / çözüldü / en kötü durum
    K('a8', '8080', [C('81A01', '15', '1?'), C('81B01', '3', '1')], [1, '27', 'A'], {
      durum: 'suphe',
      suphe: { soru: 'Kablo 8080 beyinde pin 11 mi 17 mi?', A: '11', B: '17', kirpinti: 'yok.png' },
    }),
    K('a9', '8081', [C('81A01', '15', '12'), C('81B01', '3', '12')], [1, '27', 'B'], { durum: 'cozuldu', not: 'A: 8081, B: 8087' }),
    K('a10', '8082', [C('81A01', '15', '14'), C('81B01', '3', '19')], [1, '28', 'A']),
    K('a11', '8082', [C('81A01', '15', '14'), C('81B01', '3', '19')], [1, '28', 'B'], {
      durum: 'suphe',
      suphe: { soru: 'Kablo 8082 hangi pine?', A: '19', B: '20', kirpinti: 'yok.png' },
    }),
    K('a12', '8083', [C('81A01', '15', '15'), C('81B01', '3', '20')], [1, '28', 'C']),
    K('a13', '8083', [C('81A01', '15', '15'), C('81B01', '3', '20')], [1, '28', 'D'], { durum: 'cozuldu', not: 'A/B ayrıştı' }),
    // kaynak sıralaması: sayfa 2 yol 30; sayfa 1 yol 40; sayfa 1 yol 5
    K('b1', '8040', [C('81A01', '15', '13'), S('X81.9', '1')], [2, '30', 'A']),
    K('b2', '8040', [S('X81.9', '1'), S('X81.9', '2')], [1, '40', 'A']),
    K('b3', '8040', [S('X81.9', '2'), C('81B01', '3', '13')], [1, '5', 'B']),
    K('b4', '8041', [C('81A01', '15', '16'), C('81B01', '3', '21')], [1, '~24', 'A']),
    // yerel ek noktası ~d1 (u1'e özel)
    K('c1', '8050', [C('81A01', '15', '30'), D('~d1')], [1, '31', 'A']),
    K('c2', '8050', [D('~d1'), C('81B01', '3', '14')], [1, '31', 'B']),
    // gerçek kodlu ek noktası (araç geneli): öbür yarısı u2'de
    K('c3', '8051', [C('81A01', '15', '31'), D('81Z07')], [1, '32', 'A']),
    // ara soket: öbür yarısı u2'de (numara ara soketten sonra değişiyor)
    K('c4', '8052', [C('81B01', '3', '16'), S('X81.1', '2')], [1, '33', 'A']),
    // aynı numara iki şemada ama bağlantısız (numara yeniden kullanılmış)
    K('c5', '8060', [C('81A01', '15', '33'), C('81B01', '3', '17')], [1, '34', 'A']),
    // numarasız etiket iki şemada
    K('c6', '70sw', [C('81G01', null, 'B+'), C('81X01', null, '30')], [1, '35', 'A'], { kesit: '70', renk: 'sw' }),
    // cihaz listesinde olmayan cihaz
    K('c7', '8099', [C('81K99', null, '1'), C('81B01', '3', '22')], [1, '36', 'A']),
  ],
  celiskiler: [{ kablo: 'a7', alan: 'pin', sema: '15/2', beyinListesi: '15/3', not: 'TEST: Beyin Listesi başka pin diyor' }],
});

const u2 = sema('u2', {
  dogrulandi: true,
  cihazlar: [
    cz('81A01', 'beyin', 'Steuergeraet Eins', ['5'], 'Test Beyin'),
    cz('81B01', 'sensor', 'Sensor Eins', ['7']),
    cz('82A01', 'beyin', 'Steuergeraet Zwei', ['8']),
    cz('82B01', 'sensor', 'Sensor Zwei', ['9']),
    cz('81G01', 'guc', 'Generator', ['10']),
    cz('81X01', 'besleme', 'Verteiler', ['11']),
    cz('81Z07', 'dugum', 'Verbindungspunkt', ['12']),
  ],
  kablolar: [
    K('d1', '8030', [C('81A01', '15', '21'), C('81B01', '3', '7')], [1, '10', 'A']),
    K('d2', '8020', [C('81A01', '15', '22'), C('81B01', '3', '9')], [1, '10', 'B']),
    K('d3', '8050', [C('82A01', '15', '30'), D('~d1')], [1, '11', 'A']),
    K('d4', '8050', [D('~d1'), C('82B01', '3', '14')], [1, '11', 'B']),
    K('d5', '8051', [D('81Z07'), C('81B01', '3', '15')], [1, '12', 'A']),
    K('d6', '8053', [S('X81.1', '2'), C('81A01', '15', '34')], [1, '13', 'A']),
    K('d7', '8060', [C('82A01', '15', '35'), C('82B01', '3', '18')], [1, '14', 'A']),
    K('d8', '70sw', [C('81G01', null, 'B+'), C('81X01', null, '30')], [1, '15', 'A'], { kesit: '70', renk: 'sw' }),
    K('d9', '8090', [C('82A01', '15', '36'), C('82B01', '3', '19')], [1, '16', 'A']),
  ],
});

const u3 = sema('u3', {
  dogrulandi: false,
  cihazlar: [cz('83A01', 'beyin', 'Steuergeraet Drei', ['1']), cz('83B01', 'sensor', 'Sensor Drei', ['2'])],
  kablolar: [K('e1', '8200', [C('83A01', '15', '1'), C('83B01', '3', '1')], [1, '20', 'A'])],
});

const db = yukle([u1, u2, u3], {
  sekmeler: [
    { id: 'ab', ad: 'Sekme AB', semalar: ['u1', 'u2'] },
    { id: 'c', ad: 'Sekme C', semalar: ['u3', 'u4-dosyasiz'] },
  ],
});

// ---- tutarlı birleşme ------------------------------------------------------------------------------
test('aynı numara iki şemada ve uçlar aynıysa tek kenar, iki kaynak, çelişki yok', () => {
  const r = iz('8030');
  assert.equal(r.kenarlar.length, 1);
  assert.equal(r.dugumler.length, 2);
  assert.deepEqual(r.kenarlar[0].parcalar.slice().sort(), ['u1:a1', 'u2:d1']);
  assert.deepEqual(r.kenarlar[0].kaynaklar.map((k) => k.sema).sort(), ['u1', 'u2']);
  assert.deepEqual(r.semalar.slice().sort(), ['u1', 'u2']);
  assert.equal(r.celiski, false);
  assert.equal(r.kenarlar[0].celiski, false);
  assert.ok(r.dugumler.every((d) => d.celiski === false));
  assert.ok(!r.uyarilar.some((u) => u.tur === 'celiski'));
  // her düğüm de iki şemanın kaynağını taşır
  const d = bul(r, '81B01 3/7');
  assert.deepEqual(d.kaynaklar.map((k) => k.sema).sort(), ['u1', 'u2']);
});

test('arama sonucunda iki şemada geçen kablo tek öğe: semalar, parcaSayisi, sekmeler', () => {
  const k = KB.ara.ara(db, '8030').kablo;
  assert.equal(k.length, 1);
  assert.deepEqual(k[0].semalar.slice().sort(), ['u1', 'u2']);
  assert.equal(k[0].parcaSayisi, 2);
  assert.deepEqual(k[0].sekmeler, ['ab']);
});

// ---- çelişki (2): aynı numara, aynı cihaz, iki farklı pin, ayrı şemalar ----------------------------
test('çelişki: aynı numaralı kablo aynı cihazın iki farklı pinine iniyor ve şemalar ayrı → celiski:true', () => {
  const r = iz('8020');
  assert.equal(r.celiski, true);
  assert.ok(r.uyarilar.some((u) => u.tur === 'celiski'), 'celiski uyarısı: ' + JSON.stringify(r.uyarilar.map((u) => u.tur)));
  // veri değiştirilmez: iki pin de ayrı düğüm olarak durur
  const a = bul(r, '81B01 3/8');
  const b = bul(r, '81B01 3/9');
  assert.equal(a.celiski, true);
  assert.equal(b.celiski, true);
  assert.deepEqual(a.kaynaklar.map((k) => k.sema), ['u1']);
  assert.deepEqual(b.kaynaklar.map((k) => k.sema), ['u2']);
  assert.ok(r.uyarilar.filter((u) => u.tur === 'celiski').every((u) => ['hata', 'uyari'].includes(u.onem)));
});

test('çelişki sayılmaz: aynı şema aynı cihazın iki pinini birden gösteriyorsa', () => {
  const r = iz('8021');
  assert.equal(r.celiski, false);
  assert.ok(!r.uyarilar.some((u) => u.tur === 'celiski'));
  assert.deepEqual(r.dugumler.map(kod).sort(), ['81A01 15/23', '81B01 3/10', '81B01 3/11']);
});

// ---- çelişki (1): cihaz pininde farklı numaralı kablolar -------------------------------------------
test('çelişki: aynı cihaz pininde farklı numaralı iki kablo birleşmez, ikisi de celiski:true taşır', () => {
  const a = iz('8010');
  const b = iz('8011');
  for (const [r, kendi, diger, uzak] of [[a, '8010', '8011', '81B01 3/6'], [b, '8011', '8010', '81B01 3/5']]) {
    assert.equal(r.celiski, true, `${kendi}`);
    assert.deepEqual(r.dugumler.map(kod).sort(), ['81A01 15/20', uzak].sort(), `${kendi}: birleşme olmamalı`);
    const pin = bul(r, '81A01 15/20');
    assert.equal(pin.celiski, true);
    assert.deepEqual(pin.digerKablolar.map((x) => x.etiket), [diger], `${kendi}: digerKablolar`);
    assert.equal(pin.digerKablolar[0].sema, 'u1');
    assert.ok(r.uyarilar.some((u) => u.tur === 'celiski'));
    assert.equal(r.kenarlar.length, 1);
  }
});

test('KB.veri.celiskiler: yükleme sırasında bulunan çelişkiler (8010/8011 ve 8020 var, 8030 yok)', () => {
  const c = KB.veri.celiskiler(db);
  assert.ok(Array.isArray(c));
  const metin = JSON.stringify(c);
  assert.ok(metin.includes('8010') || metin.includes('8011'), 'cihaz pini çelişkisi (8010/8011) listede yok');
  assert.ok(metin.includes('8020'), 'şemalar arası çelişki (8020) listede yok');
  assert.ok(!metin.includes('8030'), 'tutarlı 8030 çelişki olarak listelenmemeli');
  assert.ok(!metin.includes('8021'), 'aynı şemada iki pin (8021) çelişki olarak listelenmemeli');
});

test('arama listesinde çelişkili kablo celiski:true taşır', () => {
  assert.equal(KB.ara.ara(db, '8020').kablo[0].celiski, true);
  assert.equal(KB.ara.ara(db, '8010').kablo[0].celiski, true);
  assert.equal(KB.ara.ara(db, '8030').kablo[0].celiski, false);
  assert.equal(KB.ara.ara(db, '8021').kablo[0].celiski, false);
});

// ---- Beyin Listesi çelişkisi -----------------------------------------------------------------------------
test('Beyin Listesi çelişkisi: celiski değil, kenarda beyinListesi ve beyin-listesi uyarısı; şema esastır', () => {
  const r = iz('8070');
  assert.equal(r.celiski, false);
  assert.ok(r.uyarilar.some((u) => u.tur === 'beyin-listesi'), JSON.stringify(r.uyarilar.map((u) => u.tur)));
  const e = r.kenarlar[0];
  assert.equal(e.beyinListesi.length, 1);
  assert.equal(e.beyinListesi[0].alan, 'pin');
  assert.equal(e.beyinListesi[0].sema, '15/2');
  assert.equal(e.beyinListesi[0].beyinListesi, '15/3');
  assert.match(e.beyinListesi[0].not, /Beyin Listesi/);
  // şema esastır: düğüm şemadaki pini taşır
  assert.ok(r.dugumler.some((d) => kod(d) === '81A01 15/2'));
  assert.ok(!r.dugumler.some((d) => kod(d) === '81A01 15/3'));
  // çelişkisiz kenarda boş
  assert.deepEqual(iz('8030').kenarlar[0].beyinListesi, []);
});

// ---- doğrulama bayrakları --------------------------------------------------------------------------------
test('dogrulandi yalnız bütün şemalar doğrulanmışsa true; dogrulanmamisSemalar listesi', () => {
  const karisik = iz('8030'); // u1 (doğrulanmamış) + u2 (doğrulanmış)
  assert.equal(karisik.dogrulandi, false);
  assert.deepEqual(karisik.dogrulanmamisSemalar, ['u1']);
  assert.equal(karisik.kenarlar[0].dogrulandi, false);
  const dogru = iz('8090'); // yalnız u2
  assert.equal(dogru.dogrulandi, true);
  assert.deepEqual(dogru.dogrulanmamisSemalar, []);
  assert.equal(dogru.kenarlar[0].dogrulandi, true);
  assert.ok(dogru.kaynaklar.every((k) => k.dogrulandi === true));
  const yalnizU1 = iz('8021');
  assert.equal(yalnizU1.dogrulandi, false);
  assert.deepEqual(yalnizU1.dogrulanmamisSemalar, ['u1']);
});

test('kaynaklar kendi şemalarının doğrulama bayrağını taşır', () => {
  const r = iz('8030');
  const kay = Object.fromEntries(r.kaynaklar.map((k) => [k.sema, k.dogrulandi]));
  assert.deepEqual(kay, { u1: false, u2: true });
  assert.equal(db.semalar.u1.dogrulandi, false);
  assert.equal(db.semalar.u2.dogrulandi, true);
  assert.equal(db.istatistik.dogrulanmamisSema, 2, 'u1 ve u3');
});

// ---- şüphe, çözüldü, en kötü durum -----------------------------------------------------------------------
test('şüpheli parça: durum suphe, supheli true, suphe nesnesi aynen geçer; iz şüpheli', () => {
  const r = iz('8080');
  const e = r.kenarlar[0];
  assert.equal(e.durum, 'suphe');
  assert.equal(e.supheli, true);
  assert.deepEqual(e.suphe, { soru: 'Kablo 8080 beyinde pin 11 mi 17 mi?', A: '11', B: '17', kirpinti: 'yok.png' });
  assert.equal(r.supheli, true);
  assert.equal(KB.ara.ara(db, '8080').kablo[0].supheli, true);
  // düğümdeki '?' de şüphe
  const d = r.dugumler.find((x) => x.pin === '1?');
  assert.equal(d.belirsiz, true);
});

test('çözüldü: durum cozuldu, şüpheli değil, not korunur', () => {
  const r = iz('8081');
  const e = r.kenarlar[0];
  assert.equal(e.durum, 'cozuldu');
  assert.equal(e.supheli, false);
  assert.equal(e.suphe, null);
  assert.equal(e.not, 'A: 8081, B: 8087');
  assert.equal(r.supheli, false);
});

test('birleşen parçaların en kötü durumu geçerli: eslesti+suphe → suphe, eslesti+cozuldu → cozuldu', () => {
  const a = iz('8082');
  assert.equal(a.kenarlar.length, 1);
  assert.equal(a.kenarlar[0].parcalar.length, 2);
  assert.equal(a.kenarlar[0].durum, 'suphe');
  assert.equal(a.kenarlar[0].supheli, true);
  assert.ok(a.kenarlar[0].suphe && a.kenarlar[0].suphe.soru);
  const b = iz('8083');
  assert.equal(b.kenarlar.length, 1);
  assert.equal(b.kenarlar[0].durum, 'cozuldu');
  assert.equal(b.kenarlar[0].supheli, false);
});

// ---- kaynaklar --------------------------------------------------------------------------------------------
test('kaynaklar şema/sayfa/yol sırasıyla (yol doğal sırada: 5 < 40) ve tekil', () => {
  const r = iz('8040');
  const sira = r.kaynaklar.map((k) => `${k.sema} ${k.sayfa} ${k.yol}`);
  assert.deepEqual(sira, ['u1 1 5', 'u1 1 40', 'u1 2 30']);
  const anahtarlar = r.kaynaklar.map((k) => [k.sema, k.sayfa, k.yol, k.satir, k.parca].join('|'));
  assert.equal(new Set(anahtarlar).size, anahtarlar.length, 'tekrarlı kaynak');
});

test('kaynak alanları: izgara metni, PDF adı, kesin bayrağı', () => {
  const r = iz('8040');
  const k = r.kaynaklar[0];
  assert.equal(k.sema, 'u1');
  assert.equal(k.semaAd, 'Test u1');
  assert.equal(k.pdf, 'u1 stromlaufplan.pdf');
  assert.equal(k.sayfa, 1);
  assert.equal(k.yol, '5');
  assert.equal(k.satir, 'B');
  assert.equal(k.kesin, true);
  assert.equal(k.izgara, 'sayfa 1 · yol 5 · satır B');
  assert.equal(k.metin, 'u1 stromlaufplan.pdf · sayfa 1 · yol 5 · satır B');
  assert.equal(k.parca, 'b3');
  assert.equal(k.dogrulandi, false);
});

test('yol "~24" kesin değildir: kesin:false', () => {
  const r = iz('8041');
  const k = r.kaynaklar[0];
  assert.equal(k.kesin, false);
  assert.ok(String(k.yol).includes('24'));
  assert.ok(k.izgara.includes('24'));
});

// ---- yerel / gerçek ek noktası, ara soket ----------------------------------------------------------------
test('~d1 gibi yerel ek noktası adları şemaya özeldir: iki şemadaki ~d1 birleşmez', () => {
  const r = iz('8050');
  assert.equal(r.bilesenler.length, 2, `~d1 iki şemada birleşti: ${r.dugumler.map(kod).join(' | ')}`);
  const eklar = r.dugumler.filter((d) => d.tur === 'dugum');
  assert.equal(eklar.length, 2);
  assert.ok(eklar.every((d) => d.kodsuz === true && d.derece === 2));
  assert.equal(r.dugumler.length, 6);
  assert.equal(r.dal, false);
});

test('gerçek kodlu ek noktası (81Z07) araç geneli: iki şemadaki yarılar birleşir', () => {
  const r = iz('8051');
  assert.equal(r.bilesenler.length, 1);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['81A01 15/31', '81B01 3/15', '81Z07']);
  const z = bul(r, '81Z07');
  assert.equal(z.kodsuz, false);
  assert.equal(z.derece, 2);
  assert.deepEqual(z.kaynaklar.map((k) => k.sema).sort(), ['u1', 'u2']);
  assert.deepEqual(r.semalar.slice().sort(), ['u1', 'u2']);
});

test('ara soket araç geneli: X81.1 pin 2 iki şemada buluşur, numara ara soketten sonra değişir', () => {
  const r = iz('8052');
  assert.deepEqual(r.dugumler.map(kod).sort(), ['81A01 15/34', '81B01 3/16', 'X81.1/2']);
  assert.deepEqual(r.kenarlar.map((e) => e.etiket).sort(), ['8052', '8053']);
  assert.equal(bul(r, 'X81.1/2').acik, false);
  assert.deepEqual(iz('8053').dugumler.map(kod).sort(), r.dugumler.map(kod).sort());
});

test('şema süzgeci (opts.semalar): yalnız seçilen şemadaki parçalar katılır', () => {
  const r = iz('8052', { semalar: ['u1'] });
  assert.deepEqual(r.dugumler.map(kod).sort(), ['81B01 3/16', 'X81.1/2']);
  assert.equal(bul(r, 'X81.1/2').acik, true, 'öbür taraf süzgeç yüzünden yok → açık uç');
  assert.deepEqual(r.semalar, ['u1']);
  const r2 = iz('8053', { semalar: ['u2'] }); // 8052 u2'de yok; 8053 var
  assert.equal(KB.izle.kablo(db, '8052', { semalar: ['u2'] }), null, '8052 u2 şemasında geçmiyor');
  assert.deepEqual(r2.dugumler.map(kod).sort(), ['81A01 15/34', 'X81.1/2']);
  // Not: çelişki bayrağı yükleme sırasında bulunur; süzgeçli izde de korunur (API.md bunu açıkça söylemiyor; testle sabitlenmedi).
  assert.equal(iz('8020').celiski, true);
});

// ---- aynı numara bağlantısız ------------------------------------------------------------------------------
test('aynı numara iki şemada ama birbirine bağlı değilse iki bileşen (alt alta çizilir)', () => {
  const r = iz('8060');
  assert.equal(r.bilesenler.length, 2);
  assert.equal(r.dugumler.length, 4);
  assert.deepEqual(r.dugumler.map(kod).sort(), ['81A01 15/33', '81B01 3/17', '82A01 15/35', '82B01 3/18']);
  const k = KB.ara.ara(db, '8060').kablo;
  assert.equal(k.length, 1, 'aramada tek kablo');
  assert.equal(k[0].parcaSayisi, 2);
});

test('numarasız etiket iki şemada etiketle birleşir (70sw)', () => {
  const r = iz('70sw');
  assert.equal(r.kenarlar.length, 1);
  assert.deepEqual(r.kenarlar[0].parcalar.slice().sort(), ['u1:c6', 'u2:d8']);
  const k = KB.ara.ara(db, '70sw').kablo;
  assert.equal(k.length, 1);
  assert.deepEqual(k[0].semalar.slice().sort(), ['u1', 'u2']);
});

// ---- cihaz bilgisi birleşmesi -----------------------------------------------------------------------------
test('cihaz: şemalardaki yol listeleri birleşir, boş kısa ad dolu olandan tamamlanır', () => {
  const c = KB.veri.cihaz(db, '81a01');
  assert.equal(c.kod, '81A01');
  assert.deepEqual(c.yol, { u1: ['3'], u2: ['5'] });
  assert.deepEqual(c.semalar.slice().sort(), ['u1', 'u2']);
  assert.equal(c.kisaAd, 'Test Beyin');
  assert.equal(c.adDe, 'Steuergeraet Eins');
  assert.equal(c.cihazTur, 'beyin');
  assert.equal(c.cihazBilinmiyor, false);
  assert.equal(c.gecis, false);
});

test('cihaz bileşen listesinde yoksa cihazBilinmiyor:true ve tür kod harfinden (K → role)', () => {
  const c = KB.veri.cihaz(db, '81K99');
  assert.ok(c, 'kabloda geçen ama listede olmayan cihaz yine bulunmalı');
  assert.equal(c.cihazBilinmiyor, true);
  assert.equal(c.cihazTur, 'role');
  assert.equal(c.kisaAd, null);
  assert.equal(c.adDe, null);
  const r = iz('8099');
  const d = r.dugumler.find((x) => x.cihaz === '81K99');
  assert.equal(d.cihazBilinmiyor, true);
  assert.equal(d.cihazTur, 'role');
});

// ---- yükleme -----------------------------------------------------------------------------------------------
test('yükleme: sekmeler (semalar/eksikSemalar), semaSirasi, şema özeti, istatistik', () => {
  assert.deepEqual(db.semaSirasi, ['u1', 'u2', 'u3']);
  assert.deepEqual(db.sekmeler.map((t) => [t.id, t.semalar, t.eksikSemalar]), [
    ['ab', ['u1', 'u2'], []],
    ['c', ['u3'], ['u4-dosyasiz']],
  ]);
  assert.deepEqual(KB.veri.sekmeSemalari(db, 'ab'), ['u1', 'u2']);
  assert.deepEqual(KB.veri.sekmeSemalari(db, 'c'), ['u3']);
  assert.deepEqual(KB.veri.sekmeSemalari(db, null), ['u1', 'u2', 'u3']);
  assert.deepEqual(KB.veri.sekmeSemalari(db, ''), ['u1', 'u2', 'u3']);
  assert.equal(db.semalar.u1.parcaSayisi, u1.kablolar.length);
  assert.equal(db.semalar.u2.parcaSayisi, u2.kablolar.length);
  assert.equal(db.semalar.u1.icSayisi, 0);
  assert.equal(db.istatistik.sema, 3);
  assert.equal(db.istatistik.parca, u1.kablolar.length + u2.kablolar.length + u3.kablolar.length);
});

test('db.ornekler: ilk ekrandaki örnek aramalar gerçekten sonuç verir', () => {
  assert.ok(db.ornekler.kablo, 'kablo örneği yok');
  assert.ok(KB.ara.ara(db, db.ornekler.kablo).kablo.length >= 1, `kablo örneği ${db.ornekler.kablo} bulunamıyor`);
  assert.ok(db.ornekler.cihaz, 'cihaz örneği yok');
  assert.ok(KB.veri.cihaz(db, db.ornekler.cihaz), `cihaz örneği ${db.ornekler.cihaz}`);
  assert.ok(db.ornekler.soket, 'soket örneği yok');
  assert.ok(KB.ara.ara(db, db.ornekler.soket).soket.length >= 1, `soket örneği ${db.ornekler.soket} bulunamıyor`);
});

test('paket.veri dizi olarak da verilebilir (aynı db)', () => {
  const paket = { surum: 1, imza: 'x', sekmeler: [{ id: 'ab', ad: 'AB', semalar: ['u1', 'u2'] }], semalar: { u1: { ad: 'U1', pdf: 'u1.pdf', sayfalar: [1], kapak: [], dilim: 1 }, u2: { ad: 'U2', pdf: 'u2.pdf', sayfalar: [1], kapak: [], dilim: 1 } }, veri: [u1, u2] };
  const d2 = KB.veri.yukle(paket);
  assert.deepEqual(d2.semaSirasi, ['u1', 'u2']);
  assert.equal(d2.istatistik.parca, u1.kablolar.length + u2.kablolar.length);
  assert.equal(KB.izle.kablo(d2, '8030').kenarlar.length, 1);
});

test('bozuk kayıt atlanır, uyarı verilir, kalan veri çalışır', () => {
  const bozuk = sema('bz', {
    cihazlar: [cz('84A01', 'beyin', 'X'), cz('84B01', 'sensor', 'Y')],
    kablolar: [
      K('ok1', '8400', [C('84A01', '15', '1'), C('84B01', '3', '1')]),
      { id: 'bad1', etiket: '8401', no: '8401', uclar: [C('84A01', '15', '2')], izgara: { sayfa: 1, yol: '1', satir: 'A' }, durum: 'eslesti' }, // tek uç
      { id: 'bad2', etiket: '8402', no: '8402', uclar: [{ tur: 'bilinmeyen', x: 1 }, C('84B01', '3', '3')], izgara: { sayfa: 1, yol: '1', satir: 'A' }, durum: 'eslesti' },
      { id: 'bad3', etiket: '8403', no: '8403', izgara: { sayfa: 1, yol: '1', satir: 'A' } }, // uclar yok
      null,
    ],
  });
  let d3;
  assert.doesNotThrow(() => { d3 = yukle([bozuk]); });
  assert.ok(d3.uyarilar.length >= 1, 'bozuk kayıtlar için uyarı bekleniyordu');
  assert.deepEqual(KB.ara.ara(d3, '8400').kablo.map((k) => k.anahtar), ['8400']);
  assert.equal(KB.izle.kablo(d3, '8400').kenarlar.length, 1);
  // atlanan kayıtlar kablo olarak görünmez
  for (const no of ['8401', '8403']) assert.equal(KB.ara.ara(d3, no).kablo.length, 0, no);
});

test('boş şema (kablosuz) ve boş db hata vermez', () => {
  const bos = yukle([sema('bos', { cihazlar: [], kablolar: [] })]);
  assert.equal(bos.istatistik.kablo, 0);
  assert.equal(KB.ara.ara(bos, '1').toplam, 0);
  assert.equal(KB.ara.ara(bos, '').bos, true);
  assert.equal(bos.ornekler.kablo, null);
  assert.equal(KB.izle.kablo(bos, '1'), null);
  const hic = KB.veri.yukle({ surum: 1, imza: 'x', sekmeler: [], semalar: {}, veri: {} });
  assert.equal(hic.istatistik.parca, 0);
  assert.deepEqual(hic.semaSirasi, []);
  assert.equal(KB.ara.ara(hic, 'x').toplam, 0);
});

test('KB.veri.temizle: goruldu / emin / null alanlar ayıklanır (build.py ile aynı kural)', () => {
  const girdi = { a: 1, b: null, goruldu: { kirpinti: 'x' }, emin: true, ic: [{ x: null, y: 2, goruldu: 1, emin: false }], d: { e: null } };
  const cikti = KB.veri.temizle(girdi);
  assert.deepEqual(cikti, { a: 1, ic: [{ y: 2 }], d: {} });
  assert.deepEqual(girdi.b, null, 'girdi değiştirilmez');
  assert.ok('goruldu' in girdi);
});

test('temizlenmiş paketle yükleme, ham veriyle yüklemeyle aynı sonucu verir', () => {
  const ham = yukle([u1, u2, u3], { sekmeler: [{ id: 'ab', ad: 'AB', semalar: ['u1', 'u2'] }] });
  const paket = {
    surum: 1, imza: 'x', sekmeler: [{ id: 'ab', ad: 'AB', semalar: ['u1', 'u2'] }],
    semalar: { u1: { ad: 'U1', pdf: 'u1.pdf', sayfalar: [1], kapak: [], dilim: 1 }, u2: { ad: 'U2', pdf: 'u2.pdf', sayfalar: [1], kapak: [], dilim: 1 } },
    veri: { u1: KB.veri.temizle(u1), u2: KB.veri.temizle(u2) },
  };
  const t = KB.veri.yukle(paket);
  for (const no of ['8030', '8020', '8010', '8052', '8060', '70sw', '8040']) {
    const a = KB.metin.ozet(KB.izle.kablo(ham, no));
    const b = KB.metin.ozet(KB.izle.kablo(t, no));
    assert.equal(b, a, `${no}: temizlenmiş paket farklı metin verdi`);
  }
});

test('uç eşleştirmesi yazım farklarını yok sayar: "X08. 11" = "x08.11", "IV-18" = "iv 18", "84a01" = "84A01", ek noktası "84z07" = "84Z07"', () => {
  const y = yukle([sema('yz', {
    cihazlar: cl2('84A01', 'beyin', '84B01', 'sensor', '84B02', 'sensor'),
    kablolar: [
      // ara soket yazım farkı
      K('y1', '8300', [C('84B01', '3', '1'), S('X08. 11', '4')]),
      K('y2', '8300', [S('x08.11', '4'), C('84A01', 'IV-18', '10')]),
      // aynı cihaz pini: kod büyük/küçük harf, soket tire/boşluk farkı
      K('y3', '8301', [C('84A01', 'iv 18', '11'), C('84B01', '3', '2')]),
      K('y4', '8301', [C('84a01', 'IV-18', '11'), C('84B02', '3', '2')]),
      // ek noktası kodu
      K('y5', '8302', [C('84B01', '3', '3'), D('84z07')]),
      K('y6', '8302', [D('84Z07'), C('84B02', '3', '3')]),
    ],
  })]);
  for (const no of ['8300', '8301', '8302']) {
    const r = KB.izle.kablo(y, no);
    assert.equal(r.bilesenler.length, 1, `${no}: yazım farkı yüzünden ayrı bileşenlere bölündü: ${r.dugumler.map(kod).join(' | ')}`);
    assert.equal(r.dugumler.length, 3, `${no}: ${r.dugumler.map(kod).join(' | ')}`);
    assert.equal(r.kenarlar.length, 2, no);
  }
  // cihaz sorgusu da yazım farklarını tek pin sayar
  const q = KB.cihazSorgu.cihaz(y, '84A01');
  const pinler = [].concat(...q.soketler.map((g) => g.satirlar.map((x) => x.pin))).sort();
  assert.deepEqual(pinler, ['10', '11']);
});

function cl2(...cift) {
  const l = [];
  for (let i = 0; i < cift.length; i += 2) l.push(cz(cift[i], cift[i + 1], 'Test ' + cift[i], ['1']));
  return l;
}

test("ic:true kaydın iki ucu aynı cihazın pini değilse yükleme uyarısı 'ic-uc' verilir (API.md §1)", () => {
  const d = yukle([sema('icu', {
    cihazlar: cl2('85G01', 'guc', '85G02', 'guc', '85B01', 'sensor'),
    kablolar: [
      K('i1', null, [C('85G01', null, 'D+'), C('85G01', null, 'DF')], [1, '1', 'A'], { ic: true }), // geçerli
      K('i2', null, [C('85G01', null, 'B+'), C('85G02', null, 'B+')], [1, '2', 'A'], { ic: true }), // iki farklı cihaz: geçersiz
      K('i3', '8500', [C('85G01', null, 'D+'), C('85B01', '3', '1')], [1, '3', 'A']),
    ],
  })]);
  const u = d.uyarilar.filter((x) => x.tur === 'ic-uc');
  assert.equal(u.length, 1, JSON.stringify(d.uyarilar));
  assert.equal(u[0].sema, 'icu');
  assert.equal(u[0].id, 'i2');
  assert.equal(typeof u[0].mesaj, 'string');
  // geçerli köprü uyarı vermez ve kablo sayısına girmez
  assert.equal(d.istatistik.kablo, 1, 'ic:true kayıtlar kablo sayılmaz');
  assert.ok(d.istatistik.ic >= 1);
});
