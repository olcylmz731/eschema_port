# Diyagram motoru API'si (`src/diyagram/`)

Arayüz (`arayuz`) ve test bu dosyaya bakarak çalışır. Görsel kararlar `DESIGN.md` ve `src/tokens.css`'te; burada yalnız **çağrı sözleşmesi** var.
Tarayıcıda `KB.diyagram` olarak yüklenir (`build.py` `src/diyagram/*.js` ve `*.css` dosyalarını `cekirdek`ten sonra, `arayuz`dan önce gömer). DOM'a bağımlıdır, uygulamadan bağımsız çağrılır: bir kapsayıcı `div` ve `cekirdek` çıktısı yeter.

## 1. Hızlı başlangıç

```js
var iz   = KB.izle.kablo(db, '9999');                 // ya da KB.izle.uc(...)
var kap  = document.getElementById('cizim');          // boş bir blok öğe; genişliği sayfa belirler
var ciz  = KB.diyagram.ciz(kap, iz, {
  onCihaz: function (kod) { git('cihaz', kod); }       // bir ucun cihazına dokunuldu
});
// sonra: ciz.yokEt();   (kapsayıcı kaldırılırken ya da yeni çizim konurken)
```
`KB.diyagram.ciz(kap, nesne, secenek)` nesnenin `tur` alanına bakar: `'kablo'|'uc'` (Iz) → tek kablo / dallanan kablo çizimi; `'cihaz'` (CihazSorgusu) → cihaz çizimi; `'soket'` (SoketSorgusu) → soket çizimi. Tanınmayan / `null` nesne için `null` döner, kapsayıcıya dokunmaz.

Aynı kapsayıcıya yeniden çağırınca eski çizim kendiliğinden temizlenir. Aynı sayfada istenen sayıda çizim olabilir.

## 2. İşlevler

| İşlev | Ne yapar |
|---|---|
| `KB.diyagram.ciz(kap, nesne, secenek)` → `Cizim\|null` | Yukarıdaki yönlendirici. |
| `KB.diyagram.kablo(kap, iz, secenek)` | Iz çizimi (tek kablo zinciri, dallanma; geçiş bileşenleri, cihaz içi bağlantı, kendine dönen kablo). `iz.bilesenler` alt alta, birden çoksa `PARÇA n` başlığıyla. |
| `KB.diyagram.cihaz(kap, sorgu, secenek)` | Cihaz sorgusu: üstte cihaz başlığı, altında soket başlık bantları + pin satırları; her pinden çıkan kablo karşı ucuyla. |
| `KB.diyagram.soket(kap, sorgu, secenek)` | Soket sorgusu: her `eslesme` için başlık + bant + pin satırları (cihaz çizimiyle aynı satırlar). |
| `KB.diyagram.sprite()` → `string` | Gizli SVG sprite'ın metni (18 tür işareti `t-…`, durum/arayüz simgeleri `i-…`, motora özel `d-…`). Kaynak tek: `src/diyagram/d0-sprite.js` (`test/referans.html`'deki `t-…`/`i-…` ile birebir aynı; `cakisma.mjs` farkı denetler). |
| `KB.diyagram.spriteEkle()` | Sprite'ı `<body>`'nin başına **bir kez** ekler (`id="kb-sprite"`); tekrar çağırmak zararsız. `ciz` bunu kendisi çağırır, **arayüzün ayrıca eklemesi gerekmez**; arayüz kendi HTML'inde `<svg class="tm t-beyin"><use href="#t-beyin"/></svg>` ya da `svg.ik` simgeleri kullanacaksa açılışta bir kez çağırsın. |
| `KB.diyagram.TURLER` | `{ beyin:{ad:'BEYİN'}, soket:{ad:'SOKET'}, … 18 tür }` yazı etiketleri (DESIGN §6). Arayüz kartlarında aynı yazıyı kullanabilir. |

`diyagram.css` şunları da tanımlar (arayüz kullanabilir): `.tc .tg .tf .tn` ve 18 tane `.t-<tür>` sınıfı (tür işareti rengi), `svg.tm` (40 px işaret), `svg.tm-b` (56 px), `svg.ik` (24 px çizgi simgesi), `svg.ik-k` (20 px).

## 3. `secenek` (hepsi isteğe bağlı)

| Alan | Varsayılan | Anlamı |
|---|---|---|
| `onCihaz(kod, dugum)` | yok | Bir cihaz ucuna dokunuldu (cihaz düğümünün kartı, geçiş bileşeninde bileşen kodu, `devam` düğümünde `hedefCihaz`, cihaz sorgusunda karşı uç). `kod`: cihaz kodu. Geri çağrı yoksa o bölgeler dokunulabilir yapılmaz (`›` simgesi de çıkmaz). |
| `onSoket(ad, dugum)` | yok | Ara soket düğümüne ya da soket başlığına dokunuldu (`KB.soketSorgu.soket(db, ad)` için). |
| `onKablo(anahtar, kenar)` | yok | Kablo etiket çipine dokunuldu (çok pinli cihaz çiziminde "bu kablonun çizimi"). `anahtar`: `KB.izle.kablo`ya verilebilir (`kenar.no` ya da `kenar.etiket`). Etiketsiz kablo dokunulabilir olmaz. |
| `onUc(ref, dugum)` | yok | Bir pin kapsülüne / pin kutusuna dokunuldu. `ref`: `KB.izle.uc(db, ref)`'e verilir (`{cihaz,soket,pin}` ya da `{soket,pin}`). |
| `onOlcek(olcek)` | yok | Yakınlaştırma değişti (1 = yakınlaştırma yok). |
| `yerlesim` | `'oto'` | `'oto'`: genişlik ≤ 480 px → dikey zincir; daha genişse yatay deneyip sığmazsa dikey. `'yatay'` / `'dikey'` zorlar (yatay sığmazsa yine dikey olur). |
| `genislik` | kapsayıcının genişliği | Zorunlu genişlik (px); test içindir. |
| `ozet` | `KB.metin.ozet(iz)` | `<svg aria-label>` metni. Cihaz/soket çiziminde kendi özetini üretir; verilirse ezer. |
| `yakinlastirma` | `true` | `false` iken iki parmakla yakınlaştırma/kaydırma kapalı (sayfa kaydırması aynen kalır). |
| `yapiskanUst` | `0` | Cihaz/soket çiziminde soket başlık bandı **yapışkan**dır (kaydırınca ekranın üstünde kalır). Sayfanın üstünde sabit bir çubuk varsa yüksekliğini (px) verin; bant onun altına yapışır. |
| `odak` | iz'den | Iz çiziminde vurgulanacak düğüm kimliği (`bilesen.odak` yoksa). |

## 4. `Cizim` (dönüş)

```js
{ svg, kap, genislik, yukseklik, yerlesim: 'yatay'|'dikey', ozet,
  olcek(),                // şimdiki yakınlaştırma (≥ 1)
  yakinlastir(o, x, y),   // o: 1…5; x,y: odak noktası (svg px); yoksa orta
  sifirla(),              // yakınlaştırmayı kaldır
  yenile(),               // yeniden yerleştir (yazı boyutu / ayar değişince)
  yokEt() }               // dinleyicileri sök, DOM'u temizle
```

## 5. Boyutlandırma ve ölçek

- Çizim kapsayıcının **genişliğine** göre yerleşir (`ResizeObserver`; yoksa `window.resize`). Genişlik değişince kendiliğinden yeniden çizilir (yakınlaştırma sıfırlanır). Kapsayıcı gizliyse (`display:none`, genişlik 0) çizim görünür olunca yapılır.
- Ölçek **hiçbir zaman 1'in altına inmez**: SVG 1 birim = 1 CSS px. Sığmayan zincir küçülmez; dikeye döner. Yatay kaydırma yoktur: `scrollWidth ≤ clientWidth` her genişlikte.
- Yazı boyutları `rem` tokenlarından okunur (telefonun yazı boyutu ayarı yerleşimi büyütür, çakışma çıkmaz). Yazı ayarı çalışırken değişirse `yenile()` çağırın.
- Yükseklik içeriğe göre serbesttir (sayfa kaydırır). 40 pinli bir beyin yüzlerce piksel değil birkaç bin piksel olabilir; satırlar sayfada akar.
- Tema: yalnız CSS değişkenleri kullanılır, tema değişince yeniden çizim **gerekmez**.

## 6. Dokunma, yakınlaştırma, klavye

- **Tek parmak, yakınlaştırılmamış:** sayfayı kaydırır (`touch-action: pan-x pan-y`; yakınlaştırmayı biz yönetiriz, tarayıcının sayfa yakınlaştırması bu bölgede devre dışıdır).
- **İki parmak (Pointer Events):** yakınlaştır + kaydır (1…5×). Yakınlaştırılmışken (`touch-action: none`) tek parmak çizimi kaydırır; çizimin dışına dokunarak sayfa kaydırılır. **Çift dokunuş (ya da çift tık) yakınlaştırmayı sıfırlar.** Fare: yakınlaştırılmışken sürükle, `Ctrl`+tekerlek yakınlaştırır. Klavye (çizim odaktayken): `+` `-` `0` ve oklar.
- Yakınlaştırılmışken kapsayıcıya `dy-yakin` sınıfı eklenir.
- Dokunulabilir bölgeler (`role="link"`, `tabindex="0"`, Enter/Boşluk ile de çalışır) en az 48 × 48 px'tir; birbirine 8 px'ten yakın olmaz. Yakınlaştırma / kaydırma hareketinden sonra gelen sahte "tık" yutulur.

## 7. Ne çizilir (özet; ayrıntı DESIGN §6–§11)

- Kablo çizgisi (§7): düz / renkli tüp / iki renkli çapraz çizgili / **varyant kesikli**; ortasında etiket çipi (kablo no, renk şeridi + yazılı kısaltma, kesit). **Şema notundan** gelen renk/kesit çizgiyi renklendirmez, çipin altında `ŞEMA NOTU` bandında yazılır. `ŞÜPHELİ` (amber çip + ünlem üçgeni + yazı), `ÇELİŞKİLİ` (kırmızı + ≠ + yazı), `VARYANT` (kesikli kare + yazı). Aynı kablo numarası zincirde tekrar ederse çip yalnız ilkinde çıkar (`KB.metin` ile aynı kural).
- Her cihaz ucunda **soket │ pin │ pin adı** kapsülü (§8; pin ters renkli kutuda; `?` amber çipte; okunamayan değerde `ŞÜPHELİ` rozeti). Soket/pin şemada yazmıyorsa kapsül yerine "soket/pin şemada yazılı değil" yazar (metin özetiyle aynı).
- Düğüm türleri: cihaz (18 tür işareti + yazı etiketi), ara soket, ek noktası (`DÜĞÜM`), `devam` (`DEVAM → 10A10`). `acik` (öbür taraf şemada yok) ve `kesik` (sınır aşıldı) düğümlerinde yazılı not.
- Uç sorgusunda sorgulanan düğüm `SORGULANAN` etiketiyle ve seçili çerçeveyle (`--secili-zemin` + `--vurgu`) vurgulanır.
- **Yerleşim** (`yerlesim:'oto'`): genişlik ≤ 480 px → **dikey zincir** (sol omurga; dallar girintili, solda 3 px ayraç, `DAL n` başlığı; çok dar ekranda girinti küçülür, 280 px'e kadar denendi). Daha genişse önce **tek satır soldan sağa** (dallanmada düğüm solda, dallar sağa dikey sıralı), sığmayan **dallanmasız zincir satır kırar** (satır sonunda tel sağda iner, satırlar arası kanaldan sola döner, çip kanalın ortasında; `yatayZincir`), dallı ve sığmayan çizim **dikeye** döner. Ölçek hiçbir zaman küçültülmez.

### 7.1 Geçiş bileşeni (çekirdek: `kenar.sanal`, `kenar.bilesen`)
Sigorta, diyot, direnç ve iki uçlu şalter izde iki terminal düğümü ve aralarında **sanal kenar** olarak gelir (kablo değildir: etiket/renk yok). Motor bunları `KB.metin` gibi **tek öğeye katlar**: zincirde **bileşen kartı** (tür işareti: ŞALTER / SİGORTA / DİYOT / DİRENÇ, kod, adı, iki terminalin pini `[2] — [1]`; pini yazmayan bileşende kapsül çıkmaz). Cihaz çiziminde bir satırın yolunda geçiş bileşeni varsa "ÜZERİNDEN" akışında bileşen kapsülü olarak yazılır; dallarda kalan bileşenler "DALLARDA GEÇEN BİLEŞENLER" kartında listelenir (bilgi kaybolmaz). Bileşene dokununca `onCihaz(bilesenKodu)`; pinlerine `onUc({cihaz, soket:null, pin})`.
Terminalinde dallanma varsa (örn. şalterin 2. pininden hem giriş kablosu hem ayrı bir dal çıkıyorsa) dallar bileşenin çocuğu olur; dal başlığına hangi terminalden çıktığı yazılır: `DAL 1 · pin 2`.

### 7.2 Cihaz içi bağlantı (`kenar.ic`)
Çizgi **kablo değildir**: tüp/numara yok; **noktalı** ince çizgi (kesikli varyanta karışmasın) + çip: `d-ic` simgesi + `CİHAZ İÇİ BAĞLANTI` + "kablo değil" (dar yerde iki satıra sarılır). İkinci uç kartı kısa gelir (ad tekrarlanmaz). Cihaz çiziminde pin satırının karşı ucu `CİHAZ İÇİ → pin DF` olarak yalnız pin kutusuyla yazılır; geçiş bileşeninin kendi sayfasında aynı biçim "GEÇİŞ BİLEŞENİ · kablo değil" ile görünür. Karşı pinin kendi satırı devamı gösterir.

### 7.3 Kendine dönen kablo (`dugum.kendineDonen`, `PinSatiri.kendineDonen`)
İki ucu da aynı soket-pin olan kablo (körük soketi) çizilmez (çizilecek yer yok, zinciri bozar); düğümün/pin satırının yanında not olarak yazılır: `KENDİNE DÖNEN · kablo #4201 (varyant), iki ucu da bu pinde`. Soket iki kez yazılmaz. Çevrimi kapatan **gerçek** kenarlar (`geriKenarlar`) çizilmez, zincirin altında `ÇEVRİM KAPANIŞI` bölümünde yazılır.

## 8. Test

```
node test/diyagram/cakisma.mjs [--veri klasör ...] [--genislik 360,412,768,1280] [--yazi 1,5] [--kenar 0] [--uc-adim 6] [--sadece kablo:4002] [--ilk 40] [--uyari]
node test/diyagram/cdp-dokunma.mjs
```
- `cakisma.mjs`: `veri/` (gerçek) ve `sahte` (`test/diyagram/sahte-veri.mjs`: 41 pinli beyin, 12 soketli ve 155 soketli zincir, derin dallanma, ŞÜPHELİ/ÇELİŞKİLİ/`?`/varyant, bileşenler, `ic`, kendine dönen, çok uzun adlar) ile bütün kablo, cihaz, soket sorgularını ve örnek uç sorgularını 4 genişlikte çizer. **Hata** sayılanlar: metin kutularının ikili kesişimi, metnin svg/çerçeve dışına taşması, kart/çip çerçevelerinin binmesi ya da dışarı çıkması, yatay kaydırma, en küçük yazı (< 14 px; kod/pin/soket < 18 px), dokunma hedefi < 48 px, `role="img"`/`aria-label` yokluğu, çizimde olması gereken bilginin (cihaz kodu, soket, soket+pin+pin adı, kablo no, bileşen kodu) bulunmaması, sayfa hatası. Uyarı: dokunma alanlarının 8 px'ten yakın olması (`--uyari`). Başında düzeneğin kendisi sınanır (bilerek bozuk çizimde dört hata türünü de yakalamalı). Kapsayıcı genişliği = görüntü alanı − 32 (sayfa kenarları; `--kenar` ile değişir), en çok 928. `--yazi 2`: telefonun yazı boyutu ayarını taklit eder. Çıkış kodu ≠ 0 = hata. ~15 sn.
- `cdp-dokunma.mjs`: başsız Brave'de `Input.dispatchTouchEvent` ile: cihaz/soket/kablo/uç dokunuşu → geri çağrılar, iki parmakla yakınlaştırma/kapama/kaydırma, yakınken tek parmak sürükleme, çift dokunuşla sıfırlama, hareketten sonra sahte tıkı yutma, yakınlaştırılmamışken tek parmağın sayfayı kaydırması, klavye (`+ - 0`), Ctrl+tekerlek, yapışkan soket bandı, `yakinlastirma:false`, genişlik değişimi, 1280 px yatay yerleşim. Yardımcılar dışa açıktır: `dokunmaHazirla, dokun, ciftDokun, surukle, cimdik, merkez`.

## 9. Bilinen sınırlar
- `--kablo-vi` (mor) tokenı yok; `vi` kısaltması "tanınmayan renk" gibi nötr şeritle yazılır (sanat yönetmenine bildirildi).
- Cihaz çiziminde kabloların ara düğümleri (ara soket, ek noktası, bileşen) satır içinde "ÜZERİNDEN" kapsülleri olarak gösterilir; dallanan kolda yalnız ilk dallanma düğümüne kadar zincir yazılır, dallardaki ara soketlerin sırası `PinSatiri`nde yoktur (tam zincir için `onKablo` ile kablonun çizimine geçilir). Dallardaki geçiş bileşenleri ayrı kartta listelenir ama hangi dalda olduğu yazmaz (çekirdek vermiyor).
- Geniş ekranda dallanan ve tek satıra sığmayan çizim dikey çizilir (dallı çizim satır kırmaz); cihaz sorgusunda her satır yatay sığmazsa tek başına dikeye döner.
- Cihaz çiziminde bir pinin çevrimi kapatan (geri) kenarı gösterilmez (çekirdek `PinSatiri`ye koymuyor); kablo çiziminde `ÇEVRİM KAPANIŞI` yazılır.
- `role="img"` olan svg'nin içindeki `role="link"` bölgeleri bazı ekran okuyucularda görünmeyebilir (erişilebilirlik özeti `aria-label`'da; dokunulabilir bölgeler klavye/anahtar erişimi için `tabindex="0"`).
- Dokunma alanı içinde ayrı dokunma alanı vardır (kart içindeki pin kapsülü `onUc`): tarayıcı yakın dokunuşu içteki hedefe çekebilir; cihaza geçmek için tür işaretine/başlığa dokunulur (`›` simgesi). Arayüz `onUc` vermezse iç hedef çıkmaz.
- Android'in genel `monospace` fontunda ölçüm/yerleşim yazı genişliğini **gerçek renderlanan yazıdan** ölçer; font farkı çakışma çıkarmaz ama test yalnız bu makinenin fontlarıyla koşar.
