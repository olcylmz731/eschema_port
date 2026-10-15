// KB.renkler (API.md §7) ve Kenar/Dugum alanları: renk, kesit, şema notu, ad, ham (API.md §4.4–4.5)
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, D, V, K, cz, sema, yukle, kod } from './yardimci.mjs';
import { izKontrol } from './degismezler.mjs';

const R = KB.renkler;

// ---- KB.renkler ---------------------------------------------------------------------------------------
test('renk kısaltmaları: 12 renk adı (sözleşme tablosu)', () => {
  const beklenen = { ws: 'beyaz', sw: 'siyah', rt: 'kırmızı', gn: 'yeşil', ge: 'sarı', bl: 'mavi', br: 'kahverengi', gr: 'gri', li: 'lila', or: 'turuncu', rs: 'pembe', vi: 'mor' };
  for (const [k, ad] of Object.entries(beklenen)) {
    assert.equal(R.ad(k), ad, k);
    const c = R.coz(k);
    assert.equal(c.kisaltma, k);
    assert.equal(c.ad, ad);
    assert.equal(c.taniniyor, true);
    assert.deepEqual(c.parcalar, [{ kisaltma: k, ad, taniniyor: true }]);
  }
});

test('iki renkli: sw/rt → siyah-kırmızı, iki parça', () => {
  const c = R.coz('sw/rt');
  assert.equal(c.kisaltma, 'sw/rt');
  assert.equal(c.ad, 'siyah-kırmızı');
  assert.equal(c.taniniyor, true);
  assert.deepEqual(c.parcalar, [
    { kisaltma: 'sw', ad: 'siyah', taniniyor: true },
    { kisaltma: 'rt', ad: 'kırmızı', taniniyor: true },
  ]);
  assert.equal(R.ad('sw/rt'), 'siyah-kırmızı');
  assert.equal(R.ad('ws/li'), 'beyaz-lila');
  assert.equal(R.ad('gr/li'), 'gri-lila');
});

test('tanınmayan kısaltma olduğu gibi döner, taniniyor:false', () => {
  assert.equal(R.ad('xx'), 'xx');
  const c = R.coz('sw/xx');
  assert.equal(c.taniniyor, false);
  assert.equal(c.parcalar.length, 2);
  assert.equal(c.parcalar[0].taniniyor, true);
  assert.equal(c.parcalar[1].taniniyor, false);
  assert.equal(c.parcalar[1].kisaltma, 'xx');
  assert.equal(c.parcalar[1].ad, 'xx');
});

test('boş renk: coz → null', () => {
  assert.equal(R.coz(null), null);
  assert.equal(R.coz(''), null);
  assert.equal(R.coz(undefined), null);
});

test('kesit metni: ondalık nokta → virgül, "mm²"', () => {
  assert.equal(R.kesitMetni('2.5'), '2,5 mm²');
  assert.equal(R.kesitMetni('0.75'), '0,75 mm²');
  assert.equal(R.kesitMetni('1'), '1 mm²');
  assert.equal(R.kesitMetni('70'), '70 mm²');
  assert.equal(R.kesitMetni('35'), '35 mm²');
});

// ---- Kenar: renk ve kesit (şema notu ayrımı) ----------------------------------------------------------------
const e1 = sema('e1', {
  varsayilan: { renk: 'ws', kesit: '0.75', ham: 'TEST NOTU' },
  cihazlar: [cz('91A01', 'beyin', 'Steuergeraet', ['1'], 'Test Beyin'), cz('91B01', 'sensor', 'Sensor', ['2']), cz('X91.1', 'soket', 'Steckverbinder', ['3']), cz('91Z07', 'dugum', 'Punkt', ['4'])],
  kablolar: [
    K('r1', '9101', [C('91A01', '15', '1', 'EIN1'), C('91B01', '3', '1')]), // renk ve kesit yok → şema notu
    K('r2', '9102', [C('91A01', '15', '2'), C('91B01', '3', '2')], [1, '10', 'B'], { renk: 'sw/rt', kesit: '1' }),
    K('r3', '2,5-9103', [C('91A01', '15', '3'), C('91B01', '3', '3')], [1, '10', 'C'], { renk: 'gn' }), // kesit etiketten
    K('r4', '#9104', [C('91A01', '15', '4'), C('91B01', '3', '4')], [1, '10', 'D'], { varyant: true, not: 'Test notu' }),
    K('r5', '9105', [C('91A01', '15', '5'), S('X91.1', '1')]),
    K('r6', '9105', [S('X91.1', '1'), D('91Z07')]),
    K('r7', '9105', [D('91Z07'), C('91B01', '3', '5')]),
    K('r8', '9105', [D('91Z07'), V({ cihaz: '99Q99' })]),
  ],
});
const e2 = sema('e2', {
  varsayilan: null,
  cihazlar: [cz('92A01', 'beyin', 'x'), cz('92B01', 'sensor', 'y')],
  kablolar: [K('q1', '9201', [C('92A01', '15', '1'), C('92B01', '3', '1')])],
});
const db = yukle([e1, e2]);
const iz = (no) => {
  const r = KB.izle.kablo(db, no);
  assert.notEqual(r, null, no);
  assert.deepEqual(izKontrol(r), [], no);
  return r;
};

test('renk/kesit kablonun kendisinde yoksa şema notundan gelir ve "şema notu" bayrağı taşır', () => {
  const e = iz('9101').kenarlar[0];
  assert.equal(e.renk, 'ws');
  assert.equal(e.renkAd, 'beyaz');
  assert.equal(e.renkSemaNotu, true);
  assert.deepEqual(e.renkParcalari, [{ kisaltma: 'ws', ad: 'beyaz', taniniyor: true }]);
  assert.equal(e.kesit, '0.75');
  assert.equal(e.kesitMetni, '0,75 mm²');
  assert.equal(e.kesitSemaNotu, true);
});

test('kablonun kendi rengi ve kesiti şema notu sayılmaz (iki renkli: iki parça)', () => {
  const e = iz('9102').kenarlar[0];
  assert.equal(e.renk, 'sw/rt');
  assert.equal(e.renkAd, 'siyah-kırmızı');
  assert.equal(e.renkSemaNotu, false);
  assert.equal(e.renkParcalari.length, 2);
  assert.deepEqual(e.renkParcalari.map((p) => p.kisaltma), ['sw', 'rt']);
  assert.equal(e.kesit, '1');
  assert.equal(e.kesitMetni, '1 mm²');
  assert.equal(e.kesitSemaNotu, false);
});

test('kesit etiketten (2,5-9103): "2.5", şema notu değil; kenar etiketi şemadaki gibi, başlık kesitsiz', () => {
  const e = iz('9103').kenarlar[0];
  assert.equal(e.kesit, '2.5');
  assert.equal(e.kesitMetni, '2,5 mm²');
  assert.equal(e.kesitSemaNotu, false);
  assert.equal(e.renk, 'gn');
  assert.equal(e.renkAd, 'yeşil');
  assert.equal(e.renkSemaNotu, false);
  assert.equal(e.etiket, '2,5-9103', 'Kenar.etiket şemada yazan etikettir (API.md §4.5)');
  assert.deepEqual(e.etiketler, ['2,5-9103']);
  const r = iz('9103');
  assert.equal(r.kablo.etiket, '9103', 'Kablo.etiket = isaret + no (API.md §11.8): kesit başlıkta yok');
  assert.equal(r.baslik, 'Kablo 9103');
  assert.equal(e.no, '9103');
  assert.equal(e.isaret, null);
});

test('# işareti, varyant ve not kenarda taşınır', () => {
  const e = iz('9104').kenarlar[0];
  assert.equal(e.isaret, '#');
  assert.equal(e.etiket, '#9104');
  assert.equal(e.no, '9104');
  assert.equal(e.varyant, true);
  assert.equal(e.not, 'Test notu');
  assert.equal(iz('9101').kenarlar[0].varyant, false);
  assert.equal(iz('9101').kenarlar[0].not, null);
  assert.equal(iz('9104').baslik, 'Kablo #9104');
  assert.equal(iz('9104').kablo.isaret, '#');
});

test('şema notu yoksa (varsayilan null) renk ve kesit null', () => {
  const e = iz('9201').kenarlar[0];
  assert.equal(e.renk, null);
  assert.equal(e.renkAd, null);
  assert.equal(e.kesit, null);
  assert.equal(e.kesitMetni, null);
  assert.equal(e.renkSemaNotu, false);
  assert.equal(e.kesitSemaNotu, false);
  assert.deepEqual(e.renkParcalari, []);
  assert.equal(db.semalar.e2.varsayilan, null);
  assert.deepEqual(db.semalar.e1.varsayilan, { renk: 'ws', kesit: '0.75', ham: 'TEST NOTU' });
});

// ---- Dugum: ad ve ham -----------------------------------------------------------------------------------------------
test('düğüm ad alanları: cihaz "kısaAd (kod)" / "kod", ara soket "X91.1", ek noktası, devam', () => {
  const r = iz('9105');
  const ad = (k) => r.dugumler.find((d) => kod(d) === k).ad;
  assert.equal(ad('91A01 15/5'), 'Test Beyin (91A01)');
  assert.equal(ad('91B01 3/5'), '91B01');
  assert.equal(ad('X91.1/1'), 'X91.1');
  assert.equal(ad('91Z07'), 'ek noktası 91Z07');
  const dv = r.dugumler.find((d) => d.tur === 'devam');
  assert.equal(dv.ad, 'devam → 99Q99');
  assert.equal(dv.hedefCihaz, '99Q99');
  assert.equal(dv.hedefCihazAd, null, 'bilinmeyen cihazın adı yok');
});

test('düğüm ham metinleri uçta yazan metinlerdir (ayrıştırılmış alan yanlışsa ham doğruyu gösterir)', () => {
  const r = iz('9101');
  const d = r.dugumler.find((x) => kod(x) === '91A01 15/1');
  assert.deepEqual(d.ham, ['EIN1 15/1']);
  const s = iz('9105').dugumler.find((x) => kod(x) === 'X91.1/1');
  assert.deepEqual(s.ham, ['X91.1/1']);
});

test('düğüm cihaz alanları: cihazTur, kisaAd, adDe, adTr, cihazBilinmiyor', () => {
  const d = iz('9101').dugumler.find((x) => kod(x) === '91A01 15/1');
  assert.equal(d.cihazTur, 'beyin');
  assert.equal(d.kisaAd, 'Test Beyin');
  assert.equal(d.adDe, 'Steuergeraet');
  assert.equal(d.adTr, null);
  assert.equal(d.cihazBilinmiyor, false);
  assert.equal(d.adresEksik, false);
  assert.equal(d.gecisUcu, false);
  assert.equal(d.belirsiz, false);
  assert.equal(d.celiski, false);
  assert.equal(d.kesik, false);
  assert.deepEqual(d.digerKablolar, []);
});

test('çözülmeyen devam düğümünde hedef cihaz bilgisi; bileşen listesinde varsa hedefCihazAd dolar', () => {
  const dv = iz('9105').dugumler.find((d) => d.tur === 'devam');
  assert.equal(dv.cozuldu, false);
  assert.equal(dv.sayfaIci, false);
  assert.equal(dv.hedef, null);
  const d2 = yukle([sema('h', {
    cihazlar: [cz('93A01', 'beyin', 'x'), cz('93A02', 'beyin', 'y', ['1'], 'Hedef Beyin')],
    kablolar: [K('h1', '9301', [C('93A01', '15', '1'), V({ cihaz: '93A02' })])],
  })]);
  const dv2 = KB.izle.kablo(d2, '9301').dugumler.find((d) => d.tur === 'devam');
  assert.equal(dv2.hedefCihaz, '93A02');
  assert.equal(dv2.hedefCihazAd, 'Hedef Beyin');
  assert.ok(dv2.ad.startsWith('devam → '));
  assert.ok(dv2.ad.includes('93A02'));
});
