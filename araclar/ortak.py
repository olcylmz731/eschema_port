"""Kablo Bulucu veri araçlarının ortak işlevleri (ham_birlestir.py ve karsilastir.py kullanır).

Yalnız standart kütüphane. KB_KOK ortam değişkeni proje kökünü değiştirir (testler için).
`python3 -I` yalnız bu klasördeki betiklerden içe aktarır: betikler sys.path'e klasörü kendisi ekler.
"""
import json
import os
import re
from collections import Counter

KOK = os.environ.get("KB_KOK") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UC_TURLERI = ("cihaz", "soket", "dugum", "devam")
DURUMLAR = ("eslesti", "cozuldu", "suphe")
CIHAZ_TURLERI = ("beyin", "sensor", "lamba", "sigorta", "guc", "ikaz", "role", "motor", "direnc",
                 "salter", "diyot", "toprak", "soket", "valf", "dugum", "besleme", "diger")
HARF_TUR = {"A": "beyin", "B": "sensor", "E": "lamba", "F": "sigorta", "G": "guc", "H": "ikaz",
            "K": "role", "M": "motor", "R": "direnc", "S": "salter", "V": "diyot", "W": "toprak",
            "X": "soket", "Y": "valf", "Z": "dugum"}


def yol(*parca):
    return os.path.join(KOK, *parca)


def oku_json(dosya):
    with open(dosya, encoding="utf-8") as f:
        return json.load(f)


def yaz_json(dosya, veri):
    os.makedirs(os.path.dirname(dosya), exist_ok=True)
    with open(dosya, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)
        f.write("\n")


def norm(s):
    """Karşılaştırma için: büyük harf, boşluk yok, tire/eksi tek tip. Tireyi silmez ('B-' ile 'B' ayrı kalsın)."""
    if s is None:
        return ""
    s = str(s)
    for t in ("−", "–", "—", "‐", "‑"):
        s = s.replace(t, "-")
    return re.sub(r"\s+", "", s).upper()


def dolu(s):
    return s is not None and str(s).strip() != ""


# ---------------------------------------------------------------- kablo etiketi

_KESIT = r"(?P<kesit>[\d?]{1,3}(?:[.,][\d?]{1,2})?)"
_RENK = r"(?P<renk>[A-Za-z?]{2}(?:/[A-Za-z?]{2})?)"
_NO = r"(?P<no>[\d?]{3,5})"
_DESENLER = [
    re.compile(rf"^{_KESIT}-{_NO}$"),          # 2,5-4135
    re.compile(rf"^{_KESIT}{_RENK}-?{_NO}$"),  # 1,5sw4002 (nadir)
    re.compile(rf"^{_KESIT}{_RENK}$"),         # 70sw, 1sw/rt
    re.compile(rf"^{_RENK}$"),                 # br
    re.compile(rf"^{_NO}$"),                   # 4002
]


def etiket_coz(etiket):
    """Etiketi {no, isaret, kesit, renk}'e ayırır. Etiket yoksa hepsi None; ayıklanamazsa None döner."""
    bos = {"no": None, "isaret": None, "kesit": None, "renk": None}
    if etiket is None:
        return bos
    s = re.sub(r"\s+", "", str(etiket))
    isaret = None
    if s.startswith("#"):
        isaret, s = "#", s[1:]
    if not s:
        return dict(bos, isaret=isaret)
    for d in _DESENLER:
        m = d.match(s)
        if m:
            g = m.groupdict()
            kesit = g.get("kesit")
            renk = g.get("renk")
            return {"no": g.get("no"), "isaret": isaret,
                    "kesit": kesit.replace(",", ".") if kesit else None,
                    "renk": renk.lower() if renk else None}
    return None


# ---------------------------------------------------------------- uçlar

def uc_anahtari(u):
    """Bir ucun karşılaştırma anahtarı. Adsız düğüm ('~d1') joker sayılır: okuyucular farklı ad verebilir."""
    t = u.get("tur")
    if t == "cihaz":
        return ("c", norm(u.get("cihaz")), norm(u.get("soket")), norm(u.get("pin")))
    if t == "soket":
        return ("s", norm(u.get("soket")), norm(u.get("pin")))
    if t == "dugum":
        kod = norm(u.get("kod"))
        return ("~",) if (not kod or kod.startswith("~")) else ("d", kod)
    if t == "devam":
        return ("v", norm(u.get("cihaz")), norm(u.get("hedef")))
    return ("?",)


def uc_sorunlari(u):
    """Bir ucun biçim sorunlarını liste olarak döndürür (boş liste = temiz)."""
    if not isinstance(u, dict):
        return ["uç bir nesne değil"]
    t = u.get("tur")
    if t not in UC_TURLERI:
        return [f"uç türü geçersiz: {t!r}"]
    if t == "cihaz" and not dolu(u.get("cihaz")):
        return ["cihaz ucunda cihaz kodu yok"]
    if t == "soket" and not (dolu(u.get("soket")) and dolu(u.get("pin"))):
        return ["soket ucunda soket ya da pin yok"]
    if t == "dugum" and not dolu(u.get("kod")):
        return ["düğüm ucunda kod yok"]
    if t == "devam" and not (dolu(u.get("cihaz")) or dolu(u.get("hedef"))):
        return ["devam ucunda cihaz ya da hedef yok"]
    return []


def temiz_uc(u):
    """Şema dosyasındaki uç biçimi (VERI-MODELI.md §2): türe özgü alanlar her zaman var, boşsa None."""
    t = u.get("tur")
    ham = u.get("ham")
    if t == "cihaz":
        return {"tur": t, "cihaz": u.get("cihaz"), "soket": u.get("soket"), "pin": u.get("pin"),
                "pinAdi": u.get("pinAdi"), "ham": ham}
    if t == "soket":
        return {"tur": t, "soket": u.get("soket"), "pin": u.get("pin"), "ham": ham}
    if t == "dugum":
        return {"tur": t, "kod": u.get("kod"), "ham": ham}
    if t == "devam":
        return {"tur": t, "cihaz": u.get("cihaz"), "hedef": u.get("hedef"), "ham": ham}
    return dict(u)


def uc_metni(u):
    """İnsan okuyacağı kısa uç metni (SUPHELILER ve taslak notları için)."""
    t = u.get("tur")
    if t == "cihaz":
        parca = [str(u.get("cihaz"))]
        if dolu(u.get("soket")):
            parca.append(f"soket {u['soket']}")
        if dolu(u.get("pin")):
            parca.append(f"pin {u['pin']}")
        s = " ".join(parca)
        if dolu(u.get("pinAdi")):
            s += f" ({u['pinAdi']})"
        return s
    if t == "soket":
        return f"soket {u.get('soket')} pin {u.get('pin')}"
    if t == "dugum":
        return f"düğüm {u.get('kod')}"
    if t == "devam":
        return "devam → " + " ".join(str(x) for x in (u.get("cihaz"), u.get("hedef")) if dolu(x))
    return str(u)


def kablo_metni(k):
    et = k.get("etiket") if dolu(k.get("etiket")) else "(etiketsiz)"
    uclar = k.get("uclar") or []
    return f"{et}: " + " ↔ ".join(uc_metni(u) for u in uclar)


def kablo_anahtari(k):
    et = norm(k.get("etiket")).lstrip("#")
    return (et, tuple(sorted(uc_anahtari(u) for u in k.get("uclar", []))))


def sayim_kesisimi(a, b):
    """İki anahtar listesinin çoklu küme kesişiminin boyu."""
    return sum((Counter(a) & Counter(b)).values())


def mesafe(a, b):
    """Düzenleme uzaklığı (Levenshtein)."""
    if a == b:
        return 0
    onceki = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        simdiki = [i]
        for j, cb in enumerate(b, 1):
            simdiki.append(min(onceki[j] + 1, simdiki[j - 1] + 1, onceki[j - 1] + (ca != cb)))
        onceki = simdiki
    return onceki[-1]


# ---------------------------------------------------------------- cihaz türü

def tur_turet(kod, ad_de=""):
    """Cihaz türü: koddaki harften (41A01 → A) ve Almanca addan (VERI-MODELI.md §2)."""
    k = norm(kod)
    if "verteiler" in (ad_de or "").lower():
        return "besleme"
    if k.startswith("HT"):
        return "diger"
    m = re.match(r"^\d{2}([A-Z])\d{2}", k)
    harf = m.group(1) if m else (k[0] if k and k[0].isalpha() else None)
    return HARF_TUR.get(harf, "diger")


# ---------------------------------------------------------------- kırpıntı kimlikleri

def kirpinti_dosyasi(sema, kid):
    return f"kaynak/png/{sema}/{kid}.png"


def kirpinti_sirasi(kid):
    """'s1/orta/r2c3' → (1, 'orta', 2, 3); tanınmazsa (999, kid, 0, 0)."""
    m = re.match(r"^s(\d+)/([a-z]+)/r(\d+)c(\d+)$", kid or "")
    if m:
        return (int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4)))
    m = re.match(r"^s(\d+)/([a-z]+)$", kid or "")
    if m:
        return (int(m.group(1)), m.group(2), 0, 0)
    return (999, str(kid), 0, 0)


def sema_ayari(sema):
    """veri/semalar.json'daki şema satırı; yoksa None."""
    try:
        return oku_json(yol("veri", "semalar.json")).get("semalar", {}).get(sema)
    except (OSError, ValueError):
        return None


def beklenen_kirpintilar(sema):
    """manifest'e göre okuyucunun gezmesi gereken kırpıntı kimlikleri; manifest yoksa None."""
    try:
        m = oku_json(yol("kaynak", "manifest.json"))
    except (OSError, ValueError):
        return None
    s = m.get("semalar", {}).get(sema)
    if not s:
        return None
    kimlikler = []
    for sayfa in s.get("sayfalar", []):
        if sayfa.get("kapak"):
            kimlikler.append(f"s{sayfa['sayfa']}/tam")
        else:
            kimlikler += [k["id"] for k in sayfa.get("orta", [])]
    return kimlikler
