// Sınıf oturumu ve katılım: öğretmenin açtığı grup oturumu, öğrenci giriş
// kartları ve isim kilidi. Oyun mekaniği (tur akışı, cevap doğrulama)
// lib/oyun.js içinde kalır; Oyun sınıfı buradaki işlevleri çağırır.

const liste = require('./liste');

// Oyuncu kimliği KALICI ÖĞRENCİ KODUDUR (E-07 gibi); isim değişse de sabit kalır.
const jetonUret = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Sınıf oturumu modeli: öğrenci isim YAZMAZ, listedeki kendi kartına dokunur.
function katil(oyun, { kod, jeton }, socketId) {
  if (!oyun.oturum.acik) return { hata: 'Öğretmenin oturumu açmasını bekle.' };

  const kayit = liste.bul(kod);
  if (!kayit) return { hata: 'Bu isim listede yok. Öğretmenine söyle.' };
  if (!kayit.aktif) return { hata: 'Bu kayıt pasif. Öğretmenine söyle.' };
  // Oturum TEK gruba aittir: başka grubun öğrencisi sahneye alınmaz.
  if (kayit.grup !== oyun.oturum.grup) {
    console.log(`[katılım] ⚠ farklı grup reddedildi — ${kayit.kod} (${kayit.grup}) / oturum: ${oyun.oturum.grup}`);
    return { hata: 'Bu oturum senin grubun için değil. Öğretmenine söyle.' };
  }

  let oyuncu = oyun.oyuncular.get(kayit.kod);

  if (oyuncu) {
    // Kilitli kartı yalnız kartın sahibi (kendi tarayıcı jetonu) geri alabilir
    if (oyuncu.kilitli && oyuncu.jeton !== jeton) {
      console.log(`[katılım] ⛔ kilitli isim denendi — ${kayit.kod} ${kayit.isim}`);
      return { hata: 'Bu isim şu anda oyunda. Öğretmenine söyle, seni serbest bıraksın.' };
    }
    oyuncu.socketId = socketId;
    oyuncu.bagli = true;
    oyuncu.kilitli = true;
    oyuncu.isim = kayit.isim; // panelden ismi düzeltildiyse yansısın
    console.log(`[katılım] ${oyuncu.isim} (${oyuncu.kod}) geri döndü — skor: ${oyuncu.skor}`);
  } else {
    oyuncu = {
      anahtar: kayit.kod, // ölçüm kayıtları ve panel bu kimliği kullanır
      kod: kayit.kod,
      isim: kayit.isim,
      grup: kayit.grup,
      misafir: !!kayit.misafir,
      jeton: jeton || jetonUret(),
      skor: 0,
      dogruSayisi: 0,
      socketId,
      bagli: true,
      kilitli: true,
    };
    oyun.oyuncular.set(kayit.kod, oyuncu);
    console.log(`[katılım] ${oyuncu.isim} (${oyuncu.kod}) oyuna katıldı`);
  }
  oyun.emit('degisti');
  return { oyuncu };
}

// Öğretmen bir ismi serbest bırakır: kart yeniden seçilebilir olur.
// Puan ve ölçüm kayıtları KORUNUR — aynı kodla dönen kaldığı yerden devam eder.
function serbestBirak(oyun, kod) {
  const oyuncu = oyun.oyuncular.get(String(kod || '').toUpperCase());
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };
  oyuncu.kilitli = false;
  oyuncu.bagli = false;
  oyuncu.jeton = jetonUret(); // eski sekme kendiliğinden geri giremesin
  const eskiSoket = oyuncu.socketId;
  oyuncu.socketId = null;
  console.log(`[katılım] ${oyuncu.isim} (${oyuncu.kod}) serbest bırakıldı`);
  oyun.emit('degisti');
  return { tamam: true, eskiSoket };
}

// Giriş ekranı paketi: yalnız AKTİF grubun kartları + kilit durumu.
// Başka grupların isimleri ya da sayısı bu pakette bulunmaz.
function girisPaketi(oyun) {
  if (!oyun.oturum.acik) return { acik: false, kartlar: [] };
  return {
    acik: true,
    kartlar: liste.grupKartlari(oyun.oturum.grup).map((k) => {
      const o = oyun.oyuncular.get(k.kod);
      return { kod: k.kod, isim: k.isim, misafir: k.misafir, oyunda: !!(o && o.kilitli) };
    }),
  };
}

// Öğretmen grup/etkinlik seçer → bekleyen öğrenci ekranları o grubun
// isim kartlarına kendiliğinden döner (yenileme gerekmez).
function oturumAc(oyun, grup) {
  const g = String(grup || '').toLowerCase();
  if (!liste.GRUPLAR.includes(g)) return { hata: 'Geçersiz grup.' };

  const dusenSoketler = [];
  if (oyun.oturum.acik && oyun.oturum.grup !== g) {
    // Grup değişiyorsa önceki grubun oyuncuları sahneden iner ve
    // ekranları kendiliğinden yeni grubun giriş ekranına döner
    for (const o of oyun.oyuncular.values()) if (o.socketId) dusenSoketler.push(o.socketId);
    oyun.oyuncular.clear();
    oyun._sayaciDurdur();
    oyun.durum = 'bekliyor';
    oyun.havuz = [];
    oyun.soruIndeksi = -1;
    oyun.soru = null;
    console.log(`[oturum] grup değişti (${oyun.oturum.grup} → ${g}) — sahne temizlendi`);
  }
  oyun.oturum = { acik: true, grup: g };
  oyun.ayar = { ...oyun.ayar, grup: g };
  console.log(`[oturum] açıldı — ${g} grubu (${liste.grupKartlari(g).length} aktif öğrenci)`);
  oyun.emit('degisti');
  return { tamam: true, grup: g, dusenSoketler };
}

function oturumKapat(oyun) {
  oyun.oturum = { acik: false, grup: null };
  console.log('[oturum] kapatıldı — öğrenci ekranları bekleme moduna döndü');
  oyun.emit('degisti');
  return { tamam: true };
}

module.exports = { katil, serbestBirak, girisPaketi, oturumAc, oturumKapat, jetonUret };
