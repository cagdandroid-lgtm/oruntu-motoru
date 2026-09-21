// Bireysel ilerleme: herkes kendi hızında ilerler (CLAUDE.md "İlerleme ve geçiş").
//
//  • Öğrenci kontrollü: cevaptan sonra geri bildirim ekranı öğrenci
//    "Sonraki soru ▶" diyene kadar kalır; otomatik geçiş YOKTUR.
//  • Pas geç: bir soruda PAS_SANIYE boyunca cevap veremeyen öğrenciye onaylı
//    "Pas geç" açılır — 0 puan, kayda sonuc="atlandi".
//  • Tavansız yol: kuyruğu bitiren beklemez; bir üst zorlukta yeni sorular alır,
//    en üst seviyede karışık sonsuz tur sürer. Yeni içerik YAZILMAZ; mevcut
//    havuz/üreteç kullanılır.
//  • Puan: doğru cevap 500 + hedef süreye göre azalan hız bonusu (en çok 500)
//    + ilk denemede doğruysa 100.
//
// Soru içeriğine ve doğrulama mantığına DOKUNMAZ (lib/modlar.js).

const icerik = require('./oruntu');
const modlar = require('./modlar');

const TEMEL_PUAN = 500;
const HIZ_BONUSU_TAVAN = 500;
const ILK_DENEME_BONUSU = 100;
const PAS_SANIYE = 60; // "Pas geç"in açıldığı süre (CLAUDE.md 90 sn yazar; öğretmen isteğiyle 60)
const UST_SEVIYE = 3;
// Tavansız yolda üst seviyeye geçmek için bitirilen blokta gereken doğruluk.
// Rastgele şık tıklayarak (≈%25) seviye atlanamasın diye.
const YUKSELME_ESIGI = 0.6;
// Sorunun hedef süresi (sn): bu sürede çözen tam hız bonusu alır.
const HEDEF_SURE = { 1: 20, 2: 25, 3: 30 };
// Kendi Örüntünü Kur kendi kademeli puanını verir (100/60/40/20); 500 ölçeğine taşınır.
const KENDI_OLCEK = 5;

const hedefSure = (soru) => HEDEF_SURE[Number(soru && soru.seviye)] || 25;

// Hız bonusu hedef süreye göre doğrusal azalır; süre aşılırsa 0.
function hizBonusu(sureSn, soru) {
  const oran = 1 - Math.max(0, Number(sureSn) || 0) / hedefSure(soru);
  return Math.max(0, Math.round(HIZ_BONUSU_TAVAN * oran));
}

// ---------------- Öğrencinin kendi kuyruğu ----------------

function durumKur(oyun, oyuncu) {
  oyuncu.ilerleme = {
    kuyruk: oyun.havuz.slice(), // ilk blok: öğretmenin başlattığı etkinlik
    temelUzunluk: oyun.havuz.length,
    indeks: 0,
    seviye: oyun.ayar.seviye,
    blok: 1,
    blokDogru: 0,
    blokCozulen: 0,
    cozulen: 0, // toplam cevaplanan + pas geçilen
    baslangic: Date.now(),
    cevapVerdi: false,
    pasGecti: false,
    deneme: 0,
  };
}

const soruAl = (oyuncu) => oyuncu.ilerleme.kuyruk[oyuncu.ilerleme.indeks] || null;
const tavansizMi = (oyuncu) => oyuncu.ilerleme.indeks >= oyuncu.ilerleme.temelUzunluk;

function baslat(oyun) {
  for (const o of oyun.oyuncular.values()) {
    durumKur(oyun, o);
    if (o.bagli) soruGonder(oyun, o);
  }
}

function soruGonder(oyun, oyuncu) {
  const ilerleme = oyuncu.ilerleme;
  let soru = soruAl(oyuncu);
  if (!soru) soru = tavansizGenislet(oyun, oyuncu);
  if (!soru) return; // hiç içerik kalmadı (ör. grubun içeriği yok)

  ilerleme.baslangic = Date.now();
  ilerleme.cevapVerdi = false;
  ilerleme.pasGecti = false;
  const sira = ilerleme.cozulen + 1;
  // Tavansız yolda toplam gösterilmez ("Soru 14"); seviye hiçbir biçimde gitmez.
  const toplam = tavansizMi(oyuncu) ? null : ilerleme.temelUzunluk;
  oyun.emit('bireyselSoru', {
    oyuncu,
    soru: { ...icerik.istemciIcin(soru, sira, toplam), pasSaniye: PAS_SANIYE, bireysel: true },
  });
}

// ---------------- Tavansız yol ----------------

// Kuyruk bitince yeni blok eklenir. Blok doğruluğu eşiği geçtiyse bir üst
// seviyeye çıkılır; en üst seviyede aynı seviyenin karışık blokları sonsuza dek sürer.
function tavansizGenislet(oyun, oyuncu) {
  const ilerleme = oyuncu.ilerleme;
  const dogruluk = ilerleme.blokCozulen ? ilerleme.blokDogru / ilerleme.blokCozulen : 0;
  const onceki = ilerleme.seviye;
  if (ilerleme.seviye < UST_SEVIYE && dogruluk >= YUKSELME_ESIGI) ilerleme.seviye++;

  const { havuz } = oyun._havuzKur(oyun.ayar.grup, ilerleme.seviye, oyun.ayar.modlar, true);
  if (!havuz.length) {
    console.log(`[bireysel] ${oyuncu.isim}: seviye ${ilerleme.seviye} için içerik yok`);
    return null;
  }
  ilerleme.kuyruk.push(...havuz);
  ilerleme.blok++;
  ilerleme.blokDogru = 0;
  ilerleme.blokCozulen = 0;

  const ne =
    ilerleme.seviye > onceki
      ? `bir üst seviye (${onceki} → ${ilerleme.seviye})`
      : ilerleme.seviye >= UST_SEVIYE
        ? 'en üst seviyede karışık sonsuz tur'
        : `aynı seviyede yeni blok (doğruluk %${Math.round(dogruluk * 100)} < %${YUKSELME_ESIGI * 100})`;
  console.log(`[bireysel] ${oyuncu.isim} kuyruğu bitirdi → ${ne}, ${havuz.length} yeni soru`);
  return soruAl(oyuncu);
}

// Geç katılan / yeniden bağlanan öğrenci kaldığı yerden devam eder.
function yenidenBagland(oyun, oyuncu) {
  if (!oyuncu.ilerleme) durumKur(oyun, oyuncu);
  const ilerleme = oyuncu.ilerleme;
  // Cevabı verip "Sonraki"ye basmadan koptuysa sıradaki soruya geçirilir
  if (ilerleme.cevapVerdi || ilerleme.pasGecti) return ilerlet(oyun, oyuncu);
  soruGonder(oyun, oyuncu);
}

// ---------------- Cevap ----------------

function cevapVer(oyun, oyuncu, secim) {
  if (!oyuncu.ilerleme) durumKur(oyun, oyuncu);
  const ilerleme = oyuncu.ilerleme;
  if (ilerleme.cevapVerdi || ilerleme.pasGecti) return { hata: 'Bu soru için cevabın alındı.' };

  const soru = soruAl(oyuncu);
  if (!soru) return { hata: 'Şu an cevap alınmıyor.' };

  const sonucVeri = modlar.dogrula(soru, secim);
  if (!sonucVeri.gecerli) return { hata: sonucVeri.hata };

  ilerleme.cevapVerdi = true;
  ilerleme.deneme += 1;
  const sureSn = Math.max(0, Date.now() - ilerleme.baslangic) / 1000;
  const dogruMu = sonucVeri.dogruMu;

  let kazanilan = 0;
  if (typeof sonucVeri.puan === 'number') {
    kazanilan = sonucVeri.puan * KENDI_OLCEK;
    if (dogruMu) kazanilan += hizBonusu(sureSn, soru) + ILK_DENEME_BONUSU;
  } else if (dogruMu) {
    kazanilan = TEMEL_PUAN + hizBonusu(sureSn, soru);
    if (ilerleme.deneme === 1) kazanilan += ILK_DENEME_BONUSU;
  }

  oyuncu.skor += kazanilan;
  if (dogruMu) {
    oyuncu.dogruSayisi++;
    ilerleme.blokDogru++;
  }
  ilerleme.blokCozulen++;
  ilerleme.cozulen++;

  oyun.olcme.ekle({
    soru: sonucVeri.kategori ? { ...soru, tur: sonucVeri.kategori } : soru,
    ayar: oyun.ayar,
    oyuncu,
    sonuc: dogruMu ? 'dogru' : 'yanlis',
    sureSn,
    deneme: ilerleme.deneme,
    ipucu: false,
    turNo: ilerleme.cozulen, // bireysel modda tur = öğrencinin kaçıncı sorusu
  });

  console.log(
    `[bireysel] ${oyuncu.isim} ${ilerleme.cozulen}. soru → ` +
      `${dogruMu ? 'doğru' : 'yanlış'} (+${kazanilan}, ${sureSn.toFixed(1)} sn)`
  );

  // Kişisel açıklama YALNIZ bu öğrenciye gider (başkasına cevap sızmaz).
  // Ekran öğrenci "Sonraki soru ▶" diyene kadar kalır.
  oyun.emit('bireyselSonuc', {
    oyuncu,
    sonuc: icerik.cevapAcikla(soru),
    benim: { dogruMu, kazanilan, ayrinti: sonucVeri.ayrinti || null },
  });
  oyun.emit('cevapGeldi');
  return { tamam: true, dogruMu, kazanilan, ayrinti: sonucVeri.ayrinti || null };
}

// ---------------- Öğrenci kontrollü ilerleme ----------------

// "Sonraki soru ▶" — yalnız cevap verildikten ya da pas geçildikten sonra.
function ogrenciSonraki(oyun, oyuncu) {
  const ilerleme = oyuncu.ilerleme;
  if (!ilerleme) return { hata: 'Önce etkinliğe katıl.' };
  if (oyun.durum === 'duraklatildi') return { hata: '⏸ Öğretmeninizi dinleyin.' };
  if (!ilerleme.cevapVerdi && !ilerleme.pasGecti) {
    return { hata: 'Önce bu soruyu cevapla (takılırsan bir süre sonra “Pas geç” açılır).' };
  }
  ilerlet(oyun, oyuncu);
  return { tamam: true };
}

function ilerlet(oyun, oyuncu) {
  oyuncu.ilerleme.indeks++;
  oyuncu.ilerleme.deneme = 0;
  soruGonder(oyun, oyuncu);
  oyun.emit('degisti');
}

// "Pas geç" — onaylı, 0 puan, kayda sonuc="atlandi". Süre SUNUCUDA ölçülür;
// istemci düğmeyi erken açsa bile istek reddedilir.
function pasGec(oyun, oyuncu) {
  const ilerleme = oyuncu.ilerleme;
  if (!ilerleme) return { hata: 'Önce etkinliğe katıl.' };
  if (oyun.durum === 'duraklatildi') return { hata: '⏸ Öğretmeninizi dinleyin.' };
  if (ilerleme.cevapVerdi || ilerleme.pasGecti) return { hata: 'Bu soru zaten tamamlandı.' };
  const gecen = (Date.now() - ilerleme.baslangic) / 1000;
  if (gecen < PAS_SANIYE) {
    return { hata: `Pas geçmek için ${Math.ceil(PAS_SANIYE - gecen)} sn daha dene.` };
  }

  const soru = soruAl(oyuncu);
  ilerleme.pasGecti = true;
  ilerleme.blokCozulen++; // pas, doğruluk hesabında doğru sayılmaz
  ilerleme.cozulen++;
  oyun.olcme.ekle({
    soru,
    ayar: oyun.ayar,
    oyuncu,
    sonuc: 'atlandi',
    sureSn: gecen,
    deneme: 0,
    ipucu: false,
    turNo: ilerleme.cozulen,
  });
  console.log(`[bireysel] ${oyuncu.isim} ${ilerleme.cozulen}. soruyu pas geçti (${gecen.toFixed(0)} sn, 0 puan)`);

  oyun.emit('bireyselSonuc', {
    oyuncu,
    sonuc: icerik.cevapAcikla(soru),
    benim: { dogruMu: false, kazanilan: 0, pas: true },
  });
  oyun.emit('cevapGeldi');
  return { tamam: true, kazanilan: 0 };
}

// ---------------- Kapanış ----------------

function kisiselOzet(oyuncu) {
  const cozulen = oyuncu.ilerleme ? oyuncu.ilerleme.cozulen : 0;
  const dogru = oyuncu.dogruSayisi;
  return {
    skor: oyuncu.skor,
    dogru,
    toplam: cozulen,
    dogruluk: cozulen ? Math.round((dogru / cozulen) * 100) : 0,
  };
}

// Kapanış rozetleri: puandan bağımsız onur ödülleri
function rozetler(oyun) {
  const liste = [...oyun.oyuncular.values()].filter((o) => o.ilerleme && o.ilerleme.cozulen);
  if (!liste.length) return [];

  const enYuksek = liste.reduce((a, b) => (b.skor > a.skor ? b : a));
  const oranli = liste
    .map((o) => ({ o, oran: o.dogruSayisi / o.ilerleme.cozulen }))
    .filter((x) => x.o.dogruSayisi > 0);
  const enIsabetli = oranli.length ? oranli.reduce((a, b) => (b.oran > a.oran ? b : a)) : null;

  const cikti = [];
  if (enYuksek.skor > 0) {
    cikti.push({ rozet: '🏆 En Yüksek Puan', isim: enYuksek.isim, deger: `${enYuksek.skor} puan` });
  }
  if (enIsabetli) {
    cikti.push({
      rozet: '🎯 En İsabetli',
      isim: enIsabetli.o.isim,
      deger: `%${Math.round(enIsabetli.oran * 100)} doğruluk`,
    });
  }
  return cikti;
}

// Öğrenciden gelen ilerleme isteklerinin ortak kapısı: senkron modda REDDEDİLİR
// (tur öğretmenindir), etkinlik yokken de reddedilir.
function istek(oyun, oyuncu, isleyici) {
  if (!oyuncu) return { hata: 'Önce oyuna katılmalısın.' };
  if (!oyun.bireyselMi) return { hata: 'Bu turda soruları öğretmenin ilerletiyor.' };
  if (oyun.durum !== 'oynaniyor' && oyun.durum !== 'duraklatildi') return { hata: 'Şu an etkinlik yok.' };
  return isleyici(oyun, oyuncu);
}

function oyuncununSorusu(oyun, oyuncu) {
  if (!oyun.bireyselMi || !oyuncu || !oyuncu.ilerleme) return null;
  return soruAl(oyuncu);
}

// Öğretmen "✅ Turu Bitir" dediğinde: SONUÇ + herkese kişisel özet ve rozetler
function kapanis(oyun) {
  if (oyun.durum === 'bitti') return;
  oyun.durum = 'bitti';
  console.log('[oyun] bireysel etkinlik öğretmen tarafından bitirildi');
  const r = rozetler(oyun);
  for (const o of oyun.oyuncular.values()) {
    oyun.emit('bireyselTamam', { oyuncu: o, ozet: kisiselOzet(o), rozetler: r });
  }
  oyun.emit('oyunBitti', oyun.skorTablosu());
}

// Eski sürümle uyum: artık zamanlayıcı yok, çağrı zararsız
function temizle() {}

module.exports = {
  istek,
  oyuncununSorusu,
  kapanis,
  baslat,
  cevapVer,
  ogrenciSonraki,
  pasGec,
  yenidenBagland,
  rozetler,
  kisiselOzet,
  temizle,
  tavansizMi,
  hizBonusu,
  hedefSure,
  TEMEL_PUAN,
  ILK_DENEME_BONUSU,
  PAS_SANIYE,
  YUKSELME_ESIGI,
};
