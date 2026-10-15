# Veri modeli (ortak sözleşme)

Okuyucular, uzlaştırıcı, denetçi, çekirdek ve test bu dosyaya göre çalışır. PROMPT.md'deki öneriden farklar §7'de, gerekçeleriyle.
Aşağıdaki örnek değerler **uydurmadır** (`9999`, `99A01`); gerçek veri sanma, çıktıya taşıma.

## 1. Şemada ne var

İlk iki şemaya (Kapı 1, Alternatör–Marş) bakılarak yazıldı. Başka şemada farklı çıkarsa uzlaştırıcı buraya not düşer ve yöneticiye bildirir.

- **Cetvel:** sayfanın üstünde ve altında akım yolu (Strompfad) numaraları 1–76 (eşit aralıklı), solda satır harfleri A–D. Kaynak referansı böyle verilir: `yol 24 · satır A`.
- **Bileşen listesi** (sayfanın altı): `kod | akım yolu | Almanca ad`. Cihaz adının ve "cihaz hangi yolda" bilgisinin en güvenilir kaynağıdır.
- **BEMERKUNGEN (notlar)**, sol alt. Bu şemalarda: "kesit yazmıyorsa 0,75 mm², renk yazmıyorsa `ws` (beyaz)". Her şemada yeniden okunur.
- **Künye**, sağ alt: başlık, parça no (Sach-Nr.), format, tarih.
- **Pin yazımı** `<soket adı>-<pin sayısı>/<pin>`: FPS'te `IV-18/10` (IV soketi, 18 pinli, 10. pin); beyinlerde `15/5` (15 pinli soketin 5. pini); ara soketlerde `X08.11/4` (X08.11 soketinin 4. pini). Pin adı (`HS10`, `UREF`, `KL.15`) sembolün içinde ya da yanında yazar. Soketsiz cihazlarda uç adı (`B+`, `D+`, `50`, `31`) pin sayılır.
- **Kablo etiketi** `[#][kesit][-][renk][no]`: `4002` · `#4002` (`#` = sistem tedarikçisi) · `2,5-4135` (2,5 mm², no 4135) · `70sw` (70 mm² siyah, **numarası yok**) · `1sw/rt` (1 mm² siyah-kırmızı, numarasız).
- **Renk kısaltmaları:** ws beyaz, sw siyah, rt kırmızı, gn yeşil, ge sarı, bl mavi, br kahverengi, gr gri, li lila, or turuncu, rs pembe. Tanımadığın kısaltmayı olduğu gibi yaz.
- **Kesikli çizgi ya da kesikli kutu** = varyant (opsiyonel donanım).
- **Ok + cihaz kodu** (`42A01`) ya da **`2/27`** (sayfa/yol) = kablo başka cihaza ya da sayfaya devam ediyor.

## 2. Şema dosyası: `veri/<sema>.json`

Uzlaştırıcı yazar. Başka dosya `veri/<sema>.json`'a yazmaz.

```json
{
  "sema": "ornek-1",
  "kaynak": { "pdf": "Ornek stromlaufplan.pdf", "sayfalar": [1] },
  "kunye": { "baslik": "…", "parcaNo": "A 000 000 00 00", "format": "A2", "tarih": "2000-01-01" },
  "varsayilan": { "renk": "ws", "kesit": "0.75", "ham": "Alle Leitungen ohne …" },
  "dogrulandi": false,
  "cihazlar": [
    { "kod": "99A01", "yol": ["12"], "adDe": "Steuergeraet …", "adTr": null, "kisaAd": null, "tur": "beyin" }
  ],
  "kablolar": [
    {
      "id": "k001",
      "etiket": "#9999",
      "no": "9999", "isaret": "#", "kesit": null, "renk": null, "varyant": false,
      "uclar": [
        { "tur": "cihaz", "cihaz": "99A01", "soket": "IV-18", "pin": "10", "pinAdi": "HS10", "ham": "HS10 IV-18/10" },
        { "tur": "soket", "soket": "X99.1", "pin": "4", "ham": "X99. 1/4" }
      ],
      "izgara": { "sayfa": 1, "yol": "24", "satir": "A" },
      "durum": "eslesti",
      "not": null,
      "suphe": null
    }
  ],
  "celiskiler": []
}
```

### Kablo parçası (`kablolar[]`)

Her kayıt, şemada **çizili tek bir iletken parçasıdır** ve her zaman **tam iki ucu** vardır. Dallanan kablo, ortak uçta buluşan birden çok parçadır; ara soketten geçen kablo, soket ucunda buluşan parçalar zinciridir. Bütün kablo (zincir, dal) çekirdekte parçalardan kurulur (§4).

| Alan | Anlamı |
|---|---|
| `id` | Dosya içinde benzersiz (`k001`…). Uzlaştırıcı verir. |
| `etiket` | Şemada yazdığı gibi, `#` dahil (`#9999`, `2,5-4135`, `70sw`). Etiket yoksa `null`. |
| `no` | Etiketten ayıklanan kablo numarası; numarasızsa `null`. Arama bunu da `etiket` de dizinler. |
| `isaret` | Etikette `#` varsa `"#"`, yoksa `null`. |
| `kesit` | **Yalnız etikette yazıyorsa**, mm² olarak, ondalık nokta (`"2.5"`). Yoksa `null`. |
| `renk` | **Yalnız etikette yazıyorsa**, kısaltma (`"sw/rt"`). Yoksa `null`. |
| `varyant` | Kesikli çizilmişse `true`. |
| `ic` | İsteğe bağlı. İki ucu da **aynı cihazın pini** ise (cihaz içi köprü, örn. alternatörde `D+ ↔ DF`) `true`; bu bir kablo değildir ama çizimde bağlantı olarak görünür ve arıza aramada işe yarar. Yoksa alan hiç yazılmaz. Uygulama bunu "cihaz içi bağlantı" diye ayrı gösterir. |
| `uclar` | Tam 2 uç, sırası önemsiz. |
| `izgara` | `sayfa` PDF sayfa numarası (görüntüleyicide görünen, 1'den), `yol` cetveldeki akım yolu, `satir` A–D. Kesin değilse `"~24"`. |
| `durum` | `eslesti` (A ve B aynı) · `cozuldu` (A≠B, uzlaştırıcı büyütmede karar verdi) · `suphe` (karar verilemedi). |
| `not` | Serbest kısa not. |
| `suphe` | `durum:"suphe"` ise zorunlu: `{ "soru": "…", "A": "…", "B": "…", "kirpinti": "kaynak/png/…" }`. `soru`, Olcay'a sorulacak okunaklı bir cümle (`SUPHELILER.md` buradan üretilir). |

### Uç (`uclar[]`)

| `tur` | Ne | Zorunlu alanlar | Notlar |
|---|---|---|---|
| `cihaz` | Bir cihazın ya da bileşenin ucu | `cihaz` (bileşen listesindeki kod) | `soket`, `pin`, `pinAdi` yazıyorsa dolu, yoksa `null`. FPS: `soket:"IV-18"`, `pin:"10"`, `pinAdi:"HS10"`. Beyin: `soket:"15"`, `pin:"5"`, `pinAdi:"NHB"`. Soketsiz: `soket:null`, `pin:"B+"`. |
| `soket` | Kablo hattındaki ara soket (demetler arası konnektör) | `soket`, `pin` | `cihaz` yok. `soket:"X08.11"`, `pin:"4"`. |
| `dugum` | Kablonun dallandığı ek / birleşim noktası | `kod` | `kod`: şemada yazan kod (`30Z07`). Yazmıyorsa okuyucunun verdiği yerel ad `~d1`, `~d2`… (`~` = şemada yazmıyor). Aynı düğümü paylaşan parçalar aynı `kod`u kullanır. |
| `devam` | Kablo bu şemada bitmiyor, başka cihaza / sayfaya gidiyor | en az biri: `cihaz`, `hedef` | `cihaz`: okun yanındaki kod (`42A01`). `hedef`: yazan sayfa/yol (`2/27`). Karşı uç başka şemada aranır. |

Her uçta ayrıca `ham`: uçta yazan her şey, olduğu gibi (`"HS10 IV-18/10"`, `"X99. 1/4"`). Ayrıştırılmış alanlar yanlışsa `ham` doğruyu gösterir; denetçi ikisini karşılaştırır.

### Cihaz (`cihazlar[]`)

Bileşen listesinden. `kod`, `yol` (listedeki akım yolları, dizi), `adDe` (Almanca ad, olduğu gibi), `adTr` (Türkçe ad; yalnız Beyin Listesi'nde yazıyorsa, uydurma), `kisaAd` (Beyin Listesi'ndeki kısa ad: `FPS 3`, `Kapı 1 beyni`, `CPC`; metin özetinde kullanılır; yoksa `null`), `tur`.

`tur`, kod harfinden (`41A01` → `A`) ve Almanca addan türetilir:
`A` beyin · `B` sensor · `E` lamba · `F` sigorta · `G` guc (akü, alternatör) · `H` ikaz · `K` role · `M` motor · `R` direnc · `S` salter · `V` diyot · `W` toprak · `X` soket · `Y` valf · `Z` dugum.
Ek: Almanca adı `Verteiler` olan `X…` kodları `besleme` (artı besleme dağıtıcısı). Uymayan kod `diger`, nedeni `not`'ta. `HT…` gibi varyant işaretleri `diger`.

### `celiskiler[]`

Beyin Listesi ile şema çelişirse (şema esastır, değer değişmez): `{ "kablo": "k012", "alan": "pin", "sema": "15/5", "beyinListesi": "15/6", "not": "…" }`.

## 3. Ham dosya: `veri/ham/<sema>.<A|B>.json`

Okuyucu, kırpıntı başına küçük parça dosyaları yazar (`.gecici/ham/<sema>.<K>/`); `araclar/ham_birlestir.py` bunları tek dosyada birleştirir, `etiket`ten `no/isaret/kesit/renk`i ayıklar. Aynı biçim, farklar:

- Üst düzeyde `kopya` (`"A"`/`"B"`), `tamamlandi` (bool), `kalan` (gezilmeyen kırpıntı id'leri), `gezilen` (gezilen kırpıntı id'leri), `okunamayanlar` (`[{ "nerede": "…", "ne": "…" }]`).
- `durum`, `suphe`, `id`, `celiskiler` yok; kablolara geçici `id` (`a001`…) verilir.
- Her kablo ve cihazda `goruldu`: `{ "kirpinti": "kapi-1/s1/orta/r2c3", "kutu": [x, y, w, h] }` (kutu: kırpıntı içinde yaklaşık piksel) ve `emin`: `true`/`false`.
- Okunamayan karakter `?`. Tahmin yok.

## 4. Parçalar nasıl birleşir (çekirdek için)

- Normalizasyon: büyük harf ve boşluk yok (`61a01` = `61A01`, `X08. 11` = `X08.11`). Yerel ayara bağlı büyük harf dönüşümü kullanma (Türkçe `ı/İ` tuzağı). **Cihaz pininin kimliğinde tire ve artı korunur** (`B-` ≠ `B`, `B+` ≠ `B`); yalnız arama sorgusunda tire/boşluk farkı yok sayılır (`61-A01` = `61A01`).
- İki parça bir uçta birleşir: `cihaz` ucunda aynı (cihaz, soket, pin); `soket` ucunda aynı (soket, pin); `dugum`da aynı `kod`.
- Bir kablo, aynı `no`lu bütün parçalardır; bunlara düğüm ve ara soket üzerinden bağlanan komşu parçalar da zincire girer (ara soketten sonra numara değişebilir, zincir sürer). `devam` uçları başka şemada aynı `no` ya da hedef cihazla eşleştirilir.
- Aynı `no` birden çok şemada geçerse tek kabloda birleşir, her parça kendi şemasını/sayfasını/ızgarasını korur. Aynı `no`ya çelişen uçlar düşerse `celiski:true`.
- Numarasız kablolar (`no:null`) `etiket`le aranır, uçlarından izlenir.
- Aynı pinde aynı numaralı iki parça (dallanma) normaldir; **farklı** numaralı iki parça çelişkidir.

## 5. Ek dosyalar

- `veri/semalar.json` — şema kimlikleri, PDF adları, sayfalar, kapaklar, sekmeler (yönetici yazar).
- `veri/cihazlar.json` — **türetilmiş**; `build.py` her şemadaki `cihazlar`ı birleştirerek üretir. Elle düzenlenmez, hiçbir ajan yazmaz.
- `SUPHELILER.md`, `veri/DENETIM.md`, `DOGRULAMA.md` — **türetilmiş**; `veri-denetci` betiklerle üretir.
- `dogrulandi` bayrağı (her `<sema>.json`'da): yalnız yönetici, Olcay "bu şemayı kontrol ettim" dediğinde `true` yapar. Uzlaştırıcı her yazışında `false` yazar (veri değiştiyse doğrulama geçersizdir).
- `veri/ham/<sema>.fark.json` ve `<sema>.kararlar.md` — uzlaştırma kayıtları (fark listesi ve karar günlüğü).

## 6. Şema kimlikleri

`alternator-mars`, `kapi-1`…`kapi-4`, `fps-1-4`, `fps-5`, `fps-6`, `dmux`, `kapi-butonu-dmux`, `cpc`, `scr`. Üretilen dosya yolları yalnız ASCII.

## 7. PROMPT.md'deki öneriden farklar

1. **`uclar` her zaman 2 uç ("kablo parçası").** Öneride bir kablonun uç listesi vardı. Ara soketlerden geçen zincirde uçların sırası, dallanmada hangi ucun neye bağlandığı bir listeden anlaşılmıyor. Parça + ortak uç, hem zinciri hem dalı kayıpsız anlatır; okuyucular yerel (kolay) bir iş yapar; A ile B karşılaştırması mekanik olur. Zincir/dal çekirdekte kurulur.
2. **Renk/kesit şema varsayılanı ayrı tutulur.** Şemanın kendi notu "yazmıyorsa 0,75 mm² / ws" diyor. Bunu kablonun alanına yazmak "uydurmama" kuralını bozar; yazmamak da sahada işe yarar bilgiyi kaybettirir. `varsayilan` şema düzeyinde durur, uygulama "(şema notu)" ile ayrı gösterir.
3. **`etiket`, `isaret`, numarasız kablolar.** Alternatör gibi şemalarda `70sw` türü kablolar numarasız. Etiket olduğu gibi saklanır, `no` boş kalabilir.
4. **`durum` üç değerli** (`cozuldu` eklendi). İki okuyucu ayrışıp uzlaştırıcı karar verdiyse bu, iki bağımsız okumanın aynı çıkmasından daha zayıf kanıttır; doğrulama listesi bunlara öncelik verir.
5. **`izgara` yapılandırılmış** (`sayfa`, `yol`, `satir`) ve cihazlarda bileşen listesinden gelen `yol` var.
6. **`celiskiler`**: Beyin Listesi çelişkileri veride tutulur.
7. **Tek yazar kuralı:** `cihazlar.json` ve `SUPHELILER.md` doğrudan ajan yazmasın diye türetilmiş dosyadır; uzlaştırıcılar yalnız kendi şema dosyalarına yazar, böylece paralel çalışabilir.
