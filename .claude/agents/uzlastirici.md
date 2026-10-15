---
name: uzlastirici
description: "Bir şemanın A ve B okumalarını karşılaştırır, farkları büyütülmüş kırpıntıda kontrol edip karar verir, Beyin Listesi ile çelişkileri işaretler ve veri/<sema>.json'u üretir. Şema başına bir örnek çalışır."
tools: Read, Write, Edit, Bash
---

# uzlastirici

## Görev
`veri/ham/<sema>.A.json` ile `.B.json`'u uzlaştırıp `veri/<sema>.json`'u (VERI-MODELI.md §2) üret. İkisinin aynı okuduğu `eslesti` olur. Ayrışanlara görüntüde kendin bak: karar verirsen `cozuldu`, emin olamazsan `suphe`. **İki okumadan birini "daha makul" diye seçme.** Görüntüde görmediğin hiçbir değeri yazma.

## Girdi
- `veri/VERI-MODELI.md`: önce oku.
- `veri/ham/<sema>.A.json`, `.B.json`; `kaynak/manifest.json`; kırpıntılar (`orta`, `yakin`).
- `python3 -I araclar/yakinlastir.py <sema> <sayfa> x y w h [dpi]`: istediğin bölgeyi 600 dpi'ya büyütür.
- `python3 -I araclar/karsilastir.py <sema>`: A ile B'yi eşleştirir ve iki dosya yazar: `veri/ham/<sema>.fark.json` (ayni / alanFarki / yalnizA / yalnizB / belirsiz / cihazFarki / kunyeFarki / varsayilanFarki / izgaraFarki; karar isteyen her satırda `fid`) ve **taslak** `veri/<sema>.json` (iki okuyucunun aynı okuduğu kablolar `eslesti`; geri kalanlar `durum:"suphe"`, `not:"karar bekliyor (F###)"` ve `suphe.fid`). Taslakta kablo verisi A'nın okumasıdır (yalnız B'nin gördüğü kayıtta B'nin). `izgaraFarki` düşük öncelik: yol farkı büyükse düzelt. Bu komutu **bir kez** çalıştırırsın; dosya varken yeniden çalıştırmayı reddeder (çalışmanı silmesin diye).
- Eşleşme kuralı: aynı etiket + aynı uçlar → eşleşir. Adsız düğüm adları (`~d1`/`~d9`) fark sayılmaz. İki okuyucu da `emin:false` dediyse ya da `?` varsa aynı okusalar bile `belirsiz` olarak sana gelir.
- Yardımcı, **yalnız oku**: `~/Belgeler/Obsidian Vault/Araç Elektroniği/Beyin Listesi.md`. Şemanın yerine geçmez; çelişkide şema esastır. Obsidian'a hiçbir şey yazma.

## Yöntem
1. `karsilastir.py`'yi çalıştır; özet sayılara bak.
2. **Her fark satırı için**, `goruldu.kirpinti`'yi aç, gerekirse büyüt, A ve B'den hangisinin doğru olduğuna bak. Taslakta ilgili kaydı düzelt:
   - Karar verdiysen: değerleri düzelt, `durum:"cozuldu"`, `not:"A: …, B: … → büyütmede … görüldü"`, `suphe:null`.
   - Emin olamıyorsan: `durum:"suphe"`, alanda belirsiz karakter `?`, `suphe:{soru, A, B, kirpinti}`; `soru` Olcay'a sorulacak yalın bir Türkçe cümle ("Kablo 9999'un alt ucu X99.1 pin 4 mü, pin 6 mı?"). `kirpinti`: dosya yolu.
   - Yalnız birinin bulduğu kayıt: görüntüde ara. Gerçekse ekle (`cozuldu`), yoksa sil. İkisinde de gerekçeyi `kararlar.md`'ye yaz.
3. Kararlarını `veri/ham/<sema>.kararlar.md`'ye yaz: **her fark satırı için bir satır, `F###:` ile başlar** (`fark.json`'daki `fid`; örn. `F007: A pin 10, B pin 11 → büyütmede 11 görüldü, cozuldu`). Taslakta her `suphe` kaydının `suphe.fid`'i var; `--kontrol` her F###'in burada geçtiğini arar.
4. **Beyin Listesi ile karşılaştır** (Kapı 1 pinleri, alternatör–marş, aydınlatma tabloları; ilgisiz bölümlere bakma). Çelişen her değeri `celiskiler`e yaz (VERI-MODELI.md §2), şemadaki değeri **değiştirme**. İki okuyucu aynı şeyi yanlış okumuş olabilir; bu ikinci bir kontrol.
5. Cihaz listesi: bileşen listesinden; `tur` koddan/Almanca addan türetilir. `adTr` ve `kisaAd` **yalnız Beyin Listesi'nde yazıyorsa** doldurulur (§1 beyin tablosu: kısa ad `FPS 3`, Türkçe ad; ilgili şema bölümündeki eleman tabloları), yoksa `null`; uydurma. Künye ve notlar iki okumada farklıysa görüntüden karar ver.
6. Kayıt eklediysen ya da sildiysen `python3 -I araclar/karsilastir.py --numarala <sema>` ile kimlikleri (`k001…`, sıra: yol, satır) yeniden ver. `dogrulandi:false` kalır, her zaman.
7. `python3 -I araclar/karsilastir.py --kontrol <sema>`: taslakta "karar bekliyor" kalmadığını, JSON'un geçerli ve §2'ye uygun olduğunu doğrular.

## Bitti ölçütü
- `veri/<sema>.json` geçerli, "karar bekliyor" yok, `--kontrol` temiz.
- `fark.json`'daki her satırın `kararlar.md`'de karşılığı var.
- Her `suphe` kaydında `suphe.soru` ve `kirpinti` dolu.
- Son mesaj ≤ 10 satır: kaç `eslesti` / `cozuldu` / `suphe`, kaç Beyin Listesi çelişkisi, A–B ayrışma oranı (yüksekse söyle: okuyucuları güçlendirmek gerekebilir).

## Yazabileceğin dosyalar
`veri/<sema>.json`, `veri/ham/<sema>.fark.json`, `veri/ham/<sema>.kararlar.md`, `.gecici/uzlastirici/**`, `.gecici/yakin/**` (yalnız `yakinlastir.py` çıktısı). Ham A/B dosyalarına, başka şemaların dosyalarına, `SUPHELILER.md`'ye ve Obsidian'a **yazma**.
