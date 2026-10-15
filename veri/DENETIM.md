# Veri denetimi

Bu dosya `python3 -I araclar/denetle.py` ile her çalıştırmada baştan üretilir; elle düzenlenmez. Denetim veriyi **düzeltmez**: sorunu buraya yazar, düzeltme uzlaştırıcıya gider.

**Toplam: 0 hata · 32 uyarı · 8 bilgi** (2 şema denetlendi).

- **Hata**: veri yanlış ya da bozuk. **Uyarı**: şüpheli ama olabilir. **Bilgi**: bilinçli durum ya da yalnız not.
- Denetim kodları (D1…D14, K) bu dosyanın sonundaki listede açıklanır.

## Şema özeti

| Şema | Durum | Parça | eslesti | cozuldu | suphe | Cihaz | Çelişki | Etiketsiz parça | Hata | Uyarı | Bilgi |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| alternator-mars (Alternatör – Marş Motoru) | denetlendi | 29 | 25 | 4 | 0 | 15 | 2 | 15 | 0 | 1 | 5 |
| kapi-1 (Kapı 1) | denetlendi | 102 | 100 | 2 | 0 | 28 | 4 | 53 | 0 | 31 | 3 |

Etiketsiz parça hata değildir: çoğu, soket simgesinin iki yarısı arasındaki kısa çizgidir.

Diğer sayılar:

| Şema | Varyant (kesikli) | Cihaz içi (`ic`) | İki ucu aynı soket-pin | Yaklaşık ızgara (~) | dogrulandi |
|---|---:|---:|---:|---:|---|
| alternator-mars | 2 | 1 | 2 | 3 | hayır |
| kapi-1 | 0 | 0 | 0 | 2 | hayır |

`semalar.json`'da olup henüz veri dosyası olmayan şemalar: `kapi-2`, `kapi-3`, `kapi-4`, `fps-1-4`, `fps-5`, `fps-6`, `dmux`, `kapi-butonu-dmux`, `cpc`, `scr`.

## Hatalar (0)

Hata yok.

## Uyarılar (32)

| Şema | Kayıt | Denetim | Ne | Nerede |
|---|---|---|---|---|
| alternator-mars | k027 | D8 | ara soket ucu X03.53 pin 3 yalnız bir parçada geçiyor (zincir burada açık bitiyor). Kayıt notu: Dal X03.53/3 soketinin yay yarısında açık bitiyor; soketin öbür yarısında çizili bağlantı yok. | sayfa 1 · yol ~33 · satır B |
| kapi-1 | k001 | D8 | ara soket ucu X08.11 pin 4 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 3 · satır C |
| kapi-1 | k001 | D8 | ara soket ucu X08.12 pin 3 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 3 · satır C |
| kapi-1 | k002 | D8 | ara soket ucu X08.11 pin 11 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 3 · satır C |
| kapi-1 | k006 | D8 | ara soket ucu X08.11 pin 5 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 7 · satır C |
| kapi-1 | k006 | D8 | ara soket ucu X08.12 pin 4 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 7 · satır C |
| kapi-1 | k008 | D8 | ara soket ucu X08.15 pin 5 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 8 · satır C |
| kapi-1 | k011 | D8 | ara soket ucu X08.11 pin 6 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 11 · satır C |
| kapi-1 | k011 | D8 | ara soket ucu X08.12 pin 5 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 11 · satır C |
| kapi-1 | k012 | D8 | ara soket ucu X08.11 pin 12 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 11 · satır C |
| kapi-1 | k018 | D8 | ara soket ucu X08.11 pin 7 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 15 · satır C |
| kapi-1 | k018 | D8 | ara soket ucu X08.12 pin 6 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 15 · satır C |
| kapi-1 | k019 | D8 | ara soket ucu X08.15 pin 6 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 16 · satır C |
| kapi-1 | k020 | D8 | ara soket ucu X08.17 pin 2 yalnız bir parçada geçiyor (zincir burada açık bitiyor). Kayıt notu: A: ~d1 ↔ X08.17/2; B: X08.17/2 ↔ X08.16/2 → F001 ile aynı gerekçe: dal X08.16/2 pininin saplamasında bitiyor, | sayfa 1 · yol 17 · satır A |
| kapi-1 | k023 | D8 | ara soket ucu X08.11 pin 8 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 19 · satır C |
| kapi-1 | k023 | D8 | ara soket ucu X08.12 pin 9 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 19 · satır C |
| kapi-1 | k026 | D8 | ara soket ucu X08.17 pin 4 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 22 · satır B |
| kapi-1 | k032 | D8 | ara soket ucu X08.11 pin 10 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 26 · satır C |
| kapi-1 | k035 | D8 | ara soket ucu X08.12 pin 10 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 27 · satır B |
| kapi-1 | k043 | D8 | ara soket ucu X08.15 pin 2 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 32 · satır C |
| kapi-1 | k045 | D8 | ara soket ucu X08.12 pin 8 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 34 · satır B |
| kapi-1 | k052 | D8 | ara soket ucu X08.17 pin 3 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 39 · satır B |
| kapi-1 | k074, k077 | D4 | ara soket X08.11 pin 3 ucuna farklı numaralı kablolar bağlanıyor: 4001 (k077); 4134 (k074) [ara soket: soketten sonra numara değişebilir, yine de bak] | sayfa 1 · yol 56 · satır A \| sayfa 1 · yol 59 · satır A |
| kapi-1 | k075 | D11 | pinAdi: şemada 'Kl.15', Beyin Listesi'nde 'UB' (gerçek değer çelişkisi; şema değeri korundu, hangisi doğru?) | sayfa 1 · yol 56 · satır B |
| kapi-1 | k076 | D2 | uç 2: ham '41F01 20A' içinde alanlarla açıklanmayan metin: '20A' | sayfa 1 · yol 59 · satır A · uç 2 |
| kapi-1 | k078 | D2 | uç 1: ham '41F01 20A' içinde alanlarla açıklanmayan metin: '20A' | sayfa 1 · yol 59 · satır B · uç 1 |
| kapi-1 | k087 | D2 | uç 1: ham boş ama cihaz dolu | sayfa 1 · yol 65 · satır B · uç 1 |
| kapi-1 | k087 | D11 | hedef: şemada '42A01 (kalın demet çubuğu → ok)', Beyin Listesi'nde 'X0809' (gerçek değer çelişkisi; şema değeri korundu, hangisi doğru?) | sayfa 1 · yol 65 · satır B |
| kapi-1 | k091 | D2 | uç 1: ham boş ama cihaz dolu | sayfa 1 · yol 67 · satır B · uç 1 |
| kapi-1 | k091 | D11 | hedef: şemada '42A01 (kalın demet çubuğu → ok)', Beyin Listesi'nde 'X0809' (gerçek değer çelişkisi; şema değeri korundu, hangisi doğru?) | sayfa 1 · yol 67 · satır B |
| kapi-1 | k094 | D11 | hedef: şemada '41A01 CANLS 9/6 (aynı soket içinde köprü)', Beyin Listesi'nde 'X0809' (gerçek değer çelişkisi; şema değeri korundu, hangisi doğru?) | sayfa 1 · yol 69 · satır B |
| kapi-1 | k095 | D8 | ara soket ucu X08.12 pin 7 yalnız bir parçada geçiyor (zincir burada açık bitiyor) | sayfa 1 · yol 69 · satır C |

## Bilgi (8)

| Şema | Kayıt | Denetim | Ne | Nerede |
|---|---|---|---|---|
| alternator-mars | k006 | D11 | soket: şemada 'X11.42/1', Beyin Listesi'nde 'X1142/1' (yazım farkı; şema değeri değişmedi) | sayfa 1 · yol 20 · satır A |
| alternator-mars | k009 | D12 | iki ucu da aynı soket-pin (X11.42/1); kesikli kutudaki körük soketi gibi bilinçli olabilir | sayfa 1 · yol 20 · satır B |
| alternator-mars | k011 | D11 | soket: şemada 'X11.42/2', Beyin Listesi'nde 'X1142/2' (yazım farkı; şema değeri değişmedi) | sayfa 1 · yol 22 · satır A |
| alternator-mars | k013 | D12 | iki ucu da aynı soket-pin (X11.42/2); kesikli kutudaki körük soketi gibi bilinçli olabilir | sayfa 1 · yol 22 · satır B |
| alternator-mars | k026 | D12 | cihaz içi bağlantı (ic:true): 01G02 pin D+ ↔ 01G02 pin DF | sayfa 1 · yol ~32 · satır C |
| kapi-1 | k091, k094 | D4 | 41A01 soket 9 pin 6 ucuna farklı numaralı kablolar bağlanıyor: 1WS/LI (k091); 4060 (k094) [parçalardan biri aynı cihazın iki pini arasında köprü (örn. CAN sonlandırma): aynı pine ikinci bir kablo gelmesi normal] | sayfa 1 · yol 67 · satır B \| sayfa 1 · yol 69 · satır B |
| kapi-1 | k094 | D12 | iki ucu da aynı cihaz (41A01) ama ic:true değil (cihaz içi köprü olabilir) | sayfa 1 · yol 69 · satır B |
| kapi-1 | k102 | D12 | iki ucu da aynı cihaz (41H01) ama ic:true değil (cihaz içi köprü olabilir) | sayfa 1 · yol 74 · satır C |

## Şemalar arası (D7)

### Ortak kablo numaraları

Birden çok şemada geçen kablo numarası yok.

### Devam bağlantıları (başka cihaza ya da sayfaya giden kablolar)

| Şema | Kayıt | Kablo | Hedef | Durum | Nerede bulundu |
|---|---|---|---|---|---|
| alternator-mars | k003 | 1,5-1441 | 10A01 | listede | bu şemanın bileşen listesinde (yol 13) |
| alternator-mars | k006 | 0001 | 10A10 | listede | bu şemanın bileşen listesinde (yol 20, 22) |
| alternator-mars | k011 | 0002 | 10A10 | listede | bu şemanın bileşen listesinde (yol 20, 22) |
| alternator-mars | k018 | 2029 | 24F01 | listede | bu şemanın bileşen listesinde (yol 31) |
| kapi-1 | k028 | (etiketsiz) | 42A01 | listede | bu şemanın bileşen listesinde (yol 23..66) |
| kapi-1 | k070 | 4039 | 42A01 | listede | bu şemanın bileşen listesinde (yol 23..66) |
| kapi-1 | k073 | #br | 74 | elle | hedef sayfa/yol olarak yazıyor; kendiliğinden bağlanmadı |
| kapi-1 | k083 | 6005 | 60A01 | listede | bu şemanın bileşen listesinde (yol 62) |
| kapi-1 | k087 | 1sw/rt | 42A01 | listede | bu şemanın bileşen listesinde (yol 23..66) |
| kapi-1 | k091 | 1ws/li | 42A01 | listede | bu şemanın bileşen listesinde (yol 23..66) |
| kapi-1 | k103 | #br | 54 | elle | hedef sayfa/yol olarak yazıyor; kendiliğinden bağlanmadı |

## Beyin Listesi çelişkileri (D11)

| Şema | Kablo | Alan | Şemada | Beyin Listesi'nde | Tür |
|---|---|---|---|---|---|
| alternator-mars | k006 | soket | X11.42/1 | X1142/1 | yazım farkı |
| alternator-mars | k011 | soket | X11.42/2 | X1142/2 | yazım farkı |
| kapi-1 | k075 | pinAdi | Kl.15 | UB | gerçek değer çelişkisi |
| kapi-1 | k087 | hedef | 42A01 (kalın demet çubuğu → ok) | X0809 | gerçek değer çelişkisi |
| kapi-1 | k091 | hedef | 42A01 (kalın demet çubuğu → ok) | X0809 | gerçek değer çelişkisi |
| kapi-1 | k094 | hedef | 41A01 CANLS 9/6 (aynı soket içinde köprü) | X0809 | gerçek değer çelişkisi |

Toplam 6 kayıt: 4 gerçek değer çelişkisi, 2 yazım farkı.

## Denetim listesi

| Kod | Ne denetler |
|---|---|
| D1 | Parça ve uç biçimi (2 uç, uç türü, zorunlu alanlar, alan türleri) |
| D2 | `ham` metni ile ayrıştırılmış alanlar uyuşuyor mu |
| D3 | `etiket` ile `no / isaret / kesit / renk` uyuşuyor mu |
| D4 | Aynı cihaz+soket+pine farklı numaralı kablo düşüyor mu |
| D5 | Uçlardaki kodlar bileşen listelerinde var mı |
| D6 | Bileşen listesindeki her cihaz çizimde geçiyor mu (eksik kablo avı) |
| D7 | Şemalar arası tutarlılık (ortak numara, devam bağları, aynı uca farklı numara) |
| D8 | Açık düğüm ve açık soket ucu |
| D9 | Soru işareti ve `suphe` kaydının tutarlılığı |
| D10 | Izgara eksik ya da cetvel dışı (yol 1–76, satır A–D) |
| D11 | Beyin Listesi çelişkileri (`celiskiler`) |
| D12 | İç bağlantı (`ic`) ve iki ucu aynı olan parçalar |
| D13 | Şüpheli karakter örüntüleri (I/1, O/0, …) |
| D14 | Bileşen listesi kaydı (yinelenme, tür, yol) ve künye |
| K | Uzlaştırma kontrolü (`karsilastir.py --kontrol`) |

Notlar: D2 `ham` ile alanları noktasız/boşluksuz/büyük harfle karşılaştırır (`X08. 11/4` = `X08.11/4`). D4 yalnız pini belli uçlara bakar (pinsiz toprak ve dağıtıcı uçları çakışma sayılmaz); iki ucu aynı olan parçalar D12'dedir. D5/D6 aralık kodlarını (`X03.20-54`) soket ailesi sayar, `HT…` varyant işaretlerini cihaz saymaz. K satırları `karsilastir.py --kontrol` çıktısıdır; `dogrulandi: true` bir hata değil bilgidir.
