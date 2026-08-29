// Örüntü Motoru — UYCEP Logic sınıf içi çok oyunculu örüntü oyunu
// Çalıştırma: npm start   (http://localhost:3000)

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const icerik = require('./lib/oruntu');
const { Oyun } = require('./lib/oyun');
const raporRotalari = require('./lib/rapor-rotalari');
const liste = require('./lib/liste');
const ogretmenOlaylari = require('./lib/ogretmen-olaylari');

// Öğretmen paneli şifresi.
// Yerelde (env değişkeni yokken) YEREL_SIFRE geçerlidir.
// Render'da Environment > ADMIN_PASSWORD = hayfan777 tanımlanır ve o kullanılır.
const YEREL_SIFRE = 'yerel777';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || YEREL_SIFRE;
const PORT = process.env.PORT || 3000;

const app = express();
const sunucu = http.createServer(app);
const io = new Server(sunucu);

icerik.yukle();
liste.yukle();
const oyun = new Oyun();

// Öğrenci tasarımları galerisi
const tasarimlar = [];
let tasarimSayaci = 0;
const GALERI_SINIRI = 60;
// Görünürlük anahtarları — öğretmen olayları modülüyle paylaşılır
const galeri = {
  acik: false,      // öğrenci galerisi yalnızca öğretmen açınca görünür
  tasarimAcik: true, // "Kendi Örüntünü Kur" kartı öğrenci ekranında görünsün mü
};

// ---------------- Öğretmen kimlik doğrulama ----------------

function cerezOku(istek) {
  const ham = istek.headers.cookie || '';
  return Object.fromEntries(
    ham
      .split(';')
      .map((p) => p.trim().split('='))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

const yetkiliMi = (istek) => cerezOku(istek).admin_auth === 'true';

app.use(express.urlencoded({ extended: false }));

// teacher.html ve teacher.js'e doğrudan erişim engellenir
app.use((istek, yanit, sonraki) => {
  if (/^\/teacher\.(html|js)$/.test(istek.path) && !yetkiliMi(istek)) {
    return yanit.redirect('/teacher');
  }
  sonraki();
});

app.use(express.static(path.join(__dirname, 'public')));

const GIRIS_SAYFASI = (hataVarMi) => `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Öğretmen Girişi — Örüntü Motoru</title>
<link rel="stylesheet" href="/style.css"></head>
<body class="giris-zemin">
  <form class="kart giris-kart" method="POST" action="/teacher/giris">
    <h1>🔐 Öğretmen Girişi</h1>
    <p class="ipucu">Örüntü Motoru yönetim paneli</p>
    ${hataVarMi ? '<p class="hata">Şifre hatalı, tekrar dene.</p>' : ''}
    <input type="password" name="sifre" placeholder="Şifre" autofocus required>
    <button type="submit">Giriş Yap</button>
  </form>
</body></html>`;

app.get('/teacher', (istek, yanit) => {
  if (!yetkiliMi(istek)) return yanit.send(GIRIS_SAYFASI(istek.query.hata === '1'));
  yanit.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

app.post('/teacher/giris', (istek, yanit) => {
  if (istek.body.sifre === ADMIN_PASSWORD) {
    yanit.setHeader('Set-Cookie', 'admin_auth=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200');
    console.log('[öğretmen] panele giriş yapıldı');
    return yanit.redirect('/teacher');
  }
  console.log('[öğretmen] hatalı şifre denemesi');
  yanit.redirect('/teacher?hata=1');
});

app.post('/teacher/cikis', (istek, yanit) => {
  yanit.setHeader('Set-Cookie', 'admin_auth=; Path=/; HttpOnly; Max-Age=0');
  yanit.redirect('/teacher');
});

// Ölçme rotaları: CSV dışa aktarım, karne, tüm karneler, önceki oturum
raporRotalari.rotalariKur(app, { oyun, yetkiliMi });

// ---------------- Socket.io ----------------

const ogretmenMi = (soket) => cerezOku(soket.request).admin_auth === 'true';

function durumOzeti() {
  return {
    durum: oyun.durum,
    oturumAcik: oyun.oturum.acik,
    sira: oyun.soruIndeksi + 1,
    toplam: oyun.havuz.length,
    kalanSure: oyun.kalanSure,
    cevaplayan: oyun.cevaplar.size,
    bagliSayisi: oyun.bagliSayisi,
    galeriAcik: galeri.acik,
    tasarimAcik: galeri.tasarimAcik,
  };
}

// Giriş ekranı: oturum kapalıyken boş paket, açıkken YALNIZ aktif grubun kartları
function girisYayinla() {
  io.emit('giris', oyun.girisPaketi());
}

// Öğrenci galerisi: yalnızca öğretmen açtığında içerik yayınlanır
function galeriYayinla() {
  io.emit('galeri', { acik: galeri.acik, tasarimlar: galeri.acik ? tasarimlar : [] });
}

function panelYayinla() {
  // Öğretmen paneline takma adlar ve ölçüm özeti de gider (öğrenciye ASLA gitmez).
  io.to('ogretmenler').emit('panel:durum', {
    ...durumOzeti(),
    oyuncular: oyun.panelTablosu(),
    galeri: tasarimlar,
    ayar: oyun.ayar, // zorluk/mod bilgisi YALNIZ panele gider
    oturum: oyun.oturum,
    // Grup özeti: aktif öğrenci sayısı + o grup için içerik var mı
    gruplar: liste.grupOzeti().map((g) => ({
      ...g,
      soruSayisi: icerik.tumu().filter((o) => o.grup === g.grup).length,
    })),
    olcum: {
      kayitSayisi: oyun.olcme.sayi,
      sonDisaAktarim: oyun.olcme.sonDisaAktarim,
      onceki: oyun.olcme.oncekiOturum
        ? { kaynak: oyun.olcme.oncekiOturum.kaynak, ogrenciSayisi: oyun.olcme.oncekiOturum.ogrenciler.size }
        : null,
    },
  });
}

function herkeseDurum() {
  io.emit('durum', durumOzeti());
  io.emit('skorlar', oyun.skorTablosu());
  girisYayinla();
  galeriYayinla();
  panelYayinla();
}

// Oyun olayları → yayın
oyun.on('turBasladi', ({ soru, kalanSure }) => {
  io.emit('tur:basladi', { soru, kalanSure });
  // Doğru cevap yalnızca yetkili öğretmen odasına gider
  io.to('ogretmenler').emit('panel:cevap', icerik.cevapAcikla(oyun.soru));
  herkeseDurum();
});

oyun.on('turBitti', ({ sonuc, kisisel, skorlar, sonSoruMu }) => {
  // Her öğrenciye kendi sonucu + herkese doğru cevap
  for (const oyuncu of oyun.oyuncular.values()) {
    if (!oyuncu.bagli || !oyuncu.socketId) continue;
    io.to(oyuncu.socketId).emit('tur:bitti', {
      sonuc,
      benim: kisisel[oyuncu.anahtar] || null,
      skorlar,
      sonSoruMu,
    });
  }
  io.to('ogretmenler').emit('tur:bitti', { sonuc, skorlar, sonSoruMu });
  herkeseDurum();
});

oyun.on('sayac', (kalan) => io.emit('sayac', kalan));
oyun.on('cevapGeldi', () => herkeseDurum());
oyun.on('degisti', () => herkeseDurum());
oyun.on('oyunBitti', (skorlar) => {
  io.emit('oyun:bitti', { skorlar });
  herkeseDurum();
});

io.on('connection', (soket) => {
  const yetkili = ogretmenMi(soket);
  if (yetkili) {
    soket.join('ogretmenler');
    console.log('[soket] öğretmen paneli bağlandı');
    panelYayinla();
  } else {
    // Öğrenci: oturum kapalıysa bekleme ekranı, açıksa kendi grubunun kartları
    soket.emit('giris', oyun.girisPaketi());
    soket.emit('durum', durumOzeti());
  }

  // ---- Öğrenci olayları ----

  // Öğrenci isim YAZMAZ; listedeki kendi kartına dokunur (sınıf oturumu modeli)
  soket.on('katil', (veri, geriCagir) => {
    const { hata, oyuncu } = oyun.katil(veri || {}, soket.id);
    if (hata) return geriCagir && geriCagir({ hata });

    soket.data.oyuncuAnahtari = oyuncu.anahtar;
    geriCagir &&
      geriCagir({
        tamam: true,
        isim: oyuncu.isim,
        jeton: oyuncu.jeton, // aynı tarayıcı kilitli kartına geri dönebilsin
        skor: oyuncu.skor,
        durum: durumOzeti(),
      });

    // Tur devam ediyorsa geç katılan/dönen öğrenciye mevcut soruyu gönder
    if (oyun.durum === 'oynaniyor' && oyun.soru) {
      soket.emit('tur:basladi', {
        soru: icerik.istemciIcin(oyun.soru, oyun.soruIndeksi + 1, oyun.havuz.length),
        kalanSure: oyun.kalanSure,
      });
    }
    herkeseDurum();
  });

  soket.on('cevap', (veri, geriCagir) => {
    const sonuc = oyun.cevapVer(soket.id, veri && veri.secim);
    geriCagir && geriCagir(sonuc);
  });

  soket.on('tasarim:gonder', (veri, geriCagir) => {
    const oyuncu = oyun.oyuncuBul(soket.id);
    if (!oyuncu) return geriCagir && geriCagir({ hata: 'Önce oyuna katılmalısın.' });
    // Öğretmen bölümü kapattıysa sunucu da tasarım kabul etmez
    if (!galeri.tasarimAcik) {
      return geriCagir && geriCagir({ hata: 'Tasarım bölümü şu anda kapalı.' });
    }

    const hucreler = Array.isArray(veri && veri.hucreler) ? veri.hucreler : [];
    const temiz = hucreler.slice(0, 6).map((h) => String(h).slice(0, 8));
    if (temiz.length !== 6 || temiz.some((h) => !h)) {
      return geriCagir && geriCagir({ hata: 'Altı hücrenin tamamını doldur.' });
    }

    const tasarim = {
      id: ++tasarimSayaci,
      isim: oyuncu.isim,
      grup: oyun.ayar.grup,
      hucreler: temiz,
    };
    tasarimlar.unshift(tasarim);
    if (tasarimlar.length > GALERI_SINIRI) tasarimlar.pop();

    console.log(`[tasarım] ${oyuncu.isim} bir örüntü tasarladı (#${tasarim.id})`);
    geriCagir && geriCagir({ tamam: true });
    panelYayinla();
    if (galeri.acik) galeriYayinla(); // galeri açıksa yeni tasarım öğrencilere de yansısın
  });

  // Öğretmen olayları (yalnızca yetkili soketler) — lib/ogretmen-olaylari.js
  ogretmenOlaylari.bagla({
    soket, io, oyun, ogretmenMi, tasarimlar, galeri,
    girisYayinla, panelYayinla, galeriYayinla, herkeseDurum, icerik,
  });

  soket.on('disconnect', () => {
    const oyuncu = oyun.ayrildi(soket.id);
    if (oyuncu) herkeseDurum();
  });
});

sunucu.listen(PORT, () => {
  console.log(`🧩 Örüntü Motoru çalışıyor → http://localhost:${PORT}`);
  console.log(`👩‍🏫 Öğretmen paneli → http://localhost:${PORT}/teacher`);
  console.log('─'.repeat(46));
  if (process.env.ADMIN_PASSWORD) {
    console.log(`🔐 Öğretmen şifresi : ${ADMIN_PASSWORD}`);
    console.log('   Kaynak           : ADMIN_PASSWORD ortam değişkeni');
  } else {
    console.log(`🔐 Öğretmen şifresi : ${YEREL_SIFRE}`);
    console.log('   Kaynak           : yerel varsayılan (YEREL_SIFRE)');
  }
  console.log('─'.repeat(46));
});
