// KB.normalize: anahtar biçimi (API.md §2, VERI-MODELI §4)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { KB, CEKIRDEK } from './yardimci.mjs';

const N = KB.normalize;

test('büyük/küçük harf: 61a01 = 61A01', () => {
  assert.equal(N.norm('61a01'), '61A01');
  assert.equal(N.norm('61A01'), '61A01');
  assert.equal(N.norm('61a01'), N.norm('61A01'));
  assert.equal(N.norm('x08.11'), 'X08.11');
  assert.equal(N.norm('hs10'), 'HS10');
});

test('boşluk: "X08. 11" = "X08.11"', () => {
  assert.equal(N.norm('X08. 11'), 'X08.11');
  assert.equal(N.norm('X08.11'), 'X08.11');
  assert.equal(N.norm('  X08 . 11  '), 'X08.11');
  assert.equal(N.norm('x08.\t11'), 'X08.11');
  assert.equal(N.norm('4 0 0 2'), '4002');
  // kırılmaz boşluk ve dar boşluk (PDF metninden gelebilir)
  assert.equal(N.norm('X08. 11'), 'X08.11');
  assert.equal(N.norm('X08. 11'), 'X08.11');
});

test('tire: IV-18 = IV18 = iv 18 (tire türleri dahil)', () => {
  assert.equal(N.norm('IV-18'), 'IV18');
  assert.equal(N.norm('iv-18'), 'IV18');
  assert.equal(N.norm('iv 18'), 'IV18');
  assert.equal(N.norm('IV - 18'), 'IV18');
  assert.equal(N.norm('IV–18'), 'IV18'); // en dash
  assert.equal(N.norm('IV—18'), 'IV18'); // em dash
  assert.equal(N.norm('IV−18'), 'IV18'); // eksi işareti
  assert.equal(N.norm('IV‐18'), 'IV18'); // yazım tiresi
});

test('Türkçe ı/İ: yerel ayara bağlı olmayan büyük harf', () => {
  assert.equal(N.norm('İV-18'), 'IV18'); // büyük noktalı İ
  assert.equal(N.norm('ıv-18'), 'IV18'); // küçük noktasız ı
  assert.equal(N.norm('iv-18'), 'IV18'); // sıradan i
  assert.equal(N.norm('IV-18'), 'IV18');
  assert.equal(N.norm('i'), 'I'); // toLocaleUpperCase('tr') olsaydı İ olurdu
  assert.equal(N.norm('ı'), 'I');
  assert.equal(N.norm('İ'), 'I');
  assert.equal(N.norm('Kapı 1 beyni'), 'KAPI1BEYNI');
  assert.equal(N.norm('KAPI 1'), N.norm('Kapı 1'));
  assert.equal(N.norm('KAPİ 1'), N.norm('kapı 1'));
});

test('Türkçe ı/İ: sistem yerel ayarı tr_TR olsa da sonuç aynı', (t) => {
  const betik =
    "const N=require(process.argv[1]);" +
    "console.log(JSON.stringify({a:N.norm('iv-18'),b:N.norm('ıv-18'),c:N.norm('İV-18'),d:N.norm('kapı 1'),e:'i'.toLocaleUpperCase()}))";
  const env = { ...process.env, LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8', LANGUAGE: 'tr' };
  const cikti = JSON.parse(execFileSync(process.execPath, ['-e', betik, path.join(CEKIRDEK, 'normalize.js')], { env, encoding: 'utf8' }));
  assert.equal(cikti.a, 'IV18');
  assert.equal(cikti.b, 'IV18');
  assert.equal(cikti.c, 'IV18');
  assert.equal(cikti.d, 'KAPI1');
  // Ortam gerçekten Türkçe davranıyorsa (i → İ) sınama anlamlıdır; değilse bunu bildir.
  t.diagnostic(cikti.e === 'İ' ? 'ortam tr_TR gibi davrandı (sınama anlamlı)' : 'ortam tr_TR davranışı vermedi (sınama zayıf)');
});

test('aksanlar atılır: ş→S ğ→G ö→O ü→U ç→C', () => {
  assert.equal(N.norm('Şalter'), 'SALTER');
  assert.equal(N.norm('ğöüç'), 'GOUC');
  assert.equal(N.norm('ÇĞÖŞÜ'), 'CGOSU');
});

test("virgül ondalık noktaya çevrilir: '2,5' = '2.5'", () => {
  assert.equal(N.norm('2,5'), '2.5');
  assert.equal(N.norm('2,5-4135'), N.norm('2.5-4135'));
});

test('boş girdi: null/undefined/boş metin → ""', () => {
  assert.equal(N.norm(null), '');
  assert.equal(N.norm(undefined), '');
  assert.equal(N.norm(''), '');
  assert.equal(N.norm('   '), '');
  assert.equal(N.kabloAnahtari(null), '');
  assert.equal(N.kabloAnahtari(undefined), '');
});

test('sayı girdisi de metne çevrilir', () => {
  assert.equal(N.norm(4002), '4002');
  assert.equal(N.kabloAnahtari(4002), '4002');
});

test('kabloAnahtari: baştaki # atılır', () => {
  assert.equal(N.kabloAnahtari('#4002'), '4002');
  assert.equal(N.kabloAnahtari(' # 4002'), '4002');
  assert.equal(N.kabloAnahtari('4002'), '4002');
  assert.equal(N.kabloAnahtari('#4002'), N.kabloAnahtari('4002'));
  assert.equal(N.kabloAnahtari('#BR'), N.kabloAnahtari('br'));
});

test('kabloAnahtari: numarasız etiketler (70sw, 1sw/rt) kendi biçimini korur', () => {
  assert.equal(N.kabloAnahtari('70SW'), N.kabloAnahtari('70sw'));
  assert.equal(N.kabloAnahtari('1sw/rt'), N.kabloAnahtari('1SW/RT'));
  // eğik çizgi korunur: iki renkli etiket, iki ayrı renkli etiketle karışmaz
  assert.notEqual(N.kabloAnahtari('1sw/rt'), N.kabloAnahtari('1swrt'));
  assert.notEqual(N.kabloAnahtari('1sw/rt'), N.kabloAnahtari('1ws/li'));
});

test('kabloAnahtari: farklı numaralar farklı kalır', () => {
  assert.notEqual(N.kabloAnahtari('4002'), N.kabloAnahtari('4020'));
  assert.notEqual(N.kabloAnahtari('4002'), N.kabloAnahtari('40020'));
});

test('B+ / B- / D+ / D-: işaretli pin adları birbirine karışmamalı', () => {
  // Alternatörde gerçek pin adları: B+ (akü artı), B- (eksi), D+, DF.
  assert.notEqual(N.norm('B+'), N.norm('B-'), 'B+ ile B- aynı anahtara düştü');
  assert.notEqual(N.norm('B+'), N.norm('B'), 'B+ ile B aynı anahtara düştü');
  assert.notEqual(N.norm('D+'), N.norm('D-'), 'D+ ile D- aynı anahtara düştü');
  assert.notEqual(N.norm('D+'), N.norm('D'), 'D+ ile D aynı anahtara düştü');
});

test('B- ile B karışmamalı (norm düzeyi)', () => {
  // Tire "ayraç" olarak atılıyor (IV-18 → IV18); ama bir pin adının SONUNDAKİ "-" ad'ın parçasıdır (B-, D-).
  assert.notEqual(N.norm('B-'), N.norm('B'), `norm('B-') = ${JSON.stringify(N.norm('B-'))}, norm('B') = ${JSON.stringify(N.norm('B'))}: tire atılınca B- ile B aynı anahtar oldu`);
  assert.notEqual(N.norm('D-'), N.norm('D'), `norm('D-') = ${JSON.stringify(N.norm('D-'))}, norm('D') = ${JSON.stringify(N.norm('D'))}`);
});

test('IV-18 gibi tireli soket adı hâlâ tireyi atar (B- ayrımı bunu bozmamalı)', () => {
  assert.equal(N.norm('IV-18'), 'IV18');
  assert.equal(N.norm('X-08'), 'X08');
  assert.equal(N.norm('4-002'), '4002');
});

test('belirsiz: ? içeren değer', () => {
  assert.equal(N.belirsiz('1?'), true);
  assert.equal(N.belirsiz('?'), true);
  assert.equal(N.belirsiz('X0?.11'), true);
  assert.equal(N.belirsiz('11'), false);
  assert.equal(N.belirsiz(''), false);
  assert.equal(N.belirsiz(null), false);
  assert.equal(N.belirsiz(undefined), false);
});

test('dogal: doğal sıralama (2 < 10)', () => {
  assert.equal(N.dogal('2', '10'), -1);
  assert.equal(N.dogal('10', '2'), 1);
  assert.equal(N.dogal('7', '7'), 0);
  assert.equal(N.dogal('B2', 'B10'), -1);
  assert.equal(N.dogal('X08.2', 'X08.10'), -1);
  assert.deepEqual(['10', '9', '2', '1', '100', '11'].sort(N.dogal), ['1', '2', '9', '10', '11', '100']);
  assert.deepEqual(['IV-18', 'IV-2', 'IV-10'].sort(N.dogal), ['IV-2', 'IV-10', 'IV-18']);
});

test('dogal: tutarlı karşılaştırıcı (simetri, girdi sırasından bağımsız sonuç, harfli/harfsiz karışık)', () => {
  const ornek = ['10', '2', 'A1', 'B', 'B+', 'B-', 'D+', 'DF', '1A', '04A03', '4A3', 'X08.11', 'X08.2', 'IV-18', '15', '9', '1?'];
  for (const a of ornek) {
    assert.equal(N.dogal(a, a), 0, `dogal(${a},${a}) 0 değil`);
    for (const b of ornek) {
      assert.equal(Math.sign(N.dogal(a, b)) + Math.sign(N.dogal(b, a)), 0, `simetri bozuk: ${a} / ${b}`);
    }
  }
  const ileri = ornek.slice().sort(N.dogal);
  const geri = ornek.slice().reverse().sort(N.dogal);
  assert.deepEqual(ileri, geri, 'sonuç girdi sırasına bağlı');
  // sıralı dizide hiçbir komşu çifti ters değil
  for (let i = 1; i < ileri.length; i++) assert.ok(N.dogal(ileri[i - 1], ileri[i]) <= 0);
});
