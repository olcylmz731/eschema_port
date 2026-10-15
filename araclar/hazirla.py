#!/usr/bin/env python3
"""PDF şema sayfalarını görüntüye çevirir, okunabilir kırpıntılara böler, kaynak/manifest.json'u yazar.

Kullanım (hepsi `python3 -I araclar/hazirla.py ...`):
  (argümansız)             manifest'te kayıtlı şemalar; manifest yoksa semalar.json'daki "dilim": 1 olanlar
  kapi-2 kapi-3            yalnız bu şemalar (manifest'e eklenir, ötekiler korunur)
  --dilim N                semalar.json'da "dilim": N olan şemalar
  --hepsi                  semalar.json'daki bütün şemalar
  --zorla                  üretilmiş dosyaları da yeniden üretir ve cetveli yeniden ölçer
  --cetvel                 yalnız cetveli yeniden ölçer (görüntüler üretilmişse atlanır)
  --dondur SEMA:SAYFA:D    yan yatmış çizim için görüntüyü saat yönünde D (90/180/270) derece çevirir;
                           değişikliği görmek için --zorla ile birlikte ver. Tekrarlanabilir.
  --hedef KLASOR           çıktı kökü (varsayılan: kaynak): KLASOR/png/... ve KLASOR/manifest.json

Her okunacak sayfa için kaynak/png/<sema>/s<sayfa>/ altına:
  tam.png          bütün sayfa, uzun kenar 1568 px (yön bulmak için)
  sayfa-400.png    bütün sayfa, 400 dpi gri (200 dpi taramanın 2 katı, yumuşatılıp keskinleştirilmiş)
  orta/rXcY.png    200 dpi (tarama çözünürlüğü), 1568x1100 (dikey sayfada 1100x1568), >= %15 bindirmeli
  yakin/rXcY.png   400 dpi, aynı boyut ve bindirme (kaynağı sayfa-400.png)
Kapak sayfaları için yalnız tam.png ve sayfa-400.png. Üretilmiş dosya atlanır (boyutu doğruysa).

Bindirme: kırpıntılar eşit aralıklı dağıtılır; komşu iki kırpıntı en az %15 üst üste biner
(tarama boyutuna göre gerçekte orta için ~%34, yakin için ~%17), son sütun/satır sayfa kenarına dayanır.

Cetvel: üst/alt kenarda akım yolu rakamları, sol/sağ kenarda satır harfleri otomatik ölçülür
(200 dpi sayfa pikselinde). Ölçülemezse null yazılır, uydurulmaz. Manifest'e elle yazılmış bir
cetvel varsa (--cetvel/--zorla verilmedikçe) korunur.
"""
import argparse
import collections
import datetime
import glob
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata

import numpy as np
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TAM_UZUN = 1568            # tam.png uzun kenar
KIRP_UZUN, KIRP_KISA = 1568, 1100
BINDIRME = 0.15
DPI_TARAMA, DPI_YAKIN = 200, 400
LUT_ALT, LUT_UST = 30, 225  # büyütülmüş görüntüde hafif kontrast artırma (gri seviyeleri); sert eşik pürüzü büyütür
TAM_GAMMA = 1.5            # küçültülen tam.png'de ince çizgileri koyulaştırır
SATIR_MIN_DEGME = 20       # satir listesine girmek için bandın kırpıntıya değme payı (200 dpi px)

RS = Image.Resampling
TR = Image.Transpose


def nfc(s):
    return unicodedata.normalize("NFC", s)


class Hata(Exception):
    pass


# ------------------------------------------------------------------ PDF ve dosya adları

def ayar_oku():
    with open(os.path.join(KOK, "veri", "semalar.json"), encoding="utf-8") as f:
        return json.load(f)


def gercek_yol(yol):
    """Yolu diskteki gerçek yazımına (NFC/NFD fark etmez) çözer; çözülemezse Hata."""
    yol = os.path.expanduser(yol)
    if os.path.exists(yol):
        return yol
    parcalar = yol.split(os.sep)
    cur = os.sep if yol.startswith(os.sep) else ""
    for p in parcalar:
        if not p:
            continue
        aday = os.path.join(cur, p) if cur else p
        if os.path.exists(aday):
            cur = aday
            continue
        eslesen = [ad for ad in os.listdir(cur or ".") if nfc(ad) == nfc(p)]
        if len(eslesen) != 1:
            raise Hata(f"yol çözülemedi: {yol!r} ('{p}' için {len(eslesen)} eşleşme)")
        cur = os.path.join(cur, eslesen[0])
    return cur


def pdf_bul(cfg, pdf_adi):
    """semalar.json'daki (NFC) PDF adını diskteki gerçek dosyaya çözer. Tam bir dosya yoksa Hata."""
    klasor = gercek_yol(cfg["kaynakKlasor"])
    eslesen = [ad for ad in os.listdir(klasor) if nfc(ad) == nfc(pdf_adi)]
    if len(eslesen) != 1:
        raise Hata(f"PDF tam bir dosyaya çözülemedi: {pdf_adi!r} ({len(eslesen)} eşleşme) klasör: {klasor}")
    return os.path.join(klasor, eslesen[0])


def calistir(komut):
    r = subprocess.run(komut, capture_output=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise Hata(f"{komut[0]} başarısız (kod {r.returncode}): {r.stderr.strip()[:300]}")
    return r.stdout


def sayfa_bilgisi(pdf, sayfa):
    """(genişlik pt, yükseklik pt, /Rotate) - pdfinfo'nun gösterdiği biçimde."""
    cikti = calistir(["pdfinfo", "-f", str(sayfa), "-l", str(sayfa), pdf])
    m = re.search(rf"^Page\s+{sayfa}\s+size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts", cikti, re.M)
    if not m:
        raise Hata(f"pdfinfo {sayfa}. sayfanın boyutunu vermedi (sayfa yok mu?)")
    r = re.search(rf"^Page\s+{sayfa}\s+rot:\s+(-?\d+)", cikti, re.M)
    return float(m.group(1)), float(m.group(2)), (int(r.group(1)) % 360 if r else 0)


def sayfa_resimleri(pdf, sayfa):
    cikti = calistir(["pdfimages", "-list", "-f", str(sayfa), "-l", str(sayfa), pdf])
    sonuc = []
    for satir in cikti.splitlines()[2:]:
        p = satir.split()
        if len(p) >= 14:
            sonuc.append({"tur": p[2], "w": int(p[3]), "h": int(p[4]), "xppi": float(p[12]), "yppi": float(p[13])})
    return sonuc


def sayi(x):
    return int(x) if abs(x - round(x)) < 0.05 else round(x, 1)


def ham_raster(pdf, sayfa, gecici):
    """Sayfanın 200 dpi gri rasteri (PIL 'L', mürekkep koyu) ve bilgi.

    Sayfa tek bir tam sayfa taramaysa (rot 0, ~200 ppi) PDF'in içindeki görüntü olduğu gibi çıkarılır
    (yeniden örnekleme yok). Değilse pdftoppm ile 200 dpi çizilir.
    """
    pw, ph, rot = sayfa_bilgisi(pdf, sayfa)
    resimler = sayfa_resimleri(pdf, sayfa)
    yerel = False
    if rot == 0 and len(resimler) == 1 and resimler[0]["tur"] == "image":
        r = resimler[0]
        yerel = (abs((r["w"] / r["h"]) / (pw / ph) - 1) < 0.015
                 and abs(r["xppi"] - DPI_TARAMA) < 2 and abs(r["yppi"] - DPI_TARAMA) < 2)
    if yerel:
        kok = os.path.join(gecici, f"nat{sayfa}")
        calistir(["pdfimages", "-png", "-f", str(sayfa), "-l", str(sayfa), pdf, kok])
        dosyalar = sorted(glob.glob(kok + "-*.png"))
        if not dosyalar:
            raise Hata("pdfimages görüntü çıkarmadı")
        im = Image.open(dosyalar[0])
        im.load()
        L = im.convert("L")
        kaynak = "pdfimages"
    else:
        kok = os.path.join(gecici, f"pp{sayfa}")
        calistir(["pdftoppm", "-r", str(DPI_TARAMA), "-gray", "-f", str(sayfa), "-l", str(sayfa),
                  "-singlefile", "-png", pdf, kok])
        im = Image.open(kok + ".png")
        im.load()
        L = im.convert("L")
        kaynak = "pdftoppm"
    if float(np.asarray(L).mean()) < 128:   # mürekkep azınlıkta olmalı; değilse ters
        L = L.point(lambda v: 255 - v)
        kaynak += "+ters"
    return L, {"kaynak": kaynak, "ptBoyut": [sayi(pw), sayi(ph)], "pdfDonme": rot}


def dondur(img, derece):
    """Saat yönünde derece (90/180/270) çevirir."""
    derece %= 360
    if derece == 0:
        return img
    return img.transpose({90: TR.ROTATE_270, 180: TR.ROTATE_180, 270: TR.ROTATE_90}[derece])


# ------------------------------------------------------------------ görüntü üretimi

_LUT = [min(255, max(0, round((v - LUT_ALT) * 255 / (LUT_UST - LUT_ALT)))) for v in range(256)]


def buyut(L, kat, kutu=None):
    """200 dpi 'L' rasterin (x, y, w, h) kutusunu kat kadar büyütür (Lanczos + kenar keskinleştirme)."""
    if kutu is None:
        kutu = (0, 0, L.width, L.height)
    x, y, w, h = kutu
    cikti = L.resize((round(w * kat), round(h * kat)), RS.LANCZOS, box=(x, y, x + w, y + h))
    return cikti.point(_LUT) if kat > 1 else cikti


def tam_gorsel(L):
    W, H = L.size
    s = TAM_UZUN / max(W, H)
    kucuk = L.resize((max(1, round(W * s)), max(1, round(H * s))), RS.LANCZOS)
    return kucuk.point([round(255 * (v / 255) ** TAM_GAMMA) for v in range(256)])


def png_hazir(yol, boyut):
    try:
        with Image.open(yol) as im:
            return im.size == tuple(boyut) and im.mode == "L"
    except Exception:
        return False


def png_yaz(img, yol, dpi=None):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    gecici = yol + ".tmp"
    img.save(gecici, format="PNG", compress_level=6, dpi=(dpi, dpi) if dpi else None)
    os.replace(gecici, yol)


def konumlar(toplam, boy):
    """Bir eksende kırpıntı başlangıçları: komşular >= BINDIRME üst üste biner, eşit dağıtılır, son kenara dayanır."""
    if toplam <= boy:
        return [0], toplam
    n = math.ceil((toplam - boy) / (boy * (1 - BINDIRME)) - 1e-9) + 1
    return [round(i * (toplam - boy) / (n - 1)) for i in range(n)], boy


def kirpinti_duzeni(W, H):
    """W x H piksellik sayfa için [(satır, sütun, x, y, w, h)] (satır/sütun 1'den)."""
    kw, kh = (KIRP_UZUN, KIRP_KISA) if W >= H else (KIRP_KISA, KIRP_UZUN)
    xs, kw = konumlar(W, kw)
    ys, kh = konumlar(H, kh)
    return [(r + 1, c + 1, x, y, kw, kh) for r, y in enumerate(ys) for c, x in enumerate(xs)]


# ------------------------------------------------------------------ cetvel ölçümü

def _bilesenler(maske):
    """8-bağlantılı bileşenler: [[x0, y0, x1, y1, alan]] (uçlar dahil)."""
    ys, xs = np.nonzero(maske)
    kalan = set(zip(ys.tolist(), xs.tolist()))
    sonuc = []
    while kalan:
        y, x = kalan.pop()
        kuyruk = collections.deque([(y, x)])
        x0 = x1 = x
        y0 = y1 = y
        alan = 1
        while kuyruk:
            cy, cx = kuyruk.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (cy + dy, cx + dx)
                    if n in kalan:
                        kalan.remove(n)
                        kuyruk.append(n)
                        alan += 1
                        x0 = min(x0, n[1])
                        x1 = max(x1, n[1])
                        y0 = min(y0, n[0])
                        y1 = max(y1, n[0])
        sonuc.append([x0, y0, x1, y1, alan])
    return sonuc


def _runlar(v, esik):
    """v > esik olan ardışık indeks aralıkları [(ilk, son)]."""
    idx = np.nonzero(v > esik)[0]
    if len(idx) == 0:
        return []
    out = []
    bas = onceki = int(idx[0])
    for i in idx[1:]:
        i = int(i)
        if i != onceki + 1:
            out.append((bas, onceki))
            bas = i
        onceki = i
    out.append((bas, onceki))
    return out


def _yatay_cizgileri_sil(m, uzun=60):
    """Satır başına >= uzun px'lik yatay mürekkep dizilerini siler (çerçeve çizgileri; rakamlara değen eğik çizgiler dahil)."""
    m = m.copy()
    for i in range(m.shape[0]):
        d = np.diff(np.concatenate(([0], m[i].astype(np.int8), [0])))
        for b, e in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]):
            if e - b >= uzun:
                m[i, b:e] = False
    return m


def _glifler(bant, xo=0, yo=0):
    """Banttaki glif benzeri bileşenler [[x0,y0,x1,y1]] (uç dahil; xo,yo sayfa kayması).

    Çizgi/tırnak/leke elenir. Taramada ikiye kopmuş harf ve rakamlar (üst-alt parça) birleştirilir."""
    parca = []
    for (bx0, by0, bx1, by1, alan) in _bilesenler(bant):
        if bx1 - bx0 + 1 >= 45 or by1 - by0 + 1 > 45 or alan < 6:
            continue
        parca.append([bx0 + xo, by0 + yo, bx1 + xo, by1 + yo])
    birles = []
    for p in sorted(parca, key=lambda p: (p[0], p[1])):
        for b in birles:
            if p[0] <= b[2] + 2 and p[2] >= b[0] - 2 and p[1] <= b[3] + 5 and p[3] >= b[1] - 5:
                b[0], b[1], b[2], b[3] = min(b[0], p[0]), min(b[1], p[1]), max(b[2], p[2]), max(b[3], p[3])
                break
        else:
            birles.append(list(p))
    return birles


def _numara_uydur(parcalar, y):
    """Aynı satırdaki rakam parçalarından numara kümeleri kurar, i. numaranın merkezini x = c + b*i'ye uydurur.

    Birbirine <= 12 px yakın parçalar tek numaradır; mürekkebi 60 px'ten az kümeler (leke) atılır.
    Aralıklar düzensizse (eksik/fazla numara) ya da sapma büyükse None."""
    kumeler = []
    for b in sorted(parcalar, key=lambda b: b[0]):
        if kumeler and b[0] - kumeler[-1][1] <= 12:
            k = kumeler[-1]
            k[1] = max(k[1], b[2])
            k[2] += b[4]
        else:
            kumeler.append([b[0], b[2], b[4]])
    kumeler = [k for k in kumeler if k[2] >= 60]
    n = len(kumeler)
    if n < 10:
        return None
    mer = np.array([(k[0] + k[1]) / 2 for k in kumeler])
    fark = np.diff(mer)
    med = float(np.median(fark))
    if fark.min() < 0.7 * med or fark.max() > 1.3 * med:
        return None
    idx = np.arange(1, n + 1)
    b, c = np.polyfit(idx, mer, 1)
    sapma = mer - (c + b * idx)
    rms = float(np.sqrt((sapma ** 2).mean()))
    if rms > 4 or float(np.abs(sapma).max()) > 10:
        return None
    return {"n": n, "c": float(c), "b": float(b), "rms": rms, "y": float(y)}


def _yol_cetveli(a, alt):
    """Üst (alt=False) ya da alt kenardaki 1..N akım yolu rakamlarının merkez x'leri; doğrusal uyum.

    Kenar bandındaki uzun yatay çizgiler silinir (rakamlara değen eğik çerçeve çizgisi dahil), kalan
    küçük parçalar y'lerine göre gruplanır (alt kenarda künye yazıları da aynı bantta olabilir);
    en çok numarası olan düzenli satır cetveldir. Yoksa None."""
    h, w = a.shape
    y_a, y_b = (h - 120, h - 10) if alt else (20, 120)
    if y_a < 0 or h < 400:
        return None
    parcalar = [b for b in _bilesenler(_yatay_cizgileri_sil(a[y_a:y_b]))
                if b[4] >= 12 and 8 <= b[3] - b[1] + 1 <= 45 and b[2] - b[0] + 1 <= 45]
    if len(parcalar) < 20:
        return None
    yc = np.array([(b[1] + b[3]) / 2 for b in parcalar])
    hist, kenar = np.histogram(yc, bins=np.arange(0, y_b - y_a + 6, 6))
    adaylar = []
    for i in np.argsort(-hist, kind="stable"):
        if hist[i] < 20 or len(adaylar) == 4:
            break
        t = float(kenar[i] + 3)
        if all(abs(t - u) >= 18 for u in adaylar):
            adaylar.append(t)
    en_iyi = None
    for tepe in adaylar:
        r = _numara_uydur([b for b in parcalar if abs((b[1] + b[3]) / 2 - tepe) <= 18], y_a + tepe)
        if r and (en_iyi is None or r["n"] > en_iyi["n"]):
            en_iyi = r
    return en_iyi


def _harfler(a, x0, x1):
    """x0..x1 şeridindeki harf boyutlu glifler [[x0,y0,x1,y1]], yukarıdan aşağı."""
    gl = _glifler(a[:, x0:x1 + 1], xo=x0)
    return sorted((b for b in gl if 14 <= b[3] - b[1] + 1 <= 40 and 6 <= b[2] - b[0] + 1 <= 28), key=lambda b: b[1])


def _satir_harfleri(a, taraf):
    """Sol ya da sağ kenar şeridindeki A-D harflerinin merkez y'leri; tam 4 harf bulunmazsa None."""
    h, w = a.shape
    kolon = a.sum(axis=0) / h
    if w < 600:
        return None
    if taraf == "sol":
        r = _runlar(kolon[:250], 0.12)
        ciftler = list(zip(r, r[1:]))
    else:
        r = [(x0 + w - 250, x1 + w - 250) for x0, x1 in _runlar(kolon[w - 250:], 0.12)]
        ciftler = list(zip(r, r[1:]))[::-1]
    for r1, r2 in ciftler:
        x0, x1 = r1[1] + 1, r2[0] - 1
        if not 15 <= x1 - x0 + 1 <= 90:
            continue
        hs = _harfler(a, x0, x1)
        if len(hs) != 4:
            continue
        ys = [(b[1] + b[3]) / 2 for b in hs]
        aralik = np.diff(ys)
        if aralik.min() < 0.85 * aralik.mean() or aralik.max() > 1.15 * aralik.mean():
            continue
        return dict(zip("ABCD", ys))
    return None


def cetvel_olc(L):
    """(cetvel sözlüğü | None, uyarılar). Koordinatlar 200 dpi sayfa pikseli."""
    a = np.asarray(L) < 128
    uyari = []
    ust, alt = _yol_cetveli(a, False), _yol_cetveli(a, True)
    sol, sag = _satir_harfleri(a, "sol"), _satir_harfleri(a, "sag")
    if ust is None and alt is None and sol is None and sag is None:
        return None, ["cetvel ölçülemedi"]
    birincil = ust or alt
    if ust is None and alt is not None:
        uyari.append("üst cetvel ölçülemedi, alt cetvel kullanıldı")
    harf = sol or sag
    if sol is None and sag is not None:
        uyari.append("sol harfler ölçülemedi, sağ kenardakiler kullanıldı")

    def yolx(c):
        return {"1": int(c["c"] + c["b"] + 0.5), str(c["n"]): int(c["c"] + c["b"] * c["n"] + 0.5)}

    c = {"dpi": DPI_TARAMA}
    if birincil:
        c["yolX"] = yolx(birincil)
        c["yolAdim"] = round((c["yolX"][str(birincil["n"])] - c["yolX"]["1"]) / (birincil["n"] - 1), 2)
        if birincil["n"] != 76:
            uyari.append(f"cetvelde {birincil['n']} numara bulundu (76 değil)")
    else:
        c["yolX"] = None
    if ust and alt:
        c["yolXAlt"] = yolx(alt)
    if harf:
        c["satirY"] = {k: int(v + 0.5) for k, v in harf.items()}
        c["satirAralik"] = satir_araliklari(c["satirY"], L.height)
    else:
        c["satirY"] = None
    if sol and sag:
        c["satirYSag"] = {k: int(v + 0.5) for k, v in sag.items()}
    olcum = {}
    if birincil:
        olcum["yolSayisi"] = birincil["n"]
        olcum["yolRms"] = round(birincil["rms"], 2)
    if ust and alt:
        dy = alt["y"] - ust["y"]
        fark = (alt["c"] + alt["b"]) - (ust["c"] + ust["b"])
        olcum["egimDerece"] = round(math.degrees(math.atan2(fark, dy)), 2)
        if abs(fark) > 6:
            uyari.append(f"tarama hafif eğik: alt cetvel üsttekinden {fark:+.0f} px kaymış (~{olcum['egimDerece']:+.2f} derece)")
    if sol and sag:
        dsy = float(np.mean([sag[k] - sol[k] for k in "ABCD"]))
        olcum["satirSolSagFarki"] = round(dsy, 1)
        if abs(dsy) > 12:
            uyari.append(f"sağ kenardaki satır harfleri soldakilerden {dsy:+.0f} px kaymış (eğik tarama)")
    if olcum:
        c["olcum"] = olcum
    return c, uyari


def satir_araliklari(satir_y, sayfa_h):
    """Harf merkezlerinden bant sınırları: komşu harflerin ortası, uçlarda yarım adım."""
    harfler = sorted(satir_y)
    ys = [satir_y[k] for k in harfler]
    if len(ys) < 2:
        return None
    adim = (ys[-1] - ys[0]) / (len(ys) - 1)
    sinir = [ys[0] - adim / 2] + [(ys[i] + ys[i + 1]) / 2 for i in range(len(ys) - 1)] + [ys[-1] + adim / 2]
    sinir = [int(min(max(s, 0), sayfa_h) + 0.5) for s in sinir]
    return {k: [sinir[i], sinir[i + 1]] for i, k in enumerate(harfler)}


# ------------------------------------------------------------------ ızgara (cetvelden)

def yol_araligi(cetvel, x0, x1):
    """[x0, x1) 200 dpi sütunlarına merkezi düşen akım yolları: [ilk, son] ya da None."""
    if not cetvel or not cetvel.get("yolX"):
        return None
    anahtar = sorted(cetvel["yolX"], key=int)
    f, son = int(anahtar[0]), int(anahtar[-1])
    if son == f:
        return None
    xf = cetvel["yolX"][anahtar[0]]
    adim = (cetvel["yolX"][anahtar[-1]] - xf) / (son - f)
    lo = max(f, math.ceil((x0 - xf) / adim) + f)
    hi = min(son, math.floor((x1 - 1 - xf) / adim) + f)
    return [lo, hi] if lo <= hi else None


def satir_listesi(cetvel, y0, y1):
    """[y0, y1) 200 dpi satırlarına en az SATIR_MIN_DEGME px değen A-D bantları."""
    if not cetvel or not cetvel.get("satirAralik"):
        return None
    sonuc = [k for k, (b0, b1) in sorted(cetvel["satirAralik"].items())
             if min(y1, b1) - max(y0, b0) >= SATIR_MIN_DEGME]
    return sonuc or None


# ------------------------------------------------------------------ manifest

def yol_goreli(yol):
    return os.path.relpath(yol, KOK).replace(os.sep, "/")


def yerel_izgara(cetvel, x, y, w, h, kat, satirlar):
    """Kırpıntının kendi piksel koordinatlarında ızgara ipucu (x,y,w,h kırpıntının dpi'sinda, kat = dpi/200).

    ilkYol/ilkYolX/yolAdim: kırpıntıdaki ilk akım yolu, merkezinin kırpıntı içindeki x'i, yol başına piksel.
    satirY: listelenen satır bantlarının kırpıntı içindeki [üst, alt] y'si."""
    if not cetvel:
        return None
    out = {}
    ar = yol_araligi(cetvel, x / kat, (x + w) / kat)
    if ar:
        anahtar = sorted(cetvel["yolX"], key=int)
        f, xf = int(anahtar[0]), cetvel["yolX"][anahtar[0]]
        adim = (cetvel["yolX"][anahtar[-1]] - xf) / (int(anahtar[-1]) - f)
        out["ilkYol"] = ar[0]
        out["ilkYolX"] = round((xf + (ar[0] - f) * adim) * kat - x)
        out["yolAdim"] = round(adim * kat, 2)
    if satirlar:
        out["satirY"] = {k: [max(0, round(cetvel["satirAralik"][k][0] * kat - y)),
                             min(h, round(cetvel["satirAralik"][k][1] * kat - y))] for k in satirlar}
    return out or None


def kirpinti_kayitlari(sid, sayfa, tur, dpi, duzen, cetvel, png_kok):
    """Manifest'teki orta/yakin listesi. Koordinatlar o dpi'da; ızgara 200 dpi'ya çevrilerek hesaplanır."""
    kayit = []
    kat = dpi / DPI_TARAMA
    for (r, c, x, y, w, h) in duzen:
        kid = f"s{sayfa}/{tur}/r{r}c{c}"
        satirlar = satir_listesi(cetvel, y / kat, (y + h) / kat)
        k = {
            "id": kid,
            "dosya": yol_goreli(os.path.join(png_kok, sid, f"s{sayfa}", tur, f"r{r}c{c}.png")),
            "dpi": dpi, "x": x, "y": y, "w": w, "h": h,
            "yolAralik": yol_araligi(cetvel, x / kat, (x + w) / kat),
            "satir": satirlar,
        }
        if tur == "orta":   # manifest şişmesin: yerel ızgara ipucu yalnız ana set (orta) için
            k["yerel"] = yerel_izgara(cetvel, x, y, w, h, kat, satirlar)
        kayit.append(k)
    return kayit


NOTLAR = [
    "x,y,w,h: sayfanın sol üstünden piksel. orta kırpıntılar 200 dpi, yakin kırpıntılar 400 dpi koordinatındadır (yakin = 2 x orta).",
    "cetvel 200 dpi sayfa pikselindedir. Akım yolu n'nin merkez x'i: yolX[ilk] + (n - ilk) * yolAdim. Satır harfi merkezleri satirY'de, bant sınırları satirAralik'tadır.",
    "yolAralik: merkezi kırpıntının içinde kalan akım yolları. satir: kırpıntıya en az 20 px (200 dpi) değen satır bantları.",
    "yerel (yalnız orta kırpıntılarda): ızgara ipucu, kırpıntının kendi piksel koordinatlarında. ilkYol numaralı akım yolunun merkezi x=ilkYolX'te, sonraki yollar yolAdim aralıkla; satirY: satır bantlarının kırpıntıdaki [üst, alt] y'si.",
    "Kırpıntılar eşit aralıklı dağıtılır; komşular en az %15 üst üste biner (orta ~%34, yakin ~%17). tam.png: uzun kenar 1568 px.",
    "yolXAlt (alt cetvel) ve satirYSag (sağ harfler) taramanın eğikliğini gösterir; cetvelde null = ölçülemedi.",
]


def manifest_oku(yol):
    if not os.path.exists(yol):
        return None
    try:
        with open(yol, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def json_yaz(obj, girinti=0, genislik=340):
    """JSON; sığan iç içe parçaları tek satırda tutar (kırpıntı kayıtları satır başına bir tane)."""
    kompakt = json.dumps(obj, ensure_ascii=False)
    if not isinstance(obj, (dict, list)) or not obj or len(kompakt) + girinti <= genislik:
        return kompakt
    ic = " " * (girinti + 1)
    if isinstance(obj, dict):
        satirlar = [f"{ic}{json.dumps(k, ensure_ascii=False)}: {json_yaz(v, girinti + 1, genislik)}" for k, v in obj.items()]
        return "{\n" + ",\n".join(satirlar) + "\n" + " " * girinti + "}"
    return "[\n" + ",\n".join(ic + json_yaz(v, girinti + 1, genislik) for v in obj) + "\n" + " " * girinti + "]"


def icerik_ozeti(m):
    """Karşılaştırma için 'uretim' hariç manifest."""
    return json.dumps({k: v for k, v in m.items() if k != "uretim"}, sort_keys=True, ensure_ascii=False)


# ------------------------------------------------------------------ ana iş

class Sayac:
    def __init__(self):
        self.uretilen = 0
        self.atlanan = 0
        self.ayrinti = collections.OrderedDict()

    def say(self, ad, uretildi):
        u, a = self.ayrinti.get(ad, (0, 0))
        self.ayrinti[ad] = (u + 1, a) if uretildi else (u, a + 1)
        if uretildi:
            self.uretilen += 1
        else:
            self.atlanan += 1


def sayfa_isle(sid, s, sayfa, kapak, pdf, png_kok, zorla, cetvel_yenile, elle, eski_sayfa, gecici, sayac):
    L, bilgi = ham_raster(pdf, sayfa, gecici)
    L = dondur(L, elle)
    W, H = L.size
    sdir = os.path.join(png_kok, sid, f"s{sayfa}")
    yerel = Sayac()

    def uret(ad, yol, boyut, olustur, dpi=None):
        if not zorla and png_hazir(yol, boyut):
            sayac.say(ad, False)
            yerel.say(ad, False)
            return False
        png_yaz(olustur(), yol, dpi)
        sayac.say(ad, True)
        yerel.say(ad, True)
        return True

    # tam.png
    tam_boy = (max(1, round(W * TAM_UZUN / max(W, H))), max(1, round(H * TAM_UZUN / max(W, H))))
    uret("tam", os.path.join(sdir, "tam.png"), tam_boy, lambda: tam_gorsel(L))

    # sayfa-400.png (bellekte tutulur ya da gerektiğinde diskten okunur)
    s400 = {}
    yol400 = os.path.join(sdir, "sayfa-400.png")

    def sayfa400():
        if "img" not in s400:
            if not zorla and png_hazir(yol400, (2 * W, 2 * H)):
                im = Image.open(yol400)
                im.load()
                s400["img"] = im
            else:
                s400["img"] = buyut(L, DPI_YAKIN / DPI_TARAMA)
        return s400["img"]

    if zorla or not png_hazir(yol400, (2 * W, 2 * H)):
        png_yaz(sayfa400(), yol400, DPI_YAKIN)
        sayac.say("sayfa-400", True)
        yerel.say("sayfa-400", True)
    else:
        sayac.say("sayfa-400", False)
        yerel.say("sayfa-400", False)

    girdi = {
        "sayfa": sayfa, "kapak": kapak, "ptBoyut": bilgi["ptBoyut"],
        "donme": (bilgi["pdfDonme"] + elle) % 360,
        "pdfDonme": bilgi["pdfDonme"], "elleDonme": elle, "kaynakRaster": bilgi["kaynak"],
        "sayfaPiksel": {str(DPI_TARAMA): [W, H], str(DPI_YAKIN): [2 * W, 2 * H]},
        "tam": yol_goreli(os.path.join(sdir, "tam.png")),
        "sayfa400": yol_goreli(yol400),
    }

    if kapak:
        girdi.update({"cetvel": None, "orta": [], "yakin": []})
        return girdi, [], yerel

    # kırpıntılar
    duzen_orta = kirpinti_duzeni(W, H)
    for (r, c, x, y, w, h) in duzen_orta:
        uret("orta", os.path.join(sdir, "orta", f"r{r}c{c}.png"), (w, h),
             lambda x=x, y=y, w=w, h=h: L.crop((x, y, x + w, y + h)), DPI_TARAMA)
    duzen_yakin = kirpinti_duzeni(2 * W, 2 * H)
    for (r, c, x, y, w, h) in duzen_yakin:
        uret("yakin", os.path.join(sdir, "yakin", f"r{r}c{c}.png"), (w, h),
             lambda x=x, y=y, w=w, h=h: sayfa400().crop((x, y, x + w, y + h)), DPI_YAKIN)

    # cetvel: manifest'tekini koru (elle düzeltilmiş olabilir); yoksa/--cetvel/--zorla ise ölç
    uyarilar = []
    eski_ok = (eski_sayfa is not None and "cetvel" in eski_sayfa
               and eski_sayfa.get("sayfaPiksel", {}).get(str(DPI_TARAMA)) == [W, H])
    if eski_ok and not (zorla or cetvel_yenile):
        cetvel, cetvel_durum = eski_sayfa["cetvel"], "manifest'ten"
        uyarilar = list(eski_sayfa.get("uyarilar", []))
    else:
        cetvel, uyarilar = cetvel_olc(L)
        cetvel_durum = "ölçüldü" if cetvel else "ÖLÇÜLEMEDİ (null)"
    yerel.cetvel = cetvel_durum

    girdi["cetvel"] = cetvel
    girdi["orta"] = kirpinti_kayitlari(sid, sayfa, "orta", DPI_TARAMA, duzen_orta, cetvel, png_kok)
    girdi["yakin"] = kirpinti_kayitlari(sid, sayfa, "yakin", DPI_YAKIN, duzen_yakin, cetvel, png_kok)
    if uyarilar:
        girdi["uyarilar"] = uyarilar
    return girdi, uyarilar, yerel


def secilecek_semalar(args, cfg, manifest):
    tum = list(cfg["semalar"])
    if args.hepsi:
        return tum
    if args.dilim is not None:
        sec = [k for k in tum if cfg["semalar"][k].get("dilim") == args.dilim]
        if not sec:
            raise Hata(f"semalar.json'da dilim {args.dilim} yok")
        return sec
    if args.semalar:
        bilinmeyen = [k for k in args.semalar if k not in cfg["semalar"]]
        if bilinmeyen:
            raise Hata(f"semalar.json'da olmayan şema kimliği: {', '.join(bilinmeyen)}")
        return args.semalar
    if manifest and manifest.get("semalar"):
        return [k for k in tum if k in manifest["semalar"]]
    return [k for k in tum if cfg["semalar"][k].get("dilim") == 1]


def main(argv=None):
    ap = argparse.ArgumentParser(description="PDF şemalarını görüntüye çevirir, kırpar, manifest yazar.")
    ap.add_argument("semalar", nargs="*", help="şema kimlikleri")
    ap.add_argument("--dilim", type=int)
    ap.add_argument("--hepsi", action="store_true")
    ap.add_argument("--zorla", action="store_true")
    ap.add_argument("--cetvel", action="store_true")
    ap.add_argument("--dondur", action="append", default=[], metavar="SEMA:SAYFA:DERECE")
    ap.add_argument("--hedef", default="kaynak")
    args = ap.parse_args(argv)

    hedef = os.path.join(KOK, args.hedef)
    png_kok = os.path.join(hedef, "png")
    manifest_yolu = os.path.join(hedef, "manifest.json")

    elle = {}
    for d in args.dondur:
        try:
            sid, sayfa, derece = d.split(":")
            elle[(sid, int(sayfa))] = int(derece) % 360
        except ValueError:
            raise Hata(f"--dondur biçimi SEMA:SAYFA:DERECE olmalı: {d!r}")
        if elle[(sid, int(sayfa))] not in (0, 90, 180, 270):
            raise Hata("--dondur derecesi 0/90/180/270 olmalı")

    cfg = ayar_oku()
    eski = manifest_oku(manifest_yolu)
    secilen = secilecek_semalar(args, cfg, eski)
    eski_semalar = (eski or {}).get("semalar", {})
    yeni_semalar = dict(eski_semalar)
    sayac = Sayac()
    tum_uyarilar = []

    os.makedirs(os.path.join(KOK, ".gecici", "hazirlik"), exist_ok=True)
    gecici = tempfile.mkdtemp(prefix="hz-", dir=os.path.join(KOK, ".gecici", "hazirlik"))
    try:
        for sid in secilen:
            s = cfg["semalar"][sid]
            pdf = pdf_bul(cfg, s["pdf"])
            sayfalar = sorted([(p, False) for p in s["sayfalar"]] + [(p, True) for p in s["kapak"]])
            eski_girdi = eski_semalar.get(sid, {})
            eski_sayfalar = {g["sayfa"]: g for g in eski_girdi.get("sayfalar", [])}
            sayfa_girdileri = []
            for sayfa, kapak in sayfalar:
                girdi, uyarilar, yerel = sayfa_isle(
                    sid, s, sayfa, kapak, pdf, png_kok, args.zorla, args.cetvel,
                    elle.get((sid, sayfa), (eski_sayfalar.get(sayfa) or {}).get("elleDonme", 0)),
                    eski_sayfalar.get(sayfa), gecici, sayac)
                sayfa_girdileri.append(girdi)
                ozet = "  ".join(f"{ad}: {u} üretildi/{a} atlandı" for ad, (u, a) in yerel.ayrinti.items())
                print(f"{sid:16} s{sayfa} {'(kapak) ' if kapak else ''}{ozet}"
                      + ("" if kapak else f"  cetvel: {yerel.cetvel}"))
                for u in uyarilar:
                    tum_uyarilar.append(f"{sid} s{sayfa}: {u}")
            yeni_semalar[sid] = {"ad": s["ad"], "pdf": s["pdf"], "pdfYolu": pdf, "sayfalar": sayfa_girdileri}
    finally:
        shutil.rmtree(gecici, ignore_errors=True)

    # şemaları semalar.json sırasına diz
    sirali = {k: yeni_semalar[k] for k in cfg["semalar"] if k in yeni_semalar}
    sirali.update({k: v for k, v in yeni_semalar.items() if k not in sirali})
    yeni = {"uretim": None, "notlar": NOTLAR, "semalar": sirali}
    if eski is not None and icerik_ozeti(eski) == icerik_ozeti({**yeni, "uretim": eski.get("uretim")}):
        manifest_durum = "değişmedi"
    else:
        yeni["uretim"] = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
        os.makedirs(hedef, exist_ok=True)
        gecici_m = manifest_yolu + ".tmp"
        with open(gecici_m, "w", encoding="utf-8") as f:
            f.write(json_yaz(yeni) + "\n")
        os.replace(gecici_m, manifest_yolu)
        manifest_durum = "yazıldı"

    for u in tum_uyarilar:
        print("UYARI", u)
    print(f"TOPLAM: {sayac.uretilen} dosya üretildi, {sayac.atlanan} atlandı; manifest {manifest_durum} ({yol_goreli(manifest_yolu)})")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Hata as e:
        print(f"HATA: {e}", file=sys.stderr)
        sys.exit(2)
