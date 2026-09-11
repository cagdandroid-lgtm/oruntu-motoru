// Sınıf oturumu ve katılım: öğretmenin açtığı grup oturumu, öğrenci giriş
// kartları ve isim kilidi. Oyun mekaniği (tur akışı, cevap doğrulama)
// lib/oyun.js içinde kalır; Oyun sınıfı buradaki işlevleri çağırır.

const liste = require('./liste');

// Atılan öğrenci kısa süre aynı isimle geri giremez (yanlışlıkla hemen
// geri dönmesin diye); süre dolunca kart yeniden seçilebilir olur.
const ATMA_BEKLEMESI = 45 * 1000;
const atilanlar = new Map(); // kod -> ne zaman serbest kalacağı (ms)

const atmaBeklemesiVarMi = (kod) => {
  const bitis = atilanlar.get(kod);
  if (!bitis) return 0;
  const kalan = bitis - Date.now();
  if (kalan <= 0) {
    atilanlar.delete(kod);
    return 0;
  }
  return Math.ceil(kalan / 1000);
};

// Oyuncu kimliği KALICI ÖĞRENCİ KODUDUR (E-07 gibi); isim değişse de sabit kalır.
const jetonUret = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Sınıf oturumu modeli: öğrenci isim YAZMAZ, listedeki kendi kartına dokunur.
function katil(oyun, { kod, jeton }, socketId) {
  if (!oyun.oturum.acik) return { hata: 'Öğretmenin oturumu açmasını bekle.' };

  const kayit = liste.bul(kod);
  if (!kayit) return { hata: 'Bu isim listede yok. Öğretmenine söyle.' };
  if (!kayit.aktif) return { hata: 'Bu kayıt pasif. Öğretmenine söyle.' };

  const bekleme = atmaBeklemesiVarMi(kayit.kod);
  if (bekleme) return { hata: `Öğretmenin seni oyundan çıkardı. ${bekleme} saniye sonra yeniden girebilirsin.` };

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

// Öğretmen bir öğrenciyi sahneden ÇIKARIR: oyuncu tümüyle silinir, puanı
// düşer ve kısa bir süre aynı isimle geri giremez. Ölçüm kayıtları
// (kod bazlı olduğu için) silinmez — ders verisi korunur.
function sahnedenCikar(oyun, kod) {
  const k = String(kod || '').toUpperCase();
  const oyuncu = oyun.oyuncular.get(k);
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

  const eskiSoket = oyuncu.socketId;
  oyun.oyuncular.delete(k);
  oyun.cevaplar.delete(k);
  atilanlar.set(k, Date.now() + ATMA_BEKLEMESI);

  console.log(`[katılım] ${oyuncu.isim} (${k}) sahneden çıkarıldı — ${ATMA_BEKLEMESI / 1000} sn geri giremez`);
  oyun.emit('degisti');
  return { tamam: true, eskiSoket, isim: oyuncu.isim };
}

// Giriş ekranı paketi: yalnız AKTİF grubun kartları + kilit durumu.
// Başka grupların isimleri ya da sayısı bu pakette bulunmaz.
function girisPaketi(oyun) {
  if (!oyun.oturum.acik) return { acik: false, kartlar: [] };
  return {
    acik: true,
    kartlar: liste.grupKartlari(oyun.oturum.grup).map((k) => {
      const o = oyun.oyuncular.get(k.kod);
      const bekleme = atmaBeklemesiVarMi(k.kod);
      return {
        kod: k.kod,
        isim: k.isim,
        misafir: k.misafir,
        oyunda: !!(o && o.kilitli),
        bekleme, // atılan öğrencinin kartı bu saniye kadar kapalı kalır
      };
    }),
  };
}

// Öğretmen grup/etkinlik seçer → bekleyen öğrenci ekranları o grubun
// isim kartlarına kendiliğinden döner (yenileme gerekmez).
function oturumAc(oyun, grup, etiket) {
  const g = String(grup || '').toLowerCase();
  if (!liste.GRUPLAR.includes(g)) return { hata: 'Geçersiz grup.' };
  // Ders etiketi serbest metindir ("2. Ders · 12 Eylül"); kayıtlara ve
  // karne başlığına birebir yazılır.
  const dersEtiketi = String(etiket || '').trim().slice(0, 60);

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
  oyun.oturum = { acik: true, grup: g, dersEtiketi };
  oyun.ayar = { ...oyun.ayar, grup: g, dersEtiketi };
  console.log(
    `[oturum] açıldı — ${g} grubu (${liste.grupKartlari(g).length} aktif öğrenci)` +
      (dersEtiketi ? ` · ders: "${dersEtiketi}"` : ' · ders etiketi yok')
  );
  oyun.emit('degisti');
  return { tamam: true, grup: g, dersEtiketi, dusenSoketler };
}

function oturumKapat(oyun) {
  oyun.oturum = { acik: false, grup: null, dersEtiketi: '' };
  console.log('[oturum] kapatıldı — öğrenci ekranları bekleme moduna döndü');
  oyun.emit('degisti');
  return { tamam: true };
}

module.exports = {
  katil,
  serbestBirak,
  sahnedenCikar,
  girisPaketi,
  oturumAc,
  oturumKapat,
  jetonUret,
  ATMA_BEKLEMESI,
};
