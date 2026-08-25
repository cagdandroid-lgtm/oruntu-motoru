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

## Oyun akışı

1. Öğretmen panelden **grup** (e / i), **seviye** (1–3) ve **mod** seçip *Turu Başlat*'a basar.
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

Öğrencinin skoru sunucuda **isme göre** saklanır. Aynı isimle geri dönen öğrenci
kaldığı yerden devam eder (büyük/küçük harf farkı önemsizdir: `Ada` = `ada`).

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
| ↩️ Son Turun Puanını Geri Al | Kehribar çizgi | geri döndür |
| 🔄 Skorları Sıfırla | Kırmızı | yıkıcı |

### Puanları geri alma

Soru hatalı/tartışmalı çıkarsa öğretmen **↩️ Son Turun Puanını Geri Al** ile
o turda dağıtılan puanları geri çeker: her öğrencinin skorundan o turda kazandığı
puan düşülür, doğru sayısı azaltılır. Aynı tur iki kez geri alınamaz (çifte geri alma
engellidir). Tur hâlâ oynanıyorsa aktif turun, kapanmışsa son kapanan turun puanları geri alınır.

### Öğrenci ismi ve puanını düzenleme

Skor tablosundaki her satırda **✏️** ile ismi, **🔢** ile puanı değiştirebilirsin.
İsim değişince bağlı öğrencinin ekranı da güncellenir ve puanı korunur.

Öğrenci durumları: ✅ Cevapladı · ⏳ Düşünüyor · 🔌 Kopuk

---

## 📁 Dosya yapısı

```
server.js              Express + Socket.io, öğretmen kimlik doğrulama, olay yönlendirme
lib/oyun.js            Oyun durumu, tur akışı, cevap doğrulama, puanlama
lib/oruntu.js          İçerik yükleme, filtreleme, istemciye güvenli paketleme
data/patterns.json     Tüm örüntü içeriği (246 kayıt)
public/index.html      Öğrenci ekranı
public/app.js          Öğrenci istemcisi
public/tasarim.js      "Kendi Örüntünü Kur" mini modu
public/efekt.js        Konfeti + opsiyonel sesler
public/rozet.js        Ortak durum göstergeleri (ikon + metin)
public/style.css       Palet, göz konforu kuralları, mobil/tablet uyumu
public/teacher.html    Öğretmen paneli (doğrudan erişim engellidir)
public/teacher.js      Öğretmen istemcisi
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
      "tur": "sekil-renk",         // "sekil-renk" | "sayi" | "buyuyen" | "ayna"
      "seviye": 1,                 // 1 | 2 | 3
      "mod": "surdur",             // "surdur" | "eksik" | "kural"
      "dizi": ["🔺","🟦","🔺","🟦","🔺","🟦","🔺","🟦"],
      "gizliIndeks": 7,            // gizlenecek hücrenin indeksi; "kural" modunda -1
      "secenekler": ["🔺","🟦","⭐","🌸"],  // 4 seçenek; "kural" modunda kural metinleri
      "kural": "iki şekil sırayla tekrar ediyor",
      "aciklama": "Üçgen ve kare sırayla geliyor."
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

| Grup | Seviye 1 | Seviye 2 | Seviye 3 | Ağırlık |
|---|---|---|---|---|
| **e** | 36 | 39 | 39 | Görsel (emoji şekil-renk, büyüyen desen, ayna) |
| **i** | 36 | 39 | 39 | Sayısal (aritmetik, çift-tek, üçgensel, Fibonacci, 2 katı) |

Her grup/seviye kombinasyonu her modda **12–13 soru** içerir (toplam 228).

### Yeni örüntü ekleme

`data/patterns.json` içindeki `oruntuler` dizisine yukarıdaki şemaya uyan bir kayıt ekleyip
sunucuyu yeniden başlatmak yeterlidir. Dikkat edilecekler:

- `secenekler` **tam 4** öğe olmalı ve doğru cevabı içermeli.
- `eksik` modunda `gizliIndeks` en az 2 olmalı (öğrencinin kuralı görebilmesi için).
- `kural` modunda `gizliIndeks: -1` ve `secenekler` kural metinleri olmalı.

---

## 🔒 Güvenlik notları

- Cevap doğrulaması **daima sunucuda** yapılır; istemciye cevap sızmaz.
- İstemciden gelen seçim, sorunun geçerli seçenekleri arasında değilse reddedilir.
- Aynı turda ikinci cevap kabul edilmez; duraklatılmışken cevap alınmaz.
- `teacher.html` ve `teacher.js` çerezsiz istekte `/teacher` giriş sayfasına yönlendirilir.
- Öğretmen soket olayları her çağrıda çerezle yeniden doğrulanır; yetkisiz istek loglanır.

## 📋 Olay günlüğü

Sunucu konsoluna yazılanlar: katılım, ayrılma, tur başlangıcı, her cevap (doğru/yanlış + puan),
tur kapanışı ve sebebi, tasarım gönderimi, öğretmen girişi ve yetkisiz istekler.
