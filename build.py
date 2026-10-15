#!/usr/bin/env python3
"""Kablo Bulucu derleyicisi (bağımsız Python 3, ek paket gerekmez).

    python3 build.py [--veri veri] [--src src] [--cikti dist/kablo-bulucu.html] [--sessiz] [--kompakt] [--notlar]

veri/semalar.json + veri/<sema>.json + src/**  ->  dist/kablo-bulucu.html   (TEK dosya, çevrimdışı)

* İKİ SÜRÜM (gömülü paket.meta.surum, çalışma zamanında db.meta.surum):
    varsayılan  "dagitim"   atölyeye verilen sürüm: kablo parçalarının "not" alanı, şemanın "celiskiler" listesi (Beyin Listesi
                            farkları) ve "suphe" nesnesindeki geliştirici metinleri (A/B okumaları, kirpinti yolu) GÖMÜLMEZ;
                            "suphe"de yalnız "soru" kalır.   Çıktı: dist/kablo-bulucu.html
    --notlar    "dogrulama" doğrulayıcı sürüm: hepsi gömülür.   Çıktı (--cikti verilmezse): dist/kablo-bulucu-dogrulama.html
  Çekirdek mantığı (zincir, birleştirme, durum/şüphe, doğrulandı, arama) bu alanlara bağlı değildir; yalnız Kenar.not,
  Kenar.beyinListesi ve "beyin-listesi" uyarıları bu verilerle dolar. veri/cihazlar.json her iki sürümde aynıdır.
* CSS ve JS satır içi, veri <script type="application/json" id="kb-veri"> içinde. Dış font/CDN/fetch yok.
* Birleştirme sırası (her klasörde dosya adı sırasıyla):
    CSS: src/tokens.css, src/diyagram/*.css, src/arayuz/*.css
    JS : src/cekirdek/*.js (index.js ve "_" ile başlayanlar hariç), src/diyagram/*.js, src/arayuz/*.js, src/baslat.js
* Şablon src/index.template.html; yoksa yerleşik boş iskelet kullanılır.
  Şablondaki yer tutucular:  <!--KB:CSS-->  <!--KB:VERI-->  <!--KB:JS-->  <!--KB:IMZA-->
* Veri dosyası olmayan şema ATLANIR ve uyarılır. Gömülü veriden goruldu/emin/null alanlar ayıklanır;
  dogrulandi bayrağı olduğu gibi gömülür; kaynakKlasor (yerel yol) gömülmez.
* Yan ürün: <veri>/cihazlar.json  (her şemadaki "cihazlar"ın birleşimi; elle düzenlenmez).
* --kompakt (isteğe bağlı, boyut 1 MB'ı aşarsa): uygulamaca kayıpsız ek ayıklama. varyant:false ve durum:"eslesti"
  (yükleyici bunları zaten varsayılan sayar) ile "eslesti" durumlu, '?' içermeyen parçaların uçlarındaki "ham" metinler atılır.
* Çıkış kodu 0: başarılı (uyarılar olabilir). 1: hata (bozuk JSON, dış kaynak başvurusu, şablon sorunu).
"""
import argparse
import copy
import hashlib
import json
import os
import re
import sys
import unicodedata

KOK = os.path.dirname(os.path.abspath(__file__))
BOYUT_HEDEFI = 1024 * 1024  # 1 MB

uyarilar = []
hatalar = []


def uyar(mesaj):
    uyarilar.append(mesaj)


def hata(mesaj):
    hatalar.append(mesaj)


# --------------------------------------------------------------------------------------------------
# Küçük araçlar
# --------------------------------------------------------------------------------------------------
def _aralik(a, b):
    return ''.join(chr(c) for c in range(a, b + 1))


# Anahtardan atılanlar: boşluk türleri, sıfır genişlikli karakterler, tire benzeri işaretler
_AYIRAC = re.compile('[\\s' + chr(0xa0) + _aralik(0x2000, 0x200f) + chr(0xfeff) + '\\-' + _aralik(0x2010, 0x2015) + chr(0x2212) + ']+')


def norm(s):
    """Cihaz kodu anahtarı; JS tarafındaki KB.normalize.norm ile aynı: büyük harf, boşluk/tire yok, ı/İ -> I, aksan yok, ',' -> '.'.
    (JS'te baştaki/sondaki tire kutup işareti olarak kalır: 'B-'. Cihaz kodlarında böyle bir tire yoktur; pin kimliği burada kurulmaz.)"""
    s = str(s).replace(chr(0x130), 'I').replace(chr(0x131), 'i')
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return _AYIRAC.sub('', s.upper().replace(',', '.'))


def dogal_anahtar(s):
    """Doğal sıralama anahtarı (sayılar sayı gibi; sayı önce, harf sonra)."""
    parcalar = re.findall(r'[0-9]+|[^0-9]+', str(s).upper())
    return [(0, int(p), len(p)) if re.fullmatch(r'[0-9]+', p) else (1, p, 0) for p in parcalar]


def json_oku(yol):
    try:
        with open(yol, encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        hata('%s: JSON hatası: %s' % (yol, e))
    except OSError as e:
        hata('%s: okunamadı: %s' % (yol, e))
    return None


def temizle(x):
    """Gömülü veriden goruldu, emin ve null alanları ayıklar (JS tarafındaki KB.veri.temizle ile aynı)."""
    if isinstance(x, dict):
        return {k: temizle(v) for k, v in x.items() if k not in ('goruldu', 'emin') and v is not None}
    if isinstance(x, list):
        return [temizle(v) for v in x]
    return x


def kompaktla(sema):
    """--kompakt: uygulamaca kayıpsız ek ayıklama (yükleyici varyant:false ve durum:"eslesti"yi varsayılan sayar)."""
    for k in sema.get('kablolar') or []:
        if k.get('varyant') is False:
            del k['varyant']
        temiz = k.get('durum') == 'eslesti' and '?' not in json.dumps(k, ensure_ascii=False)
        if k.get('durum') == 'eslesti':
            del k['durum']
        if temiz:
            for u in k.get('uclar') or []:
                u.pop('ham', None)
    return sema


def dagitim_ayikla(sema, sayac=None):
    """Dağıtım sürümü: geliştirici/doğrulama dili gömülmez. Kopya üzerinde çalışır (giriş değişmez).
    * her kablo parçasının "not" alanı atılır;
    * şemanın "celiskiler" listesi (Beyin Listesi farkları) atılır;
    * "suphe" nesnesinde yalnız "soru" kalır (A/B okumaları, kirpinti yolu gibi geliştirici metinleri gider);
      "soru" yoksa nesne tümden atılır ("durum":"suphe" işareti kalır, çekirdek şüpheyi ondan çıkarır).
    sayac: {'not': n, 'celiski': n, 'suphe': n} sözlüğü verilirse atılanlar sayılır."""
    s = copy.deepcopy(sema)
    sayac = sayac if sayac is not None else {}
    c = s.pop('celiskiler', None)
    sayac['celiski'] = sayac.get('celiski', 0) + (len(c) if isinstance(c, list) else 0)
    for cz in s.get('cihazlar') or []:
        if cz.pop('not', None) is not None:  # cihaz notları da geliştirici dilidir (Beyin Listesi anıları gibi)
            sayac['cihaz_not'] = sayac.get('cihaz_not', 0) + 1
    for k in s.get('kablolar') or []:
        if k.pop('not', None) is not None:
            sayac['not'] = sayac.get('not', 0) + 1
        sp = k.get('suphe')
        if isinstance(sp, dict):
            yalniz = {a: v for a, v in sp.items() if a == 'soru'}
            if len(yalniz) != len(sp):
                sayac['suphe'] = sayac.get('suphe', 0) + 1
            if yalniz:
                k['suphe'] = yalniz
            else:
                del k['suphe']
    return s


def dagitim_denetle(veri):
    """Güvenlik ağı: dağıtım verisinde parça notu, celiskiler ya da soru dışı şüphe alanı kalmışsa hata verir."""
    for sid, d in veri.items():
        if 'celiskiler' in d:
            hata('%s: dağıtım verisinde "celiskiler" kaldı' % sid)
        for cz in d.get('cihazlar') or []:
            if 'not' in cz:
                hata('%s:%s: dağıtım verisinde cihaz "not" alanı kaldı' % (sid, cz.get('kod')))
        for k in d.get('kablolar') or []:
            if 'not' in k:
                hata('%s:%s: dağıtım verisinde parça "not" alanı kaldı' % (sid, k.get('id')))
            if isinstance(k.get('suphe'), dict) and set(k['suphe']) - {'soru'}:
                hata('%s:%s: dağıtım verisinde "suphe" içinde soru dışı alan kaldı' % (sid, k.get('id')))


def metin_oku(yol):
    with open(yol, encoding='utf-8') as f:
        return f.read()


def sirali_dosyalar(klasor, uzanti, haric=()):
    """Klasördeki uzantılı dosyalar, ad sırasıyla; '_' ve '.' ile başlayanlar ve 'haric' atlanır."""
    if not os.path.isdir(klasor):
        return []
    adlar = sorted(
        f for f in os.listdir(klasor)
        if f.endswith(uzanti) and f not in haric and not f.startswith('_') and not f.startswith('.')
        and os.path.isfile(os.path.join(klasor, f))
    )
    return [os.path.join(klasor, f) for f in adlar]


def goreli(yol):
    try:
        return os.path.relpath(yol, KOK)
    except ValueError:
        return yol


def kb(bayt):
    return '%d KB' % round(bayt / 1024.0)


# --------------------------------------------------------------------------------------------------
# Veri
# --------------------------------------------------------------------------------------------------
def veriyi_yukle(veri_klasoru, kompakt=False):
    """semalar.json + dosyası olan şemalar. Döner: (cfg, {sema: temizlenmiş veri}, atlananlar)."""
    cfg = json_oku(os.path.join(veri_klasoru, 'semalar.json'))
    if not isinstance(cfg, dict):
        hata('%s: semalar.json yok ya da geçersiz' % veri_klasoru)
        return None, {}, []
    semalar = cfg.get('semalar') or {}
    veri, atlanan = {}, []
    for sid in semalar:
        yol = os.path.join(veri_klasoru, sid + '.json')
        if not os.path.isfile(yol):
            atlanan.append(sid)
            continue
        d = json_oku(yol)
        if d is None:
            continue
        if d.get('sema') not in (None, sid):
            uyar('%s: dosyadaki "sema" alanı %r' % (sid, d.get('sema')))
        veri[sid] = kompaktla(temizle(d)) if kompakt else temizle(d)
    if atlanan:
        uyar('%d şemanın veri dosyası yok, atlandı: %s' % (len(atlanan), ', '.join(atlanan)))
    return cfg, veri, atlanan


def paketle(cfg, veri, surum='dagitim'):
    """Sayfaya gömülecek paket (KB.veri.yukle bunu okur). surum: 'dagitim' | 'dogrulama' (paket.meta.surum -> db.meta.surum)."""
    ayarlar = cfg.get('semalar') or {}
    govde = {
        'surum': 1,
        'meta': {'surum': surum},
        'sekmeler': cfg.get('sekmeler') or [],
        'semalar': {
            sid: {k: v for k, v in a.items() if k in ('ad', 'pdf', 'sayfalar', 'kapak', 'dilim')}
            for sid, a in ayarlar.items()
        },
        'veri': veri,
    }
    kanonik = json.dumps(govde, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    imza = hashlib.sha256(kanonik.encode('utf-8')).hexdigest()[:8]
    paket = {'surum': 1, 'imza': imza}
    paket.update({k: v for k, v in govde.items() if k != 'surum'})
    return paket


def cihazlari_birlestir(veri, sema_sirasi):
    """Her şemadaki cihazlar[] birleşimi (veri/cihazlar.json). Aynı kod: ilk dolu değer kalır, farklar celiski'ye yazılır."""
    alanlar = ('kisaAd', 'adTr', 'adDe', 'tur', 'not')
    kayitlar, degerler = {}, {}
    for sid in sema_sirasi:
        for c in (veri[sid].get('cihazlar') or []):
            kod = c.get('kod')
            if not kod:
                continue
            n = norm(kod)
            k = kayitlar.get(n)
            if k is None:
                k = kayitlar[n] = {'kod': kod, 'kisaAd': None, 'adTr': None, 'adDe': None, 'tur': None, 'not': None, 'semalar': [], 'yol': {}}
            if sid not in k['semalar']:
                k['semalar'].append(sid)
            yol = c.get('yol')
            k['yol'][sid] = [str(y) for y in (yol if isinstance(yol, list) else ([] if yol is None else [yol]))]
            for alan in alanlar:
                v = c.get(alan)
                if v is None or v == '':
                    continue
                degerler.setdefault((n, alan), {})[sid] = v
                if k[alan] is None:
                    k[alan] = v
    for (n, alan), d in degerler.items():
        if len(set(d.values())) > 1:
            kayitlar[n].setdefault('celiski', []).append({'alan': alan, 'degerler': d})
    cikti = {}
    for n in sorted(kayitlar, key=lambda x: dogal_anahtar(kayitlar[x]['kod'])):
        k = kayitlar[n]
        if k['not'] is None:
            del k['not']
        cikti[k['kod']] = k
    return cikti


def cihazlar_yaz(veri_klasoru, cihazlar):
    yol = os.path.join(veri_klasoru, 'cihazlar.json')
    yeni = json.dumps(cihazlar, ensure_ascii=False, indent=2) + '\n'
    try:
        with open(yol, encoding='utf-8') as f:
            if f.read() == yeni:
                return 'değişmedi'
    except OSError:
        pass
    with open(yol, 'w', encoding='utf-8', newline='\n') as f:
        f.write(yeni)
    return 'yazıldı'


# --------------------------------------------------------------------------------------------------
# Birleştirme
# --------------------------------------------------------------------------------------------------
def css_dosyalari(src):
    d = []
    tokens = os.path.join(src, 'tokens.css')
    if os.path.isfile(tokens):
        d.append(tokens)
    d += sirali_dosyalar(os.path.join(src, 'diyagram'), '.css')
    d += sirali_dosyalar(os.path.join(src, 'arayuz'), '.css')
    return d


def js_dosyalari(src):
    d = sirali_dosyalar(os.path.join(src, 'cekirdek'), '.js', haric=('index.js',))
    d += sirali_dosyalar(os.path.join(src, 'diyagram'), '.js')
    d += sirali_dosyalar(os.path.join(src, 'arayuz'), '.js')
    baslat = os.path.join(src, 'baslat.js')
    if os.path.isfile(baslat):
        d.append(baslat)
    return d


def birlestir(dosyalar, ayirac):
    parcalar = []
    for yol in dosyalar:
        parcalar.append('/* ---- %s ---- */\n%s' % (goreli(yol).replace(os.sep, '/'), metin_oku(yol).rstrip('\n')))
    return ayirac.join(parcalar)


def js_guvenli(js):
    """Satır içi <script> için: '</script' ve '<!--' dizilerini JS metinlerinde zararsız hâle getirir."""
    js = re.sub(r'</(script)', lambda m: '<\\/' + m.group(1), js, flags=re.I)
    return js.replace('<!--', '<\\!--')


def css_guvenli(css):
    if re.search(r'</style', css, flags=re.I):
        hata('CSS içinde "</style" dizisi var')
    return css


def json_guvenli(metin):
    """Satır içi application/json için: '</' ve '<!--' kaçırılır (JSON olarak aynı anlamı taşır)."""
    metin = metin.replace('</', '<\\/')
    metin = metin.replace('<!--', '<\\' + 'u0021--')
    # satır/paragraf ayırıcıları da kaçırılır
    metin = metin.replace(chr(0x2028), '\\' + 'u2028').replace(chr(0x2029), '\\' + 'u2029')
    return metin


ISKELET = """<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kablo Bulucu (iskelet)</title>
<!--KB:CSS-->
</head>
<body>
<main id="kb-kok" style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 1rem auto; padding: 0 1rem; line-height: 1.5">
<h1>Kablo Bulucu</h1>
<p>Arayüz dosyaları (<code>src/index.template.html</code>) henüz yok; bu boş iskelettir. Çekirdek ve veri yüklendi mi?</p>
<pre id="kb-iskelet" style="white-space: pre-wrap">yükleniyor…</pre>
<p><small>Veri imzası: <code><!--KB:IMZA--></code></small></p>
</main>
<!--KB:VERI-->
<!--KB:JS-->
<script>
(function () {
  var el = document.getElementById('kb-iskelet');
  try {
    var db = KB.veri.yukle(JSON.parse(document.getElementById('kb-veri').textContent));
    var s = db.istatistik;
    var satir = [
      'Şema: ' + s.sema + ' · parça: ' + s.parca + ' · kablo: ' + s.kablo + ' · cihaz: ' + s.cihaz + ' · soket: ' + s.soket,
      'Şüpheli parça: ' + s.suphe + ' · doğrulanmamış şema: ' + s.dogrulanmamisSema,
      'Örnek aramalar: ' + [db.ornekler.kablo, db.ornekler.cihaz, db.ornekler.soket].filter(Boolean).join(', ')
    ];
    db.sekmeler.forEach(function (t) {
      satir.push('Sekme ' + t.ad + ': ' + (t.semalar.length ? t.semalar.join(', ') : 'veri yok') + (t.eksikSemalar.length ? ' (eksik: ' + t.eksikSemalar.join(', ') + ')' : ''));
    });
    if (db.ornekler.kablo) {
      var iz = KB.izle.kablo(db, db.ornekler.kablo);
      if (iz) { satir.push(''); satir.push(KB.metin.ozet(iz)); }
    }
    el.textContent = satir.join('\\n');
  } catch (e) {
    el.textContent = 'HATA: ' + e.message;
  }
})();
</script>
</body>
</html>
"""

YER_TUTUCU = re.compile(r'<!--KB:(CSS|VERI|JS|IMZA)-->')


def sablonu_doldur(sablon, parcalar):
    """Yer tutucuları doldurur. Eksik yer tutucu için yedek yerleşim yapar. Döner: doldurulmuş HTML."""
    konum = {}
    for m in YER_TUTUCU.finditer(sablon):
        konum.setdefault(m.group(1), m.start())
    kullanildi = set()

    def degistir(m):
        ad = m.group(1)
        if ad in kullanildi:
            uyar('şablonda <!--KB:%s--> birden çok kez geçiyor; yalnız ilki dolduruldu' % ad)
            return ''
        kullanildi.add(ad)
        return parcalar[ad]

    html = YER_TUTUCU.sub(degistir, sablon)

    # eksik yer tutucular için yedek yerleşim
    def once_ekle(html, isaret, metin):
        i = html.lower().rfind(isaret)
        if i < 0:
            return html + '\n' + metin
        return html[:i] + metin + '\n' + html[i:]

    if 'CSS' not in kullanildi and parcalar['CSS']:
        uyar('şablonda <!--KB:CSS--> yok; CSS </head> öncesine eklendi')
        html = once_ekle(html, '</head>', parcalar['CSS'])
    if 'VERI' not in kullanildi:
        uyar('şablonda <!--KB:VERI--> yok; veri </body> öncesine eklendi')
        html = once_ekle(html, '</body>', parcalar['VERI'])
    if 'JS' not in kullanildi and parcalar['JS']:
        uyar('şablonda <!--KB:JS--> yok; JS </body> öncesine eklendi')
        html = once_ekle(html, '</body>', parcalar['JS'])
    if 'VERI' in konum and 'JS' in konum and konum['JS'] < konum['VERI']:
        uyar('şablonda <!--KB:JS--> <!--KB:VERI-->\'den önce; JS veri öğesini bulamayabilir')
    if 'charset' not in html[:2048].lower():
        uyar('şablonun ilk 2 KB içinde <meta charset="utf-8"> yok; file:// ile Türkçe karakterler bozulabilir')
    return html


# --------------------------------------------------------------------------------------------------
# Çevrimdışı denetimi
# --------------------------------------------------------------------------------------------------
KAYNAK_ETIKETLERI = re.compile(r'<(script|link|img|iframe|frame|source|track|video|audio|embed|object|input|image|use)\b[^>]*>', re.I)
KAYNAK_OZNITELIKLERI = re.compile(r'\b(src|href|xlink:href|data|poster|srcset|action|formaction)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))', re.I)
ICERIK_ETIKETLERI = re.compile(r'(<(script|style)\b[^>]*>)(.*?)(</\2\s*>)', re.I | re.S)
DIS_ADRES = re.compile(r'^\s*(?:[a-z][a-z0-9+.\-]*:)?//', re.I)
YEREL_SEMA = re.compile(r'^\s*(?:data|blob|about|javascript):|^\s*#', re.I)
CSS_DIS = re.compile(r'url\(\s*[\'"]?\s*(?:[a-z][a-z0-9+.\-]*:)?//|@import', re.I)
JS_DESENLER = [
    (re.compile(r'(?<![\w$.])fetch\s*\('), 'fetch('),
    (re.compile(r'\bXMLHttpRequest\b'), 'XMLHttpRequest'),
    (re.compile(r'\bnew\s+WebSocket\b'), 'WebSocket'),
    (re.compile(r'\bnew\s+EventSource\b'), 'EventSource'),
    (re.compile(r'\bsendBeacon\b'), 'sendBeacon'),
    (re.compile(r'\bimportScripts\b'), 'importScripts'),
    (re.compile(r'(?<![\w$.])import\s*\('), 'import()'),
    (re.compile(r'\.(?:src|href)\s*=\s*[\'"](?:https?:)?//'), 'dış adrese .src/.href atama'),
]
JS_DIS_METIN = re.compile(r'[\'"](https?://(?!www\.w3\.org/)[^\'"\s]+)[\'"]')


def js_yorumsuz_satirlar(js):
    """Kaba yorum ayıklama (satır başı // ve * ile başlayan satırlar, satır sonu // yorumları). Denetim içindir, JS'i değiştirmez."""
    for no, satir in enumerate(js.split('\n'), 1):
        t = satir.strip()
        if t.startswith('//') or t.startswith('*') or t.startswith('/*'):
            continue
        t = re.sub(r'(?<!:)//.*$', '', satir)
        yield no, t


def cevrimdisi_denetle(html, css, js, sablon):
    """Dış kaynak başvurusu = hata; kodda dış istek izi = uyarı."""
    # 1) HTML iskeleti (satır içi <script>/<style> içerikleri çıkarılır; açılış etiketleri kalır)
    iskelet = ICERIK_ETIKETLERI.sub(lambda m: m.group(1) + m.group(4), html)
    for et in KAYNAK_ETIKETLERI.finditer(iskelet):
        for o in KAYNAK_OZNITELIKLERI.finditer(et.group(0)):
            deger = o.group(2) if o.group(2) is not None else (o.group(3) if o.group(3) is not None else o.group(4))
            if deger is None or deger == '':
                continue
            if DIS_ADRES.match(deger):
                hata('dış kaynak başvurusu: <%s %s="%s">' % (et.group(1), o.group(1), deger))
            elif not YEREL_SEMA.match(deger) and o.group(1).lower() != 'action':
                hata('tek dosya kuralı: dosyaya başvuru <%s %s="%s"> (data: ya da # kullanın)' % (et.group(1), o.group(1), deger))
    # 2) CSS
    for m in CSS_DIS.finditer(css):
        hata('CSS içinde dış kaynak: %s' % m.group(0).strip())
    for m in CSS_DIS.finditer(sablon):
        hata('şablonda dış kaynak: %s' % m.group(0).strip())
    # 3) JS: dış istek izleri (uyarı)
    for no, satir in js_yorumsuz_satirlar(js):
        for desen, ad in JS_DESENLER:
            if desen.search(satir):
                uyar('JS satır %d: dış istek izi (%s): %s' % (no, ad, satir.strip()[:100]))
        m = JS_DIS_METIN.search(satir)
        if m:
            uyar('JS satır %d: kaynak olmayabilir ama dış adres metni var: %s' % (no, m.group(1)[:100]))


# --------------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='Kablo Bulucu tek dosya derleyicisi')
    ap.add_argument('--veri', default=os.path.join(KOK, 'veri'), help='veri klasörü (semalar.json ve <sema>.json)')
    ap.add_argument('--src', default=os.path.join(KOK, 'src'), help='kaynak klasörü')
    ap.add_argument('--cikti', default=None,
                    help='çıktı HTML dosyası (varsayılan: dist/kablo-bulucu.html; --notlar ile dist/kablo-bulucu-dogrulama.html)')
    ap.add_argument('--sessiz', action='store_true', help='yalnız uyarı ve hataları yaz')
    ap.add_argument('--kompakt', action='store_true', help="boyutu düşür: varsayılan değerleri ve gereksiz 'ham' metinleri gömme")
    ap.add_argument('--notlar', action='store_true',
                    help='doğrulama sürümü: parça notları, şema çelişkileri (Beyin Listesi) ve şüphe ayrıntıları da gömülür')
    a = ap.parse_args()
    surum = 'dogrulama' if a.notlar else 'dagitim'
    varsayilan_cikti = os.path.join(KOK, 'dist', 'kablo-bulucu-dogrulama.html' if a.notlar else 'kablo-bulucu.html')
    veri_k, src, cikti = [os.path.abspath(x) for x in (a.veri, a.src, a.cikti or varsayilan_cikti)]

    cfg, veri, atlanan = veriyi_yukle(veri_k, a.kompakt)
    if cfg is None:
        return bitir(a, None)
    sema_sirasi = [s for s in (cfg.get('semalar') or {}) if s in veri]

    # gömülecek veri: dağıtımda notlar/çelişkiler/şüphe ayrıntıları ayıklanmış kopya; doğrulamada tam veri
    ayiklanan = {'not': 0, 'celiski': 0, 'suphe': 0}
    if a.notlar:
        gomulu = veri
    else:
        gomulu = {sid: dagitim_ayikla(d, ayiklanan) for sid, d in veri.items()}
        dagitim_denetle(gomulu)

    paket = paketle(cfg, gomulu, surum)
    paket_json = json.dumps(paket, ensure_ascii=False, separators=(',', ':'))
    # veri/cihazlar.json iki sürümde de aynıdır: her zaman tam veriden üretilir
    cihazlar = cihazlari_birlestir(veri, sema_sirasi)
    cihaz_durum = cihazlar_yaz(veri_k, cihazlar)

    css_d, js_d = css_dosyalari(src), js_dosyalari(src)
    css = css_guvenli(birlestir(css_d, '\n\n'))
    js = js_guvenli(birlestir(js_d, '\n;\n'))

    sablon_yolu = os.path.join(src, 'index.template.html')
    if os.path.isfile(sablon_yolu):
        sablon, sablon_kaynagi = metin_oku(sablon_yolu), goreli(sablon_yolu)
    else:
        sablon, sablon_kaynagi = ISKELET, 'yerleşik iskelet'
        uyar('src/index.template.html yok; yerleşik boş iskelet kullanıldı')

    parcalar = {
        'CSS': ('<style>\n%s\n</style>' % css) if css else '',
        'VERI': '<script type="application/json" id="kb-veri">%s</script>' % json_guvenli(paket_json),
        'JS': ('<script>\n%s\n</script>' % js) if js else '',
        'IMZA': paket['imza'],
    }
    html = sablonu_doldur(sablon, parcalar)
    cevrimdisi_denetle(html, css, js, sablon)

    ham = html.encode('utf-8')
    if len(ham) > BOYUT_HEDEFI:
        uyar('dosya %s; hedef 1 MB altı%s' % (kb(len(ham)), '' if a.kompakt else " (--kompakt ile deneyin)"))
    if not hatalar:
        os.makedirs(os.path.dirname(cikti), exist_ok=True)
        with open(cikti, 'wb') as f:
            f.write(ham)

    rapor = {
        'sema_sirasi': sema_sirasi, 'atlanan': atlanan, 'veri': veri, 'cihaz_sayisi': len(cihazlar), 'cihaz_durum': cihaz_durum,
        'boyut': len(ham), 'boyut_veri': len(paket_json.encode('utf-8')), 'boyut_js': len(js.encode('utf-8')),
        'boyut_css': len(css.encode('utf-8')), 'boyut_sablon': len(sablon.encode('utf-8')),
        'css_d': css_d, 'js_d': js_d, 'sablon': sablon_kaynagi, 'cikti': cikti, 'imza': paket['imza'],
        'surum': surum, 'ayiklanan': ayiklanan,
    }
    return bitir(a, rapor)


def bitir(a, r):
    if r and not a.sessiz and not hatalar:
        print('Kablo Bulucu derlemesi')
        if r['surum'] == 'dogrulama':
            print('  sürüm   : doğrulama (--notlar): parça notları, Beyin Listesi çelişkileri ve şüphe ayrıntıları gömülü')
        else:
            ay = r['ayiklanan']
            print('  sürüm   : dağıtım: %d parça notu, %d çelişki kaydı ve %d şüphe ayrıntısı gömülmedi (ayrıntı: --notlar)' % (
                ay['not'], ay['celiski'], ay['suphe']))
        for sid in r['sema_sirasi']:
            d = r['veri'][sid]
            print('  şema    : %-18s %4d parça · %3d cihaz · %s' % (
                sid, len(d.get('kablolar') or []), len(d.get('cihazlar') or []),
                'doğrulandı' if d.get('dogrulandi') is True else 'doğrulanmadı'))
        if r['atlanan']:
            print('  atlanan : %s (veri dosyası yok)' % ', '.join(r['atlanan']))
        print('  cihazlar: %d kayıt (%s) -> veri/cihazlar.json' % (r['cihaz_sayisi'], r['cihaz_durum']))
        print('  girdi   : CSS %d dosya · JS %d dosya · şablon: %s' % (len(r['css_d']), len(r['js_d']), r['sablon']))
        print('  boyut   : %s (veri %s · js %s · css %s · şablon %s) · hedef < 1024 KB' % (
            kb(r['boyut']), kb(r['boyut_veri']), kb(r['boyut_js']), kb(r['boyut_css']), kb(r['boyut_sablon'])))
        print('  imza    : %s%s' % (r['imza'], '  (kompakt)' if a.kompakt else ''))
        print('  çıktı   : %s' % goreli(r['cikti']))
    for u in uyarilar:
        print('[uyarı] %s' % u, file=sys.stderr)
    for h in hatalar:
        print('[HATA] %s' % h, file=sys.stderr)
    if hatalar:
        print('Derleme BAŞARISIZ (%d hata); çıktı yazılmadı.' % len(hatalar), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
