# Çekirdek API'si (`src/cekirdek/`)

Diyagram motoru, arayüz ve test bu dosyaya bakarak çalışır. DOM yok: bütün işlevler düz veri alır, düz veri döndürür.
Örnek değerler **uydurmadır** (`99A01`, `9999`); gerçek veri değildir. Örnek çıktılar `.gecici/cekirdek/` altındaki sahte veriyle gerçek koddan üretilmiştir (bölüm 12).

## 0. Önce bu

Tarayıcıda (`src/baslat.js`):
```js
var paket = JSON.parse(document.getElementById('kb-veri').textContent);   // build.py gömer
var db    = KB.veri.yukle(paket);                                         // bir kez
var s     = KB.ara.ara(db, '9999', { sekme: null });                      // arama
var iz    = KB.izle.kablo(db, s.kablo[0].anahtar);                        // iz nesnesi (çizim ve metin için)
var metin = KB.metin.ozet(iz);                                            // düz metin
```
Node'da (test, duman):
```js
const KB = require('./src/cekirdek');            // ESM'den: import KB from './src/cekirdek/index.js'
const db = KB.veri.klasordenYukle('veri');       // veri/semalar.json + veri/<sema>.json (dosyası olmayan şemayı atlar, uyarır)
```
Tek tek de alınır: `require('./src/cekirdek/izle.js')` (dosya adları: `normalize veri ara izle cihaz-sorgu soket-sorgu metin renkler oner`).
Tarayıcıda her modül global `KB` altındadır: `KB.normalize KB.veri KB.ara KB.izle KB.cihazSorgu KB.soketSorgu KB.metin KB.renkler KB.oner`. Yükleme sırası önemsizdir (bağımlılıklar çağrı anında çözülür).

Genel kurallar:
- Çıktılar düz JSON'dur (Map, Set, işlev, döngüsel başvuru yok); **değiştirmeyin** (sorgular aynı nesneyi tekrar vermez ama `db` iç kayıtlarını paylaşabilir).
- `null` = şemada yazmıyor / bilinmiyor. İçinde `?` olan metin = okunamayan karakter (ör. `"1?"`); bunu `belirsiz` bayrağı da gösterir. **Tahmin yok.**
- Alan adları Türkçe, yalnız ASCII. Cihaz kodları ve Almanca pin adları olduğu gibi gelir.
- Bir nesnede "uygulanabilir" alan her zaman vardır (değeri `null` olabilir); uygulanamaz alan hiç yoktur (ör. `soket` düğümünde `pinAdi` yoktur).
- ES2017 yazım düzeyi (eski Android WebView'lar için; `?.` ve `??` kullanılmaz).

---

## 1. Veri paketi ve `db`

`build.py`, sayfaya `<script type="application/json" id="kb-veri">` olarak şunu gömer:
```jsonc
{
  "surum": 1, "imza": "a1b2c3d4",                  // imza: veri içeriğinin kısa özeti (altbilgide gösterilebilir; iki sürümde farklıdır)
  "meta": { "surum": "dagitim" },                  // "dagitim" | "dogrulama" (§9): hangi sürüm olduğu. Eski paketlerde alan yok
  "sekmeler": [ { "id": "kapi", "ad": "Kapı 1–4", "semalar": ["kapi-1", "kapi-2"] } ],   // veri/semalar.json sırası
  "semalar":  { "kapi-1": { "ad": "Kapı 1", "pdf": "Kapı 1stromlaufplan.pdf", "sayfalar": [1], "kapak": [], "dilim": 1 } },
  "veri":     { "kapi-1": { /* veri/kapi-1.json, goruldu/emin/null alanları ayıklanmış; dağıtım sürümünde ayrıca parça "not", "celiskiler", suphe ayrıntıları yok (§9) */ } }   // dosyası olmayan şema burada yok
}
```
`KB.veri.yukle(paket) → db`. (`paket.veri` dizi de olabilir; Node'da ham `veri/<sema>.json` dosyaları da aynı biçimde yüklenir.)

`db` genel alanları (alt çizgiyle başlayanlar çekirdeğe aittir, kullanmayın):
```js
db.meta       // { surum: 'dagitim' | 'dogrulama' | null }   paket.meta.surum; paket söylemiyorsa null. klasordenYukle (ham veri, hiçbir şey ayıklanmaz) → 'dogrulama'.
              //   Arayüz isterse "doğrulama sürümü" rozetini bundan çizebilir. Çekirdek mantığı buna bağlı değildir
db.sekmeler   // [{ id, ad, semalar: ['kapi-1'], eksikSemalar: ['kapi-2'] }]   semalar: verisi yüklenenler; eksikSemalar: sekmede tanımlı ama veri/<sema>.json yok
db.semaSirasi // ['alternator-mars', 'kapi-1', ...]  yüklü şemalar, semalar.json sırasıyla
db.semalar    // { 'kapi-1': { id, ad, pdf, sayfalar, kapak, dilim, sekme, dogrulandi, kunye, varsayilan, parcaSayisi, cihazSayisi, supheSayisi, celiskiSayisi, icSayisi, kendineDonenSayisi } }
              //   varsayilan: { renk:'ws', kesit:'0.75', ham:'…' }  şema notu (kablonun kendi değeri değildir)
db.istatistik // { sema, parca, kablo, cihaz, soket, suphe, dogrulanmamisSema, ic, kendineDonen, gecis }
              //   kablo: kablo sayısı (cihaz içi köprü ic:true kablo sayılmaz). ic: cihaz içi köprü parçaları · kendineDonen: iki ucu aynı soket-pin olan parçalar ·
              //   gecis: geçiş bileşeni sayısı (§4.9)
db.ornekler   // { kablo: '9999', cihaz: '99A01', soket: 'IV-18' }  ilk ekrandaki "örnek aramalar" için, veriden seçilir (yoksa null)
db.uyarilar   // [{ tur, sema, id, mesaj }]  yükleme uyarıları (bozuk kayıt atlandı, şema dosyası yok, ic:true parçanın iki ucu aynı cihazın pini değil: tur 'ic-uc' …)
```
Yardımcılar:
```js
KB.veri.klasordenYukle(klasor, { sessiz })  // yalnız Node. klasor/semalar.json'u okur, olmayan <sema>.json'u atlar (db.uyarilar'a yazar)
KB.veri.cihaz(db, kod)    // normalize eder; → { kod, kisaAd, adTr, adDe, cihazTur, cihazBilinmiyor, yol:{sema:[..]}, semalar:[..], gecis } | null   gecis: iz bu bileşenden geçer (§4.9)
KB.veri.sekmeSemalari(db, sekmeId)   // → ['kapi-1', ...] (yüklü olanlar); sekmeId boş/null → hepsi
KB.veri.celiskiler(db)    // yükleme sırasında bulunan bütün kablo çelişkileri (bölüm 5.7)
KB.veri.temizle(nesne)    // build.py'nin yaptığı ayıklamanın JS eşi (goruldu/emin/null); testler için. Dağıtım ayıklaması (parça not, celiskiler, suphe ayrıntıları; §9) yalnız build.py'dedir
```
`cihazTur` değerleri: `beyin sensor lamba sigorta guc ikaz role motor direnc salter diyot toprak soket valf dugum besleme diger` (VERI-MODELI §2). Cihaz hiçbir bileşen listesinde yoksa tür kod harfinden türetilir ve `cihazBilinmiyor: true` olur.

---

## 2. `KB.normalize`

Üç anahtar türü vardır; **ne için hangisinin kullanıldığı** önemlidir (alternatörde `B+`, `B-`, `D+`, `DF`, `W` pinleri var: `B-` ile `B` AYRI pindir):

| İşlev | Ne için | Kural |
|---|---|---|
| `norm(s)` | cihaz kodu, soket adı, ek noktası kodu | büyük harf, boşluk yok, `,` → `.`, `ı/İ` → `I`, aksan yok. **İki yanında karakter olan tire ayraçtır, atılır** (`IV-18` → `IV18`); **baştaki/sondaki tire kutup işaretidir, kalır** (`B-` → `B-`) |
| `pin(s)` | **pin kimliği**: uç anahtarı, düğüm, iz birleştirme, çelişki denetimi, cihaz/soket sorgusunun pin satırı, `uc()` ref'i, `X99.1/4` yazımının pin kısmı | `norm` gibi ama **bütün tireler ve `+` korunur** (`B-` ≠ `B` ≠ `B+`; `IV-18` → `IV-18`; `31-1` → `31-1`; tire türleri tek `-` olur) |
| `arama(s)` | **arama sorgusu** (kutuya yazılan; `KB.ara`, `KB.oner`) | `norm` gibi ama baştaki/sondaki tire de atılır: tire/boşluk farkı yok sayılır (PROMPT §4), kullanıcı `IV-` ya da `2,5-` yazarken ayracı bırakmış olabilir |

```js
KB.normalize.norm('X08. 11')        // → 'X08.11'    büyük harf, boşluk yok, ı/İ→I, aksan yok, ',' → '.'
KB.normalize.norm('61a01')          // → '61A01'
KB.normalize.norm('İV-18')          // → 'IV18'      (Türkçe klavyenin büyük İ'si; yerel ayara bağlı dönüşüm kullanılmaz)
KB.normalize.norm('B-')             // → 'B-'        kenar tire kalır: norm('B-') ≠ norm('B') ≠ norm('B+')
KB.normalize.pin('B-')              // → 'B-'        pin kimliği
KB.normalize.pin('IV-18')           // → 'IV-18'     pinde tire hiç atılmaz
KB.normalize.arama('IV-')           // → 'IV'        arama: kenar tire de atılır
KB.normalize.arama('B-')            // → 'B'         (arama 'B-' yazanı 'B' ile de eşler; kimlik karşılaştırması değildir)
KB.normalize.kabloAnahtari('#4002') // → '4002'      baştaki '#' atılır, sonra arama(); '2,5-4135' → '2.54135'
KB.normalize.buyuk('İi ı')          // → 'II I'      yalnız Türkçe-güvenli büyük harf (boşluk korunur); norm/pin/arama bunun üstüne kurulur
KB.normalize.dogal(a, b)            // → -1|0|1      doğal sıralama (2 < 10; harfsiz/harfli karışık)
KB.normalize.belirsiz('1?')         // → true        '?' içeriyor mu
KB.normalize.tekil(dizi)            // → dizi        tekrarsız (ilk görülen kalır; null atılır)
```
Kural: **kimlik** karşılaştırması (aynı cihaz/soket/pin mi?) `norm` (cihaz, soket) ve `pin` (pin) ile; **kullanıcı yazısı** `arama` ile işlenir. Çekirdeğin dışından pin karşılaştırırken `pin()` kullanın.

---

## 3. `KB.ara` — arama

```js
KB.ara.ara(db, sorgu, { sekme, limit })   // → Sonuc
KB.ara.liste(db, sekmeId, { limit })      // → Sonuc    boş sorgu + sekme: o sistemin cihaz ve kablo listesi (ara(db,'',{sekme}) ile aynı)
```
- `sekme`: sekme kimliği (`'kapi'`) ya da `null`/`''` = **Tümü** (varsayılan). Süzgeç: sonuç, sekmenin şemalarından en az birinde geçmeli. Öğenin kendi `semalar` listesi daralmaz.
- Sıra: önce **tam** eşleşme, sonra **önek**, (yalnız cihaz için) sonra **ad** eşleşmesi; her kademede doğal sıra. `limit` grup başınadır (varsayılan 40); gerçek sayı `sayilar`'da.
- Cihaz kodu yanında `kisaAd` (`FPS 3`), `adTr` ve (≥4 harf) `adDe` içinde de aranır (kademe `ad`).
- `X99.1/4` ya da `IV-18/10` yazımı (soket/pin) soket grubunda ilgili pini işaretler (`pin` alanı dolu gelir). Soket kısmı `arama()` ile (tire/boşluk farkı yok sayılır), **pin kısmı `pin()` ile** karşılaştırılır: tire ve artı korunur (soketli bir cihazda `31-1` ile `31` ayrı pindir).
- Sorgu `arama()` ile normalize edilir (§2): `iv-18`, `IV 18`, `İV–18` aynıdır; kenarda kalan tire (`IV-`, `2,5-`) yok sayılır.
- Sorgu `/` içerse de **kablo aranır**: numarasız iki renkli etiketler (`1sw/rt`, `1ws/li`) soket/pin yazımına benzer; ikisi birlikte yorumlanır (cihaz grubu bu durumda boştur).
- `ic:true` (cihaz içi köprü) parçaları kablo sayılmaz: kablo grubu kurmaz, aramada ve kablo sayılarında görünmez. Kendine dönen ve "aynı soket içinde köprü" parçaları normal kablodur, aranır.

`Sonuc`:
```js
{
  sorgu: '9999', anahtar: '9999', sekme: null,
  bos: false,                       // sorgu boş ve sekme yok (ilk ekran)
  gruplar: ['kablo'],               // dolu grupların gösterim sırası: en iyi eşleşme (tam > önek > ad) önde, eşitse cihaz, soket, kablo
  cihaz: [Cihaz…], soket: [Soket…], kablo: [Kablo…],
  sayilar: { cihaz: 0, soket: 0, kablo: 1 }, toplam: 1,     // limit öncesi
  kesildi: false,                   // herhangi bir grup limitle kısaldı mı
  pin: null                         // soket/pin yazımıysa { soket:'X99.1', pin:'4' }
}
```
Öğeler (hepsinde ortak: `tur`, `eslesme: 'tam'|'onek'|'ad'`, `semalar: [..]`, `sekmeler: [sekmeId..]`, `supheli`, `dogrulandi` (yalnız bütün şemaları doğrulanmışsa true)):
```js
Cihaz = { tur:'cihaz', kod:'99A01', kisaAd:'Sahte Beyin 1', adTr:null, adDe:'…', cihazTur:'beyin', cihazBilinmiyor:false,
          yol:{ 'sahte-1':['12'] }, soketSayisi: 2, pinSayisi: 9 }          // pinSayisi: şemada kablosu olan pin sayısı
Soket = { tur:'soket', soket:'IV-18', cihaz:'99A02'|null, cihazKisaAd:'Sahte FPS 2'|null, cihazTur:'beyin'|null,
          ara:false,                 // true: kablo hattındaki ara soket (cihaz yok)
          pinSayisi: 18|null,        // soket adından türetilir (IV-18 → 18, "15" → 15); ara soketlerde null
          bagliPinSayisi: 3, pin: null }
Kablo = { tur:'kablo', anahtar:'9999', no:'9999', etiket:'9999', etiketler:['9999'],    // etiket: başlıkta gösterilecek (# dahil)
          parcaSayisi: 2, cihazlar:[{ kod:'99A01', kisaAd:'Sahte Beyin 1' }, …],       // kablonun kendi parçalarının uçlarındaki cihazlar
          celiski:false }
```
Numarasız kablo (`70sw`): `no: null`, `anahtar: 'etiket:70SW'`.

---

## 4. `KB.izle` — kablo/pin izleme (diyagram ve metin bunun çıktısını kullanır)

```js
KB.izle.kablo(db, anahtarVeyaNo, opts)   // → Iz | null     anahtar: Kablo.anahtar; '9999', '#9999', '2,5-4135', '70sw' de kabul
KB.izle.uc(db, ref, opts)                // → Iz | null     ref:
//   { cihaz:'99A02', soket:'IV-18', pin:'10' }   cihaz pini
//   { cihaz:'99G01', soket:null,   pin:'B+' }    soketsiz cihaz ucu
//   { soket:'X99.1', pin:'4' }                   ara soket pini
//   { dugum:'99Z07' }                            ek noktası
//   { parca:'sahte-1:k008', uc:0 }               pini okunamayan/yazılmayan uç (cihaz tablosunda gelir)
KB.izle.kollar(iz)                       // → [{ kenar, karsiUc, varis:[Dugum], ara:[Dugum], dal, sanal, ic, gecisler }]   ilk bileşenin kökünden çıkan kollar (cihaz/soket tablosu için, §5)
// opts: { semalar:['kapi-1'], baslangic:'99A01'|{cihaz,soket,pin}, maksKenar:150 }
//   semalar   : yalnız bu şemalardaki parçalar katılır (varsayılan hepsi)
//   baslangic : zincirin hangi uçtan başlayacağı (cihaz kodu ya da pin); yoksa kural: bölüm 4.5
```

### 4.1 Ne dahil olur (özet; ayrıntı bölüm 11)
Bir **kablo** = aynı numaralı bütün parçalar (şemalar arası). Bunlara **ara soket** ve **ek noktası** üzerinden bağlanan komşu parçalar da girer (numara değişebilir). **Cihaz pininden** geçilmez; yalnız aynı numaralı parçalar pinde buluşur (dallanma); tek ek: etiketli bir parçanın cihaz pinindeki **etiketsiz** parça onun dalıdır (§11.2). `devam` uçları başka şemadaki aynı numaralı parçayla eşleşirse zincir sürer, eşleşmezse "devam" yaprağı olarak kalır. İki uçlu **geçiş bileşenlerinden** (sigorta, diyot, direnç, şalter) iz kesintisiz geçer: aralarına **sanal kenar** girer (§4.9). Cihaz içi köprü (`ic`) bağlantı olarak izlenir, kablo sayılmaz.

### 4.2 `Iz`
```js
{
  tur: 'kablo' | 'uc',
  baslik: 'Kablo 9999',                 // metin özetinin başlığı da budur
  sorgu: { anahtar:'9999' } | { cihaz, soket, pin } | { soket, pin } | { dugum } | { parca, uc },
  kablo: { anahtar, no, etiket, isaret, parcaSayisi } | null,    // tur:'kablo' ise
  bilesenler: [Bilesen…],               // ≥ 1. Çoğu zaman tek: bilesenler[0]. Birden çoksa aynı numaralı parçalar birbirine bağlanmıyor (numara yeniden kullanılmış ya da eksik bağlantı) → alt alta çizin
  dugumler: [Dugum…], kenarlar: [Kenar…],   // bütün bileşenlerin düz listesi; id'ler iz içinde benzersiz ('n1', 'e1')
  dal: false, dongu: false,             // herhangi bir bileşende dallanma / çevrim
  sayilar: { kablo: 2, sanal: 1, ic: 0, kendineDonen: 0 },   // kablo: gerçek kablo kenarı (sanal ve ic hariç; kendine dönenler dahil) · sanal: geçiş bileşeni · ic: cihaz içi köprü · kendineDonen: kendine dönen kenar
  kaynaklar: [Kaynak…],                 // bütün kenar ve düğümlerin kaynakları, tekilleştirilmiş, şema/sayfa/yol sırasıyla
  semalar: ['sahte-1'],                 // izde parçası olan şemalar
  dogrulandi: false, dogrulanmamisSemalar: ['sahte-1'],   // true yalnız hepsi doğrulanmışsa → aksi halde "DOĞRULANMADI" etiketi
  supheli: false,                       // herhangi bir kenar şüpheli ya da düğümde '?' var → "ŞÜPHELİ"
  celiski: false,                       // bölüm 5.7
  uyarilar: [Uyari…],
  sinirAsildi: false                    // maksKenar'a takıldı; kesik düğümler işaretli
}
```

### 4.3 `Bilesen`
```js
{
  id: 'b1',
  baslangic: 'n1',          // ağacın kökü: kablo sorgusunda zincirin başı; uc sorgusunda sorgulanan düğüm
  odak: null,               // uc sorgusunda sorgulanan düğüm (zincirin ortasında olabilir → vurgulayın); kablo sorgusunda null
  dugumler: ['n1','n2','n3'],   // DFS sırasıyla
  kenarlar: ['e1','e2'],
  zincir: ['n1','n2','n3'],     // dal ve çevrim YOKSA uçtan uca düğüm sırası, değilse null. Soldan sağa/yukarıdan aşağıya bu sırayla çizin
  zincirKenarlar: ['e1','e2'],  // zincirKenarlar[i], zincir[i] ile zincir[i+1] arasındadır
  agac: Agac,                   // her zaman var, kök = baslangic. Zincirde doğrusal ağaç
  yildiz: { merkez:'n3', kollar:[ Kol… ] } | null,   // tam bir düğümde dallanma varsa ve çevrim yoksa: yıldız çizimi için hazır
  geriKenarlar: [],             // çevrimi kapatan kenarlar (agac'ta yok); çizimde ayrı gösterilir
  kendineDonenKenarlar: [],     // iki ucu aynı düğüm olan kenarlar (agac/zincir/dal hesabına GİRMEZ; düğümün üstüne küçük bir halka/etiket olarak çizin). Kimlikleri en sondadır
  dal: false, dongu: false,
  merkez: null                  // dal varsa en çok bağlantılı düğüm
}
Agac = { dugum:'n1', kenar:null, cocuklar:[ { dugum:'n2', kenar:'e1', cocuklar:[…] } ] }   // kenar: üst düğümle bu düğüm arasındaki kenar; çocuklar kararlı sıralı
Kol  = { dugumler:['n2','n1'], kenarlar:['e2','e1'] }   // merkezden dışarı: kenarlar[0] merkezle dugumler[0] arasında, kenarlar[i] dugumler[i-1] ile dugumler[i] arasında
```
`dal`: **en az 3 kenarlı** düğüm var. İki kenarlı düğüm (cihaz pininde iki aynı numaralı parça dahil) zincirde ortadadır. Sanal kenar (geçiş bileşeni) sıradan bir kenar gibi sayılır: sigortanın bir terminalinde iki kablo + sanal kenar = 3 kenar = dal.
Dallanma tek düğümde değilse (`yildiz: null`) `agac`'tan çizin.

### 4.4 `Dugum`
```js
{
  id: 'n2',
  tur: 'cihaz' | 'soket' | 'dugum' | 'devam',      // VERI-MODELI uç türleri
  ad: 'Sahte FPS 2 (99A02)',                        // kısa başlık: cihaz → "kisaAd (kod)" ya da "kod"; soket → "X99.1"; dugum → "ek noktası 99Z07"; devam → "devam → 99Q99"

  // tur:'cihaz'
  cihaz:'99A02', cihazTur:'beyin', kisaAd:'Sahte FPS 2', adTr:null, adDe:'…', cihazBilinmiyor:false,
  soket:'IV-18', pin:'10', pinAdi:'HS10',            // soket/pin/pinAdi: yazmıyorsa null. Pin kimliği KB.normalize.pin() ile kurulur: 'B-' ile 'B' ile 'B+' AYRI düğümdür (§2)
  adresEksik:false,                                  // true: şemada bu cihaz ucunun soket ve pini yazılı değil (metinde "soket/pin şemada yazılı değil")
  gecisUcu:false,                                    // true: bu düğüm bir geçiş bileşeninin (sigorta/diyot/direnç/şalter) terminalidir; sanal kenarın bir ucu (§4.9)
  // tur:'soket' (ara soket): soket:'X99.1', pin:'4'
  // tur:'dugum': kod:'99Z07', kodsuz:false           (kodsuz:true → şemada kodu yok; kod yerel ad '~d1')
  // tur:'devam': hedefCihaz:'99Q99'|null, hedefCihazAd:'…'|null, hedef:'2/27'|null, cozuldu:false,
  //              sayfaIci:false   (true: hedef yalnız bir yol numarası, örn. '74' = aynı sayfada o akım yoluna devam ediyor; bağlanmaz, ad: 'devam → yol 74')

  belirsiz:false,        // soket/pin/pinAdi/kod içinde '?' var → ŞÜPHELİ işareti
  derece:2, yaprak:false, dal:false,                 // derece: bağlı kenar sayısı; yaprak: derece 1; dal: derece ≥ 3
  acik:false,            // ara soket / ek noktası ama yalnız bir parça bağlı: öbür taraf şemada yok
  kesik:false,           // maksKenar sınırı yüzünden genişletilmedi
  celiski:false,         // bu pinde farklı numaralı kablolar var (bölüm 5.7)
  digerKablolar:[],      // cihaz pininde olup bu ize girmeyen başka numaralı kablolar: [{ etiket, sema, parca }]
  kenarlar:['e1','e2'],  // bağlı kenar id'leri: iki ucu FARKLI düğüm olan kenarlar. Kendine dönen kenar burada YOKTUR (yalnız aşağıdaki kendineDonen'de; kenarın kendisi iz.kenarlar'da kendineDonen:true ile durur). derece === kenarlar.length
  kendineDonen:[],       // bu düğümde iki ucu da burada biten kenar id'leri (örn. kesikli kutudaki körük soketi X11.42/1). Derece/dal/yaprak hesabına girmez
  kaynaklar:[Kaynak…],   // bu düğümü gösteren yerler
  ham:['HS10 IV-18/10']  // uçlarda şemada yazan ham metinler
}
```
**Cihaza dokununca** `onCihaz(dugum.cihaz)`; `devam` düğümünde `hedefCihaz`. Bir pine dokununca: `KB.izle.uc(db, { cihaz, soket, pin })`.

### 4.5 `Kenar` (bir iletken; şemada aynı iki ucu gösteren parçalar tek kenarda birleşir)
```js
{
  id:'e1', a:'n1', b:'n2',          // uç düğümler; ağaç kenarlarında a = köke yakın taraf. Zincirde a, b'den önce gelir
  etiket:'9999', etiketler:['9999'], no:'9999', isaret:null,      // etiket şemada yazan (# dahil); no numarasızsa null
  renk:'ws', renkAd:'beyaz', renkParcalari:[{ kisaltma:'ws', ad:'beyaz', taniniyor:true }], renkSemaNotu:true,
  kesit:'0.75', kesitMetni:'0,75 mm²', kesitSemaNotu:true,
  //   renkSemaNotu/kesitSemaNotu true: değer kablonun kendisinde yazmıyor, şema notundan (varsayılan) geliyor → "(şema notu)" ile ayrı gösterin.
  //   hiçbiri yoksa renk/kesit null. İki renkli: renkParcalari 2 öğe ('sw/rt')
  varyant:false,                    // kesikli çizim (opsiyonel donanım)
  durum:'eslesti',                  // 'eslesti' | 'cozuldu' | 'suphe' (birleşen parçaların en kötüsü)
  suphe:null,                       // durum 'suphe' ise { soru, A, B, kirpinti }
  supheli:false,                    // durum 'suphe' ya da etiket/no içinde '?'
  not:null,
  kaynak:Kaynak, kaynaklar:[Kaynak…],   // kaynak = kaynaklar[0]; birden çok: aynı iletken birden çok yerde çizilmiş
  parcalar:['sahte-1:k001'],        // birleşen veri kayıtları (şema:id)
  dogrulandi:false,                 // kaynak şemaların hepsi doğrulanmış mı
  celiski:false,
  beyinListesi:[],                  // veri dosyasındaki celiskiler[] kayıtları: { alan, sema, beyinListesi, not } (şema esastır)
  geri:false,                       // true: çevrimi kapatan kenar
  sanal:false, bilesen:null,        // sanal:true → kablo DEĞİL, geçiş bileşeninin iç bağlantısı; bilesen: { kod, tur, turAd, ad, kisaAd, adTr, adDe, cihazBilinmiyor } (§4.9). Sanal kenarda etiket/no/renk/kesit null, varyant false
  ic:false,                         // true: cihaz içi köprü (veride ic:true; örn. alternatör D+ ↔ DF). Kablo değil: etiket genellikle null, renk/kesit (şema notu dahil) null; "cihaz içi" diye çizin/yazın
  kendineDonen:false,               // true: iki ucu aynı düğüm (a === b); yapıya girmez, Dugum.kendineDonen ve Bilesen.kendineDonenKenarlar'da taşınır
  soketIci:false                    // true: iki ucu da aynı cihazın AYNI soketinde, farklı pinlerde (örn. 4060: 41A01 CANRS 9/5 ↔ CANLS 9/6). Normal, numaralı, aranabilir bir kablodur; yalnız "aynı soket içinde köprü" notu taşır
}
```

### 4.6 `Kaynak` ve `Uyari`
```js
Kaynak = { sema:'sahte-1', semaAd:'Sahte 1', pdf:'Sahte 1 stromlaufplan.pdf', sayfa:1, yol:'24', satir:'A', kesin:true,
           izgara:'sayfa 1 · yol 24 · satır A', metin:'Sahte 1 stromlaufplan.pdf · sayfa 1 · yol 24 · satır A',
           dogrulandi:false, parca:'k001' }
//   yol '~24' (kesin değil) → kesin:false. Bileşen listesinden gelen cihaz kaynağında sayfa yalnız şema tek sayfalıysa dolu
Uyari  = { tur, onem, mesaj, dugum?, kenar? }     // onem: 'hata'|'uyari'|'bilgi'
//   tur: 'celiski' | 'beyin-listesi' | 'belirsiz-devam' | 'cevrim' | 'sinir' | 'acik-uc' | 'ozellik' | 'varyant'
```

### 4.7 Çelişki (`celiski:true`)
Üç durumda: (1) **cihaz pininde farklı numaralı** iki kablo; (2) **aynı numaralı kablo, aynı cihazda iki farklı soket/pine** iniyor ve bu uçları gösteren şemalar birbirinden ayrı (hiçbir şema ikisini birden göstermiyor); (3) `devam` oku birden çok olası karşılığa uyuyor (`belirsiz-devam`, düğüm değil uyarı). Beyin Listesi çelişkileri `celiski` değil `beyinListesi` / `beyin-listesi` uyarısıdır. Çelişkili düğüm/kenar `celiski:true` taşır, ayrıntı `uyarilar`'dadır.

### 4.8 Zincir yönü
Kablo sorgusunda başlangıç, yaprak uçlar arasından seçilir: önce **beyin olmayan** uç (yani kaynak → beyin), eşitlikte kod doğal sırası. `opts.baslangic` ile çevrilir. Pin sorgusunda başlangıç sorgulanan pindir.

### 4.9 Geçiş bileşenleri ve özel parçalar

**Geçiş bileşeni** (`Kenar.sanal: true`): türü `sigorta`, `diyot`, `direnc` ya da `salter` olan ve veride **tam iki ayrı ucu (terminali)** bulunan cihaz. İz bu cihazdan kesintisiz geçer: iki terminal düğümü arasına bir **sanal kenar** girer. Sanal kenar **kablo değildir** (etiket/no/renk/kesit `null`, `varyant:false`; `iz.sayilar.kablo`'ya girmez; özellik satırı üretmez; kablo aramasında ve sayılarında yoktur) — "iz bu bileşenden geçti" bilgisidir.
- *Terminal*: aynı uç anahtarlı uçlar (cihaz, soket, pin) tek terminaldir. Pini yazılmayan ya da `?` içeren her uç **ayrı** terminaldir (pin adsız iki uçlu `01R02` yanlışlıkla birleşmez).
- *Geçiş sayılmaz*: tek terminalli sigorta, üç terminalli potansiyometre/şalter, motor/lamba/ikaz/röle/sensör/beyin/güç türleri, `ic` köprüsü taşıyan cihaz, hiçbir parçada ucu olmayan cihaz (yalnız `devam` hedefi, örn. `24F01`). `KB.veri.cihaz(db, kod).gecis` ve `CihazOzeti.gecis` söyler; `db.istatistik.gecis` sayar.
- *Şema süzgeci* (`opts.semalar`): bileşenin iki terminalinin ikisinde de süzgeçten geçen bir uç yoksa sanal kenar kurulmaz.
- *Kaynak*: sanal kenarın `kaynak`ı bileşen listesindeki yoldur (`sayfa 1 · yol 25`, satır yok); listede yoksa uçlarındaki parçaların yeri.
- *Düğümler*: iki terminal de gerçek cihaz düğümüdür (`cihaz, soket, pin, pinAdi`; pin `null` olabilir) ve `Dugum.gecisUcu: true` taşır; her biri tam bir sanal kenara bağlıdır. İsterseniz ikisini tek sembol olarak çizin (`kenar.bilesen`), isterseniz sanal kenarı "bileşen kutusu" kenarı yapın.
- *Dallanma*: terminalde kablolar ve sanal kenar buluşur (2 kablo + sanal = derece 3 = dal). Terminaldeki bütün gerçek parçalar (numaraları farklı olsa da) ize girer; bileşenden sonra numara değişir.
- *Metin*: iki terminal TEK öğedir: `… → X03.53 pin 4 → 01R02 (direnç) → X03.20 pin 3 → …`; pinliyse `01V01 (diyot) pin 2–1` (yolda önce gelen terminal önce); kısa adı varsa `Test şalteri (99S01, şalter) pin 13–14`.
- *Kollar*: `KB.izle.kollar` kolu `sanal` (ilk kenar sanal), `gecisler` (kolun altında geçilen bileşenler: `{ kod, tur, turAd, ad, kenar }`) ile işaretler; `karsiUc.gecisUcu` true olabilir.

**Cihaz içi köprü** (`Kenar.ic: true`; veride `ic: true`, örn. alternatör `01G02 D+ ↔ DF`): kablo grubu kurmaz (aramada, `db.istatistik.kablo`'da, `iz.sayilar.kablo`'da yok), cihaz pininde numaraya bakılmadan buluşur ve izde bağlantı olarak izlenir. Metin `99G01 pin DF →[cihaz içi]→ 99G01 pin D+` (köprüden sonra "önceki kablo" değişmez, ok etiketi yok); özellik satırı `etiketsiz · cihaz içi bağlantı (kablo değil)`. Cihaz sorgusunda kol `ic: true`.

**Kendine dönen parça** (`Kenar.kendineDonen: true`; iki ucu aynı soket-pin, örn. kesikli kutudaki körük soketi `X11.42/1` ve `/2`): iz yapısını bozmaz — derece, zincir, çevrim hesabına girmez; `Dugum.kendineDonen` (kenar id'leri) ve `Bilesen.kendineDonenKenarlar` ile taşınır. Normal kablodur (`ara("4201")` bulur). Metin: soket iki kez yazılmaz, düğümün sonuna parantez: `X11.42 pin 1 (kendine dönen kablo #4201, varyant)`. Cihaz/soket sorgusunda `PinSatiri.kendineDonen` (kol sayılmaz, ayrı verilir).

**Aynı soket içinde köprü** (`Kenar.soketIci: true`; örn. `4060`: 41A01 CANRS 9/5 ↔ CANLS 9/6, CAN sonlandırma): `ic` **değildir**; normal, numaralı, aranabilir kablo parçasıdır. Metin: `…soket 9 pin 5 (CANRS) →[aynı soket içinde köprü]→ …soket 9 pin 6 (CANLS)`.

**Sayfa içi devam** (`Dugum.sayfaIci: true`): `devam` ucunun `hedef`i yalnız yol numarasıdır (`"74"`, `"54"`; `#br` kabloları). Bağlanmaz; yaprak `devam` düğümü olarak kalır: `ad: 'devam → yol 74'`, metin `devam: yol 74 (aynı sayfada devam ediyor)`.

---

## 5. `KB.cihazSorgu` / `KB.soketSorgu`

```js
KB.cihazSorgu.cihaz(db, kod, { semalar })   // → CihazSorgusu | null     'FPS 3' gibi ad değil, cihaz kodu (normalize edilir)
KB.soketSorgu.soket(db, ad, { cihaz, semalar })  // → SoketSorgusu | null   ad: 'IV-18' ya da 'X99.1'; cihaz: yalnız o cihazın soketi
```
```js
CihazSorgusu = {
  tur:'cihaz', cihaz: CihazOzeti,              // { kod, kisaAd, adTr, adDe, cihazTur, cihazBilinmiyor, yol:{sema:[..]}, semalar:[..] }
  soketler: [ { soket:'IV-18'|null, pinSayisi:18|null, satirlar:[PinSatiri…] } ],   // soket doğal sırada; soketsiz uçlar (B+, 31) soket:null grubunda sonda
  satirSayisi: 9, kaynaklar:[Kaynak…], dogrulandi:false, dogrulanmamisSemalar:[..], supheli:false, uyarilar:[Uyari…]
}
SoketSorgusu = { tur:'soket', soket:'IV-18', eslesmeler:[ { cihaz: CihazOzeti|null, soket, ara:false, pinSayisi, satirlar:[PinSatiri…], kaynaklar:[…] } ],
                 dogrulandi, dogrulanmamisSemalar, supheli }      // aynı ad birçok cihazda olabilir (FPS 1–4'ün hepsinde IV-18) → birden çok eşleşme
PinSatiri = {
  soket, pin, pinAdi, belirsiz,                // pinAdi: bu pine bağlı uçlardan ilk dolu olan
  kablolar: [ {                                // bu pine bağlı her iletken kolu (çoğu zaman 1; dallanma/ara soketin iki yanı → birden çok)
      kenar: Kenar,                            // pine bağlı ilk kenar (etiket, renk, durum, suphe, kaynak …)
      karsiUc: Dugum,                          // kenarın öbür ucu
      varis: [Dugum…],                         // kolun altında ulaşılan uçlar: yapraklar + (devamı olsa bile) geçiş terminali olmayan cihaz pinleri + devam; birden çoksa dal
      ara: [Dugum…],                           // yoldaki ara soket, ek noktası ve geçiş bileşeni terminalleri
      dal: false,
      sanal: false, ic: false,                 // kolun ilk kenarı geçiş bileşeninin iç bağlantısı mı / cihaz içi köprü mü (kenar.sanal / kenar.ic ile aynı)
      gecisler: []                             // kolun altında geçilen bileşenler: [{ kod, tur, turAd, ad, kenar }]  (§4.9)
  } ],
  kendineDonen: [Kenar…],                      // bu pinde iki ucu da bu pin olan kablolar (kol değil; örn. X11.42/1 körük soketi)
  supheli, celiski, dogrulandi, uc: { cihaz, soket, pin } | { parca, uc }     // uc: KB.izle.uc(db, uc) ile tam iz
}
```
`kablolar[].kenar/karsiUc/varis/ara` içindeki `Dugum`/`Kenar` nesneleri o pinin kendi izinden alınır; **id'ler yalnız o satır içinde anlamlıdır**.
Pin sırası doğal (1, 2, … 10). Pini okunamayan uçlar (`?`) ve pini yazılmayanlar kendi satırında gelir (`pin: null` ya da `'1?'`).

---

## 6. `KB.metin` — düz metin

```js
KB.metin.ozet(iz, { maksSatir })   // → string   "Kablo 9999 · Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10) → X99.1 pin 4 → Sahte Beyin 1 (99A01) soket 15 pin 5 (NHB)"
KB.metin.satirlar(iz)              // → string[]  ozet'in satırları (dallanma ve çok bileşen satırlara bölünür)
KB.metin.dugum(dugum)              // → "Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10)"
KB.metin.kenar(kenar)              // → "9999 · beyaz (ws, şema notu) · 0,75 mm² (şema notu) · varyant · ŞÜPHELİ"   sanal: "01R02 (direnç) · geçiş bileşeni (kablo değil)"; ic: "etiketsiz · cihaz içi bağlantı (kablo değil)"
                                   //    sırayla ekler: aynı soket içinde köprü · kendine dönen · ŞÜPHELİ (büyük harf, İ = U+0130) · çelişki · not: … (parça notu; yalnız doğrulama sürümünde dolu, §9)
KB.metin.ozellikler(iz)            // → string[]  kenar başına bir satır (renk, kesit, varyant, not); sanal kenar satır üretmez
KB.metin.bilesen(kenar.bilesen)    // → "01R02 (direnç)" · "Test şalteri (99S01, şalter)"
KB.metin.kaynak(kaynak)            // → "Sahte 1 stromlaufplan.pdf · sayfa 1 · yol 24 · satır A · DOĞRULANMADI"
KB.metin.kaynaklar(iz)             // → string[]
KB.metin.uyarilar(iz)              // → string[]
KB.metin.tamMetin(iz)              // → string    ozet + özellikler + kaynaklar + uyarılar (kopyala/paylaş için)
```
Biçim kuralları:
- Cihaz ucu **her zaman** soket ve pin yazar: `soket IV-18 pin 10 (HS10)`. Soketsiz cihaz: `pin B+`. Okunamayan karakter `?` kalır ve düğümün sonuna `[şüpheli]` eklenir. Şemada hiç yazmıyorsa: `(soket/pin şemada yazılı değil)`.
- Ara soket `X99.1 pin 4`; ek noktası `ek noktası 99Z07` (kodsuzsa `ek noktası (kodsuz)`); çözülmeyen devam `devam → 99Q99 (başka şemada, verisi yok)`.
- Ok normalde ` → `. Kenarın etiketi başlıktaki kablodan farklıysa ya da kenar şüpheli/varyant ise ` →[kablo 9998]→ `, ` →[varyant]→ `.
- Dallanma: ana gövde bir satır, her dal altında girintili `dal 1: → …`. Birden çok bileşen: `parça 1: …`.
- Cihaz adı: `kisaAd (kod)`; kısa ad yoksa yalnız kod.
- Geçiş bileşeni iki terminaliyle tek öğe: `01V01 (diyot) pin 2–1`, `01R02 (direnç)`, `Test şalteri (99S01, şalter) pin 13–14`. Cihaz içi köprü ` →[cihaz içi]→ `; aynı soket içinde köprü ` →[aynı soket içinde köprü]→ `; kendine dönen kablo düğümün sonunda parantezle (`X11.42 pin 1 (kendine dönen kablo #4201, varyant)`); sayfa içi devam `devam: yol 74 (aynı sayfada devam ediyor)`.

---

## 7. `KB.renkler`

```js
KB.renkler.coz('sw/rt')   // → { kisaltma:'sw/rt', ad:'siyah-kırmızı', parcalar:[{kisaltma:'sw',ad:'siyah',taniniyor:true},{…'rt'…}], taniniyor:true }; null/'' → null
KB.renkler.ad('sw/rt')    // → 'siyah-kırmızı'  (tanınmayan kısaltma olduğu gibi döner)
KB.renkler.kesitMetni('2.5')   // → '2,5 mm²'
KB.renkler.TABLO          // ws beyaz · sw siyah · rt kırmızı · gn yeşil · ge sarı · bl mavi · br kahverengi · gr gri · li lila · or turuncu · rs pembe · vi mor
```
Şema varsayılanı (`db.semalar[id].varsayilan`) kablonun kendi değeri sayılmaz: `Kenar.renkSemaNotu` / `kesitSemaNotu` ile ayrılır.

## 8. `KB.oner` — "şunu mu demek istediniz"

```js
KB.oner.oner(db, sorgu, { sekme, n })   // → [{ tur:'cihaz'|'kablo'|'soket', deger:'99A01', ad:'Sahte Beyin 1'|null, sorgu:'99A01', uzaklik:0.4 }]  n varsayılan 5
```
Düzenleme uzaklığına göre (O/0, I/1, S/5, B/8, Z/2 karışıklığı ucuz). Sonuç bulunamayınca çağırın; `sorgu` alanı arama kutusuna yazılacak metindir.

---

## 9. `build.py` sözleşmesi (arayüz ve diyagram ajanları için)

```
python3 build.py [--veri veri] [--src src] [--cikti DOSYA] [--sessiz] [--kompakt] [--notlar]
```
### İki sürüm
| | **dağıtım** (varsayılan) | **doğrulama** (`--notlar`) |
|---|---|---|
| Kimin için | atölyedeki kullanıcılar | veriyi şema PDF'iyle karşılaştıran doğrulayıcı |
| Çıktı (`--cikti` verilmezse) | `dist/kablo-bulucu.html` | `dist/kablo-bulucu-dogrulama.html` |
| Gömülü `paket.meta.surum` → `db.meta.surum` | `"dagitim"` | `"dogrulama"` |
| Kablo parçası `not` | **gömülmez** | gömülür |
| Şemanın `celiskiler` listesi (Beyin Listesi farkları) | **gömülmez** | gömülür |
| `suphe` nesnesi | yalnız **`soru`** kalır (`A`/`B` okumaları, `kirpinti` yolu gider); `soru` yoksa nesne atılır, `durum:"suphe"` kalır | tamamı (`soru, A, B, kirpinti`) |
| Boyut (şu anki veri) | 401 KB | 408 KB |

Neden: `not`, `celiskiler` ve `suphe.{A,B,kirpinti}` geliştirici/doğrulama dilidir (okuma kararı kodları, Beyin Listesi bölüm numaraları, büyütme çözünürlüğü gibi doğrulama ayrıntıları); atölye ustaları Beyin Listesi'ni bilmez. Bunlar dağıtımda hiçbir yerde görünmemeli.
- **Çekirdek mantığı bu alanlara bağlı değildir** (zincir, birleştirme, `durum`/`supheli`, `dogrulandi`, çelişki, arama, cihaz/soket sorgusu iki sürümde aynı çıkar; sınandı). Dağıtımda yalnız şunlar boşalır: `Kenar.not` (→ `null`; `KB.metin` "not: …" parçası ve satırı yok), `Kenar.beyinListesi` (→ `[]`; arayüzdeki "BEYİN LİSTESİ FARKLI" rozeti çıkmaz) ve `iz.uyarilar`'daki `beyin-listesi` uyarıları. `Kenar.suphe` varsa yalnız `{ soru }` taşır; arayüz yalnız `suphe.soru`'yu kullanmalıdır.
- `veri/cihazlar.json` (yan ürün) her iki sürümde de **aynıdır** (tam veriden üretilir). Cihaz kayıtlarındaki `not` iki sürümde de gömülüdür; `CihazOzeti`'nde yoktur, hiçbir sorgu dışarı vermez.
- Arayüz için: doğrulama sürümünü ayırt etmek gerekiyorsa `db.meta.surum === 'dogrulama'` (ör. rozet/şerit gösterilebilir; arayüz bunu henüz kullanmıyor). `imza` iki sürümde farklıdır.

### Ortak kurallar
- Girdi: `veri/semalar.json` + her şema için `veri/<sema>.json` (dosyası olmayan şema **atlanır**, uyarılır) + `src/**`.
- Birleştirme sırası (her klasörde dosya adı sırasıyla): CSS `src/tokens.css` → `src/diyagram/*.css` → `src/arayuz/*.css`; JS `src/cekirdek/*.js` (`index.js` ve `_` ile başlayanlar hariç) → `src/diyagram/*.js` → `src/arayuz/*.js` → `src/baslat.js`. Dosyalar yoksa atlanır.
- Şablon `src/index.template.html` (yoksa yerleşik boş iskelet). Şablondaki **yer tutucular** (HTML yorumu, birebir):
  - `<!--KB:CSS-->` → `<style>…</style>`   (`<head>` içine)
  - `<!--KB:VERI-->` → `<script type="application/json" id="kb-veri">…</script>`   (JS'ten önce)
  - `<!--KB:JS-->` → `<script>…</script>`   (`</body>`'den hemen önce)
  - `<!--KB:IMZA-->` → veri imzası (düz metin, altbilgi için)
  Yer tutucu yoksa build uyarır ve CSS'i `</head>`'den, veri+JS'i `</body>`'den önce ekler. Şablonda `<meta charset="utf-8">` olmalıdır.
- Çıktı tek dosya: CSS/JS/veri satır içi; `</` ve `<!--` kaçırılır. Dış kaynak (`src=http…`, `url(http…)`, `@import`, `fetch`/XHR) varsa build **hata verir**. Boyut raporlanır (hedef 1 MB altı).
- Gömülü veriden (iki sürümde de) `goruldu`, `emin` ve `null` alanlar ayıklanır; `dogrulandi` olduğu gibi gömülür; `kaynakKlasor` (yerel yol) gömülmez.
- `--kompakt` (isteğe bağlı, boyut 1 MB'ı aşarsa): uygulamaca kayıpsız ek ayıklama (`varyant:false`, `durum:"eslesti"`, temiz parçaların uçlarındaki `ham`). İki sürümde aynı kuralla uygulanır.
- Yan ürün: `veri/cihazlar.json` (her şemadaki `cihazlar`ın birleşimi). Biçim: `{ "99A01": { kod, kisaAd, adTr, adDe, tur, semalar:[..], yol:{sema:[..]}, not? , celiski? } , … }` (kod doğal sırada; aynı kod iki şemada farklı alanla gelirse ilk dolu değer alınır, fark `celiski` listesine yazılır).
- Dağıtım derlemesi bir güvenlik denetimi yapar: gömülü veride parça `not`, `celiskiler` ya da `suphe` içinde `soru` dışı alan kalmışsa build **hata verir**.
- Tarayıcıda `window.KB` yalnız çekirdek modüllerini taşır; `KB.diyagram` ve arayüz kendi dosyalarında eklenir.

## 10. Sınırlar ve bilinenler
- `izle` varsayılan en çok 150 kenar toplar (`maksKenar`); aşılınca `sinirAsildi:true`, sınırdaki düğümler `kesik:true`. Metin özeti `maksSatir` (40) ile kısalır.
- Bir cihaz kodu hiçbir bileşen listesinde yoksa ama kabloda geçiyorsa `cihazBilinmiyor:true` (tür kod harfinden).
- Adı `X…` olan cihazlar (soket türü) hem Cihaz hem Soket grubunda görünebilir; ayıklama yapılmaz.
- Doğruluk bayrakları şema düzeyindedir: `dogrulandi` kablo düzeyine inmez.
- `dugum` ucu her zaman elektriksel birleşim sayılır. Veride elektriksel bağ olmayan bir "ek noktası" varsa (kapi-1'deki kalın demet çubuğu `~d1`: `1sw/rt` CANHS ile `1ws/li` CANLS aynı demetin iki teli) iz bu iki teli bağlıymış gibi gösterir; çekirdek bunu veriden ayıramaz (ayrı bir işaret yok). Çözüm veri tarafında: teller `devam` ucuna bağlanmalı ya da düğüm ucuna bir "demet" işareti eklenmeli.
- Etiketsiz parçanın `devam` ucu şemalar arasında eşleşmez (numara yok); etiketli parçanın etiketsiz dalı da dahil (bölüm 11.2, 11.3).

## 11. Birleştirme kararları (VERI-MODELI §4'ün uygulaması)
1. **Uç anahtarı:** cihaz ucu = (cihaz, soket, pin); ara soket = (soket, pin); ek noktası = kod (`~d1` gibi yerel adlar **şemaya özel**, gerçek kodlar araç geneli). Cihaz ve soket adı `norm()` ile, **pin `pin()` ile** kurulur (§2): tire ve artı korunur, yani aynı cihazın `B-`, `B` ve `B+` pinleri **ayrı düğümdür** (aynı numaralı kablolar birleşip dal kurmaz). Çelişki pin başınadır: `B-` pininde 7993, `B` pininde 7994 varsa çelişki yoktur; ama `B-` pininde 7992 ile 7993 birlikte duruyorsa o pin için §4.7(1) çelişkisi vardır (7992 öbür pinde de olsa). **Pini ya da soketi yazılmayan veya `?` içeren uçlar hiçbir şeyle birleşmez** (yanlış birleştirme yerine ayrı düğüm).
2. **Cihaz pininde** yalnız **aynı grup anahtarlı** (aynı `no`; numarasızsa aynı etiket) parçalar buluşur. Farklı numara → çelişki uyarısı, birleşme yok. **Ek:** etiketli bir parçanın cihaz pinindeki **etiketsiz** parça onun dalıdır (şemada etiket pin başına bir kez yazılır: `04A03 HS10`'da `4002 → X08.11/1` ve etiketsiz `→ 42A01`); **tersi yok** — etiketsiz parça kendi öbür ucundaki cihaz pininde etiketli parça çekmez, iki etiketsiz parça da pinde buluşmaz (iz kablo ağına dönüşmesin). Bu pindeki başka kablolar `Dugum.digerKablolar`'da kalır. **Ara soket pininde ve ek noktasında** numaraya bakılmaz (zincir sürer). **Cihaz içi köprü** (`ic`) cihaz pininde numarasız buluşur.
3. **`devam` çözümü:** ok `cihaz` gösteriyorsa, aynı numaralı başka bir parçanın o cihazdaki **tek** ucuna bağlanır; `hedef` ("2/27") gösteriyorsa aynı numaralı ve o sayfa/yoldaki parçanın `devam` ucuyla birleşir. Birden çok aday → bağlanmaz, `belirsiz-devam` uyarısı. Çözülen iki `devam` ucu tek eklem olur ve eklem düğümü gösterilmez (iki parça tek kenarda birleşir, iki kaynağı da taşır). `hedef` yalnız yol numarasıysa ("74") hiçbir şeye bağlanmaz (`sayfaIci`, §4.9). Etiketsiz parçanın `devam` ucu şemalar arası eşleşmez (numarası yok).
4. **Paralel parçalar:** aynı iki düğümü bağlayan, aynı numaralı parçalar (ör. aynı iletkenin iki sayfada çizimi) tek kenarda birleşir; kaynakları toplanır.
5. **Çelişki** tanımı bölüm 4.7. Aynı numaranın iki şemada çelişkisi `celiski:true` ile işaretlenir, veri değiştirilmez.
6. **Geçiş bileşenleri** (§4.9): sigorta/diyot/direnç/şalter, tam iki terminal → iz sanal kenarla geçer; terminalde bulunan bütün gerçek parçalar numaralarına bakılmadan ize girer.
7. **`ic`, kendine dönen, soket içi köprü** (§4.9): `ic` kablo grubu kurmaz; iki ucu aynı soket-pin olan parça yapıya girmez (`kendineDonen`); aynı soketin iki pini arasındaki numaralı parça normal kablodur (`soketIci`).
8. **Kablo etiketi:** numaralıda `isaret + no` (`#4002`); numarasızda şemada yazan etiketin kendisi (`#br`, `1sw/rt`, `70sw`).

## 12. Örnekler (gerçek çıktı)

<!--ORNEKLER-->
Aşağıdaki çıktılar koddan alınmıştır (sahte veri: `99A01`, `9999` …; gerçek veri değildir). Uzun alanlar `…` ile kısaltıldı.

**Arama** — `KB.ara.ara(db, '9999')`
```js
{ sorgu:'9999', anahtar:'9999', gruplar:['kablo'], sayilar:{ cihaz:0, soket:0, kablo:1 }, kablo:[
  { tur:'kablo', eslesme:'tam', anahtar:'9999', no:'9999', etiket:'9999', parcaSayisi:2,
    cihazlar:[ { kod:'99A01', kisaAd:'Sahte Beyin 1' }, { kod:'99A02', kisaAd:'Sahte FPS 2' } ],
    semalar:['sahte-1'], supheli:false, dogrulandi:false } ], … }
```

**Metin özetleri** — `KB.metin.satirlar(KB.izle.kablo(db, anahtar))`
```
Kablo 9999 · Sahte Beyin 1 (99A01) soket 15 pin 5 (NHB) → X99.1 pin 4 → Sahte FPS 2 (99A02) soket IV-18 pin 10 (HS10)
Kablo 9050 · 99M01 pin 1 →[kablo 9051]→ X97.1 pin 2 →[kablo 9050]→ Sahte FPS 3 (99A03) soket IV-18 pin 3 (LO3)
Kablo 9100 · 99E01 pin 2 → ek noktası 99Z07, 2 dal
  dal 1: → Sahte Beyin 1 (99A01) soket 15 pin 7 (LI1)
  dal 2: → 99S01 pin 1
Kablo 9500 · Sahte Beyin 1 (99A01) soket 15 pin 16 → devam: 99Q99 (başka şemada, verisi yok)
Kablo 9010 · 99B01 soket 3 pin 6 → Sahte Beyin 1 (99A01) soket 15 pin 20 [çelişki]
```

**Düğüm ve kenar** — kablo 9030, `iz.dugumler[0]` ve `iz.kenarlar[0]`
```js
{ id:'n1', tur:'cihaz', ad:'99B01', cihaz:'99B01', cihazTur:'sensor', kisaAd:null, adTr:null, adDe:'Sensor Test 1', cihazBilinmiyor:false,
  soket:'3', pin:'7', pinAdi:null, adresEksik:false, gecisUcu:false, belirsiz:false, derece:1, yaprak:true, dal:false, acik:false, kesik:false,
  celiski:false, digerKablolar:[], kenarlar:['e1'], kendineDonen:[], ham:['3/7'],
  kaynaklar:[ { sema:'sahte-1', sayfa:1, yol:'24', satir:'C', izgara:'sayfa 1 · yol 24 · satır C', dogrulandi:false, parca:'k026', … },
              { sema:'sahte-2', sayfa:2, yol:'28', satir:'A', … } ] }
{ id:'e1', a:'n1', b:'n2', etiket:'9030', etiketler:['9030'], no:'9030', isaret:null,
  renk:'ws', renkAd:'beyaz', renkParcalari:[ { kisaltma:'ws', ad:'beyaz', taniniyor:true } ], renkSemaNotu:true,
  kesit:'0.75', kesitMetni:'0,75 mm²', kesitSemaNotu:true, varyant:false, durum:'eslesti', suphe:null, supheli:false, not:null,
  kaynak:{ sema:'sahte-1', sayfa:1, yol:'24', satir:'C', … }, kaynaklar:[ …2 kaynak… ], parcalar:['sahte-1:k026','sahte-2:k103'],
  dogrulandi:false, celiski:false, beyinListesi:[], geri:false, sanal:false, bilesen:null, ic:false, kendineDonen:false, soketIci:false }
```

**Geçiş bileşeni** — `KB.izle.kablo(db, '8101')` (99S01 = iki pinli şalter)
```js
{ baslik:'Kablo 8101', sayilar:{ kablo:2, sanal:1, ic:0, kendineDonen:0 },
  bilesenler:[ { id:'b1', baslangic:'n1', zincir:['n1','n2','n3','n4'], zincirKenarlar:['e1','e2','e3'], kendineDonenKenarlar:[], dal:false, dongu:false } ],
  dugumler:[
    { id:'n1', tur:'cihaz', ad:'Sahte Beyin 1 (99A01)', soket:'15', pin:'1',  pinAdi:'EIN1', gecisUcu:false, kenarlar:['e1'] },
    { id:'n2', tur:'cihaz', ad:'Test şalteri (99S01)',  soket:null, pin:'13', pinAdi:null,   gecisUcu:true,  kenarlar:['e1','e2'] },
    { id:'n3', tur:'cihaz', ad:'Test şalteri (99S01)',  soket:null, pin:'14', pinAdi:null,   gecisUcu:true,  kenarlar:['e2','e3'] },
    { id:'n4', tur:'cihaz', ad:'Sahte FPS 2 (99A02)',   soket:'IV-18', pin:'2', pinAdi:'LO2', gecisUcu:false, kenarlar:['e3'] } ],
  kenarlar:[
    { id:'e1', a:'n1', b:'n2', etiket:'8101', renk:'ws', sanal:false, bilesen:null, kaynak:'sayfa 1 · yol 25 · satır A' },
    { id:'e2', a:'n2', b:'n3', etiket:null,   renk:null, sanal:true,
      bilesen:{ kod:'99S01', tur:'salter', turAd:'şalter', ad:'Test şalteri (99S01)', kisaAd:'Test şalteri', … }, kaynak:'sayfa 1 · yol 25' },
    { id:'e3', a:'n3', b:'n4', etiket:'8102', renk:'ws', sanal:false, bilesen:null, kaynak:'sayfa 1 · yol 25 · satır B' } ], … }
```
```
Kablo 8101 · Sahte Beyin 1 (99A01) soket 15 pin 1 (EIN1) → Test şalteri (99S01, şalter) pin 13–14 →[kablo 8102]→ Sahte FPS 2 (99A02) soket IV-18 pin 2 (LO2)
KB.metin.kenar(e2)  →  Test şalteri (99S01, şalter) · geçiş bileşeni (kablo değil)
```
`KB.izle.kollar(KB.izle.uc(db, { cihaz:'99S01', soket:null, pin:'13' }))` (özet):
```js
[ { kenar:'8101',        karsiUc:'Sahte Beyin 1 (99A01) pin 1', varis:['Sahte Beyin 1 (99A01) pin 1'], ara:[], dal:false, sanal:false, ic:false, gecisler:[] },
  { kenar:'sanal:99S01', karsiUc:'Test şalteri (99S01) pin 14', varis:['Sahte FPS 2 (99A02) pin 2'],   ara:['Test şalteri (99S01)'], dal:false, sanal:true, ic:false,
    gecisler:[ { kod:'99S01', tur:'salter', turAd:'şalter', ad:'Test şalteri (99S01)', kenar:'e2' } ] } ]
```

**Uzun geçiş zinciri** (sigorta + diyot + direnç + ek noktası + cihaz içi köprü; `KB.izle.kablo(db, '8001')`, `sayilar: { kablo:11, sanal:3, ic:1, kendineDonen:0 }`)
```
Kablo 8001 · 99G01 pin DF →[cihaz içi]→ 99G01 pin D+ →[kablo 8003]→ X98.3 pin 3 →[kablo etiketsiz]→ ek noktası (kodsuz), 2 dal
  dal 1: → Sahte FPS 2 (99A02) soket IV-18 pin 6 (HI3)
  dal 2: → 99R01 (direnç) → X98.2 pin 4, 2 dal
    dal 2.1: →[kablo 8002]→ X98.1 pin 3 →[kablo etiketsiz]→ 99V01 (diyot) pin 2–1 → X98.1 pin 4 →[kablo 8001]→ 99F09 (sigorta) pin 2–1 →[kablo #8901]→ 99X09 pin 30
    dal 2.2: → X98.2 pin 3 (öbür taraf şemada yok)
```

**Kendine dönen, aynı soket içinde köprü, sayfa içi devam, etiketsiz dal**
```
Kablo 8401 · Sahte Beyin 1 (99A01) soket 15 pin 5 (EIN5) → X98.4 pin 1 (kendine dönen kablo #8402, varyant) →[kablo 8403]→ Sahte FPS 2 (99A02) soket IV-18 pin 7
Kablo 8950 · Sahte Beyin 1 (99A01) soket 9 pin 5 (CANRS) →[aynı soket içinde köprü]→ Sahte Beyin 1 (99A01) soket 9 pin 6 (CANLS)
Kablo #gn · parça 1: Sahte FPS 2 (99A02) soket IV-18 pin 13 → devam: yol 74 (aynı sayfada devam ediyor)
Kablo #gn · parça 2: Sahte Beyin 1 (99A01) soket 15 pin 8 → devam: yol 54 (aynı sayfada devam ediyor)
Kablo 8960 · Sahte Beyin 1 (99A01) soket 15 pin 16 →[kablo 8961]→ X98.7 pin 1 →[kablo 8960]→ Sahte FPS 2 (99A02) soket IV-18 pin 14 (HS14) →[kablo etiketsiz]→ devam: 99Q77 (başka şemada, verisi yok)
```
Soket sorgusu satırı (`KB.soketSorgu.soket(db, 'X98.4')`, pin 1; özet): `{ soket:'X98.4', pin:'1', kablolar:[ …8401 kolu…, …8403 kolu… ], kendineDonen:[ { etiket:'#8402', varyant:true, kendineDonen:true, … } ] }`

**Cihaz sorgusu satırı** — `KB.cihazSorgu.cihaz(db, '99A02').soketler[0].satirlar[0]` (kısaltılmış)
```js
{ soket:'IV-18', pin:'10', pinAdi:'HS10', belirsiz:false,
  kablolar:[ { kenar:{ id:'e1', a:'n1', b:'n2', etiket:'9999', renk:'ws', renkSemaNotu:true, … sanal:false, ic:false, kendineDonen:false, soketIci:false },
               karsiUc:{ id:'n2', tur:'soket', ad:'X99.1', soket:'X99.1', pin:'4', derece:2, … },
               varis:[ { id:'n3', tur:'cihaz', ad:'Sahte Beyin 1 (99A01)', cihaz:'99A01', soket:'15', pin:'5', pinAdi:'NHB', yaprak:true, … } ],
               ara:[ { id:'n2', tur:'soket', ad:'X99.1', … } ], dal:false, sanal:false, ic:false, gecisler:[] } ],
  kendineDonen:[], supheli:false, celiski:false, dogrulandi:false, uc:{ cihaz:'99A02', soket:'IV-18', pin:'10' } }
```
<!--/ORNEKLER-->
