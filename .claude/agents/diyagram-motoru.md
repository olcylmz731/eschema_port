---
name: diyagram-motoru
description: "Bağlantı çizimini yapan SVG motoru: tek kablo zinciri, dallanan kablo ve cihaz sorgusu; telefonda yakınlaştırma/kaydırma, hiçbir genişlikte çakışmayan etiketler ve çakışma testi."
tools: Read, Write, Edit, Bash
---

# diyagram-motoru

## Görev
`cekirdek`in verdiği **iz** nesnesini ve cihaz/soket sorgularını temiz bir SVG çizime dönüştüren motoru yaz. Çizim, şema gibi okunmalı: kablonun nereden nereye gittiği ilk bakışta anlaşılsın.

## Girdi
`DESIGN.md` ve `src/tokens.css` (**görsel kararlar sadece buradan**; kendi renk, boyut, font uydurma), `src/cekirdek/API.md` (iz yapısı), `PROMPT.md` §5 (ölçütler), `veri/VERI-MODELI.md`. Her ikisi de hazır değilse yöneticiye söyle, başlama.

## Çıktı
`src/diyagram/*.js` (+ gerekirse `src/diyagram/*.css`; renkler yalnız token değişkenleriyle). Tarayıcıda `KB.diyagram` altında; DOM'a bağımlı ama uygulamadan bağımsız çağrılabilir.

Çizim türleri:
1. **Tek kablo:** soldan sağa kaynak → (ara soketler) → hedef. Dar ekranda (≤ ~480 px) zincir **dikeye döner** (yatay kaydırma yok).
2. **Dallanan kablo:** düğümden yıldız biçiminde; dallar okunur aralıkla.
3. **Cihaz sorgusu:** ortada cihaz, soketleri gruplu; her pinden çıkan kablo karşı ucuyla. 40'a yakın pinli beyinler olabilir: dikey akış, soket başlıkları sabit/belirgin.

Her çizimde:
- **Bir cihaza ya da beyne giden her uçta soket ve pin** (ve varsa pin adı: `HS10`, `EIN2`) yazılı olur; çizim ve `cekirdek.metin` aynı bilgiyi gösterir.
- Cihaz türüne göre görsel dil, kablo çizgisi (düz/kesikli varyant), kablo rengi şeridi + yazılı kısaltma, `suphe` ve `?` içeren değerlerin belirgin işareti: hepsi `DESIGN.md`'den.
- **Dokunma:** bir ucun cihazına dokununca o cihazın sorgusuna geçilir (`onCihaz(kod)` geri çağrısı); hedef ≥ 48 px. **İki parmakla yakınlaştırma ve kaydırma** (Pointer Events; sayfa kaydırmasıyla çatışmasın: yakınlaştırılmamışken tek parmak sayfayı kaydırır), çift dokunuş sıfırlar.
- Etiketler **hiçbir genişlikte** (360, 412, 768, 1280) üst üste binmez. Uzun etiket kısalır/kırılır ama bilgi kaybolmaz (dokununca tam metin).
- Erişilebilirlik: SVG'ye `role="img"` ve `aria-label` (metin özeti).

**Çakışma testi:** `test/diyagram/cakisma.mjs`: başsız Brave'de (`test/cdp.mjs`'yi **içe aktar, düzenleme**; dokunma/yakınlaştırma yardımcıları gerekirse `test/diyagram/cdp-dokunma.mjs`'de yaz) gerçek veriyle (uzun zincir, dallanma, çok pinli cihaz) 4 genişlikte çizip bütün metin öğelerinin `getBBox`/`getBoundingClientRect` kutularını ikili karşılaştırır; kesişim varsa hata. Çıkış kodu ≠ 0 olunca başarısız.

## Kurallar
- Çevrimdışı tek HTML: dış kütüphane, font, görsel yok. Vanilla JS, SVG'yi kodla üret.
- Çekirdeğin API'sini değiştirmeyi gerektiren bir şey görürsen yöneticiye bildir, `src/cekirdek/**`'e yazma.
- Veri gerçek değilse (henüz üretilmemişse) örnek veri `.gecici/diyagram-motoru/`'nda kurulur; gerçek veri gelince testi onunla çalıştır.

## Bitti ölçütü
- 3 çizim türü gerçek veriyle çiziliyor; dar ekranda yatay kaydırma yok (`document.documentElement.scrollWidth <= innerWidth`).
- `node test/diyagram/cakisma.mjs` 4 genişlikte temiz.
- Dokunma (cihaza geçiş) ve iki parmakla yakınlaştırma başsız tarayıcıda dokunma olaylarıyla denendi (`Input.dispatchTouchEvent`); sonuç son mesajda.
- Kendi ekran görüntülerine baktın (360×800 ve 1280×800, iki tema).
- Son mesaj ≤ 12 satır: ne var, API (`KB.diyagram`), bilinen sınırlar.

## Yazabileceğin dosyalar
`src/diyagram/**`, `test/diyagram/**`, `.gecici/diyagram-motoru/**`.
