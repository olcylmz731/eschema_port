"""ham_birlestir.py ve karsilastir.py için sentetik veriyle testler (değerler uydurma).

Çalıştırma: TMPDIR=<geçici klasör> python3 -I araclar/test_araclar.py
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

KOK_GECICI = tempfile.mkdtemp(prefix="kb-arac-test-", dir=os.environ.get("TMPDIR"))
os.environ["KB_KOK"] = KOK_GECICI  # ortak.py içe aktarılmadan önce
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ham_birlestir  # noqa: E402
import karsilastir  # noqa: E402
import ortak  # noqa: E402

SEMA = "t1"


def yaz(yol, veri):
    ortak.yaz_json(ortak.yol(*yol), veri)


def parca(kid, kablolar, cihazlar=None, **ek):
    d = {"kirpinti": kid, "cihazlar": cihazlar or [], "kunye": None, "varsayilan": None,
         "kablolar": kablolar, "okunamayanlar": []}
    d.update(ek)
    return d


def cihaz_ucu(cihaz, soket, pin, pin_adi, ham=None):
    return {"tur": "cihaz", "cihaz": cihaz, "soket": soket, "pin": pin, "pinAdi": pin_adi,
            "ham": ham or f"{pin_adi} {soket}/{pin}"}


def soket_ucu(soket, pin):
    return {"tur": "soket", "soket": soket, "pin": pin, "ham": f"{soket}/{pin}"}


def kablo(etiket, u1, u2, kid, yol="24", satir="A", emin=True, **ek):
    d = {"etiket": etiket, "varyant": False, "uclar": [u1, u2],
         "izgara": {"sayfa": 1, "yol": yol, "satir": satir},
         "goruldu": {"kirpinti": kid, "kutu": [0, 0, 10, 10]}, "emin": emin, "not": None}
    d.update(ek)
    return d


CIHAZ = [{"kod": "99A01", "yol": ["12"], "adDe": "Steuergeraet Test"}]


def hazirla_agac():
    for alt in ("veri/ham", ".gecici/ham", "kaynak"):
        os.makedirs(ortak.yol(*alt.split("/")), exist_ok=True)
    yaz(("veri", "semalar.json"), {"semalar": {SEMA: {"ad": "Test", "pdf": "T stromlaufplan.pdf", "sayfalar": [1], "kapak": []}}})
    yaz(("kaynak", "manifest.json"), {"semalar": {SEMA: {"sayfalar": [
        {"sayfa": 1, "kapak": False, "orta": [{"id": "s1/orta/r1c1"}, {"id": "s1/orta/r1c2"}]}]}}})


def parcalari_yaz(kopya, parcalar):
    klasor = ortak.yol(".gecici", "ham", f"{SEMA}.{kopya}")
    shutil.rmtree(klasor, ignore_errors=True)
    os.makedirs(klasor)
    for p in parcalar:
        ad = p["kirpinti"].replace("/", "_") + ".json"
        ortak.yaz_json(os.path.join(klasor, ad), p)


def sessiz(fonk, *a):
    tampon = io.StringIO()
    with contextlib.redirect_stdout(tampon):
        kod = fonk(*a)
    return kod, tampon.getvalue()


R1, R2 = "s1/orta/r1c1", "s1/orta/r1c2"


class OrtakTesti(unittest.TestCase):
    def test_etiket_coz(self):
        e = ortak.etiket_coz
        self.assertEqual(e("#4002"), {"no": "4002", "isaret": "#", "kesit": None, "renk": None})
        self.assertEqual(e("2,5-4135"), {"no": "4135", "isaret": None, "kesit": "2.5", "renk": None})
        self.assertEqual(e("70sw"), {"no": None, "isaret": None, "kesit": "70", "renk": "sw"})
        self.assertEqual(e("1sw/rt"), {"no": None, "isaret": None, "kesit": "1", "renk": "sw/rt"})
        self.assertEqual(e("#br"), {"no": None, "isaret": "#", "kesit": None, "renk": "br"})
        self.assertEqual(e("0001")["no"], "0001")
        self.assertEqual(e("40?2")["no"], "40?2")
        self.assertEqual(e("1,5-1441")["kesit"], "1.5")
        self.assertEqual(e("2,5 br")["renk"], "br")
        self.assertEqual(e(None), {"no": None, "isaret": None, "kesit": None, "renk": None})
        self.assertIsNone(e("garip!!"))

    def test_tur_turet(self):
        t = ortak.tur_turet
        self.assertEqual(t("41A01"), "beyin")
        self.assertEqual(t("41S21.1-2"), "salter")
        self.assertEqual(t("X0501"), "soket")
        self.assertEqual(t("X0501", "Verteiler Motorraum Kl. 30"), "besleme")
        self.assertEqual(t("W0501"), "toprak")
        self.assertEqual(t("30Z07"), "dugum")
        self.assertEqual(t("HT332"), "diger")
        self.assertEqual(t("01G01"), "guc")
        self.assertEqual(t("01V01"), "diyot")

    def test_norm_ve_anahtar(self):
        self.assertEqual(ortak.norm(" x08. 11 "), "X08.11")
        self.assertEqual(ortak.norm("B−"), "B-")
        a = {"tur": "dugum", "kod": "~d1"}
        b = {"tur": "dugum", "kod": "~d7"}
        self.assertEqual(ortak.uc_anahtari(a), ortak.uc_anahtari(b))
        self.assertEqual(ortak.mesafe("4002", "4O02"), 1)


class BirlestirTesti(unittest.TestCase):
    def setUp(self):
        hazirla_agac()

    def test_birlestirme_ve_yinelenen(self):
        w2 = kablo("2,5-4135", cihaz_ucu("99A01", "15", "1", "KL.15"), {"tur": "dugum", "kod": "~d1", "ham": None}, R1)
        parcalari_yaz("A", [
            parca(R1, [kablo("#9999", cihaz_ucu("99A01", "IV-18", "10", "HS10"), soket_ucu("X99.1", "4"), R1), w2], CIHAZ),
            parca(R2, [dict(w2, goruldu={"kirpinti": R2, "kutu": [1, 1, 5, 5]}, emin=False),
                       kablo("70sw", cihaz_ucu("99G01", None, "B+", None, "B+"), soket_ucu("X99.2", "1"), R2)]),
        ])
        kod, cikti = sessiz(ham_birlestir.main, ["x", SEMA, "A"])
        self.assertEqual(kod, 0, cikti)
        h = ortak.oku_json(ortak.yol("veri", "ham", f"{SEMA}.A.json"))
        self.assertTrue(h["tamamlandi"])
        self.assertEqual(len(h["kablolar"]), 3)  # yinelenen birleşti
        k = {x["etiket"]: x for x in h["kablolar"]}
        self.assertEqual(k["#9999"]["isaret"], "#")
        self.assertEqual(k["#9999"]["no"], "9999")
        self.assertEqual(k["2,5-4135"]["kesit"], "2.5")
        self.assertFalse(k["2,5-4135"]["emin"])  # iki görüşten biri emin değildi
        self.assertEqual(len(k["2,5-4135"]["gorulduDiger"]), 1)
        self.assertIsNone(k["70sw"]["no"])
        self.assertEqual(k["70sw"]["renk"], "sw")
        self.assertEqual([x["id"] for x in h["kablolar"]], ["a001", "a002", "a003"])

    def test_gezilmeyen_ve_gecersiz_uc(self):
        kotu = kablo("4001", {"tur": "soket", "soket": "X99.1", "ham": None}, cihaz_ucu("99A01", "15", "1", "X"), R1)
        parcalari_yaz("A", [parca(R1, [kotu], CIHAZ)])
        kod, cikti = sessiz(ham_birlestir.main, ["x", SEMA, "A"])
        self.assertEqual(kod, 1)
        self.assertIn("gezilmeyen kırpıntı", cikti)
        self.assertIn("soket ucunda soket ya da pin yok", cikti)
        h = ortak.oku_json(ortak.yol("veri", "ham", f"{SEMA}.A.json"))
        self.assertFalse(h["tamamlandi"])
        self.assertEqual(h["kalan"], [R2])


class KarsilastirTesti(unittest.TestCase):
    def setUp(self):
        hazirla_agac()
        for ad in (f"{SEMA}.json", f"ham/{SEMA}.fark.json", f"ham/{SEMA}.kararlar.md"):
            with contextlib.suppress(FileNotFoundError):
                os.remove(ortak.yol("veri", *ad.split("/")))

    def _okumalar(self):
        w1 = lambda pin: kablo("#9999", cihaz_ucu("99A01", "IV-18", pin, "HS10"), soket_ucu("X99.1", "4"), R1)  # noqa: E731
        w2 = kablo("2,5-4135", cihaz_ucu("99A01", "15", "1", "KL.15"), {"tur": "dugum", "kod": "~d1", "ham": None}, R1, yol="30")
        w3 = kablo("9999", cihaz_ucu("99A01", "IV-18", "10", "HS10"), {"tur": "devam", "cihaz": "99A02", "hedef": None, "ham": "99A02"}, R1)
        w4 = kablo("70sw", cihaz_ucu("99G01", None, "B+", None, "B+"), soket_ucu("X99.2", "1"), R2)
        w5 = kablo("4040", cihaz_ucu("99A01", "15", "7", "LS"), soket_ucu("X99.3", "2"), R2)
        w6 = kablo("4041", cihaz_ucu("99A01", "15", "?", "LS"), soket_ucu("X99.3", "3"), R2)
        w7 = kablo("4050", cihaz_ucu("99A01", "15", "8", "TBL"), soket_ucu("X99.3", "5"), R2, emin=False)
        a = [parca(R1, [w1("10"), w2, w3], CIHAZ), parca(R2, [w4, w6, w7])]
        # B: w1'de pin farklı, w3 yok, w5 yalnız B'de; w2'nin ızgarası biraz farklı; w2 düğüm adı farklı
        w2b = dict(w2, uclar=[w2["uclar"][0], {"tur": "dugum", "kod": "~d9", "ham": None}], izgara={"sayfa": 1, "yol": "31", "satir": "A"})
        b = [parca(R1, [w1("11"), w2b], CIHAZ), parca(R2, [w4, w5, w6, w7])]
        return a, b

    def _hazirla(self):
        a, b = self._okumalar()
        parcalari_yaz("A", a)
        parcalari_yaz("B", b)
        for kopya in ("A", "B"):
            kod, cikti = sessiz(ham_birlestir.main, ["x", SEMA, kopya])
            self.assertEqual(kod, 0, cikti)

    def test_fark_ve_taslak(self):
        self._hazirla()
        kod, cikti = sessiz(karsilastir.karsilastir, SEMA, False)
        self.assertEqual(kod, 0, cikti)
        f = ortak.oku_json(ortak.yol("veri", "ham", f"{SEMA}.fark.json"))
        o = f["ozet"]
        self.assertEqual(o["A"], 6)
        self.assertEqual(o["B"], 6)
        self.assertEqual(o["alanFarki"], 1)   # w1: pin 10 / 11
        self.assertEqual(o["yalnizA"], 1)     # w3
        self.assertEqual(o["yalnizB"], 1)     # w5
        self.assertEqual(o["belirsiz"], 2)    # w6 ('?'), w7 (ikisi de emin değil)
        self.assertEqual(o["ayni"], 2)        # w2 (düğüm adı joker) ve w4
        self.assertEqual(o["izgaraFarki"], 0)  # w2: yol 30/31, fark ≤ 2
        self.assertEqual(f["alanFarki"][0]["farklar"][0]["alan"], "uc1.pin")
        self.assertEqual(f["yalnizA"][0]["adaylarB"], [])
        t = ortak.oku_json(ortak.yol("veri", f"{SEMA}.json"))
        self.assertTrue(t["taslak"])
        self.assertFalse(t["dogrulandi"])
        self.assertEqual(t["cihazlar"][0]["tur"], "beyin")
        self.assertEqual([k["id"] for k in t["kablolar"]], [f"k{i:03d}" for i in range(1, 7 + 1)])
        durumlar = [k["durum"] for k in t["kablolar"]]
        self.assertEqual(durumlar.count("eslesti"), 2)
        self.assertEqual(durumlar.count("suphe"), 5)
        # üzerine yazmayı reddeder
        kod2, _ = sessiz(karsilastir.karsilastir, SEMA, False)
        self.assertEqual(kod2, 1)

    def test_kontrol_acik_iken_basarisiz_cozulunce_basarili(self):
        self._hazirla()
        sessiz(karsilastir.karsilastir, SEMA, False)
        kod, cikti = sessiz(karsilastir.kontrol, SEMA)
        self.assertEqual(kod, 1)
        self.assertIn("karar bekliyor", cikti)
        # uzlaştırıcı gibi düzenle
        t = ortak.oku_json(ortak.yol("veri", f"{SEMA}.json"))
        satirlar = []
        for k in t["kablolar"]:
            if k["durum"] != "suphe":
                continue
            fid = k["suphe"]["fid"]
            satirlar.append(f"{fid}: karar verildi")
            if k["etiket"] == "4041":  # gerçekten okunamıyor: şüpheli kalsın
                k["suphe"]["soru"] = "Kablo 4041'in 99A01 ucundaki pin kaç?"
                k["not"] = "okunamadı"
            else:
                k["durum"], k["suphe"], k["not"] = "cozuldu", None, "görüntüde bakıldı"
                for u in k["uclar"]:
                    if u.get("pin") == "?":
                        u["pin"] = "9"
        ortak.yaz_json(ortak.yol("veri", f"{SEMA}.json"), t)
        kod, cikti = sessiz(karsilastir.kontrol, SEMA)
        self.assertEqual(kod, 1, cikti)
        self.assertIn("kararlar.md'de karşılığı olmayan", cikti)
        with open(ortak.yol("veri", "ham", f"{SEMA}.kararlar.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(satirlar) + "\n")
        kod, cikti = sessiz(karsilastir.kontrol, SEMA)
        self.assertEqual(kod, 0, cikti)
        self.assertNotIn("taslak", ortak.oku_json(ortak.yol("veri", f"{SEMA}.json")))

    def test_numarala(self):
        self._hazirla()
        sessiz(karsilastir.karsilastir, SEMA, False)
        t = ortak.oku_json(ortak.yol("veri", f"{SEMA}.json"))
        t["kablolar"].reverse()
        ortak.yaz_json(ortak.yol("veri", f"{SEMA}.json"), t)
        sessiz(karsilastir.numarala, SEMA)
        t = ortak.oku_json(ortak.yol("veri", f"{SEMA}.json"))
        self.assertEqual([k["id"] for k in t["kablolar"]], [f"k{i:03d}" for i in range(1, len(t["kablolar"]) + 1)])
        yollar = [karsilastir.yol_sayisi(k["izgara"]) for k in t["kablolar"]]
        self.assertEqual(yollar, sorted(yollar))


def temizle():
    shutil.rmtree(KOK_GECICI, ignore_errors=True)


if __name__ == "__main__":
    try:
        unittest.main(verbosity=2, exit=False)
    finally:
        temizle()
