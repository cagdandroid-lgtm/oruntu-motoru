// Öğretmen panelinden yapılan sınıf yönetimi düzenlemeleri:
// tur puanını geri alma (soru iptali), öğrenci ismi ve puanı düzeltme.
// Oyun sınıfı bu işlevleri kendi metotlarından çağırır; oyun mekaniği
// (tur akışı, cevap doğrulama) lib/oyun.js içinde kalır.

const anahtarla = (isim) => isim.trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

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

function isimDegistir(oyun, anahtar, yeniIsim) {
  const oyuncu = oyun.oyuncular.get(anahtar);
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

  const temiz = String(yeniIsim || '').trim().slice(0, 20);
  if (!temiz) return { hata: 'İsim boş olamaz.' };

  const yeniAnahtar = anahtarla(temiz);
  if (yeniAnahtar !== anahtar && oyun.oyuncular.has(yeniAnahtar)) {
    return { hata: 'Bu isim zaten kullanılıyor.' };
  }

  const eskiIsim = oyuncu.isim;
  if (yeniAnahtar !== anahtar) {
    // Anahtar değiştiği için tüm haritalarda yeniden anahtarla
    oyun.oyuncular.delete(anahtar);
    oyuncu.anahtar = yeniAnahtar;
    oyun.oyuncular.set(yeniAnahtar, oyuncu);
    for (const harita of [oyun.cevaplar, oyun.sonTurPuanlari]) {
      if (harita.has(anahtar)) {
        harita.set(yeniAnahtar, harita.get(anahtar));
        harita.delete(anahtar);
      }
    }
  }
  oyuncu.isim = temiz;

  // Ölçüm kayıtlarındaki isim anlık görüntüsü de güncellenir (kod hiç değişmez).
  for (const kayit of oyun.olcme.kayitlar) {
    if (kayit.anahtar === anahtar) {
      kayit.anahtar = oyuncu.anahtar;
      kayit.isim = temiz;
    }
  }

  console.log(`[düzenleme] "${eskiIsim}" → "${temiz}" olarak değiştirildi`);
  oyun.emit('degisti');
  return { tamam: true, oyuncu, eskiAnahtar: anahtar };
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
