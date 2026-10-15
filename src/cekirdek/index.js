/* Yalnız Node için giriş noktası (tarayıcı paketine girmez; build.py bu dosyayı atlar).
   Kullanım:  const KB = require('./src/cekirdek');   // ESM: import KB from './src/cekirdek/index.js'
   Tarayıcıdaki global KB ile aynı şekli verir: KB.normalize, KB.veri, KB.ara, KB.izle, KB.cihazSorgu, KB.soketSorgu,
   KB.metin, KB.renkler, KB.oner. */
'use strict';

module.exports = {
  normalize: require('./normalize.js'),
  renkler: require('./renkler.js'),
  veri: require('./veri.js'),
  ara: require('./ara.js'),
  izle: require('./izle.js'),
  cihazSorgu: require('./cihaz-sorgu.js'),
  soketSorgu: require('./soket-sorgu.js'),
  metin: require('./metin.js'),
  oner: require('./oner.js')
};
