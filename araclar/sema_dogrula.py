"""veri/semalar.json'daki her PDF adının kaynak klasörde tam bir dosyaya çözüldüğünü doğrular.

Kullanım: python3 -I araclar/sema_dogrula.py
(Diskteki adlar NFD, yapılandırmadaki NFC: karşılaştırma normalize edilerek yapılır.)
"""
import json
import os
import subprocess
import sys
import unicodedata

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def nfc(s):
    return unicodedata.normalize("NFC", s)


def main():
    with open(os.path.join(KOK, "veri", "semalar.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    klasor = os.path.expanduser(cfg["kaynakKlasor"])
    dosyalar = {nfc(ad): ad for ad in os.listdir(klasor)}
    hata = 0
    for sid, s in cfg["semalar"].items():
        gercek = dosyalar.get(nfc(s["pdf"]))
        if not gercek:
            print(f"YOK    {sid:18} {s['pdf']}")
            hata += 1
            continue
        yol = os.path.join(klasor, gercek)
        cikti = subprocess.run(["pdfinfo", yol], capture_output=True, text=True).stdout
        sayfa = next((int(l.split()[1]) for l in cikti.splitlines() if l.startswith("Pages:")), None)
        gerek = max(s["sayfalar"] + s["kapak"])
        durum = "tamam " if sayfa and sayfa >= gerek else "SAYFA?"
        nfd = "NFD" if gercek != nfc(gercek) else "NFC"
        if durum != "tamam ":
            hata += 1
        print(f"{durum} {sid:18} {sayfa} sayfa, disk adı {nfd}  {nfc(gercek)}")
    sys.exit(1 if hata else 0)


if __name__ == "__main__":
    main()
