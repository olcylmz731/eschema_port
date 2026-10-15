# DESIGN.md — Kablo Bulucu görsel sistemi

Hakem: `sanat-yonetmeni`. **Tek kaynak: `src/tokens.css`.** `diyagram-motoru` ve `arayuz` bu dosyadaki ve tokenlardaki dışında renk, boyut, yazı tipi kullanmaz; sapma gören yöneticiye bildirir.
Canlı örnek: `test/referans.html` (tek dosya, çevrimdışı; telefona atıp güneşte de denenebilir). Denetim: `node test/kontrast.mjs`. Referans sayfası `?tema=acik|koyu&gorus=gri|protan|deuter|tritan|gunes` ile açılır.

Kullanıcı: usta, yağlı el, güneş, tek el, Android 360–412 px. Görsellik süs değil **okunabilirlik** meselesi.

## 0. Üç kural (her şeyin üstünde)

1. **Bilgi asla yalnız renkle verilmez.** Her ayrım şekil + simge + yazıyla da yapılır; renk yalnız destek. Gri tonlama ve renk körlüğü benzetimiyle (referans sayfası, üst düğmeler) denenir.
2. **Boyut tabanı.** Hiçbir yazı 14 px altına, pin / soket / kod etiketi 18 px altına inmez; hiçbir dokunma hedefi 48 px altına inmez; diyagram ölçeği hiçbir zaman 1'in altına inmez (sığmıyorsa dikeye dön, küçültme).
3. **ŞÜPHELİ ve DOĞRULANMADI atlanamaz.** Kapatılmaz, daraltılmaz, "ayrıntı"ya gömülmez, kaydırınca kaybolan yere konmaz.

## 1. Dosyalar ve kullanım

| Dosya | Ne | Kim yazar |
|---|---|---|
| `src/tokens.css` | Tüm renk, yazı, aralık, çizgi tokenları (`build.py` en başa gömer) | yalnız `sanat-yonetmeni` |
| `DESIGN.md` | Bu belge; token ve kontrast tabloları `kontrast.mjs --yaz` ile üretilir | yalnız `sanat-yonetmeni` |
| `test/referans.html` | Bütün bileşenlerin canlı örneği + **simge kaynağı** (`<symbol>` blokları) | yalnız `sanat-yonetmeni` |
| `test/kontrast.mjs` | Kontrast / yapı denetimi (çıkış kodu ≠ 0 = hata) | yalnız `sanat-yonetmeni` |

- Çizim ve arayüz **yalnız `var(--...)`** kullanır; `#hex`, `rgb()`, sabit `px` renk/yazı değeri yazmaz. Yeni bir değer gerekiyorsa yöneticiye bildir, token eklenir.
- Bilerek kullanılmayan CSS (eski Android Chrome/WebView): `light-dark()`, `color-mix()`, `:has()`, iç içe CSS, `@layer`, `dvh`. `rem` ve `min()/clamp()` serbest.
- `<html lang="tr">` şart. **Büyük harfli etiketler CSS `text-transform` ile değil doğrudan büyük harfle yazılır** (`ŞÜPHELİ`); aksi halde `i` → `I` olur (referans sayfası §10).
- `<meta name="viewport" content="width=device-width, initial-scale=1">`; `user-scalable=no` **yok** (gözü zayıf usta sayfayı büyütebilsin).
- Dokunmatikte `hover` yok: bilgi hover'a bağlanmaz.

## 2. Tema

`<html data-tema="acik|koyu">`. Öznitelik yoksa telefonun karanlık/aydınlık ayarı geçerli, ayar bilgisi yoksa **koyu**.

**Karar:** sistem tercihi izlenir (sinyal yoksa koyu); başlıkta **her zaman görünen, iki seçenekli** (Koyu | Açık) bir tema düğmesi bulunur; tercih `localStorage`'a yazılır (her erişim `try/catch`), yazılamıyorsa uygulama yine çalışır. Kullanıcı hiç seçmediyse `data-tema` **yazılmaz**.

**Gerekçe**
- **Koyu tema atölye / kanal / motor bölmesi için doğru başlangıç:** yer loş, yapay ışıklı; tam ekran beyaz göz kamaştırır, ekran parlaklığını düşürmek gerekir. Siyah zemin pil de harcamaz.
- **Güneşte açık tema daha iyi:** koyu ekran aynalaşır (siyah alanda gökyüzü ve yüz yansır), açık zemin yansımayı gizler. Aşağıdaki benzetimde (yansıma = %30 beyaz örtü) açık tema ana metinde koyunun biraz önünde; fark küçük, ikisi de okunur kalıyor.
- Tek doğru tema yok → ikisi de **aynı sıkı kurala** uyar (gövde metni ≥ 7:1, çizgi ≥ 3:1), biri varsayılan, diğeri tek dokunuş uzakta.
- **Zeminler parlamaz:** saf `#FFF` ya da `#000` yok. Koyu `--zemin` `#0E1216` (hafif mavimsi kömür), açık `--zemin` `#EEECE7` (sıcak kâğıt); metinler `#F3F5F7` / `#12161B`. Saf siyah üstünde saf beyaz ince yazı "ışıma" yapar, parlak beyaz zemin loş yerde göz alır.
- `<meta name="theme-color">`: koyu `#0E1216`, açık `#EEECE7` (tema değişince JS günceller).
- Tema düğmesi tek tuşlu "değiştir" olmaz (hangi durumda olduğu belli olmaz). Seçili seçenek **dolgu + onay simgesi + kalın yazı** ile belli.

### Güneş benzetimi (bilgi)

<!-- GUNES:BASLA -->
| Çift | Koyu | Açık | Eşik |
|---|---:|---:|---:|
| Ana metin (`--yazi` / `--yuzey`) | 6,0 | 6,4 | ≥ 4,5 |
| İkincil metin (`--yazi-2` / `--yuzey`) | 4,8 | 4,7 | ≥ 4,5 |
| İpucu, yer tutucu, pasif (`--yazi-pasif` / `--yuzey`) | 3,6 | 3,4 | ≥ 3 |
| Çerçeve, ayırıcı (`--cizgi` / `--yuzey`) | 2,9 | 2,8 | bilgi |
| Kablo çizgisi (`--cizgi-guclu` / `--yuzey`) | 4,0 | 4,0 | ≥ 3 |
| Pin numarası kutusu (`--ters-yazi` / `--ters-zemin`) | 6,6 | 6,4 | ≥ 4,5 |
| ŞÜPHELİ (`--supheli-yazi` / `--supheli-zemin`) | 4,5 | 4,5 | ≥ 4,5 |
| ÇELİŞKİLİ (`--hata-yazi` / `--hata-zemin`) | 5,3 | 4,9 | ≥ 4,5 |
| DOĞRULANMADI (`--dogrulanmadi-yazi` / `--dogrulanmadi-zemin`) | 4,8 | 4,9 | ≥ 4,5 |

Örtü: %30 beyaz (yansıma benzetimi). "bilgi" satırları hata saymaz; eşiği olanlar sağlanmak zorunda.
<!-- GUNES:BITIS -->

Referans sayfasındaki "Güneş" düğmesi aynı örtüyü ekrana uygular.

## 3. Renk

Anlam kuralları:

- Yüzeyler üç kat: `--zemin` (sayfa) < `--yuzey` (kart, panel, **diyagram zemini**) < `--yuzey-ust` (girdi, çip, etiket zemini). Basılı: `--yuzey-basili`. Seçili: `--secili-zemin` + `--vurgu` çerçeve.
- `--vurgu` (mavi) yalnız **etkileşim**: ana düğme, seçili sekme/segment, bağlantı (`--yazi-vurgu`). Uyarı için kullanılmaz.
- Durum renkleri yalnız kendi anlamı için: **amber = ŞÜPHELİ**, **kırmızı = ÇELİŞKİLİ / hata**, **mor = DOĞRULANMADI**, **yeşil = DOĞRULANDI**, **gri-mavi = ŞEMA NOTU**. Cihaz türü tonları bunlardan **sönük** tutuldu: tür rengi yalnız çerçeve ve hafif dolgu, durum rengi dolgu + kalın çerçeve + simge.
- Kablo renkleri (`--kablo-ws … --kablo-rs`) **gerçek** renk, temaya göre değişmez; hep 2 px `--cizgi-guclu` kenarlı ve yanında yazılı kısaltmayla (siyah koyu zeminde, beyaz açık zeminde kaybolmasın).
- Eşikler: gövde metni ≥ 7:1 · hiçbir metin < 4,5:1 (ipucu / yer tutucu / pasif için eşik 4,5; şu an 6,5 üstü) · çizgi ve simge ≥ 3:1 (çizim çizgileri ≥ 7:1, durum ve tür çerçeveleri ≥ 4,5:1 hedeflendi).
- `opacity` ile soluklaştırma yok (kontrast hesabı bozulur); pasif için `--yazi-pasif` + kesikli çerçeve.

<!-- TOKENLAR:BASLA -->
**Yüzey, metin, çizgi, vurgu**

| Token | Koyu | Açık | Kullanım |
|---|---|---|---|
| `--zemin` | `#0E1216` | `#EEECE7` | sayfa zemini |
| `--yuzey` | `#161B21` | `#F8F7F4` | kart, panel, diyagram zemini |
| `--yuzey-ust` | `#1F262E` | `#FDFCFA` | girdi alanı, çip, etiket zemini |
| `--yuzey-basili` | `#28323D` | `#E2DFD8` | basılı satır / yüzey |
| `--yazi` | `#F3F5F7` | `#12161B` | ana metin |
| `--yazi-2` | `#CDD4DB` | `#2B343E` | ikincil metin |
| `--yazi-pasif` | `#A3ADB8` | `#4A545F` | ipucu, yer tutucu, devre dışı |
| `--cizgi` | `#8791A0` | `#5F6873` | çerçeve, ayırıcı, tablo çizgisi |
| `--cizgi-guclu` | `#AEB9C5` | `#3A444F` | diyagram çizgisi, kablo, kablo şeridi kenarı |
| `--ters-zemin` | `#F3F5F7` | `#12161B` | ters çift: pin numarası kutusu |
| `--ters-yazi` | `#0E1216` | `#F8F7F4` | ters çift: yazı |
| `--vurgu` | `#5AA9FF` | `#0B4FA8` | ana düğme, seçili sekme dolgusu |
| `--vurgu-yazi` | `#07121F` | `#FDFCFA` | vurgu dolgusu üstündeki yazı |
| `--vurgu-basili` | `#8CC4FF` | `#083A80` | basılı ana düğme |
| `--yazi-vurgu` | `#8CC4FF` | `#083C80` | bağlantı ve vurgulu metin |
| `--secili-zemin` | `#19304B` | `#D6E4F6` | seçili satır dolgusu |
| `--odak` | `#FFD84D` | `#8A3A00` | odak halkası |
| `--golge-kaplama` | `0 8px 24px rgba(0, 0, 0, 0.6)` | `0 8px 24px rgba(18, 22, 27, 0.28)` | yalnız açılır katman (menü, alt sayfa) |
| `--ortu` | `rgba(0, 0, 0, 0.6)` | `rgba(18, 22, 27, 0.55)` | katman arkası karartma |

**Durum etiketleri**

| Token | Koyu | Açık | Kullanım |
|---|---|---|---|
| `--supheli-zemin` | `#FFB020` | `#FFB020` | ŞÜPHELİ dolgusu (düz kehribar) |
| `--supheli-yazi` | `#1A1100` | `#1A1100` | ŞÜPHELİ yazısı ve simgesi |
| `--supheli-cizgi` | `#FFB020` | `#4A2C00` | ŞÜPHELİ çerçevesi |
| `--hata-zemin` | `#5E1017` | `#73151A` | ÇELİŞKİLİ / hata dolgusu |
| `--hata-yazi` | `#FFF1F1` | `#FFF6F6` | ÇELİŞKİLİ / hata yazısı |
| `--hata-cizgi` | `#FF7B7B` | `#4F0B0F` | ÇELİŞKİLİ / hata çerçevesi |
| `--dogrulanmadi-zemin` | `#2A1D47` | `#EDE3FF` | DOĞRULANMADI dolgusu |
| `--dogrulanmadi-yazi` | `#E9DEFF` | `#34176B` | DOĞRULANMADI yazısı |
| `--dogrulanmadi-cizgi` | `#B999F5` | `#6A3FC0` | DOĞRULANMADI çerçevesi |
| `--dogrulandi-zemin` | `#0F3321` | `#D5F2DF` | DOĞRULANDI dolgusu |
| `--dogrulandi-yazi` | `#C4F5D6` | `#0A3A1B` | DOĞRULANDI yazısı |
| `--dogrulandi-cizgi` | `#4CD27A` | `#166B38` | DOĞRULANDI çerçevesi |
| `--not-zemin` | `#1C2A3B` | `#DCE6F2` | ŞEMA NOTU dolgusu |
| `--not-yazi` | `#D3E1F2` | `#1B2F4A` | ŞEMA NOTU yazısı |
| `--not-cizgi` | `#9DB4D0` | `#3C5A80` | ŞEMA NOTU çerçevesi |

**Cihaz tonları**

| Token | Koyu | Açık | Kullanım |
|---|---|---|---|
| `--ton-mavi` | `#6FA8F0` | `#2563B8` | beyin tonu |
| `--ton-mavi-zemin` | `#263446` | `#D8E1EB` | beyin dolgusu |
| `--ton-turkuaz` | `#4FC4B5` | `#0B7568` | sensör tonu |
| `--ton-turkuaz-zemin` | `#20393C` | `#D4E4DF` | sensör dolgusu |
| `--ton-celik` | `#A7B3C0` | `#4F5D6A` | soket, düğüm, direnç, diyot, diğer tonu |
| `--ton-celik-zemin` | `#30363E` | `#DFE0DF` | çelik dolgusu |
| `--ton-gul` | `#F08BB0` | `#B03466` | artı besleme, güç tonu |
| `--ton-gul-zemin` | `#3D2F3B` | `#EDDADF` | gül dolgusu |
| `--ton-turuncu` | `#F0905A` | `#AD4E14` | şalter, röle, sigorta tonu |
| `--ton-turuncu-zemin` | `#3D302B` | `#EDDED2` | turuncu dolgusu |
| `--ton-zeytin` | `#A9C45A` | `#566F0F` | motor, valf tonu |
| `--ton-zeytin-zemin` | `#30392B` | `#E0E3D2` | zeytin dolgusu |
| `--ton-sari` | `#E8C84A` | `#866600` | lamba, ikaz tonu |
| `--ton-sari-zemin` | `#3C3A28` | `#E7E1CF` | sarı dolgusu |
| `--ton-kahve` | `#C49A6C` | `#75502E` | toprak tonu |
| `--ton-kahve-zemin` | `#35322F` | `#E4DED6` | kahve dolgusu |
<!-- TOKENLAR:BITIS -->

Kablo renkleri (tema dışı): `ws` beyaz `#F2F2EE` · `sw` siyah `#17191C` · `rt` kırmızı `#D8212E` · `gn` yeşil `#1E9E45` · `ge` sarı `#F2C200` · `bl` mavi `#2063D0` · `br` kahverengi `#7C4A22` · `gr` gri `#8B9096` · `li` lila `#8B52C4` · `or` turuncu `#F28A0C` · `rs` pembe `#F29BBB`.

### Kontrast tablosu (her iki tema)

<!-- KONTRAST:BASLA -->
| Çift (ön / arka) | Kullanım | Koyu | Açık | Eşik |
|---|---|---:|---:|---:|
| **Metin** | | | | |
| `--yazi` / `--zemin`, `--yuzey`, … (5) | Ana metin | 11,9 | 13,6 | ≥ 7 |
| `--yazi-2` / `--zemin`, `--yuzey`, … (5) | İkincil metin | 8,6 | 9,4 | ≥ 7 |
| `--yazi-vurgu` / `--zemin`, `--yuzey`, … (5) | Bağlantı, vurgulu metin | 7,0 | 8,0 | ≥ 7 |
| `--yazi-pasif` / `--zemin`, `--yuzey`, `--yuzey-ust` | İpucu, yer tutucu, devre dışı | 6,7 | 6,5 | ≥ 4,5 |
| `--vurgu-yazi` / `--vurgu`, `--vurgu-basili` | Ana düğme yazısı | 7,6 | 7,5 | ≥ 7 |
| `--ters-yazi` / `--ters-zemin` | Ters çift (pin numarası kutusu) | 17,2 | 16,9 | ≥ 7 |
| `--supheli-yazi` / `--supheli-zemin` | ŞÜPHELİ yazısı | 10,2 | 10,2 | ≥ 7 |
| `--hata-yazi` / `--hata-zemin` | ÇELİŞKİLİ yazısı | 12,2 | 10,6 | ≥ 7 |
| `--dogrulanmadi-yazi` / `--dogrulanmadi-zemin` | DOĞRULANMADI yazısı | 11,9 | 11,5 | ≥ 7 |
| `--dogrulandi-yazi` / `--dogrulandi-zemin` | DOĞRULANDI yazısı | 11,4 | 10,7 | ≥ 7 |
| `--not-yazi` / `--not-zemin` | ŞEMA NOTU yazısı | 10,9 | 10,7 | ≥ 7 |
| `--yazi` / `--ton-mavi-zemin`, `--ton-turkuaz-zemin`, … (8) | Ana metin, cihaz türü dolgusu (8 ton) | 10,5 | 13,5 | ≥ 7 |
| **Çizgi ve simge** | | | | |
| `--cizgi` / `--zemin`, `--yuzey`, … (5) | Çerçeve, ayırıcı, tablo çizgisi | 4,0 | 4,2 | ≥ 3 |
| `--cizgi-guclu`, `--kablo-cizgi` / `--zemin`, `--yuzey`, `--yuzey-ust` | Diyagram ve kablo çizgisi, şerit kenarı | 7,6 | 8,3 | ≥ 7 |
| `--vurgu` / `--zemin`, `--yuzey`, `--yuzey-ust` | Ana renk (düğme, seçili sekme dolgusu) | 6,2 | 6,5 | ≥ 3 |
| `--odak` / `--zemin`, `--yuzey`, … (5) | Odak halkası | 9,4 | 5,8 | ≥ 3 |
| `--supheli-cizgi`, `--hata-cizgi`, … (5) / `--zemin`, `--yuzey`, `--yuzey-ust` | Durum çerçeveleri (5 durum) | 6,0 | 5,5 | ≥ 4,5 |
| `--ton-mavi`, `--ton-turkuaz`, … (8) / `--zemin`, `--yuzey`, `--yuzey-ust` | Cihaz türü çerçevesi (8 ton) | 5,9 | 4,5 | ≥ 4,5 |

Her satırda **en kötü** çiftin oranı yazılı (aşağı yuvarlanmış). Toplam 92 çift × 2 tema denetlendi; `node test/kontrast.mjs --ayrinti` hepsini tek tek listeler.
<!-- KONTRAST:BITIS -->

## 4. Yazı

Yalnız sistem fontları (dış font yok). `--font-ui`: `system-ui … Roboto … sans-serif` (Android'de Roboto). `--font-kod`: `ui-monospace, "Roboto Mono", … monospace` (Android'de genel `monospace`). **Kod, pin, soket, kablo no, pin adı her zaman `--font-kod`** ile yazılır (`letter-spacing: var(--harf-kod)`, `font-variant-numeric: slashed-zero`).

| Token | px | Kullanım | Ağırlık |
|---|---:|---|---|
| `--boyut-ipucu` | **14** (en küçük) | rozet, dipnot, kaynak satırı, tür etiketi | 400 / 700 |
| `--boyut-govde` | 16 | gövde, düğme, metin özeti, tablo hücresi | 400 / 500 / 700 |
| `--boyut-pin` | **18** | pin, soket, pin adı etiketi (mono), sekme | 700 (soket, pin) · 400 (ad) |
| `--boyut-kod` | 20 | cihaz kodu, kablo no, pin numarası, dolu arama girdisi (mono) | 700 |
| `--boyut-baslik` | 24 | bölüm başlığı, boş durum başlığı | 700 |
| `--boyut-ekran` | 28 | ekran başlığı, cihaz sorgusu başlığı | 700 |
| `--boyut-vurgu` | 34 | kart tepesindeki kablo no (mono) | 700 |

- Satır yüksekliği: `--satir-sik` 1,25 (başlık, kod) · `--satir-tablo` 1,35 (rozet, ipucu, tablo) · `--satir-govde` 1,5 (gövde). Ağırlıklar `--agirlik-normal/orta/kalin` = 400 / 500 / 700 (mono'da yalnız 400 ve 700 var).
- Boyutlar **rem** (1 rem = 16 px): telefonun yazı boyutu ayarına uyar. Diyagramda yazı **ekranda ölçeklenmiş halde** de ≥ 14 px (pin / soket / kod ≥ 18 px) olmalıdır; SVG `viewBox` ölçeği ≥ 1.
- Sayılar Türkçe: kesit `0,75 mm²` (virgül, `mm²` önünde sert boşluk ` `); veri `"0.75"` ise ekranda virgüllenir.
- Kod, pin, kablo no **kısaltılmaz ve kırpılmaz**. Yalnız cihaz adı 2 satıra kadar sarar, sonra `…`; dokununca tam metin.
- **0/O, 1/l/I değerlendirmesi.** Brave/Linux'ta (DejaVu Sans Mono) sıfırın içinde nokta var, `O` boş; `1` bayraklı ve tabanlı, `l` kıvrık kuyruklu, `I` iki çizgili: ayırt ediliyor (referans sayfası §2). Önlemler: (1) bileşen kodlarında `O` harfi hiç yok (A B E F G H K M R S V W X Y Z), kodlar hep büyük harf; (2) `slashed-zero` açık; (3) `--harf-kod` 0,02 em. **Test edilemeyen:** Android'in genel `monospace` fontu (Droid / Noto Sans Mono) bu makinede yok. Telefonda referans sayfasının "karışan karakterler" satırına bakılmalı.

## 5. Aralık, köşe, çerçeve, gölge

| Aralık | `--bosluk-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 |
|---|---|
| **Köşe** | `--yaricap-s` 4 (rozet) · `-m` 8 (düğme, girdi, iç kart) · `-b` 12 (kart, alt sayfa) · `-tam` (sekme çipi) |
| **Çerçeve** | `--cerceve-ince` 1 (yalnız tablo ayırıcı) · `--cerceve` 2 (varsayılan) · `--cerceve-kalin` 3 (beyin çerçevesi, ŞÜPHELİ, seçili, odak halkası) |
| **Yerleşim** | `--kenar` 16 (sayfa kenarı) · `--icerik-azami` 960 · kart dolgusu 16 · kartlar arası 12 |

- **Hiyerarşi gölgeyle değil çerçeve + dolguyla kurulur** (güneşte gölge kaybolur). `--golge-kaplama` yalnız üstte açılan katmanda (menü, alt sayfa, "tam metin" balonu) ve çerçevenin yanında.
- Sayfa kenarı 16 px; yatay kaydırma yalnız sekme şeridinde (`overflow-x:auto`) ve diyagramın kendi yakınlaştırmasında; **sayfa** hiçbir genişlikte yatay kaydırmaz (`scrollWidth ≤ innerWidth`).
- Kırılma noktaları (token değil, `@media`): **≤ 480 px dar** (zincir dikey) · 481–767 orta · ≥ 768 geniş.

## 6. Cihaz türleri: şekil + simge + renk

Her tür **tür işareti** taşır: 40 px (`--tur-boyut`; kartlarda 56 px) kare içinde **çerçeve şekli** + **glif** (simge); yanında **büyük harfli yazı etiketi** (14 px, kalın, `--harf-etiket`). Renk (ton) yalnız çerçeve ve hafif dolgudur. Çerçeve 2,5 / glif 2 birim çizgi, yuvarlak uç ve köşe.

| Tür (`tur`) | Yazı | Çerçeve (şekil) | Glif (simge) | Ton | Kod harfi |
|---|---|---|---|---|---|
| `beyin` | BEYİN | pah (köşeleri kesik kare) | çip | mavi | A |
| `soket` | SOKET | yamuk (D konnektör) | pin delikleri | çelik | X |
| `besleme` | BESLEME | altıgen | bara + artı | gül | X (Verteiler) |
| `guc` | GÜÇ | kapsül (dikey hap) | akü | gül | G |
| `salter` | ŞALTER | paralelkenar | açık kontak | turuncu | S |
| `role` | RÖLE | kemer (üstü yuvarlak) | bobin + kontak | turuncu | K |
| `sigorta` | SİGORTA | hap (yatay) | telli gövde | turuncu | F |
| `toprak` | TOPRAK | kalkan (ucu aşağı) | üç basamaklı çubuk | kahve | W |
| `motor` | MOTOR | daire | M harfi | zeytin | M |
| `valf` | VALF | eşkenar dörtgen | kelebek (iki üçgen) | zeytin | Y |
| `lamba` | LAMBA | daire | çarpı | sarı | E |
| `ikaz` | İKAZ | yuvarlak kare | çan | sarı | H |
| `sensor` | SENSÖR | ok (sağa bakan beşgen) | sinyal yayları | turkuaz | B |
| `direnc` | DİRENÇ | dikdörtgen (keskin) | zikzak | çelik | R |
| `diyot` | DİYOT | dikdörtgen (keskin) | üçgen + çubuk | çelik | V |
| `dugum` | DÜĞÜM | çerçevesiz: nokta + dallar | Y dal | çelik | Z |
| `diger` | DİĞER | yuvarlak kare | üç nokta | çelik | tanınmayan |
| `devam` | DEVAM | ok (sağa bakan beşgen) | duvara ok | çelik | uç türü: kablo başka şemaya / cihaza gidiyor |

- **Hiçbir iki tür yalnız renkle ayrışmaz:** 18 glifin ve 18 yazı etiketinin hepsi farklı; çerçeve şekli ortak olan çiftler (motor/lamba, direnç/diyot, ikaz/diğer, sensör/devam) glifle ve yazıyla ayrışır. Referans sayfası §4'teki "renksiz sınama" ve "Gri / körlük" düğmeleri bunu gösterir.
- Uç türü eşlemesi: `uclar[].tur` `cihaz` → cihazın `tur`u · `soket` (ara soket) → `soket` işareti · `dugum` → `dugum` · `devam` → `devam`. Cihaz `varyant` ise işaretin çerçevesi **kesikli** (`stroke-dasharray: var(--kablo-kesik)`) + yazıya "VARYANT" rozeti.
- **Düğüm kartı:** işaret · tür etiketi (14 px) · kod (20 px mono kalın) · ad (16 px, ≤ 2 satır) · pin kapsülü. Dokunma hedefi satırın tamamı (≥ 56 px); sağ üstte `›` simgesi (dokununca o cihazın sorgusuna geçilir). Beyin kartı **3 px** `--tur-beyin` çerçeveli, diğerleri 2 px `--cizgi-guclu`.
- **Simgelerin kaynağı** `test/referans.html` içindeki gizli sprite (`<symbol id="t-beyin">` … 18 tür; `i-…` durum ve arayüz simgeleri, 24 × 24, 2 birim çizgi, `currentColor`). `diyagram-motoru` / `arayuz` oradan **aynen** kopyalar. **Öneri (iki kopya olmasın):** sprite'ı `diyagram-motoru` tek yerde tutsun (`src/diyagram/` içinde SVG metni olarak, `KB.diyagram` üzerinden verilsin), `arayuz` açılışta bir kez gövdeye eklesin; çizim testleri de aynı kaynağı kullansın.

  ```html
  <svg class="tm t-beyin" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><use href="#t-beyin"/></svg>
  ```
  ```css
  .tc{fill:var(--t-zemin);stroke:var(--t-cizgi);stroke-width:2.5;stroke-linejoin:round}   /* çerçeve */
  .tg{fill:none;stroke:var(--yazi);stroke-width:2;stroke-linecap:round;stroke-linejoin:round} /* glif */
  .tf,.tn{fill:var(--yazi);stroke:none}
  .t-beyin{--t-cizgi:var(--tur-beyin);--t-zemin:var(--tur-beyin-zemin)}   /* her tür için bir satır */
  ```
  **Dikkat (denendi):** `<use>` içindeki öğeler ata-bağımlı seçiciyle (`.kap .tc`) boyanmaz; yalnız ata-bağımsız sınıf seçicisi (`.tc`) ve `<svg>`/`<use>` üzerinde verilen değişkenler çalışır.

## 7. Kablo çizgisi

| Ne | Çizim |
|---|---|
| **Düz** (renk yazmıyor) | 3 px (`--kablo-kalinlik`), `--kablo-cizgi` |
| **Renkli** | **tüp**: 9 px (`--kablo-tup`) dış `--cizgi-guclu` + 5 px (`--kablo-ic`) iç `--kablo-<renk>`; iki renkli (`sw/rt`): ana renk üstünde 45° çapraz çizgi (10 px periyot, 4 px iz rengi) |
| **Varyant** | aynı çizim, `stroke-dasharray: var(--kablo-kesik)` (10 6) + etikette `VARYANT` simgesi/yazısı |
| **Şema notundan** (renk/kesit kabloda yazmıyor) | çizgi **düz** (renk uydurulmaz); etiketin alt satırı **"not bandı"**: `--not-*` dolgu + 2 px çerçeve + not simgesi + `ws · 0,75 mm²`; metinde "(şema notu)" |
| **ŞÜPHELİ** | etiket çipi düz amber, 3 px çerçeve, ünlem üçgeni simgesi |
| **Tanınmayan renk kısaltması** | nötr (`--yazi-pasif`) şerit, kısaltma olduğu gibi yazılır |
| **Numarasız** (`70sw`) | etiket olduğu gibi (`70sw`), numara satırında |

- **Etiket çipi** telin **ortasında**, telin üstünü örter (`--yuzey-ust` dolgu, 2 px `--cizgi` çerçeve, köşe 4): üst satır kablo no (20 px mono kalın), alt satır renk şeridi (36 × 14, kenarlı) + **yazılı kısaltma** + kesit (14 px). Çipin çevresinde ≥ 8 px boşluk; tel çip + 2 × 24 px'ten kısaysa çip telin üstüne oturur.
- Dikey zincirde (dar ekran) tel **sol omurgadır**: 48 px'lik sütunun ortasında dikey çizgi, çip sağında; tel en az 76 px.
- Çizim üstündeki bütün yazılar `paint-order: stroke` ile `--yuzey` renkli 4 px halo alır; çizgi yazının üstünden geçmez.
- Renk şeridi çipi (HTML): 36 × 14 hap, 2 px `--cizgi-guclu` kenar, yanında mono kalın 18 px kısaltma. Tam ad ("siyah-kırmızı") metin özetinde ve dokununca.

## 8. Pin rozeti

`[soket simgesi] SOKET │ PIN │ pin adı` tek hap: dış çerçeve 2 px `--cizgi-guclu`, köşe 8, `--yuzey-ust` zemin.

- **Pin numarası ters renkli kutuda** (`--ters-zemin` / `--ters-yazi`, 20 px mono kalın): en çok aranan bilgi o. Soket adı 18 px mono kalın, **önünde soket simgesi** ("15" gibi bir soket adı pin sanılmasın). Pin adı 18 px mono normal.
- Ara soket: `X99.1 │ 4`. Soketsiz cihaz ucu: yalnız ters kutu (`B+`).
- **`?` her yerde işaretlenir:** `?` karakteri amber çipte (`--supheli-zemin` dolgu, `--supheli-yazi`, 2 px `--supheli-cizgi` halka). Okunamayan değer içeren kapsül ŞÜPHELİ rozetiyle birlikte gösterilir.
- Kapsül **kırpılmaz**: sığmazsa pin adı kapsülün **ikinci satırına bütün halde** iner (`flex-wrap:wrap`; ancak satırdan uzunsa `overflow-wrap:anywhere`), soket ve pin kutusu sabit kalır. Dar kapta kapsül tam genişliğe yayılmaz, sola yaslı içerik kadar durur.
- **Pin listesi satırı** (cihaz / soket sorgusu): soket başlık bandı (`--yuzey-ust`, üst/alt 2 px çizgi, soket 18 px mono kalın, sağda "N pin") + satırlar: solda pin kutusu, ortada pin adı (18 px mono kalın) ve altında `kablo 9999 → 98K03 · soket P4-5 · pin 3` (16 px; kodlar mono kalın), sağda `›`. Satır ≥ 56 px.

## 9. Durum etiketleri

Her durum: **simge + büyük harfli yazı + çerçeve**. İki biçim: **rozet** (satır içi: 28 px+, simge 20 px, yazı 14 px kalın, `--harf-etiket`) ve **şerit** (kart tepesi: simge 28 px, başlık 16 px kalın + 1–2 cümle).

| Durum | Yazı | Simge | Görünüş | Ne zaman |
|---|---|---|---|---|
| **ŞÜPHELİ** | `ŞÜPHELİ` | ünlem üçgeni | **düz amber dolgu**, 3 px çerçeve, koyu yazı; şeritte solda **tehlike şeridi** (45° amber/koyu) | `suphe` kaydı var ya da değerde `?` |
| **ÇELİŞKİLİ** | `ÇELİŞKİLİ` | `≠` | koyu kırmızı dolgu, 3 px parlak kırmızı çerçeve, açık yazı | `celiski:true` |
| **DOĞRULANMADI** | `DOĞRULANMADI` | kesikli daire içinde kesikli onay | mor ton dolgu, 2 px mor çerçeve | şemanın `dogrulandi:false` bayrağı |
| **DOĞRULANDI** | `DOĞRULANDI` | dolu onay | yeşil ton, 2 px çerçeve (sakin) | `dogrulandi:true` (etiket zorunlu değil) |
| **ŞEMA NOTU** | `ŞEMA NOTU` | not sayfası | gri-mavi ton, 2 px çerçeve | renk/kesit şema notundan |
| **VARYANT** | `VARYANT` | kesikli kare + artı | şeffaf, **kesikli** 2 px çerçeve | kesikli çizilmiş kablo/cihaz |

- **Şiddet sırası** (görsel ağırlık): ŞÜPHELİ ≈ ÇELİŞKİLİ (yüksek, düz dolgu) > DOĞRULANMADI (orta, ton dolgu) > ŞEMA NOTU ≈ DOĞRULANDI ≈ VARYANT (düşük). DOĞRULANMADI her sonuçta görüneceği için bilerek ŞÜPHELİ kadar yüksek **değil**: her şey bağırırsa hiçbiri duyulmaz.
- **Sonuç kartında sıra:** (1) DOĞRULANMADI şeridi (şema başına; birden çok şemadan geliyorsa her biri) → (2) başlık: tür etiketi + büyük kod + rozetler → (3) özellik satırı (renk çipi, kesit; not bandı ayrı) → (4) ŞÜPHELİ / ÇELİŞKİLİ şeritleri **nedeniyle** → (5) çizim → (6) METİN özeti → (7) kaynak satırı (kitap simgesi, 14 px: PDF adı · sayfa · yol/satır).
- ŞÜPHELİ iki yerde birden görünür: kartın tepesinde (neden cümlesiyle) ve şüpheli ucun / kablonun yanında (rozet + `?` çipleri). Metin özeti de `?` ve "ŞÜPHELİ" taşır.
- Örnek metinler (öneri, kısa ve yalın): ŞÜPHELİ "Şemada net okunamadı: pin 1? (11 mi, 17 mi?). Aracı sökmeden önce şemadan kontrol et." · DOĞRULANMADI "Bu şema henüz kontrol edilmedi. Şemadan teyit et." · ÇELİŞKİLİ "İki şemada bu kablo farklı yerlere gidiyor. İkisi de gösteriliyor; şemadan teyit et."
- Dokunma ve gizleme: şeritlerde kapatma düğmesi yok; kart daraltılsa bile şeritler görünür kalır.
- **Kesikli çizgi = "kesin değil / koşullu"**: kablo ve kutu varyantı (diyagramda) ve pasif düğme (arayüz kromunda). Bu iki kullanım aynı ekranda karışmaz.

## 10. Dokunma, durumlar, hareket

- **Hedef ≥ 48 px** (`--dokunma`): sekme, simge düğmesi, segment seçeneği. **56 px** (`--dokunma-buyuk`): ana düğme, arama alanı, liste ve pin satırı. Hedefler arası ≥ 8 px (`--dokunma-aralik`). Görünür öğe küçük olsa bile dokunma alanı (dolgu) 48 px'e tamamlanır.
- Ana düğme: dolgu `--vurgu`, yazı 16 px kalın, simge solda. İkincil: `--yuzey-ust` + 2 px `--cizgi-guclu`. Sekme: hap, 48 px, yatay kaydırılan şerit; "Tümü" varsayılan.

| Durum | Görünüş (renkten bağımsız ipucuyla) |
|---|---|
| normal | 2 px çerçeve |
| **basılı** | yüzey `--yuzey-basili` (ana düğme `--vurgu-basili`), 1 px aşağı, `--sure-hizli` |
| **odak** | 3 px `--odak` halka, 2 px boşluk (`:focus-visible`; klavye/anahtar erişimi) |
| **seçili** | dolgu (`--vurgu` / `--secili-zemin`) + 3 px çerçeve + kalın yazı + **onay simgesi** + `aria-selected` / `aria-pressed` |
| **pasif** | **kesikli** çerçeve + `--yazi-pasif`, saydamlık yok, dokunmaya yanıt vermez (`disabled`) |

- Hareket yalnız geçiş: `--sure-hizli` (100 ms) basma, `--sure` (180 ms) geçişler, `--egri`. `prefers-reduced-motion: reduce` → iki süre de 0 (tokens.css bunu yapar). Kayan, dönen, yanıp sönen öğe yok.
- Arama alanı: 56 px, 2 px `--cizgi-guclu`; dolu hâlde girdi yazısı mono kalın (kod okunsun); temizle düğmesi 48 px, görünür simge + `aria-label`.
- Boş durum: büyük simge (48 px) + başlık (24 px) + tek cümle + dokunulabilir örnek çipleri (48 px, mono). "Bulunamadı": `“98Z9” bulunamadı` + "Şunu mu demek istediniz?" + öneri çipleri + "Büyük/küçük harf, boşluk ve tire fark etmez."

## 11. Diyagram kuralları (`diyagram-motoru` için kısa liste)

1. **Dar (≤ 480 px): dikey zincir.** Sol 48 px sütun = omurga; düğüm işareti (40 px) omurga üstünde; sağda tür etiketi, kod, ad, pin kapsülü. Tel = omurga parçası (≥ 76 px) + sağında etiket çipi. Zincir tek sütun, yatay kaydırma yok. Dallanma: düğümden sonra her dal solda 3 px `--cizgi-guclu` ayraçla girintilenir, üstünde `DAL n` (14 px kalın).
2. **Geniş (> 480 px): soldan sağa.** Düğüm kartı (işaret + kod + ad) — pin kapsülü kartın tel tarafına yapışık — tel (çip ortada) — kapsül — kart. Sığmayan zincir satır kırar ya da dikeye döner; **ölçek küçültülmez**. Dallanma: düğüm solda ortada, dallar sağa doğru dikey sıralı, her dalın kendi yatay teli (≥ 56 px aralık).
3. **Cihaz sorgusu:** üstte cihaz başlığı (56 px işaret + tür etiketi + kod 28 px + ad); altında soket başlık bantları + pin satırları (§8). 40'a yakın pinli beyinde soket başlığı yapışkan (`position:sticky`).
4. Zemin `--yuzey`; düğüm yazısı `--yazi`; kablo `--kablo-cizgi`; etiket çipi `--yuzey-ust`. Başka renk yok.
5. Her çizim `role="img"` + `aria-label` (= metin özeti). Dokunma: işaret + kod bölgesi ≥ 48 px, bir ucun cihazına dokununca o cihazın sorgusuna geçilir; iki parmakla yakınlaştırma/kaydırma çalışır, **yakınlaştırılmamışken tek parmak sayfayı kaydırır**.
6. Yazılar hiçbir genişlikte (360, 412, 768, 1280) üst üste binmez; çakışma testi otomatik.
7. Bir cihaza / beyne giden **her uçta soket ve pin** (varsa pin adı) yazılıdır; çizim ve `cekirdek.metin` aynı bilgiyi gösterir.

## 12. İyi / kötü örnekler

Görselleri `test/referans.html` §10'da yan yana (üstteki "Güneş" ve "Gri" düğmeleriyle dene).

| Konu | Kötü | İyi |
|---|---|---|
| Pin etiketi | 11 px, gri üstüne gri, orantılı font | 18 px mono, ≥ 7:1, pin numarası ters kutuda, soket simgeli |
| Bilgi ve renk | dört renkli nokta + kod | şekil + glif + yazı etiketi; renk destek |
| Dokunma | 28 px düğmeler 2 px arayla | 48 px hedef, 8 px boşluk |
| ŞÜPHELİ | küçük, gri, italik "(emin değil)" | düz amber şerit + simge + neden; kapatılamaz |
| DOĞRULANMADI | altta, küçük, gri | kartın tepesinde şerit, her sonuçta |
| Kablo rengi | kenarsız, yazısız şerit | 2 px kenarlı şerit + yazılı kısaltma |
| Çizgi üstünde yazı | rakamlar tellerin üstüne biniyor | etiket çipi teli örter, ≥ 8 px boşluk |
| Seçili sekme | zemin tonu biraz farklı | dolgu + kalın yazı + onay simgesi |
| Hiyerarşi | yalnız hafif gölge | 2 px çerçeve (≥ 3:1); gölge yalnız açılır katmanda |
| Büyük harf | `text-transform` + yanlış dil → `ŞÜPHELI` | doğrudan `ŞÜPHELİ`, `lang="tr"` |
| Ölçek | geniş çizim %38 küçültülmüş (yazı ~7 px) | dikey zincir, yazı sabit ≥ 16 px |

## 13. Denetim listesi (`arayuz`, `diyagram-motoru`, `gorsel-elestirmen`)

- [ ] Renk, boyut, yazı tipi yalnız token. `#hex` / `rgb()` / `px` renk-yazı değeri yok.
- [ ] Her cihaz türü işaret + yazı etiketiyle; renk tek başına bilgi taşımıyor (Gri / körlük düğmeleriyle bak).
- [ ] En küçük yazı 14 px; pin / soket / kod ≥ 18 px (ekranda, ölçekten sonra).
- [ ] Hedefler ≥ 48 px, aralar ≥ 8 px; basılı / odak / seçili / pasif tanımlı.
- [ ] ŞÜPHELİ, DOĞRULANMADI, ÇELİŞKİLİ şerit ve rozetleri kapatılamaz; sıra §9'daki gibi.
- [ ] Büyük harfli etiketler doğrudan büyük harfle; `lang="tr"`.
- [ ] 360 px'te sayfa yatay kaydırmıyor; diyagram ölçeği ≥ 1.
- [ ] Koyu ve açık temada aynı ekran bozulmuyor; tema düğmesi başlıkta, iki seçenekli.
- [ ] Gölgeyle hiyerarşi yok; çerçeve + dolgu var.

## 14. Bilinen sınırlar (dürüstlük notu)

- **Android'in genel `monospace` fontunda** sıfır / O ayrımı bu makinede görülemedi (§4). Telefonda `test/referans.html` açılıp bakılmalı; ayrım zayıfsa `--font-kod`a karar verilmiş bir yedek eklenir.
- **Güneş benzetimi** ekrana %30 beyaz örtü koymaktır; gerçek güneş yansıması, parlaklık ve cam yüzey farkını yakalamaz. Asıl sınama: referans sayfasını telefonda güneşte açıp pin kapsülüne, ŞÜPHELİ şeridine ve kablo şeritlerine bakmak.
- **Renk körlüğü benzetimi** sRGB üzerinde yaklaşık matrislerle yapılır (bilgi içindir). Kural yine de renksiz ayrışma: şekil + glif + yazı.
- Glifler 40 px'te küçük; ayrıntılı işaretler (röle, sensör) 40 px altında anlamını yitirir → işaret hiçbir yerde 32 px'in altına inmez, tür her yerde yazıyla da belli.
- İki renkli kabloda zıtlığı düşük çiftler (örn. `ws/ge`) şeritte zor seçilir; bilgi yazılı kısaltmadadır.
