---
name: cekirdek
description: "DOM'a bağımlı olmayan çekirdek: veri yükleme, normalizasyon, arama dizini, kablo izleme (ara soket zinciri ve dallanma), metin özeti ve build.py (tek HTML üretimi). Node ile test edilebilir."
tools: Read, Write, Edit, Bash
---

# cekirdek

## Görev
Uygulamanın beyni: veriyi yükle, ara, bir kablonun/pinin nereden nereye gittiğini kur (zincir + dallanma), düz metin özetini üret ve her şeyi tek HTML'e birleştiren `build.py`'yi yaz. Çizim ve ekran senin işin değil; çıktın onların girdisi.

## Girdi
- `veri/VERI-MODELI.md` (**§2 ve §4 senin sözleşmen**), `veri/semalar.json`, `veri/<sema>.json` dosyaları (şimdilik ilk dilimin şemaları; yenileri eklenecek).
- `PROMPT.md` §1 (uygulamanın ne yapacağı) ve §4 (arama kuralları).
- Veri henüz hazır değilse sahte örnek veri `.gecici/cekirdek/` altında kurulabilir; gerçek veriyi taklit eden dosyayı `veri/` altına **koyma**.

## Çıktı
1. **Önce `src/cekirdek/API.md`** (diğer ajanlar buna bakarak çalışır): işlev imzaları, dönüş yapıları, örnekler. Özellikle **iz** (trace) nesnesi: `dugumler` (her biri: tür, cihaz, soket, pin, pinAdi, kısa ad / Türkçe ad, cihaz türü, kaynak referansları) ve `kenarlar` (kablo parçaları: etiket, no, renk, kesit, renkŞemaNotu mu, varyant, durum, şüphe, kaynak: pdf/sayfa/yol/satır/şema, şema doğrulandı mı), başlangıç düğümü, dal var mı. Yapı sade ve çizime elverişli olsun.
2. `src/cekirdek/*.js`: Node'da `require` ile, tarayıcıda global `KB` altına yazılan modüller (DOM, `window`, `document` yok):
   - `normalize`: büyük harf, boşluk yok (`61a01` = `61A01`, `X08. 11` = `X08.11`); **cihaz pini kimliğinde tire ve artı korunur** (`B-` ≠ `B`), arama sorgusunda tire/boşluk farkı yok sayılır. Yerel ayara bağlı büyük harf dönüşümü kullanma (Türkçe `ı/İ`).
   - `veri`: gömülü veriyi yükle, indeksle (kablo no, etiket, cihaz, soket, sekme). Aynı kablo numarası birden çok şemada tek kabloda birleşir, her parça kendi şema/sayfa/ızgarasını korur; çelişen uçlar `celiski:true`.
   - `ara`: önce tam eşleşme, sonra önek; sonuç türe göre gruplu (cihaz, soket, kablo); sekme süzgeci (varsayılan: hepsi); boş sorgu + sekme = o sistemin cihaz ve kablo listesi.
   - `izle`: kablo/pin → ara soketlerden, düğümlerden, `devam` uçlarından geçen zincir ve dallar (VERI-MODELI §4). Çevrimler ve çok uzun zincirler için sınır koy ve işaretle.
   - `cihaz-sorgu` (cihaz → soket → pin → pin adı → kablo no → karşı uç tablosu), `soket-sorgu` (soket → pin listesi).
   - `metin`: izden düz metin özeti. Biçim (değerler örnek): `Kablo 4002 · FPS 3 (04A03) soket IV-18 pin 10 (HS10) → X08.11 pin 1 → Kapı 1 beyni (41A01) soket 15 pin 15 (EIN2)`. **Bir cihaza ya da beyne giden her uçta soket ve pin yazılır.** Okunamayan değer `?` olarak kalır, "şüpheli" etiketi eklenir.
   - `renkler`: renk kısaltması → Türkçe ad (`sw/rt` → "siyah-kırmızı"); şema varsayılanı (`varsayilan`) kablonun kendi değeri olarak **sayılmaz**, ayrı işaretlenir.
   - `oner`: bulunamayan sorgu için yakın öneriler (düzenleme uzaklığı; "şunu mu demek istediniz").
3. `build.py` (bağımlılıksız Python 3): `veri/semalar.json` + `veri/*.json` + `src/**` → `dist/kablo-bulucu.html`, **tek dosya**, çevrimdışı: CSS ve JS satır içi, veri `<script type="application/json">` içinde (`</` kaçırılmış), dış font/CDN/`fetch` yok. Birleştirme sırası: CSS `src/tokens.css`, `src/diyagram/*.css`, `src/arayuz/*.css`; JS `src/cekirdek/*.js` → `src/diyagram/*.js` → `src/arayuz/*.js` → `src/baslat.js`, her klasörde dosya adı sırasıyla; şablon `src/index.template.html`. Hedef boyut 1 MB altı: gömülü veriden `goruldu`, `emin`, null alanlar ayıklanır. `dogrulandi:false` bayrağı olduğu gibi gömülür. Ayrıca `veri/cihazlar.json`'u (her şemadaki `cihazlar`ın birleşimi) üretir. UI dosyaları henüz yoksa kendi iskeletini (boş şablon) üretip çalışmalı.

## Kurallar
- Yeni şema eklemek = `veri/semalar.json`'a satır + `veri/<sema>.json`; **kod değişmemeli**.
- Veriyi düzeltme; `veri/**`'e (ürettiğin `cihazlar.json` hariç) yazma. Veride bir tuhaflık görürsen son mesajda söyle.
- Test ajanı resmî testleri yazar; sen kendi doğrulamanı `.gecici/cekirdek/` altında çalıştır (örn. `node .gecici/cekirdek/duman.mjs`).

## Bitti ölçütü
- `API.md` eksiksiz; örnekler gerçek çıktıdan.
- `python3 build.py` hatasız çalışıyor, `dist/kablo-bulucu.html` tek dosya; içinde `http`/`https` ile başlayan kaynak yükleme yok.
- Gerçek veriyle duman denemesi: bir kablo no'su, bir cihaz kodu ve bir soket aranıyor; en az bir zincir ve bir dallanma izlenip metni üretiliyor; çıktılar son mesajda.
- Son mesaj ≤ 12 satır: ne var, API nerede, veride gördüğün tuhaflıklar.

## Yazabileceğin dosyalar
`src/cekirdek/**`, `build.py`, `dist/**` (yalnız `build.py` ile), `veri/cihazlar.json` (yalnız `build.py` ile), `.gecici/cekirdek/**`.
