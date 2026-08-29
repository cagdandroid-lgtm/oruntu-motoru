# 🧩 Örüntü Motoru

UYCEP Logic dersi için sınıf içi, çok oyunculu örüntü oyunu.
Öğrenciler tabletten/telefondan katılır, öğretmen turu panelden yönetir.

---

## Kurulum

```bash
npm install
npm start
```

| Adres | Kim için |
|---|---|
| `http://localhost:3000` | Öğrenci — isim girip katılır |
| `http://localhost:3000/teacher` | Öğretmen — şifre: `yerel777` |

Port `process.env.PORT || 3000` (Render uyumlu). Oda kodu yoktur; herkes tek sınıf odasına bağlanır.

### Öğretmen şifresi

Şifre ortam değişkeninden okunur, yoksa yerel varsayılana düşer:

| Ortam | Şifre | Nereden gelir |
|---|---|---|
| Yerel (`npm start`) | `yerel777` | `server.js` başındaki `YEREL_SIFRE` sabiti |
| Render / yayında | `hayfan777` | Render → Environment → `ADMIN_PASSWORD` |

Render'da **Environment** sekmesine `ADMIN_PASSWORD = hayfan777` eklenmelidir;
eklenmezse yayındaki sürüm de yerel şifreyi kullanır. Sunucu açılışta hangi
kaynağı kullandığını log'a yazar.

Geçici olarak yerelde de yayın şifresini denemek için:

```bash
ADMIN_PASSWORD=hayfan777 npm start
```

---

## 👋 Öğrenci girişi — sınıf oturumu modeli

Öğrenci `/` adresinde **isim YAZMAZ ve grup SEÇMEZ.** Oturumun grubunu öğretmen belirler.

1. **Öğretmen henüz seçim yapmadı:** Öğrenci ekranında ortam animasyonlu, **sayaçsız**
   bir bekleme ekranı durur — “Öğretmenini bekle”. Hiçbir isim, hiçbir grup gösterilmez.
2. **Öğretmen panelden grubu seçip “🚪 Oturumu Aç” der:** Bekleyen tüm ekranlar
   **kendiliğinden** (yenileme gerekmeden) o grubun isim kartlarına döner —
   `data/ogrenciler.json`'daki **yalnız o grubun aktif öğrencileri**, baş harfli
   avatar balonlu büyük kartlar hâlinde.
3. **Öğrenci kendi adına dokunur.** Seçilen kart soluklaşır, kilitlenir ve diğer
   ekranlarda **“🎮 oyunda”** rozetiyle görünür.
4. Öğretmen panelden **🔓** ile ismi serbest bırakabilir; kart yeniden seçilebilir olur
   (puan ve ölçüm kayıtları korunur — aynı isme yeniden dokunan kaldığı yerden devam eder).

Gizlilik kuralları:

- Öğrenci ekranına **hiçbir aşamada** başka grupların isimleri ya da sayısı gitmez;
  sunucu yalnız aktif grubun kartlarını yayınlar.
- **Kayıtlarda öğrencinin adı değil, listedeki kalıcı KODU** (`E-07`) tutulur.
- Başka gruptan bir öğrenci girmeye çalışırsa sunucu reddeder (oturum TEK gruba aittir).
- Kilitli bir karta yalnız **kendi tarayıcısı** geri dönebilir (oturum jetonu); böylece
  bağlantısı kopan öğrenci kendiliğinden yerine döner, başkası onun adına giremez.

Dersler hibrittir: sınıftaki ve uzaktan (Zoom/Jitsi) katılan öğrenciler aynı bağlantıyı
kullanır; oyun ikisi arasında hiçbir ayrım yapmaz.

---

## Oyun akışı

1. Öğretmen panelden **grubu** seçip oturumu açar, sonra **seviye** (1–3) ve **mod**
   seçip *Turu Başlat*'a basar. (Grup oturumdan gelir; seviye ve mod öğrenciye gösterilmez.)
2. Öğrenci ekranında örüntü dizisi belirir; gizli hücre kesikli kehribar çerçeveli `?` olarak durur.
3. Öğrenci 4 seçenekten birine dokunur **veya** seçeneği gizli hücreye sürükler.
4. **Herkes cevaplayınca** ya da **süre bitince** tur kapanır.
5. Gizli hücre animasyonla açılır, kural açıklanır, doğru cevapta konfeti patlar.
6. Skor tablosu güncellenir, 6 saniye sonra sonraki soru otomatik gelir.

### Üç mod

| Mod | Ne sorulur |
|---|---|
| ➡️ **Sürdür** | Dizinin **son** hücresi gizlidir — sıradaki adım nedir? |
| 🕳️ **Eksiği Bul** | Dizinin **ortasındaki** bir hücre gizlidir — boşluğa ne gelir? |
| 🔍 **Kuralı Yakala** | Dizi tam gösterilir; öğrenci kuralı metin seçeneklerinden seçer (`+3 ekleniyor`, `renk döngüsü: 🔴🔵🔵` …) |

### Puanlama

Doğru cevap **100 puan** + hız bonusu (ilk beş doğru cevaba sırasıyla +50, +40, +30, +20, +10).

### Süre

| Seviye | Süre |
|---|---|
| 1 – 2 | Sınırsız (öğretmen ilerletir) |
| 3 | **30 saniye** — sayaç son 10 saniyede kırmızıya döner |

### Bağlantı kopması

Öğrencinin skoru sunucuda **kalıcı koduna göre** saklanır (`E-07`). Tarayıcıda tutulan
oturum jetonuyla otomatik yeniden bağlanılır: sayfa yenilense, sekme kapansa ya da
tablet uykuya geçse bile öğrenci kaldığı yerden devam eder. Adı panelden değiştirilse
bile kodu — dolayısıyla skoru ve geçmiş kayıtları — değişmez.

---

## 🎨 Kendi Örüntünü Kur (mini mod)

Öğrenci ekranının altında katlanır bir panel olarak durur (varsayılan kapalı;
yeni soru gelince tek odak için otomatik kapanır):

1. Öğrenci paneli açar, 6 hücreyi emoji/sayı paletinden doldurur, *Öğretmene Gönder*'e basar.
2. Tasarım, öğretmen panelindeki **galeriye** düşer.
3. Öğretmen *Sınıfa Gönder* derse tasarım anında **çözülecek soruya** dönüşür:
   son hücre gizlenir, çeldiriciler tasarımdaki sembollerden üretilir ve sıradaki soru olarak sınıfa gider.

> Tasarım gönderebilmek için bir turun başlamış olması gerekir.

### İki ayrı görünürlük anahtarı

Öğretmen panelinde galeri kartının başlığında **iki ayrı** düğme vardır; ikisi
farklı şeyi kontrol eder:

| Düğme | Neyi kontrol eder | Varsayılan |
|---|---|---|
| ✏️ / 🚫 **Tasarım bölümü** | Öğrenci ekranındaki “🎨 Kendi Örüntünü Kur” kartı | Açık |
| 👁️ / 🙈 **Galeri** | Öğrenci ekranındaki “🖼️ Sınıfın Tasarımları” kartı | Kapalı |

Tasarım bölümü kapatıldığında kart öğrenci ekranından anında kaybolur ve sunucu
o sırada gelen `tasarim:gonder` isteklerini de reddeder (kontrol yalnız arayüzde değil).

### Galeriyi öğrencilere açma

Galeri varsayılan olarak yalnızca öğretmende görünür. Öğretmen panelindeki
**👁️ / 🙈 galeri** düğmesiyle galeri tüm sınıfa açılabilir; açıkken tasarımlar
öğrenci ekranında salt-görüntü "🖼️ Sınıfın Tasarımları" kartında belirir
(yeni tasarımlar anında yansır). Düğme tekrar tıklanınca öğrencilerden gizlenir.

---

## 👩‍🏫 Öğretmen paneli düzeni

Panel açılır-kapanır bölümlerden (akordeon) oluşur. Üst kısım hep sade kalır:

| Bölüm | Varsayılan | İçerik |
|---|---|---|
| 🎛️ **Oturum ve Etkinlik** | **AÇIK** | Grup kartları, Oturumu Aç/Kapat, seviye + mod, akış düğmeleri |
| 📡 **Canlı Durum** | **AÇIK** | Ekrandaki soru + doğru cevap, sahnedeki öğrenciler, canlı skor |
| 🎨 Öğrenci Tasarımları | Kapalı | Galeri ve görünürlük anahtarları |
| 📊 Ölçme ve Raporlar | Kapalı | CSV, karneler, isim↔kod eşlemesi |
| ⚙️ Ayarlar | Kapalı | Skorları sıfırla, ölçüm kayıtlarını sil (yıkıcı işlemler) |
| 👥 **Öğrenci Listesi** | Kapalı, **en sonda** | `ogrenciler.json` yönetimi |

### Grup kartları

Her grup kartında **aktif öğrenci sayısı** ve o grup için **kaç soru** olduğu yazar
(içeriği olmayan grup `⚠️ içerik yok` uyarısı verir). Seçim renkle değil, kalın çerçeve
ve `✓` işaretiyle belirtilir. Açık oturumun kartında `🚪 oturum açık` rozeti durur.

---

## 👥 Öğrenci Listesi yönetimi

`data/ogrenciler.json` panelin en alt bölümünden yönetilir.

- **Süzgeçler:** grup (p / e / i / c / hepsi), durum (aktif / pasif / hepsi) ve
  **isim arama kutusu** (isim veya kod içinde arar, tüm gruplarda).
- **Satır işlemleri:** ✏️ ismi düzenle · 🔀 grubunu değiştir · ⏸️/▶️ pasifleştir/aktifleştir.
  Pasif öğrenci giriş ekranındaki kartlarda **görünmez** ama listeden silinmez.
- **Kod hiçbir işlemde değişmez** — grup değişse bile. Araştırma verisinin sürekliliği buna bağlıdır.
- **➕ Yeni öğrenci:** gruptaki ilk boş kodu otomatik alır (`E-11` gibi).
- **⬇️ Listeyi İndir:** güncel `ogrenciler.json`'u indirir. Değişiklikler o oturumda
  anında geçerlidir; **kalıcı olması için** indirilen dosyayı depoya koyup push etmelisin
  (Render diski kalıcı değildir).

### `data/ogrenciler.json` şeması

Bu dosya **tüm UYCEP Logic oyun depolarında aynıdır**; dönem başında bir kez
oluşturulur, kodlar bir daha değiştirilmez. Depolar **private** tutulur.

```json
{
  "_aciklama": "…",
  "guncelleme": "2026-08-29",
  "ogrenciler": [
    { "kod": "E-07", "isim": "Zeynep D.", "grup": "e", "aktif": true }
  ]
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `kod` | string | Kalıcı takma ad — `<GRUP HARFİ>-<sıra>`. **Asla değiştirilmez.** |
| `isim` | string | Öğrencinin giriş kartında göreceği ad |
| `grup` | `"p"` / `"e"` / `"i"` / `"c"` | Çalışma grubu |
| `aktif` | boolean | `false` ise giriş kartlarında görünmez. Ayrılan öğrenci **silinmez**, pasifleştirilir |

Demografik bilgi (doğum tarihi, iletişim vb.) bu dosyaya **asla** yazılmaz;
öğretmenin çevrimdışı dosyasında kodla eşlenir.

### ✨ Misafir öğrenci

Listede olmayan bir çocuk derse katılırsa panelden **anlık misafir** eklenir:

- `M-01`, `M-02` … kodunu alır ve **açık oturumun grubuna** eklenir; o grubun isim
  kartlarında `✨ misafir` rozetiyle görünür.
- Kayıtları CSV'de `misafir=evet` ile işaretlenir (araştırma setini süzmek için).
- `ogrenciler.json`'a **yazılmaz** — yalnız o oturum yaşar; 🗑️ ile çıkarılabilir.

---

## ⌨️ Öğretmen kısayolları

| Tuş | İşlev |
|---|---|
| `B` | Turu başlat |
| `Boşluk` | Duraklat / devam et |
| `A` | Soruyu atla |
| `K` | Turu bitir (cevabı hemen göster) |

Panelde ayrıca: bağlı öğrenci listesi, canlı skor tablosu, kaç öğrencinin cevapladığı,
ekrandaki sorunun önizlemesi ve **doğru cevabı** (yalnızca öğretmene gönderilir).

Kontrol düğmeleri işlevlerine göre renklidir (renk tek başına anlam taşımaz, her
düğmede ikon + etiket vardır):

| Düğme | Renk | İşlev |
|---|---|---|
| ▶️ Turu Başlat / Devam Et | Yeşil | "geç" — oyunu ilerlet |
| ⏸️ Duraklat | Kehribar | "bekle" — dikkat |
| ⏭️ Soruyu Atla | Teal | nötr ilerlet |
| ✅ Turu Bitir | Koyu teal | birincil eylem |
| ↩️ Soruyu İptal Et | Kehribar çizgi | geri döndür |
| 🚪 Oturumu Aç | Yeşil | "geç" — öğrenci ekranlarını aç |
| 🔒 Oturumu Kapat | Kehribar | dikkat — ekranlar beklemeye döner |
| 🔄 Skorları Sıfırla · 🗑️ Ölçüm Kayıtlarını Sil | Kırmızı | yıkıcı (Ayarlar bölümünde, onay sorulur) |

### Puanları geri alma

Soru hatalı/tartışmalı çıkarsa öğretmen **↩️ Soruyu İptal Et** ile
o turda dağıtılan puanları geri çeker: her öğrencinin skorundan o turda kazandığı
puan düşülür, doğru sayısı azaltılır. Aynı tur iki kez geri alınamaz (çifte geri alma
engellidir). Tur hâlâ oynanıyorsa aktif turun, kapanmışsa son kapanan turun puanları geri alınır.

### Öğrenci ismi ve puanını düzenleme

Skor tablosundaki her satırda: **📊** öğrenci raporu · **✏️** isim · **🔢** puan ·
**🔓** ismi serbest bırak. İsim değişikliği **kalıcı listeye** yazılır (kod değişmez) ve
bağlı öğrencinin ekranına anında yansır.

Öğrenci durumları: ✅ Cevapladı · ⏳ Düşünüyor · 🔌 Kopuk

---

## 📁 Dosya yapısı

```
server.js              Express + Socket.io, öğretmen kimlik doğrulama, olay yönlendirme
lib/oyun.js            Oyun durumu, tur akışı, cevap doğrulama, puanlama
lib/oruntu.js          İçerik yükleme, filtreleme, istemciye güvenli paketleme
araclar/i-icerik.js    "i" grubu taban dizileri (42 dizi, kural + doğrulama parametresi)
araclar/i-uret.js      "i" kayıtlarını üretip patterns.json'a yazar
araclar/i-dogrula.js   "i" içeriğini matematiksel olarak denetler
lib/duzenleme.js       Soru iptali (puan geri alma), isim ve puan düzeltme
lib/liste.js           Kalıcı öğrenci listesi, misafirler, süzgeçler, JSON dışa aktarım
lib/olcme.js           Standart olay kaydı, takma ad, CSV dışa/içe aktarım, rapor
lib/karne.js           A4 yazdırılabilir veli karnesi (tek öğrenci + tüm sınıf)
lib/rapor-rotalari.js  /teacher/veri/* rotaları (CSV, karne, önceki oturum)
data/patterns.json     Tüm örüntü içeriği (240 kayıt: e 114 + i 126)
data/ogrenciler.json   Kalıcı isim ↔ kod listesi (TÜM UYCEP oyunlarında aynı dosya)
public/index.html      Öğrenci ekranı
public/app.js          Öğrenci istemcisi (lobi, isim kartları, oyun)
public/ambiyans.js     Lobi ortam animasyonu (canvas partikülleri)
public/tasarim.js      "Kendi Örüntünü Kur" mini modu
public/efekt.js        Konfeti + opsiyonel sesler
public/rozet.js        Ortak durum göstergeleri (ikon + metin)
public/style.css       Palet, göz konforu kuralları, mobil/tablet uyumu
public/teacher.html    Öğretmen paneli (doğrudan erişim engellidir)
public/teacher.js      Öğretmen istemcisi
public/rapor.js        Ölçme kartı, öğrenci raporu penceresi, karne indirmeleri
public/liste.js        Öğrenci Listesi yönetim ekranı (süzgeç, arama, misafir)
```
---

## 🎨 Palet ve göz konforu

Tema: **"sıcak kağıt & mürekkep"** — bir bulmaca defteri hissi. Palet `style.css`
başındaki CSS değişkenlerinden tek noktadan değiştirilebilir.

| Değişken | Renk | Kullanım |
|---|---|---|
| `--kagit` | `#F5F1EA` | Sıcak kağıt zemin (saf beyaz parlamasını önler) |
| `--murekkep` | `#24333B` | Gövde metni — kağıt üzerinde **11.6:1** |
| `--cam` | `#1F4E4A` | Koyu çam-teal: şerit, ana düğmeler — **9.4:1** |
| `--cam-acik` | `#3A7D78` | İkincil düğmeler |
| `--kehribar` | `#8F5214` | Gizli hücre, odak halkası, vurgu |
| `--dogru` | `#256B4D` | Doğru cevap (yumuşak çam yeşili) |
| `--yanlis` | `#A8433A` | Yanlış cevap (yumuşak kiremit) |

Uygulanan kurallar:

- **Kontrast:** tüm metin/zemin çiftleri WCAG AA (≥4.5:1) üzerinde; en düşük çift 4.5:1,
  gövde metni 11.6:1. Açık zeminde koyu metin kullanılır.
- **Doygunluk:** neon veya tam doygun renk yok; tüm renkler kırılmış/pastel tonlar.
- **Renk tek başına taşıyıcı değil:** doğru/yanlış şıklar `✓` / `✗` işareti alır,
  öğrenci durumları `✅ Cevapladı` / `⏳ Düşünüyor` / `🔌 Kopuk` biçiminde
  ikon **ve** metin taşır, süre uyarısı "Son 8 sn!" olarak yazıyla verilir.
- **Sürekli hareket yok:** gizli hücre yanıp sönmez, kesikli kehribar çerçeveyle
  ayrışır. Animasyonlar yalnızca tek seferliktir (hücre açılışı, konfeti).
  `prefers-reduced-motion` açık olan cihazlarda animasyonlar ve konfeti kapanır.
- **Tek odak:** "Kendi Örüntünü Kur" paneli varsayılan olarak kapalıdır ve yeni soru
  gelince otomatik kapanır; ekranda aynı anda tek görev bulunur.
- **Dokunma hedefleri:** tüm düğme ve girdiler en az 48px (kural 44px).
- **Yazı boyutu:** gövde metni 17px; hiçbir metin 16px'in altında değil.
- **Klavye:** odaklanan öğede 3px kehribar odak halkası görünür.

Sesler öğrenci ekranındaki 🔊 düğmesinden kapatılabilir; tercih tarayıcıda saklanır.

---

## 📐 data/patterns.json şeması

JSON yorum desteklemediği için şema burada belgelenmiştir.

```jsonc
{
  "surum": 1,
  "oruntuler": [
    {
      "id": "e1-001",              // benzersiz kimlik: <grup><seviye>-<sıra>
      "grup": "e",                 // "e" | "i" | "c" | "p" — öğretmen panelinden seçilir
      "tur": "sekil-renk",         // "sekil-renk" | "sayi" | "buyuyen" | "ayna" | "ic-ice" | "harf"
      "seviye": 1,                 // 1 | 2 | 3
      "mod": "surdur",             // "surdur" | "eksik" | "kural"
      "dizi": ["🔺","🟦","🔺","🟦","🔺","🟦","🔺","🟦"],
      "gizliIndeks": 7,            // gizlenecek hücrenin indeksi; "kural" modunda -1
      "secenekler": ["🔺","🟦","⭐","🌸"],  // 4 seçenek; "kural" modunda kural metinleri
      "kural": "iki şekil sırayla tekrar ediyor",
      "aciklama": "Üçgen ve kare sırayla geliyor.",
      "chc": ["Gf","Gv"]           // isteğe bağlı; yoksa türden türetilir (lib/olcme.js)
    }
  ]
}
```

**Doğru cevap alanı yoktur** — bilerek. Cevap sunucuda türetilir:

- `surdur` / `eksik` → `dizi[gizliIndeks]`
- `kural` → `kural` alanı

İstemciye gönderilen pakette `dizi[gizliIndeks]` **`null`** yapılır ve `kural` ile
`aciklama` alanları **hiç gönderilmez**. Cevap yalnızca tur kapandığında yayınlanır.

### İçerik dağılımı

| Grup | Seviye 1 | Seviye 2 | Seviye 3 | Toplam | Ağırlık |
|---|---|---|---|---|---|
| **e** | 36 | 39 | 39 | 114 | Görsel — emoji şekil-renk, büyüyen desen, ayna |
| **i** | 42 | 42 | 42 | 126 | **Sayısal** — katlama, değişen fark, iç içe dizi, kare sayı, harf |

Toplam **240** soru. Her grup × seviye × mod kombinasyonu en az **12** soru içerir
(e: 12–13, i: 14).

---

## 🔢 "i" grubu katmanı (3.–4. sınıf)

`i`, `e`'nin bittiği yerden başlar ve **belirgin biçimde zordur**: `e` seviye 3'te
en büyük sayı 64 iken `i` seviye 1'de 243, seviye 3'te 972'dir. Üç mod da (Sürdür,
Eksiği Bul, Kuralı Yakala) `i` için tam olarak çalışır.

### Örüntü aileleri

| Aile | Örnek | Kural etiketi |
|---|---|---|
| Değişen farklı dizi | `1, 2, 4, 7, 11, 16` | `fark artıyor` |
| İkiye katlama | `3, 6, 12, 24, 48, 96` | `×2` |
| Üçe katlama | `2, 6, 18, 54, 162, 486` | `×3` |
| İki dizi iç içe | `10, 1, 9, 2, 8, 3, 7, 4` | `iki dizi iç içe` |
| Kare sayılar | `1, 4, 9, 16, 25, 36` | `kare sayılar` |
| Harf örüntüsü | `A, C, E, G, I, K` | `harfler ikişer` |
| Aritmetik dizi | `9, 18, 27, 36, 45` | `+9` · `-13` |
| Ayna (simetri) | `3, 7, 11, 15, 11, 7, 3` | `ayna (simetrik)` |

**Bu ailelerin her biri 9 kombinasyonun (3 seviye × 3 mod) hepsinde bulunur** —
öğrenci hangi modda oynarsa oynasın tüm aileleri görür.

### Seviye ilerlemesi

| | Seviye 1 | Seviye 2 | Seviye 3 |
|---|---|---|---|
| Aritmetik | `+4` … `+9`, `-6`, `-8` | `+12`, `+15`, `-13`, `-14` | — |
| Katlama | `×2`, `×3` (küçük) | `×2`, `×3` (üç basamağa kadar) | `×3` → 972 |
| Değişen fark | +1'er büyüyen | +2'şer büyüyen | +3'er ve +5'er büyüyen |
| İç içe | artan + azalan | artan + azalan (farklı adım) | **çarpımsal + toplamsal** şerit |
| Kare | `1, 4, 9, 16 …` | `4, 9, 16, 25 …` | **`n²+1`**: `2, 5, 10, 17 …` |
| Harf | ikişer | üçer | dörder + **iki harf dizisi iç içe** (`A, Z, C, X, E, V`) |
| Ayrıca | — | — | **Fibonacci** (`son iki sayının toplamı`) |

Seviye 3 ayrıca **30 saniye süre sınırlıdır** (seviye 1–2 süresiz).

### Sembolik kural etiketleri

`i` grubunda "Kuralı Yakala" seçenekleri **sembolik** yazılır — `+7`, `×3`,
`fark artıyor`, `kare sayılar +1`, `iki dizi iç içe` — düzyazı açıklama değil.
Aynı etiket tur sonu geri bildiriminde de görünür; ayrıntılı cümle `aciklama`
alanında durur.

Çeldirici kuralı: seçenekler **aynı seviyenin kural havuzundan** ve **aynı türden**
gelir. Sayı sorusuna harf kuralı, harf sorusuna sayı kuralı çeldirici olarak konmaz —
böylece cevap elemeyle bulunamaz. Örnek (seviye 3):

```
2, 5, 10, 17, 26, 37, 50, 65
→ kare sayılar +1 · kare sayılar · son iki sayının toplamı · iki dizi iç içe
```

### İçeriği yeniden üretme

`i` grubu elle değil, üreteçle tutulur:

```
node araclar/i-uret.js      # araclar/i-icerik.js'ten i kayıtlarını üretir
node araclar/i-dogrula.js   # dizileri kuraldan yeniden hesaplayıp denetler
```

- `araclar/i-icerik.js` — 42 taban dizi (seviye başına 14), her biri kuralı ve
  bağımsız doğrulama parametreleriyle birlikte.
- `araclar/i-uret.js` — her taban diziyi üç modda birden yayımlar, çeldiricileri
  tohumlu (yinelenebilir) üretir ve `patterns.json`'a yazar. **`e` / `p` / `c`
  kayıtlarına dokunmaz.**
- `araclar/i-dogrula.js` — her diziyi kuralından yeniden hesaplayıp karşılaştırır,
  kapsamı ve çeldirici kalitesini sınar.

### Yeni örüntü ekleme

`data/patterns.json` içindeki `oruntuler` dizisine yukarıdaki şemaya uyan bir kayıt ekleyip
sunucuyu yeniden başlatmak yeterlidir. Dikkat edilecekler:

- `secenekler` **tam 4** öğe olmalı ve doğru cevabı içermeli.
- `eksik` modunda `gizliIndeks` en az 2 olmalı (öğrencinin kuralı görebilmesi için).
- `kural` modunda `gizliIndeks: -1` ve `secenekler` kural metinleri olmalı.

---

## 📊 Ölçme ve veri standardı

Her cevap/görev için sunucu, **UYCEP Logic oyunlarının tamamında birebir aynı**
şemayla bir olay kaydı tutar. Sütun adları asla değiştirilmez — oyunlar arası
birleştirilebilirlik (ve akademik analiz) buna bağlıdır.

### Olay kaydı şeması

| # | Sütun | Örnek | Açıklama |
|---|---|---|---|
| 1 | `zaman` | `2026-08-26T08:57:45.982Z` | Kaydın oluşma anı (ISO 8601, UTC) |
| 2 | `oyun` | `oruntu-motoru` | Oyun kimliği — dosyalar birleştirilince ayırt eder |
| 3 | `set_veya_paket` | `e-1-surdur` | Bu oyunda soru havuzu: `<grup>-<seviye>-<mod>` |
| 4 | `grup` | `e` | İçerik grubu (`e` / `i` / `c` / `p`) |
| 5 | `ogrenci_kod` | `E-07` | **Takma ad** — kayıtlarda isim asla geçmez |
| 6 | `gorev_id` | `e1-010` · `i3-k08` | `patterns.json` içindeki soru kimliği |
| 7 | `kategori` | `sayi` | Örüntü türü (`sekil-renk`, `ayna`, `buyuyen`, `sayi`, `ic-ice`, `harf`) |
| 8 | `chc` | `Gq\|Gf` | CHC alanları, `\|` ile ayrılmış |
| 9 | `zorluk` | `e-1` | Katman kodu: `<grup>-<seviye>` |
| 10 | `sonuc` | `dogru` | `dogru` / `yanlis` / `atlandi` |
| 11 | `sure_sn` | `6.42` | Sorunun açılışından cevaba kadar (duraklatılan süre düşülür) |
| 12 | `deneme` | `1` | Bu oyunda tek cevap hakkı vardır; cevapsızda `0` |
| 13 | `ipucu_kullanildi` | `hayir` | Bu oyunda ipucu mekaniği yok; daima `hayir` |
| + | `misafir` | `hayir` | Standart şemanın **sonuna** eklenir: `evet` olan satırlar araştırma setinden süzülür |

Notlar:

- **`atlandi`**: tur kapanırken bağlı olduğu hâlde cevap vermemiş her öğrenci için
  bir kayıt yazılır — katılmama da veridir.
- **`chc`**: soru JSON'unda `chc` alanı varsa o kullanılır, yoksa örüntü türünden
  türetilir (`lib/olcme.js` → `CHC_ESLEME`). Seviye 3 süreli olduğu için `Gs` eklenir.
- **Soru iptali**: öğretmen “Son Turun Puanını Geri Al” dediğinde o turun kayıtları
  silinmez, *geçersiz* işaretlenir ve CSV/rapor/karnelerin dışında bırakılır.

### Takma ad (pseudonym)

Kodlar **`data/ogrenciler.json`'daki kalıcı ana listeden** gelir — oyunun ürettiği
geçici numaralar değildir. Aynı öğrenci her hafta, her UYCEP oyununda **aynı kodu**
alır (`E-07`); ismi değişse, grubu değişse, bağlantısı kopsa bile kod sabit kalır.
Misafirler oturumluk `M-01`, `M-02` … kodu alır.

**İsim ↔ kod eşlemesi yalnızca öğretmen panelinde** görünür (öğrenci listesindeki kod
rozeti ve “🪪 İsim ↔ kod eşlemesi” bölümü); öğrenci ekranına giden hiçbir pakette —
giriş kartlarında da, skor tablosunda da — kod bulunmaz.

### CSV dışa aktarım

Panelin **📊 Ölçme ve Raporlar** kartından tek tık. Dosya her zaman oturumdaki
**tüm öğrencileri tek dosyada** içerir.

| Düğme | İçerik | Kullanım |
|---|---|---|
| 🔬 **CSV indir — kodlu** | 13 standart sütun + `misafir` | Araştırma / akademik analiz |
| 👪 **CSV indir — isimli** | 13 standart sütun + `misafir` + `ogrenci_ad` | Veli raporu, sınıf takibi |

- Dosya adı standardı: `<oyun>_<grup>_<tarih>.csv` → `oruntu-motoru_e_2026-08-26.csv`
  (kayıtlar birden çok gruba yayılmışsa grup yerine `karma` yazılır).
- Kodlama UTF-8 + BOM, ayraç `,` — Excel'de de pandas'ta da doğrudan açılır.

> ⚠️ **Veri yalnızca bellekte tutulur.** Render diski kalıcı değildir; sunucu
> yeniden başlarsa oturum verisi kaybolur. Bu yüzden panelde kayıt biriktiği anda
> “Dersi bitirmeden raporu indir!” hatırlatması belirir, oyun bitince öne çıkar ve
> indirilmemiş veri varken panel sekmesi kapatılmak istenirse tarayıcı uyarı verir.

### Öğrenci Raporu

Öğrenci listesindeki **📊** düğmesi tek ekranlık raporu açar: genel doğruluk
yüzdesi, kategori bazlı doğruluk dökümü, ortalama süre, en uzun seri, ulaşılan
kademe ve CHC dağılımı.

**Geçen oturuma göre değişim:** “📂 Önceki oturum CSV'si yükle” ile eski bir CSV
yüklenirse rapor ve karnede karşılaştırma satırı belirir. Eşleştirme, isimli
CSV'de `ogrenci_ad`, kodlu CSV'de `ogrenci_kod` üzerinden yapılır.

### Karneler (A4, yazdır/PDF)

| Düğme | Çıktı |
|---|---|
| Rapor penceresi → 🖨️ **Yazdırılabilir Karne** | Tek öğrenci, tek A4 sayfa |
| Ölçme kartı → 🖨️ **Tüm Karneleri İndir** | Sınıfın tamamı, **öğrenci başına bir A4 sayfa**, tek belge |

Karne veli diline uygundur (eğitim jargonu yok): kimlik satırı, dört özet kutusu,
örüntü türlerine göre başarı tablosu, öğretmen notu ve “evde birlikte
yapabilirsiniz” önerileri. Açılan sayfadaki **🖨️ Yazdır** düğmesiyle yazdırılır
veya “Hedef: PDF olarak kaydet” seçilerek PDF üretilir. Veli toplantısı öncesi
tüm evrak tek tıkla hazırdır.

### Veri rotaları (hepsi öğretmen çerezi ister, yetkisizde 403)

```
GET  /teacher/veri/csv?ad=kodlu|isimli   CSV indir
GET  /teacher/veri/karne?anahtar=<key>   Tek öğrenci karnesi
GET  /teacher/veri/karneler              Tüm sınıfın karneleri (tek belge)
POST /teacher/veri/onceki                Önceki oturum CSV'si yükle {csv, dosya}
POST /teacher/veri/onceki-sil            Karşılaştırmayı kaldır
GET  /teacher/veri/liste.json            Güncel ogrenciler.json (Listeyi İndir)
```

**Öğrenci ekranında bu verilerin hiçbiri görünmez**; zorluk gizliliği aynen sürer.

---

## 🔒 Güvenlik notları

- Cevap doğrulaması **daima sunucuda** yapılır; istemciye cevap sızmaz.
- İstemciden gelen seçim, sorunun geçerli seçenekleri arasında değilse reddedilir.
- Aynı turda ikinci cevap kabul edilmez; duraklatılmışken cevap alınmaz.
- `teacher.html` ve `teacher.js` çerezsiz istekte `/teacher` giriş sayfasına yönlendirilir.
- Öğretmen soket olayları her çağrıda çerezle yeniden doğrulanır; yetkisiz istek loglanır.
- `/teacher/veri/*` rotaları (CSV, karne, önceki oturum) çerezsiz istekte 403 döner.
- Öğrenci kodu, ölçüm kayıtları ve raporlar yalnız `panel:durum` ile öğretmen odasına gider;
  öğrencilere yayınlanan `giris`, `skorlar` ve `tur:basladi` paketlerinde bulunmaz.
- `giris` paketi **yalnız aktif grubun** kartlarını taşır; başka grupların isimleri ya da
  sayısı öğrenci istemcisine hiç ulaşmaz (gizleme istemcide değil, **sunucuda** yapılır).
- Katılım sunucuda üç kez doğrulanır: kod listede var mı, aktif mi, **oturumun grubuna ait mi**.
- Kilitli bir isme yalnız o tarayıcının oturum jetonuyla dönülebilir; jetonsuz istek reddedilir.
  Öğretmen ismi serbest bıraktığında jeton yenilenir, eski sekme kendiliğinden geri giremez.

## 📋 Olay günlüğü

Sunucu konsoluna yazılanlar: katılım, ayrılma, tur başlangıcı, her cevap (doğru/yanlış + puan),
tur kapanışı ve sebebi, tasarım gönderimi, öğretmen girişi ve yetkisiz istekler.
Oturum tarafında ayrıca: oturum açma/kapatma ve grup değişimi, kilitli isim denemesi (⛔),
farklı gruptan giriş denemesi (⚠), serbest bırakma, liste ve misafir değişiklikleri.
Ölçme tarafında: CSV indirme (kodlu/isimli + kayıt sayısı),
karne üretimi, önceki oturum yüklemesi ve soru iptalinde geçersiz sayılan kayıt sayısı.
