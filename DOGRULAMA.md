# Doğrulama listesi (Olcay için)

Bu dosya `araclar/dogrulama.py` ile otomatik üretilir; elle düzenleme, yeniden üretilince silinir.

## Ne yapacaksın?

Uygulamadaki verinin PDF'e uyup uymadığını **her şemadan 10 kablo** üzerinden yokluyorsun. Her satır için:

1. PDF'i aç (dosya adı şemanın başlığında), belirtilen sayfaya git.
2. **Sayfada nerede** sütunundaki yeri bul: sayfanın üst ve alt kenarında 1–76 arası numaralar (akım yolu), sol kenarında A–D harfleri var. `yol 24 · satır A` demek: 24 numaralı sütunun A bandıyla kesiştiği yer. Başında `~` varsa yer yaklaşıktır, birkaç sütun çevresine bak.
3. Kablonun iki ucunu (cihaz, soket, pin, pin adı) PDF'tekiyle karşılaştır; **kablo numarası, soket, pin numarası ve pin adını harf harf** kontrol et (özellikle `I` ile `1`, `O` ile `0` karışmasına dikkat).
4. ☐ doğru ya da ☐ yanlış işaretle. Yanlışsa PDF'te gördüğünü yanına yaz.

`(etiketsiz)` = o çizgi parçasının üzerinde numara yazmıyor (çoğunlukla bir soket simgesinin iki yarısı arasındaki kısa çizgi ya da bir birleşim noktasına giden kol). `#` işareti, kablo numarasının önündeki işaret olarak şemada da vardır (sistem tedarikçisi kablosu).

Bir şemanın 10 satırı da doğruysa bana **"<şema adı> kontrol ettim"** de: o şemanın `dogrulandi` bayrağını açıp uygulamayı yeniden üretirim (uygulamadaki "DOĞRULANMADI" etiketi o şema için kalkar). Yanlış çıkan olursa söyle, düzeltir ve o şemayı baştan yoklatırım.

Not: Doğrulama yalnız 10 kablodur; veri iki bağımsız okumadan çıktı ve Beyin Listesi'yle karşılaştırıldı, ama yine de insan gözüyle tamamen doğrulanmış sayılmaz.

## alternator-mars

PDF: `Alternatör - Marş Motoru stromlaufplan.pdf` · sayfa 1 · durum: **doğrulanmadı**

Veride 29 kablo parçası ve 15 cihaz var (25 iki okuyucu aynı okudu, 4 ayrışıp karar verildi, 0 şüpheli).

| # | Kablo | Bir ucu | Öbür ucu | Sayfada nerede | Neden bu | Kontrol |
|---:|---|---|---|---|---|---|
| 1 | 70sw | X0501 | 10M01 | sayfa 1 · yol 9 · satır A | rastgele | ☐ doğru ☐ yanlış |
| 2 | 35rt | X0501 | 01G01 pin B+ | sayfa 1 · yol 18 · satır A | rastgele | ☐ doğru ☐ yanlış |
| 3 | 35br | 01G01 pin B- | W0501 | sayfa 1 · yol 20 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 4 | 0002 | başka yere devam ediyor (ok: 10A10) | soket X11.42 pin 2 | sayfa 1 · yol 22 · satır A | rastgele | ☐ doğru ☐ yanlış |
| 5 | (etiketsiz) | 01R02 | birleşim noktası (çizimde adı yok) | sayfa 1 · yol 31 · satır B | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |
| 6 | (etiketsiz) | birleşim noktası (çizimde adı yok) | soket X03.20 pin 3 | sayfa 1 · yol 31 · satır B | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |
| 7 | 1082 | soket X03.54 pin 3 | soket X03.53 pin 4 | sayfa 1 · yol 31 · satır B | rastgele | ☐ doğru ☐ yanlış |
| 8 | 50sw | 01G02 pin B- | W0501 | sayfa 1 · yol 31 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 9 | (etiketsiz) | birleşim noktası (çizimde adı yok) | soket X03.31 pin 3 | sayfa 1 · yol ~34 · satır B | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |
| 10 | (etiketsiz) | soket X03.31 pin 3 | 04A04 soket V-9 pin 6 (HI3) | sayfa 1 · yol 35 · satır B | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |

**Cihaz listesi:** PDF'in altındaki bileşen listesinde 15 satır olmalı (aralık satırları `X08.11-17` gibi tek satırdır; `41E01.1-2` gibi satırlar uygulamada ikiye ayrılmış olabilir). ☐ uyuyor ☐ uymuyor

## kapi-1

PDF: `Kapı 1stromlaufplan.pdf` · sayfa 1 · durum: **doğrulanmadı**

Veride 102 kablo parçası ve 28 cihaz var (100 iki okuyucu aynı okudu, 2 ayrışıp karar verildi, 0 şüpheli).

| # | Kablo | Bir ucu | Öbür ucu | Sayfada nerede | Neden bu | Kontrol |
|---:|---|---|---|---|---|---|
| 1 | #4009 | soket X08.11 pin 11 | soket X08.13 pin 5 | sayfa 1 · yol 3 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 2 | #4005 | soket X08.11 pin 5 | soket X08.12 pin 4 | sayfa 1 · yol 7 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 3 | #4006 | soket X08.11 pin 6 | soket X08.12 pin 5 | sayfa 1 · yol 11 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 4 | (etiketsiz) | soket X08.17 pin 2 | soket X08.16 pin 2 | sayfa 1 · yol 17 · satır A | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |
| 5 | (etiketsiz) | 41B02 pin 1 | soket X08.16 pin 2 | sayfa 1 · yol 18 · satır A | iki okuma ayrışmıştı, uzlaştırıcı karar verdi | ☐ doğru ☐ yanlış |
| 6 | #4049 | 41A01 soket 15 pin 10 (HWA1) | soket X08.15 pin 7 | sayfa 1 · yol 21 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 7 | #4044 | soket X08.16 pin 3 | 41A01 soket 15 pin 6 (LS) | sayfa 1 · yol 37 · satır B | rastgele | ☐ doğru ☐ yanlış |
| 8 | #4031 | 41A01 soket 18 pin 13 (POSV) | 41R01 pin 2 | sayfa 1 · yol 48 · satır C | rastgele | ☐ doğru ☐ yanlış |
| 9 | 2,5rt-4001 | soket X08.11 pin 3 | soket X02.43 pin 1 | sayfa 1 · yol 59 · satır A | rastgele | ☐ doğru ☐ yanlış |
| 10 | #br | 41H01 pin 30 | başka yere devam ediyor (ok: 54 numaralı yol) | sayfa 1 · yol 74 · satır C | rastgele | ☐ doğru ☐ yanlış |

**Cihaz listesi:** PDF'in altındaki bileşen listesinde 28 satır olmalı (aralık satırları `X08.11-17` gibi tek satırdır; `41E01.1-2` gibi satırlar uygulamada ikiye ayrılmış olabilir). ☐ uyuyor ☐ uymuyor
