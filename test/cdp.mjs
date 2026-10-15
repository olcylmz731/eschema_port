// Brave/Chromium'u başsız (headless) çalıştırıp Chrome DevTools Protokolü ile yöneten küçük araç.
// Bağımlılık yok (Node ≥ 22: yerleşik WebSocket + fetch).
// ~/Projeler/role-laboratuvari/test/cdp.mjs'den uyarlandı. Bu dosyayı yalnız `test` ajanı düzenler;
// başkaları içe aktarıp kendi dosyasında genişletir (örn. test/diyagram/cdp-dokunma.mjs).
//
//   import { launch } from './cdp.mjs';
//   const b = await launch({ width: 360, height: 800 });
//   const p = await b.open('file:///.../dist/kablo-bulucu.html');
//   await p.eval('1+1');  await p.shot('.gecici/x.png');  console.log(p.errors);
//   await b.close();
//
// Mobil emülasyon: await p.resize(360, 800, true).
// Ağ dinleme: p.requests (Network.requestWillBeSent; goto() her gezintide boşaltır, ana belge de listeye girer),
//             p.requestsDisarida() ana belge hariç dış istekler.
// Sayfa yüklenmeden önce betik: await p.onNewDocument('Object.defineProperty(window,"localStorage",{get(){throw new Error("x")}})'); sonra p.goto(url).
// Bekleme: await p.until('document.querySelector("#kb-ara")', 5000).
// Süreç temizliği: Brave kendi süreç grubunda (detached) başlar; close() grubu öldürür ve çıkışını bekler. Betik exit/SIGINT/SIGTERM ile
// ölürse kayıtlı bütün Brave grupları öldürülür. Beklenmedik takılmalar için launch({ zamanAsimi: ms }) bekçisi vardır (varsayılan 5 dk).
//
// Geçici profil klasörü için KB_TMP ortam değişkeni (yoksa os.tmpdir()). Klasör adı "kb-prof-…" ile başlar.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- süreç kaydı: betik ne şekilde ölürse ölsün Brave kalmasın -------------------------------------------------
const kayitli = new Set(); // { proc, userDir }
function grubuOldur(proc) {
  if (!proc || !proc.pid) return;
  try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { /* grup yok */ }
  try { process.kill(proc.pid, 'SIGKILL'); } catch (e) { /* süreç yok */ }
}
function hepsiniOldur() {
  for (const k of kayitli) { grubuOldur(k.proc); try { fs.rmSync(k.userDir, { recursive: true, force: true }); } catch (e) { /* */ } }
  kayitli.clear();
}
let kancalar = false;
function kancalariKur() {
  if (kancalar) return; kancalar = true;
  process.on('exit', hepsiniOldur);
  for (const [sinyal, kod] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) process.on(sinyal, () => { hepsiniOldur(); process.exit(kod); });
}
/** Dışarıdan çağrılabilir: kayıtlı bütün tarayıcıları hemen öldürür (zaman aşımı bekçileri için). */
export function tarayicilariOldur() { hepsiniOldur(); }

class Page {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.logs = []; this.errors = []; this.waiters = [];
    this.requests = []; this.dialogs = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) rej(new Error(m.method + ' ' + m.error.message)); else res(m.result);
      } else if (m.method) this.onEvent(m);
    };
  }
  onEvent(m) {
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = m.params.args.map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type)).join(' ');
      this.logs.push({ type: m.params.type, text: txt });
      if (m.params.type === 'error' || m.params.type === 'assert') this.errors.push('console.' + m.params.type + ': ' + txt);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      this.errors.push('exception: ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text) + ' @' + d.lineNumber + ':' + d.columnNumber);
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry; if (e.level === 'error') this.errors.push('log.error: ' + e.text + (e.url ? ' ' + e.url : ''));
    } else if (m.method === 'Network.requestWillBeSent') {
      const r = m.params.request || {};
      this.requests.push({ url: r.url, method: r.method, tur: m.params.type || null, belge: m.params.documentURL || null, baslatan: (m.params.initiator && m.params.initiator.type) || null });
    } else if (m.method === 'Page.javascriptDialogOpening') {
      this.dialogs.push({ tur: m.params.type, mesaj: m.params.message });
      this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});   // takılmasın
    }
    this.waiters = this.waiters.filter((w) => !w(m));
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  waitFor(pred, ms = 15000) {
    return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('zaman aşımı')), ms); this.waiters.push((m) => { if (pred(m)) { clearTimeout(t); res(m); return true; } return false; }); });
  }
  async goto(url) {
    this.errors.length = 0; this.logs.length = 0; this.requests.length = 0; this.dialogs.length = 0;
    const p = this.waitFor((m) => m.method === 'Page.loadEventFired');
    await this.send('Page.navigate', { url }); await p;
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval hatası: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  }
  /** İfade doğru (truthy) olana kadar bekler (50 ms aralıkla); zaman aşımında hata atar. Doğru değeri döndürür. */
  async until(expr, ms = 5000) {
    const t0 = Date.now(); let son = null;
    while (Date.now() - t0 < ms) {
      try { son = await this.eval(expr); if (son) return son; } catch (e) { son = null; }
      await sleep(50);
    }
    throw new Error('beklenen durum oluşmadı (' + ms + ' ms): ' + String(expr).slice(0, 120));
  }
  /** Sayfa her yeni belgede (gezinti/yenileme), betiklerden ÖNCE bu kaynağı çalıştırır. */
  async onNewDocument(source) { return this.send('Page.addScriptToEvaluateOnNewDocument', { source }); }
  /** Ana belge hariç ağ istekleri (data: ve about:blank da hariç; bunlar ağa çıkmaz). */
  requestsDisarida() {
    return this.requests.filter((r) => r.tur !== 'Document' && !/^(data:|about:)/.test(r.url || ''));
  }
  async shot(file, clip) {
    const params = { format: 'png' }; if (clip) params.clip = Object.assign({ scale: 1 }, clip);
    const r = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file;
  }
  /* bir öğenin ekran görüntüsünü al (sayfa ölçüsü yeterince büyük olmalı) */
  async shotEl(sel, file, pad = 0) {
    const r = await this.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
    if (!r) throw new Error('öğe yok: ' + sel);
    const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
    const res = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x, y, width: r.w + 2 * pad, height: r.h + 2 * pad, scale: 1 } });
    fs.writeFileSync(file, Buffer.from(res.data, 'base64')); return file;
  }
  async mouse(type, x, y, extra = {}) {
    return this.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'left', clickCount: 1 }, extra));
  }
  async move(x, y) { return this.mouse('mouseMoved', x, y, { button: 'none', clickCount: 0 }); }
  async click(x, y) { await this.mouse('mouseMoved', x, y, { button: 'none', clickCount: 0 }); await this.mouse('mousePressed', x, y); await this.mouse('mouseReleased', x, y); }
  async key(key, code) {
    const ADLI = { Enter: [13, '\r'], Escape: [27, undefined], Backspace: [8, undefined], Tab: [9, undefined], ArrowDown: [40, undefined], ArrowUp: [38, undefined], ArrowLeft: [37, undefined], ArrowRight: [39, undefined] };
    const adli = ADLI[key];
    const k = { key, code: code || key, text: adli ? adli[1] : key.length === 1 ? key : undefined, windowsVirtualKeyCode: adli ? adli[0] : key === ' ' ? 32 : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0 };
    await this.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k));
    await this.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k));
  }
  async type(text) { await this.send('Input.insertText', { text }); }
  async resize(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  }
  sleep(ms) { return sleep(ms); }
}

export async function launch({ width = 1500, height = 1000, port, binary = 'brave', zamanAsimi = 300000 } = {}) {
  kancalariKur();
  port = port || 9300 + Math.floor(Math.random() * 600);
  const tmpBase = process.env.KB_TMP || os.tmpdir();
  const userDir = fs.mkdtempSync(path.join(tmpBase, 'kb-prof-'));
  const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--mute-audio', `--window-size=${width},${height}`,
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-ipc-flooding-protection',   // hızlı süpürmelerde history.pushState/replaceState "Too many calls" kısıtına (200/10 sn) takılmasın
    'about:blank'];
  const proc = spawn(binary, args, { stdio: ['ignore', 'ignore', 'ignore'], detached: true });
  const kayit = { proc, userDir };
  kayitli.add(kayit);
  let bitti = false;
  const cikis = new Promise((res) => proc.once('exit', () => res()));
  const kapat = async () => {
    if (bitti) return; bitti = true;
    clearTimeout(bekci);
    grubuOldur(proc);
    await Promise.race([cikis, sleep(3000)]);
    kayitli.delete(kayit);
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) { /* */ }
  };
  // bekçi: test takılırsa (CDP yanıtı gelmez, sonsuz döngü …) tarayıcıyı öldür; bekleyen komutlar hata alır
  const bekci = setTimeout(() => { console.error(`[cdp] zaman aşımı (${zamanAsimi} ms): tarayıcı öldürülüyor`); grubuOldur(proc); }, zamanAsimi);
  bekci.unref();
  let targets = null;
  try {
    for (let k = 0; k < 80; k++) {
      try { const r = await fetch(`http://127.0.0.1:${port}/json/list`); targets = await r.json(); if (targets.find((t) => t.type === 'page')) break; } catch (e) { /* bekle */ }
      await sleep(150);
    }
    if (!targets) throw new Error('tarayıcı başlatılamadı');
    const t = targets.find((x) => x.type === 'page');
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws bağlanamadı')); });
    const page = new Page(ws);
    ws.onclose = () => { for (const { rej } of page.pending.values()) rej(new Error('tarayıcı bağlantısı kapandı')); page.pending.clear(); };
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable'); await page.send('Network.enable');
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await page.resize(width, height);
    let surum = null;
    try { surum = (await page.send('Browser.getVersion')).product; } catch (e) { /* */ }
    return {
      page, port, surum, pid: proc.pid,
      async open(url) { await page.goto(url); return page; },
      async close() { try { page.ws.onclose = null; page.ws.close(); } catch (e) { /* */ } await kapat(); },
      /** süreç hâlâ yaşıyor mu (temizlik denetimi için) */
      yasiyor() { try { process.kill(proc.pid, 0); return true; } catch (e) { return false; } }
    };
  } catch (e) {
    await kapat();
    throw e;
  }
}
