// Sınıf oturumu ve katılım: öğretmenin açtığı grup oturumu, öğrenci giriş
// kartları ve isim kilidi. Oyun mekaniği (tur akışı, cevap doğrulama)
// lib/oyun.js içinde kalır; Oyun sınıfı buradaki işlevleri çağırır.

const liste = require('./liste');
const gruplar = require('./gruplar');
const asama = require('./asama');

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
  const oyuncu = oyun.oyuncular.get(gruplar.kodNormalize(kod));
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
// beklemeli=false: pasifleştirme/grup değişimi gibi yönetimsel indirmelerde
// geri dönüş beklemesi konmaz (öğrenci zaten giriş listesinde görünmez).
function sahnedenCikar(oyun, kod, { beklemeli = true } = {}) {
  const k = gruplar.kodNormalize(kod);
  const oyuncu = oyun.oyuncular.get(k);
  if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

  const eskiSoket = oyuncu.socketId;
  oyun.oyuncular.delete(k);
  oyun.cevaplar.delete(k);
  if (beklemeli) atilanlar.set(k, Date.now() + ATMA_BEKLEMESI);

  console.log(
    `[katılım] ${oyuncu.isim} (${k}) sahneden çıkarıldı` +
      (beklemeli ? ` — ${ATMA_BEKLEMESI / 1000} sn geri giremez` : ' — listede artık görünmüyor')
  );
  oyun.emit('degisti');
  return { tamam: true, eskiSoket, isim: oyuncu.isim };
}

// Giriş ekranı paketi: yalnız AKTİF grubun kartları + kilit durumu.
// Başka grupların isimleri ya da sayısı bu pakette bulunmaz.
function girisPaketi(oyun) {
  if (!oyun.oturum.acik) return { acik: false, kartlar: [] };
  return {
    acik: true,
    // Pasif öğrenci (aktif:false) giriş ekranında ASLA görünmez
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

// Öğretmen etiketi tırnak içinde yazmış olabilir ("2. Ders" ya da “2. Ders”).
// Dış tırnaklar atılır (panel ve loglarda iç içe tırnak oluşmasın); içteki
// tırnaklar korunur. Kontrol karakterleri silinir, boşluklar sadeleşir.
const DIS_TIRNAK = /^[\s"'“”‘’«»„‚`]+|[\s"'“”‘’«»„‚`]+$/g;
function etiketiTemizle(etiket) {
  return String(etiket || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(DIS_TIRNAK, '')
    .trim()
    .slice(0, 60);
}

// Öğretmen grup/etkinlik seçer → bekleyen öğrenci ekranları o grubun
// isim kartlarına kendiliğinden döner (yenileme gerekmez).
function oturumAc(oyun, grup, etiket) {
  const g = gruplar.normalize(grup); // eski "i"/"c" isteği "u" olarak açılır
  if (!gruplar.gecerliMi(g)) return { hata: 'Geçersiz grup.' };
  // Grup seçimi yalnız BOŞTA ve LOBİ'de; oyun başladıysa önce etkinlik bitirilir
  if (!asama.secimAcikMi(oyun)) {
    return { hata: 'Etkinlik sürüyor. Grup değiştirmek için “⏹ Etkinliği Bitir”.' };
  }
  // Ders etiketi serbest metindir ("2. Ders · 12 Eylül"); kayıtlara ve
  // karne başlığına yazılır.
  const dersEtiketi = etiketiTemizle(etiket);

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
      (dersEtiketi ? ` · ders etiketi → ${dersEtiketi}` : ' · ders etiketi yok')
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
  etiketiTemizle,
};
