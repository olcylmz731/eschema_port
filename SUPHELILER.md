# Şüpheli okumalar (Olcay için)

Bu dosya `araclar/denetle.py` ile otomatik üretilir; elle düzenleme, bir sonraki çalıştırmada silinir.

## Bu dosya ne?

Şemalardaki her kabloyu iki ayrı okuyucu (A ve B) birbirinden habersiz okudu. İkisi aynı okursa kablo "eşleşti" sayıldı. Farklı okurlarsa üçüncü bir kişi (uzlaştırıcı) resmi büyütüp karar verdi. Karar veremediği ya da senin bakmanı istediği yerler bu dosyaya yazıldı. Aşağıdaki her madde kendi başına anlaşılır olacak biçimde yazıldı: hangi şema, hangi PDF, hangi sayfa, sayfanın neresi, ne soruluyor, iki okuma ne diyor, bakacağın resim hangi dosya.

**Sayfanın neresine bakacaksın?** Her şemanın üst ve alt kenarında 1–76 arası numaralar (akım yolları), sol kenarında A–D harfleri var. "yol 24 · satır A" demek: üstteki cetvelde 24 numaralı sütunla soldaki A bandının kesiştiği yer. Başında ~ işareti varsa (örn. ~32) yer yaklaşıktır, birkaç sütun çevresine bak.

**Resim (kırpıntı)** o bölgenin büyütülmüş görüntüsüdür; yolu proje klasörüne göre verildi.

## Şemaların durumu

- **Alternatör – Marş Motoru** (PDF: `Alternatör - Marş Motoru stromlaufplan.pdf`): 29 kablo parçası okundu; şüpheli 0, Beyin Listesi ile ayrışan 2.
- **Kapı 1** (PDF: `Kapı 1stromlaufplan.pdf`): 102 kablo parçası okundu; şüpheli 0, Beyin Listesi ile ayrışan 4.
- Henüz okunmamış şemalar: Kapı 2, Kapı 3, Kapı 4, FPS 1–4, FPS 5, FPS 6, DMUX, Kapı Butonu (DMUX), CPC, SCR.

## 1. Şüpheli okumalar ve Beyin Listesi ile gerçek çelişkiler

**Şüpheli okuma yok** (iki okuyucu her kabloda uzlaştı). Aşağıda yalnız şema ile Beyin Listesi'nin gerçekten farklı yazdığı yerler var.

### 1. Kapı 1 · sayfa 1 · yol 56 · satır B · #2,5-4135

- **Şema:** Kapı 1
- **PDF dosyası:** `Kapı 1stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 56 · satır B
- **Kablo:** #2,5-4135 numaralı kablo: 41K01 (pin 87)  ⟷  41A01 (soket 18, pin 1, pin adı Kl.15)
- **Türü:** şema ile Beyin Listesi'nin gerçekten ayrıştığı yer
- **Soru:** Pin adı şemada ile Beyin Listesi'nde farklı. Hangisi doğru?
- **Şemada yazan (A):** Kl.15
- **Beyin Listesi'nde yazan (B):** UB
- **Resim (kırpıntı):** `kaynak/png/kapi-1/s1/orta/r1c3.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** 41A01 18/1 (kablo #2,5-4135): şemada pin adı Kl.15; Beyin Listesi §4.3 kısaltması 'UB' (Almanca sütunu 'Klemme 15', Türkçe 'Kontak beslemesi'). Pin numarası ve kablo uyuşuyor, yalnız ad farkı. Şema değeri değişmedi.
- (Kayıt no: k075)

### 2. Kapı 1 · sayfa 1 · yol 65 · satır B · 1sw/rt

- **Şema:** Kapı 1
- **PDF dosyası:** `Kapı 1stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 65 · satır B
- **Kablo:** 1sw/rt numaralı kablo: başka yere devam ediyor (42A01)  ⟷  41A01 (soket 9, pin 4, pin adı CANHS)
- **Türü:** şema ile Beyin Listesi'nin gerçekten ayrıştığı yer
- **Soru:** Hedef şemada ile Beyin Listesi'nde farklı. Hangisi doğru?
- **Şemada yazan (A):** 42A01 (kalın demet çubuğu → ok)
- **Beyin Listesi'nde yazan (B):** X0809
- **Resim (kırpıntı):** `kaynak/png/kapi-1/s1/orta/r1c4.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** Beyin Listesi §4.4: 'Hepsi X0809'a gider'. Şemada CANHS (9/4, 1sw/rt) kalın demet çubuğuna, oradan 42A01 okuna (Kapı 2 beyni) gidiyor; X0809'a yalnız CANHF ve CANLF (1ws/rt, 1gr/li) bağlı. Beyin Listesi §4.5 ('diğer kapılar … sistem CAN'ı ile konuşur') şemayla uyumlu; yalnız §4.4 giriş cümlesi uymuyor. Şema değeri değişmedi.
- (Kayıt no: k087)

### 3. Kapı 1 · sayfa 1 · yol 67 · satır B · 1ws/li

- **Şema:** Kapı 1
- **PDF dosyası:** `Kapı 1stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 67 · satır B
- **Kablo:** 1ws/li numaralı kablo: başka yere devam ediyor (42A01)  ⟷  41A01 (soket 9, pin 6, pin adı CANLS)
- **Türü:** şema ile Beyin Listesi'nin gerçekten ayrıştığı yer
- **Soru:** Hedef şemada ile Beyin Listesi'nde farklı. Hangisi doğru?
- **Şemada yazan (A):** 42A01 (kalın demet çubuğu → ok)
- **Beyin Listesi'nde yazan (B):** X0809
- **Resim (kırpıntı):** `kaynak/png/kapi-1/s1/orta/r1c4.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** Beyin Listesi §4.4: 'Hepsi X0809'a gider'. Şemada CANLS (9/6, 1ws/li) kalın demet çubuğuna, oradan 42A01 okuna (Kapı 2 beyni) gidiyor; X0809'a yalnız CANHF ve CANLF bağlı. Şema değeri değişmedi.
- (Kayıt no: k091)

### 4. Kapı 1 · sayfa 1 · yol 69 · satır B · 4060

- **Şema:** Kapı 1
- **PDF dosyası:** `Kapı 1stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 69 · satır B
- **Kablo:** 4060 numaralı kablo: 41A01 (soket 9, pin 5, pin adı CANRS)  ⟷  41A01 (soket 9, pin 6, pin adı CANLS)
- **Türü:** şema ile Beyin Listesi'nin gerçekten ayrıştığı yer
- **Soru:** Hedef şemada ile Beyin Listesi'nde farklı. Hangisi doğru?
- **Şemada yazan (A):** 41A01 CANLS 9/6 (aynı soket içinde köprü)
- **Beyin Listesi'nde yazan (B):** X0809
- **Resim (kırpıntı):** `kaynak/png/kapi-1/s1/orta/r1c4.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** Beyin Listesi §4.4: 'Hepsi X0809'a gider'. Şemada CANRS (9/5) kablosu 4060, X0809'a değil aynı soketteki CANLS 9/6 pinine gidiyor (sonlandırma köprüsü; Beyin Listesi §4.5 bununla uyumlu). Şema değeri değişmedi.
- (Kayıt no: k094)

## 2. Beyin Listesi ile yazım farkları (önemsiz olabilir)

Bu maddelerde şemadaki ve Beyin Listesi'ndeki değer büyük olasılıkla aynı şeydir; yalnız yazılışı farklıdır (örneğin `X11.42/1` ile `X1142/1`). Şemadaki yazılış korundu. Zamanın olursa göz at; acelesi yok.

### 1. Alternatör – Marş Motoru · sayfa 1 · yol 20 · satır A · 0001

- **Şema:** Alternatör – Marş Motoru
- **PDF dosyası:** `Alternatör - Marş Motoru stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 20 · satır A
- **Kablo:** 0001 numaralı kablo: başka yere devam ediyor (10A10)  ⟷  ara soket X11.42, pin 1
- **Türü:** Beyin Listesi ile yazım farkı (önemsiz olabilir)
- **Soru:** Soket adı şemada ile Beyin Listesi'nde farklı yazılmış ama büyük olasılıkla aynı şey. Gerçekten aynı mı?
- **Şemada yazan (A):** X11.42/1
- **Beyin Listesi'nde yazan (B):** X1142/1
- **Resim (kırpıntı):** `kaynak/png/alternator-mars/s1/orta/r1c1.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** Yazım farkı, aynı soket (Gelenk/körük soketi X11, soket 42). Beyin Listesi §3 noktasız yazıyor; §2 ve §6'da X11.57, X11.27 noktalı. Şema değeri değişmedi.
- (Kayıt no: k006)

### 2. Alternatör – Marş Motoru · sayfa 1 · yol 22 · satır A · 0002

- **Şema:** Alternatör – Marş Motoru
- **PDF dosyası:** `Alternatör - Marş Motoru stromlaufplan.pdf`
- **Sayfa ve yer:** sayfa 1 · yol 22 · satır A
- **Kablo:** 0002 numaralı kablo: başka yere devam ediyor (10A10)  ⟷  ara soket X11.42, pin 2
- **Türü:** Beyin Listesi ile yazım farkı (önemsiz olabilir)
- **Soru:** Soket adı şemada ile Beyin Listesi'nde farklı yazılmış ama büyük olasılıkla aynı şey. Gerçekten aynı mı?
- **Şemada yazan (A):** X11.42/2
- **Beyin Listesi'nde yazan (B):** X1142/2
- **Resim (kırpıntı):** `kaynak/png/alternator-mars/s1/orta/r1c2.png`
- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)
- **Açıklama:** Yazım farkı, aynı soket (Gelenk/körük soketi X11, soket 42). Beyin Listesi §3 noktasız yazıyor; §2 ve §6'da X11.57, X11.27 noktalı. Şema değeri değişmedi.
- (Kayıt no: k011)
