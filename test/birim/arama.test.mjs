// KB.ara: arama sıralaması, gruplama, sekme süzgeci, boş sorgu, numarasız etiketler (API.md §3)
import test from 'node:test';
import assert from 'node:assert/strict';
import { KB, C, S, K, cz, sema, yukle } from './yardimci.mjs';

const N = KB.normalize;

// ---- sentetik veri (uydurma): iki şema, iki sekme --------------------------------------
// s1 (sekme "sa", doğrulanmamış) ve s2 (sekme "sb", doğrulanmış). 4002 numaralı kablo iki şemada da var.
// Veri sırası bilerek ters: önek eşleşmesi (40020) tam eşleşmeden (4002) ÖNCE tanımlı.
const s1 = sema('s1', {
  dogrulandi: false,
  cihazlar: [
    cz('61A01', 'beyin', 'Steuergeraet Alpha', ['3'], 'Kapı 9 beyni'),
    cz('61A02', 'beyin', 'Fahrpult Zwei', ['10'], 'FPS 2'),
    cz('61A03', 'beyin', 'Fahrpult Drei', ['12'], 'FPS 3'),
    cz('61B01', 'sensor', 'Drucksensor', ['22']),
    cz('61G01', 'guc', 'Generator', ['30']),
    cz('15A01', 'sensor', 'Temperaturfuehler', ['23']),
    cz('10B01', 'sensor', 'Messfuehler', ['24'], 'Modul 61A'),
    cz('X99.1', 'soket', 'Steckverbinder', ['40']),
  ],
  kablolar: [
    K('k01', '40020', [C('61A01', '15', '6', 'NHC'), C('61B01', '3', '1')], [1, '20', 'A']),
    K('k02', '4002', [C('61A02', 'IV-18', '10', 'HS10'), S('X99.1', '4')], [1, '24', 'A']),
    K('k03', '4002', [S('X99.1', '4'), C('61A01', '15', '5', 'NHB')], [1, '24', 'B']),
    K('k04', '4100', [C('61A03', 'IV-18', '10', 'HS10'), C('61B01', '3', '2')], [1, '25', 'A']),
    K('k05', '#9600', [C('61A01', '15', '2', 'UREF'), C('61B01', '3', '3')], [1, '26', 'A']),
    K('k06', '2,5-9700', [C('61G01', null, 'B+'), C('61B01', '3', '4')], [1, '27', 'A']),
    K('k07', '70sw', [C('61G01', null, 'B+'), C('15A01', null, '30')], [1, '28', 'A'], { kesit: '70', renk: 'sw' }),
    K('k08', '1sw/rt', [C('15A01', null, '15'), C('61A01', '15', '1', 'KL.15')], [1, '29', 'A'], { kesit: '1', renk: 'sw/rt' }),
    K('k09', '1ws/li', [C('15A01', null, '16'), C('61A01', '15', '3')], [1, '29', 'B'], { kesit: '1', renk: 'ws/li' }),
    K('k10', '15', [C('61A02', 'IV-18', '1'), C('61A01', '15', '9')], [1, '30', 'A']),
    K('k11', '9800', [C('61A01', '15', '1?'), C('61B01', '3', '5')], [1, '31', 'A'], {
      durum: 'suphe',
      suphe: { soru: 'Kablo 9800 beyinde hangi pine bağlı?', A: '11', B: '17', kirpinti: 'yok.png' },
    }),
    K('k12', '4300', [C('10B01', '1', '1'), C('61B01', '3', '6')], [1, '32', 'A']),
  ],
});
const s2 = sema('s2', {
  dogrulandi: true,
  cihazlar: [
    cz('61A01', 'beyin', 'Steuergeraet Alpha', ['5'], 'Kapı 9 beyni'),
    cz('61C01', 'sensor', 'Durchflusssensor', ['7']),
  ],
  kablolar: [
    K('k101', '4002', [C('61A01', '15', '5', 'NHB'), C('61C01', '1', '1')], [1, '5', 'A']),
    K('k102', '8001', [C('61A01', '15', '7'), C('61C01', '1', '2')], [1, '6', 'A']),
  ],
});
const db = yukle([s1, s2], {
  sekmeler: [
    { id: 'sa', ad: 'Sekme A', semalar: ['s1'] },
    { id: 'sb', ad: 'Sekme B', semalar: ['s2'] },
  ],
});

const anahtarlar = (s) => s.kablo.map((k) => k.anahtar);
const kodlar = (s) => s.cihaz.map((c) => c.kod);

// ---- normalizasyon ---------------------------------------------------------------------
test('cihaz kodu küçük harfle de bulunur: 61a01 = 61A01', () => {
  for (const q of ['61a01', '61A01', ' 61 a01 ']) {
    const s = KB.ara.ara(db, q);
    assert.equal(s.cihaz[0].kod, '61A01', `"${q}"`);
    assert.equal(s.cihaz[0].eslesme, 'tam');
  }
  const s = KB.ara.ara(db, '61a01');
  assert.equal(s.sorgu, '61a01', 'sorgu yazıldığı gibi geri gelir');
  assert.equal(s.anahtar, '61A01', 'anahtar normalize edilmiş sorgu');
});

test('soket adı: IV-18 yazımları (iv-18, İV-18, ıv18, "IV 18") aynı sonucu verir', () => {
  const beklenen = KB.ara.ara(db, 'IV-18').soket.map((x) => `${x.cihaz}|${x.soket}`).sort();
  assert.deepEqual(beklenen, ['61A02|IV-18', '61A03|IV-18']);
  for (const q of ['iv-18', 'İV-18', 'ıv18', 'IV 18', 'iv18']) {
    const s = KB.ara.ara(db, q);
    assert.deepEqual(s.soket.map((x) => `${x.cihaz}|${x.soket}`).sort(), beklenen, `"${q}"`);
    assert.ok(s.soket.every((x) => x.eslesme === 'tam'));
  }
});

// ---- sıralama: tam > önek > ad --------------------------------------------------------------
test('kablo: tam eşleşme önce, sonra önek (veri sırası ters olsa da)', () => {
  const s = KB.ara.ara(db, '4002');
  assert.deepEqual(anahtarlar(s), ['4002', '40020']);
  assert.deepEqual(s.kablo.map((k) => k.eslesme), ['tam', 'onek']);
  assert.deepEqual(s.gruplar, ['kablo']);
});

test('kablo: yalnız önek eşleşmeleri doğal sırada (4002 < 40020)', () => {
  const s = KB.ara.ara(db, '400');
  assert.deepEqual(anahtarlar(s), ['4002', '40020']);
  assert.ok(s.kablo.every((k) => k.eslesme === 'onek'));
});

test('kablo: olmayan numara bulunmaz; kelime ortasından eşleşme önek sayılmaz', () => {
  assert.equal(KB.ara.ara(db, '9999').toplam, 0);
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '002')), [], '002 hiçbir numaranın öneki değil');
});

test('cihaz: kod önekleri doğal sırada; ad eşleşmesi önek eşleşmelerinden SONRA gelir', () => {
  const s = KB.ara.ara(db, '61A');
  // 61A0x cihazları kod öneki; 10B01 cihazı kısa adındaki "Modul 61A" yüzünden ad eşleşmesi
  assert.deepEqual(s.cihaz.filter((c) => c.eslesme === 'onek').map((c) => c.kod), ['61A01', '61A02', '61A03']);
  assert.deepEqual(kodlar(s), ['61A01', '61A02', '61A03', '10B01'],
    'ad eşleşmesi (10B01) önek eşleşmelerinden sonra gelmeli; kod doğal sırası 10B01 < 61A01 olsa da');
  assert.equal(s.cihaz[3].eslesme, 'ad');
});

test('cihaz: kısa ad, Almanca ad ve ad içinden arama (kademe ad)', () => {
  let s = KB.ara.ara(db, 'fps');
  assert.deepEqual(kodlar(s).sort(), ['61A02', '61A03']);
  assert.ok(s.cihaz.every((c) => c.eslesme === 'ad'));
  s = KB.ara.ara(db, 'fps 3');
  assert.equal(s.cihaz[0].kod, '61A03');
  s = KB.ara.ara(db, 'beyni'); // "Kapı 9 beyni" içinde, ı/İ normalleşmesiyle de
  assert.deepEqual(kodlar(s), ['61A01']);
  assert.equal(s.cihaz[0].eslesme, 'ad');
  s = KB.ara.ara(db, 'Kapi 9');
  assert.deepEqual(kodlar(s), ['61A01'], 'kisaAd içindeki ı, "i" yazımıyla da bulunmalı');
  s = KB.ara.ara(db, 'fahrpult'); // Almanca ad (>= 4 harf)
  assert.deepEqual(kodlar(s).sort(), ['61A02', '61A03']);
});

// ---- gruplar ----------------------------------------------------------------------------
test('türe göre gruplama: cihaz / soket / kablo ayrı listelerde, gruplar sırası en iyi eşleşmeye göre', () => {
  // "15": beyin soketi 15 (tam), kablo 15 (tam), cihaz 15A01 (önek)
  const s = KB.ara.ara(db, '15');
  assert.deepEqual(kodlar(s), ['15A01']);
  assert.equal(s.cihaz[0].eslesme, 'onek');
  assert.deepEqual(s.soket.map((x) => [x.soket, x.cihaz, x.eslesme]), [['15', '61A01', 'tam']]);
  assert.deepEqual(anahtarlar(s), ['15']);
  assert.equal(s.kablo[0].eslesme, 'tam');
  // eşit en iyi eşleşmede (soket tam, kablo tam) soket, kablodan önce; önek olan cihaz en sonda
  assert.deepEqual(s.gruplar, ['soket', 'kablo', 'cihaz']);
  assert.deepEqual(s.sayilar, { cihaz: 1, soket: 1, kablo: 1 });
  assert.equal(s.toplam, 3);
  // her öğe kendi türünü taşır
  assert.equal(s.cihaz[0].tur, 'cihaz');
  assert.equal(s.soket[0].tur, 'soket');
  assert.equal(s.kablo[0].tur, 'kablo');
});

test('gruplar sırası: tam eşleşme önek eşleşmesini geçer; eşitlikte cihaz < soket < kablo', () => {
  // 'X99.1': hem cihaz (tam) hem ara soket (tam) → cihaz önce
  let s = KB.ara.ara(db, 'X99.1');
  assert.deepEqual(kodlar(s), ['X99.1']);
  assert.equal(s.soket.length, 1);
  assert.equal(s.soket[0].ara, true);
  assert.deepEqual(s.gruplar, ['cihaz', 'soket']);
  // '4002': yalnız kablo
  s = KB.ara.ara(db, '4002');
  assert.deepEqual(s.gruplar, ['kablo']);
  // '61A01': cihaz tam; kablo grubu yok (hiçbir kablo numarası 61A01 ile başlamıyor)
  s = KB.ara.ara(db, '61A01');
  assert.deepEqual(s.gruplar, ['cihaz']);
});

test('gruplar yalnız dolu olanları içerir; boş grup dizisi []', () => {
  const s = KB.ara.ara(db, 'zzzz');
  assert.deepEqual(s.gruplar, []);
  assert.deepEqual(s.cihaz, []);
  assert.deepEqual(s.soket, []);
  assert.deepEqual(s.kablo, []);
  assert.equal(s.toplam, 0);
  assert.equal(s.bos, false, 'sorgu var, sonuç yok: bos değil');
});

// ---- # işareti, kesitli ve numarasız etiketler ------------------------------------------------
test('#4002 = 4002', () => {
  const a = KB.ara.ara(db, '#4002');
  const b = KB.ara.ara(db, '4002');
  assert.deepEqual(anahtarlar(a), ['4002', '40020']);
  assert.deepEqual(anahtarlar(a), anahtarlar(b));
  assert.deepEqual(a.kablo.map((k) => k.eslesme), b.kablo.map((k) => k.eslesme));
});

test('# işaretli kablo: 9600 de #9600 de bulur, etiket # ile gelir', () => {
  for (const q of ['9600', '#9600']) {
    const s = KB.ara.ara(db, q);
    assert.deepEqual(anahtarlar(s), ['9600'], `"${q}"`);
    assert.equal(s.kablo[0].no, '9600');
    assert.equal(s.kablo[0].etiket, '#9600');
  }
});

test('kesitli etiket 2,5-9700: numarayla da, etiketin kendisiyle de bulunur', () => {
  for (const q of ['9700', '2,5-9700', '2.5-9700']) {
    const s = KB.ara.ara(db, q);
    assert.deepEqual(anahtarlar(s), ['9700'], `"${q}"`);
    assert.equal(s.kablo[0].no, '9700');
    assert.equal(s.kablo[0].etiket, '9700', 'numaralı kablonun etiketi isaret+no (API.md §11.8); kesit etikete girmez');
  }
});

test('numarasız etiket: 70sw aranınca bulunur (no yok, anahtar etiket:70SW)', () => {
  for (const q of ['70sw', '70SW', '70 sw']) {
    const s = KB.ara.ara(db, q);
    assert.equal(s.kablo.length >= 1, true, `"${q}" bulunamadı`);
    const k = s.kablo[0];
    assert.equal(k.etiket, '70sw');
    assert.equal(k.no, null);
    assert.equal(k.anahtar, 'etiket:70SW');
    assert.equal(k.eslesme, 'tam');
  }
});

test('numarasız iki renkli etiket: 1sw/rt ve 1ws/li kablo olarak aranır, birbirine karışmaz', () => {
  let s = KB.ara.ara(db, '1sw/rt');
  assert.deepEqual(s.kablo.map((k) => k.etiket), ['1sw/rt']);
  assert.equal(s.kablo[0].no, null);
  assert.equal(s.kablo[0].anahtar, 'etiket:' + N.norm('1sw/rt'));
  assert.equal(s.kablo[0].eslesme, 'tam');
  assert.deepEqual(s.cihaz, [], '"/" içeren numarasız etiket aramasında cihaz grubu boş olmalı');
  s = KB.ara.ara(db, '1WS/LI');
  assert.deepEqual(s.kablo.map((k) => k.etiket), ['1ws/li']);
  assert.deepEqual(s.cihaz, []);
});

// ---- soket/pin yazımı ----------------------------------------------------------------------------
test('X99.1/4 yazımı: soket grubunda pin işaretlenir, sonuçta pin nesnesi dolu', () => {
  const s = KB.ara.ara(db, 'X99.1/4');
  assert.deepEqual(s.pin, { soket: 'X99.1', pin: '4' });
  assert.ok(s.soket.length >= 1);
  assert.equal(s.soket[0].soket, 'X99.1');
  assert.equal(s.soket[0].pin, '4');
  assert.equal(s.soket[0].ara, true);
  // soket/pin yazımı olmayan sorguda pin null
  assert.equal(KB.ara.ara(db, 'X99.1').pin, null);
  assert.equal(KB.ara.ara(db, 'X99.1').soket[0].pin, null);
});

test('IV-18/10 yazımı: IV-18 soketi olan her cihazda pin 10 işaretlenir', () => {
  for (const q of ['IV-18/10', 'iv-18/10', 'ıv18/10']) {
    const s = KB.ara.ara(db, q);
    assert.ok(s.pin, `"${q}" için pin nesnesi yok`);
    assert.equal(N.norm(s.pin.soket), 'IV18');
    assert.equal(s.pin.pin, '10');
    assert.deepEqual(s.soket.map((x) => x.cihaz).sort(), ['61A02', '61A03'], `"${q}"`);
    assert.ok(s.soket.every((x) => x.soket === 'IV-18' && x.pin === '10'));
  }
});

// ---- sekme süzgeci -----------------------------------------------------------------------------------
test('sekme süzgeci: kablo yalnız o sekmenin şemalarında geçiyorsa listelenir', () => {
  // 40020 yalnız s1'de; 8001 yalnız s2'de; 4002 ikisinde
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '4002', { sekme: 'sa' })), ['4002', '40020']);
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '4002', { sekme: 'sb' })), ['4002']);
  assert.equal(KB.ara.ara(db, '8001', { sekme: 'sa' }).toplam, 0);
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '8001', { sekme: 'sb' })), ['8001']);
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '8001')), ['8001'], 'sekmesiz = Tümü');
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '8001', { sekme: null })), ['8001']);
  assert.deepEqual(anahtarlar(KB.ara.ara(db, '8001', { sekme: '' })), ['8001']);
});

test('sekme süzgeci: öğenin kendi semalar/sekmeler listesi daralmaz', () => {
  const k = KB.ara.ara(db, '4002', { sekme: 'sb' }).kablo[0];
  assert.deepEqual(k.semalar.slice().sort(), ['s1', 's2']);
  assert.deepEqual(k.sekmeler.slice().sort(), ['sa', 'sb']);
  assert.equal(k.parcaSayisi, 3, '2 parça s1 + 1 parça s2');
});

test('sekme süzgeci: cihaz da sekmenin şemalarında geçmeli', () => {
  assert.deepEqual(kodlar(KB.ara.ara(db, '61C01', { sekme: 'sa' })), []);
  assert.deepEqual(kodlar(KB.ara.ara(db, '61C01', { sekme: 'sb' })), ['61C01']);
  assert.deepEqual(kodlar(KB.ara.ara(db, '61C01')), ['61C01']);
  // 61A01 iki şemada: iki sekmede de var
  assert.deepEqual(kodlar(KB.ara.ara(db, '61A01', { sekme: 'sa' })), ['61A01']);
  assert.deepEqual(kodlar(KB.ara.ara(db, '61A01', { sekme: 'sb' })), ['61A01']);
  // 61G01 yalnız s1
  assert.deepEqual(kodlar(KB.ara.ara(db, '61G01', { sekme: 'sb' })), []);
});

test('sekme süzgeci: soket de süzülür (IV-18 yalnız sa)', () => {
  assert.equal(KB.ara.ara(db, 'IV-18', { sekme: 'sa' }).soket.length, 2);
  assert.equal(KB.ara.ara(db, 'IV-18', { sekme: 'sb' }).soket.length, 0);
});

test('bilinmeyen sekme kimliği hata vermez ve süzgeci yok saymaz', () => {
  const s = KB.ara.ara(db, '4002', { sekme: 'yok-boyle-sekme' });
  assert.equal(s.toplam, 0);
});

// ---- boş sorgu ------------------------------------------------------------------------------------------
test('boş sorgu + sekme yok = ilk ekran (bos: true, sonuç yok)', () => {
  for (const q of ['', '   ', null, undefined]) {
    const s = KB.ara.ara(db, q);
    assert.equal(s.bos, true, `${JSON.stringify(q)}`);
    assert.equal(s.toplam, 0);
    assert.deepEqual(s.gruplar, []);
    assert.deepEqual(s.cihaz.concat(s.soket, s.kablo), []);
  }
  assert.equal(KB.ara.ara(db, '', { sekme: null }).bos, true);
  assert.equal(KB.ara.ara(db, '', { sekme: '' }).bos, true);
});

test('boş sorgu + sekme = o sistemin cihaz ve kablo listesi (liste ile aynı)', () => {
  const s = KB.ara.ara(db, '', { sekme: 'sa' });
  assert.equal(s.bos, false);
  assert.equal(s.sekme, 'sa');
  // sa: yalnız s1; 61C01 ve 8001 yok
  const beklenenKablolar = ['15', '4002', '40020', '4100', '4300', '9600', '9700', '9800'].sort();
  const sayisal = s.kablo.filter((k) => k.no !== null).map((k) => k.anahtar).sort();
  assert.deepEqual(sayisal, beklenenKablolar);
  const numarasiz = s.kablo.filter((k) => k.no === null).map((k) => k.etiket).sort();
  assert.deepEqual(numarasiz, ['1sw/rt', '1ws/li', '70sw']);
  // cihazlar: s1'de kablosu olan cihazlar
  for (const k of ['61A01', '61A02', '61A03', '61B01', '61G01', '15A01', '10B01']) assert.ok(kodlar(s).includes(k), `${k} listede yok`);
  assert.ok(!kodlar(s).includes('61C01'), '61C01 yalnız s2 de; sa listesinde olmamalı');
  assert.ok(s.gruplar.includes('cihaz') && s.gruplar.includes('kablo'), 'liste cihaz ve kablo gruplarını içermeli');
  assert.deepEqual(KB.ara.liste(db, 'sa'), s);
});

test('sb listesi: 61C01 var, 40020 yok', () => {
  const s = KB.ara.liste(db, 'sb');
  assert.ok(kodlar(s).includes('61C01'));
  assert.ok(kodlar(s).includes('61A01'));
  assert.ok(!kodlar(s).includes('61G01'));
  assert.deepEqual(anahtarlar(s).sort(), ['4002', '8001']);
});

// ---- limit ------------------------------------------------------------------------------------------------
test('limit grup başınadır; varsayılan 40; gerçek sayı sayilar içinde, kesildi bayrağı', () => {
  const cihazlar = [cz('60B01', 'sensor', 'Test', ['1'])];
  const kablolar = [];
  for (let i = 0; i < 45; i++) {
    const ii = String(i + 1).padStart(2, '0');
    cihazlar.push(cz('55A' + ii, 'sensor', 'Test', ['1']));
    kablolar.push(K('p' + i, String(5000 + i), [C('55A' + ii, '1', '1'), C('60B01', '3', String(i + 1))], [1, '10', 'A']));
  }
  const d2 = yukle([sema('lim', { cihazlar, kablolar })]);
  // kablo: 45 var; ilk 40 doğal sırada
  let s = KB.ara.ara(d2, '50');
  assert.equal(s.kablo.length, 40);
  assert.equal(s.sayilar.kablo, 45);
  assert.equal(s.kesildi, true);
  assert.deepEqual(s.kablo.map((k) => k.anahtar), Array.from({ length: 40 }, (_, i) => String(5000 + i)));
  // cihaz: 45 var
  s = KB.ara.ara(d2, '55A');
  assert.equal(s.cihaz.length, 40);
  assert.equal(s.sayilar.cihaz, 45);
  assert.equal(s.kesildi, true);
  assert.equal(s.cihaz[0].kod, '55A01');
  assert.equal(s.cihaz[39].kod, '55A40');
  // açık limit
  s = KB.ara.ara(d2, '50', { limit: 5 });
  assert.equal(s.kablo.length, 5);
  assert.equal(s.sayilar.kablo, 45);
  assert.equal(s.kesildi, true);
  s = KB.ara.ara(d2, '50', { limit: 100 });
  assert.equal(s.kablo.length, 45);
  assert.equal(s.kesildi, false);
  // tam 45'i veren sorgu: kesilmemiş
  s = KB.ara.ara(d2, '5044');
  assert.equal(s.kesildi, false);
  assert.equal(s.toplam, 1);
});

// ---- bayraklar ----------------------------------------------------------------------------------------------
test('dogrulandi yalnız bütün şemaları doğrulanmışsa true; supheli durum:suphe kablolarda', () => {
  assert.equal(KB.ara.ara(db, '8001').kablo[0].dogrulandi, true, 's2 doğrulanmış');
  assert.equal(KB.ara.ara(db, '4100').kablo[0].dogrulandi, false, 's1 doğrulanmamış');
  assert.equal(KB.ara.ara(db, '4002').kablo.find((k) => k.anahtar === '4002').dogrulandi, false, 'iki şemadan biri doğrulanmamış');
  assert.equal(KB.ara.ara(db, '9800').kablo[0].supheli, true);
  assert.equal(KB.ara.ara(db, '4100').kablo[0].supheli, false);
});

test('kablo öğesinde uçlardaki cihazlar listelenir (tekil)', () => {
  const k = KB.ara.ara(db, '4002').kablo.find((x) => x.anahtar === '4002');
  assert.deepEqual(k.cihazlar.map((c) => c.kod).sort(), ['61A01', '61A02', '61C01']);
  assert.equal(k.cihazlar.find((c) => c.kod === '61A02').kisaAd, 'FPS 2');
});

// ---- dayanıklılık -------------------------------------------------------------------------------------------------
test('özel karakterli sorgular hata vermez (düzenli ifade enjeksiyonu yok)', () => {
  for (const q of ['(', ')', '[', ']', '.*', '\\', '+', '?', '*', '^$', '(?:', '\\d+', '{', '|', 'a|b', '%', "'", '"', '<script>', '\u0000']) {
    assert.doesNotThrow(() => KB.ara.ara(db, q), JSON.stringify(q));
  }
  assert.equal(KB.ara.ara(db, '.*').toplam, 0, '".*" bir kalıp değil, düz metin');
  assert.equal(KB.ara.ara(db, '4.02').toplam, 0, 'nokta "herhangi bir karakter" olarak yorumlanmamalı');
});

test('çok uzun sorgu hızlı biter ve hata vermez', () => {
  const t0 = Date.now();
  const s = KB.ara.ara(db, '4'.repeat(5000));
  assert.equal(s.toplam, 0);
  assert.ok(Date.now() - t0 < 2000);
});
