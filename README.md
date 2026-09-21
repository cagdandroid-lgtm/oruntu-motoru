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
| `http://localhost:3000/teacher` | Öğretmen — yerel varsayılan şifre: `uycep-local` |

Port `process.env.PORT || 3000` (Render uyumlu). Oda kodu yoktur; herkes tek sınıf odasına bağlanır.

### Sürüm denetimi

`GET /saglik` canlıda hangi commit'in çalıştığını panel şifresi olmadan gösterir
(öğrenci verisi içermez):

```json
{ "durum": "ok", "surum": "a1b2c3d", "gruplar": ["p", "e", "u"] }
```

Render, dağıtılan commit'i `RENDER_GIT_COMMIT` değişkeninde verir; yerelde `"yerel"` yazar.
**Render `main` dalını yayınlar** — başka dalda duran commit canlıya çıkmaz.

### Öğretmen şifresi

Şifre **koda asla gömülmez**; `process.env.ADMIN_PASSWORD`'tan okunur
([lib/kimlik.js](lib/kimlik.js)). Kaynak sırası:

1. Gerçek ortam değişkeni (`ADMIN_PASSWORD=... npm start`)
2. Proje kökündeki `.env` dosyası (`ADMIN_PASSWORD=...`) — `.gitignore`'dadır, depoya gitmez
3. Ortama göre varsayılan:

| Ortam | Davranış |
|---|---|
| **Yerel** (`RENDER` tanımsız) | `.env` **zorunlu değildir**; `uycep-local` varsayılanıyla çalışır, `npm start` tek başına yeter |
| **Render** (`RENDER` tanımlı) | Varsayılan **kullanılmaz**. Konsola büyük uyarı basılır ve `/teacher` girişi, Render → Environment → `ADMIN_PASSWORD` tanımlanana kadar **kapalı** tutulur |

Sunucu her açılışta kullandığı şifreyi log'a yazar (Render'da bu satırı yalnız
hesap sahibi görür):

```
🔑 Öğretmen paneli şifresi: uycep-local
   Kaynak: yerel varsayılan
```

Yerelde kendi şifreni kullanmak için proje köküne `.env` oluştur:

```
ADMIN_PASSWORD=kendi-sifren
```

> Gerçek yayın şifresi bu dosyaya ya da depodaki başka hiçbir dosyaya yazılmaz.

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

### Kimlik yaşam döngüsü

Öğretmen bir öğrenciyi **🚪 sahneden çıkardığında** ya da **🔓 ismini serbest
bıraktığında**, o öğrencinin cihazında üç şey aynı anda olur:

1. Cihazda saklanan isim/kod ve oturum jetonu **silinir**.
2. Oyun görünümü **kapanır**.
3. **İsim seçme ekranı açılır** ve ne olduğunu anlatan sıcak bir satır gösterilir
   (“Öğretmenin seni oyundan çıkardı…”).

Çocuk hiçbir koşulda eski oyun ekranında takılı kalmaz — sayfayı yenilese bile
isim ekranında kalır, çünkü sunucu da o kodu artık kabul etmez.

| | 🔓 Serbest bırak | 🚪 Sahneden çıkar |
|---|---|---|
| Cihazdaki isim | silinir | silinir |
| Oyuncunun puanı | **korunur** | silinir |
| Ölçüm kayıtları | korunur | **korunur** (kod bazlı) |
| Yeniden giriş | hemen | 45 sn sonra (kart `⏳` ile kapalı görünür) |

**Sayfa yenileme bunlardan etkilenmez:** normal koşulda öğrenci sayfayı
yenilediğinde tarayıcıdaki kod + jeton ile kendiliğinden aynı isme döner ve
puanı, turu, sırası kaldığı yerden devam eder.

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

## 🏷️ Ders etiketi

Oturum açarken öğretmen serbest bir etiket girer: **“2. Ders · 12 Eylül”**.
En çok 60 karakterdir, biçim dayatılmaz. Etiket şuralarda görünür:

- **Olay kaydında** — CSV'de `ders_etiketi` sütunu (standart 13 sütunun sonuna eklenir).
  Birden çok dersin CSV'si birleştirildiğinde oturumlar böyle ayrışır.
- **Karne başlığında** — belgenin üst şeridinde ve kimlik satırında “Ders” kutusu olarak.
- **Panel özetinde** — bölüm başlığında ve oturum durumu satırında.

Etiket tırnak içinde yazılırsa (`"2. Ders"`, `“2. Ders”`) dış tırnaklar atılır, içteki
tırnaklar korunur; fazla boşluk ve kontrol karakterleri temizlenir. Panel etiketi
tırnağa almadan gösterir, böylece iç içe tırnak oluşmaz.

Etiket boş bırakılırsa panel onay sorar; boş geçilirse kayıtlarda sütun boş kalır.
Oturum yeniden açılarak sonradan da girilebilir.

---

## ℹ️ Etkinlik Bilgisi

Panelin sağ üstündeki göze batmayan **ℹ️ Etkinlik Bilgisi** düğmesi üç sekmeli bir
modal açar; günlük akışta hiçbir sekme kendiliğinden görünmez, öğrenci ekranında hiç yoktur.

| Sekme | İçerik |
|---|---|
| 📚 Kazanımlar | 4 maddelik sade kazanım listesi |
| 🧠 CHC | Birincil ve ikincil alanlar, **dar yetenek kodları** ve gerekçeleri |
| 👪 Veli Özeti | Jargonsuz 3 cümle + **📋 Kopyala** (WhatsApp veli grubu için) |

Üstte etkinliğin **amacı** yazar. Kaynak proje kökündeki
[ETKINLIK_BILGI.json](ETKINLIK_BILGI.json); aynı içerik uygulama çalıştırılmadan
okunabilsin diye [ETKINLIK_BILGI.md](ETKINLIK_BILGI.md)'de de durur.

```jsonc
{
  "amac": "…",                              // ek alan: modalın üstünde
  "kazanimlar": ["…", "…"],
  "chc": {
    "birincil": { "alan": "Gf", "ad": "…", "dar": ["Gf-I", "Gf-RQ"], "gerekce": "…" },
    "ikincil": [ { "alan": "Gv", "dar": ["Gv-Vz"], … }, { "alan": "Gsm", "dar": ["Gsm-WM"], … } ],
    "gerekce": "…"
  },
  "veli_ozeti": "…"
}
```

Birincil **Gf** (Gf-I tümevarım, Gf-RQ nicel akıl yürütme); ikincil **Gv** (Gv-Vz) ve
**Gsm** (Gsm-WM). Dosya her istekte okunur; güncellemek için sunucuyu yeniden başlatmak gerekmez.

---

## 🔄 Oturum yaşam döngüsü

Oturum beş aşamalı bir durum makinesidir. Aşama, panelin üst şeridinde rozetle görünür.

```
BOŞTA ──(grup seç + Oturumu Aç)──▶ LOBİ ──(Turu Başlat)──▶ OYUN ⇄ ARA ──▶ SONUÇ
  ▲                                                                        │
  └──────────────── ⏹ Etkinliği Bitir (her aşamadan) ─────────────────────┘
```

| Aşama | Ne oluyor | Grup/etkinlik seçimi |
|---|---|---|
| ⚪ **Boşta** | Grup seçilmedi; öğrenci ekranlarında “Öğretmenini bekle” | **Açık** |
| 🚪 **Lobi** | Grup açık; öğrenciler isim kartlarına dokunuyor | **Açık** |
| 🎮 **Oyun** | Etkinlik sürüyor (duraklatma bu aşamadadır) | Kilitli |
| 🎉 **Ara** | Cevap açıklandı; sıradaki soru bekleniyor | Kilitli |
| 🏁 **Sonuç** | Etkinlik bitti; kapanış ekranı | Kilitli |

Oyun başlayınca grup kartları, ders etiketi, seviye, mod seçimi ve “Turu Başlat”
**pasifleşir**; panelde `🔒 Grup ve etkinlik kilitli` uyarısı çıkar. Sunucu da aynı
kuralı uygular: kilitliyken gelen `oturumAc` / `baslat` isteği reddedilir.

### ⏹ Etkinliği Bitir

Panelin üst şeridinde **her aşamada** görünen kırmızı, onay soran düğme.
**Grup ya da etkinlik değiştirmenin tek yoludur.** Basılınca:

1. Oturum **BOŞTA**'ya döner ve sahne boşalır.
2. Öğrenci cihazları bekleme ekranına düşer ve **kayıtlı isimleri silinir**.
3. **Ölçüm kayıtları korunur** — ders sonunda CSV olarak indirilecek.

---

## Oyun akışı

1. Öğretmen panelden **grubu** seçip **ders etiketini** yazar, oturumu açar; sonra
   **seviye** (1–3) ve **bir ya da daha çok mod** seçip *Turu Başlat*'a basar. (Grup oturumdan gelir; seviye ve mod öğrenciye gösterilmez.)
2. Öğrenci ekranında örüntü dizisi belirir; gizli hücre kesikli kehribar çerçeveli `?` olarak durur.
3. Öğrenci 4 seçenekten birine dokunur **veya** seçeneği gizli hücreye sürükler.
4. **Herkes cevaplayınca** ya da **süre bitince** tur kapanır.
5. Gizli hücre animasyonla açılır, kural açıklanır, doğru cevapta konfeti patlar.
6. Skor tablosu güncellenir, 6 saniye sonra sonraki soru otomatik gelir.

### Yedi mod

| Mod | Ne sorulur | Kaynak |
|---|---|---|
| ➡️ **Sürdür** | Dizinin **son** hücresi gizlidir — sıradaki adım nedir? | `patterns.json` |
| 🕳️ **Eksiği Bul** | Dizinin **ortasındaki** bir hücre gizlidir — boşluğa ne gelir? | `patterns.json` |
| 🔍 **Kuralı Yakala** | Dizi tam gösterilir; öğrenci kuralı sembolik seçeneklerden seçer (`+3`, `×2`, `fark artıyor`) | `patterns.json` |
| 🐞 **Hatayı Bul** | Bir öğe kuralı bozar; çocuk **önce hatalı öğeye dokunur, sonra doğrusunu seçer**. Turların ~%30'unda hiç hata yoktur → “hata yok” doğru cevaptır | üretilir |
| ⏪ **Tersine Örüntü** | Kural ve **son** terim verilir, **başlangıç** terimi sorulur (geriye çalışma) | üretilir |
| 🔭 **Uzak Terim** | “Bu dizinin 10. terimi kaçtır?” — tek tek saymanın işe yaramayacağı kadar uzak | üretilir |
| 🎨 **Kendi Örüntünü Kur** | Çocuk 4-6 öğelik dizisini kurar, motor kuralı tahmin edip sürdürür, çocuk “doğru/yanlış sürdürdü” kararını verir | öğrenci üretir |

İlk üç mod ve `data/patterns.json` içeriği **değişmedi**; yeni dört mod ayrı
modüllerde üretilir ([lib/mod-uret.js](lib/mod-uret.js), [lib/modlar.js](lib/modlar.js)).

---

## 🎮 Yeni dört mod

### 🐞 Hatayı Bul

İki adımlı: önce kuralı bozan hücreye dokunulur, sonra oraya ne gelmesi
gerektiği seçilir. İki adım da doğruysa cevap doğru sayılır.

- **Bazı turlarda hiç hata yoktur.** O turda doğru cevap “✅ Bu dizide hata yok”tur.
- Düzeltme seçenekleri **her hücre için ayrı** üretilir. Yalnız bozuk hücre için
  üretilseydi boş liste turun temiz olduğunu ele verirdi; ayrıca temiz turda bir
  hücreye dokunan çocuk çıkmaza girerdi.
- Baş ve son hücre asla bozulmaz — çocuk kuralı iki yandan görebilsin.

### ⏪ Tersine Örüntü

Kural ve son terim verilir; aradaki terimler **boş kutu** olarak durur, böylece
tek tek geri sayılamaz.

| Katman | Kural | Örnek |
|---|---|---|
| **e** | tek adımlı | `+3`, `×2` |
| **u** | iki adımlı | `×2 sonra +1` |

Çeldiriciler gerçek hataları temsil eder: bir adım eksik geri gitme, bir adım
fazla geri gitme, iki adımlı kuralda işlem sırasını karıştırma.

### 🔭 Uzak Terim

İlk dört terim gösterilir, uzak bir terim sorulur.

| Katman | Sorulan terim |
|---|---|
| **e** | 8-10. terim |
| **u** | 15-20. terim |

Şıklarda **“tek tek sayan” çeldirici** bulunur: bir eksik terim (`n-1`) ve bir
fazla terim (`n+1`). Üçüncü çeldirici `(n-1)·fark` yerine `n·fark` hatasıdır.

### 🎨 Kendi Örüntünü Kur

1. Çocuk 4-6 öğelik dizisini kurar (şekil paletinden seçer ya da sayı yazar).
2. **🤖 Motor sürdürsün** der; motor kuralı çıkarıp iki öğe ekler (gri kutular).
3. Çocuk karar verir: **✅ Doğru sürdürdü** / **❌ Yanlış sürdürdü**.
4. “Yanlış” derse kendi kuralını yazabilir; bu metin tur sonunda gösterilir.

Motorun tanıdığı kurallar: sabit fark, sabit çarpan, 1-3 öğelik blok tekrarı,
ayna (simetri). Hiçbiri tutmuyorsa dizi **tutarsızdır**; motor en iyi tahminini
yapar ve kuralın **nerede bozulduğunu** bildirir.

**Puan kural tutarlılığına göre verilir** — ölçülen beceri, tek kurallı bir
örüntü kurabilmektir:

| Kurduğu dizi | Kararı | Puan | Kayıt |
|---|---|---|---|
| tek kurallı | doğru | 100 (+hız bonusu) | `dogru` |
| tek kurallı | yanlış | 60 | `dogru` |
| kural bozuluyor | doğru | 40 | `yanlis` |
| kural bozuluyor | yanlış | 20 | `yanlis` |

Kayıtta kategori `kendi-tutarli` / `kendi-tutarsiz` olarak ayrışır.

Bu mod **bireyseldir**: herkes kendi hızında çalışır, bu yüzden öğretmenin soru
gezinme denetimleri o turda gizlenir.

> Ekranın altındaki katlanır **🎨 Örüntü Tasarla (galeriye gönder)** kartı bundan
> ayrı bir özelliktir: çocuk 6 hücrelik desen kurar, öğretmen onu sınıfa soru
> olarak gönderir.

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

## 🎨 Örüntü Tasarla — galeri (mini mod)

> Bu, yukarıdaki **🎨 Kendi Örüntünü Kur** oyun modundan ayrıdır. Burada çocuk
> 6 hücrelik bir desen kurar ve öğretmen onu sınıfa **soru olarak** gönderir;
> orada ise motor çocuğun kuralını tahmin eder.


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
| 🎛️ **Oturum ve Etkinlik** | **AÇIK** | Grup kartları, Oturumu Aç/Kapat, seviye, **mod seçimi**, **soru gezinme**, akış düğmeleri |
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

## ⏩ İlerleme ve geçiş

Etkinlik başlatılırken iki ayar daha seçilir (yalnız BOŞTA/LOBİ'de):

| İlerleme | Nasıl çalışır |
|---|---|
| 👥 **Senkron** | Herkes aynı sorudadır; tur öğretmenin ritmiyle ilerler |
| 👤 **Bireysel** | Herkes kendi hızında ilerler; öğrenci kendi “Sonraki soru ▶” düğmesiyle geçer, kimse bekleme ekranında kalmaz |

| Sıradaki soru (yalnız senkronda) | Nasıl çalışır |
|---|---|
| ⏩ **Otomatik** | Cevap açıklandıktan 6 sn sonra sıradaki soru kendiliğinden gelir |
| ✋ **Öğretmen onaylı** | ARA aşamasında beklenir; öğretmen “Sonraki soru ▶” diyene kadar geçilmez |

**Soru gezinme** (◀ Önceki / Sonraki ▶ / Şu soruya git) yalnız **senkron ilerlemede
ve senkron modda** görünür; bireysel ilerlemede ve bireysel modda (🎨 Kendi Örüntünü
Kur) gizlenir — panelde nedeni yazar.

### Öğrenci kontrollü ilerleme (yalnız bireysel)

- Cevaptan sonra geri bildirim ekranı öğrenci **“Sonraki soru ▶”** diyene kadar kalır;
  **otomatik geçiş yoktur.** Cevap vermeden “Sonraki” denemez (soru atlanamaz).
- Bir soruda **60 saniye** boyunca cevap veremeyen öğrenciye onaylı **“⏭ Pas geç”**
  açılır: **0 puan**, kayda `sonuc="atlandi"` düşer, doğru cevap gösterilir.
  Süre **sunucuda** ölçülür; istemci düğmeyi erken açsa bile istek reddedilir.
  Pas geçilen soru sonradan cevaplanamaz.
  (CLAUDE.md 90 sn yazar; öğretmen isteğiyle 60 sn — `lib/bireysel.js` → `PAS_SANIYE`.)
- Oyunumuzda her soruda **tek gönderim hakkı** vardır (4 şıkta tahmin uzayı küçük);
  bu yüzden “doğruya ulaşamama” = o süre boyunca cevap verememek demektir.
- **Senkron modda bu düğmeler görünmez**; sunucu da senkron modda öğrenciden gelen
  `bireysel:sonraki` / `bireysel:pasGec` isteğini reddeder.

### Tavansız yol (yalnız bireysel)

Kuyruğunu bitiren öğrenci bekleme ekranında kalmaz; **mevcut havuz ve üreteçten**
(yeni içerik yazılmadan) yeni bir blok alır:

| Bitirdiği bloktaki doğruluk | Sonraki blok |
|---|---|
| **%60 ve üstü** | bir **üst seviye** (1 → 2 → 3) |
| %60'ın altı | aynı seviyede yeni blok |
| seviye 3'te | etkinliğin modlarından **karışık sonsuz tur** |

%60 eşiği rastgele tıklamanın (≈%25) seviye atlatmasını engeller; pas geçilen soru
doğru sayılmaz. Öğrencinin ekranında sıra toplamsız görünür (`Soru 14`); **seviye
hiçbir öğrenci ekranında ve pakette yer almaz**, skor tablosunda yalnız `14. soru`
yazar. Panel ise her öğrencinin seviyesini ve `⬆ tavansız` olup olmadığını gösterir.

Kuyruk hiç bitmediği için bireysel etkinliği **öğretmen** bitirir: **✅ Turu Bitir**
→ SONUÇ, herkese kişisel özet ve iki rozet.

### Bireysel modda puanlama

| Bileşen | Puan |
|---|---|
| Doğru cevap | **500** |
| Hız bonusu | Hedef süreye göre azalır, en çok **500** (seviye 1: 20 sn · 2: 25 sn · 3: 30 sn) |
| İlk denemede doğru | **+100** |

Örnek: seviye 2'de 5 saniyede doğru → 500 + 400 + 100 = **1000 puan**.
Kendi Örüntünü Kur'un kademeli puanı (100/60/40/20) bu ölçeğe beşle çarpılarak girer.

Sıralama bu puana göredir; listede her öğrencinin **kaçıncı soruda** olduğu da görünür
(`soru 4/12`, bitirene `🏁`). Kapanışta iki onur rozeti dağıtılır:
**🏆 En Yüksek Puan** ve **🎯 En İsabetli**.

---

## 🎛️ Mod seçimi ve soru gezinme

### Birden çok mod

Mod seçimi onay kutularıyla yapılır; **birden çok mod** seçilebilir. Seçilenler
tur boyunca **dönüşümlü** gelir (1. mod, 2. mod, 3. mod, 1. mod …), böylece her
modun payı korunur. **🎲 Mod karışık** anahtarı açılırsa sıra rastgeleleşir.

- Havuz **en çok 30 soruyla** sınırlanır; yedi mod birden seçilse bile tur ders
  boyunu aşmaz. Kırpma dönüşümlü harmandan sonra yapılır, yani mod dengesi bozulmaz.
- O seviyede içeriği olmayan mod atlanır ve panelde uyarı çıkar.
- En az bir mod seçili kalmalıdır.
- Kayıtta `set_veya_paket` sütunu **her sorunun kendi modunu** yazar
  (`e-2-uzak`, `e-2-tersine` …), böylece çoklu mod turları analizde ayrışır.

### Soru gezinme (atlama)

| Denetim | İşlev |
|---|---|
| **◀ Önceki soru** | Bir önceki soruya döner (ilk soruda kapalıdır) |
| **Sonraki soru ▶** | Bir sonraki soruya geçer |
| **Şu soruya git** | Havuzdaki herhangi bir soruya atlar |

**Atlanan soru kayıtlarda `atlandi` olarak işaretlenir:** o anda bağlı olup henüz
cevap vermemiş her öğrenci için bir kayıt yazılır. Katılmama da veridir.

Bu denetimler **yalnız senkron modlarda görünür.** Bireysel modda (🎨 Kendi
Örüntünü Kur) gizlenir ve panelde nedeni yazar; o modda ilerletme, akış
satırındaki **⏭️ Soruyu Atla** düğmesiyle yapılır.

---

## 🚀 Gruplar ve U Grubu birleşmesi

Geçerli gruplar **p, e, u**'dur ve tek kaynaktan gelir: [data/gruplar.json](data/gruplar.json).
Grup kartları, öğrenci listesi süzgeci, ekleme listesi ve sunucu doğrulaması bu
dosyayı okur ([lib/gruplar.js](lib/gruplar.js)).

| Kod | Kart adı | Emoji | Renk |
|---|---|---|---|
| `p` | P Grubu | 🐣 | `#B04A2F` |
| `e` | E Grubu | 🌱 | `#256B4D` |
| `u` | U Grubu | 🚀 | `#4A4AA0` |

Renk kartın üst şeridinde ve seçili zeminde görünür; bilgi yalnız renkle verilmez,
kartta emoji ve ad da yazar. Tüm renkler kendi zeminleriyle WCAG AA (≥4.5:1) sağlar.

### i + c → u (2026-09-18)

Eski **i** ve **c** grupları **u** grubunda birleşti. Kod numarasındaki **tek/çift
cinsiyet göstergesi korundu**: tek kodlular `U-01, U-03 …`, çift kodlular
`U-02, U-04 …` aldı. Sıra: önce eski i, sonra eski c; her grupta eski numara sırasıyla.

**Geriye dönük uyumluluk:** eski `"i"`/`"c"` değeri nereden gelirse gelsin — eski
bir `ogrenciler.json`, `patterns.json`, panel isteği ya da CSV — `"u"` olarak kabul
edilir. Kodda sabit bir i/c listesi **yoktur**; eşleme tümüyle veriden gelir:

- [data/gruplar.json](data/gruplar.json) → her grubun `eskiKodlar` alanı
- [data/kod_esleme.json](data/kod_esleme.json) → eski öğrenci kodu → yeni kod
  (**kanonik, asla silinmez**). Eski kodun harfi yeni grubu da gösterdiğinden,
  `eskiKodlar` silinse bile grup eşlemesi bu tablodan türetilir.
- `ogrenciler.json` kayıtlarındaki `eski_kod` alanı da eşlemeye katılır ve
  “Listeyi İndir” ile indirilen dosyada **korunur**.

Böylece cihazında `I-04` kalmış bir tablet `U-04` olarak girer, eski kodlu bir
önceki oturum CSV'si yeni kodlarla eşleşir.

---

## 👥 Öğrenci Listesi yönetimi

`data/ogrenciler.json` panelin en alt bölümünden yönetilir.

- **Süzgeçler:** grup (P / E / U Grubu / hepsi), durum (aktif / pasif / hepsi) ve
  **isim arama kutusu** (isim veya kod içinde arar, tüm gruplarda).
- **Satır işlemleri:** ✏️ ismi düzenle · 🔀 grubunu değiştir · ⏸️/▶️ pasifleştir/aktifleştir.
  Pasif öğrenci giriş ekranındaki kartlarda ve oturum listesinde **görünmez**, grup
  kartındaki “aktif öğrenci” sayısına katılmaz; listeden silinmez. Sahnedeki bir
  öğrenci pasifleştirilirse (ya da başka gruba taşınırsa) oturum listesinden iner
  ve cihazı isim seçme ekranına döner.
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
| `grup` | `"p"` / `"e"` / `"u"` | Çalışma grubu (eski `"i"`/`"c"` okunurken `"u"` sayılır) |
| `aktif` | boolean | `false` ise giriş ekranında ve oturum listesinde **görünmez**, yalnız panelin Öğrenci Listesi bölümünde yönetim için listelenir. Ayrılan öğrenci **silinmez**, pasifleştirilir |
| `eski_kod` | string (isteğe bağlı) | Birleşme öncesi kodu (`C-02`). Eski verilerle eşleşme için korunur |

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
**🔓** ismi serbest bırak · **🚪** sahneden çıkar (yıkıcı, onay sorar). İsim değişikliği **kalıcı listeye** yazılır (kod değişmez) ve
bağlı öğrencinin ekranına anında yansır.

Öğrenci durumları: ✅ Cevapladı · ⏳ Düşünüyor · 🔌 Kopuk

---

## 📁 Dosya yapısı

```
server.js              Express + Socket.io, öğretmen kimlik doğrulama, olay yönlendirme
lib/oyun.js            Oyun durumu, tur akışı, cevap doğrulama, puanlama
lib/oruntu.js          İçerik yükleme, filtreleme, istemciye güvenli paketleme
lib/modlar.js          Yedi modun kayıt defteri: havuz, doğrulama, güvenli paket
lib/mod-uret.js        Hatayı Bul / Tersine Örüntü / Uzak Terim soru üreteci
lib/kurallar.js        Parametrik kural cebiri (+n, ×n, ×a sonra +b)
lib/kendi-kural.js     Öğrencinin kurduğu dizide kural çıkarımı ve tutarlılık
lib/gezinme.js         Soru gezinme (önceki/sonraki/şu soruya git) ve atlandi kaydı
lib/asama.js           Oturum durum makinesi (BOŞTA→LOBİ→OYUN⇄ARA→SONUÇ), Etkinliği Bitir
lib/bireysel.js        Bireysel ilerleme: öğrenci kontrollü geçiş, pas geç, tavansız yol, puanlama
lib/cevap.js           Senkron turda cevap doğrulama, puanlama, tur kapanışı
lib/tablolar.js        Skor tabloları (öğrenci / panel görünümü ayrı)
araclar/i-icerik.js    "u" grubu taban dizileri (42 dizi; dosya adı eski i grubundan kaldı)
araclar/i-uret.js      "u" kayıtlarını üretip patterns.json'a yazar
araclar/i-dogrula.js   "u" içeriğini matematiksel olarak denetler (set doğrulayıcısı)
lib/duzenleme.js       Soru iptali (puan geri alma), isim ve puan düzeltme
lib/liste.js           Kalıcı öğrenci listesi, misafirler, süzgeçler, JSON dışa aktarım
lib/gruplar.js         Geçerli gruplar (p/e/u) ve birleşme eşlemesi — yalnız veriden okur
lib/kimlik.js          ADMIN_PASSWORD çözümü + bağımlılıksız .env okuyucu
lib/olcme.js           Standart olay kaydı, takma ad, CSV dışa/içe aktarım, rapor
lib/karne.js           A4 yazdırılabilir veli karnesi (tek öğrenci + tüm sınıf)
lib/rapor-rotalari.js  /teacher/veri/* rotaları (CSV, karne, önceki oturum)
data/patterns.json     Tüm örüntü içeriği (240 kayıt: e 114 + i 126)
data/ogrenciler.json   Kalıcı isim ↔ kod listesi (TÜM UYCEP oyunlarında aynı dosya)
data/gruplar.json      Grup tanımları: kod, kart adı, emoji, renk
data/kod_esleme.json   Birleşme kod eşlemesi (I-/C- → U-), kanonik — asla silinmez
public/index.html      Öğrenci ekranı
public/app.js          Öğrenci istemcisi (lobi, isim kartları, oyun)
public/ambiyans.js     Lobi ortam animasyonu (canvas partikülleri)
public/mod-klasik.js   Sürdür / Eksiği Bul / Kuralı Yakala çizimi
public/mod-ekran.js    Hatayı Bul / Tersine Örüntü / Uzak Terim çizimi
public/mod-kendi.js    Kendi Örüntünü Kur: kurma, motor sürdürmesi, karar
public/tasarim.js      "Kendi Örüntünü Kur" mini modu
public/efekt.js        Konfeti + opsiyonel sesler
public/rozet.js        Ortak durum göstergeleri (ikon + metin)
public/style.css       Palet, göz konforu kuralları, mobil/tablet uyumu
public/teacher.html    Öğretmen paneli (doğrudan erişim engellidir)
public/teacher.js      Öğretmen istemcisi
public/rapor.js        Ölçme kartı, öğrenci raporu penceresi, karne indirmeleri
public/panel-modlar.js Mod seçimi, ilerleme/geçiş, seçim kilidi ve soru gezinme
public/skor.js         Öğrenci skor tablosu ve kapanış sahnesi (rozetler)
public/bireysel-akis.js Bireysel mod: “Sonraki soru ▶” ve onaylı “Pas geç”
public/etkinlik-bilgi.js ℹ️ Etkinlik Bilgisi modalı (3 sekme + Kopyala)
ETKINLIK_BILGI.json    Kazanımlar · CHC · veli özeti (modalın kaynağı)
ETKINLIK_BILGI.md      Aynı içerik, uygulama çalıştırılmadan okunur
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
      "grup": "e",                 // "p" | "e" | "u" — öğretmen panelinden seçilir
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
| **u** | 42 | 42 | 42 | 126 | **Sayısal** — katlama, değişen fark, iç içe dizi, kare sayı, harf |

Toplam **240** soru. Her grup × seviye × mod kombinasyonu en az **12** soru içerir
(e: 12–13, i: 14).

---

## 🔢 "u" grubu katmanı (eski i + c)

`u`, `e`'nin bittiği yerden başlar ve **belirgin biçimde zordur**: `e` seviye 3'te
en büyük sayı 64 iken `u` seviye 1'de 243, seviye 3'te 972'dir. Yedi modun hepsi
`u` için çalışır. (İçerik, birleşmeden önceki `i` grubunun içeriğidir; soru
kimlikleri `i1-s01` gibi kaldı ki madde düzeyindeki geçmiş veriyle eşleşebilsin.)

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

`u` grubunda "Kuralı Yakala" seçenekleri **sembolik** yazılır — `+7`, `×3`,
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

`u` grubu elle değil, üreteçle tutulur:

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
| 3 | `set_veya_paket` | `e-1-surdur` | `<grup>-<seviye>-<mod>` — çoklu mod turlarında her soru kendi modunu yazar |
| 4 | `grup` | `e` | Çalışma grubu (`p` / `e` / `u`) |
| 5 | `ogrenci_kod` | `E-07` | **Takma ad** — kayıtlarda isim asla geçmez |
| 6 | `gorev_id` | `e1-010` · `i3-k08` | `patterns.json` içindeki soru kimliği |
| 7 | `kategori` | `sayi` | Örüntü türü (`sekil-renk`, `ayna`, `buyuyen`, `sayi`, `ic-ice`, `harf`, `tersine`, `uzak`, `kendi-tutarli`, `kendi-tutarsiz`) |
| 8 | `chc` | `Gq\|Gf` | CHC alanları, `\|` ile ayrılmış |
| 9 | `zorluk` | `e-1` | Katman kodu: `<grup>-<seviye>` |
| 10 | `sonuc` | `dogru` | `dogru` / `yanlis` / `atlandi` |
| 11 | `sure_sn` | `6.42` | Sorunun açılışından cevaba kadar (duraklatılan süre düşülür) |
| 12 | `deneme` | `1` | Bu oyunda tek cevap hakkı vardır; cevapsızda `0` |
| 13 | `ipucu_kullanildi` | `hayir` | Bu oyunda ipucu mekaniği yok; daima `hayir` |
| + | `misafir` | `hayir` | Standart şemanın **sonuna** eklenir: `evet` olan satırlar araştırma setinden süzülür |
| + | `ders_etiketi` | `2. Ders · 12 Eylül` | Öğretmenin oturum açarken girdiği serbest etiket — oturumları ayırt eder |

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
| 🔬 **CSV indir — kodlu** | 13 standart sütun + `misafir` + `ders_etiketi` | Araştırma / akademik analiz |
| 👪 **CSV indir — isimli** | yukarıdakiler + `ogrenci_ad` | Veli raporu, sınıf takibi |

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

### İsimli / Kodlu çıktı

Karne düğmelerinin üstünde bir **“Karnede ne yazsın?”** anahtarı vardır:

| Kip | Kimlik satırı | Nerede kullanılır |
|---|---|---|
| 👪 **İsimli** (varsayılan) | Öğrencinin adı **ve** kodu | Veliye verilen karne |
| 🔬 **Kodlu** | Yalnız kod (`E-07`) | Araştırma, arşiv, dışarıyla paylaşım |

Kodlu kipte öğrencinin adı belgenin **hiçbir yerinde** geçmez — belge başlığında
da, kimlik satırında da yalnız kod yazar; sıralama da koda göre yapılır.
Anahtar hem tek öğrenci karnesini hem “Tüm Karneleri İndir”i etkiler
(`?ad=isimli` / `?ad=kodlu`).

Karne veli diline uygundur (eğitim jargonu yok): kimlik satırı, dört özet kutusu,
örüntü türlerine göre başarı tablosu, öğretmen notu ve “evde birlikte
yapabilirsiniz” önerileri. Açılan sayfadaki **🖨️ Yazdır** düğmesiyle yazdırılır
veya “Hedef: PDF olarak kaydet” seçilerek PDF üretilir. Veli toplantısı öncesi
tüm evrak tek tıkla hazırdır.

### Veri rotaları (hepsi öğretmen çerezi ister, yetkisizde 403)

```
GET  /teacher/veri/csv?ad=kodlu|isimli   CSV indir
GET  /teacher/veri/karne?anahtar=&ad=    Tek öğrenci karnesi (ad=isimli|kodlu)
GET  /teacher/veri/karneler?ad=          Tüm sınıfın karneleri (ad=isimli|kodlu)
POST /teacher/veri/onceki                Önceki oturum CSV'si yükle {csv, dosya}
POST /teacher/veri/onceki-sil            Karşılaştırmayı kaldır
GET  /teacher/veri/liste.json            Güncel ogrenciler.json (Listeyi İndir)
```

**Öğrenci ekranında bu verilerin hiçbiri görünmez**; zorluk gizliliği aynen sürer.

---

## 🧪 Oyun mekaniği denetimi

Her mekanik üç soruyu geçmelidir: (1) tahminle geçilebiliyor mu, (2) rastgele
oynanınca ilerliyor mu, (3) oyuncuyu kilitleyen ya da cevabı sızdıran bir durum var mı.
Son denetimde bulunan ve düzeltilenler:

| Bulgu | Ölçüt | Düzeltme |
|---|---|---|
| Kendi Örüntünü Kur'da `🔺🔺🔺🔺` gibi tek öğe tekrarı “tutarlı” sayılıyor, düşünmeden tam puan alınabiliyordu | tahminle geçilebilir | En az iki farklı öğe zorunlu kılındı |
| Duraklatılmışken “Turu Bitir” çalışmıyordu; öğretmen önce devam etmek zorundaydı | kilitlenme | Duraklatılmışken de kapatılabiliyor |
| Bireysel ilerlemede araya öğrenci tasarımı sokmak sırayı kaydırıyordu | kilitlenme | Bireysel modda engellendi, gerekçesi bildiriliyor |
| Bireysel ilerlemede soru gezinme soketten çağrılabiliyordu (panelde gizliydi ama sunucu kabul ediyordu) | kilitlenme | Sunucu da reddediyor |
| Bireysel ilerlemede duraklatma sırasında sıradaki soru yine gönderiliyordu | kilitlenme | Duraklatmada bekletilir, devam edince gönderilir |
| Bireysel ilerlemede `kendi:surdur` ortak soruya bakıyordu, mod hiç açılmıyordu | kilitlenme | Öğrencinin kendi sorusuna bakıyor |
| Öğrenci paketinde `seviye` ve seviyeyi kodlayan soru kimliği gidiyordu | cevap/zorluk sızıntısı | Paketten çıkarıldı |
| “Pas geç” ile puan ya da seviye kazanılabilir mi? | tahminle geçilebilir | Hayır: 0 puan, doğru sayılmaz, süre sunucuda, soru sonradan cevaplanamaz |
| Tavansız yolda rastgele tıklayarak seviye atlanabilir mi? | tahminle geçilebilir | Hayır: üst seviye için blokta %60 doğruluk gerekir (400 rastgele tıklamada seviye 1'de kaldı) |

Değişmeyen güvenceler: cevap doğrulaması **yalnız sunucuda**; her soruda **tek gönderim
hakkı**; bireysel ilerlemede açıklama paketi **yalnız ilgili öğrenciye** gider;
yanlış cevap da turu ilerletir, kimse takılıp kalmaz.

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
- Öğrenciye giden soru paketinde **seviye ve soru kimliği yoktur** (kimlik `i3-s04` gibi
  seviyeyi kodluyordu); tarayıcı konsolundan bile zorluk okunamaz.
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
