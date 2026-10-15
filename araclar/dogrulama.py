#!/usr/bin/env python3
"""DOGRULAMA.md: her şema için Olcay'ın PDF'e karşı kontrol edeceği 10 kablo listesi.

Kullanım: python3 -I araclar/dogrulama.py

- veri/ altında "kablolar" anahtarı olan, taslak olmayan şema dosyalarını okur; veriyi DEĞİŞTİRMEZ.
- Seçim tekrarlanabilir (şema adından türeyen sabit tohum): önce uzlaştırıcının karar verdiği ya da
  şüpheli bıraktığı kayıtlar (en çok 5), kalanı etiketi olan kablolardan rastgele. Etiketsiz kısa çizgiler
  (soket simgesinin iki yarısı arası) ve cihaz içi bağlantılar yalnız başka aday kalmazsa seçilir.
- `dogrulandi` bayrağını bu betik DEĞİŞTİRMEZ: yalnız yönetici, Olcay "bu şemayı kontrol ettim" dediğinde açar.
"""
import glob
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ortak  # noqa: E402
from ortak import dolu, norm  # noqa: E402

ADET = 10
EN_COK_ZOR = 5


def sema_dosyalari():
    for dosya in sorted(glob.glob(ortak.yol("veri", "*.json"))):
        if os.path.basename(dosya) in ("semalar.json", "cihazlar.json"):
            continue
        try:
            d = ortak.oku_json(dosya)
        except ValueError:
            continue
        if isinstance(d, dict) and "kablolar" in d and not d.get("taslak"):
            yield d


def yol_sayisi(k):
    import re
    m = re.search(r"\d+", str((k.get("izgara") or {}).get("yol") or ""))
    return int(m.group()) if m else 999


def kendine_donen(k):
    u = k.get("uclar") or []
    return len(u) == 2 and ortak.uc_anahtari(u[0]) == ortak.uc_anahtari(u[1])


def secim(d):
    kablolar = d["kablolar"]
    rnd = random.Random("dogrulama-" + d["sema"])
    zor = [k for k in kablolar if k.get("durum") in ("suphe", "cozuldu")]
    rnd.shuffle(zor)
    secilen = zor[:EN_COK_ZOR]
    secili_idler = {k["id"] for k in secilen}

    def aday(k):
        return k["id"] not in secili_idler and k.get("durum") == "eslesti"

    etiketli = [k for k in kablolar if aday(k) and dolu(k.get("etiket")) and not k.get("ic") and not kendine_donen(k)]
    rnd.shuffle(etiketli)
    secilen += etiketli[: ADET - len(secilen)]
    if len(secilen) < ADET:
        secili_idler = {k["id"] for k in secilen}
        digerleri = [k for k in kablolar if k["id"] not in secili_idler]
        rnd.shuffle(digerleri)
        secilen += digerleri[: ADET - len(secilen)]
    return sorted(secilen, key=lambda k: (yol_sayisi(k), norm((k.get("izgara") or {}).get("satir")), k["id"]))


def yer(k):
    iz = k.get("izgara") or {}
    return f"sayfa {iz.get('sayfa')} · yol {iz.get('yol')} · satır {iz.get('satir')}"


def uc_yaz(u):
    """Olcay'a okunaklı uç metni: teknik adları (düğüm ~d1, devam) sadeleştirir."""
    t = u.get("tur")
    if t == "dugum":
        kod = str(u.get("kod") or "")
        s = "birleşim noktası (çizimde adı yok)" if kod.startswith("~") or not kod else f"birleşim noktası {kod}"
    elif t == "devam":
        if dolu(u.get("cihaz")):
            s = f"başka yere devam ediyor (ok: {u['cihaz']})"
        else:
            s = f"başka yere devam ediyor (ok: {u.get('hedef')} numaralı yol)"
    else:
        s = ortak.uc_metni(u)
    return s.replace("|", "/")


def kablo_adi(k):
    et = k.get("etiket")
    ad = et if dolu(et) else "(etiketsiz)"
    ek = []
    if k.get("varyant"):
        ek.append("kesikli (varyant)")
    if k.get("ic"):
        ek.append("cihaz içi bağlantı")
    return ad + (f" <br>_{', '.join(ek)}_" if ek else "")


def neden(k):
    if k.get("durum") == "suphe":
        return "şüpheli bırakıldı"
    if k.get("durum") == "cozuldu":
        return "iki okuma ayrışmıştı, uzlaştırıcı karar verdi"
    return "rastgele"


def bolum(d):
    kablolar = d["kablolar"]
    sayim = {x: sum(1 for k in kablolar if k.get("durum") == x) for x in ortak.DURUMLAR}
    kaynak = d.get("kaynak") or {}
    sayfalar = ", ".join(str(s) for s in kaynak.get("sayfalar") or [])
    durum = "DOĞRULANDI" if d.get("dogrulandi") else "doğrulanmadı"
    satirlar = [
        f"## {d['sema']}",
        "",
        f"PDF: `{kaynak.get('pdf')}` · sayfa {sayfalar} · durum: **{durum}**",
        "",
        f"Veride {len(kablolar)} kablo parçası ve {len(d.get('cihazlar') or [])} cihaz var "
        f"({sayim['eslesti']} iki okuyucu aynı okudu, {sayim['cozuldu']} ayrışıp karar verildi, {sayim['suphe']} şüpheli).",
        "",
        "| # | Kablo | Bir ucu | Öbür ucu | Sayfada nerede | Neden bu | Kontrol |",
        "|---:|---|---|---|---|---|---|",
    ]
    for i, k in enumerate(secim(d), 1):
        u = k["uclar"]
        satirlar.append(f"| {i} | {kablo_adi(k)} | {uc_yaz(u[0])} | {uc_yaz(u[1])} | {yer(k)} | {neden(k)} | ☐ doğru ☐ yanlış |")
    satirlar += [
        "",
        f"**Cihaz listesi:** PDF'in altındaki bileşen listesinde {len(d.get('cihazlar') or [])} satır olmalı "
        "(aralık satırları `X08.11-17` gibi tek satırdır; `41E01.1-2` gibi satırlar uygulamada ikiye ayrılmış olabilir). ☐ uyuyor ☐ uymuyor",
        "",
    ]
    return satirlar


def main():
    semalar = list(sema_dosyalari())
    cikti = [
        "# Doğrulama listesi (Olcay için)",
        "",
        "Bu dosya `araclar/dogrulama.py` ile otomatik üretilir; elle düzenleme, yeniden üretilince silinir.",
        "",
        "## Ne yapacaksın?",
        "",
        "Uygulamadaki verinin PDF'e uyup uymadığını **her şemadan 10 kablo** üzerinden yokluyorsun. Her satır için:",
        "",
        "1. PDF'i aç (dosya adı şemanın başlığında), belirtilen sayfaya git.",
        "2. **Sayfada nerede** sütunundaki yeri bul: sayfanın üst ve alt kenarında 1–76 arası numaralar (akım yolu), sol kenarında A–D harfleri var. "
        "`yol 24 · satır A` demek: 24 numaralı sütunun A bandıyla kesiştiği yer. Başında `~` varsa yer yaklaşıktır, birkaç sütun çevresine bak.",
        "3. Kablonun iki ucunu (cihaz, soket, pin, pin adı) PDF'tekiyle karşılaştır; **kablo numarası, soket, pin numarası ve pin adını harf harf** kontrol et "
        "(özellikle `I` ile `1`, `O` ile `0` karışmasına dikkat).",
        "4. ☐ doğru ya da ☐ yanlış işaretle. Yanlışsa PDF'te gördüğünü yanına yaz.",
        "",
        "`(etiketsiz)` = o çizgi parçasının üzerinde numara yazmıyor (çoğunlukla bir soket simgesinin iki yarısı arasındaki kısa çizgi ya da bir birleşim noktasına giden kol). "
        "`#` işareti, kablo numarasının önündeki işaret olarak şemada da vardır (sistem tedarikçisi kablosu).",
        "",
        "Bir şemanın 10 satırı da doğruysa bana **\"<şema adı> kontrol ettim\"** de: o şemanın `dogrulandi` bayrağını açıp uygulamayı yeniden üretirim "
        "(uygulamadaki \"DOĞRULANMADI\" etiketi o şema için kalkar). Yanlış çıkan olursa söyle, düzeltir ve o şemayı baştan yoklatırım.",
        "",
        "Not: Doğrulama yalnız 10 kablodur; veri iki bağımsız okumadan çıktı ve Beyin Listesi'yle karşılaştırıldı, ama yine de insan gözüyle tamamen doğrulanmış sayılmaz.",
        "",
    ]
    for d in semalar:
        cikti += bolum(d)
    hedef = ortak.yol("DOGRULAMA.md")
    with open(hedef, "w", encoding="utf-8") as f:
        f.write("\n".join(cikti).rstrip("\n") + "\n")
    print(f"{len(semalar)} şema için DOGRULAMA.md yazıldı ({os.path.relpath(hedef, ortak.KOK)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
