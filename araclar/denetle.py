#!/usr/bin/env python3
"""Uzlaştırılmış şema verilerini (veri/<sema>.json) denetler; veriyi DÜZELTMEZ, yalnız rapor yazar.

Kullanım:
  python3 -I araclar/denetle.py          veri/DENETIM.md ve SUPHELILER.md dosyalarını baştan üretir
  python3 -I araclar/denetle.py --siki   aynı; hata bulunursa çıkış kodu 1 olur

Kapsam
  - veri/ altında (alt klasörlere inmeden) "kablolar" anahtarı olan şema dosyaları. semalar.json ve
    cihazlar.json okunmaz. "taslak": true olan dosya atlanır ("taslak, denetlenmedi"; hata sayılmaz).
  - Uzlaştırma kontrolü karsilastir.py --kontrol'dan alınır (yeniden yazılmadı; veri dosyasına yazması
    engellenir); buradaki denetimler onun üstüne eklenir. Denetim kodları: DENETIM_ADLARI.
  - Aynı veriyle her çalıştırmada aynı bayt çıkar (zaman damgası yok, her şey sıralı).
  - KB_KOK ortam değişkeni proje kökünü değiştirir (ortak.py gibi; testler için).
"""
import contextlib
import io
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from itertools import combinations

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import karsilastir  # noqa: E402
import ortak  # noqa: E402
from ortak import dolu, norm  # noqa: E402

ONEMLER = ("hata", "uyari", "bilgi")
ONEM_AD = {"hata": "Hata", "uyari": "Uyarı", "bilgi": "Bilgi"}

DENETIM_ADLARI = {
    "D1": "Parça ve uç biçimi (2 uç, uç türü, zorunlu alanlar, alan türleri)",
    "D2": "`ham` metni ile ayrıştırılmış alanlar uyuşuyor mu",
    "D3": "`etiket` ile `no / isaret / kesit / renk` uyuşuyor mu",
    "D4": "Aynı cihaz+soket+pine farklı numaralı kablo düşüyor mu",
    "D5": "Uçlardaki kodlar bileşen listelerinde var mı",
    "D6": "Bileşen listesindeki her cihaz çizimde geçiyor mu (eksik kablo avı)",
    "D7": "Şemalar arası tutarlılık (ortak numara, devam bağları, aynı uca farklı numara)",
    "D8": "Açık düğüm ve açık soket ucu",
    "D9": "Soru işareti ve `suphe` kaydının tutarlılığı",
    "D10": "Izgara eksik ya da cetvel dışı (yol 1–76, satır A–D)",
    "D11": "Beyin Listesi çelişkileri (`celiskiler`)",
    "D12": "İç bağlantı (`ic`) ve iki ucu aynı olan parçalar",
    "D13": "Şüpheli karakter örüntüleri (I/1, O/0, …)",
    "D14": "Bileşen listesi kaydı (yinelenme, tür, yol) ve künye",
    "K": "Uzlaştırma kontrolü (`karsilastir.py --kontrol`)",
}
DENETIM_SIRASI = {k: i for i, k in enumerate(DENETIM_ADLARI)}

YOK_SAYILAN_DOSYALAR = {"semalar.json", "cihazlar.json"}
BILINEN_RENKLER = {"ws", "sw", "rt", "gn", "ge", "bl", "br", "gr", "li", "or", "rs"}
CETVEL_YOL = (1, 76)
CETVEL_SATIR = "ABCD"
# Gözün birbirine karıştırdığı karakterler (benzerlik sınıfı): I/L/1, O/0, S/5, B/8, Z/2
BENZER_HARF = str.maketrans({"I": "1", "L": "1", "O": "0", "S": "5", "B": "8", "Z": "2"})
DEBUG = bool(os.environ.get("KB_DEBUG"))


# ---------------------------------------------------------------- yardımcılar

def nfc(s):
    return unicodedata.normalize("NFC", s) if isinstance(s, str) else s


def dz(s):
    """`ham` ile alan karşılaştırması: büyük harf, boşluk ve nokta yok ('X08. 11' = 'X0811')."""
    return norm(s).replace(".", "")


def kimlik_sirasi(kid):
    """'k012' → ('k', 12): doğal sıralama."""
    m = re.match(r"^(\D*)(\d+)", str(kid or ""))
    return (m.group(1), int(m.group(2))) if m else (str(kid or ""), 0)


def izgara_metni(k):
    iz = k.get("izgara") if isinstance(k, dict) else None
    if not isinstance(iz, dict):
        return "ızgara yok"
    parca = []
    if iz.get("sayfa") is not None:
        parca.append(f"sayfa {iz['sayfa']}")
    if dolu(iz.get("yol")):
        parca.append(f"yol {iz['yol']}")
    if dolu(iz.get("satir")):
        parca.append(f"satır {iz['satir']}")
    return " · ".join(parca) or "ızgara yok"


def uclar_guvenli(k):
    u = k.get("uclar") if isinstance(k, dict) else None
    return [x for x in u if isinstance(x, dict)] if isinstance(u, list) else []


def uc_kimligi(u):
    """Ucun tam kimliği. ortak.uc_anahtari adsız düğümleri joker sayar; burada '~d1' ile '~d2' ayrı."""
    if u.get("tur") == "dugum":
        return ("d", norm(u.get("kod")))
    return ortak.uc_anahtari(u)


def pin_anahtari(u):
    """Yalnız pini belli olan cihaz ve ara soket uçları (D4/D7): pinsiz cihaz ucu (toprak, dağıtıcı) çakışma sayılmaz."""
    t = u.get("tur")
    if t == "cihaz" and dolu(u.get("pin")):
        return ortak.uc_anahtari(u)
    if t == "soket" and dolu(u.get("soket")) and dolu(u.get("pin")):
        return ortak.uc_anahtari(u)
    return None


def kablo_kimligi(k):
    """Bir parçanın kablo kimliği: numara; numarasızsa etiket; ikisi de yoksa ''. D4/D7 bununla karşılaştırır."""
    if dolu(k.get("no")):
        return "no:" + norm(k["no"])
    et = norm(k.get("etiket")).lstrip("#") if dolu(k.get("etiket")) else ""
    return ("et:" + et) if et else ""


def kimlik_goster(kim):
    return kim.split(":", 1)[1] if ":" in kim else kim


def kablo_adi(k):
    return k.get("etiket") if dolu(k.get("etiket")) else "(etiketsiz)"


def uc_goster(a):
    """pin_anahtari çıktısını insan okuyacak biçime çevirir."""
    if a[0] == "c":
        s = a[1]
        if a[2]:
            s += f" soket {a[2]}"
        return s + f" pin {a[3]}"
    return f"ara soket {a[1]} pin {a[2]}"


def ascii_kucuk(s):
    return str(s or "").translate(str.maketrans("ıİIşŞğĞüÜöÖçÇ", "iiisSgGuUoOcC")).lower()


def yazim_farki_mi(c):
    return "yazim farki" in ascii_kucuk(c.get("not"))


def aralik_coz(kod):
    """'X03.20-54' → ('X03.', 20, 54, 2): aralık kodu (soket ailesi). Aralık değilse None."""
    m = re.match(r"^(.*?)(\d+)-(\d+)$", norm(kod))
    if not m:
        return None
    onek, alt_s, ust_s = m.groups()
    if len(ust_s) < len(alt_s):
        ust_s = alt_s[: len(alt_s) - len(ust_s)] + ust_s
    alt, ust = int(alt_s), int(ust_s)
    if ust < alt:
        return None
    return onek, alt, ust, len(alt_s)


def aile_uyesi(kod, aile):
    onek, alt, ust, genislik = aile
    k = norm(kod)
    if not k.startswith(onek):
        return False
    kalan = k[len(onek):]
    return kalan.isdigit() and len(kalan) == genislik and alt <= int(kalan) <= ust


def varyant_isareti(kod):
    return norm(kod).startswith("HT")


# ---------------------------------------------------------------- bulgular

class Bulgular:
    def __init__(self):
        self.liste = []

    def ekle(self, onem, sema, kayit, denetim, ne, nerede=""):
        assert onem in ONEMLER and denetim in DENETIM_ADLARI, (onem, denetim)
        self.liste.append({"onem": onem, "sema": sema, "kayit": str(kayit) if kayit else "-",
                           "denetim": denetim, "ne": ne, "nerede": nerede})

    def sirali(self, sema_sirasi):
        def anahtar(b):
            ilk = b["kayit"].split(",")[0].strip()
            return (ONEMLER.index(b["onem"]), sema_sirasi.get(b["sema"], 1000), b["sema"],
                    kimlik_sirasi(ilk), DENETIM_SIRASI[b["denetim"]], b["ne"], b["nerede"])
        return sorted(self.liste, key=anahtar)

    def sayi(self, sema=None):
        c = Counter(b["onem"] for b in self.liste if sema is None or b["sema"] == sema)
        return {o: c.get(o, 0) for o in ONEMLER}


class Sema:
    """Bir şema dosyasının denetim bağlamı."""

    def __init__(self, ad, d, ev, bulgular):
        self.ad, self.d, self.ev, self.b = ad, d, ev, bulgular
        ham_kablolar = d.get("kablolar")
        ham_cihazlar = d.get("cihazlar")
        self.kablolar = [k for k in ham_kablolar if isinstance(k, dict)] if isinstance(ham_kablolar, list) else []
        self.cihazlar = [c for c in ham_cihazlar if isinstance(c, dict)] if isinstance(ham_cihazlar, list) else []
        self.kayit = {}
        for k in self.kablolar:
            self.kayit.setdefault(k.get("id"), k)
        self.celiski_satirlari = []  # rapor için (D11)

    def ekle(self, onem, k, denetim, ne, ek=""):
        """k: kablo kaydı (None olabilir). Yeri (ızgara) otomatik eklenir."""
        kid = k.get("id") if isinstance(k, dict) else None
        nerede = izgara_metni(k) if isinstance(k, dict) else ""
        if ek:
            nerede = f"{nerede} · {ek}" if nerede else ek
        self.b.ekle(onem, self.ad, kid, denetim, ne, nerede)

    def ekle_cok(self, onem, kayitlar, denetim, ne, ek=""):
        """Birden çok kaydı ilgilendiren bulgu: kayıt sütununda hepsi, yer sütununda ilk üçünün ızgarası."""
        kayitlar = sorted({k.get("id"): k for k in kayitlar}.values(), key=lambda k: kimlik_sirasi(k.get("id")))
        ids = ", ".join(str(k.get("id")) for k in kayitlar)
        nerede = " | ".join(izgara_metni(k) for k in kayitlar[:3])
        if ek:
            nerede = f"{nerede} · {ek}" if nerede else ek
        self.b.ekle(onem, self.ad, ids, denetim, ne, nerede)

    def genel(self, onem, denetim, ne, nerede=""):
        self.b.ekle(onem, self.ad, None, denetim, ne, nerede)


# ---------------------------------------------------------------- yükleme

def sema_ayarlari():
    """veri/semalar.json'daki 'semalar' sözlüğü (sıra korunur); okunamazsa boş."""
    try:
        return ortak.oku_json(ortak.yol("veri", "semalar.json")).get("semalar", {}) or {}
    except (OSError, ValueError, AttributeError):
        return {}


def sema_dosyalari():
    """veri/*.json (alt klasörsüz) içinden şema dosyaları: [{ad, veri, hata, taslak}]. Ada göre sıralı."""
    klasor = ortak.yol("veri")
    sonuc = []
    if not os.path.isdir(klasor):
        return sonuc
    for dosya in sorted(os.listdir(klasor)):
        yolu = os.path.join(klasor, dosya)
        if not dosya.endswith(".json") or dosya in YOK_SAYILAN_DOSYALAR or not os.path.isfile(yolu):
            continue
        ad = dosya[:-5]
        try:
            d = ortak.oku_json(yolu)
        except (OSError, ValueError) as e:
            sonuc.append({"ad": ad, "veri": None, "taslak": False,
                          "hata": f"JSON olarak okunamadı ({type(e).__name__}: {e}); şema dosyası mı anlaşılamadı, "
                                  "yazılıyor olabilir"})
            continue
        if not isinstance(d, dict) or "kablolar" not in d:
            continue  # şema dosyası değil
        sonuc.append({"ad": ad, "veri": d, "hata": None, "taslak": bool(d.get("taslak"))})
    return sonuc


def yukle():
    """Tüm şema dosyaları, semalar.json sırasına göre. (dosyalar, ayarlar, sıra_tablosu)."""
    ayarlar = sema_ayarlari()
    sira = {ad: i for i, ad in enumerate(ayarlar)}
    dosyalar = sorted(sema_dosyalari(), key=lambda x: (sira.get(x["ad"], 1000), x["ad"]))
    return dosyalar, ayarlar, sira


# ---------------------------------------------------------------- bütün şemaların ortak bilgisi

class Evren:
    """Denetlenen (taslak olmayan) şemaların ortak bilgisi: bileşen listeleri, ailler, cihaz uçları."""

    def __init__(self, final, tam_kume):
        self.adlar = [ad for ad, _ in final]
        self.tam_kume = tam_kume  # semalar.json'daki bütün şemalar elde mi
        self.liste = defaultdict(list)        # norm kod → [şema]
        self.tanim = defaultdict(dict)        # norm kod → {şema: cihaz kaydı}
        self.aileler = []                     # (şema, aile, kod)
        self.cihaz_uclari = defaultdict(list)  # norm cihaz kodu → [(şema, kablo kaydı, uç no, uç)]
        self.dugum_parca = Counter()          # adlı düğüm kodu → parça sayısı (bütün şemalarda)
        for ad, d in final:
            for c in d.get("cihazlar") or []:
                if not isinstance(c, dict) or not dolu(c.get("kod")):
                    continue
                kod = norm(c["kod"])
                if ad not in self.liste[kod]:
                    self.liste[kod].append(ad)
                self.tanim[kod].setdefault(ad, c)
                aile = aralik_coz(kod)
                if aile:
                    self.aileler.append((ad, aile, kod))
            for k in d.get("kablolar") or []:
                if not isinstance(k, dict):
                    continue
                dugumler = set()
                for i, u in enumerate(uclar_guvenli(k), 1):
                    if u.get("tur") == "cihaz" and dolu(u.get("cihaz")):
                        self.cihaz_uclari[norm(u["cihaz"])].append((ad, k, i, u))
                    if u.get("tur") == "dugum" and dolu(u.get("kod")) and not norm(u["kod"]).startswith("~"):
                        dugumler.add(norm(u["kod"]))
                for kod in dugumler:
                    self.dugum_parca[kod] += 1

    def bul(self, kod):
        """Kod hangi şemaların bileşen listesinde? Tam eşleşme, aralık ailesi ('X03.20-54' ⊇ 'X03.31') ya da
        'liste kodu + .' öneki ('X11' ⊇ 'X11.42') sayılır. [şema adları, sıralı]"""
        k = norm(kod)
        if not k:
            return []
        bulunan = set(self.liste.get(k, []))
        for ad, aile, _ in self.aileler:
            if aile_uyesi(k, aile):
                bulunan.add(ad)
        for lk, adlar in self.liste.items():
            if k.startswith(lk + "."):
                bulunan.update(adlar)
        return sorted(bulunan)

    def yakin_kod(self, kod):
        """Listelerdeki en yakın kod (düzenleme uzaklığı 1); yoksa None. Karışık okuma önerisi için."""
        k = norm(kod)
        adaylar = sorted(c for c in self.liste if c != k and ortak.mesafe(k, c) <= 1)
        return adaylar[0] if adaylar else None


# ---------------------------------------------------------------- K: karsilastir.py --kontrol

KONTROL_ESLEME = (
    (r"tam 2 uç|uç türü|uç bir nesne|ucunda|kimlik boş|durum geçersiz|üst düzey alan", "D1"),
    (r"suphe\.|suphe nesnesi|'\?' karakteri", "D9"),
    (r"izgara eksik", "D10"),
    (r"celiskiler", "D11"),
)


def kontrol_calistir(ad):
    """karsilastir.kontrol'u çağırır; çıktısını ayrıştırır. Veri dosyasına yazması engellenir.
    ([sorunlar], [uyarılar]) döner."""
    tampon = io.StringIO()
    asil_yaz = ortak.yaz_json
    ortak.yaz_json = lambda *a, **k: None  # kontrol() temiz taslağın 'taslak' işaretini siler; asla yazmasın
    try:
        with contextlib.redirect_stdout(tampon):
            karsilastir.kontrol(ad)
    except Exception as e:  # bozuk veri kontrol'u düşürürse bile denetim sürsün
        if DEBUG:
            raise
        return [f"uzlaştırma kontrolü çalışamadı: {type(e).__name__}: {e}"], []
    finally:
        ortak.yaz_json = asil_yaz
    sorunlar, uyarilar, hedef = [], [], None
    for satir in tampon.getvalue().splitlines():
        if satir.startswith("UYARI ("):
            hedef = uyarilar
        elif satir.startswith("SORUN ("):
            hedef = sorunlar
        elif satir.startswith(" - ") and hedef is not None:
            hedef.append(satir[3:])
    return sorunlar, uyarilar


def kontrol_sonuclari(s):
    sorunlar, uyarilar = kontrol_calistir(s.ad)
    for onem, mesajlar in (("hata", sorunlar), ("uyari", uyarilar)):
        for mesaj in mesajlar:
            if mesaj.startswith("dogrulandi false olmalı"):
                continue  # yönetici onay verince dogrulandi true olur; D1 ayrıca ele alıyor
            denetim = "K"
            for desen, kod in KONTROL_ESLEME:
                if re.search(desen, mesaj):
                    denetim = kod
                    break
            m = re.match(r"^(\S+) \(.*?\): (.*)$", mesaj)
            if m and m.group(1) in s.kayit:
                s.ekle(onem, s.kayit[m.group(1)], denetim, m.group(2))
            else:
                s.genel(onem, denetim, mesaj)


# ---------------------------------------------------------------- D1: yapı (karsilastir.py'nin ek olarak baktığı alan türleri)

def d1_yapi(s):
    d = s.d
    if isinstance(d.get("kablolar"), list) and len(s.kablolar) != len(d["kablolar"]):
        s.genel("hata", "D1", "kablolar içinde nesne olmayan öğe var", "kablolar")
    if not isinstance(d.get("kablolar"), list):
        s.genel("hata", "D1", "kablolar bir liste değil", "kablolar")
    if d.get("sema") != s.ad:
        s.genel("uyari", "D1", f"dosya adı '{s.ad}' ama içindeki sema alanı {d.get('sema')!r}", "sema")
    dv = d.get("dogrulandi")
    if dv is True:
        s.genel("bilgi", "D1", "şema doğrulandı olarak işaretli (Olcay PDF'e karşı kontrol etmiş)", "dogrulandi: true")
    elif dv is not False:
        s.genel("hata", "D1", f"dogrulandi true ya da false olmalı: {dv!r}", "dogrulandi")
    for k in s.kablolar:
        if not isinstance(k.get("etiket"), (str, type(None))):
            s.ekle("hata", k, "D1", f"etiket metin ya da null olmalı: {k.get('etiket')!r}")
        if not isinstance(k.get("varyant"), bool):
            s.ekle("hata", k, "D1", f"varyant true/false olmalı: {k.get('varyant')!r}")
        if "ic" in k and k["ic"] is not True:
            s.ekle("uyari", k, "D1", f"ic alanı yazılacaksa yalnız true olmalı (şu an {k['ic']!r}); yoksa alan hiç yazılmaz")
        if not isinstance(k.get("uclar"), list):
            s.ekle("hata", k, "D1", "uclar bir liste değil")
        elif len(uclar_guvenli(k)) != len(k["uclar"]):
            s.ekle("hata", k, "D1", "uclar içinde nesne olmayan öğe var")


# ---------------------------------------------------------------- D2: ham ↔ alanlar

def ham_sorunlari(u):
    """Bir ucun `ham` metni ile ayrıştırılmış alanlarının uyumu. [(önem, metin)]"""
    t = u.get("tur")
    ham = u.get("ham")
    h = dz(ham)
    if t == "cihaz":
        zorunlu = [("soket", u.get("soket")), ("pinAdi", u.get("pinAdi")), ("pin", u.get("pin"))]
        istege_bagli = [("cihaz", u.get("cihaz"))]  # cihaz kodu sembolün yanında yazmayabilir
    elif t == "soket":
        zorunlu = [("soket", u.get("soket")), ("pin", u.get("pin"))]
        istege_bagli = []
    elif t == "dugum":
        zorunlu = [] if norm(u.get("kod")).startswith("~") else [("kod", u.get("kod"))]
        istege_bagli = []
    elif t == "devam":
        zorunlu = [("cihaz", u.get("cihaz")), ("hedef", u.get("hedef"))]
        istege_bagli = []
    else:
        return []
    zorunlu = [(a, v) for a, v in zorunlu if dolu(v)]
    istege_bagli = [(a, v) for a, v in istege_bagli if dolu(v)]
    sonuc = []
    if not h:
        if zorunlu:
            sonuc.append(("uyari", "ham boş ama " + ", ".join(a for a, _ in zorunlu) + " dolu"))
        return sonuc
    kalan = h
    if t in ("cihaz", "soket") and "/" in h:
        once, sonra = h.rsplit("/", 1)
        pin_d = dz(u.get("pin")) if dolu(u.get("pin")) else ""
        if pin_d and sonra != pin_d:
            sonuc.append(("hata", f"pin '{u.get('pin')}' ama ham '{ham}' ('/' sonrası '{sonra}')"))
        elif not pin_d:
            sonuc.append(("uyari", f"ham '{ham}' içinde '/' sonrası '{sonra}' var ama pin boş"))
        kalan = once
        zorunlu = [(a, v) for a, v in zorunlu if a != "pin"]
    hata_var = any(o == "hata" for o, _ in sonuc)
    for alan, deger in sorted(zorunlu + istege_bagli, key=lambda x: -len(dz(x[1]))):
        v = dz(deger)
        if v and v in kalan:
            kalan = kalan.replace(v, "", 1)
        elif (alan, deger) in zorunlu:
            sonuc.append(("hata", f"{alan} '{deger}' ama ham '{ham}'"))
            hata_var = True
    artik = re.sub(r"[/:,;]", "", kalan)
    if artik and not hata_var:
        sonuc.append(("uyari", f"ham '{ham}' içinde alanlarla açıklanmayan metin: '{artik}'"))
    return sonuc


def d2_ham(s):
    for k in s.kablolar:
        for i, u in enumerate(uclar_guvenli(k), 1):
            for onem, ne in ham_sorunlari(u):
                s.ekle(onem, k, "D2", f"uç {i}: {ne}", f"uç {i}")


# ---------------------------------------------------------------- D3: etiket ↔ alanlar

def _alan_norm(alan, v):
    if v is None or v == "":
        return ""
    v = str(v).strip()
    if alan == "kesit":
        return v.replace(",", ".")
    if alan == "renk":
        return v.lower()
    return v


def d3_etiket(s):
    for k in s.kablolar:
        et = k.get("etiket")
        if et is not None and not isinstance(et, str):
            continue  # D1 bildirdi
        coz = ortak.etiket_coz(et)
        if coz is None:
            s.ekle("uyari", k, "D3", f"etiket biçimi tanınmadı: {et!r} (no / işaret / kesit / renk doğrulanamadı)")
            continue
        for alan in ("no", "isaret", "kesit", "renk"):
            if _alan_norm(alan, coz[alan]) != _alan_norm(alan, k.get(alan)):
                s.ekle("hata", k, "D3", f"etiket {et!r} → {alan} {coz[alan]!r} olmalı ama kayıtta {k.get(alan)!r}", alan)
        if "," in str(k.get("kesit") or ""):
            s.ekle("uyari", k, "D3", f"kesit {k.get('kesit')!r}: ondalık ayracı nokta olmalı", "kesit")
        for r in (coz["renk"] or "").split("/"):
            if r and "?" not in r and r not in BILINEN_RENKLER:
                s.ekle("bilgi", k, "D3", f"tanınmayan renk kısaltması {r!r} (olduğu gibi bırakılmış olabilir)", "renk")


# ---------------------------------------------------------------- D4: aynı uca farklı numara

def _ayni_cihaz_kopru(k):
    """İki ucu da aynı cihazın (farklı) pinleri olan parça: soket içi köprü ya da cihaz içi bağlantı."""
    uclar = uclar_guvenli(k)
    return (len(uclar) == 2 and all(u.get("tur") == "cihaz" for u in uclar)
            and dolu(uclar[0].get("cihaz")) and norm(uclar[0].get("cihaz")) == norm(uclar[1].get("cihaz")))


def d4_ayni_uc(s):
    harita = defaultdict(list)  # pin anahtarı → [kablo kaydı]
    for k in s.kablolar:
        uclar = uclar_guvenli(k)
        anahtarlar = [a for a in (pin_anahtari(u) for u in uclar) if a]
        if len(uclar) == 2 and len(anahtarlar) == 2 and uc_kimligi(uclar[0]) == uc_kimligi(uclar[1]):
            continue  # iki ucu aynı olan parça D12'de
        for a in dict.fromkeys(anahtarlar):
            harita[a].append(k)
    for a, ks in sorted(harita.items(), key=lambda x: str(x[0])):
        kimlikler = defaultdict(list)
        for k in ks:
            kim = kablo_kimligi(k)
            if kim:
                kimlikler[kim].append(k)
        if len(kimlikler) < 2:
            continue
        kimlik_metni = "; ".join(f"{kimlik_goster(kim)} ({', '.join(str(k.get('id')) for k in v)})"
                                 for kim, v in sorted(kimlikler.items()))
        varyantli = any(k.get("varyant") is True for v in kimlikler.values() for k in v)
        kopruli = any(_ayni_cihaz_kopru(k) for v in kimlikler.values() for k in v)
        if varyantli:
            onem, ek = "bilgi", " [parçalardan biri varyant (kesikli): seçenekli donanım olabilir]"
        elif kopruli:
            onem, ek = "bilgi", " [parçalardan biri aynı cihazın iki pini arasında köprü (örn. CAN sonlandırma): aynı pine ikinci bir kablo gelmesi normal]"
        elif a[0] == "c":
            onem, ek = "hata", ""
        else:
            onem, ek = "uyari", " [ara soket: soketten sonra numara değişebilir, yine de bak]"
        s.ekle_cok(onem, [k for v in kimlikler.values() for k in v], "D4",
                   f"{uc_goster(a)} ucuna farklı numaralı kablolar bağlanıyor: {kimlik_metni}{ek}")


# ---------------------------------------------------------------- D5: uçlardaki kodlar listelerde var mı

def d5_kodlar(s):
    ev = s.ev
    for k in s.kablolar:
        for i, u in enumerate(uclar_guvenli(k), 1):
            t = u.get("tur")
            ek = f"uç {i}"
            if t == "cihaz" and dolu(u.get("cihaz")):
                bulunan = ev.bul(u["cihaz"])
                if not bulunan:
                    yakin = ev.yakin_kod(u["cihaz"])
                    oneri = f"; listelerde benzeri var: {yakin} (I/1, O/0 karışması olabilir)" if yakin else ""
                    s.ekle("hata", k, "D5", f"uç {i}: cihaz kodu '{u['cihaz']}' hiçbir şemanın bileşen listesinde yok{oneri}", ek)
                elif s.ad not in bulunan:
                    s.ekle("uyari", k, "D5", f"uç {i}: cihaz kodu '{u['cihaz']}' bu şemanın bileşen listesinde yok, "
                                              f"yalnız şunlarda var: {', '.join(bulunan)}", ek)
            elif t == "soket" and dolu(u.get("soket")):
                if not ev.bul(u["soket"]):
                    s.ekle("uyari", k, "D5", f"uç {i}: soket '{u['soket']}' hiçbir bileşen koduna ya da aralık ailesine "
                                              "(örn. X03.20-54) uymuyor", ek)
            elif t == "devam" and dolu(u.get("cihaz")):
                if not ev.bul(u["cihaz"]):
                    onem = "uyari" if ev.tam_kume else "bilgi"
                    ne = f"uç {i}: devam hedefi '{u['cihaz']}' hiçbir şemanın bileşen listesinde yok"
                    ne += "" if ev.tam_kume else " (henüz okunmamış şemada olabilir)"
                    s.ekle(onem, k, "D5", ne, ek)
            elif t == "dugum" and dolu(u.get("kod")) and not norm(u["kod"]).startswith("~"):
                if not ev.bul(u["kod"]):
                    s.ekle("bilgi", k, "D5", f"uç {i}: düğüm kodu '{u['kod']}' bileşen listelerinde yok", ek)


# ---------------------------------------------------------------- D6: listedeki cihaz çizimde geçiyor mu

def d6_liste_cizim(s):
    cihaz_kodlari, soketler = set(), set()
    for k in s.kablolar:
        for u in uclar_guvenli(k):
            t = u.get("tur")
            if t == "cihaz" and dolu(u.get("cihaz")):
                cihaz_kodlari.add(norm(u["cihaz"]))
            elif t == "devam" and dolu(u.get("cihaz")):
                cihaz_kodlari.add(norm(u["cihaz"]))
            elif t == "dugum" and dolu(u.get("kod")):
                cihaz_kodlari.add(norm(u["kod"]))
            elif t == "soket" and dolu(u.get("soket")):
                soketler.add(norm(u["soket"]))
    hepsi = cihaz_kodlari | soketler
    for c in s.cihazlar:
        if not dolu(c.get("kod")):
            continue
        kod = norm(c["kod"])
        yolu = ", ".join(str(y) for y in c.get("yol") or []) or "?"
        aile = aralik_coz(kod)
        if varyant_isareti(kod):
            continue  # HT… varyant işareti: cihaz değil
        if aile:
            if not any(aile_uyesi(x, aile) for x in soketler | cihaz_kodlari):
                s.genel("bilgi", "D6", f"aralık kodu '{c['kod']}' (soket ailesi) için çizimde bu aileden hiçbir uç yok",
                        f"cihazlar[{c['kod']}] · yol {yolu}")
            continue
        if kod in hepsi or any(x.startswith(kod + ".") for x in hepsi):
            continue
        s.genel("uyari", "D6", f"'{c['kod']}' ({c.get('adDe')}) bileşen listesinde var ama çizimde hiçbir kablo "
                                "parçasında geçmiyor (eksik kablo olabilir)", f"cihazlar[{c['kod']}] · yol {yolu}")


# ---------------------------------------------------------------- D8: açık düğüm, açık soket ucu

def d8_acik(s):
    dugum = defaultdict(list)
    soket = defaultdict(list)
    for k in s.kablolar:
        uclar = uclar_guvenli(k)
        kimlikler = [uc_kimligi(u) for u in uclar]
        ic_dongu = len(uclar) == 2 and kimlikler[0] == kimlikler[1]
        for kim, u in zip(kimlikler, uclar):
            if u.get("tur") == "dugum" and dolu(u.get("kod")):
                if k not in dugum[kim]:
                    dugum[kim].append(k)
            elif u.get("tur") == "soket" and pin_anahtari(u) and not ic_dongu:
                if k not in soket[kim]:
                    soket[kim].append(k)
    for kim, ks in sorted(dugum.items()):
        kod = kim[1]
        yerel = kod.startswith("~")
        toplam = len(ks) if yerel else s.ev.dugum_parca.get(kod, len(ks))
        if toplam >= 2:
            continue
        orijinal = next(u.get("kod") for u in uclar_guvenli(ks[0]) if uc_kimligi(u) == kim)
        if yerel:
            s.ekle("hata", ks[0], "D8", f"düğüm '{orijinal}' yalnız bir parçada geçiyor (açık düğüm; öbür dallar eksik olabilir)")
        else:
            s.ekle("uyari", ks[0], "D8", f"düğüm '{orijinal}' bütün şemalarda yalnız bir parçada geçiyor (açık düğüm)")
    for kim, ks in sorted(soket.items()):
        if len(ks) != 1:
            continue
        k = ks[0]
        u = next(u for u in uclar_guvenli(k) if uc_kimligi(u) == kim)
        ne = f"ara soket ucu {u.get('soket')} pin {u.get('pin')} yalnız bir parçada geçiyor (zincir burada açık bitiyor)"
        if dolu(k.get("not")):
            ne += f". Kayıt notu: {str(k['not'])[:110]}"
        s.ekle("uyari", k, "D8", ne)


# ---------------------------------------------------------------- D9: ek tutarlılık (asıl denetim K'da)

def d9_suphe(s):
    for k in s.kablolar:
        if k.get("durum") != "suphe":
            continue
        sp = k.get("suphe") if isinstance(k.get("suphe"), dict) else {}
        if not dolu(sp.get("A")) and not dolu(sp.get("B")):
            s.ekle("uyari", k, "D9", "durum suphe ama suphe.A ve suphe.B boş (SUPHELILER.md'de okumalar gösterilemez)")
        kp = sp.get("kirpinti")
        if dolu(kp) and not os.path.exists(ortak.yol(str(kp))):
            s.ekle("uyari", k, "D9", f"suphe.kirpinti dosyası diskte yok: {kp}")


# ---------------------------------------------------------------- D10: ızgara

def d10_izgara(s):
    sayfalar = (s.d.get("kaynak") or {}).get("sayfalar") if isinstance(s.d.get("kaynak"), dict) else None
    for k in s.kablolar:
        iz = k.get("izgara")
        if not isinstance(iz, dict):
            continue  # eksiklik K'da bildirilir
        yol, satir, sayfa = iz.get("yol"), iz.get("satir"), iz.get("sayfa")
        if dolu(yol):
            m = re.match(r"^~?(\d{1,3})$", str(yol).strip())
            if not m:
                s.ekle("hata", k, "D10", f"izgara.yol {yol!r} biçimsiz (24 ya da ~24 bekleniyordu)", "izgara.yol")
            elif not CETVEL_YOL[0] <= int(m.group(1)) <= CETVEL_YOL[1]:
                s.ekle("hata", k, "D10", f"izgara.yol {yol!r} cetvel dışı ({CETVEL_YOL[0]}–{CETVEL_YOL[1]} bekleniyordu)", "izgara.yol")
        if dolu(satir) and not re.match(rf"^~?[{CETVEL_SATIR}]$", str(satir).strip()):
            s.ekle("hata", k, "D10", f"izgara.satir {satir!r} cetvel dışı ({CETVEL_SATIR[0]}–{CETVEL_SATIR[-1]} bekleniyordu)", "izgara.satir")
        if sayfa is not None and isinstance(sayfalar, list) and sayfa not in sayfalar:
            s.ekle("hata", k, "D10", f"izgara.sayfa {sayfa!r} kaynak.sayfalar {sayfalar} içinde değil", "izgara.sayfa")


# ---------------------------------------------------------------- D11: celiskiler

def d11_celiski(s):
    for c in s.d.get("celiskiler") or []:
        if not isinstance(c, dict):
            continue
        k = s.kayit.get(c.get("kablo"))
        yazim = yazim_farki_mi(c)
        s.celiski_satirlari.append({"sema": s.ad, "kablo": c.get("kablo"), "alan": c.get("alan"),
                                    "sema_degeri": c.get("sema"), "beyin": c.get("beyinListesi"),
                                    "yazim": yazim, "not": c.get("not")})
        metin = f"{c.get('alan')}: şemada '{c.get('sema')}', Beyin Listesi'nde '{c.get('beyinListesi')}'"
        if yazim:
            s.ekle("bilgi", k, "D11", f"{metin} (yazım farkı; şema değeri değişmedi)")
        else:
            s.ekle("uyari", k, "D11", f"{metin} (gerçek değer çelişkisi; şema değeri korundu, hangisi doğru?)")


# ---------------------------------------------------------------- D12: ic ve iki ucu aynı olan parçalar

def d12_ic(s):
    for k in s.kablolar:
        uclar = uclar_guvenli(k)
        if len(uclar) != 2:
            continue
        a, b = uclar
        ic = k.get("ic") is True
        ayni_cihaz = (a.get("tur") == "cihaz" and b.get("tur") == "cihaz" and dolu(a.get("cihaz"))
                      and norm(a.get("cihaz")) == norm(b.get("cihaz")))
        ayni_uc = uc_kimligi(a) == uc_kimligi(b)
        if ic and not ayni_cihaz:
            s.ekle("hata", k, "D12", "ic:true ama iki ucun cihaz kodu aynı değil "
                                      f"({ortak.uc_metni(a)} ↔ {ortak.uc_metni(b)})")
        if ayni_uc:
            if ic:
                s.ekle("uyari", k, "D12", "ic:true ama iki ucu da aynı pin")
            elif a.get("tur") == "soket":
                s.ekle("bilgi", k, "D12", f"iki ucu da aynı soket-pin ({a.get('soket')}/{a.get('pin')}); "
                                           "kesikli kutudaki körük soketi gibi bilinçli olabilir")
            else:
                s.ekle("uyari", k, "D12", f"iki ucu da aynı: {ortak.uc_metni(a)}")
        elif ic:
            s.ekle("bilgi", k, "D12", f"cihaz içi bağlantı (ic:true): {ortak.uc_metni(a)} ↔ {ortak.uc_metni(b)}")
        elif ayni_cihaz:
            s.ekle("bilgi", k, "D12", f"iki ucu da aynı cihaz ({a.get('cihaz')}) ama ic:true değil "
                                       "(cihaz içi köprü olabilir)")


# ---------------------------------------------------------------- D13: şüpheli karakter örüntüleri

def benzer_ozet(deger):
    return norm(deger).translate(BENZER_HARF)


def d13_karakter(s):
    kinds = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))  # tür → özet → ham değer → [kayıt]
    ayri = []  # (kayıt, alan, değer): tek başına şüpheli

    def kaydet(tur, deger, k):
        if not dolu(deger):
            return
        v = norm(deger)
        if k not in kinds[tur][benzer_ozet(v)][v]:
            kinds[tur][benzer_ozet(v)][v].append(k)
        if tur in ("pin", "pinAdi", "soket", "kod", "hedef") and re.fullmatch(r"[0-9IO]+", v) \
                and re.search(r"\d", v) and re.search(r"[IO]", v):
            ayri.append((k, tur, deger, "rakamlar arasında I/O harfi var; 1/0 olabilir"))

    for k in s.kablolar:
        for u in uclar_guvenli(k):
            t = u.get("tur")
            if t == "cihaz":
                for alan, tur in (("cihaz", "cihaz"), ("soket", "soket"), ("pin", "pin"), ("pinAdi", "pinAdi")):
                    kaydet(tur, u.get(alan), k)
            elif t == "soket":
                kaydet("soket", u.get("soket"), k)
                kaydet("pin", u.get("pin"), k)
            elif t == "dugum":
                kaydet("kod", u.get("kod"), k)
            elif t == "devam":
                kaydet("cihaz", u.get("cihaz"), k)
                kaydet("hedef", u.get("hedef"), k)
    for c in s.cihazlar:
        kaydet("cihaz", c.get("kod"), {"id": "liste"})
    for tur, ozetler in sorted(kinds.items()):
        for ozet, degerler in sorted(ozetler.items()):
            if len(degerler) < 2:
                continue
            parcalar = [f"'{v}' ({', '.join(sorted({str(k.get('id')) for k in ks}, key=kimlik_sirasi)[:4])})"
                        for v, ks in sorted(degerler.items())]
            kayitlar = [k for ks in degerler.values() for k in ks if k.get("id") != "liste"]
            ne = f"{tur} alanında yalnız I/1/L, O/0, S/5, B/8, Z/2 farkıyla ayrılan yazımlar: {' ve '.join(parcalar)}"
            if kayitlar:
                s.ekle_cok("uyari", kayitlar, "D13", ne)
            else:
                s.genel("uyari", "D13", ne, "cihazlar")
    for k, alan, deger, neden in ayri:
        if k.get("id") == "liste":
            s.genel("uyari", "D13", f"{alan} '{deger}': {neden}", "cihazlar")
        else:
            s.ekle("uyari", k, "D13", f"{alan} '{deger}': {neden}", alan)
    # cihaz kodu kalıbı: 41A01 gibi kodlarda son iki karakter rakam olmalı
    kodlar = {}
    for k in s.kablolar:
        for u in uclar_guvenli(k):
            for alan in ("cihaz",):
                if u.get("tur") in ("cihaz", "devam") and dolu(u.get(alan)):
                    kodlar.setdefault(norm(u[alan]), (k, u[alan]))
    for c in s.cihazlar:
        if dolu(c.get("kod")):
            kodlar.setdefault(norm(c["kod"]), (None, c["kod"]))
    for kod, (k, orijinal) in sorted(kodlar.items()):
        m = re.match(r"^\d{2}[A-Z](.{2})", kod)
        if m and not m.group(1).isdigit():
            ne = f"cihaz kodu '{orijinal}' kalıba uymuyor (son iki karakter rakam bekleniyordu); I/1 ya da O/0 karışmış olabilir"
            if k is None:
                s.genel("uyari", "D13", ne, "cihazlar")
            else:
                s.ekle("uyari", k, "D13", ne, "cihaz")


# ---------------------------------------------------------------- D14: bileşen listesi, künye

def d14_liste(s):
    kunye = s.d.get("kunye")
    if not isinstance(kunye, dict) or not (dolu(kunye.get("baslik")) and dolu(kunye.get("parcaNo"))):
        s.genel("uyari", "D14", "künye eksik (baslik / parcaNo)", "kunye")
    if not isinstance(s.d.get("varsayilan"), dict):
        s.genel("bilgi", "D14", "varsayilan (BEMERKUNGEN notu) boş: şemada böyle bir not yoksa sorun değil", "varsayilan")
    gorulen = set()
    for c in s.cihazlar:
        if not dolu(c.get("kod")):
            continue
        kod = c["kod"]
        nk = norm(kod)
        yer = f"cihazlar[{kod}]"
        if nk in gorulen:
            s.genel("uyari", "D14", f"bileşen listesinde '{kod}' birden çok kez var", yer)
        gorulen.add(nk)
        turetilen = ortak.tur_turet(kod, c.get("adDe"))
        if c.get("tur") != turetilen and not (c.get("tur") == "diger" and dolu(c.get("not"))):
            s.genel("uyari", "D14", f"'{kod}' türü {c.get('tur')!r} ama koddan/addan türetilen {turetilen!r}", yer)
        if not dolu(c.get("adDe")):
            s.genel("uyari", "D14", f"'{kod}' için Almanca ad (adDe) boş", yer)
        yollar = c.get("yol")
        if not isinstance(yollar, list) or not yollar:
            s.genel("uyari", "D14", f"'{kod}' için akım yolu (yol) listesi boş", yer)
        else:
            for y in yollar:
                m = re.match(r"^(\d{1,3})(?:\.\.(\d{1,3}))?$", str(y).strip())
                alt = int(m.group(1)) if m else None
                ust = int(m.group(2)) if m and m.group(2) else alt
                if not m or not (CETVEL_YOL[0] <= alt <= ust <= CETVEL_YOL[1]):
                    s.genel("uyari", "D14", f"'{kod}' akım yolu {y!r} biçimsiz ya da cetvel dışı", yer)
        if "?" in json.dumps([c.get("kod"), c.get("adDe"), c.get("yol")], ensure_ascii=False):
            s.genel("uyari", "D14", f"'{kod}' kaydında okunamayan karakter (?) var", yer)


# ---------------------------------------------------------------- D7: şemalar arası

def sema_arasi(baglamlar, ev, ayarlar):
    """D7. Rapor için {'ortak': [...], 'devam': [...]} döndürür; bulguları ilgili şemanın bağlamına ekler."""
    sonuc = {"ortak": [], "devam": []}
    adlar = list(baglamlar)

    def yol_metni(ad, kod):
        c = ev.tanim.get(norm(kod), {}).get(ad)
        return ", ".join(str(y) for y in (c or {}).get("yol") or []) or "?"

    # --- devam bağları (tek şemada da çalışır)
    for ad, s in baglamlar.items():
        for k in s.kablolar:
            for i, u in enumerate(uclar_guvenli(k), 1):
                if u.get("tur") != "devam":
                    continue
                hedef = " ".join(str(x) for x in (u.get("cihaz"), u.get("hedef")) if dolu(x))
                satir = {"sema": ad, "kayit": k.get("id"), "kablo": kablo_adi(k), "hedef": hedef, "nerede": "", "durum": ""}
                if not dolu(u.get("cihaz")):
                    satir["nerede"] = "hedef sayfa/yol olarak yazıyor; kendiliğinden bağlanmadı"
                    satir["durum"] = "elle"
                    sonuc["devam"].append(satir)
                    continue
                kod = norm(u["cihaz"])
                kim = kablo_kimligi(k)
                baska = [e for e in ev.cihaz_uclari.get(kod, []) if e[0] != ad]
                listede = ev.bul(kod)
                if baska:
                    ayni = [e for e in baska if kim and kablo_kimligi(e[1]) == kim]
                    if ayni:
                        satir["durum"] = "bağlandı"
                        satir["nerede"] = "; ".join(f"{e[0]}: {e[1].get('id')} ({ortak.uc_metni(e[3])})" for e in ayni[:4])
                    else:
                        satir["durum"] = "numara uymuyor" if kim else "numarasız"
                        satir["nerede"] = "; ".join(sorted({f"{e[0]}: {e[1].get('id')} ({kimlik_goster(kablo_kimligi(e[1])) or 'etiketsiz'})"
                                                            for e in baska})[:4])
                        if kim:
                            s.ekle("uyari", k, "D7", f"uç {i}: devam hedefi {u['cihaz']} şunlarda çizili: "
                                                      f"{', '.join(sorted({e[0] for e in baska}))}; ama orada "
                                                      f"{kimlik_goster(kim)} numaralı kablo bu cihaza bağlanmıyor", f"uç {i}")
                        else:
                            s.ekle("bilgi", k, "D7", f"uç {i}: devam hedefi {u['cihaz']} başka şemada çizili ama bu parça "
                                                      "etiketsiz, kablo eşleştirilemedi", f"uç {i}")
                elif listede:
                    satir["durum"] = "listede"
                    satir["nerede"] = "; ".join(f"{x} bileşen listesinde (yol {yol_metni(x, kod)})" if x != ad
                                                else f"bu şemanın bileşen listesinde (yol {yol_metni(x, kod)})" for x in listede)
                else:
                    satir["durum"] = "yok"
                    satir["nerede"] = "hiçbir şemada yok" + ("" if ev.tam_kume else " (henüz okunmamış şemada olabilir)")
                sonuc["devam"].append(satir)

    if len(adlar) < 2:
        return sonuc

    # --- ortak kablo numaraları
    no_harita = defaultdict(lambda: defaultdict(list))
    for ad, s in baglamlar.items():
        for k in s.kablolar:
            if dolu(k.get("no")):
                no_harita[norm(k["no"])][ad].append(k)
    for no, d_ in sorted(no_harita.items()):
        if len(d_) < 2:
            continue
        semalar = sorted(d_, key=lambda x: (adlar.index(x)))
        uc_kumeleri = {ad: {ortak.uc_anahtari(u) for k in ks for u in uclar_guvenli(k) if u.get("tur") in ("cihaz", "soket")}
                       for ad, ks in d_.items()}
        cs_pinler = {ad: defaultdict(set) for ad in semalar}  # (cihaz, soket) → pinler
        for ad, ks in d_.items():
            for k in ks:
                for u in uclar_guvenli(k):
                    if u.get("tur") == "cihaz" and dolu(u.get("pin")):
                        cs_pinler[ad][(norm(u.get("cihaz")), norm(u.get("soket")))].add(norm(u["pin"]))
        durumlar = []
        for a1, a2 in combinations(semalar, 2):
            ortak_uc = uc_kumeleri[a1] & uc_kumeleri[a2]
            baglanti = None
            if ortak_uc:
                baglanti = "ortak uç: " + ", ".join(sorted(" ".join(x for x in key[1:] if x) for key in ortak_uc)[:3])
            else:
                for x, y in ((a1, a2), (a2, a1)):
                    for k in d_[x]:
                        for u in uclar_guvenli(k):
                            if u.get("tur") == "devam" and dolu(u.get("cihaz")) and any(
                                    uu.get("tur") == "cihaz" and norm(uu.get("cihaz")) == norm(u["cihaz"])
                                    for kk in d_[y] for uu in uclar_guvenli(kk)):
                                baglanti = f"devam ile bağlı ({u['cihaz']})"
            cakisma = [(ck, cs_pinler[a1][ck], cs_pinler[a2][ck]) for ck in sorted(set(cs_pinler[a1]) & set(cs_pinler[a2]))
                       if not (cs_pinler[a1][ck] & cs_pinler[a2][ck])]
            if cakisma:
                for ck, p1, p2 in cakisma:
                    s1 = baglamlar[a1]
                    s1.ekle_cok("uyari", d_[a1] + d_[a2], "D7",
                                f"{kimlik_goster('no:' + no)} numaralı kablo {a1} ve {a2} şemalarında aynı cihaz/soketin "
                                f"({ck[0]}{' soket ' + ck[1] if ck[1] else ''}) farklı pinlerinde: {sorted(p1)} ↔ {sorted(p2)}")
                durumlar.append(f"{a1}↔{a2}: pin çelişkisi")
            elif baglanti:
                durumlar.append(f"{a1}↔{a2}: {baglanti}")
            else:
                durumlar.append(f"{a1}↔{a2}: ortak uç ya da devam bağı yok (farklı kablolar olabilir)")
                baglamlar[a1].ekle_cok("bilgi", d_[a1], "D7",
                                       f"{no} numarası {a2} şemasında da geçiyor ama ortak uç ya da devam bağı yok "
                                       "(aynı numara başka kabloda kullanılmış olabilir)")
        sonuc["ortak"].append({"no": no, "kayitlar": {ad: [str(k.get('id')) for k in d_[ad]] for ad in semalar},
                               "durum": "; ".join(durumlar)})

    # --- aynı cihaz/soket ucuna farklı şemalarda farklı numara; aynı uçta farklı pin adı
    uc_harita = defaultdict(lambda: defaultdict(list))
    for ad, s in baglamlar.items():
        for k in s.kablolar:
            for u in uclar_guvenli(k):
                a = pin_anahtari(u)
                if a:
                    uc_harita[a][ad].append((k, u))
    for a, d_ in sorted(uc_harita.items(), key=lambda x: str(x[0])):
        if len(d_) < 2:
            continue
        for a1, a2 in combinations(sorted(d_, key=adlar.index), 2):
            k1 = {kablo_kimligi(k) for k, _ in d_[a1]} - {""}
            k2 = {kablo_kimligi(k) for k, _ in d_[a2]} - {""}
            if k1 and k2 and not (k1 & k2):
                varyantli = any(k.get("varyant") is True for k, _ in d_[a1] + d_[a2])
                onem = "bilgi" if (varyantli or a[0] == "s") else "uyari"
                baglamlar[a1].ekle_cok(onem, [k for k, _ in d_[a1] + d_[a2]], "D7",
                                       f"{uc_goster(a)} ucuna {a1} şemasında {', '.join(sorted(kimlik_goster(x) for x in k1))}, "
                                       f"{a2} şemasında {', '.join(sorted(kimlik_goster(x) for x in k2))} numaralı kablo bağlı"
                                       + (" [ara soket ya da varyant: numara değişebilir]" if onem == "bilgi" else ""))
            if a[0] == "c":
                p1 = {norm(u.get("pinAdi")) for _, u in d_[a1] if dolu(u.get("pinAdi"))}
                p2 = {norm(u.get("pinAdi")) for _, u in d_[a2] if dolu(u.get("pinAdi"))}
                if p1 and p2 and not (p1 & p2):
                    baglamlar[a1].ekle_cok("uyari", [k for k, _ in d_[a1] + d_[a2]], "D7",
                                           f"{uc_goster(a)} pininin adı {a1} şemasında {sorted(p1)}, {a2} şemasında {sorted(p2)}")

    # --- aynı kod, farklı tanım
    for kod, d_ in sorted(ev.tanim.items()):
        if len(d_) < 2:
            continue
        for a1, a2 in combinations(sorted(d_, key=adlar.index), 2):
            c1, c2 = d_[a1], d_[a2]
            if norm(c1.get("adDe")) != norm(c2.get("adDe")):
                baglamlar[a1].genel("uyari", "D7", f"cihaz '{c1.get('kod')}' Almanca adı {a1}'de {c1.get('adDe')!r}, "
                                                    f"{a2}'de {c2.get('adDe')!r}", f"cihazlar[{c1.get('kod')}]")
            elif c1.get("tur") != c2.get("tur"):
                baglamlar[a1].genel("uyari", "D7", f"cihaz '{c1.get('kod')}' türü {a1}'de {c1.get('tur')!r}, "
                                                    f"{a2}'de {c2.get('tur')!r}", f"cihazlar[{c1.get('kod')}]")
    return sonuc


# ---------------------------------------------------------------- özet sayıları

def ozet_hesapla(s):
    ks = s.kablolar
    sayim = Counter(k.get("durum") for k in ks)
    ayni_uc = 0
    for k in ks:
        uclar = uclar_guvenli(k)
        if len(uclar) == 2 and uc_kimligi(uclar[0]) == uc_kimligi(uclar[1]):
            ayni_uc += 1
    return {
        "parca": len(ks), "eslesti": sayim.get("eslesti", 0), "cozuldu": sayim.get("cozuldu", 0),
        "suphe": sayim.get("suphe", 0), "cihaz": len(s.cihazlar),
        "celiski": len(s.d.get("celiskiler") or []) if isinstance(s.d.get("celiskiler"), list) else 0,
        "etiketsiz": sum(1 for k in ks if not dolu(k.get("etiket"))),
        "varyant": sum(1 for k in ks if k.get("varyant") is True),
        "ic": sum(1 for k in ks if k.get("ic") is True),
        "ayni_uc": ayni_uc,
        "yaklasik": sum(1 for k in ks if isinstance(k.get("izgara"), dict)
                        and (str(k["izgara"].get("yol") or "").startswith("~") or str(k["izgara"].get("satir") or "").startswith("~"))),
        "dogrulandi": s.d.get("dogrulandi"),
    }


# ---------------------------------------------------------------- rapor: DENETIM.md

def md(x):
    """Tablo hücresi için kaçış."""
    return str(x).replace("|", "\\|").replace("\n", " ").strip()


def tablo(basliklar, satirlar, sag=()):
    L = ["| " + " | ".join(basliklar) + " |",
         "|" + "|".join("---:" if i in sag else "---" for i in range(len(basliklar))) + "|"]
    for s in satirlar:
        L.append("| " + " | ".join(md(x) for x in s) + " |")
    return L


def denetim_raporu(r):
    """r: calistir()'ın topladığı sözlük. Markdown metni döner."""
    ayarlar, dosyalar, ozetler, bulgular = r["ayarlar"], r["dosyalar"], r["ozetler"], r["bulgular"]
    sira = r["sira"]
    toplam = bulgular.sayi()
    denetlenen = [x for x in dosyalar if x["veri"] is not None and not x["taslak"]]
    taslaklar = [x for x in dosyalar if x["taslak"]]
    L = ["# Veri denetimi", "",
         "Bu dosya `python3 -I araclar/denetle.py` ile her çalıştırmada baştan üretilir; elle düzenlenmez. "
         "Denetim veriyi **düzeltmez**: sorunu buraya yazar, düzeltme uzlaştırıcıya gider.", "",
         f"**Toplam: {toplam['hata']} hata · {toplam['uyari']} uyarı · {toplam['bilgi']} bilgi** "
         f"({len(denetlenen)} şema denetlendi" + (f", {len(taslaklar)} taslak atlandı" if taslaklar else "") + ").", "",
         "- **Hata**: veri yanlış ya da bozuk. **Uyarı**: şüpheli ama olabilir. **Bilgi**: bilinçli durum ya da yalnız not.",
         "- Denetim kodları (D1…D14, K) bu dosyanın sonundaki listede açıklanır.", ""]

    # --- özet tablosu
    L += ["## Şema özeti", ""]
    satirlar = []
    for x in dosyalar:
        ad = x["ad"]
        goster = f"{ad} ({(ayarlar.get(ad) or {}).get('ad')})" if (ayarlar.get(ad) or {}).get("ad") else ad
        if x["veri"] is None:
            satirlar.append([goster, "okunamadı", "-", "-", "-", "-", "-", "-", "-", 1, 0, 0])
            continue
        oz = ozetler.get(ad)
        if x["taslak"]:
            n = len(x["veri"].get("kablolar") or []) if isinstance(x["veri"].get("kablolar"), list) else 0
            satirlar.append([goster, "taslak, denetlenmedi", n, "-", "-", "-", "-", "-", "-", "-", "-", "-"])
            continue
        say = bulgular.sayi(ad)
        satirlar.append([goster, "denetlendi", oz["parca"], oz["eslesti"], oz["cozuldu"], oz["suphe"], oz["cihaz"],
                         oz["celiski"], oz["etiketsiz"], say["hata"], say["uyari"], say["bilgi"]])
    L += tablo(["Şema", "Durum", "Parça", "eslesti", "cozuldu", "suphe", "Cihaz", "Çelişki", "Etiketsiz parça",
                "Hata", "Uyarı", "Bilgi"], satirlar, sag=set(range(2, 12)))
    L += ["", "Etiketsiz parça hata değildir: çoğu, soket simgesinin iki yarısı arasındaki kısa çizgidir.", ""]
    if denetlenen:
        L += ["Diğer sayılar:", ""]
        L += tablo(["Şema", "Varyant (kesikli)", "Cihaz içi (`ic`)", "İki ucu aynı soket-pin", "Yaklaşık ızgara (~)", "dogrulandi"],
                   [[x["ad"], ozetler[x["ad"]]["varyant"], ozetler[x["ad"]]["ic"], ozetler[x["ad"]]["ayni_uc"],
                     ozetler[x["ad"]]["yaklasik"], "evet" if ozetler[x["ad"]]["dogrulandi"] is True else "hayır"]
                    for x in denetlenen], sag={1, 2, 3, 4})
        L.append("")
    if taslaklar:
        L += ["Taslak dosyalar (`taslak: true`) denetlenmez, hata sayılmaz: "
              + ", ".join(f"`{x['ad']}`" for x in taslaklar) + ". Uzlaştırma bitip işaret kalkınca bir sonraki çalıştırmada denetlenir.", ""]
    bekleyen = [ad for ad in ayarlar if ad not in {x["ad"] for x in dosyalar}]
    if bekleyen:
        L += ["`semalar.json`'da olup henüz veri dosyası olmayan şemalar: " + ", ".join(f"`{a}`" for a in bekleyen) + ".", ""]
    for x in dosyalar:
        if x["veri"] is None:
            L += [f"**`{x['ad']}.json`: {x['hata']}**", ""]

    # --- bulgular
    sirali = bulgular.sirali(sira)
    for onem, baslik in (("hata", "Hatalar"), ("uyari", "Uyarılar"), ("bilgi", "Bilgi")):
        liste = [b for b in sirali if b["onem"] == onem]
        L += [f"## {baslik} ({len(liste)})", ""]
        if not liste:
            L += [{"hata": "Hata yok.", "uyari": "Uyarı yok.", "bilgi": "Bilgi notu yok."}[onem], ""]
            continue
        L += tablo(["Şema", "Kayıt", "Denetim", "Ne", "Nerede"],
                   [[b["sema"], b["kayit"], b["denetim"], b["ne"], b["nerede"]] for b in liste])
        L.append("")
    # dosya okunamadı hataları özet tablosunda ve yukarıda; bulgular listesinde ayrıca sayılmaz

    # --- D7
    L += ["## Şemalar arası (D7)", ""]
    d7 = r["d7"]
    if len(denetlenen) < 2:
        L += [f"Denetlenen şema sayısı {len(denetlenen)}: şemalar arası karşılaştırma (ortak kablo numarası, aynı uca farklı numara, "
              "aynı koda farklı ad) için en az iki şema gerekir. Kapı 1 gibi şemalar taslaktan çıkınca bu bölüm dolar. "
              "Aşağıdaki devam tablosu yine de bu şemaların dışarı çıkan kablolarını gösterir.", ""]
    else:
        L += ["### Ortak kablo numaraları", ""]
        if d7["ortak"]:
            L += tablo(["No", "Hangi şemada (kayıtlar)", "Sonuç"],
                       [[o["no"], "; ".join(f"{a}: {', '.join(v)}" for a, v in o["kayitlar"].items()), o["durum"]]
                        for o in d7["ortak"]])
        else:
            L += ["Birden çok şemada geçen kablo numarası yok."]
        L.append("")
    L += ["### Devam bağlantıları (başka cihaza ya da sayfaya giden kablolar)", ""]
    if d7["devam"]:
        L += tablo(["Şema", "Kayıt", "Kablo", "Hedef", "Durum", "Nerede bulundu"],
                   [[x["sema"], x["kayit"], x["kablo"], x["hedef"], x["durum"], x["nerede"]] for x in d7["devam"]])
    else:
        L += ["`devam` ucu olan kablo yok."]
    L.append("")

    # --- D11
    L += ["## Beyin Listesi çelişkileri (D11)", ""]
    if r["celiskiler"]:
        L += tablo(["Şema", "Kablo", "Alan", "Şemada", "Beyin Listesi'nde", "Tür"],
                   [[c["sema"], c["kablo"], c["alan"], c["sema_degeri"], c["beyin"],
                     "yazım farkı" if c["yazim"] else "gerçek değer çelişkisi"] for c in r["celiskiler"]])
        gercek = sum(1 for c in r["celiskiler"] if not c["yazim"])
        L += ["", f"Toplam {len(r['celiskiler'])} kayıt: {gercek} gerçek değer çelişkisi, {len(r['celiskiler']) - gercek} yazım farkı."]
    else:
        L += ["`celiskiler` kaydı yok."]
    L.append("")

    # --- denetim listesi
    L += ["## Denetim listesi", ""]
    L += tablo(["Kod", "Ne denetler"], [[k, v] for k, v in DENETIM_ADLARI.items()])
    L += ["", "Notlar: D2 `ham` ile alanları noktasız/boşluksuz/büyük harfle karşılaştırır (`X08. 11/4` = `X08.11/4`). "
          "D4 yalnız pini belli uçlara bakar (pinsiz toprak ve dağıtıcı uçları çakışma sayılmaz); iki ucu aynı olan parçalar D12'dedir. "
          "D5/D6 aralık kodlarını (`X03.20-54`) soket ailesi sayar, `HT…` varyant işaretlerini cihaz saymaz. "
          "K satırları `karsilastir.py --kontrol` çıktısıdır; `dogrulandi: true` bir hata değil bilgidir.", ""]
    return "\n".join(L).rstrip("\n") + "\n"


# ---------------------------------------------------------------- rapor: SUPHELILER.md (Olcay için)

_ALAN_ADI = {"pin": "pin numarası", "soket": "soket adı", "etiket": "kablo numarası", "cihaz": "cihaz kodu",
             "pinAdi": "pin adı", "kesit": "kesit", "renk": "renk", "no": "kablo numarası"}

_MANIFEST = {}


def manifest():
    if "m" not in _MANIFEST:
        try:
            _MANIFEST["m"] = ortak.oku_json(ortak.yol("kaynak", "manifest.json"))
        except (OSError, ValueError):
            _MANIFEST["m"] = {}
    return _MANIFEST["m"]


def kirpinti_bul(sema, izgara):
    """kaynak/manifest.json'a göre yol/satırı en ortada kapsayan kırpıntının dosya yolu; yoksa None."""
    if not isinstance(izgara, dict):
        return None
    s = (manifest().get("semalar") or {}).get(sema) or {}
    m = re.search(r"\d+", str(izgara.get("yol") or ""))
    satir = str(izgara.get("satir") or "").lstrip("~")
    if not m or not satir:
        return None
    yol = int(m.group())
    adaylar = []
    for sy in s.get("sayfalar") or []:
        if sy.get("sayfa") != izgara.get("sayfa"):
            continue
        for t in sy.get("orta") or []:
            ar = t.get("yolAralik") or [0, 0]
            if ar[0] <= yol <= ar[1] and satir in (t.get("satir") or []) and t.get("dosya"):
                adaylar.append((-min(yol - ar[0], ar[1] - yol), t["dosya"]))
        if not adaylar and sy.get("tam"):
            adaylar.append((0, sy["tam"]))
    return min(adaylar)[1] if adaylar else None


def uc_duz(u):
    """Olcay için uç metni (jargonsuz)."""
    t = u.get("tur")
    if t == "cihaz":
        ek = []
        if dolu(u.get("soket")):
            ek.append(f"soket {u['soket']}")
        if dolu(u.get("pin")):
            ek.append(f"pin {u['pin']}")
        if dolu(u.get("pinAdi")):
            ek.append(f"pin adı {u['pinAdi']}")
        return str(u.get("cihaz")) + (" (" + ", ".join(ek) + ")" if ek else "")
    if t == "soket":
        return f"ara soket {u.get('soket')}, pin {u.get('pin')}"
    if t == "dugum":
        return f"birleşim noktası {u.get('kod')}" + (" (çizimde adı yazmıyor)" if norm(u.get("kod")).startswith("~") else "")
    if t == "devam":
        return "başka yere devam ediyor (" + " ".join(str(x) for x in (u.get("cihaz"), u.get("hedef")) if dolu(x)) + ")"
    return str(u)


def kablo_duz(k):
    uclar = uclar_guvenli(k)
    ad = f"{k['etiket']} numaralı kablo" if dolu(k.get("etiket")) else "etiketsiz kablo parçası"
    if len(uclar) == 2:
        return f"{ad}: {uc_duz(uclar[0])}  ⟷  {uc_duz(uclar[1])}"
    return ad


def yer_duz(k):
    iz = k.get("izgara") if isinstance(k.get("izgara"), dict) else {}
    parca = []
    if iz.get("sayfa") is not None:
        parca.append(f"sayfa {iz['sayfa']}")
    if dolu(iz.get("yol")):
        parca.append(f"yol {iz['yol']}")
    if dolu(iz.get("satir")):
        parca.append(f"satır {iz['satir']}")
    return " · ".join(parca) or "yer bilinmiyor"


def supheliler_raporu(r):
    ayarlar, dosyalar, sira = r["ayarlar"], r["dosyalar"], r["sira"]
    denetlenen = [x for x in dosyalar if x["veri"] is not None and not x["taslak"]]
    taslaklar = [x for x in dosyalar if x["taslak"]]
    baglamlar = r["baglamlar"]

    def sema_adi(ad):
        return (ayarlar.get(ad) or {}).get("ad") or ad

    def pdf_adi(ad, d):
        return nfc((d.get("kaynak") or {}).get("pdf") or (ayarlar.get(ad) or {}).get("pdf") or "(PDF adı kayıtta yok)")

    ana, yazim = [], []  # (sıralama anahtarı, sema, k, tür, ayrıntı)
    for x in denetlenen:
        s = baglamlar[x["ad"]]
        for k in s.kablolar:
            if k.get("durum") == "suphe":
                ana.append((x["ad"], k, "suphe", None))
        for c in x["veri"].get("celiskiler") or []:
            if not isinstance(c, dict):
                continue
            k = s.kayit.get(c.get("kablo")) or {}
            (yazim if yazim_farki_mi(c) else ana).append((x["ad"], k, "celiski", c))

    def anahtar(m):
        ad, k, _, c = m
        iz = k.get("izgara") if isinstance(k.get("izgara"), dict) else None
        return (sira.get(ad, 1000), ad, karsilastir.yol_sayisi(iz), str((iz or {}).get("satir") or ""),
                kimlik_sirasi(k.get("id")), str((c or {}).get("alan") or ""))

    ana.sort(key=anahtar)
    yazim.sort(key=anahtar)
    suphe_sayisi = sum(1 for m in ana if m[2] == "suphe")

    L = ["# Şüpheli okumalar (Olcay için)", "",
         "Bu dosya `araclar/denetle.py` ile otomatik üretilir; elle düzenleme, bir sonraki çalıştırmada silinir.", "",
         "## Bu dosya ne?", "",
         "Şemalardaki her kabloyu iki ayrı okuyucu (A ve B) birbirinden habersiz okudu. İkisi aynı okursa kablo \"eşleşti\" sayıldı. "
         "Farklı okurlarsa üçüncü bir kişi (uzlaştırıcı) resmi büyütüp karar verdi. Karar veremediği ya da senin bakmanı "
         "istediği yerler bu dosyaya yazıldı. Aşağıdaki her madde kendi başına anlaşılır olacak biçimde yazıldı: hangi şema, "
         "hangi PDF, hangi sayfa, sayfanın neresi, ne soruluyor, iki okuma ne diyor, bakacağın resim hangi dosya.", "",
         "**Sayfanın neresine bakacaksın?** Her şemanın üst ve alt kenarında 1–76 arası numaralar (akım yolları), sol kenarında "
         "A–D harfleri var. \"yol 24 · satır A\" demek: üstteki cetvelde 24 numaralı sütunla soldaki A bandının kesiştiği yer. "
         "Başında ~ işareti varsa (örn. ~32) yer yaklaşıktır, birkaç sütun çevresine bak.", "",
         "**Resim (kırpıntı)** o bölgenin büyütülmüş görüntüsüdür; yolu proje klasörüne göre verildi.", "",
         "## Şemaların durumu", ""]
    for x in dosyalar:
        ad = x["ad"]
        if x["veri"] is None:
            L.append(f"- **{sema_adi(ad)}**: dosya okunamadı, durumu bilinmiyor.")
        elif x["taslak"]:
            L.append(f"- **{sema_adi(ad)}**: henüz hazır değil (uzlaştırma sürüyor). Şüpheleri hazır olunca bu dosyaya gelir.")
        else:
            oz = r["ozetler"][ad]
            L.append(f"- **{sema_adi(ad)}** (PDF: `{pdf_adi(ad, x['veri'])}`): {oz['parca']} kablo parçası okundu; "
                     f"şüpheli {oz['suphe']}, Beyin Listesi ile ayrışan {oz['celiski']}.")
    bekleyen = [a for a in ayarlar if a not in {x["ad"] for x in dosyalar}]
    if bekleyen:
        L.append("- Henüz okunmamış şemalar: " + ", ".join(sema_adi(a) for a in bekleyen) + ".")
    L.append("")

    L += ["## 1. Şüpheli okumalar ve Beyin Listesi ile gerçek çelişkiler", ""]
    if not ana:
        L += ["**Şüpheli yok.** Hazır şemalarda iki okuyucu uzlaştı ve Beyin Listesi ile gerçekten ayrışan bir değer de yok.", ""]
    else:
        if suphe_sayisi == 0:
            L += ["**Şüpheli okuma yok** (iki okuyucu her kabloda uzlaştı). Aşağıda yalnız şema ile Beyin Listesi'nin gerçekten "
                  "farklı yazdığı yerler var.", ""]
        for n, (ad, k, tur, c) in enumerate(ana, 1):
            d = next(x["veri"] for x in denetlenen if x["ad"] == ad)
            L += madde(n, ad, d, k, tur, c, sema_adi(ad), pdf_adi(ad, d))

    L += ["## 2. Beyin Listesi ile yazım farkları (önemsiz olabilir)", ""]
    if not yazim:
        L += ["Yazım farkı kaydı yok.", ""]
    else:
        L += ["Bu maddelerde şemadaki ve Beyin Listesi'ndeki değer büyük olasılıkla aynı şeydir; yalnız yazılışı farklıdır "
              "(örneğin `X11.42/1` ile `X1142/1`). Şemadaki yazılış korundu. Zamanın olursa göz at; acelesi yok.", ""]
        for n, (ad, k, tur, c) in enumerate(yazim, 1):
            d = next(x["veri"] for x in denetlenen if x["ad"] == ad)
            L += madde(n, ad, d, k, tur, c, sema_adi(ad), pdf_adi(ad, d))
    return "\n".join(L).rstrip("\n") + "\n"


def madde(n, ad, d, k, tur, c, sema_goster, pdf):
    """SUPHELILER.md'de tek bir madde."""
    yer = yer_duz(k) if k else "yer bilinmiyor"
    iz = k.get("izgara") if isinstance(k.get("izgara"), dict) else {}
    kablo_ad = f"{k['etiket']}" if dolu(k.get("etiket")) else "etiketsiz kablo"
    L = [f"### {n}. {sema_goster} · {yer.replace('sayfa ', 'sayfa ')} · {kablo_ad}", ""]
    L.append(f"- **Şema:** {sema_goster}")
    L.append(f"- **PDF dosyası:** `{pdf}`")
    L.append(f"- **Sayfa ve yer:** {yer}")
    if k:
        L.append(f"- **Kablo:** {kablo_duz(k)}")
    if tur == "suphe":
        sp = k.get("suphe") if isinstance(k.get("suphe"), dict) else {}
        L.append("- **Türü:** şüpheli okuma (iki okuyucu uzlaşamadı ya da emin olunamadı)")
        L.append(f"- **Soru:** {sp.get('soru') or '(soru kayıtta yazılı değil)'}")
        L.append(f"- **A okuyucusu şöyle okudu:** {sp.get('A') if dolu(sp.get('A')) else '(okumamış)'}")
        L.append(f"- **B okuyucusu şöyle okudu:** {sp.get('B') if dolu(sp.get('B')) else '(okumamış)'}")
        kp = sp.get("kirpinti")
        L.append(f"- **Resim (kırpıntı):** `{kp}`" if dolu(kp) else "- **Resim (kırpıntı):** kayıtta yok")
        if dolu(sp.get("kirpintiB")) and sp.get("kirpintiB") != kp:
            L.append(f"- **İkinci resim:** `{sp['kirpintiB']}`")
        L.append("- **Şimdilik veride duran:** yukarıdaki kablo bilgisi, \"şüpheli\" işaretiyle")
    else:
        yazim = yazim_farki_mi(c)
        alan = _ALAN_ADI.get(c.get("alan"), str(c.get("alan")))
        if yazim:
            L.append("- **Türü:** Beyin Listesi ile yazım farkı (önemsiz olabilir)")
            L.append(f"- **Soru:** {alan.capitalize()} şemada ile Beyin Listesi'nde farklı yazılmış ama büyük olasılıkla aynı şey. "
                     "Gerçekten aynı mı?")
        else:
            L.append("- **Türü:** şema ile Beyin Listesi'nin gerçekten ayrıştığı yer")
            L.append(f"- **Soru:** {alan.capitalize()} şemada ile Beyin Listesi'nde farklı. Hangisi doğru?")
        L.append(f"- **Şemada yazan (A):** {c.get('sema')}")
        L.append(f"- **Beyin Listesi'nde yazan (B):** {c.get('beyinListesi')}")
        kp = kirpinti_bul(ad, iz)
        if kp:
            L.append(f"- **Resim (kırpıntı):** `{kp}`" + ("" if os.path.exists(ortak.yol(kp)) else " (dosya henüz yok)"))
        else:
            L.append("- **Resim (kırpıntı):** kayıtta yok; PDF'te yukarıdaki sayfa ve yere bak")
        L.append("- **Şimdilik veride duran:** şemadaki değer (Beyin Listesi'ne göre değiştirilmedi)")
        if dolu(c.get("not")):
            L.append(f"- **Açıklama:** {c['not']}")
    if tur == "suphe" and dolu(k.get("not")):
        L.append(f"- **Uzlaştırıcının notu:** {k['not']}")
    L.append(f"- (Kayıt no: {k.get('id') if k else '-'})")
    L.append("")
    return L


# ---------------------------------------------------------------- ana akış

def guvenli(s, islev):
    try:
        islev(s)
    except Exception as e:  # bozuk veri tek denetimi düşürse de diğerleri çalışsın
        if DEBUG:
            raise
        s.genel("hata", "K", f"denetim betiği {islev.__name__} adımında beklenmedik hata verdi: {type(e).__name__}: {e} "
                              "(veri biçimi bozuk olabilir)")


def calistir():
    """Verileri okur, bütün denetimleri yürütür; rapor için gereken her şeyi döndürür."""
    dosyalar, ayarlar, sira = yukle()
    bulgular = Bulgular()
    final = [(x["ad"], x["veri"]) for x in dosyalar if x["veri"] is not None and not x["taslak"]]
    tam_kume = bool(ayarlar) and all(ad in {a for a, _ in final} for ad in ayarlar)
    ev = Evren(final, tam_kume)
    baglamlar, ozetler = {}, {}
    for x in dosyalar:
        if x["veri"] is None:
            bulgular.ekle("hata", x["ad"], None, "D1", x["hata"], f"veri/{x['ad']}.json")
    for ad, d in final:
        s = Sema(ad, d, ev, bulgular)
        baglamlar[ad] = s
        for islev in (kontrol_sonuclari, d1_yapi, d2_ham, d3_etiket, d4_ayni_uc, d5_kodlar, d6_liste_cizim,
                      d8_acik, d9_suphe, d10_izgara, d11_celiski, d12_ic, d13_karakter, d14_liste):
            guvenli(s, islev)
        ozetler[ad] = ozet_hesapla(s)
    try:
        d7 = sema_arasi(baglamlar, ev, ayarlar)
    except Exception as e:
        if DEBUG:
            raise
        d7 = {"ortak": [], "devam": []}
        bulgular.ekle("hata", "-", None, "K", f"şemalar arası denetim beklenmedik hata verdi: {type(e).__name__}: {e}")
    celiskiler = [c for ad in baglamlar for c in baglamlar[ad].celiski_satirlari]
    return {"dosyalar": dosyalar, "ayarlar": ayarlar, "sira": sira, "bulgular": bulgular, "baglamlar": baglamlar,
            "ozetler": ozetler, "d7": d7, "celiskiler": celiskiler, "ev": ev}


def yaz_metin(yolu, metin):
    os.makedirs(os.path.dirname(yolu), exist_ok=True)
    with open(yolu, "w", encoding="utf-8", newline="\n") as f:
        f.write(metin)


def main(argv):
    bayraklar = {a for a in argv[1:] if a.startswith("--")}
    if len(argv) - 1 != len(bayraklar) or not bayraklar <= {"--siki"}:
        print(__doc__)
        return 2
    r = calistir()
    yaz_metin(ortak.yol("veri", "DENETIM.md"), denetim_raporu(r))
    yaz_metin(ortak.yol("SUPHELILER.md"), supheliler_raporu(r))
    toplam = r["bulgular"].sayi()
    denetlenen = [x for x in r["dosyalar"] if x["veri"] is not None and not x["taslak"]]
    taslak = [x for x in r["dosyalar"] if x["taslak"]]
    print(f"== denetle: {len(denetlenen)} şema denetlendi" + (f", {len(taslak)} taslak atlandı ({', '.join(x['ad'] for x in taslak)})" if taslak else "") + " ==")
    for x in denetlenen:
        say = r["bulgular"].sayi(x["ad"])
        print(f"{x['ad']}: {r['ozetler'][x['ad']]['parca']} parça · hata {say['hata']} · uyarı {say['uyari']} · bilgi {say['bilgi']}")
    print(f"toplam: hata {toplam['hata']} · uyarı {toplam['uyari']} · bilgi {toplam['bilgi']}")
    print("yazıldı: veri/DENETIM.md, SUPHELILER.md")
    return 1 if ("--siki" in bayraklar and toplam["hata"]) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
