# Görsel eleştirmen raporu — 1. tur

Denetçi: `gorsel-elestirmen` (bağımsız; kod yazmaz). Tarih: 15.10.2026. Ölçüt kitabı: `DESIGN.md`. Puan ölçeği: 1 (kötü) – 5 (çok iyi); "a/k" = açık tema / koyu tema.

**İncelenen sürüm.** `dist/kablo-bulucu.html`'in 15.10 01:11:38 tarihli kopyası (417.092 B, sha256 `38707e53…`, "doğrulama notlu" sürüm): `.gecici/gorsel-elestirmen/tur1/kablo-bulucu.kopya.html`. Çekimden sonra (01:25:24) dist yeniden derlendi (408.941 B, notlar ayıklanmış dağıtım sürümü); bu raporun **görüntü bulguları 01:11 kopyasıdır**, 01:25 sürümüyle hızlı karşılaştırma §C.4'tedir.

**Şüpheli durumu SAHTE VERİYLE.** Gerçek veride şüpheli kayıt yok (`db.istatistik.suphe = 0`). "suphe" durumu (sorgu `9800`) ve ek çelişkili (`9010`), varyant (`9900`), döngülü (`9950`) örnekler, aynı kaynak koddan `.gecici/arayuz/sahte-veri` ile derlenen `tur1/sahte.kopya.html` üstünden alındı. Başka her durum gerçek veridir.

**Görüntüler** (`test/gorsel/tur1/`):
- 56 tam sayfa PNG: `<genişlik>-<tema>-<durum>.png`; genişlik 360 / 412 / 768 / 1280, tema acik / koyu, durum `bos` (açılış), `kablo` (1sw/rt), `uzun` (0027: dallanmayan en uzun zincir, 6 düğüm), `dalli` (4002: 15 düğüm, 2 dal), `beyin` (41A01: 30 pin, 3 soket), `bulunamadi` (ZZ999), `suphe` (9800, SAHTE).
- Ek: `ek-en-uzun-1084-…`, `ek-liste-40-…` (çok sonuçlu liste), `ek-soket-X08.11-…`, `ek-pinadi-D+-…`, `ek-celiskili-9010-…`, `ek-varyant-9900-…`, `ek-dongulu-9950-…` (üçü sahte), `ek-bulunamadi-oneri-41A10-…` ve `-4003-…` ("Şunu mu demek istediniz?" örneği).
- `olcek/olcek175-…_N.png`, `olcek/olcek200-…_N.png`: %175 ve %200 yazı ölçeği (360 px, açık tema), kaydırmalı görünüm dilimleri.
- `olcum.json` (73 vaka otomatik ölçüm), `ilk-ekran.json` ("cevap ilk ekranda mı" ölçümü). Raporda alıntılanan kaydırmalı görünüm dilimleri `dilim/`, kesitler `kesit/` içinde; tüm dilimler (1:1, ekran boyunda) ve sayfa metni dökümleri `.gecici/gorsel-elestirmen/tur1/{dilim,metin}/` altında.
- Araçlar: `test/gorsel/cek.mjs` (çekim), `olcum-sayfa.js` (sayfa içi ölçüm), `ilk-ekran.mjs`, `durumlar.json`. Tekrar çekim: `node test/gorsel/cek.mjs tur2`.

---

## Olcay'a gösterilecekler

Tur 1 olduğu için "3 turda geçmeyen" madde yok; bunlar Olcay'ın kendi telefonunda görüp karar vermesi gerekenler (yönetici ajanlara bırakılırsa tahminle çözülür):

1. **4002 ve 1084 sonucu ("bu kablo nereden nereye?").** Görüntü: `dilim/360-acik-dalli_0.png` … `_4.png`. Zincir bir rölenin 86 pininden başlıyor (verideki sıra), gerçek uçlar (FPS 3 → IV-18 pin 10 HS10; Kapı 2 beyni 42A01; Kapı 1 beyni 41A01 pin 15 EIN2) sayfanın 586–2693 px aralığına yayılmış, METİN özeti 2719 px'te. Soru: önce uçların kısa listesi mi (2–4 satır), sonra yol mu görmek istersin? Başlangıç olarak hangi uç: beyin mi, aradığın numaranın bulunduğu uç mu?
2. **Kelimeler.** DAL, DÜĞÜM (özette "ek noktası"), DEVAM, UÇ AÇIK, "parça", "etiketsiz": ustalar bunları böyle mi söylüyor? Tek terim seçilmeli.
3. **Beyin sayfaları** (41A01 → 360 px'te 19.518 px). Pin listesinin altına her pin için tekrar tekrar çizim konuyor (≈14.200 px). Bu çizim işine yarıyor mu, yoksa "çizimi göster" ile kapalı mı olsun?
4. **Gerçek telefonda bakılacaklar (burada yapılamadı):** Android'in genel monospace fontunda 0/O ve 1/l ayrımı; açık havada güneşte pin kutuları ve ŞÜPHELİ şeridi; Ayarlar → Yazı boyutu en büyükteyken uygulama (benzetimde %200'de "DOĞRULANMADI" kelime ortasından bölünüyor).

---

## A. Puan tablosu

| Ölçüt | 360 a/k | 412 a/k | 768 a/k | 1280 a/k | Dayanak |
|---|:-:|:-:|:-:|:-:|---|
| Okunabilirlik | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | Pin numarası ters renkli kutuda, 20 px kalın mono; hiçbir yazı 14 px altında değil; pin/soket/kod yazıları ≥ 18 px (ölçüm); %30 beyaz örtüde de okunuyor |
| Çakışma | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | Otomatik: 73 vakada üst üste binen yazı 0; gözle de yok. (Kırpılan not bantları ve %200'deki kelime bölünmesi çakışma değil; aşağıda ayrı madde) |
| **Hiyerarşi** | **3 / 3** | **3 / 3** | **3 / 3** | **3 / 3** | Kısa kabloda yön belli (768'de ilk ekranda tam); uzun ve dallı kabloda ("4002", "0027", "1084") ilk ekranda "nereden → nereye" **yok** (2). Ayrıntı: aşağıdaki durum tablosu |
| Tutarlılık | 5 / 5 | 5 / 5 | 4 / 4 | 4 / 4 | DESIGN'a büyük ölçüde uyuyor (18 tür işareti, durum etiketleri, sıra §9, sticky soket başlığı). Sapma: 768/1280'de dallı kablo dikey çiziliyor (§11.2 yan yana ister); not bantları "…" ile kırpılıyor |
| Dokunma | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | 73 vakada < 48 px hedef **0**; en küçük 62 × 48 (tema düğmesi); diyagram düğümleri ≥ 69 px yüksek, tam genişlik. Küçük not: Koyu/Açık parçaları 0 px aralıklı (bitişik) |
| Kontrast | 5 / 5 | 5 / 5 | 5 / 5 | 5 / 5 | En düşük metin oranı 6,53:1 (açık) / 7,67:1 (koyu) (DESIGN eşiği 4,5); %30 beyaz örtü benzetiminde en düşük 3,2:1 (yalnız kesikli pasif sekmeler ve beyaz-mavi seçili düğmeler); amber ŞÜPHELİ her iki temada ve örtüde ayrışıyor |
| Boş ve hata durumları | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | Açılış, "bulunamadı + öneri çipleri", DEVAM/UÇ AÇIK/"soket-pin yazılı değil" hepsi tasarlanmış. Eksik: öneri çıkmayan "bulunamadı"da (ZZ999) çıkmaz sokak: örnek çipi/devam yolu yok |
| Görünüm | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | Profesyonel, sakin, tutarlı. Düşüren: ilk ekranlarda geliştirici notu kutusu (01:11 sürümü), 19.518 px'lik beyin sayfası, geniş ekranda dikey zincirin yanında büyük boşluk |

**Ek ölçütler** (yönetici özellikle sordu):

| Ek ölçüt | Puan | Dayanak |
|---|:-:|---|
| Dil (ustalar için sade mi?) | **3** (01:11 sürümü) | "BEYİN LİSTESİ FARKLI" kutusu, "Açıklama (n)" / "Okuma notları (n)", tel not bantlarında "Yalnız A okudu; B…", "imza 7012a0a4", "ÇEVRİM KAPANIŞI … (kodsuz #3)". 01:25 dist'te büyük kısmı gitmiş (§C.4); tur 2'de yeniden puanlanır |
| Uzun sayfada gezinme | **2** | 4002 = 3.670 px, 1084 = 4.313 px, 41A01 = 19.518 px (360). Özet tepede yok; "başa dön" yok; üst blok (204 px) yapışkan değil; bölüm başlıkları 14 px; beyin sayfasında soket kısayolu yok. Olumlu: pin listesinde yapışkan soket başlığı |
| Yazı ölçeği %175 / %200 (360) | **4** | Yatay taşma 0 px, çakışma yok, hedefler ≥ 48 px, yazılar orantılı büyüyor. Eksi: %200'de "DOĞRULANMADI" kelime ortasından bölünüyor, yer tutucu kesiliyor, üst blok 3 satır (265–272 px), sayfa 1,8–2 kat uzuyor (41A01 = 38.022 px) |

### Hiyerarşi — durum bazında ("cevap ilk ekranda mı?")

Ölçüm: `ilk-ekran.json`. Hücre: diyagramın (cihaz sayfasında pin tablosunun) sayfadaki üst Y'si → ilk ekrandan görünen miktar. Ekran yüksekliği: 360 → 800, 412 → 915, 768 → 1024, 1280 → 800.

| Durum | 360 | 412 | 768 | 1280 | Not |
|---|---|---|---|---|---|
| bos | 5 | 5 | 5 | 5 | Tek soru + gruplu örnek çipleri |
| kablo (1sw/rt) | 759 → 41 px · **3** | 759 → 156 px · **3** | 762–998, **tam görünür** · **4** | 740 → 60 px · **3** | Üst blok 204 px + DOĞRULANMADI şeridi (≈92 px) + başlık + özellik kartı + geliştirici kutusu (≈220 px) zincirin önünde |
| uzun (0027) | 854 → **0** · **2** | 819 → 96 px · **2** | 839 → 185 px · **3** | 839 → **0** · **2** | Dört "parça" kartı (≈390 px) zincirin önünde, zincirdeki etiketleri tekrarlıyor |
| dalli (4002) | 586 → 214 px · **2** | 586 → 329 px · **2** | 579 → 445 px · **2** | 579 → 221 px · **2** | Zincir 2.107 px; **uçlar ilk ekranda yok**, METİN özeti 2719 px'te (%74) |
| beyin (41A01) | pin tablosu 1079 → **0** · **3** | 1079 → **0** · **3** | 944 → 80 px · **3** | 901 → **0** · **3** | Pin satırı "pin → kablo → hedef" iyi; ama pin listesi ilk ekranın dışında (360'ta 1079 px; geliştirici kutusu kalkınca 533 px) |
| bulunamadi | 4 | 4 | 4 | 4 | Açık ve net; yalnız çıkmaz sokak |
| suphe (SAHTE) | 811 → **0** · **3** | 768 → 147 px · **3** | 668–864, **tam görünür** · **4** | 668 → 132 px · **3** | Amber şerit ilk ekranı alıyor (doğru: güvenlik uyarısı önce); zincir hemen altında |

Sayfa yükseklikleri (px): 

| Durum | 360 | 412 | 768 | 1280 |
|---|--:|--:|--:|--:|
| bos | 1009 | 947 | 1024 | 965 |
| kablo | 1549 | 1549 | 1362 | 1340 |
| uzun | 2228 | 2138 | 1885 | 1885 |
| dalli | 3670 | 3492 | 3210 | 3162 |
| beyin | 19518 | 18855 | 15202 | 14343 |
| bulunamadi | 800 | 915 | 1024 | 800 |
| suphe | 1599 | 1532 | 1166 | 1166 |

---

## B. Somut düzeltme listesi (önem sırasıyla)

Biçim: **Dn · önem · iş sahibi** — ne; görüntü; neden; *tur 2 ölçütü*. İş sahipleri: `arayuz` = ekran/kart/metin · `diyagram-motoru` = SVG çizim · `sanat-yonetmeni` = token/DESIGN · `veri/cekirdek` = metin/veri/izleme. Görüntü yolları `test/gorsel/tur1/` altındadır; `dilim/…` (ekran boyunda kaydırmalı görünüm dilimi) ve `kesit/…` (tam sayfa görüntüden kesit) alt klasörlerine alıntılanan örnekler kopyalandı, tamamı `.gecici/gorsel-elestirmen/tur1/dilim/` altında.

### Önem 1 — Hiyerarşi (3), Dil (3), Gezinme (2) puanlarını doğrudan yükseltir

**D1 · P1 · arayuz + veri/cekirdek — "Uçlar" özeti: başlığın hemen altında kablonun uçları.**
- Ne: Kablo sonucunda (özellikle uzun ya da dallı olanlarda: 4002, 1084, 0027) başlıktan sonra 2–4 satırlık "UÇLAR" bölümü: her satır *cihaz kodu · ad · soket · pin (pin adı)*, örn. `41K01 röle · pin 86` / `04A03 FPS 3 · IV-18 pin 10 (HS10)` / `42A01 Kapı 2 beyni · başka şemada` / `41A01 Kapı 1 beyni · soket 15 pin 15 (EIN2)`. Satıra dokununca o cihaza gidilir. Ara soket/şalter/ek noktası "yolda" sayılır, bu listeye girmez. Altında yol (zincir) ayrıntı olarak durur.
- Başlangıç sırası: zincir şimdi verideki sıraya göre rölenin 86 pininden başlıyor (4002). İzleme sırası "aranan numaranın bulunduğu uç" ya da "beyin/kumanda varsa o" olsun; uç düğümlere "UÇ" işareti.
- Görüntü: `dilim/360-acik-dalli_0.png`, `_3.png`, `_4.png`; `dilim/412-acik-dalli_0.png`; `1280-acik-dalli.png` (üst 800 px); sayısal kanıt `ilk-ekran.json` (dalli: diyagram 586 px'te başlıyor, 2.107 px yüksek, METİN 2719 px'te).
- Neden: Usta "bu telin öbür ucu nerede?" diye soruyor; cevap 2.100 px'lik zincirin ve ardından METİN'in içinde. 4002'de ilk ekranda yalnız rölenin 86 pini ve şalter görünüyor. METİN özeti (`→[kablo …]→` biçimi) zaten iyi ve kısa; uçlar özetinin hammaddesi hazır.
- *Tur 2 ölçütü:* 360×800 ve 412×915'te 4002 ve 1084 için tüm uçlar ilk ekranda görünür; ilk ekranda "nereden → nereye" ≤ 4 satırda okunur.

**D2 · P1 · arayuz — Zincirin önündeki blokları küçült ve yeniden sırala.**
- Ne: (a) "KABLO 1sw/rt" başlığı ile hemen altındaki kart aynı numarayı iki kez yazıyor (`360-acik-kablo.png`): tek satırda birleştir (başlık + renk şeridi + kesit), ≈ 100 px kazanç. (b) 0027/4002'de "parça kartları" (4 kart, ≈ 390 px; 4002'de tek kart ≈ 130 px) zincirdeki tel etiketleriyle aynı bilgiyi tekrarlıyor (`dilim/360-acik-uzun_0.png`, `dilim/412-acik-uzun_0.png`, `dilim/1280-acik-uzun_0.png`): zincirin altına al ya da yalnız "4 parça: #2,5-4134 · 2,5rt-4001 · etiketsiz · 4rt-0027" tek satır yap. (c) DOĞRULANMADI şeridi 360'ta başlık + 2 satır metin = 92 px: DESIGN gereği kalkamaz; metin başlıkla birlikte 2 satıra inecek kadar kısaltılabilir (≈ 20 px kazanç; şema adı "Kapı 1:" kalsın).
- Neden: 360×800'de zincir 0027'de 854 px'te, kablo'da 759 px'te, şüpheli'de 811 px'te başlıyor; yani ilk ekranda **hiç** zincir yok / çok az. Üst blok (204 px) + şerit (92 px) zaten ekranın %37'sini alıyor.
- *Tur 2 ölçütü:* 360×800'de `kablo` ve `uzun` için zincir ilk ekranda ≥ 250 px görünür (`ilk-ekran.json` diyagramY ≤ 550).

**D3 · P1 · arayuz — Beyin/cihaz sayfasında "ÇİZİM" bölümünü varsayılan kapalı yap.**
- Ne: 41A01 sayfası 360'ta 19.518 px: pin listesi 5.323'te bitiyor, ardından "ÇİZİM" başlığı (14 px) ve her pin için ayrı dikey zincir geliyor (≈ 14.200 px). Çizimi "Çizimi göster · 30 pin" (56 px düğme) arkasına al ya da pin satırına dokununca yalnız o pinin zinciri açılsın (akordeon). "ÇİZİM"/"METİN" başlıkları 14 px → bölüm başlığı boyutu (24 px). Soket başlıklarına sayfa içi kısayol çipleri: `Soket 9 · 15 · 18`.
- Görüntü: `360-acik-beyin.png` (tam), `kesit/360-acik-beyin_5200.png` (ÇİZİM başlangıcı), `…_9000.png`, `…_18400.png` (sayfa sonu); `412-…`, `768-…`, `1280-…beyin.png` aynı yapı (18.855 / 15.202 / 14.343 px).
- Neden: Ustanın aradığı pin listesinde; altındaki bölüm aynı bilgiyi ≈ 3,3 kat uzunlukta tekrarlıyor, kaydırması imkânsız ve %200 yazıda 38.022 px oluyor. Çizim bölümü silinmesin; ihtiyaç olana açılsın.
- *Tur 2 ölçütü:* 41A01 sayfası 360'ta ≤ 6.500 px (ÇİZİM kapalıyken); soket kısayolları var.

**D4 · P1 · veri/cekirdek + arayuz — Geliştirici/işlem dili: dağıtım sürümünde olmamalı (01:11 kopyasında GÖRÜLEN liste).**
01:25 dist'te (a)–(d) gitmiş görünüyor (§C.4); tur 2'de görüntüyle doğrulanacak. Kalanlar (e)–(h) hâlâ duruyor.
- (a) "BEYİN LİSTESİ FARKLI" kutusu ve rozeti: kablo kartında ≈ 220 px, beyin sayfasında ≈ 530 px ve pin satırlarında 4 rozet (`360-acik-kablo.png`, `dilim/360-acik-beyin_0.png`, `_1.png`, `1280-acik-kablo.png`). Metni: "karşı uç: Beyin Listesi'nde X0809, şemada 42A01 (kalın demet çubuğu → ok). Şema esas alındı; değer Beyin Listesi'ne göre değiştirilmedi."
- (b) "Açıklama (n)" içi: "Beyin Listesi §4.4: 'Hepsi X0809'a gider'… yalnız §4.4 giriş cümlesi uymuyor. Şema değeri değişmedi."
- (c) "Okuma notları (n)" (her kablo/cihaz sonucunun sonunda; `360-acik-kablo.png` altı): "…çubuktan iki ince tel ayrılır…; bu yüzden her tel ayrı 'devam → 42A01' ucuna bağlandı."
- (d) Tel etiketlerindeki not bantları, ayrıca "…" ile kesiliyor: "Yalnız A okudu; B aynı dalı…", "A ve B pin adını ikisi de H13 okud…", "A: ~d1 ↔ X03.20/3; B: 01R02 ↔…", "Dal X03.53/3 soketinin yay…", "A etiketin 2. harfinden (g mi q mu) em…" (`dilim/ek-en-uzun-1084-360-acik_1.png`, `_2.png`, `_3.png`, `kesit/360-acik-beyin_5200.png`). **Dikkat:** "g mi q mu" gibi bir okuma şüphesi gerçekten varsa bu bir ŞÜPHELİ konusudur ve not bandına gömülmemeli (DESIGN §0.3); karar `veri/cekirdek`'te: şüphe ise `suphe` kaydı + rozet, değilse notu kaldır.
- (e) Her ekranın altında "Veri: 2 şema · 57 kablo · 43 cihaz · 22 soket · **imza 7012a0a4**": "imza" işlem kimliği. Yerine "Veri sürümü: 14.10.2026" gibi tarih ya da hiç gösterme.
- (f) "ÇEVRİM KAPANIŞI: ek noktası (kodsuz #3) ↔ ek noktası (kodsuz #1) · Çevrimi kapatan parça; çizilmedi." (`ek-dongulu-9950-360-acik.png`, sahte veri ama metin gerçek kod): "çevrim", "#3" dahili. Usta dilinde: "Bu hat kendine geri dönüyor (ek noktası 3 → 1)".
- (g) "1 parça · Kapı 1" (liste kartları, `dilim/ek-liste-40-360-acik_0.png`) ve "DÜĞÜM" türü: "parça", "düğüm" dahili sözcükler (D13).
- (h) Kaynak satırı: "Kapı 1stromlaufplan.pdf" (dosya adı, boşluksuz yapışık) ve 12 ayrı "yol 23 · satır A" çipi (4002'de ≈ 330 px; `dilim/360-acik-dalli_4.png`). Öneri: "Şema: Kapı 1, sayfa 1 · yol 23, 27, 30, 32 …" tek satır; dosya adı yalnız ayrıntıda.
- Neden: Usta için anlamsız; ilk ekranı ve kablo kartını işgal ediyor; "Dil" 3.

### Önem 2

**D5 · P2 · diyagram-motoru — Ardışık ara soketleri tek satırda grupla (kablo sonucunda).**
- Ne: Cihaz sayfasındaki "ARA SOKET ×2" gruplaması (`kesit/360-acik-beyin_18400.png`) kablo sonucunda uygulanmıyor: 4002'de X08.17 → X08.11, hepsi pin 1, yedi ayrı düğüm × ≈ 113 px ≈ 790 px (`dilim/360-acik-dalli_1.png`, `_2.png`). "7 ara soket: X08.17 → X08.11 · hepsi pin 1 ▸" tek satır (≥ 56 px), açılınca tek tek.
- Neden: 4002 = 3.670 px; grup sayfayı ≈ 700 px kısaltır, dalın uç kısmı (FPS 3 HS10) bir ekran yukarı gelir. İki ekranda iki farklı gösterim de tutarsız.
- *Tur 2 ölçütü:* 4002 ≤ 3.000 px (360).

**D6 · P2 · arayuz + sanat-yonetmeni — "Başa dön" ve yapışkan arama.**
- Ne: Bir ekran aşağı inildikten sonra sağ altta sabit "↑ Başa dön" düğmesi (48 × 48, 8 px kenar boşluğu); üst bloğu (204 px = ekranın %25,5'i) kaydırınca kompakt, yapışkan arama çubuğuna (56 px, yalnız arama alanı) indir. DESIGN'a "uzun sayfa" kuralı yazılsın (D14).
- Görüntü: `dilim/360-acik-dalli_2.png`, `_3.png`, `_4.png`: başlık/arama yok; yeni sorgu için en üste dönmek gerekiyor. `olcum.json`: `sabitOgeler` yalnız pin tablosu soket başlıkları; `bastaDon` = [] (73 vakanın hepsinde).
- Neden: 3.670–19.518 px sayfalarda tek elle gezinme.

**D7 · P2 · arayuz — Sekme şeridinde etkin sekmeler önce gelsin.**
- Ne: Sıra şu an: Tümü · Alternatör – Marş · DMUX · CPC · FPS 1–4 · FPS 5 · FPS 6 · **Kapı 1–4** · SCR; altısı kesikli (şeması henüz eklenmemiş). 360/412'de "Kapı 1–4" sekmesi sekizinci, ekran dışında (x ≈ 796 px); ondan önce 5 etkin olmayan sekme var. Etkin sekmeleri öne al; eklenmemişleri sona ya da tek "Yakında" çipine topla.
- Görüntü: `360-acik-bos.png`, `412-acik-bos.png` (yalnız Tümü ve Alternatör – Marş görünür; üçüncü sekme yarım), `768-acik-bos.png` (2 satıra sarıyor, orada sorun yok).
- Neden: Kapı 1 verisinin (iki şemadan biri) sekmesine ulaşmak için 5 etkin olmayan sekmeyi kaydırmak gerekiyor.

**D8 · P2 · arayuz — %175–200 yazı ölçeğinde kırılmalar.**
- Ne: (a) "DOĞRULANMADI" şerit başlığı kelime ortasından bölünüyor ("DOĞRULANMA" / "DI") — kritik etiket (`olcek/olcek200-360-acik-kablo_0.png`; %175'te sığıyor, `olcek175-360-acik-kablo_0.png`). Etiket sözcüğü hiçbir ölçekte bölünmemeli: şerit simgesi başlığın üstüne alınıp başlık tam genişliği kullansın ya da başlık boyutu bu etikette sınırlansın. (b) Arama alanı yer tutucusu kesiliyor ("Kod, kablo no, s…"; %175'te "…sok"): daha kısa yer tutucu ("Kod · kablo · soket"). (c) Üst blok 3 satır, 265–272 px: büyük yazıda tema düğmesini başlık satırına al ya da blok yapışkan olmasın (D6). (d) Sayfa 1,8–2 kat uzuyor (41A01: 32.657 / 38.022 px) — D3 bunu çözer.
- Görüntü: `olcek/olcek175-360-acik-*_N.png`, `olcek/olcek200-360-acik-*_N.png`.
- Neden: Gözü zayıf usta büyük yazı ayarı kullanır; kırılan etiket güveni sarsar. (Taşma ve çakışma yok: bu güçlü yan.)

**D9 · P2 · diyagram-motoru — Geniş ekranda dallı kablo; tel boyu.**
- Ne: (a) 768/1280'de 4002 ve 1084 dikey zincirde çiziliyor, kartın 768'de ≈ %30'u, 1280'de ≈ %45'i boş (`dilim/768-acik-dalli_0.png`, `_1.png`, `dilim/1280-acik-dalli_1.png`). DESIGN §11.2: dallar sağa doğru yan yana açılsın (DAL 1 | DAL 2 iki sütun) ya da METİN/UÇLAR özeti boş sütuna yerleşsin. (b) Dalsız yatay zincirde (kablo 1sw/rt, suphe) tel yalnız ≈ 16–20 px görünüyor; etiket çipi kartlara dayanıyor, telin rengi (siyah-kırmızı tüp) neredeyse görünmüyor (`768-acik-kablo.png`, `1280-acik-kablo.png`, `768-acik-suphe.png`). Tel ≥ 56 px olsun, çip telin ortasında dursun (DESIGN §7).
- Olumlu karşıt örnek: 0027'de uzun teller yılan düzeninde renkli tüp olarak çok iyi görünüyor (`dilim/768-koyu-uzun_1.png`); kısa teller de aynı kuralı izlemeli.

**D10 · P2 · arayuz — "Bulunamadı"da çıkmaz sokak.**
- Ne: Öneri çıkmayan sorguda (ZZ999, "yağ", "98Z9") yalnız "Benzer bir kayıt bulunamadı." yazıyor (`360-acik-bulunamadi.png`); açılıştaki örnek çipleri (41A01 · 4002 · 1sw/rt …) burada da gösterilsin; "Henüz eklenmemiş şemalarda olabilir" cümlesi alt bilgideki listeyle bağlansın. (Öneri çıkan durum — "Şunu mu demek istediniz?" — çok iyi: `ek-bulunamadi-oneri-41A10-360-acik.png`.)
- Neden: Yazım hatası yapan usta bir sonraki adımı bulmalı; boş ekranda 4 gruplu çip var, hata ekranında yok.

### Önem 3 — cila

**D11 · P3 · arayuz — Yetim sözcükler ve küçük yazı.** Pin satırında renk kısaltması (`ws/rt`) 14 px kalın mono; DESIGN §7 "yanında mono kalın 18 px kısaltma" der (`dilim/360-acik-beyin_1.png`). 360'ta pin satırında "… · soket I-18 · pin" / "4" ayrılıyor (`dilim/360-acik-beyin_1.png`; 412'de sığıyor): "soket I-18 · pin 4" bütün kalsın (`white-space:nowrap` grup). 768/1280'de DEVAM kartında "BAŞKA ŞEMADA · verisi / yok" (`768-acik-kablo.png`, `1280-acik-kablo.png`): kartı genişlet ya da metni kısalt.

**D12 · P3 · arayuz + sanat-yonetmeni — Liste kartları.** Çok sonuçlu listede (`dilim/ek-liste-40-360-acik_0.png` … `_7.png`) 32 kartın hepsinde aynı mor DOĞRULANMADI rozeti var; her kart ≈ 35–40 px kaybediyor. Liste başına tek şerit ("Bu sonuçların hepsi doğrulanmadı") + kartlarda yalnız farklı olanlar (ŞÜPHELİ, ÇELİŞKİLİ) — şerit liste başında kapatılamaz kalır, DESIGN §0.3'ü korur; karar `sanat-yonetmeni`. Ayrıca numara biçimi: "4001" ve "#4002" karışık (`veri/cekirdek`: # ön eki ne anlatıyor, usta "#" ile mi söylüyor?).

**D13 · P3 · veri/cekirdek + arayuz — Terim birliği.** Aynı şey iki isimle: çizimde "DÜĞÜM kodsuz", METİN'de "ek noktası (kodsuz)" (`dilim/ek-en-uzun-1084-360-acik_1.png`, `_5.png`); "DAL 1 · pin 2", "DEVAM", "UÇ AÇIK", "etiketsiz". Olcay'ın seçimi (yukarıda "Olcay'a gösterilecekler" 2) alındıktan sonra tek sözlük.

**D14 · P3 · sanat-yonetmeni — DESIGN.md güncellemeleri.** (a) Uzun sayfa kuralı: tepede özet/uçlar, ≥ 1 ekran sonra "başa dön", ≥ 3.000 px sayfada ayrıntı katlanır. (b) "Uçlar" bileşeni (satır biçimi, UÇ rozeti) ve `ARA SOKET ×N` grubu. (c) §11.2 geniş düzende dallanma: 768/1280'de ne yapılacağı (şu an dikey). (d) Tema düğmesi parçalarının bitişikliği (0 px) §10 "hedefler arası ≥ 8 px" kuralına istisna mı? (e) "Bulunamadı" öneri çıkmayan durumu. (f) Üst blok yüksekliği bütçesi (204 px = %25,5): sekme şeridi ve tema düğmesi için tavan.

---

## C. Geçen / kalan ölçütler, beğenilenler, ölçüm özeti

### C.1 Geçen ve kalan ölçütler (tur 1)

- **Geçen (≥ 4):** Okunabilirlik 5 · Çakışma 5 · Dokunma 5 · Kontrast 5 · Tutarlılık 4–5 · Boş ve hata durumları 4 · Görünüm 4.
- **Kalan (< 4):** **Hiyerarşi 3** (D1, D2; D5 ve D9 yardımcı) · ek: **Dil 3** (D4, D13) · ek: **Uzun sayfada gezinme 2** (D3, D5, D6).
- Tur 2'de yeniden çekilecek: yeni dist (dağıtım sürümü), `sahte.kopya.html` aynı kaynaktan yeniden derlenmiş (`.gecici/gorsel-elestirmen/tur1/veri-kopya` ve `sahte-veri-kopya` klasörleri örnek: `build.py` `cihazlar.json`'u `--veri` klasörüne yazdığı için kopyadan derlenir). Bitiş: her ölçüt ≥ 4.

### C.2 Beğenilenler — bunlar korunmalı

1. **Pin numarası** ters renkli kutuda (siyah üstüne beyaz / koyu temada tersi), 20 px kalın mono, yanında soket simgesi + soket adı: kol mesafesinde ilk okunan şey o (`dilim/360-acik-dalli_1.png`, `360-acik-kablo.png`). Pin satırı "pin kutusu · pin adı · `kablo X → hedef`" biçimi 360'ta bile tek bakışta (`dilim/360-acik-beyin_1.png`); yapışkan soket başlığı (`dilim/360-acik-beyin_2.png`).
2. **ŞÜPHELİ / ÇELİŞKİLİ / VARYANT / DOĞRULANMADI sistemi:** simge + büyük harfli yazı + çerçeve + renk; ŞÜPHELİ beş yerde birden (başlık rozeti, tehlike şeritli amber bant "neden" cümlesiyle, tel çipi, pin kapsülünde `?` çipi, METİN'de `[şüpheli]`), hiçbiri kapatılamıyor ve %30 beyaz örtüde de ayrışıyor (`360-acik-suphe.png`, `ek-celiskili-9010-360-acik.png`, `ek-varyant-9900-360-acik.png`; sahte veri). DOĞRULANMADI şeridi her sonucun ilk satırı.
3. **Boş açılış** (gruplu örnek çipleri: CİHAZ KODU / KABLO NUMARASI / SOKET / ŞEMADAKİ ADLA, 48 px mono) ve **"bulunamadı + Şunu mu demek istediniz?"** çipleri (41A10 → 41A01, 4OO2 → 4002, x0811 → X08.11): `360-acik-bos.png`, `ek-bulunamadi-oneri-41A10-360-acik.png`.
4. **Yılan düzeni** (768/1280'de dalsız uzun zincir): renkli tüp tel, etiket çipi telin ortasında, "satır sonu" dönüşü net (`dilim/768-koyu-uzun_1.png`).
5. **Koyu / açık tema** ikisi de aynı kuralla sıkı; tema düğmesi iki seçenekli, seçili olan dolgu + onay + kalın yazı (360'ta metinli, ≥ 768'de simgeli). Güneş benzetiminde ("%30 beyaz örtü") pin kutuları, kablo çizgisi ve amber şerit seçilebiliyor.
6. **Sağlam temel:** hiçbir yazı 14 px altında değil; hedefler ≥ 48 px (73 vakada ihlal 0); %200 yazıda yatay taşma yok; konsol hatası yok; tek dosya çevrimdışı.
7. **METİN özeti** (`Kablo 4002 · 41K01 pin 86 →[kablo etiketsiz]→ 41S29 (şalter) pin 2–1, 2 dal …`): ok gösterimli, usta dilinde, ekran okuyucuya da veriliyor (`aria-label`). D1'in hammaddesi.
8. **Diyagram düğümlerinin dokunma alanı** geniş (tam genişlik, 69–120 px yüksek), `aria-label` "Cihaz 41A01, Kapı 1 beyni sorgusunu aç" biçiminde; yeniden yükleme sorguyu koruyor (`history.state`).
9. **Dürüst eksik şema bilgisi:** alt bilgide "Şeması eklenmiş / Henüz eklenmemiş", sekmelerde kesikli pasif sekmeler, zincir ucunda "DEVAM · BAŞKA ŞEMADA · verisi yok", "UÇ AÇIK · öbür taraf şemada yok", "soket/pin şemada yazılı değil": kullanıcıya uydurma bilgi verilmiyor.

### C.3 Otomatik ölçüm özeti (`olcum.json`, 73 vaka; 56 çekirdek + 7 ek + 10 yazı ölçeği)

| Ölçüm | Sonuç |
|---|---|
| Yatay kaydırma (`scrollWidth ≤ innerWidth`), 360 dahil | **0 / 73** vakada taşma; %175 ve %200'de 0 px |
| Dokunma hedefi < 48 px (`getBoundingClientRect`) | **0 / 73**; en küçük 62 × 48 (Koyu); 19–29 hedef/sayfa (41A01'de 216); diyagram düğümleri `g[role=link]` 69–120 px yüksek |
| Hedefler arası < 8 px | Koyu/Açık parçaları bitişik (0 px, parça düğmesi); pin satırları bitişik (≥ 56 px, ayraç çizgili); arama alanı içindeki "temizle" düğmesi (4 px, iç içe). Diğer çiftlerde ihlal yok |
| Konsol hatası / uyarısı | **0 / 73** (`p.errors`, `Log` hata girdileri) |
| En küçük yazı | 14 px (rozet, kaynak satırı, "N pin", ipucu); %175'te 24,5 px, %200'de 28 px |
| Pin/soket/kod ≥ 18 px | Diyagramda (SVG) ihlal yok. HTML'de mono < 18 px: METİN özeti ve pin satırı alt metni kodları (16 px, DESIGN §8 izinli), kaynak çipleri (14 px); **sapma:** pin satırında renk kısaltması (`ws/rt`) 14 px (DESIGN §7: 18 px) → D11 |
| Üst üste binen yazı | **0** (kapalı `<details>` ve ekran okuyucu metinleri hariç); gözle de yok |
| Kontrast, en düşük metin | açık **6,53:1**, koyu **7,67:1** (DESIGN eşiği 4,5); 7 altında kalan tek öğe: kesikli pasif sekmeler (açık temada 6,53:1) |
| Kontrast, %30 beyaz örtü | en düşük 3,23:1 (açık: kesikli pasif sekmeler), 3,63:1 (koyu: "Açıklama (n)" bağlantısı; dağıtım sürümünde yok); seçili düğmeler (beyaz-mavi, "Tümü", "Açık") 3,8:1 |
| Yapışkan öğe | yalnız pin tablosu soket başlıkları (31 vaka); üst blok yapışkan değil; "başa dön" yok (73/73) |
| İnce yazı (ağırlık ≤ 400, < 16 px) | yalnız ipucu satırları ("N sonuç", "Büyük/küçük harf, boşluk ve tire fark etmez.") |
| Dil taraması (`undefined`, `null`, `NaN`, `emin:false`, `VERI-MODELI` vb.) | Yok. Bulunanlar: "Beyin Listesi" (kablo ×2, 41A01 ×6), "BEYİN LİSTESİ FARKLI", "Okuma notları", ".pdf" dosya adı, "DÜĞÜM", "parça", "imza" (D4, D13) |

### C.4 Güncel dist (15.10 01:25:24) ile hızlı karşılaştırma (360 px, metin ve konum taraması; görüntü doğrulaması tur 2'de)

`tur1/kablo-bulucu.dist-0125.html` (408.941 B) 01:11 kopyasıyla aynı sorgularla tarandı:

| Sorgu | 01:11 kopyası | 01:25 dist |
|---|---|---|
| 1sw/rt | 1549 px, diyagram 759 px'te | 1221 px, diyagram **526 px**'te; "Beyin Listesi", "Okuma notları", `details` yok |
| 4002 | 3670 px, diyagram 586 px | **aynı** (3670 / 586): D1, D2, D5 hâlâ geçerli |
| 41A01 | 19518 px, pin tablosu 1079 | 18606 px, pin tablosu **533**; ÇİZİM bölümü duruyor (D3 geçerli) |
| 1084 | 4313 px | 3856 px; "A okudu / B okudu", "g mi q mu", "§" metinleri yok; "…" ile kırpılan not bandı yok |

Yani geliştirici dili (D4 a–d) dağıtım sürümünde ayıklanmış; kalanlar: `.pdf` dosya adı + 12 "yol" çipi, "DÜĞÜM", "~ işareti: yer yaklaşık" kaynak notu, "parça". Hiyerarşi ve gezinme sorunları (D1, D2, D3, D5, D6) dağıtım sürümünde **aynen** duruyor.

### C.5 Yöntem, kapsam ve sınırlar (dürüstlük notu)

- **Kapsam.** 56 görüntünün 56'sına `Read` ile bakıldı (hepsinin ilk ekranı; çoğu 1–2 dilim ya da tam sayfa). Uzun sayfalar: 360 açık `dalli` 5/5 dilim, `uzun` 3/3, `beyin` dilim 0–2 + üç kesit (ÇİZİM'in ≈ 14.200 px'inin ≈ %15'i; geri kalanı aynı mini zincirin tekrarı); diğer genişlik/temalarda ilk 1–2 dilim, koyu temada her durumun en az bir ekranı. Ek: 1084 6/6 dilim, liste-40 6/8 dilim, soket sorgusu, pin adı sorgusu (2/5 dilim), sahte üç ek durum, %200 için bos/kablo/dalli/suphe, %175 için bos/kablo/suphe dilimleri (%175 dalli/beyin ve %200 beyin ölçüm olarak var, görüntüsüne bakılmadı).
- **Yöntem notu (kendi hatam, düzeltildi):** (1) Uygulama son sorguyu `history.state`'ten geri yüklüyor; aynı URL'ye gitmek durumu korur: çekim her vakada `about:blank` üzerinden temiz açıyor. (2) `Page.captureScreenshot`'ın `captureBeyondViewport` kipi `Page.setFontSizes` ayarını sıfırlıyor; ilk yazı ölçeği görüntüleri bu yüzden geçersizdi, atıldı; ölçekli vakalar yükleme öncesi ayarla ve yalnız kaydırmalı dilimle yeniden çekildi.
- **Sahte veri.** Şüpheli, çelişkili, varyant, döngülü örnekler sahte veriyle; bunlar gerçek veride henüz yok. Sahte sürüm eski `.gecici/gorsel-elestirmen/sahte.html` değil, aynı kaynaktan yeniden derlenen kopya (eskisinin arayüzü eskiydi).
- **Gerçek cihaz yok.** Android genel monospace fontu (0/O ayrımı), gerçek güneş yansıması, `deviceScaleFactor` 1 (gerçek telefon 2,6–3), ekran klavyesi çekimde yok; güneş benzetimi = %30 beyaz örtü (DESIGN §14 ile aynı yaklaşım).
- **Otomatik ölçüm sınırı.** SVG metninin kontrast zemini, metinden önce boyanmış şekilden kestirilir (yaklaşık); çakışma ölçümü satır kutularının kesişimine bakar, bir telin yazının üstünden geçmesini bulmaz (gözle bakıldı, rastlanmadı).

### C.6 Tur 2 için geçiş ölçütleri

| Hedef | Ölçüt |
|---|---|
| Hiyerarşi ≥ 4 | 360×800 / 412×915'te 4002 ve 1084'ün uçları ilk ekranda; `kablo`, `uzun` için diyagramY ≤ 550 (`ilk-ekran.json`) |
| Gezinme ≥ 4 | 41A01 ≤ 6.500 px (360); 4002 ≤ 3.000 px; "başa dön" ve soket kısayolu var |
| Dil ≥ 4 | 01:25 dist'te geriye kalan terimler (D4 e–h, D13) giderilmiş; Olcay'ın sözlük kararı uygulanmış |
| Diğerleri | Mevcut 5'ler (Okunabilirlik, Çakışma, Dokunma, Kontrast) düşmesin: tur 2'de aynı otomatik ölçümler (`olcum.json`) sıfır ihlalle geçmeli |
