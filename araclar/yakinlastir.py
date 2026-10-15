#!/usr/bin/env python3
"""Sayfanın istenen bölgesini büyütüp PNG olarak yazar; yolu yazdırır.

Kullanım:
  python3 -I araclar/yakinlastir.py <sema> <sayfa> <x> <y> <w> <h> [dpi] [--zorla] [--cikti KLASOR]

  <sema>      şema kimliği (veri/semalar.json), <sayfa> PDF sayfa numarası (1'den)
  x y w h     bölge, **200 dpi** sayfa pikselinde (manifest'teki orta kırpıntıların x,y,w,h'si ile aynı
              eksen; yakin kırpıntıların koordinatını 2'ye böl)
  dpi         çıktı çözünürlüğü, varsayılan 600 (200 dpi taramanın 3 katı). Çıktı w*dpi/200 x h*dpi/200 px.
  --zorla     çıktı varsa yeniden üretir (yoksa var olan dosya atlanır)
  --cikti     çıktı klasörü (varsayılan .gecici/yakin)

Çıktı: .gecici/yakin/<sema>_s<sayfa>_x<x>_y<y>_w<w>_h<h>_<dpi>.png (gri). Büyütme, hazirla.py'deki
sayfa-400 ile aynı yöntemle yapılır: PDF'teki 200 dpi tarama doğrudan alınır, Lanczos ile büyütülür.
Okuyucu için ideal çıktı boyutu uzun kenarda <= 1568 px'tir; daha büyükse bölgeyi daralt.
"""
import argparse
import importlib.util
import os
import shutil
import sys
import tempfile

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def hazirla_yukle():
    """araclar/hazirla.py'yi yolundan yükler (-I kipinde komşu dosya otomatik görünmez)."""
    sys.dont_write_bytecode = True   # araclar/__pycache__ altına .pyc yazma
    yol = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hazirla.py")
    spec = importlib.util.spec_from_file_location("hazirla", yol)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main(argv=None):
    ap = argparse.ArgumentParser(description="Sayfa bölgesini büyütür.")
    ap.add_argument("sema")
    ap.add_argument("sayfa", type=int)
    ap.add_argument("x", type=float)
    ap.add_argument("y", type=float)
    ap.add_argument("w", type=float)
    ap.add_argument("h", type=float)
    ap.add_argument("dpi", type=int, nargs="?", default=600)
    ap.add_argument("--zorla", action="store_true")
    ap.add_argument("--cikti", default=os.path.join(".gecici", "yakin"))
    a = ap.parse_args(argv)

    hz = hazirla_yukle()
    x, y, w, h = (int(round(v)) for v in (a.x, a.y, a.w, a.h))
    if w < 1 or h < 1 or a.dpi < 50:
        raise hz.Hata("w, h >= 1 ve dpi >= 50 olmalı")
    cikti_klasoru = os.path.join(KOK, a.cikti)
    cikti = os.path.join(cikti_klasoru, f"{a.sema}_s{a.sayfa}_x{x}_y{y}_w{w}_h{h}_{a.dpi}.png")
    if os.path.exists(cikti) and not a.zorla:
        print(cikti)
        return 0

    cfg = hz.ayar_oku()
    if a.sema not in cfg["semalar"]:
        raise hz.Hata(f"semalar.json'da olmayan şema kimliği: {a.sema}")
    pdf = hz.pdf_bul(cfg, cfg["semalar"][a.sema]["pdf"])

    # manifest'te elle döndürülmüş sayfa varsa aynı döndürmeyi uygula (koordinatlar tutsun)
    elle = 0
    manifest = hz.manifest_oku(os.path.join(KOK, "kaynak", "manifest.json"))
    if manifest:
        for g in manifest.get("semalar", {}).get(a.sema, {}).get("sayfalar", []):
            if g["sayfa"] == a.sayfa:
                elle = g.get("elleDonme", 0)

    os.makedirs(cikti_klasoru, exist_ok=True)
    gecici = tempfile.mkdtemp(prefix=".yk-", dir=cikti_klasoru)
    try:
        L, _ = hz.ham_raster(pdf, a.sayfa, gecici)
    finally:
        shutil.rmtree(gecici, ignore_errors=True)
    L = hz.dondur(L, elle)

    W, H = L.size
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        raise hz.Hata(f"bölge sayfanın dışında (sayfa {W}x{H} px, 200 dpi)")
    if (x0, y0, x1, y1) != (x, y, x + w, y + h):
        print(f"UYARI: bölge sayfaya sığdırıldı: x={x0} y={y0} w={x1 - x0} h={y1 - y0}", file=sys.stderr)
    kat = a.dpi / hz.DPI_TARAMA
    cikti_img = hz.buyut(L, kat, (x0, y0, x1 - x0, y1 - y0)) if kat != 1 else L.crop((x0, y0, x1, y1))
    if max(cikti_img.size) > hz.TAM_UZUN:
        print(f"UYARI: çıktı {cikti_img.size[0]}x{cikti_img.size[1]} px; uzun kenar {hz.TAM_UZUN} px'i aşıyor, "
              "görüntüleyici küçültür. Bölgeyi daralt ya da dpi'yı düşür.", file=sys.stderr)
    hz.png_yaz(cikti_img, cikti, a.dpi)
    print(cikti)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:   # Hata ya da beklenmedik
        print(f"HATA: {e}", file=sys.stderr)
        sys.exit(2)
