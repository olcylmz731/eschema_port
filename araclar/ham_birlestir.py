#!/usr/bin/env python3
"""Okuyucunun kırpıntı başına yazdığı parça dosyalarını tek ham dosyada birleştirir.

Kullanım: python3 -I araclar/ham_birlestir.py <sema> <A|B>

Girdi : .gecici/ham/<sema>.<kopya>/*.json   (kırpıntı başına bir parça; biçim: sema-okuyucu.md)
        kaynak/manifest.json                (beklenen kırpıntılar; yoksa uyarı verir)
Çıktı : veri/ham/<sema>.<kopya>.json
Çıkış kodu: 0 = temiz, 1 = çözülmesi gereken sorun var (rapor stdout'ta).
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ortak  # noqa: E402
from ortak import dolu, norm  # noqa: E402


def parcalari_oku(sema, kopya, sorunlar):
    klasor = ortak.yol(".gecici", "ham", f"{sema}.{kopya}")
    dosyalar = sorted(glob.glob(os.path.join(klasor, "*.json")))
    parcalar = []
    for d in dosyalar:
        if os.path.basename(d).startswith("_"):
            continue  # okuyucunun kendi not dosyaları
        try:
            p = ortak.oku_json(d)
        except ValueError as e:
            sorunlar.append(f"[{os.path.basename(d)}] geçerli JSON değil: {e}")
            continue
        if not isinstance(p, dict) or not dolu(p.get("kirpinti")):
            sorunlar.append(f"[{os.path.basename(d)}] 'kirpinti' alanı yok")
            continue
        p["_dosya"] = os.path.basename(d)
        parcalar.append(p)
    parcalar.sort(key=lambda p: ortak.kirpinti_sirasi(p["kirpinti"]))
    return klasor, parcalar


def main(argv):
    if len(argv) != 3 or argv[2] not in ("A", "B"):
        print(__doc__)
        return 2
    sema, kopya = argv[1], argv[2]
    sorunlar, bilgiler = [], []
    klasor, parcalar = parcalari_oku(sema, kopya, sorunlar)
    if not parcalar:
        print(f"Parça dosyası yok: {klasor}")
        return 1

    # ---- gezilen / kalan
    gezilen = [p["kirpinti"] for p in parcalar]
    beklenen = ortak.beklenen_kirpintilar(sema)
    if beklenen is None:
        bilgiler.append("manifest'te bu şema yok ya da manifest yok: gezilmeyen kırpıntı denetlenemedi")
        kalan = []
    else:
        kalan = [k for k in beklenen if k not in set(gezilen)]
        bilinmeyen = [k for k in gezilen if k not in set(beklenen)]
        if kalan:
            sorunlar.append(f"gezilmeyen kırpıntı ({len(kalan)}): " + ", ".join(kalan))
        if bilinmeyen:
            bilgiler.append("manifest'te olmayan kırpıntı kimlikleri: " + ", ".join(bilinmeyen))

    # ---- cihazlar, künye, varsayılan
    cihazlar, kunye, varsayilan, okunamayanlar = {}, None, None, []
    for p in parcalar:
        for c in p.get("cihazlar") or []:
            kod = norm(c.get("kod"))
            if not kod:
                sorunlar.append(f"[{p['kirpinti']}] cihaz kaydında kod yok")
                continue
            c = dict(c)
            c["yol"] = [str(x) for x in (c.get("yol") or [])]
            if kod not in cihazlar:
                cihazlar[kod] = c
            else:
                var = cihazlar[kod]
                var["yol"] = sorted(set(var["yol"]) | set(c["yol"]), key=lambda x: (len(x), x))
                if dolu(c.get("adDe")) and dolu(var.get("adDe")) and norm(c["adDe"]) != norm(var["adDe"]):
                    sorunlar.append(f"[{p['kirpinti']}] {kod} cihazı için iki farklı Almanca ad: "
                                    f"{var['adDe']!r} / {c['adDe']!r}")
                elif dolu(c.get("adDe")) and not dolu(var.get("adDe")):
                    var["adDe"] = c["adDe"]
        for ad, hedef in (("kunye", "kunye"), ("varsayilan", "varsayilan")):
            v = p.get(ad)
            if v:
                if hedef == "kunye":
                    if kunye is None:
                        kunye = v
                    elif kunye != v:
                        bilgiler.append(f"[{p['kirpinti']}] künye bilgisi ikinci kez, farklı yazılmış (ilki tutuldu)")
                else:
                    if varsayilan is None:
                        varsayilan = v
                    elif varsayilan != v:
                        bilgiler.append(f"[{p['kirpinti']}] varsayılan (notlar) ikinci kez, farklı yazılmış (ilki tutuldu)")
        okunamayanlar += [dict(o, kirpinti=p["kirpinti"]) if isinstance(o, dict) else {"ne": str(o), "kirpinti": p["kirpinti"]}
                          for o in p.get("okunamayanlar") or []]

    # ---- kablolar
    kablolar, goruldu_anahtar = [], {}
    yinelenen = 0
    for p in parcalar:
        sayfa_no = ortak.kirpinti_sirasi(p["kirpinti"])[0]
        for k in p.get("kablolar") or []:
            k = dict(k)
            yer = f"[{p['kirpinti']}] {k.get('etiket') or '(etiketsiz)'}"
            uclar = k.get("uclar")
            if not isinstance(uclar, list) or len(uclar) != 2:
                sorunlar.append(f"{yer}: 'uclar' tam 2 uç olmalı")
                continue
            kotu = False
            for i, u in enumerate(uclar, 1):
                for s in ortak.uc_sorunlari(u):
                    sorunlar.append(f"{yer}: uç {i}: {s}")
                    kotu = True
            if kotu:
                continue
            # etiket → no/isaret/kesit/renk
            cozulen = ortak.etiket_coz(k.get("etiket"))
            if cozulen is None:
                if dolu(k.get("no")):
                    cozulen = {"no": k.get("no"), "isaret": k.get("isaret"), "kesit": k.get("kesit"), "renk": k.get("renk")}
                    bilgiler.append(f"{yer}: etiket ayıklanamadı, okuyucunun yazdığı alanlar kullanıldı")
                else:
                    sorunlar.append(f"{yer}: etiket ayıklanamadı ve 'no' yazılmamış (etiketi düzelt ya da no/kesit/renk'i elle yaz)")
                    cozulen = {"no": None, "isaret": None, "kesit": None, "renk": None}
            for alan in ("no", "isaret", "kesit", "renk"):
                yazilan = norm(k.get(alan)).replace(",", ".")
                if dolu(k.get(alan)) and yazilan != norm(cozulen.get(alan)).replace(",", "."):
                    bilgiler.append(f"{yer}: '{alan}' okuyucunun yazdığıyla ({k[alan]!r}) etiketten çıkan ({cozulen.get(alan)!r}) farklı; etikettekisi kullanıldı")
                k[alan] = cozulen.get(alan)
            k["varyant"] = bool(k.get("varyant"))
            k["emin"] = False if k.get("emin") is False else True
            izg = dict(k.get("izgara") or {})
            izg.setdefault("sayfa", sayfa_no if sayfa_no != 999 else None)
            k["izgara"] = izg
            g = dict(k.get("goruldu") or {})
            g.setdefault("kirpinti", p["kirpinti"])
            k["goruldu"] = g
            k["uclar"] = uclar

            # aynı kırpıntı bindirmesinde iki kez görülen kablo → birleştir
            anahtar = ortak.kablo_anahtari(k)
            if anahtar in goruldu_anahtar:
                ilk = goruldu_anahtar[anahtar]
                ilk["emin"] = ilk["emin"] and k["emin"]
                ilk.setdefault("gorulduDiger", []).append(g)
                if dolu(k.get("not")) and k["not"] != ilk.get("not"):
                    ilk["not"] = (ilk["not"] + " | " if dolu(ilk.get("not")) else "") + k["not"]
                yinelenen += 1
                continue
            goruldu_anahtar[anahtar] = k
            kablolar.append(k)

    onek = kopya.lower()
    for i, k in enumerate(kablolar, 1):
        k["id"] = f"{onek}{i:03d}"
        k.setdefault("not", None)

    # ---- bilgi: listede olup hiçbir uçta geçmeyen cihazlar
    gecen = set()
    soket_ekleri = []
    for k in kablolar:
        for u in k["uclar"]:
            if u.get("tur") == "cihaz":
                gecen.add(norm(u.get("cihaz")))
            elif u.get("tur") == "devam" and dolu(u.get("cihaz")):
                gecen.add(norm(u.get("cihaz")))
            elif u.get("tur") == "soket":
                soket_ekleri.append(norm(u.get("soket")))
    baglantisiz = [c for c in cihazlar if c not in gecen
                   and not (c.startswith("X") and any(s.startswith(c[:4]) for s in soket_ekleri))]
    if baglantisiz:
        bilgiler.append("bileşen listesinde olup hiçbir kablo ucunda geçmeyen cihazlar "
                        "(okunamayanlar'a açıklama yazdın mı?): " + ", ".join(baglantisiz))

    # ---- çıktı
    cfg = ortak.sema_ayari(sema) or {}
    cikti = {
        "sema": sema, "kopya": kopya,
        "tamamlandi": not kalan, "kalan": kalan, "gezilen": gezilen,
        "kaynak": {"pdf": cfg.get("pdf"), "sayfalar": cfg.get("sayfalar")},
        "kunye": kunye, "varsayilan": varsayilan,
        "cihazlar": list(cihazlar.values()),
        "kablolar": kablolar,
        "okunamayanlar": okunamayanlar,
    }
    hedef = ortak.yol("veri", "ham", f"{sema}.{kopya}.json")
    ortak.yaz_json(hedef, cikti)

    print(f"== ham_birlestir: {sema} / {kopya} ==")
    print(f"parça dosyası: {len(parcalar)} · gezilen kırpıntı: {len(set(gezilen))}"
          + (f"/{len(beklenen)}" if beklenen is not None else ""))
    print(f"cihaz: {len(cihazlar)} · kablo parçası: {len(kablolar)} (birleştirilen yinelenen: {yinelenen}) · "
          f"emin olmayan: {sum(1 for k in kablolar if not k['emin'])} · okunamayan notu: {len(okunamayanlar)}")
    print(f"yazıldı: {os.path.relpath(hedef, ortak.KOK)}")
    if sorunlar:
        print(f"\nSORUN ({len(sorunlar)}) — çöz, parça dosyasını düzelt, betiği yeniden çalıştır:")
        for s in sorunlar:
            print(" -", s)
    if bilgiler:
        print(f"\nBİLGİ ({len(bilgiler)}):")
        for b in bilgiler:
            print(" -", b)
    return 1 if sorunlar else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
