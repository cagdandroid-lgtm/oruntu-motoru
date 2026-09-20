// Bireysel ilerleme: herkes kendi hızında ilerler. Bitiren beklemez,
// sıradaki soruya geçer; hiçbir öğrenci bekleme ekranında kalmaz.
//
// Puanlama (CLAUDE.md): doğru cevap 500 + hedef süreye göre azalan hız
// bonusu (en çok 500) + ilk denemede doğruysa 100.
//
// Soru içeriğine ve doğrulama mantığına DOKUNMAZ; onlar lib/modlar.js'te.

const icerik = require('./oruntu');
const modlar = require('./modlar');

const TEMEL_PUAN = 500;
const HIZ_BONUSU_TAVAN = 500;
const ILK_DENEME_BONUSU = 100;
const ARA_SANIYE = 3; // cevap açıklandıktan sonra sıradaki soruya geçiş
// Sorunun hedef süresi (sn): bu sürede çözen tam hız bonusu alır.
const HEDEF_SURE = { 1: 20, 2: 25, 3: 30 };

const hedefSure = (soru) => HEDEF_SURE[Number(soru && soru.seviye)] || 25;

// Hız bonusu hedef süreye göre doğrusal azalır; süre aşılırsa 0.
function hizBonusu(sureSn, soru) {
  const hedef = hedefSure(soru);
  const oran = 1 - Math.max(0, Number(sureSn) || 0) / hedef;
  return Math.max(0, Math.round(HIZ_BONUSU_TAVAN * oran));
}

// Kendi Örüntünü Kur kendi kademeli puanını verir (100/60/40/20);
// bireysel ölçek 500 tabanlı olduğu için beşle çarpılır.
const KENDI_OLCEK = 5;

function durumKur(oyuncu) {
  oyuncu.ilerleme = { indeks: 0, baslangic: Date.now(), cevapVerdi: false, bitti: false, deneme: 0 };
}

// Tur başlarken: bağlı her öğrenciye kendi ilk sorusu gider.
function baslat(oyun) {
  for (const o of oyun.oyuncular.values()) {
    durumKur(o);
    if (o.bagli) soruGonder(oyun, o);
  }
}

const soruAl = (oyun, oyuncu) => oyun.havuz[oyuncu.ilerleme.indeks] || null;

function soruGonder(oyun, oyuncu) {
  const soru = soruAl(oyun, oyuncu);
  if (!soru) return bitir(oyun, oyuncu);
  oyuncu.ilerleme.baslangic = Date.now();
  oyuncu.ilerleme.cevapVerdi = false;
  oyun.emit('bireyselSoru', {
    oyuncu,
    soru: icerik.istemciIcin(soru, oyuncu.ilerleme.indeks + 1, oyun.havuz.length),
  });
}

// Geç katılan / yeniden bağlanan öğrenci kaldığı sorudan devam eder.
function yenidenBagland(oyun, oyuncu) {
  if (!oyuncu.ilerleme) durumKur(oyuncu);
  if (oyuncu.ilerleme.bitti) return ozetGonder(oyun, oyuncu);
  soruGonder(oyun, oyuncu);
}

function cevapVer(oyun, oyuncu, secim) {
  if (!oyuncu.ilerleme) durumKur(oyuncu);
  const ilerleme = oyuncu.ilerleme;
  if (ilerleme.bitti) return { hata: 'Etkinliği bitirdin, tebrikler! 🎉' };
  if (ilerleme.cevapVerdi) return { hata: 'Bu soru için cevabın alındı.' };

  const soru = soruAl(oyun, oyuncu);
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
  if (dogruMu) oyuncu.dogruSayisi++;

  oyun.olcme.ekle({
    soru: sonucVeri.kategori ? { ...soru, tur: sonucVeri.kategori } : soru,
    ayar: oyun.ayar,
    oyuncu,
    sonuc: dogruMu ? 'dogru' : 'yanlis',
    sureSn,
    deneme: ilerleme.deneme,
    ipucu: false,
    turNo: ilerleme.indeks + 1, // bireysel modda tur = sorunun sırası
  });

  console.log(
    `[bireysel] ${oyuncu.isim} ${ilerleme.indeks + 1}/${oyun.havuz.length} → ` +
      `${dogruMu ? 'doğru' : 'yanlış'} (+${kazanilan}, ${sureSn.toFixed(1)} sn)`
  );

  // Kişisel açıklama YALNIZ bu öğrenciye gider (başkasına cevap sızmaz)
  oyun.emit('bireyselSonuc', {
    oyuncu,
    sonuc: icerik.cevapAcikla(soru),
    benim: { dogruMu, kazanilan, ayrinti: sonucVeri.ayrinti || null },
    sonSoruMu: ilerleme.indeks >= oyun.havuz.length - 1,
  });
  oyun.emit('cevapGeldi');

  // Kısa açıklama arası, sonra kendi sıradaki sorusu — kimse beklemez
  ilerleme.zamanlayici = setTimeout(() => {
    ilerleme.zamanlayici = null;
    sonraki(oyun, oyuncu);
  }, ARA_SANIYE * 1000);

  return { tamam: true, dogruMu, kazanilan, ayrinti: sonucVeri.ayrinti || null };
}

function sonraki(oyun, oyuncu) {
  if (!oyuncu.ilerleme || oyuncu.ilerleme.bitti) return;
  // Öğretmen duraklattıysa sıradaki soru gönderilmez; devam edince gönderilir
  if (oyun.durum !== 'oynaniyor') {
    oyuncu.ilerleme.bekliyor = true;
    return;
  }
  oyuncu.ilerleme.indeks++;
  oyuncu.ilerleme.deneme = 0;
  if (oyuncu.ilerleme.indeks >= oyun.havuz.length) return bitir(oyun, oyuncu);
  soruGonder(oyun, oyuncu);
  oyun.emit('degisti');
}

function bitir(oyun, oyuncu) {
  oyuncu.ilerleme.bitti = true;
  console.log(`[bireysel] ${oyuncu.isim} etkinliği bitirdi — ${oyuncu.skor} puan`);
  ozetGonder(oyun, oyuncu);
  if (hepsiBittiMi(oyun)) oyun.emit('bireyselHepsiBitti');
  else oyun.emit('degisti');
}

const hepsiBittiMi = (oyun) =>
  [...oyun.oyuncular.values()].every((o) => o.ilerleme && o.ilerleme.bitti);

function ozetGonder(oyun, oyuncu) {
  oyun.emit('bireyselTamam', { oyuncu, ozet: kisiselOzet(oyun, oyuncu) });
}

function kisiselOzet(oyun, oyuncu) {
  const toplam = oyun.havuz.length;
  const dogru = oyuncu.dogruSayisi;
  return {
    skor: oyuncu.skor,
    dogru,
    toplam,
    dogruluk: toplam ? Math.round((dogru / toplam) * 100) : 0,
  };
}

// Kapanış rozetleri: puandan bağımsız onur ödülleri
function rozetler(oyun) {
  const liste = [...oyun.oyuncular.values()].filter((o) => o.ilerleme);
  if (!liste.length) return [];

  const enYuksek = liste.reduce((a, b) => (b.skor > a.skor ? b : a));
  const dogrulukla = liste
    .map((o) => ({ o, oran: o.ilerleme.indeks ? o.dogruSayisi / o.ilerleme.indeks : 0 }))
    .filter((x) => x.o.dogruSayisi > 0);
  const enIsabetli = dogrulukla.length
    ? dogrulukla.reduce((a, b) => (b.oran > a.oran ? b : a))
    : null;

  const cikti = [];
  if (enYuksek.skor > 0) cikti.push({ rozet: '🏆 En Yüksek Puan', isim: enYuksek.isim, deger: `${enYuksek.skor} puan` });
  if (enIsabetli) {
    cikti.push({
      rozet: '🎯 En İsabetli',
      isim: enIsabetli.o.isim,
      deger: `%${Math.round(enIsabetli.oran * 100)} doğruluk`,
    });
  }
  return cikti;
}

// Sahneden inen / çıkarılan öğrencinin zamanlayıcısı kalmasın
function temizle(oyuncu) {
  if (oyuncu && oyuncu.ilerleme && oyuncu.ilerleme.zamanlayici) {
    clearTimeout(oyuncu.ilerleme.zamanlayici);
    oyuncu.ilerleme.zamanlayici = null;
  }
}

module.exports = {
  baslat,
  cevapVer,
  yenidenBagland,
  sonraki,
  rozetler,
  kisiselOzet,
  temizle,
  hepsiBittiMi,
  hizBonusu,
  hedefSure,
  TEMEL_PUAN,
  ILK_DENEME_BONUSU,
  ARA_SANIYE,
};
