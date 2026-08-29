// Öğretmen paneline özel soket olayları. Her çağrıda yetki çerezle YENİDEN
// doğrulanır; yetkisiz istek loglanıp reddedilir. server.js her bağlantı için
// bu modülü çağırarak olayları bağlar.

const liste = require('./liste');

function bagla({ soket, io, oyun, ogretmenMi, tasarimlar, galeri, girisYayinla, panelYayinla, galeriYayinla, herkeseDurum, icerik }) {
  // yayin=false olan olaylar SALT OKUMADIR: yayın tetiklemezler.
  // (Yoksa panel yanıtı yeni bir sorguyu tetikler ve geri besleme döngüsü oluşur.)
  const ogretmenOlayi = (ad, isleyici, yayin = true) =>
    soket.on(ad, (veri, geriCagir) => {
      if (!ogretmenMi(soket)) {
        console.log(`[güvenlik] yetkisiz öğretmen olayı reddedildi: ${ad}`);
        return geriCagir && geriCagir({ hata: 'Yetkisiz işlem.' });
      }
      const sonuc = isleyici(veri) || { tamam: true };
      geriCagir && geriCagir(sonuc);
      if (!yayin) return;
      girisYayinla(); // liste/oturum değişikliği öğrenci ekranlarına anında yansır
      panelYayinla();
    });

  ogretmenOlayi('ogretmen:baslat', (veri) => oyun.baslat(veri || {}));
  ogretmenOlayi('ogretmen:duraklat', () => oyun.duraklat());
  ogretmenOlayi('ogretmen:devam', () => oyun.devam());
  ogretmenOlayi('ogretmen:sifirla', () => oyun.sifirla());
  ogretmenOlayi('ogretmen:atla', () => oyun.atla());
  ogretmenOlayi('ogretmen:turuKapat', () => oyun.turuKapat('öğretmen-kapattı'));

  ogretmenOlayi('ogretmen:tasarimGonder', (veri) => {
    const tasarim = tasarimlar.find((t) => t.id === Number(veri && veri.id));
    if (!tasarim) return { hata: 'Tasarım bulunamadı.' };
    if (!oyun.havuz.length) return { hata: 'Önce bir tur başlat.' };
    console.log(`[tasarım] ${tasarim.isim} tasarımı sınıfa gönderildi`);
    oyun.ozelSoru(icerik.tasarimdanSoru(tasarim));
    return { tamam: true };
  });

  ogretmenOlayi('ogretmen:tasarimSil', (veri) => {
    const i = tasarimlar.findIndex((t) => t.id === Number(veri && veri.id));
    if (i >= 0) tasarimlar.splice(i, 1);
    if (galeri.acik) galeriYayinla();
    return { tamam: true };
  });

  // Öğrenci galerisini öğrencilere aç/kapat
  ogretmenOlayi('ogretmen:galeriGorunurluk', (veri) => {
    galeri.acik = !!(veri && veri.acik);
    console.log(`[galeri] öğrenci galerisi ${galeri.acik ? 'AÇILDI' : 'KAPATILDI'}`);
    herkeseDurum();
    return { tamam: true, galeriAcik: galeri.acik };
  });

  // "Kendi Örüntünü Kur" bölümünü öğrenci ekranında aç/kapat
  ogretmenOlayi('ogretmen:tasarimGorunurluk', (veri) => {
    galeri.tasarimAcik = !!(veri && veri.acik);
    console.log(`[tasarım] öğrenci tasarım bölümü ${galeri.tasarimAcik ? 'AÇILDI' : 'KAPATILDI'}`);
    herkeseDurum();
    return { tamam: true, tasarimAcik: galeri.tasarimAcik };
  });

  // Son turun puanlarını geri al
  ogretmenOlayi('ogretmen:puaniGeriAl', () => oyun.turPuaniniGeriAl());

  // Öğrenci ismini değiştir (bağlıysa öğrenciye de bildir)
  ogretmenOlayi('ogretmen:isimDegistir', (veri) => {
    const sonuc = oyun.isimDegistir(veri && veri.anahtar, veri && veri.yeniIsim);
    if (sonuc.tamam && sonuc.oyuncu.socketId) {
      io.to(sonuc.oyuncu.socketId).emit('senin:isim', { isim: sonuc.oyuncu.isim });
    }
    return sonuc.tamam ? { tamam: true } : { hata: sonuc.hata };
  });

  // Öğrenci puanını değiştir
  ogretmenOlayi('ogretmen:puanDegistir', (veri) =>
    oyun.puanAyarla(veri && veri.anahtar, veri && veri.puan)
  );

  // ---- Sınıf oturumu ----

  ogretmenOlayi('ogretmen:oturumAc', (veri) => {
    const sonuc = oyun.oturumAc(veri && veri.grup);
    // Grup değiştiyse eski grubun öğrencileri giriş ekranına döner
    for (const id of sonuc.dusenSoketler || []) io.to(id).emit('cikarildin', { sebep: 'grup' });
    return sonuc.hata ? { hata: sonuc.hata } : { tamam: true, grup: sonuc.grup };
  });
  ogretmenOlayi('ogretmen:oturumKapat', () => oyun.oturumKapat());

  // Bir ismi serbest bırak: kart yeniden seçilebilir olur, puan korunur
  ogretmenOlayi('ogretmen:serbestBirak', (veri) => {
    const sonuc = oyun.serbestBirak(veri && veri.kod);
    if (sonuc.tamam && sonuc.eskiSoket) {
      io.to(sonuc.eskiSoket).emit('cikarildin', { sebep: 'serbest' });
    }
    return sonuc.hata ? { hata: sonuc.hata } : { tamam: true };
  });

  // ---- Öğrenci listesi yönetimi (ogrenciler.json) ----

  ogretmenOlayi(
    'ogretmen:listeGetir',
    (veri) => ({ tamam: true, ogrenciler: liste.panelListesi(veri || {}) }),
    false // salt okuma
  );

  ogretmenOlayi('ogretmen:listeEkle', (veri) => liste.ekle(veri || {}));

  ogretmenOlayi('ogretmen:listeGuncelle', (veri) =>
    liste.guncelle(veri && veri.kod, (veri && veri.degisiklik) || {})
  );

  // Misafir öğrenci: o oturumluk, M-01 / M-02 … kodu alır
  ogretmenOlayi('ogretmen:misafirEkle', (veri) =>
    liste.misafirEkle({ isim: veri && veri.isim, grup: oyun.oturum.grup })
  );

  ogretmenOlayi('ogretmen:misafirCikar', (veri) => {
    const kod = String((veri && veri.kod) || '').toUpperCase();
    if (oyun.oyuncular.has(kod)) oyun.oyuncular.delete(kod);
    return liste.misafirCikar(kod);
  });

  // Öğrenci Raporu ekranı (panelde öğrenciye tıklanınca)
  ogretmenOlayi(
    'ogretmen:rapor',
    (veri) => {
      const oyuncu = oyun.oyuncular.get(String((veri && veri.anahtar) || ''));
      if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };
      return { tamam: true, rapor: oyun.olcme.rapor(oyuncu) };
    },
    false // salt okuma
  );

  // Oturum ölçüm kayıtlarını sil (yeni ders/sınıf için)
  ogretmenOlayi('ogretmen:olcumTemizle', () => {
    const sayi = oyun.olcme.sayi;
    oyun.olcme.temizle();
    console.log(`[veri] ölçüm kayıtları temizlendi (${sayi} kayıt silindi)`);
    return { tamam: true, silinen: sayi };
  });
}

module.exports = { bagla };
