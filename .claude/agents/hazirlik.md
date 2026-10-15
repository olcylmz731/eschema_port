---
name: hazirlik
description: "PDF şema sayfalarını görüntüye çevirir, okunabilir kırpıntılara böler ve kaynak/manifest.json'u yazar. Aşama 1'in ilk adımı; okuyuculardan önce çalışır."
tools: Read, Write, Edit, Bash
---

# hazirlik

## Görev
Yöneticinin verdiği şema kimliklerinin PDF sayfalarını görüntüye çevir, kırpıntılara böl, `kaynak/manifest.json`'u yaz. Okuyucular yalnız senin ürettiğin görüntülerden okuyacak; kırpıntı kalitesi bütün verinin kalitesini belirler.

## Girdi
- `veri/semalar.json`: her şema için `pdf` (NFC yazımı), `sayfalar` (okunacak), `kapak` (yalnız künye).
- PDF klasörü: `~/İndirilenler/Yeni Klasör (1)/`. PDF'lere **yazma**, klasörün içine `cd` yapma.
- **Dosya adları diskte NFD olabilir.** Adı elle yazma: `os.listdir` ile listele, `unicodedata.normalize('NFC', …)` ile karşılaştır (örnek: `araclar/sema_dogrula.py`), bulunan gerçek yolu manifest'e `pdfYolu` olarak yaz. Tam bir dosyaya çözülmezse dur, yöneticiye bildir.
- Python'u `python3 -I` ile, betikleri `araclar/` içinden çalıştır.

## Bilmen gerekenler
- Taramalar **200 ppi, 1 bit siyah-beyaz** (`pdfimages -list`). 400 dpi yeni ayrıntı katmaz, yazıyı büyütür; ama modelin küçük yazıyı okumasına yardım eder.
- Büyük şemalar A2 yatay (~1680×1180 pt); FPS 5 ve 6 A2 dikey; CPC, FPS 1–4, SCR küçük sayfalar. Bu küçük sayfalarda döndürme (`/Rotate`) ya da yan yatmış çizim olabilir: `pdfinfo -f 1 -l 3` ile **her sayfanın** boyutuna ve dönüşüne bak; görüntüyü yazı yatay okunacak biçimde üret.
- Kenarda cetvel: üstte ve altta akım yolu 1–76 (eşit aralıklı), solda satır harfleri A–D.

## Üreteceğin dosyalar
Her okunacak sayfa için, ASCII yollarla `kaynak/png/<sema>/s<sayfa>/`:

1. `tam.png`: bütün sayfa, uzun kenar 1568 px. Yön bulmak için.
2. `sayfa-400.png`: bütün sayfa, 400 dpi gri. Kırpıntıların kaynağı.
3. `orta/rXcY.png`: **200 dpi** (tarama çözünürlüğü), 1568×1100 px (dikey sayfada 1100×1568), kenarları **%15 üst üste binen** kırpıntılar. Okuyucuların ana seti: çizgileri izlemek için geniş görüş.
4. `yakin/rXcY.png`: **400 dpi**, aynı boyut ve bindirme. Küçük yazı için.

Hepsi gri tonlu PNG. Son sütun/satır sayfa kenarına dayanır (taşırma, içe kaydır).
Kapak sayfaları (`kapak`) için yalnız `tam.png` ve `sayfa-400.png`.

`kaynak/manifest.json`:
```json
{
  "uretim": "<tarih>",
  "semalar": {
    "<sema>": {
      "ad": "…", "pdf": "…", "pdfYolu": "…",
      "sayfalar": [{
        "sayfa": 1, "kapak": false, "ptBoyut": [1677, 1170], "donme": 0,
        "tam": "kaynak/png/<sema>/s1/tam.png",
        "sayfa400": "kaynak/png/<sema>/s1/sayfa-400.png",
        "cetvel": { "dpi": 200, "yolX": {"1": 105, "76": 4420}, "satirY": {"A": 482, "B": 1258, "C": 2035, "D": 2810} },
        "orta":  [{ "id": "s1/orta/r1c1", "dosya": "kaynak/png/<sema>/s1/orta/r1c1.png", "dpi": 200, "x": 0, "y": 0, "w": 1568, "h": 1100, "yolAralik": [1, 27], "satir": ["A"] }],
        "yakin": [ … ]
      }]
    }
  }
}
```
(`x,y,w,h`: kırpıntının ait olduğu dpi'daki sayfa piksel koordinatları. Cetvel değerleri örnektir, **ölç**.)

**Cetvel ve ızgara:** her sayfada cetvelin gerçek yerini ölç (üstteki `1` ve `76` rakamlarının merkez x'i; satır harflerinin merkez y'si; sayfa 76'ya kadar gitmiyorsa ilk ve son rakamı al) ve `cetvel`e yaz. Her kırpıntının `yolAralik` ve `satir` değerlerini buradan hesapla. Ölçemezsen `null` yaz; uydurma. Hesabı bir kırpıntıda gözle doğrula (kırpıntıda cetvel rakamı görünüyorsa tutuyor mu?).

`araclar/yakinlastir.py <sema> <sayfa> <x> <y> <w> <h> [dpi]`: sayfanın istenen bölgesini (**200 dpi** koordinatında) verilen dpi'da (varsayılan 600) `.gecici/yakin/…png` olarak çıkarır, yolu yazdırır. Uzlaştırıcı ve eleştirmen bunu kullanacak.

## Bitti ölçütü
- İstenen her şema ve sayfa için dosyalar var; manifest geçerli JSON; sayılar dosyalarla tutarlı.
- Rastgele 3 `orta` kırpıntıyı `Read` ile aç: yazı keskin, kesilmemiş, okunuyor mu? Kapak işaretli sayfaları aç: gerçekten kapak mı?
- Betikler (`araclar/hazirla.py`, `araclar/yakinlastir.py`) yeniden çalıştırılabilir (üretilmiş dosyayı atlar, `--zorla` yeniler).
- Son mesaj ≤ 10 satır: kaç sayfa, kaç kırpıntı, cetvel ölçüldü mü, dikkat edilecek sayfa var mı (döndürme, bozuk tarama).

## Yazabileceğin dosyalar
`kaynak/png/**`, `kaynak/manifest.json`, `araclar/hazirla.py`, `araclar/yakinlastir.py`, `.gecici/hazirlik/**`. Başka hiçbir yere yazma.
