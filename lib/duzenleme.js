// Öğretmen panelinden yapılan sınıf yönetimi düzenlemeleri:
// tur puanını geri alma (soru iptali), öğrenci ismi ve puanı düzeltme.
// Oyun sınıfı bu işlevleri kendi metotlarından çağırır; oyun mekaniği
// (tur akışı, cevap doğrulama) lib/oyun.js içinde kalır.

const liste = require('./liste');

// En son turda dağıtılan puanları geri alır (yanlış/tartışmalı soru vb.).
// Aktif tur oynanıyorsa o turdaki puanlar, değilse son kapanan tur geri alınır.
function turPuaniniGeriAl(oyun) {
  const aktifMi = oyun.durum === 'oynaniyor' || oyun.durum === 'duraklatildi';
  const kaynak = aktifMi ? oyun.cevaplar : oyun.sonTurPuanlari;

  let toplam = 0;
  let sayi = 0;
  for (const [anahtar, c] of kaynak) {
    if (!c.dogruMu || !c.kazanilan) continue;
    const oyuncu = oyun.oyuncular.get(anahtar);
    if (!oyuncu) continue;
    oyuncu.skor = Math.max(0, oyuncu.skor - c.kazanilan);
    oyuncu.dogruSayisi = Math.max(0, oyuncu.dogruSayisi - 1);
    toplam += c.kazanilan;
    sayi++;
  }

  // Soru iptal edildiği için o turun ölçüm kayıtları analiz dışı bırakılır.
  // Kimse puan almamış olsa bile kayıtlar geçersiz sayılmalıdır (hatalı soru).
  const iptalTuru = aktifMi ? oyun.turNo : oyun.sonTurNo;
  const iptalSayisi = iptalTuru ? oyun.olcme.turuIptalEt(iptalTuru) : 0;

  if (!sayi && !iptalSayisi) return { hata: 'Geri alınacak puan ya da kayıt yok.' };

  // Aynı puanların ikinci kez geri alınmasını önle
  if (aktifMi) {
    for (const c of oyun.cevaplar.values()) {
      c.kazanilan = 0;
      c.geriAlindi = true;
    }
  }
  oyun.sonTurPuanlari = new Map();
  oyun.sonTurNo = null;

  console.log(
    `[puan] soru iptal edildi — ${sayi} öğrenciden toplam -${toplam} puan` +
      (iptalSayisi ? ` · ${iptalSayisi} ölçüm kaydı geçersiz sayıldı` : '')
  );
  oyun.emit('degisti');
  return { tamam: true, geriAlinan: toplam, oyuncuSayisi: sayi, iptalEdilenKayit: iptalSayisi };
}

function isimDegistir(oyun, kod, yeniIsim) {
  const oyuncu = oyun.oyuncular.get(String(kod || '').toUpperCase());
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

  // İsim kalıcı listede düzeltilir; KOD asla değişmez, böylece geçmiş
  // ölçüm kayıtlarının sürekliliği bozulmaz.
  const sonuc = liste.guncelle(oyuncu.kod, { isim: yeniIsim });
  if (sonuc.hata) return sonuc;

  const eskiIsim = oyuncu.isim;
  oyuncu.isim = sonuc.ogrenci.isim;
  for (const kayit of oyun.olcme.kayitlar) {
    if (kayit.anahtar === oyuncu.kod) kayit.isim = oyuncu.isim;
  }

  console.log(`[düzenleme] "${eskiIsim}" → "${oyuncu.isim}" (${oyuncu.kod})`);
  oyun.emit('degisti');
  return { tamam: true, oyuncu };
}

function puanAyarla(oyun, anahtar, puan) {
  const oyuncu = oyun.oyuncular.get(anahtar);
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

  const p = Math.round(Number(puan));
  if (!Number.isFinite(p) || p < 0 || p > 1000000) return { hata: 'Geçersiz puan.' };

  console.log(`[düzenleme] ${oyuncu.isim} puanı ${oyuncu.skor} → ${p}`);
  oyuncu.skor = p;
  oyun.emit('degisti');
  return { tamam: true };
}

module.exports = { turPuaniniGeriAl, isimDegistir, puanAyarla };
