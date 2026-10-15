# Kablo Bulucu — çalışma talimatı

Bu oturumda **Kablo Bulucu**'yu yapacaksın. Uygulama, metrobüs (Mercedes-Benz CapaCity) elektrik şemalarındaki her kablonun, soketin ve pinin nereden gelip nereye gittiğini telefonda gösterecek. Arıza anında sahada kullanılacak ve atölyedeki ustalara da dağıtılacak.

Çalışma klasörü: `~/Projeler/kablo-bulucu/`. Bütün dosyalar burada olacak.

---

## 1. Ne istiyorum

- **Üstte bir arama çubuğu.** Bir cihaz kodu (örn. `04A02`, `41S01`), kablo numarası (örn. `4002`) ya da soket numarası yazınca sonuç gelsin.
- **Arama çubuğunun altında her sistem için bir sekme.** Arama varsayılan olarak bütün sistemlerde yapılsın, sekme seçilince o sisteme daralsın. Bir sekmeye arama yapmadan girilince o sistemin cihazları ve kabloları listelensin.
- **Sonuç iki şekilde gösterilsin:**
  1. **Çizim:** Kablonun nereden nereye gittiğini şema gibi çizen temiz bir SVG. Ara soketlerden geçiyorsa zincir halinde, birden çok uca dağılıyorsa (düğüm, ek) dallanarak gösterilsin.
  2. **Yazı:** Çizimin altında aynı bilginin düz metni. Biçim örneği (değerler gerçek değil): `Kablo 4002 · FPS 3 (04A03) soket X? pin ?? (HS10) → … → Kapı 1 beyni (41A01) soket X? pin ??`
- **Bir uç bir beyne ya da cihaza bağlanıyorsa hangi soketin hangi pini olduğu mutlaka yazsın.** Şemada pinin adı da varsa (`HS10`, `LI1`, `EIN2` gibi) o da görünsün.
- **Cihaz kodu aranınca** o cihazın soketleri ve pinleri bir tablo halinde gelsin: soket → pin → pin adı → kablo no → karşı uç.
- **Soket aranınca** o soketin pin listesi gelsin.
- Her sonucun altında kaynak referansı olsun: PDF adı, sayfa, şemadaki ızgara/akım yolu numarası. Olcay şemaya dönüp kontrol edebilsin.
- **Görsellik düzgün olacak.** Aşağıdaki görsel ekip bu iş için var.
- **Telefonda çalışacak.** Ustalara dağıtılacak; hepsi Android telefonda, çoğu teknik olmayan kişiler.

---

## 2. Değişmez kurallar

1. **Çevrimdışı, tek HTML dosyası.** Veri, CSS, JS hepsi içine gömülü. CDN, harici font, `fetch` ile veri okuma yok. `file://` ile açılınca eksiksiz çalışmalı.
2. **İnternete konmaz.** Şemalar EvoBus'a ait. Artifact olarak yayınlama, hiçbir servise yükleme, paylaşım linki oluşturma.
3. **Şema görüntüleri uygulamaya gömülmez.** Uygulama kendi temiz çizimini yapar ve kaynak olarak PDF adı + sayfa + ızgara verir.
4. **Doğruluk görsellikten önce gelir.** Bu uygulamaya bakıp araca müdahale edilecek. Okuyamadığın ya da emin olmadığın bir değeri **tahmin etme.** "Şüpheli" diye işaretle, Olcay'a sor.
5. **Kaynak dosyalara dokunma.** PDF'ler salt okunur. Obsidian'daki notlara (Beyin Listesi dahil) hiçbir şey yazma, sadece oku.
6. Arayüz dili **Türkçe**, metinler yalın ve kısa. Cihaz kodları ve şemadaki Almanca pin adları olduğu gibi kalır.
7. Olcay'a bir şey açıklarken teknik jargonu en aza indir. Ne yaptığını ve neyin kendisinden beklendiğini net söyle.

---

## 3. Kaynaklar

**Şemalar:** `~/İndirilenler/Yeni Klasör (1)/`. Toplam 77 EvoBus PDF var. Bunlar taranmış görüntü, **metin katmanı yok.**

> ⚠ **Dosya adları NFD Unicode biçiminde.** Örneğin `Alternatör` diskte `o` + birleşen nokta olarak saklanıyor. Adı elle yazarsan "dosya yok" hatası alırsın. Dosyaları glob ile bul (`Altern*stromlaufplan.pdf`) ya da Python'da `unicodedata.normalize` ile eşleştir.

**İlk etap (sadece bunlar):**

| Sekme | Dosya | Sayfa |
|---|---|---|
| Alternatör – Marş | `Alternatör - Marş Motoru stromlaufplan.pdf` | 1 |
| DMUX | `DMUX stromlaufplan.pdf` + `Kapı Butonu DMUX stromlaufplan.pdf` | 1 + 1 |
| CPC | `CPC stromlaufplan.pdf` | 3 (ilk sayfa kapak) |
| FPS 1–4 | `FPS . 1 - 4 stromlaufplan.pdf` | 3 (ilk sayfa kapak) |
| FPS 5 | `FPS %stromlaufplan.pdf` (adı bozuk, FPS 5 bu) | 1 |
| FPS 6 | `FPS 6 stromlaufplan.pdf` | 1 |
| Kapı 1–4 | `Kapı 1stromlaufplan.pdf`, `Kapı 2/3/4 stromlaufplan.pdf` | 4 × 1 |
| SCR | `SCR stromlaufplan.pdf` | 3 (ilk sayfa kapak) |

Kapak sayfalarında bağlantı yok, sadece künye bilgisi alınır. Diğer şemalar sonra eklenecek, yani veri yapısı yeni şema eklemeye açık olmalı.

**Yardımcı veri (sadece oku):** `~/Belgeler/Obsidian Vault/Araç Elektroniği/Beyin Listesi.md`. İçinde beyin kodları (CPC 10A10, FPS 1–6 04A01–04A06, Kapı 1–4 beyinleri 41A01–44A01, DMUX 61A04 …), Kapı 1 pinleri, alternatör–marş ve aydınlatma tabloları var. Bunu cihaz adları için ve çıkarılan veriyi karşılaştırmak için kullan. **Şemanın yerine geçmez:** çelişki çıkarsa şema esastır, çelişki de şüpheliler listesine yazılır.

**Araçlar:** `pdftoppm`, `pdfinfo`, `python3`, `node` kurulu. `tesseract` var ama Almanca dil paketi yok. OCR'a güvenme, şemaları görüntü olarak kendin oku. Tarayıcı olarak makinede sadece **Brave** var. Başsız Brave'i DevTools Protokolü ile yöneten hazır bir yardımcı var: `~/Projeler/role-laboratuvari/test/cdp.mjs`. Kopyalayıp uyarlayarak kullan.

---

## 4. Teknik yapı

```
kablo-bulucu/
  .claude/agents/        ← aşağıdaki ajan tanımları
  kaynak/png/            ← PDF'lerden üretilen görüntüler ve kırpıntılar (gitignore)
  veri/
    ham/<şema>.A.json    ← 1. okuyucunun çıkarımı
    ham/<şema>.B.json    ← 2. okuyucunun çıkarımı
    <şema>.json          ← uzlaştırılmış, doğrulanmış veri
    cihazlar.json        ← cihaz kodu → ad, tür (beyin, şalter, röle, soket…)
  src/                   ← arayüz kaynakları (css, js modülleri, şablon)
  build.py               ← veri + src → dist/kablo-bulucu.html (tek dosya)
  dist/kablo-bulucu.html
  test/
  DESIGN.md              ← görsel sistem
  SUPHELILER.md          ← Olcay'ın bakması gerekenler, kırpıntı yollarıyla
  DOGRULAMA.md           ← şema başına doğrulama listesi ve durumu
```

**Veri modeli (öneri, gerekirse geliştir ama gerekçesini yaz).** Aşağıdaki değerler sadece biçimi göstermek için; gerçek veri değil, kullanma:

```json
{
  "sema": "kapi-1",
  "kaynak": {"pdf": "Kapı 1stromlaufplan.pdf", "sayfa": 1},
  "dogrulandi": false,
  "kablolar": [
    {
      "no": "4002",
      "renk": null, "kesit": null,
      "uclar": [
        {"cihaz": "04A03", "soket": "X?", "pin": "??", "pinAdi": "HS10"},
        {"cihaz": "41A01", "soket": "X?", "pin": "??", "pinAdi": "EIN2"}
      ],
      "izgara": "sayfa 1 · akım yolu 7",
      "durum": "eslesti | suphe",
      "not": null
    }
  ]
}
```

- Renk ve kesit şemada yazıyorsa alınır, yazmıyorsa `null` kalır. Uydurulmaz.
- Aynı kablo numarası birden çok şemada geçebilir. Arama bunları tek bir kabloda birleştirir ama hangi şemadan geldiklerini korur. İki şemada aynı numaraya çelişen uçlar düşerse bu bir şüphelidir.
- Arama normalize edilir: büyük/küçük harf, boşluk, tire, `61a01` = `61A01`. Önce tam eşleşme, sonra önek eşleşmesi gelir. Sonuçlar türe göre gruplanır: cihaz, soket, kablo.
- Veri `build.py` sırasında HTML'e gömülür. Toplam dosya boyutu hedefi: 1 MB'ın altı.
- `dogrulandi` bayrağı sadece Olcay "bu şemayı kontrol ettim" dediğinde `true` yapılır. Uygulamada doğrulanmamış şemanın sonuçlarında açıkça görülen bir "doğrulanmadı" etiketi olur.

---

## 5. Ajanlar ve iş bölümü

Sen **yöneticisin.** Planı kurarsın, işi ajanlara verirsin, çıktıları birleştirirsin ve Olcay'la konuşursun. Ağır işi (şema okuma, çizim motoru, görsel düzeltme) kendin yapma, ajanlara ver. Tekrar kullanılacak ajanları `.claude/agents/` altında tanım dosyası olarak oluştur: frontmatter'da `name`, `description`, `tools` olsun, gövdede görevi, girdisi, çıktısı ve "bitti" ölçütü yazsın. Her ajanın yazabileceği dosyalar belli olsun. İki ajan aynı dosyaya yazmasın.

### Aşama 1 — Veri

**1. `hazirlik`**
- Her PDF sayfasını 400 dpi PNG'ye çevirir (`pdftoppm -r 400`).
- Sayfaları kenarları %15 üst üste binen kırpıntılara böler. İnce yazılar okunabilir olsun diye.
- `kaynak/manifest.json` yazar: şema → pdf → sayfa → kırpıntılar.
- Kapak sayfalarını işaretler.

**2. `sema-okuyucu` (her şema için iki bağımsız kopya: A ve B)**
- Kırpıntıları okuyup `veri/ham/<şema>.A.json` ya da `.B.json` üretir.
- İki kopya birbirinin çıktısını **görmez.**
- Her değeri kırpıntıda gördüğü yerle birlikte yazar.
- Okuyamadığı karakteri `?` bırakır, tahmin etmez.
- Şemalar paralel işlenebilir. Her şemaya iki okuyucu düşer.

**3. `uzlastirici`**
- A ve B'yi karşılaştırır. Aynı olanlar `eslesti` olur.
- Farklı olanlar için ilgili kırpıntıya büyütülmüş olarak tekrar bakar ve karar verir.
- Yine emin olamazsa `suphe` işaretler, `SUPHELILER.md`'ye kırpıntı yoluyla birlikte yazar.
- Beyin Listesi ile çelişkileri de buraya ekler.

**4. `veri-denetci`**
- Yapısal kontrolleri yapar:
  - Her kablonun en az iki ucu var mı?
  - Aynı cihaz + soket + pine iki farklı kablo düşüyor mu?
  - Cihaz kodları `cihazlar.json`'da var mı?
  - Şemalar arası numara çakışması var mı?
- Rapor yazar, veri dosyalarını kendisi düzeltmez. Düzeltmeyi uzlaştırıcıya geri gönderir.

### Aşama 2 — Uygulama

**5. `cekirdek`**
- Veri yükleme, arama dizini, normalizasyon, kablo izleme (ara soketlerden geçen zinciri ve dallanmaları kurma) ve `build.py`.
- DOM'a bağımlı değildir, Node ile test edilebilir.

#### Görsel ekip

Bu uygulamada görsellik süs değil, okunabilirlik meselesi. Usta yağlı eliyle, güneş altında, tek elle telefona bakacak. Görsel işi tek bir ajana yükleme. Dört ayrı rol var ve birbirlerini denetlerler.

**6. `sanat-yonetmeni`**
- Kod yazmadan önce `DESIGN.md`'yi yazar ve sonraki görsel kararların hakemidir.
- Kapsadıkları:
  - Renk tokenları, açık ve koyu tema (koyu tema atölye için varsayılan adayı)
  - Tipografi: sistem fontları, kodlar ve pinler için eş aralıklı (monospace) font
  - Aralık ölçeği, köşe yarıçapları
  - Cihaz türlerine göre görsel dil: beyin, soket, şalter, röle, toprak, artı besleme
  - Kablo çizgisi stili, pin rozeti, "şüpheli" ve "doğrulanmadı" etiketlerinin görünüşü
- Kurallar:
  - Kontrast WCAG AA'nın üstünde olmalı, güneş altında okunabilirlik hedeflenir.
  - Bilgi asla sadece renkle verilmez.
  - Dokunma alanları en az 48 px.
- `DESIGN.md`'de iyi ve kötü örnekleri gösteren küçük bir referans sayfası (`test/referans.html`) da bulunur.

**7. `diyagram-motoru`**
- Bağlantı çizimini yapan SVG motoru:
  - Tek kablo: soldan sağa kaynak → (ara soketler) → hedef.
  - Dallanan kablo: düğümden yıldız biçiminde.
  - Cihaz sorgusu: ortada cihaz, soketleri gruplu, her pinden çıkan kablolar karşı uçlarıyla.
- Ölçütler:
  - 360 px genişlikte yatay kaydırma olmadan okunmalı. Uzun zincirler dar ekranda dikeye dönmeli.
  - Pin ve soket etiketleri hiçbir genişlikte üst üste binmemeli. Bunun için otomatik test yazılır.
  - İki parmakla yakınlaştırma ve kaydırma olmalı. Bir ucun cihazına dokununca o cihazın sorgusuna geçilmeli.
  - Tokenları sadece `DESIGN.md`'den alır, kendi rengini uydurmaz.

**8. `arayuz`**
- Arama çubuğu: yazdıkça sonuç, geçmiş aramalar, temizle düğmesi.
- Sekmeler: yatay kaydırılabilir, seçili olan belirgin.
- Sonuç kartları, boş durum ("bulunamadı, şunu mu demek istediniz"), şüpheli ve doğrulanmadı etiketleri, kaynak referansı.
- Diyagramın altındaki metin özeti.
- Açık/koyu tema düğmesi. Tercih `localStorage`'da tutulur (try/catch ile).

**9. `gorsel-elestirmen`** (bağımsız, kod yazmaz)
- Diğer üç görsel ajandan ayrı çalışır.
- Başsız Brave ile ekran görüntüsü alır:
  - Genişlikler: 360×800, 412×915, 768×1024, 1280×800
  - Her genişlikte açık ve koyu tema
  - Her ekranda şu durumlar: boş açılış, kablo sorgusu, uzun zincirli kablo, dallanan kablo, çok soketli bir beyin (örn. bir FPS), bulunamadı, şüpheli içeren sonuç
- Görüntüleri kendisi inceler ve bir puanlama listesine göre değerlendirir:

| Ölçüt | Soru |
|---|---|
| Okunabilirlik | Kol mesafesinden pin numarası okunuyor mu? |
| Çakışma | Üst üste binen yazı var mı? |
| Hiyerarşi | İlk bakışta "nereden → nereye" anlaşılıyor mu? |
| Tutarlılık | `DESIGN.md`'ye uyuyor mu? |
| Dokunma | Hedefler 48 px'in altına iniyor mu? |
| Kontrast | Renkler yeterince ayrışıyor mu? |
| Boş ve hata durumları | Bunlar da tasarlanmış mı? |
| Görünüm | Profesyonel bir saha aracı gibi mi duruyor? |

- Her ölçüte 1–5 puan verir, somut düzeltme listesi yazar (ekran görüntüsü yoluyla).
- Döngü: düzeltme → tekrar çekim → tekrar puan. Her ölçüt en az 4 olana kadar sürer, en fazla 3 tur. 3 turda geçmeyen maddeleri Olcay'a gösterir.

### Aşama 3 — Test

**10. `test`**
- `cekirdek` için Node birim testleri: normalizasyon, arama sıralaması, zincir ve dallanma kurma, şemalar arası birleştirme.
- Tarayıcı testleri:
  - Her şemadan rastgele 10 kablo aranınca doğru uçlar çıkıyor mu?
  - Ağ isteği sıfır mı (çevrimdışı garantisi)?
  - `file://` ile açılıyor mu?
  - Konsolda hata yok mu?
  - Dosya boyutu 1 MB'ın altında mı?
  - 360 px'te yatay kaydırma çıkmıyor mu?
- Sonuçları `test/TEST-RAPORU.md`'ye yazar.

---

## 6. Sıra ve kontrol noktaları

Her şeyi tek seferde yapma. **Sürüm 1 bir sal:** iskelet ve birkaç şema. Diğer şemalar sonra eklenir.

1. **Plan:** Ajan tanımlarını oluştur. Olcay'a planı 10 satırı geçmeyecek şekilde göster ve onay al.
2. **İlk dilim:** Sadece **Alternatör – Marş** ve **Kapı 1**. Bu ikisinin verisi Beyin Listesi'nde kısmen hazır olduğu için karşılaştırma yapılabilir. Aşama 1 → 2 → 3 bu iki şemayla uçtan uca çalışsın.
   **Dur.** Olcay'a `dist/kablo-bulucu.html` dosyasını ve `SUPHELILER.md`'yi göster. Telefonda denemesini iste. Görünüm ve veri hakkında geri bildirim al.
3. **Genişlet:** Kapı 2–4 (Kapı 1 ile aynı desende) → FPS'ler → DMUX → CPC → SCR. Her şema eklenince test ve görsel eleştirmen tekrar çalışır.
4. **Doğrulama:** `DOGRULAMA.md` dosyasında her şema için Olcay'ın PDF'e karşı kontrol edeceği 10 rastgele kablo listelenir. Olcay "tamam" dedikçe o şemanın `dogrulandi` bayrağı açılır ve dosya yeniden üretilir.
5. **Dağıtım notu:** Ustalara nasıl verileceğini kısaca yaz: dosya WhatsApp ile nasıl gönderilir, Android'de dosya yöneticisinden Chrome ile nasıl açılır, ana ekrana nasıl kısayol eklenir. Bunu bir telefonda denemeden "çalışır" deme.

---

## 7. Bitti sayılması için

- `dist/kablo-bulucu.html` tek dosya, çevrimdışı ve `file://` ile çalışıyor.
- İlk etaptaki 8 sekmenin hepsi dolu. Her kablo, soket ve cihaz kodu aranabiliyor.
- Her sonuçta çizim + metin + kaynak referansı var. Beyne ya da cihaza giden her uçta soket ve pin yazıyor.
- Görsel eleştirmenin son turunda her ölçüt ≥ 4 ya da kalan maddeler Olcay'a gösterilmiş.
- Testler geçiyor, rapor yazılmış.
- `SUPHELILER.md` ya boş ya da her maddesi Olcay'a sorulmuş.
- Olcay'a son durum yalın Türkçeyle anlatılmış: ne yapıldı, ne doğrulandı, neyi kendisinin kontrol etmesi gerekiyor.
