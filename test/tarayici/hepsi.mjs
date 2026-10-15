#!/usr/bin/env node
// Bütün tarayıcı testlerini tek komutla koşturur (başsız Brave, CDP). Her test dosyası AYRI süreçte, kendi zaman aşımıyla çalışır;
// süreç grubu öldürülür ve bu koşuya ait artık Brave süreçleri taranıp kapatılır (başka ajanların tarayıcılarına dokunulmaz).
//
//   node test/tarayici/hepsi.mjs                 # hepsi
//   node test/tarayici/hepsi.mjs --derle         # önce `python3 build.py` ve `python3 build.py --notlar` (dist/ güncellenir)
//   node test/tarayici/hepsi.mjs --dosya sizinti # yalnız bu dosya(lar)  (virgülle birden çok: sizinti,sekmeler)
//   node test/tarayici/hepsi.mjs --sure 300      # dosya başına zaman aşımı (sn, varsayılan 240)
//
// Çıkış kodu 0: hepsi geçti. 1: başarısız sınama / çöken ya da zaman aşımına uğrayan dosya / artık tarayıcı süreci.
// Sınanan dosyalar: dist/kablo-bulucu.html (dağıtım) ve dist/kablo-bulucu-dogrulama.html (doğrulama). Başka dosya için
// KB_DAGITIM=/yol/x.html KB_DOGRULAMA=/yol/y.html ortam değişkenleri.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(BURASI, '..', '..');
const arg = process.argv.slice(2);
const deger = (ad, v) => { const i = arg.indexOf('--' + ad); return i >= 0 ? arg[i + 1] : v; };
const SURE = (+deger('sure', 240)) * 1000;
const DERLE = arg.includes('--derle');
const TUM = ['acilis', 'kablo-arama', 'cevrimdisi', 'tasma360', 'localstorage', 'sekmeler', 'dogrulanmadi', 'sizinti'];
const SECILEN = deger('dosya', '') ? deger('dosya', '').split(',').map((x) => x.replace(/\.mjs$/, '')) : TUM;
for (const d of SECILEN) if (!TUM.includes(d)) { console.error(`bilinmeyen test dosyası: ${d} (olanlar: ${TUM.join(', ')})`); process.exit(2); }

const sn = (ms) => (ms / 1000).toFixed(1) + ' sn';
const t0 = Date.now();

// ---- dist hazırlığı --------------------------------------------------------------------------------------------
const DIST = [path.join(KOK, 'dist', 'kablo-bulucu.html'), path.join(KOK, 'dist', 'kablo-bulucu-dogrulama.html')];
if (DERLE) {
  for (const a of [[], ['--notlar']]) {
    const r = spawnSync('python3', ['build.py', ...a], { cwd: KOK, encoding: 'utf8' });
    console.log(`python3 build.py ${a.join(' ')} → çıkış ${r.status}`);
    if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(2); }
  }
}
for (const d of DIST) if (!process.env.KB_DAGITIM && !process.env.KB_DOGRULAMA && !fs.existsSync(d)) { console.error(`${d} yok: önce \`python3 build.py\` ve \`python3 build.py --notlar\` (ya da --derle)`); process.exit(2); }
function enSonDegisen(klasor, uzanti) {
  let en = 0;
  const gez = (k) => { for (const e of fs.readdirSync(k, { withFileTypes: true })) { const y = path.join(k, e.name); if (e.isDirectory()) { if (e.name !== 'ham') gez(y); } else if (uzanti.test(e.name)) en = Math.max(en, fs.statSync(y).mtimeMs); } };
  gez(klasor);
  return en;
}
if (!DERLE && !process.env.KB_DAGITIM) {
  const kaynakZamani = Math.max(enSonDegisen(path.join(KOK, 'src'), /\.(js|css|html)$/), enSonDegisen(path.join(KOK, 'veri'), /^(?!cihazlar).*\.json$/), fs.statSync(path.join(KOK, 'build.py')).mtimeMs);
  const eski = DIST.filter((d) => fs.existsSync(d) && fs.statSync(d).mtimeMs < kaynakZamani - 1000);
  if (eski.length) console.log(`UYARI: ${eski.map((d) => path.basename(d)).join(', ')} kaynaklardan (src/, veri/, build.py) ESKİ; güncel kodu sınamak için --derle kullanın.\n`);
}

// ---- koşu ------------------------------------------------------------------------------------------------------
const GECICI = fs.mkdtempSync(path.join(process.env.KB_TMP || os.tmpdir(), 'kb-hepsi-'));
let artikToplam = 0;

function grubuOldur(pid) { try { process.kill(-pid, 'SIGKILL'); } catch (e) { /* */ } try { process.kill(pid, 'SIGKILL'); } catch (e) { /* */ } }
/** Bu koşunun geçici klasörüne profil açmış Brave süreçlerini bulup kapatır; kaç tane bulduğunu döndürür. */
function artikTarayicilar() {
  const r = spawnSync('pgrep', ['-f', '--', `--user-data-dir=${GECICI}`], { encoding: 'utf8' });
  const pidler = (r.stdout || '').split('\n').map((x) => +x).filter((x) => x && x !== process.pid);
  for (const pid of pidler) { try { process.kill(pid, 'SIGKILL'); } catch (e) { /* */ } }
  return pidler.length;
}

// hepsi.mjs kesilirse (Ctrl+C, kill) çalışan test süreci grubunu ve bu koşunun Brave'lerini de kapat
let aktifPid = null;
function temizlikVeCik(kod) {
  if (aktifPid) grubuOldur(aktifPid);
  artikTarayicilar();
  try { fs.rmSync(GECICI, { recursive: true, force: true }); } catch (e) { /* */ }
  process.exit(kod);
}
for (const [sinyal, kod] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) process.on(sinyal, () => temizlikVeCik(kod));

function calistir(ad) {
  return new Promise((coz) => {
    const sonucYolu = path.join(GECICI, ad + '.json');
    const dosya = path.join(BURASI, ad + '.mjs');
    const cocuk = spawn(process.execPath, [dosya], {
      cwd: KOK, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, KB_TMP: GECICI, KB_SONUC_DOSYASI: sonucYolu }
    });
    aktifPid = cocuk.pid;
    const bas = Date.now();
    let cikti = '', zamanAsimi = false;
    const yaz = (b) => { const m = b.toString(); cikti += m; process.stdout.write(m.replace(/^(?=.)/gm, '  ')); };
    cocuk.stdout.on('data', yaz);
    cocuk.stderr.on('data', yaz);
    const bekci = setTimeout(() => { zamanAsimi = true; grubuOldur(cocuk.pid); }, SURE);
    cocuk.on('close', (kod, sinyal) => {
      clearTimeout(bekci);
      grubuOldur(cocuk.pid);            // çocuktan sağ kalan her şey (Brave …) gitsin
      const artik = artikTarayicilar(); artikToplam += artik;
      let sonuc = null;
      try { sonuc = JSON.parse(fs.readFileSync(sonucYolu, 'utf8')); } catch (e) { /* çöktü ya da zaman aşımı */ }
      // çöken / zaman aşımına uğrayan dosyada o ana kadar biten sınamalar çıktıdan okunur
      const kismi = [];
      for (const satir of cikti.split('\n')) {
        const m = /^(not ok|ok) - (.*?)(?:\s+\((\d+) ms\))?$/.exec(satir);
        if (m) kismi.push({ ad: m[2], ok: m[1] === 'ok', ms: +m[3] || 0, hata: m[1] === 'ok' ? undefined : '(dosya tamamlanmadı; ayrıntı yukarıdaki çıktıda)' });
      }
      coz({ ad, kod, sinyal, zamanAsimi, sure: Date.now() - bas, sonuc, kismi, artik, cikti });
    });
  });
}

console.log(`Tarayıcı testleri · Node ${process.version} · ${SECILEN.length} dosya · dosya başına zaman aşımı ${SURE / 1000} sn · geçici klasör ${GECICI}`);
const sonuclar = [];
for (const ad of SECILEN) {
  console.log(`\n== ${ad}.mjs ==`);
  sonuclar.push(await calistir(ad));
  const s = sonuclar[sonuclar.length - 1];
  if (s.zamanAsimi) console.log(`  !! ZAMAN AŞIMI (${SURE / 1000} sn): süreç grubu öldürüldü`);
  else if (!s.sonuc) console.log(`  !! dosya sonuç yazmadan bitti (çıkış kodu ${s.kod}, sinyal ${s.sinyal}): çöktü`);
  if (s.artik) console.log(`  !! ${s.artik} artık tarayıcı süreci bulundu ve kapatıldı`);
}

// ---- özet ------------------------------------------------------------------------------------------------------
let toplam = 0, gecen = 0, kalan = 0, sorunlu = 0;
const basarisizlar = [];
console.log('\n================ ÖZET ================');
console.log('dosya'.padEnd(20) + 'sınama'.padStart(8) + 'geçti'.padStart(8) + 'kaldı'.padStart(8) + 'süre'.padStart(10));
for (const s of sonuclar) {
  const k = s.sonuc ? s.sonuc.kayit : s.kismi;
  const g = k.filter((x) => x.ok).length, f = k.length - g;
  toplam += k.length; gecen += g; kalan += f;
  if (!s.sonuc || s.zamanAsimi) sorunlu++;
  for (const x of k) if (!x.ok) basarisizlar.push({ dosya: s.ad, ad: x.ad, hata: x.hata });
  const not = s.zamanAsimi ? '  ZAMAN AŞIMI' : !s.sonuc ? '  ÇÖKTÜ' : '';
  console.log((s.ad + '.mjs').padEnd(20) + String(k.length).padStart(8) + String(g).padStart(8) + String(f).padStart(8) + sn(s.sure).padStart(10) + not);
}
console.log('TOPLAM'.padEnd(20) + String(toplam).padStart(8) + String(gecen).padStart(8) + String(kalan).padStart(8) + sn(Date.now() - t0).padStart(10));
const surum = (sonuclar.map((s) => /# tarayıcı: (\S+)/.exec(s.cikti)).find(Boolean) || [])[1];
console.log(`tarayıcı: ${surum || '?'} · artık Brave süreci: ${artikToplam ? artikToplam + ' (kapatıldı)' : 'yok'}`);
if (basarisizlar.length) {
  console.log('\nBAŞARISIZ SINAMALAR');
  for (const b of basarisizlar) console.log(`- [${b.dosya}] ${b.ad}\n    ${String(b.hata || '').split('\n').slice(0, 2).join('\n    ')}`);
}
try { fs.rmSync(GECICI, { recursive: true, force: true }); } catch (e) { /* */ }
const cikis = kalan || sorunlu || artikToplam ? 1 : 0;
console.log(`\n${cikis ? 'BAŞARISIZ' : 'TAMAM'}: ${gecen}/${toplam} sınama geçti${sorunlu ? `, ${sorunlu} dosya çöktü/zaman aşımı` : ''}`);
process.exit(cikis);
