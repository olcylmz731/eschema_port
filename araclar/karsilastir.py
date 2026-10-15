#!/usr/bin/env python3
"""A ve B okumalarını karşılaştırır; fark listesi ve taslak şema dosyası üretir.

Kullanım:
  python3 -I araclar/karsilastir.py <sema>             fark.json + taslak veri/<sema>.json yazar
  python3 -I araclar/karsilastir.py --numarala <sema>  veri/<sema>.json'da k001… kimliklerini yeniden verir
  python3 -I araclar/karsilastir.py --kontrol <sema>   uzlaştırma bitti mi? (çıkış 0 = temiz)
  Bayrak: --zorla  (var olan veri/<sema>.json'un üzerine yazar, eksik okumayla da çalışır)

Taslakta ikisinin de aynı okuduğu kablolar `eslesti`; geri kalan her şey `durum:"suphe"` ve
`not:"karar bekliyor (F###)"` ile gelir. Uzlaştırıcı her F### için karar verip taslağı düzenler ve
kararı veri/ham/<sema>.kararlar.md'ye yazar. `--kontrol` bunların hepsinin kapandığını doğrular.
"""
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ortak  # noqa: E402
from ortak import dolu, norm  # noqa: E402

UC_ALANLARI = ("tur", "cihaz", "soket", "pin", "pinAdi", "kod", "hedef")
FARK_KATEGORILERI = ("alanFarki", "yalnizA", "yalnizB", "belirsiz", "cihazFarki", "kunyeFarki", "varsayilanFarki")


# ---------------------------------------------------------------- eşleştirme

def uclari_hizala(uc_a, uc_b):
    """İki kablonun uçlarını eşleştirir: önce aynı anahtarlılar, kalanlar sırayla. [(i, j), …]"""
    ka = [ortak.uc_anahtari(u) for u in uc_a]
    kb = [ortak.uc_anahtari(u) for u in uc_b]
    cift, kullanilan_b = [], set()
    for i, k in enumerate(ka):
        for j, k2 in enumerate(kb):
            if j not in kullanilan_b and k == k2:
                cift.append((i, j))
                kullanilan_b.add(j)
                break
    kalan_a = [i for i in range(len(ka)) if i not in {c[0] for c in cift}]
    kalan_b = [j for j in range(len(kb)) if j not in kullanilan_b]
    cift += list(zip(kalan_a, kalan_b))
    return sorted(cift)


def kablo_farklari(a, b):
    f = []
    if norm(a.get("etiket")) != norm(b.get("etiket")):
        f.append({"alan": "etiket", "A": a.get("etiket"), "B": b.get("etiket")})
    for alan in ("isaret", "renk"):
        if norm(a.get(alan)) != norm(b.get(alan)):
            f.append({"alan": alan, "A": a.get(alan), "B": b.get(alan)})
    if norm(a.get("kesit")).replace(",", ".") != norm(b.get("kesit")).replace(",", "."):
        f.append({"alan": "kesit", "A": a.get("kesit"), "B": b.get("kesit")})
    if bool(a.get("varyant")) != bool(b.get("varyant")):
        f.append({"alan": "varyant", "A": bool(a.get("varyant")), "B": bool(b.get("varyant"))})
    for i, j in uclari_hizala(a["uclar"], b["uclar"]):
        for alan in UC_ALANLARI:
            va, vb = a["uclar"][i].get(alan), b["uclar"][j].get(alan)
            if alan == "kod" and norm(va).startswith("~") and norm(vb).startswith("~"):
                continue  # adsız düğümün adı okuyucuya özgüdür, fark sayılmaz
            if norm(va) != norm(vb):
                f.append({"alan": f"uc{i + 1}.{alan}", "A": va, "B": vb})
    return f


def eslesme_puani(a, b):
    ka = [ortak.uc_anahtari(u) for u in a["uclar"]]
    kb = [ortak.uc_anahtari(u) for u in b["uclar"]]
    ortak_uc = ortak.sayim_kesisimi(ka, kb)
    ea = norm(a.get("etiket")).lstrip("#")
    eb = norm(b.get("etiket")).lstrip("#")
    if ea == eb:
        es = 2
    elif ea and eb and len(ea) >= 3 and ortak.mesafe(ea, eb) <= 1:
        es = 1
    else:
        es = 0
    return ortak_uc, es


def soru_isareti_var(k):
    return "?" in json.dumps([k.get("etiket"), k.get("uclar")], ensure_ascii=False)


def yol_sayisi(izgara):
    m = re.search(r"\d+", str((izgara or {}).get("yol") or ""))
    return int(m.group()) if m else 999


def izgara_farkli_mi(ia, ib):
    if not ia or not ib:
        return False
    ya, yb = yol_sayisi(ia), yol_sayisi(ib)
    if ya != 999 and yb != 999 and abs(ya - yb) > 2:
        return True
    sa, sb = norm(ia.get("satir")).lstrip("~"), norm(ib.get("satir")).lstrip("~")
    return bool(sa and sb and sa != sb)


# ---------------------------------------------------------------- taslak

def taslak_kayit(taban, durum, not_, suphe):
    return {
        "id": None,
        "etiket": taban.get("etiket"),
        "no": taban.get("no"), "isaret": taban.get("isaret"),
        "kesit": taban.get("kesit"), "renk": taban.get("renk"),
        "varyant": bool(taban.get("varyant")),
        "uclar": [ortak.temiz_uc(u) for u in taban["uclar"]],
        "izgara": taban.get("izgara"),
        "durum": durum, "not": not_, "suphe": suphe,
    }


def kirpinti_yolu(sema, k):
    kid = (k.get("goruldu") or {}).get("kirpinti")
    return ortak.kirpinti_dosyasi(sema, kid) if kid else None


def sirala_ve_numarala(kablolar):
    kablolar.sort(key=lambda k: (yol_sayisi(k.get("izgara")), norm((k.get("izgara") or {}).get("satir")),
                                 norm(k.get("etiket"))))
    for i, k in enumerate(kablolar, 1):
        k["id"] = f"k{i:03d}"


def ham_yukle(sema, kopya):
    d = ortak.yol("veri", "ham", f"{sema}.{kopya}.json")
    if not os.path.exists(d):
        print(f"Yok: {os.path.relpath(d, ortak.KOK)} (önce okuyucu bitirmeli, ham_birlestir.py çalışmalı)")
        sys.exit(1)
    return ortak.oku_json(d)


def karsilastir(sema, zorla):
    A, B = ham_yukle(sema, "A"), ham_yukle(sema, "B")
    hedef = ortak.yol("veri", f"{sema}.json")
    if os.path.exists(hedef) and not zorla:
        print(f"{os.path.relpath(hedef, ortak.KOK)} zaten var; uzlaştırma çalışmanı silmemek için durdum. "
              "Gerçekten yeniden üretmek istiyorsan --zorla ekle.")
        return 1
    eksik = [k for k, h in (("A", A), ("B", B)) if not h.get("tamamlandi", True)]
    if eksik and not zorla:
        print("Tamamlanmamış okuma: " + ", ".join(eksik) + " (kalan kırpıntı var). Bitirmesini bekle ya da --zorla ile devam et.")
        return 1

    ka, kb = A["kablolar"], B["kablolar"]
    sayac = [0]

    def yeni_fid():
        sayac[0] += 1
        return f"F{sayac[0]:03d}"

    # ---- aşama 1: tam anahtar eşleşmesi
    b_dizin = {}
    for j, k in enumerate(kb):
        b_dizin.setdefault(ortak.kablo_anahtari(k), []).append(j)
    cift, kalan_a, kullanilan_b = [], [], set()
    for i, k in enumerate(ka):
        adaylar = [j for j in b_dizin.get(ortak.kablo_anahtari(k), []) if j not in kullanilan_b]
        if adaylar:
            kullanilan_b.add(adaylar[0])
            cift.append((i, adaylar[0], "tam"))
        else:
            kalan_a.append(i)
    kalan_b = [j for j in range(len(kb)) if j not in kullanilan_b]

    # ---- aşama 2: bulanık eşleşme (aynı uçlu ama etiketi farklı, ya da aynı etiketli ama bir ucu farklı)
    adaylar = []
    for i in kalan_a:
        for j in kalan_b:
            ortak_uc, es = eslesme_puani(ka[i], kb[j])
            if (es >= 1 and ortak_uc >= 1) or ortak_uc == 2:
                adaylar.append((ortak_uc * 2 + es, -abs(i - j), i, j))
    adaylar.sort(reverse=True)
    kullanilan_ai, kullanilan_bj = set(), set()
    for _, _, i, j in adaylar:
        if i in kullanilan_ai or j in kullanilan_bj:
            continue
        kullanilan_ai.add(i)
        kullanilan_bj.add(j)
        cift.append((i, j, "bulanik"))
    yalniz_a = [i for i in kalan_a if i not in kullanilan_ai]
    yalniz_b = [j for j in kalan_b if j not in kullanilan_bj]

    fark = {"sema": sema, "uretim": time.strftime("%Y-%m-%d %H:%M:%S"), "ozet": {},
            "ayni": [], **{k: [] for k in FARK_KATEGORILERI}, "izgaraFarki": []}
    taslak_kablolar = []  # (kayit, [fark girdileri])

    for i, j, tur in sorted(cift):
        a, b = ka[i], kb[j]
        farklar = kablo_farklari(a, b)
        izgara = a.get("izgara") if a.get("izgara") else b.get("izgara")
        girdi = None
        if farklar:
            fid = yeni_fid()
            ozet = "; ".join(f"{x['alan']}: A={x['A']!r}, B={x['B']!r}" for x in farklar)
            kayit = taslak_kayit(a, "suphe", f"karar bekliyor ({fid}): A ile B farklı okudu: {ozet}",
                                 {"fid": fid, "soru": None, "A": ortak.kablo_metni(a), "B": ortak.kablo_metni(b),
                                  "kirpinti": kirpinti_yolu(sema, a), "kirpintiB": kirpinti_yolu(sema, b)})
            girdi = {"fid": fid, "a": a["id"], "b": b["id"], "eslesme": tur, "farklar": farklar}
            fark["alanFarki"].append(girdi)
        elif a.get("emin") is False and b.get("emin") is False:
            fid = yeni_fid()
            kayit = taslak_kayit(a, "suphe", f"karar bekliyor ({fid}): iki okuyucu aynı okudu ama ikisi de emin değil",
                                 {"fid": fid, "soru": None, "A": ortak.kablo_metni(a), "B": ortak.kablo_metni(b),
                                  "kirpinti": kirpinti_yolu(sema, a), "kirpintiB": kirpinti_yolu(sema, b)})
            girdi = {"fid": fid, "a": a["id"], "b": b["id"], "neden": "ikisi de emin değil"}
            fark["belirsiz"].append(girdi)
        elif soru_isareti_var(a) or soru_isareti_var(b):
            fid = yeni_fid()
            kayit = taslak_kayit(a, "suphe", f"karar bekliyor ({fid}): iki okuyucu aynı okudu ama okunamayan karakter (?) var",
                                 {"fid": fid, "soru": None, "A": ortak.kablo_metni(a), "B": ortak.kablo_metni(b),
                                  "kirpinti": kirpinti_yolu(sema, a), "kirpintiB": kirpinti_yolu(sema, b)})
            girdi = {"fid": fid, "a": a["id"], "b": b["id"], "neden": "okunamayan karakter (?)"}
            fark["belirsiz"].append(girdi)
        else:
            kayit = taslak_kayit(a, "eslesti", None, None)
            fark["ayni"].append({"a": a["id"], "b": b["id"]})
        kayit["izgara"] = izgara
        if izgara_farkli_mi(a.get("izgara"), b.get("izgara")):
            fark["izgaraFarki"].append({"iid": f"I{len(fark['izgaraFarki']) + 1:03d}", "a": a["id"], "b": b["id"],
                                        "A": a.get("izgara"), "B": b.get("izgara"), "not": "yol farkı 2'den büyük ya da satır farklı"})
        taslak_kablolar.append((kayit, girdi))

    for i in yalniz_a:
        a = ka[i]
        fid = yeni_fid()
        b_adaylar = [kb[j]["id"] for j in yalniz_b if norm(kb[j].get("etiket")).lstrip("#") == norm(a.get("etiket")).lstrip("#")
                     and dolu(a.get("etiket"))]
        kayit = taslak_kayit(a, "suphe", f"karar bekliyor ({fid}): yalnız A okudu (B'de karşılığı yok)",
                             {"fid": fid, "soru": None, "A": ortak.kablo_metni(a), "B": None,
                              "kirpinti": kirpinti_yolu(sema, a)})
        girdi = {"fid": fid, "a": a["id"], "metin": ortak.kablo_metni(a), "adaylarB": b_adaylar,
                 "kirpinti": (a.get("goruldu") or {}).get("kirpinti")}
        fark["yalnizA"].append(girdi)
        taslak_kablolar.append((kayit, girdi))
    for j in yalniz_b:
        b = kb[j]
        fid = yeni_fid()
        a_adaylar = [ka[i]["id"] for i in yalniz_a if norm(ka[i].get("etiket")).lstrip("#") == norm(b.get("etiket")).lstrip("#")
                     and dolu(b.get("etiket"))]
        kayit = taslak_kayit(b, "suphe", f"karar bekliyor ({fid}): yalnız B okudu (A'da karşılığı yok)",
                             {"fid": fid, "soru": None, "A": None, "B": ortak.kablo_metni(b),
                              "kirpinti": kirpinti_yolu(sema, b)})
        girdi = {"fid": fid, "b": b["id"], "metin": ortak.kablo_metni(b), "adaylarA": a_adaylar,
                 "kirpinti": (b.get("goruldu") or {}).get("kirpinti")}
        fark["yalnizB"].append(girdi)
        taslak_kablolar.append((kayit, girdi))

    kayitlar = [k for k, _ in taslak_kablolar]
    sirala_ve_numarala(kayitlar)
    for kayit, girdi in taslak_kablolar:
        if girdi is not None:
            girdi["taslakId"] = kayit["id"]
    # ---- cihazlar
    ca = {norm(c["kod"]): c for c in A["cihazlar"]}
    cb = {norm(c["kod"]): c for c in B["cihazlar"]}
    cihazlar = []
    for kod in list(ca) + [k for k in cb if k not in ca]:
        a, b = ca.get(kod), cb.get(kod)
        taban = a or b
        if a and b:
            if sorted(a.get("yol") or []) != sorted(b.get("yol") or []):
                fark["cihazFarki"].append({"fid": yeni_fid(), "kod": taban["kod"], "alan": "yol", "A": a.get("yol"), "B": b.get("yol")})
            if norm(a.get("adDe")) != norm(b.get("adDe")):
                fark["cihazFarki"].append({"fid": yeni_fid(), "kod": taban["kod"], "alan": "adDe", "A": a.get("adDe"), "B": b.get("adDe")})
        else:
            fark["cihazFarki"].append({"fid": yeni_fid(), "kod": taban["kod"], "alan": "var-yok",
                                       "yalnizOkuyucu": "A" if a else "B", "adDe": taban.get("adDe"), "yol": taban.get("yol")})
        cihazlar.append({"kod": taban["kod"], "yol": taban.get("yol") or [], "adDe": taban.get("adDe"),
                         "adTr": None, "kisaAd": None, "tur": ortak.tur_turet(taban["kod"], taban.get("adDe"))})

    # ---- künye ve varsayılan
    def birlestir(ad, kategori):
        va, vb = A.get(ad) or {}, B.get(ad) or {}
        sonuc = {}
        for anahtar in list(va) + [k for k in vb if k not in va]:
            x, y = va.get(anahtar), vb.get(anahtar)
            if dolu(x) and dolu(y) and norm(x) != norm(y):
                fark[kategori].append({"fid": yeni_fid(), "alan": f"{ad}.{anahtar}", "A": x, "B": y})
            sonuc[anahtar] = x if dolu(x) else y
        return sonuc or None

    kunye = birlestir("kunye", "kunyeFarki")
    varsayilan = birlestir("varsayilan", "varsayilanFarki")

    cfg = ortak.sema_ayari(sema) or {}
    kaynak_a = A.get("kaynak") or {}
    taslak = {
        "taslak": True,
        "sema": sema,
        "kaynak": {"pdf": cfg.get("pdf") or kaynak_a.get("pdf"), "sayfalar": cfg.get("sayfalar") or kaynak_a.get("sayfalar")},
        "kunye": kunye, "varsayilan": varsayilan, "dogrulandi": False,
        "cihazlar": cihazlar, "kablolar": kayitlar, "celiskiler": [],
    }
    fark["ozet"] = {
        "A": len(ka), "B": len(kb), "ayni": len(fark["ayni"]),
        **{k: len(fark[k]) for k in FARK_KATEGORILERI}, "izgaraFarki": len(fark["izgaraFarki"]),
        "taslakKablo": len(kayitlar), "kararBekleyen": sayac[0],
    }
    ortak.yaz_json(ortak.yol("veri", "ham", f"{sema}.fark.json"), fark)
    ortak.yaz_json(hedef, taslak)

    o = fark["ozet"]
    toplam = max(len(ka), len(kb)) or 1
    print(f"== karsilastir: {sema} ==")
    print(f"A: {o['A']} kablo parçası · B: {o['B']} · aynı okunan: {o['ayni']}")
    print(f"alan farkı: {o['alanFarki']} · yalnız A: {o['yalnizA']} · yalnız B: {o['yalnizB']} · belirsiz: {o['belirsiz']}")
    print(f"cihaz farkı: {o['cihazFarki']} · künye farkı: {o['kunyeFarki']} · varsayılan farkı: {o['varsayilanFarki']} · ızgara farkı: {o['izgaraFarki']}")
    print(f"karar bekleyen (F###): {o['kararBekleyen']} · A–B ayrışma oranı ≈ %{100 * (o['alanFarki'] + o['yalnizA'] + o['yalnizB']) / toplam:.0f}")
    print(f"yazıldı: veri/ham/{sema}.fark.json, veri/{sema}.json (taslak)")
    return 0


# ---------------------------------------------------------------- numarala / kontrol

def numarala(sema):
    d = ortak.oku_json(ortak.yol("veri", f"{sema}.json"))
    sirala_ve_numarala(d["kablolar"])
    ortak.yaz_json(ortak.yol("veri", f"{sema}.json"), d)
    print(f"{len(d['kablolar'])} kayıt yeniden numaralandı (k001…).")
    return 0


def kontrol(sema):
    dosya = ortak.yol("veri", f"{sema}.json")
    sorunlar, uyarilar = [], []
    try:
        d = ortak.oku_json(dosya)
    except (OSError, ValueError) as e:
        print(f"veri/{sema}.json okunamadı: {e}")
        return 1
    for anahtar in ("sema", "kaynak", "dogrulandi", "cihazlar", "kablolar", "celiskiler"):
        if anahtar not in d:
            sorunlar.append(f"üst düzey alan yok: {anahtar}")
    if d.get("dogrulandi") is not False:
        sorunlar.append("dogrulandi false olmalı (yalnız yönetici, Olcay onayından sonra true yapar)")
    kimlikler, sayim = set(), {"eslesti": 0, "cozuldu": 0, "suphe": 0}
    kablo_idleri = {k.get("id") for k in d.get("kablolar", [])}
    for k in d.get("kablolar", []):
        kid = k.get("id")
        yer = f"{kid} ({k.get('etiket')})"
        if not kid or kid in kimlikler:
            sorunlar.append(f"{yer}: kimlik boş ya da yinelenmiş")
        kimlikler.add(kid)
        if len(k.get("uclar", [])) != 2:
            sorunlar.append(f"{yer}: tam 2 uç olmalı")
        for u in k.get("uclar", []):
            for s in ortak.uc_sorunlari(u):
                sorunlar.append(f"{yer}: {s}")
        durum = k.get("durum")
        if durum not in ortak.DURUMLAR:
            sorunlar.append(f"{yer}: durum geçersiz: {durum!r}")
        else:
            sayim[durum] += 1
        if "karar bekliyor" in str(k.get("not") or ""):
            sorunlar.append(f"{yer}: 'karar bekliyor' notu duruyor")
        if durum == "suphe":
            s = k.get("suphe") or {}
            if not dolu(s.get("soru")):
                sorunlar.append(f"{yer}: durum suphe ama suphe.soru boş")
            if not dolu(s.get("kirpinti")):
                sorunlar.append(f"{yer}: durum suphe ama suphe.kirpinti boş")
        else:
            if k.get("suphe"):
                sorunlar.append(f"{yer}: durum {durum} ama suphe nesnesi dolu (null olmalı)")
            if soru_isareti_var(k):
                sorunlar.append(f"{yer}: durum {durum} ama '?' karakteri var (şüpheli bırak ya da değeri görüntüden çöz)")
        izg = k.get("izgara") or {}
        if not (dolu(izg.get("yol")) and dolu(izg.get("satir")) and izg.get("sayfa")):
            uyarilar.append(f"{yer}: izgara eksik (sayfa/yol/satır)")
    for c in d.get("cihazlar", []):
        if not dolu(c.get("kod")) or c.get("tur") not in ortak.CIHAZ_TURLERI:
            sorunlar.append(f"cihaz kaydı geçersiz: {c.get('kod')!r} tür {c.get('tur')!r}")
    for c in d.get("celiskiler", []):
        for alan in ("kablo", "alan", "sema", "beyinListesi"):
            if alan not in c:
                sorunlar.append(f"celiskiler kaydında '{alan}' yok: {c}")
        if c.get("kablo") not in kablo_idleri:
            sorunlar.append(f"celiskiler kaydı var olmayan kabloyu gösteriyor: {c.get('kablo')}")
    # fark.json'daki her F### kararlar.md'de geçiyor mu?
    fdosya = ortak.yol("veri", "ham", f"{sema}.fark.json")
    kdosya = ortak.yol("veri", "ham", f"{sema}.kararlar.md")
    if os.path.exists(fdosya):
        fark = ortak.oku_json(fdosya)
        fidler = [g["fid"] for kat in FARK_KATEGORILERI for g in fark.get(kat, []) if "fid" in g]
        metin = ""
        if os.path.exists(kdosya):
            with open(kdosya, encoding="utf-8") as f:
                metin = f.read()
        gecenler = set(re.findall(r"F\d{3}", metin))
        acik = [f for f in fidler if f not in gecenler]
        if acik:
            sorunlar.append(f"kararlar.md'de karşılığı olmayan fark satırları ({len(acik)}): " + ", ".join(acik))
    else:
        uyarilar.append("veri/ham/<sema>.fark.json yok: fark satırı denetlenemedi")
    print(f"== kontrol: {sema} ==")
    print(f"kablo parçası: {len(d.get('kablolar', []))} · eslesti {sayim['eslesti']} · cozuldu {sayim['cozuldu']} · suphe {sayim['suphe']} · "
          f"cihaz {len(d.get('cihazlar', []))} · celiski {len(d.get('celiskiler', []))}")
    if uyarilar:
        print(f"\nUYARI ({len(uyarilar)}):")
        for u in uyarilar:
            print(" -", u)
    if sorunlar:
        print(f"\nSORUN ({len(sorunlar)}):")
        for s in sorunlar:
            print(" -", s)
        return 1
    if d.pop("taslak", None) is not None:
        ortak.yaz_json(dosya, d)
        print("\ntemiz (taslak işareti kaldırıldı)")
    else:
        print("\ntemiz")
    return 0


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    bayraklar = {a for a in argv[1:] if a.startswith("--")}
    if len(args) != 1 or not bayraklar <= {"--numarala", "--kontrol", "--zorla"}:
        print(__doc__)
        return 2
    sema = args[0]
    if "--numarala" in bayraklar:
        return numarala(sema)
    if "--kontrol" in bayraklar:
        return kontrol(sema)
    return karsilastir(sema, "--zorla" in bayraklar)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
