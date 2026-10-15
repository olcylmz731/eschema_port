// Birim testleri için ortak yardımcılar: çekirdeği yükler, küçük SENTETİK şema kurar.
// Burada hiçbir gerçek veri yok: kodlar (99A01 ...) ve numaralar (9999 ...) uydurmadır.
// Beklenen değerler test dosyalarında, burada kurulan verinin tanımından elle yazılır;
// uygulama çıktısından türetilmez.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Çekirdek klasörü. KB_CEKIRDEK ortam değişkeni, testlerin başka bir (ör. bilerek bozulmuş) çekirdek kopyasına karşı
// koşturulmasını sağlar (mutasyon denemesi: .gecici/test/mutasyon.mjs). Varsayılan: src/cekirdek.
export const CEKIRDEK = process.env.KB_CEKIRDEK ? path.resolve(process.env.KB_CEKIRDEK) : path.join(KOK, 'src', 'cekirdek');
export const KB = require(path.join(CEKIRDEK, 'index.js'));

// ---- uç kurucuları -------------------------------------------------------------
const hamUc = (soket, pin, pinAdi) => [pinAdi, soket ? `${soket}/${pin}` : pin].filter((x) => x != null).join(' ');
/** cihaz ucu: C('99A01', '15', '5', 'NHB')  ·  soketsiz: C('99G01', null, 'B+') */
export const C = (cihaz, soket, pin, pinAdi = null) => ({ tur: 'cihaz', cihaz, soket, pin, pinAdi, ham: hamUc(soket, pin, pinAdi) });
/** ara soket ucu */
export const S = (soket, pin) => ({ tur: 'soket', soket, pin, ham: `${soket}/${pin}` });
/** ek noktası (kod '~d1' gibi yerel ad olabilir) */
export const D = (kod) => ({ tur: 'dugum', kod, ham: String(kod).startsWith('~') ? '' : kod });
/** devam oku: V({ cihaz:'99Q99' }) ya da V({ hedef:'2/27' }) / V({ hedef:'74' }) */
export const V = (o) => ({ tur: 'devam', cihaz: o.cihaz == null ? null : o.cihaz, hedef: o.hedef == null ? null : o.hedef, ham: o.cihaz != null ? o.cihaz : o.hedef });

/**
 * Kablo parçası. Etiketten (VERI-MODELI §2) no/isaret/kesit ayıklanır:
 *   '9999' · '#9999' · '2,5-9999'  →  numaralı;  '70sw' · '1sw/rt' · null  →  numarasız (o.no verilmedikçe).
 * izgara = [sayfa, yol, satir]
 */
export function K(id, etiket, uclar, izgara, o = {}) {
  izgara = izgara || [1, '10', 'A'];
  const m = etiket == null ? null : /^(#)?(?:(\d+(?:,\d+)?)-)?(\d+)$/.exec(etiket);
  return {
    id,
    etiket,
    no: o.no !== undefined ? o.no : m ? m[3] : null,
    isaret: o.isaret !== undefined ? o.isaret : m && m[1] ? '#' : null,
    kesit: o.kesit !== undefined ? o.kesit : m && m[2] ? m[2].replace(',', '.') : null,
    renk: o.renk == null ? null : o.renk,
    varyant: !!o.varyant,
    ...(o.ic ? { ic: true } : {}),
    uclar,
    izgara: { sayfa: izgara[0], yol: izgara[1], satir: izgara[2] },
    durum: o.durum || 'eslesti',
    not: o.not == null ? null : o.not,
    suphe: o.suphe == null ? null : o.suphe,
  };
}

/** bileşen listesi kaydı */
export const cz = (kod, tur, adDe, yol, kisaAd, adTr) => ({
  kod,
  yol: yol || ['1'],
  adDe: adDe || null,
  adTr: adTr || null,
  kisaAd: kisaAd || null,
  tur,
});

/** Tam bir şema dosyası nesnesi (veri/<sema>.json biçiminde). */
export function sema(id, { cihazlar = [], kablolar = [], dogrulandi = false, varsayilan, celiskiler = [] } = {}) {
  return {
    sema: id,
    kaynak: { pdf: `${id} stromlaufplan.pdf`, sayfalar: [1] },
    kunye: { baslik: `TEST ${id}`, parcaNo: 'A 000 000 00 00', format: 'A2', tarih: '2000-01-01' },
    varsayilan: varsayilan === undefined ? { renk: 'ws', kesit: '0.75', ham: 'TEST NOTU' } : varsayilan,
    dogrulandi,
    cihazlar,
    kablolar,
    celiskiler,
  };
}

/**
 * Bellekte veri paketi kurar ve KB.veri.yukle ile db döndürür (diske yazmadan).
 *   yukle([sema('t1', {...}), sema('t2', {...})])                       → tek sekme "t" (hepsi)
 *   yukle([...], { sekmeler: [{ id:'a', ad:'A', semalar:['t1'] }, ...] })
 */
export function yukle(semaDosyalari, { sekmeler } = {}) {
  const ids = semaDosyalari.map((s) => s.sema);
  const paket = {
    surum: 1,
    imza: 'test0001',
    sekmeler: sekmeler || [{ id: 't', ad: 'Test', semalar: ids }],
    semalar: {},
    veri: {},
  };
  semaDosyalari.forEach((s, i) => {
    paket.semalar[s.sema] = { ad: `Test ${s.sema}`, pdf: s.kaynak.pdf, sayfalar: s.kaynak.sayfalar, kapak: [], dilim: i + 1 };
    paket.veri[s.sema] = s;
  });
  return KB.veri.yukle(paket);
}

/** Tek şemalık kısayol. */
export function tek(cihazlar, kablolar, secenek = {}) {
  return yukle([sema('t1', { cihazlar, kablolar, ...secenek })]);
}

// ---- iz okuma yardımcıları (testlerde ortak) ---------------------------------------
/** düğüm kimliğinden düğüm */
export const dugumBul = (iz, id) => iz.dugumler.find((d) => d.id === id);
export const kenarBul = (iz, id) => iz.kenarlar.find((e) => e.id === id);

/** Düğümün kısa, yapı kodu: cihaz → "99A01 15/5", soket → "X99.1/4", dugum → kod, devam → "devam:hedef" */
export function kod(d) {
  if (d.tur === 'cihaz') return `${d.cihaz} ${d.soket == null ? '-' : d.soket}/${d.pin == null ? '-' : d.pin}`;
  if (d.tur === 'soket') return `${d.soket}/${d.pin}`;
  if (d.tur === 'dugum') return d.kod;
  return `devam:${d.hedefCihaz != null ? d.hedefCihaz : d.hedef}`;
}

/** Bileşenin zincirini (varsa) kodlara çevirir. Zincir yoksa null. */
export function zincirKodlari(iz, b = 0) {
  const bil = iz.bilesenler[b];
  if (!bil.zincir) return null;
  return bil.zincir.map((id) => kod(dugumBul(iz, id)));
}

/** Zincirin iki yönden biri olarak eşleşmesini sınamak için: [a,b,c] ya da [c,b,a] */
export function ikiYon(dizi) {
  return [dizi.slice(), dizi.slice().reverse()];
}

/** İzdeki bütün düğümlerin kod kümesi (sıralı). */
export function dugumKodlari(iz) {
  return iz.dugumler.map(kod).sort();
}

/** Gerçek kablo kenarları (sanal ve cihaz içi hariç) etiketleri, sıralı */
export function kenarEtiketleri(iz) {
  return iz.kenarlar.filter((e) => !e.sanal && !e.ic).map((e) => e.etiket).sort();
}

// ---- gerçek veri ---------------------------------------------------------------------
export function jsonOku(yol) {
  return JSON.parse(fs.readFileSync(path.join(KOK, yol), 'utf8'));
}

/** Basit, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
export function tohum(t) {
  let a = t >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
