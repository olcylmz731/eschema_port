# Test raporu — 1. tur (çekirdek: Node birim testleri ve veri testleri)

Tarih: 2026-10-14 · Node v22.23.2 · tarayıcı testleri bu turda **yok** (2. turda).

## Komutlar

```
node --test test/birim/                      # Node birim + gerçek veri testleri (tek komut, ~9 sn, bağımlılıksız)
node --test test/birim/zincir.test.mjs       # tek dosya
node --test --test-name-pattern="B- " test/birim/zincir.test.mjs test/birim/normalize.test.mjs   # tek bulgunun testleri
TMPDIR=.gecici/test python3 -I araclar/test_araclar.py   # Python araçları (resmî koşucuya dahil DEĞİL)
KB_CEKIRDEK=<klasör> node --test test/birim/ # testleri başka bir çekirdek kopyasına karşı koştur (mutasyon denemesi)
node test/tarayici/hepsi.mjs                 # tarayıcı testleri: 2. turda yazılacak, şimdi yok
```

Not: Node 22 `node --test <dizin>` komutunda dizini dosya sanıp çöker. `test/birim/index.js` (CJS) bu yüzden vardır: aynı dizindeki bütün `*.test.mjs` dosyalarını içe aktarır, testler tek süreçte koşar. Bu dosyayı silmeyin; `package.json` içinde `"type":"module"` olursa `index.js` yeniden adlandırılmalı. Çıplak `node --test` (argümansız) `test/` altındaki bütün `.js/.mjs` dosyalarını koşturur, kullanmayın. (Node 20 ve öncesi dizini özyinelemeli tarar; orada testler iki kez koşabilir. Hedef sürüm Node 22.)

Bulunan hatalar yüzünden `node --test test/birim/` şu an **çıkış kodu 1** verir; bu bilerek böyledir (aşağıdaki başarısız testler bulgudur, gevşetilmedi).

## Sonuç

| Çalıştırma | Test | Geçen | Kalan |
|---|---:|---:|---:|
| `node --test test/birim/` (toplam) | **254** | **248** | **6** |
| normalize.test.mjs | 18 | 17 | 1 |
| arama.test.mjs | 30 | 30 | 0 |
| zincir.test.mjs | 53 | 49 | 4 |
| birlestirme.test.mjs | 33 | 33 | 0 |
| metin.test.mjs | 35 | 34 | 1 |
| oner.test.mjs | 12 | 12 | 0 |
| cihaz-soket.test.mjs | 21 | 21 | 0 |
| renk-kenar.test.mjs | 14 | 14 | 0 |
| rastgele.test.mjs | 2 | 2 | 0 |
| es2017.test.mjs | 12 | 12 | 0 |
| gercek-veri.test.mjs | 24 | 24 | 0 |
| `araclar/test_araclar.py` (Python, ayrı) | 8 | 8 | 0 |
| Tarayıcı testleri | — | — | 2. turda |

Kalan 6 testin 4'ü aynı hataya (Bulgu 1), 1'i Bulgu 2'ye, 1'i Bulgu 3'e aittir.

**Testlerin gücü (mutasyon denemesi):** çekirdeğin kopyası 57 farklı biçimde bilerek bozuldu (`.gecici/test/mutasyon.mjs`; `src/` hiç değişmedi) ve her bozuk sürüme karşı paket koşturuldu: **54'ü yakalandı** (hepsi adı belli bir testle), **3'ü kaçtı**: ikisi eşdeğer mutant (`İ`/`ı` elle dönüşümünü silmek sonucu değiştirmiyor, çünkü `normalize('NFD')` + `toUpperCase()` aynı işi görüyor), biri belgelenmemiş davranış (kısa ad içinde aramanın 3 karakter eşiği; testle sabitlenmedi). Bozulan alanlar: normalizasyon, arama sırası/gruplar/limit/sekme, uç anahtarları (pin, soket, ek noktası, yerel `~d1`), cihaz pininde numara kuralı, etiketsiz dal kuralı, `devam` çözümü, geçiş bileşenleri, `ic`, `kendineDonen`, `soketIci`, metin biçimleri, `oner`, soket/pin sıralamaları, ES2017 ihlali.

## Tarayıcı testleri

**2. turda yazılacak** (arayüz bitince): `test/tarayici/*.mjs` ve tek giriş `node test/tarayici/hepsi.mjs`. Bu turda yok, yukarıdaki sayılara dahil değil. Planlanan sınamalar: her şemadan rastgele 10 kablo arayüzden aranınca doğru uçlar, ağ isteği sıfır, `file://` ile açılış, konsolda hata yok, dosya boyutu < 1 MB, 360 px'te yatay taşma yok, `localStorage` kapalıyken açılış.

## Bulgular (başarısız testler) — en ağırdan

### Bulgu 1 (orta; şimdilik gizli): `B-` ile `B` (ve `D-` ile `D`) aynı pin sayılıyor

- **Belirti:** `KB.normalize.norm('B-')` → `'B'`, `norm('B')` → `'B'`. Uç anahtarında pin `norm(pin)` ile kurulduğundan (`src/cekirdek/veri.js` satır 66: `'C|' + norm(u.cihaz) + '|' + norm(u.soket || '') + '|' + norm(u.pin)`; benzer şekilde satır 70 ve 507) aynı cihazın `B-` ve `B` pinleri tek düğüme birleşir.
- **Etki:** aynı numaralı iki kablo (biri `B-`, biri `B` pininde) tek zincir kurar (7992 izi: beklenen 2 bileşen, gerçek 1); farklı numaralılarda sahte `celiski:true` + `digerKablolar`; `B-` pin sorgusunun izine `B` pininin kablosu karışır.
- **Gerçek veride şimdilik görünmez:** alternatörde pinler `B+`, `B-`, `D+`, `DF`, `W`; düz `B`/`D` yok (iki şemada 165 uç anahtarından 0'ı çakışıyor). Bu yüzden gerçek veri testleri geçiyor. Düz `B`/`D` ya da `31-1` / `31` gibi pinleri olan bir şema eklenince patlar. `+` işareti korunuyor (`B+` ≠ `B`), yalnız tire atılıyor.
- **Yeniden üretme:** `node --test --test-name-pattern="B- " test/birim/zincir.test.mjs test/birim/normalize.test.mjs` → şu 4 test kalır (2 geçer): "B- ile B karışmamalı (norm düzeyi)", "B- ile B aynı cihazın farklı pinleridir…", "B- ile B: farklı numaralı kablolar çelişki yaratmaz…", "B- pin sorgusu B pininin kablosunu getirmez". Elle: aynı cihaza (`soket:null`) iki kablo parçası ver: `pin:'B-'` ile `pin:'B'`, ikisi de `no:'7992'`; `KB.izle.kablo(db,'7992').bilesenler.length` 1 çıkar (2 olmalı).
- **Öneri (çekirdek ajanına):** tireyi yalnız soket adlarında (`IV-18` → `IV18`) at; pinde yalnız boşluk at, büyük harfe çevir (`B-` korunur).

### Bulgu 2 (düşük): `Dugum.kenarlar` kendine dönen kenarı da listeliyor

- API.md §4.4: `kenarlar: // bağlı kenar id'leri (kendine dönen kenarlar hariç; derece de onları saymaz)`. Gerçekte `derece` doğru (2) ama `kenarlar` kendine dönen kenarı da içeriyor.
- **Gerçek veride:** `KB.izle.kablo(db,'0001')`, düğüm `X11.42/1`: `derece: 2`, `kenarlar: ['e2','e3','e4']`, `kendineDonen: ['e4']`.
- Arayüz `kenarlar.length`'i derece sanırsa 3 görür (yıldız/dal kararı yanlış olabilir). Kendi `derece`/`dal`/`yaprak` alanları doğru.
- **Yeniden üretme:** `node --test --test-name-pattern="sözleşme: Dugum.kenarlar" test/birim/zincir.test.mjs`.
- Düzeltme ya kodda (listeden çıkar) ya da API.md'de (listede kalır ve `kendineDonen` ile süzülür) olabilir; yönetici seçsin.

### Bulgu 3 (çok düşük; belge/kod uyuşmazlığı): `KB.metin.kenar` "şüpheli" küçük harf yazıyor

- API.md §6: `… · varyant · ŞÜPHELİ`. Gerçek çıktı: `7952 · beyaz (ws, şema notu) · 0,75 mm² (şema notu) · varyant · şüpheli` (`metin.js` içindeki açıklama satırı da küçük harfli).
- **Yeniden üretme:** `node --test --test-name-pattern="varyant ve şüpheli sırası" test/birim/metin.test.mjs`.
- Hangisinin doğru olduğu yöneticinin kararı (düğüm metninde `[şüpheli]` küçük harfli; iz başlığındaki etiket `ŞÜPHELİ`).

## Gözlemler (hata saymadım; testler buna göre yazıldı)

1. `Sonuc.anahtar`, `#4002` sorgusunda `#4002` kalır (norm yalnız boşluk/tire atar). Kablo arama sonucu etkilenmez; sonuç `4002` ile aynıdır.
2. Cihaz **kısa adı içinde** arama en az 3 karakter ister (2 karakterlik `61`, "Modul 61A" kısa adını bulmaz). API.md yalnız `adDe` için "≥4 harf" diyor; kısa ad için eşik yazmıyor. Testle sabitlenmedi.
3. `KB.metin.ozellikler` özdeş satırları teke indiriyor (iki kenar aynı numara/renk/kesitse tek satır); `kaynaklar` aynı (şema, sayfa, yol, satır) için tek kayıt. Belgede yok, makul görünüyor.
4. API.md §6 çözülmeyen devam için `devam → 99Q99 (…)`, §12 örneği `devam: 99Q99 (…)` diyor; gerçek çıktı ikincisi. Test ikisini de kabul ediyor.
5. `opts.semalar` ile süzülmüş izde çelişki bayrağı ve uyarısı, çelişkinin öbür yarısı süzgeç dışı kalsa da korunuyor (8020 örneği). API.md net değil; testle sabitlenmedi.
6. `Bilesen.kenarlar` kendine dönen kenarları içermiyor (yalnız `kendineDonenKenarlar`'da). API.md net değil; testler iki biçime de dayanıklı.
7. Aynı cihaz pininde farklı numaralı iki kablo aynı izde buluşursa (ör. biri ara soket yoluyla gelmişse) tek düğüm olarak çizilir ve `celiski:true` taşır (API.md §4.4/§4.7 ile uyumlu); izin başka yerinden "geçilmez" kuralı yalnız ize hangi parçaların gireceğini belirler.
8. `KB.cihazSorgu.cihaz(..).cihaz.yol/semalar` gibi iç diziler `db` ile paylaşılıyor (API.md §0 buna izin veriyor: "db iç kayıtlarını paylaşabilir"). Arayüz bu dizileri **değiştirmemeli**; üst düzey nesne her çağrıda yenidir (testle doğrulandı).
9. Çelişki (`celiski`) çözümü sağlam görünüyor: gerçek veride `4060` (aynı soket içinde köprü) ve `41A01 9/6` pininde `1ws/li` + `4060` birlikteliği çelişki sayılmıyor.

## Kapsam

Yazılan testler (sentetik olanlar uydurma kodlarla: `71A01`, `7001` …; beklenenler elle yazıldı, uygulama çıktısından türetilmedi):

- **normalize:** `61a01`=`61A01`, boşluk/tire türleri, `X08. 11`=`X08.11`, Türkçe `ı/İ` (tr_TR ortamında alt süreçle de), aksan, virgül, `#`, boş girdi, `dogal` sıralama değişmezleri, `B+`/`B-`/`B` ayrımı.
- **arama:** tam→önek→ad sırası (veri sırası ters olsa da), tür gruplama ve `gruplar` sırası (tam>önek>ad; eşitte cihaz<soket<kablo), sekme süzgeci (öğenin `semalar`'ı daralmaz), boş sorgu ve boş sorgu+sekme (= `liste`), `limit`/`kesildi`/`sayilar`, `#4002`=`4002`, `2,5-9700`, numarasız `70sw` / `1sw/rt` / `1ws/li`, `X99.1/4` ve `IV-18/10` pin yazımı, bayraklar (`dogrulandi`, `supheli`), özel karakter ve çok uzun sorgu.
- **zincir:** ara soketli zincir ve yön kuralı, `baslangic`, numaranın ara soketten sonra değişmesi, açık uç, pin sorgusu (`cihaz`, `soket`, `dugum`, `parca` biçimleri; odak), ek noktasında ve cihaz pininde dal (yıldız), cihaz pininde ikili = zincir ortası, çevrim (kuyruklu/kuyruksuz), `devam` (çözülmeyen, iki şemada çözülen, numara değiştikten sonra başka şemada çözülen, `2/20`↔`3/27` hedefi, uyuşmayan hedef, belirsiz devam, sayfa içi `"74"`), pin adsız ve `?` uçların birleşmemesi, geçiş bileşenleri (direnç/diyot/sigorta/iki uçlu şalter geçer; 3 uçlu şalter, motor, lamba, röle, tek uçlu sigorta geçmez; pin adsız iki uçlu direnç; terminalde dal; şema süzgeci), `ic` (kablo sayılmaz, izlenir), `kendineDonen`, `soketIci`, paralel parça, `maksKenar`, etiketsiz dal kuralı ve tersi, `B-`/`B` pinleri, numarasız kablo, çıktı nesnelerinin yenilenmesi. **Her iz ayrıca yapısal değişmez denetçisinden geçer** (`degismezler.mjs`: kimlik benzersizliği, derece/yaprak/dal tutarlılığı, bileşen bölünmesi, ağaç/zincir/yıldız/geri kenar tutarlılığı, sayılar, düz JSON).
- **birlestirme:** aynı numara iki şemada (tutarlı), çelişki 1 (cihaz pininde farklı numara), çelişki 2 (şemalar ayrı iki pin; aynı şema iki pin çelişki değil), `KB.veri.celiskiler`, Beyin Listesi çelişkisi, doğrulama bayrakları, şüphe/çözüldü/en kötü durum, kaynak sırası ve alanları, `~d1` şemaya özel / gerçek kodlu ek noktası araç geneli, ara soket araç geneli, yazım farklarının (`X08. 11`, `iv 18`, `84a01`, `84z07`) birleşmeyi bozmaması, şema süzgeci, bağlantısız aynı numara, numarasız etiket iki şemada, cihaz bilgisi birleşmesi ve `cihazBilinmiyor`, yükleme (sekme/eksik şema, dizi veri, bozuk kayıt, boş şema, `ic-uc` uyarısı, `temizle`).
- **metin:** her cihaz ucunda soket+pin, kısa adlı/adsız cihaz, soketsiz uç, `?` + `[şüpheli]`, adres yok, ok etiketleri (`[kablo N]`, `[varyant]`, `[çelişki]`), dal biçimi, `parça N:`, devam biçimleri, geçiş bileşeni tek öğe (`pin 2–1`), `[cihaz içi]`, `[aynı soket içinde köprü]`, kendine dönen, `kenar`/`ozellikler`/`kaynak`/`kaynaklar`/`uyarilar`/`tamMetin`/`maksSatir`, tüm izlerde ortak özellikler.
- **oner:** O/0, I/1, S/5, B/8, Z/2 karışıklığı (cihaz, kablo, soket), sıradan hatadan ucuz olması, eksik/fazla karakter, sıralama, `n`, sekme, boş/alakasız/özel karakter girdisi.
- **cihaz-soket:** doğal soket ve pin sırası, kol alanları (`karsiUc`, `varis`, `ara`, `dal`, `sanal`, `ic`, `gecisler`), `KB.izle.kollar`, `?` ve adressiz uç satırları, her satırın `uc` alanının `izle.uc` ile çalışması, soketsiz güç cihazı, cihaz içi köprü, geçiş bileşeni cihazı, `IV-18` birden çok cihazda, ara soket (iki yan), kendine dönen, `soketSayisi`/`pinSayisi`/`bagliPinSayisi`.
- **renk-kenar:** `KB.renkler` (12 renk, iki renkli, tanınmayan, boş, kesit metni), `Kenar` renk/kesit/şema notu ayrımı, `#`, varyant, not, `varsayilan:null`, `Dugum.ad` / `ham` / cihaz alanları, `hedefCihazAd`.
- **rastgele:** (1) 400 rastgele sade veri kümesinde iz, API.md §11 kurallarından yazılmış bağımsız bir referansla karşılaştırılır (düğümler, kenarlar, bileşen sayısı; dallı/çevrimli/çok bileşenli örnekler zorunlu); (2) 250 zengin rastgele küme (devam, geçiş, ic, kendine dönen, etiketsiz, `?`, çok şema, bozuk id'ler …): çökme yok, her iz değişmezleri sağlıyor, arama/metin/cihaz/soket sorguları tutarlı. Hata mesajı tohumu ve veriyi verir.
- **es2017:** `src/cekirdek/*.js` içinde `?.`, `??`, `catch {}`, nesne yayılımı, BigInt, `flatMap`, `replaceAll` vb. ES2018+ sözdizimi/API yok; görünmez denetim karakteri / BOM yok. (Basit statik tarayıcı; kendi kendini de sınar.)
- **gercek-veri** (`veri/alternator-mars.json`, `veri/kapi-1.json`; beklenenler veri dosyasından): yükleme/dizinleme/uyarılar, cihaz bilgileri, her cihazın aranması ve pin satırlarının izlenmesi, **her şemadan rastgele 10 kablo** (sabit tohum; arama + iz uçlarının, kaynağın, metnin veri dosyasıyla örtüşmesi), tüm kabloların izlenmesi, `1084→24F01` kesintisiz yol (direnç ve diyot üzerinden), `4002` izinde `HS10→42A01` dalı, `41A01` soketleri 9/15/18 ve pin sayıları, `4060`, `1sw/rt` ile `1ws/li` ayrı, alternatör pinleri, kendine dönen `X11.42`, sekme süzgeci ve liste, doğrulanmadı bildirimi, temizlenmiş paket = ham yükleme.

## Kapsam dışı / yapılmadı

- **Tarayıcı testleri** (`test/tarayici/`): 2. turda (ağ isteği sıfır, `file://`, konsol hatası, dosya boyutu, 360 px taşma, `localStorage` kapalı, arayüzden rastgele 10 kablo). 2. tur için notlar: `python3 build.py` önce çalıştırılmalı; es2017 taraması `src/diyagram`, `src/arayuz`, `src/baslat.js` için de genişletilebilir.
- `build.py` çıktısı (`dist/kablo-bulucu.html`) bu turda sınanmadı: build `veri/cihazlar.json` yazdığı için birim testi bunu çalıştırmaz. Gömme biçimi `KB.veri.temizle` ile eşdeğer olarak sınandı (sentetik ve gerçek veri).
- Yalnız 2 şemanın verisi var (`alternator-mars`, `kapi-1`); `semalar.json`'daki öbür 10 şema için dosya yok. "Her şemadan 10 kablo" bu 2 şema için koşuyor; yeni veri gelince testler otomatik genişler (`veri/semalar.json` ve dosya varlığından okur).
- Diyagram çizimi, arayüz, kopyalama/paylaşma düğmeleri: bu turun işi değil.
- Performans yalnız kaba sınırlarla sınandı (yükleme < 2 sn, bütün kabloların izi < 5 sn).

## Dosyalar

```
test/birim/index.js              # `node --test test/birim/` giriş noktası (Node 22 dizin sorunu)
test/birim/yardimci.mjs          # çekirdeği yükler (KB_CEKIRDEK ile değiştirilebilir); sentetik veri kurucuları (C, S, D, V, K, cz, sema, yukle)
test/birim/degismezler.mjs       # Iz için yapısal değişmez denetçisi + düz JSON denetçisi
test/birim/*.test.mjs            # 11 test dosyası
test/TEST-RAPORU.md              # bu dosya
.gecici/test/                    # ilerleme notları, keşif betikleri, mutasyon.mjs (resmî değil)
```
