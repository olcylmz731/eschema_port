'use strict';
// `node --test test/birim/` komutunun giriş noktası.
// Node 22'de bir DİZİN verilince koşucu onu dosya gibi çalıştırır (`node test/birim`), Node da dizini
// modül olarak `index.js` ile çözer: bu dosya aynı dizindeki bütün `*.test.mjs` dosyalarını içe aktarır,
// testler tek süreçte koşar. Tek dosya da çalışır:  node --test test/birim/arama.test.mjs
// Bir test dosyası yüklenirken çökerse (ör. üst düzey veri kurulumu hata verirse) başarısız bir test olarak kaydedilir
// ve öbür dosyalar yine de yüklenir (tek dosya bütün paketi gizlemesin).
// (Node 20 ve öncesi dizini özyinelemeli tarar; orada her test iki kez koşabilir. Hedef sürüm: Node 22.
//  package.json'a "type":"module" eklenirse bu dosya yeniden adlandırılmalı.)
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const dosyalar = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.mjs')).sort();
(async () => {
  for (const f of dosyalar) {
    try {
      await import(pathToFileURL(path.join(__dirname, f)).href);
    } catch (e) {
      // yüklenemeyen dosya sayımlarda da görünsün: başarısız bir test olarak kaydedilir
      test(`test dosyası yüklenemedi: ${f}`, () => { throw e; });
    }
  }
})();
