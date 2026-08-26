// Öğretmen paneline ait veri rotaları: CSV dışa aktarım, yazdırılabilir
// karne (tek öğrenci ve tüm sınıf) ve önceki oturum CSV'sinin içe aktarımı.
// Tüm rotalar çerez tabanlı öğretmen yetkisiyle korunur.

const express = require('express');
const karne = require('./karne');

function rotalariKur(app, { oyun, yetkiliMi }) {
  const rota = express.Router();

  // Yetkisiz erişim panele yönlendirilir (öğrenciye veri sızmaz)
  rota.use((istek, yanit, sonraki) => {
    if (!yetkiliMi(istek)) {
      console.log(`[güvenlik] yetkisiz veri isteği reddedildi: ${istek.path}`);
      return yanit.status(403).send('Bu sayfaya erişim yetkin yok.');
    }
    sonraki();
  });

  // ---- CSV dışa aktarım: oturumdaki TÜM öğrenciler tek dosyada ----
  rota.get('/csv', (istek, yanit) => {
    const isimli = istek.query.ad === 'isimli';
    const metin = oyun.olcme.csv({
      isimli,
      isimCozucu: (anahtar) => {
        const o = oyun.oyuncular.get(anahtar);
        return o ? o.isim : '';
      },
    });
    const dosya = oyun.olcme.dosyaAdi(oyun.ayar.grup);
    console.log(
      `[veri] CSV indirildi — ${isimli ? 'isimli' : 'kodlu'} · ${oyun.olcme.sayi} kayıt · ${dosya}`
    );
    yanit.setHeader('Content-Type', 'text/csv; charset=utf-8');
    yanit.setHeader('Content-Disposition', `attachment; filename="${dosya}"`);
    yanit.send(metin);
  });

  // ---- Tek öğrencinin A4 karnesi ----
  rota.get('/karne', (istek, yanit) => {
    const oyuncu = oyun.oyuncular.get(String(istek.query.anahtar || ''));
    if (!oyuncu) return yanit.status(404).send('Öğrenci bulunamadı.');
    console.log(`[veri] karne açıldı — ${oyuncu.isim} (${oyuncu.kod})`);
    yanit.send(karne.tekKarne(oyun.olcme.rapor(oyuncu), oyun.ayar));
  });

  // ---- Tüm karneler: her öğrenci ayrı A4 sayfa, tek belge ----
  rota.get('/karneler', (istek, yanit) => {
    const raporlar = [...oyun.oyuncular.values()]
      .sort((a, b) => a.isim.localeCompare(b.isim, 'tr'))
      .map((o) => oyun.olcme.rapor(o));
    console.log(`[veri] tüm karneler üretildi — ${raporlar.length} öğrenci`);
    yanit.send(karne.tumKarneler(raporlar, oyun.ayar));
  });

  // ---- Önceki oturum CSV'si (karnedeki "geçen oturuma göre değişim") ----
  rota.post('/onceki', express.json({ limit: '8mb' }), (istek, yanit) => {
    const metin = istek.body && istek.body.csv;
    if (typeof metin !== 'string' || !metin.trim()) {
      return yanit.status(400).json({ hata: 'CSV içeriği boş.' });
    }
    const dosya = String((istek.body && istek.body.dosya) || 'önceki oturum').slice(0, 80);
    const sonuc = oyun.olcme.oncekiOturumuYukle(metin, dosya);
    if (sonuc.hata) return yanit.status(400).json(sonuc);
    console.log(`[veri] önceki oturum yüklendi — ${dosya} · ${sonuc.ogrenciSayisi} öğrenci`);
    yanit.json(sonuc);
  });

  rota.post('/onceki-sil', (istek, yanit) => {
    oyun.olcme.oncekiOturumuUnut();
    console.log('[veri] önceki oturum karşılaştırması kaldırıldı');
    yanit.json({ tamam: true });
  });

  app.use('/teacher/veri', rota);
}

module.exports = { rotalariKur };
