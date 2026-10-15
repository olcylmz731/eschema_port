# alternator-mars: uzlaştırma kararları

A: 29 parça, B: 28 parça, aynı okunan: 26. Fark satırları F001–F004 (+ ızgara I001, I002). Aşağıda her satır için karar, sonra fark listesinde görünmeyen ek kararlar.

## Fark satırları

F001: a020 (A: 01R02 ↔ düğüm ~d1) / b015 (B: 01R02 ↔ X03.31/3, ortak uç = direncin alt ucu) → 800 dpi büyütmede (x1800 y1180) dallanma noktası direncin alt ucundan yaklaşık 3 mm aşağıda, düz hat üzerinde ayrı bir nokta (nokta/işaret çizilmemiş, kod yok); direnç ile bu nokta arasında kısa bir çizgi var. VERI-MODELI §2'ye göre dallanma ek noktası düğümdür → tek temsil: 01R02 ↔ ~d1 (A'nın yazışı). B'nin b015'i, bu kısa parça ile F003'teki dal parçasının birleşimidir. (Ek gerekçe: çekirdek, pini yazmayan cihaz ucunu hiçbir şeyle birleştirmiyor; B'nin temsilinde X03.20/3 ve X03.31/3 dalları birbirine bağlanmazdı, ~d1 düğümüyle bağlanıyor.) cozuldu (k020).

F002: a021 (A: ~d1 ↔ X03.20/3) / b014 (B: 01R02 ↔ X03.20/3) → F001 ile aynı gerekçe: dallanma noktası direncin ucu değil, hat üzerinde ayrı nokta. ~d1 ↔ X03.20/3 doğru. cozuldu (k021).

F003: a024 (yalnız A: ~d1 ↔ X03.31/3) → B'de karşılığı var, b015 olarak (01R02 ↔ X03.31/3); eşleştirici onu F001'de a020 ile bulanık eşleştirmişti. Dal gerçek: ~d1'den çapraz + yatay + dikey inip X03.31/3 soketinin üst yarısına varıyor. Kayıt kalıyor, cozuldu (k028).

F004: varsayilan.ham biçim farkı (A: tek satır, ' | ' ayraçlı, 'BEMERKUNGEN :' başlığı ve '(Gelenk simgesi)' işareti, 'mm2'; B: satır sonlu, başlıksız, simgesiz, 'mm²') → metin aynı, anlam farkı yok. Görüntüde 'A = 0.75mm²' üst simge 2 ile yazılı → A'nın yapısı + 'mm²' yazıldı. kesit 0.75 / renk ws iki okumada da aynı.

I001: a012/b019 (X0508/1 ↔ 10M01 pin 50): A satır B, B satır C → hat X0508/1 çubuğundan (y≈1574, B bandı) 10M01'in 50 ucuna (y≈1840, C bandı) iniyor, sınır y=1670; hattın büyük kısmı ve yatay bacak C'de → C (k004).

I002: a018/b026 (X0502/2 ↔ 01G01 W): aynı durum (X0502/2 çubuğu B'de, W ucu C'de, sınırı geçiyor, büyük kısım C'de) → C (k014; C'ye geçince sıra gereği k013 ile k014 yer değiştirdi, --numarala çalıştırıldı).

## Fark listesinde görünmeyen ek kararlar

EK-1 (04A04 pin adı, k029): A ve B ikisi de 'H13' yazdı (fark listesinde yok). 1600 dpi büyütmede ikinci karakter bayraksız düz çubuk = harf I; aynı sayfadaki 'LI' (açıklama kutusu), 'KI.15' içindeki I ile aynı, rakam 1'de ise üstte bayrak var ('15' ve 'X03. 31/3' içindeki 1'ler). Doğrusu HI3 → pinAdi 'HI3', ham 'HI3 V-9/6', cozuldu. Beyin Listesi'nde de HI3: çelişki yok.

EK-2 (#4201, #4202, k009 ve k013): etiketler 1600 dpi'da büyütüldü. '#', '4', üst üste basılmış '2' ile '0', son karakter (#4201'de düz çubuk = 1, #4202'de 2) okundu; X11.42/1 ve /2 ile uyumlu (42 + 01/02). Okunuş #4201 / #4202 (A emin değildi, B emindi; büyütmede B'nin okuyuşu doğrulandı). Kesikli kutu = Gelenk (körük) soketi; iki uç da kutudaki üst ve alt simge olduğu için aynı soket-pin (X11.42/1 ve X11.42/2). Silinmedi, uçlar değişmedi, varyant:true kaldı, not'ta açıklandı. durum eslesti.

EK-3 (01G02 D+ ↔ DF, k026): 800 dpi'da D+ ucundan (1084'ün geldiği nokta) çıkan etiketsiz çizgi çemberin dışından dolanıp üst-sağdaki DF ucuna dönüyor; iki uç da aynı cihaz. Beyin Listesi: 'D+ ile DF alternatörün üzerinde köprülüdür'. Kablo değil cihaz içi köprü → ic:true, not'ta açıklandı, kayıt silinmedi. A ve B uçları aynı okudu (B 'kablo mu iç köprü mü' emin değildi): durum eslesti.

EK-4 (etiketsiz parçalar): A'da 15, B'de 14 etiketsiz parça var; fark yalnız ~d1 çevresindeki dallanma (A 3 parça, B 2 parça: F001–F003). Geri kalan etiketsiz parçalar (soket simgesi yarıları arası vb.) iki okumada da aynı ve bilinçli sonuç; dokunulmadı.

EK-5 (X03.53/3 dalı, k027): dal X03.53/3 soketinin yay yarısında açık bitiyor, öbür yarıda çizgi yok. İki okuma aynı; durum eslesti, not eklendi.

EK-6 (01G02 W ucu): çemberin sağındaki W ucundan kısa bir çizgi çıkıyor ama hiçbir yere bağlı değil (iki okuyucu da okunamayanlar'a yazdı, kablo parçası yok). Kablo kaydı eklenmedi; cihaz kaydına not düşüldü.

EK-7 (cihaz listesi): bileşen listesi 15 satır, iki okumada aynı; büyütmede X03.20-54 hücresi ('X03.20-5432..36' bitişik: kod X03.20-54, yol 32..36) ve 04A04 adı ('(FPS' parantez kapanmıyor) kontrol edildi, olduğu gibi kaldı. tur denetimi: A beyin (04A04, 10A01, 10A10), F sigorta (24F01), G guc (01G01, 01G02), M motor (10M01), R direnc (01R02), V diyot (01V01), W toprak (W0501), X soket (X03.20-54, X0502, X0508, X11), 'Verteiler' → besleme (X0501): hepsi doğru. adTr/kisaAd yalnız Beyin Listesi'nde yazanlardan: 04A04 'FPS 4' + 'Esnek programlı kumanda modülü 4' (§1), 10A01 'MR', 10A10 'CPC' (§1), 24F01, 01G01 ('Alternatör 1', A1), 01G02 ('Alternatör 2', A2), 10M01, 01R02, 01V01, W0501, X0501, X0502, X11 (§3 eleman tablosu). X03.20-54 ve X0508 Beyin Listesi'nde yok: null.

EK-8 (künye): A ve B aynı (Stromlaufplan Starter und Generatoren, A 311 546 29 96, A2, 2005-12-02); büyütmede de doğrulandı. Künye farkı yok.

EK-9 (Beyin Listesi karşılaştırması, §1 + §2 + §3): zincir 24F01 → 2029 → X03.54/4 → 01V01 → 1082, X03.54/3, X03.53/4 → 01R02 → X03.20/3, X0502/3, 1084 → D+; 01R02 sonrası dal → X03.31/3 → 04A04 HI3; A1: B+ 35rt, D+ → X0502/1 → X11.42/1 → 0001 → 10A10, W → X0502/2 → X11.42/2 → 0002 → 10A10; A2: B+ 50sw, D+/DF köprü; 10A01 → 1,5-1441 → X0508/1 → 10M01 pin 50; her iki alternatör W0501'e: hepsi şemayla uyuşuyor. Tek fark yazım: Beyin Listesi 'X1142/1' ve 'X1142/2' yazıyor, şema 'X11.42/1' ve '/2' (aynı soket). Gerçek çelişki değil ama celiskiler'e yazım farkı olarak kondu (k006, k011); şema değeri değişmedi.
