# UYCEP Logic Oyun Standartları

Bu proje, UYCEP Logic dersi için çok oyunculu bir sınıf içi web oyunudur.
Aşağıdaki standartlara İSTİSNASIZ uy:

## Teknoloji
- Node.js + Express + Socket.io (başka framework yok, build adımı yok, vanilla JS)
- Dosya yapısı: server.js, package.json, /public (index.html, app.js, style.css,
  teacher.html, teacher.js), /data (questions.json vb. tüm içerik dosyaları)
- package.json: "start": "node server.js"; bağımlılıklar yalnızca express ve socket.io
- Port: process.env.PORT || 3000 (Render uyumu için zorunlu)

## Roller ve akış
- Öğrenci: / adresinden isim girerek katılır. Oda kodu YOK; herkes tek sınıf
  odasına bağlanır.
- Öğretmen: /teacher rotası. teacher.html'e doğrudan erişim engellenir;
  cookie tabanlı basit şifre girişi (admin_auth=true). Şifre server.js başında
  ADMIN_PASSWORD olarak tanımlanır: process.env.ADMIN_PASSWORD varsa o kullanılır
  (Render'da hayfan777), yoksa YEREL_SIFRE sabitine düşülür (yerelde yerel777).
- Öğretmen paneli her oyunda şunları yapabilmeli: bağlı öğrenci listesi,
  oyunu başlat/duraklat/sıfırla, zorluk/seviye seçimi, canlı skor tablosu,
  gerekiyorsa soru/tur ilerletme.
- Öğrenci bağlantısı koptuğunda skoru korunur; aynı isimle dönünce kaldığı
  yerden devam eder.
- Oyuncu sayısına ASLA yapay bir üst sınır koyma (MAX_PLAYERS gibi sabitler
  yasak). Sınıf mevcudu değişkendir; oyun 1 öğrenciyle de 30 öğrenciyle de
  çalışmalıdır. Testler en az 10 eşzamanlı bağlantıyla yapılır ama bu bir
  tavan değil, alt kalite çıtasıdır.

## İçerik ayrımı
- Sorular, seviyeler, bulmaca tanımları ASLA koda gömülmez; /data altında
  JSON olarak tutulur. JSON şemasını dosya başında yorumla belgele
  (JSON yorum desteklemediği için şemayı README.md'ye yaz).
- Her içerik dosyasında "grup" alanı bulunur: "e", "i", "c" (gerekirse "p").
  Öğretmen panelinden grup seçilince yalnız o grubun içeriği yüklenir.

## Arayüz
- Dil: Türkçe. Ton: sıcak, oyunlaştırılmış, emoji kullanımı serbest.
- Renk paleti SERBEST: her oyun, temasına uygun kendi paletini seçebilir
  (uzay oyunu koyu tonlar, kripto oyunu parşömen tonları vb.). Zorunlu
  kurumsal renk yoktur.
- Göz konforu kuralları (paletten bağımsız, zorunlu):
  * Yüksek kontrast: metin/zemin kontrastı en az WCAG AA düzeyinde;
    açık zeminde koyu metin tercih edilir.
  * Neon, aşırı doygun veya titreşen renk kombinasyonlarından kaçın;
    yumuşak, pastel veya dengeli tonlar kullan.
  * Bilgi asla yalnız renkle verilmez (renk + ikon/desen/etiket birlikte);
    renk körü öğrenciler gözetilir.
  * Sade yerleşim: ekranda aynı anda tek odak; gereksiz süsleme,
    kalabalık panel ve sürekli hareket eden dekor yok.
- Kullanım kolaylığı: Mobil ve tablet uyumlu, büyük dokunma hedefleri
  (en az 44px), okunaklı yazı boyutları (gövde metin 16px+), net ve
  kısa yönergeler. Font: Poppins veya benzeri okunaklı bir sans-serif.
- Doğru cevapta konfeti/kutlama animasyonu, yanlışta nazik geri bildirim.
  Sesler opsiyonel ve kapatılabilir.

## Kalite
- Tek dosyada 400 satırı geçen JS'i mantıklı modüllere böl.
- Sunucu, istemciden gelen her veriyi doğrular (cevap kontrolü daima
  sunucuda yapılır; istemcide cevap sızdırılmaz).
- console.log ile temel olay günlüğü tut (katılım, cevap, tur değişimi).
- README.md: kurulum, oyun akışı, JSON şeması, öğretmen kısayolları.