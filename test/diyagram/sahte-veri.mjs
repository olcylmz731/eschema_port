// Sahte (uydurma) veri üreticisi: çizim motorunu zorlayan durumlar; gerçek veri sanılmamalı.
// 41 pinli beyin, 12 ara soketli uzun zincir, derin dallanma, ŞÜPHELİ / ÇELİŞKİLİ / varyant / '?' / bilinmeyen renk,
// geçiş bileşenleri (sigorta, diyot, direnç, şalter), cihaz içi köprü, kendine dönen parça, çok uzun adlar, adresi eksik uç,
// 155 soketlik zincir (izleme sınırı → "kesik"). Kullanım: sahteVeriYaz(klasor) → klasor/semalar.json + klasor/sahte.json
import fs from 'node:fs';
import path from 'node:path';

export function sahteVeri() {
  let n = 0;
  const cihazlar = {};
  const kablolar = [];
  const yol = () => String(1 + (n % 70));
  const dev = (kod, tur, ad, kisa) => { cihazlar[kod] = { kod, yol: [String(1 + Object.keys(cihazlar).length % 70)], adDe: 'Sahte ' + kod, adTr: ad || null, kisaAd: kisa || null, tur }; return kod; };
  const cz = (cihaz, soket, pin, pinAdi) => ({ tur: 'cihaz', cihaz, soket: soket == null ? null : soket, pin: pin == null ? null : pin, pinAdi: pinAdi == null ? null : pinAdi, ham: [pinAdi, soket != null ? soket + '/' + pin : pin].filter(Boolean).join(' ') });
  const sk = (soket, pin) => ({ tur: 'soket', soket, pin, ham: soket + '/' + pin });
  const dg = (kod) => ({ tur: 'dugum', kod, ham: kod });
  const dv = (cihaz, hedef) => ({ tur: 'devam', cihaz: cihaz || null, hedef: hedef || null, ham: cihaz || hedef });
  // etiket: '#9101' · '2,5-4135' · '70sw' · '1sw/rt' · '9102'
  const kab = (etiket, a, b, ek) => {
    const e = ek || {};
    let no = null, isaret = null, kesit = null, renk = null;
    if (etiket) {
      let m = etiket.match(/^(#)?(\d+)$/);
      if (m) { isaret = m[1] || null; no = m[2]; }
      else if ((m = etiket.match(/^(#)?(\d+(?:,\d+)?)-([a-z/]*)(\d+)$/))) { isaret = m[1] || null; kesit = m[2].replace(',', '.'); renk = m[3] || null; no = m[4]; }
      else if ((m = etiket.match(/^(\d+(?:,\d+)?)([a-z/]+)$/))) { kesit = m[1].replace(',', '.'); renk = m[2]; }
    }
    kablolar.push(Object.assign({
      id: 'k' + String(++n).padStart(3, '0'), etiket: etiket || null, no, isaret, kesit, renk, varyant: false,
      uclar: [a, b], izgara: { sayfa: 1, yol: yol(), satir: 'A' }, durum: 'eslesti', not: null, suphe: null
    }, e.renk !== undefined ? { renk: e.renk } : {}, e.rest || {}));
  };

  // ---- cihazlar -------------------------------------------------------------------------------------------------------
  dev('99A01', 'beyin', 'Sahte 41 pinli beyin modülü', 'Sahte Beyin 1');
  dev('99A02', 'beyin', 'Sahte ikinci beyin', 'Sahte FPS 2');
  ['B', 'E', 'M', 'Y', 'H', 'K'].forEach((h, i) => {
    const tur = { B: 'sensor', E: 'lamba', M: 'motor', Y: 'valf', H: 'ikaz', K: 'role' }[h];
    for (let k = 1; k <= 8; k++) dev('99' + h + String(k).padStart(2, '0'), tur, 'Sahte ' + tur + ' ' + k);
  });
  dev('99G10', 'guc', 'Sahte akü'); dev('99G20', 'guc', 'Sahte alternatör');
  dev('99F01', 'sigorta', 'Sahte ana sigorta'); dev('99V01', 'diyot', 'Sahte ayırma diyotu'); dev('99R01', 'direnc', 'Sahte direnç');
  dev('99S01', 'salter', 'Sahte şalter'); dev('99S02', 'salter', 'Sahte ikinci şalter');
  dev('99W01', 'toprak', 'Toprak noktası');
  dev('99X77', 'besleme', 'Sahte besleme dağıtıcısı');
  dev('99B20', 'sensor', 'Adresi şemada yazmayan sensör');
  dev('99M90', 'motor', 'Bu cihazın adı bilerek çok çok uzun yazılmıştır: konsol altı sol arka kapı tahrik motoru sürücü kartı yedek bağlantı modülü sağ üst');
  dev('X99.88-99', 'soket', 'Uzun kodlu soket cihazı');

  // ---- A. 41 pinli beyin --------------------------------------------------------------------------------------------
  const hedefTur = ['B', 'E', 'M', 'Y', 'H', 'K'];
  let aygit = 0;
  const hedef = () => { const h = hedefTur[aygit % 6], k = 1 + Math.floor(aygit / 6) % 8; aygit++; return '99' + h + String(k).padStart(2, '0'); };
  for (let p = 1; p <= 24; p++) {
    const ad = ['HS' + p, 'EIN' + p, 'UREF', 'NHB', 'AUTO', 'CANHF'][p % 6] + (p % 6 === 2 ? '' : '');
    const a = cz('99A01', 'IV-24', String(p), p % 5 === 0 ? null : ad);
    const hd = hedef();
    if (p <= 10) kab('81' + String(p).padStart(2, '0'), a, cz(hd, null, String(1 + p % 3)));
    else if (p <= 16) { kab('82' + p, a, sk('X99.' + p, '1')); kab('82' + p, sk('X99.' + p, '1'), cz(hd, null, '1')); }
    else if (p <= 20) {
      kab('82' + p, a, sk('X98.' + p, '1')); kab('82' + p, sk('X98.' + p, '1'), sk('X97.' + p, '4'));
      kab('2,5-82' + p, sk('X97.' + p, '4'), cz(hd, 'A-6', String(p), 'K' + p));
    } else { kab('82' + p, a, dg('99Z' + p)); kab('82' + p, dg('99Z' + p), cz(hd, null, '1')); kab('82' + p, dg('99Z' + p), cz(hedef(), null, '2')); if (p === 24) kab('82' + p, dg('99Z' + p), cz(hedef(), null, '1')); }
  }
  for (let p = 1; p <= 15; p++) kab('83' + String(p).padStart(2, '0'), cz('99A01', '15', String(p), ['NHB', 'EIN2', 'HS8', 'AUTO', 'UREF'][p % 5]), cz(hedef(), null, String(1 + p % 2)));
  kab('8450', cz('99A01', null, 'B+'), cz('99G10', null, 'B+'), { renk: 'rt', rest: { kesit: '2.5' } });
  kab('8451', cz('99A01', null, '31'), cz('99W01', null, '1'), { renk: 'br', rest: { kesit: '2.5' } });

  // ---- B. uzun zincir: 12 ara soket ---------------------------------------------------------------------------------
  kab('9300', cz('99B03', null, '1'), sk('X99.201', '1'));
  for (let i = 1; i < 12; i++) kab(i === 7 ? '#9301' : '9300', sk('X99.' + (200 + i), '1'), sk('X99.' + (200 + i + 1), '1'));
  kab('9300', sk('X99.212', '1'), cz('99A02', 'IV-18', '9', 'HS9'));

  // ---- C. derin dallanma ------------------------------------------------------------------------------------------
  kab('9400', cz('99K01', null, '30'), dg('99Z05'));
  kab('9400', dg('99Z05'), cz('99E01', null, '1'));
  kab('9400', dg('99Z05'), sk('X99.20', '3')); kab('9400', sk('X99.20', '3'), cz('99E02', null, '1'));
  kab('9400', dg('99Z05'), dg('99Z06'));
  kab('9400', dg('99Z06'), cz('99M01', null, 'A'));
  kab('9402', dg('99Z06'), sk('X99.21', '1')); kab('9402', sk('X99.21', '1'), dg('99Z07'));
  kab('9402', dg('99Z07'), cz('99Y01', null, '1')); kab('9402', dg('99Z07'), cz('99Y02', null, '1')); kab('9402', dg('99Z07'), cz('99H01', null, '1'));
  kab('9400', dg('99Z05'), dv('99Q01', null));
  kab('9400', dg('99Z05'), dv(null, '2/27'));
  kab('9400', dg('99Z05'), sk('X99.30', '5'));

  // ---- D. şüpheli / çelişkili -------------------------------------------------------------------------------------
  kab('9500', cz('99B01', null, '1'), sk('X99.4?', '3'), { rest: { durum: 'suphe', suphe: { soru: 'Soket adı net okunamadı: X99.41 mi X99.47 mi?', A: 'X99.41', B: 'X99.47', kirpinti: 'yok' } } });
  kab('9500', sk('X99.4?', '3'), cz('99A02', 'IV-18', '1?', 'H?3'));
  kab('95?1', cz('99B02', null, '1'), cz('99A02', 'IV-18', '2', 'HS2'));
  kab('9510', cz('99B04', null, '1'), cz('99A02', 'IV-18', '10', 'HS10'));
  kab('9511', cz('99B05', null, '1'), cz('99A02', 'IV-18', '10', 'HS10'));

  // ---- E. renk / varyant / not --------------------------------------------------------------------------------------
  kab('1sw/rt', cz('99E03', null, '1'), cz('99G10', null, 'D+'));
  kab('2,5-br9600', cz('99E04', null, '1'), cz('99W01', null, '2'));
  kab('9601', cz('99E05', null, '1'), cz('99W01', null, '3'), { renk: 'vi' });
  kab('9602', cz('99E06', null, '1'), cz('99W01', null, '4'), { renk: 'ws/ge' });
  kab('9603', cz('99E07', null, '1'), cz('99A02', 'IV-18', '3', 'EIN3'), { rest: { varyant: true } });
  kab('9604', cz('99E08', null, '1'), cz('99A02', 'IV-18', '4', 'EIN4'), { rest: { not: 'Bu kablo yalnız klima donanımlı araçlarda vardır; yalnız kışlık pakette değil, aynı zamanda yan kapı sensörü takılı araçlarda da bulunur ve renk şemada farklı yazılabilir.' } });
  kab('1,5-gn9605', cz('99H02', null, '1'), cz('99A02', 'IV-18', '5', 'HS5'), { rest: { varyant: true } });
  kab('1,5-sw/gn9606', cz('99H03', null, '1'), cz('99A02', 'IV-18', '6', 'HS6'));
  kab('70sw', cz('99G10', null, 'B+'), cz('99G20', null, 'B+'), { renk: 'sw' });

  // ---- F. geçiş bileşenleri -----------------------------------------------------------------------------------------
  kab('9700', cz('99G10', null, '30'), cz('99F01', null, '1'));
  kab('9701', cz('99F01', null, '2'), sk('X99.40', '1'));
  kab('9701', sk('X99.40', '1'), cz('99A02', 'IV-18', '30', 'KL.30'));
  kab('9710', cz('99G20', null, 'D+'), cz('99V01', null, 'A'));
  kab('9711', cz('99V01', null, 'K'), cz('99B06', null, '1'));
  kab('9720', cz('99K02', null, '86'), cz('99R01', null, null));
  kab('9721', cz('99R01', null, null), cz('99E01', null, '2'));
  kab('9730', cz('99K03', null, '30'), cz('99S01', null, '1'));
  kab('9731', cz('99S01', null, '1'), cz('99E02', null, '2'));
  kab('9732', cz('99S01', null, '2'), cz('99E03', null, '2'));
  kab('9733', cz('99S01', null, '2'), cz('99E04', null, '2'));

  // ---- G. cihaz içi köprü, kendine dönen ----------------------------------------------------------------------------
  kab(null, cz('99G20', null, 'D+'), cz('99G20', null, 'DF'), { rest: { ic: true, durum: 'eslesti' } });
  kab('9740', cz('99G20', null, 'DF'), sk('X99.50', '1'));
  kab('9741', sk('X99.50', '1'), sk('X99.50', '1'), { rest: { varyant: true } });

  // ---- H. uzun ad, adresi eksik, bilinmeyen cihaz -------------------------------------------------------------------
  kab('9800', cz('99M90', 'IV-18', '14', 'CANHF'), sk('X99.88', '7'));
  kab('9800', sk('X99.88', '7'), cz('X99.88-99', null, '1'));
  kab('9801', cz('99B20', null, null), cz('99A02', 'IV-18', '14', 'HS14'));
  kab('9802', cz('ZZ123', null, '5'), cz('99A02', 'IV-18', '15', 'HS15'));
  kab('2,5-rt9803', cz('99G10', null, '15'), cz('99X77', null, 'B+'));

  // ---- I. 155 soketlik zincir (maksKenar = 150) ------------------------------------------------------------------
  kab('9900', cz('99B07', null, '1'), sk('X90.1', '1'));
  for (let i = 1; i < 155; i++) kab('9900', sk('X90.' + i, '1'), sk('X90.' + (i + 1), '1'));
  kab('9900', sk('X90.155', '1'), cz('99A02', 'IV-18', '18', 'HS18'));

  return {
    sema: 'sahte',
    kaynak: { pdf: 'Sahte.pdf', sayfalar: [1] },
    kunye: { baslik: 'Sahte devre şeması (test)', parcaNo: 'A 000 000 00 00', format: 'A2', tarih: '2000-01-01' },
    varsayilan: { renk: 'ws', kesit: '0.75', ham: 'sahte not' },
    dogrulandi: false,
    cihazlar: Object.values(cihazlar),
    kablolar,
    celiskiler: []
  };
}

/** klasor/semalar.json + klasor/sahte.json yazar. */
export function sahteVeriYaz(klasor) {
  fs.mkdirSync(klasor, { recursive: true });
  fs.writeFileSync(path.join(klasor, 'semalar.json'), JSON.stringify({
    sekmeler: [{ id: 'sahte', ad: 'Sahte', semalar: ['sahte'] }],
    semalar: { sahte: { ad: 'Sahte', pdf: 'Sahte.pdf', sayfalar: [1], kapak: [], dilim: 1 } }
  }, null, 1));
  fs.writeFileSync(path.join(klasor, 'sahte.json'), JSON.stringify(sahteVeri(), null, 1));
  return klasor;
}
