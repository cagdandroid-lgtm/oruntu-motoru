// Mod kayıt defteri: yedi oyun modunun tanımı, havuz kurulumu, cevap
// doğrulaması ve istemciye giden güvenli paket biçimi tek yerde.
//
// Mevcut üç mod (surdur / eksik / kural) davranışını BİREBİR korur; yeni
// dört mod buraya eklenir. Cevap bilgisi istemciye asla sızmaz.

const uret = require('./mod-uret');
const kendiKural = require('./kendi-kural');
const { chcKodu } = require('./chc');

const TEMEL_PUAN = 100;

// senkron:false olan mod bireyseldir — herkes kendi hızında çalışır,
// bu yüzden öğretmenin "soru atlama" denetimleri o modda GİZLENİR.
const MODLAR = {
  surdur: { ad: 'Örüntüyü Sürdür', emoji: '➡️', senkron: true, uretilmis: false },
  eksik: { ad: 'Eksiği Bul', emoji: '🕳️', senkron: true, uretilmis: false },
  kural: { ad: 'Kuralı Yakala', emoji: '🔍', senkron: true, uretilmis: false },
  hata: { ad: 'Hatayı Bul', emoji: '🐞', senkron: true, uretilmis: true },
  tersine: { ad: 'Tersine Örüntü', emoji: '⏪', senkron: true, uretilmis: true },
  uzak: { ad: 'Uzak Terim', emoji: '🔭', senkron: true, uretilmis: true },
  kendi: { ad: 'Kendi Örüntünü Kur', emoji: '🎨', senkron: false, uretilmis: true },
};

const ADLAR = Object.keys(MODLAR);
const gecerliMod = (m) => ADLAR.includes(m);
const senkronMu = (m) => !!(MODLAR[m] && MODLAR[m].senkron);

const HAVUZ_ADEDI = 12; // üretilmiş modlarda tur başına soru sayısı
const KENDI_ADEDI = 8;

// ---------------- Havuz kurulumu ----------------

// temelKayitlar: patterns.json'dan gelen, o grup/seviyenin "surdur" kayıtları
// (Hatayı Bul bunların tam dizilerini bozarak soru üretir).
function havuzKur(mod, grup, seviye, temelKayitlar) {
  switch (mod) {
    case 'tersine':
      return Array.from({ length: HAVUZ_ADEDI }, (_, i) => uret.tersineUret(grup, seviye, i + 1));
    case 'uzak':
      return Array.from({ length: HAVUZ_ADEDI }, (_, i) => uret.uzakUret(grup, seviye, i + 1));
    case 'hata': {
      if (!temelKayitlar.length) return [];
      return Array.from({ length: HAVUZ_ADEDI }, (_, i) =>
        uret.hataUret(temelKayitlar[i % temelKayitlar.length], i + 1)
      );
    }
    case 'kendi':
      return Array.from({ length: KENDI_ADEDI }, (_, i) => ({
        id: `kendi-${grup}${seviye}-${i + 1}`,
        grup,
        tur: 'kendi-oruntu',
        seviye,
        mod: 'kendi',
        uretilmis: true,
        dizi: [],
        gizliIndeks: -1,
        secenekler: [],
        kural: 'öğrencinin kendi kuralı',
        aciklama: 'Kendi örüntünü kur; motor kuralını tahmin edip sürdürsün.',
        chc: chcKodu('kendi'),
      }));
    default:
      return null; // patterns.json'dan gelir
  }
}

// ---------------- Doğru cevap (yalnız sunucuda) ----------------

function dogruCevap(soru) {
  switch (soru.mod) {
    case 'kural':
      return soru.kural;
    case 'uzak':
      return soru.kural; // hedef terimin değeri
    case 'tersine':
      return soru.dizi[0]; // başlangıç terimi
    case 'hata':
      return soru.bozukIndeks === -1 ? uret.HATA_YOK : String(soru.bozukIndeks);
    case 'kendi':
      return null; // değerlendirme diziye göre yapılır
    default:
      return soru.dizi[soru.gizliIndeks];
  }
}

// ---------------- İstemciye giden güvenli paket ----------------

function istemciIcin(soru, sira, toplam, karistir) {
  // Zorluk gizliliği: seviye ve seviyeyi kodlayan soru kimliği (ör. "i3-s04")
  // öğrenciye GİTMEZ; tarayıcı konsolundan bile zorluk okunamaz.
  const ortak = {
    tur: soru.tur,
    mod: soru.mod,
    sira,
    toplam,
  };

  switch (soru.mod) {
    case 'tersine':
      // YALNIZ kural ve son terim görünür; aradaki terimler boş kutu kalır.
      return {
        ...ortak,
        dizi: soru.dizi.map((h, i) => (i === soru.dizi.length - 1 ? h : null)),
        gizliIndeks: 0,
        adimSayisi: soru.adimSayisi,
        kuralEtiketi: soru.kuralEtiketi,
        secenekler: karistir(soru.secenekler),
      };

    case 'uzak':
      // İlk dört terim görünür; hangi terimin sorulduğu söylenir.
      return {
        ...ortak,
        dizi: soru.dizi.slice(),
        gizliIndeks: -1,
        hedefTerim: soru.hedefTerim,
        secenekler: karistir(soru.secenekler),
      };

    case 'hata':
      // Bozuk dizi olduğu gibi gider; hangi hücrenin bozuk olduğu GİTMEZ.
      return {
        ...ortak,
        dizi: soru.dizi.slice(),
        gizliIndeks: -1,
        // Her hücre için ayrı liste: temiz tur, bozuk turdan ayırt edilemez
        duzeltmeSecenekleri: (soru.duzeltmeSecenekleri || []).map((l) => karistir(l)),
        secenekler: [],
      };

    case 'kendi':
      return { ...ortak, dizi: [], gizliIndeks: -1, secenekler: [] };

    default: {
      // surdur / eksik / kural — eski davranış birebir korunur
      const gorunenDizi = soru.dizi.map((h, i) => (i === soru.gizliIndeks ? null : h));
      return {
        ...ortak,
        dizi: gorunenDizi,
        gizliIndeks: soru.gizliIndeks,
        secenekler: karistir(soru.secenekler),
      };
    }
  }
}

// ---------------- Tur sonu açıklaması ----------------

function cevapAcikla(soru) {
  const ortak = { kural: soru.kural, aciklama: soru.aciklama, mod: soru.mod };
  switch (soru.mod) {
    case 'hata':
      return {
        ...ortak,
        dogru: dogruCevap(soru),
        bozukIndeks: soru.bozukIndeks,
        dogruDeger: soru.bozukIndeks >= 0 ? soru.dogruDizi[soru.bozukIndeks] : null,
        tamDizi: soru.dogruDizi,
        gizliIndeks: -1,
      };
    case 'tersine':
      return { ...ortak, dogru: soru.dizi[0], tamDizi: soru.dizi, gizliIndeks: 0 };
    case 'uzak':
      return { ...ortak, dogru: soru.kural, tamDizi: soru.dizi, gizliIndeks: -1 };
    case 'kendi':
      return { ...ortak, dogru: null, tamDizi: [], gizliIndeks: -1 };
    default:
      return {
        ...ortak,
        dogru: dogruCevap(soru),
        tamDizi: soru.dizi,
        gizliIndeks: soru.gizliIndeks,
      };
  }
}

// ---------------- Cevap doğrulama ----------------
// Dönüş: { gecerli, hata?, dogruMu, puan?, kategori?, ayrinti? }

function dogrula(soru, secim) {
  switch (soru.mod) {
    case 'hata':
      return hataDogrula(soru, secim);
    case 'kendi':
      return kendiDogrula(soru, secim);
    default: {
      const secimStr = String(secim);
      if (!soru.secenekler.map(String).includes(secimStr)) {
        return { gecerli: false, hata: 'Geçersiz seçenek.' };
      }
      return { gecerli: true, dogruMu: secimStr === String(dogruCevap(soru)) };
    }
  }
}

// Hatayı Bul: iki adımlı cevap — { hucre, deger }
// hucre === -1 → "hata yok" denildi (o zaman deger istenmez)
function hataDogrula(soru, secim) {
  const s = secim && typeof secim === 'object' ? secim : {};
  const hucre = Number(s.hucre);
  if (!Number.isInteger(hucre) || hucre < -1 || hucre >= soru.dizi.length) {
    return { gecerli: false, hata: 'Geçersiz hücre seçimi.' };
  }

  if (soru.bozukIndeks === -1) {
    // Temiz tur: doğru cevap "hata yok"
    return { gecerli: true, dogruMu: hucre === -1, ayrinti: { hucre, bozukIndeks: -1 } };
  }

  if (hucre === -1) return { gecerli: true, dogruMu: false, ayrinti: { hucre, bozukIndeks: soru.bozukIndeks } };
  if (hucre !== soru.bozukIndeks) {
    return { gecerli: true, dogruMu: false, ayrinti: { hucre, bozukIndeks: soru.bozukIndeks } };
  }

  // Doğru hücre bulundu; ikinci adım: doğru değer
  const deger = String(s.deger);
  const hucreSecenekleri = (soru.duzeltmeSecenekleri || [])[hucre] || [];
  if (!hucreSecenekleri.map(String).includes(deger)) {
    return { gecerli: false, hata: 'Geçersiz düzeltme seçeneği.' };
  }
  const dogruDeger = String(soru.dogruDizi[soru.bozukIndeks]);
  return {
    gecerli: true,
    dogruMu: deger === dogruDeger,
    ayrinti: { hucre, bozukIndeks: soru.bozukIndeks, deger, dogruDeger },
  };
}

// Kendi Örüntünü Kur: { dizi:[...], karar:'dogru'|'yanlis', kendiKurali? }
// Puan KURAL TUTARLILIĞINA göre verilir; kayıt da tutarlılığı ölçer.
const KENDI_PUAN = { tutarliDogruKarar: TEMEL_PUAN, tutarliYanlisKarar: 60, tutarsizDogruKarar: 40, tutarsizYanlisKarar: 20 };

function kendiDogrula(soru, secim) {
  const s = secim && typeof secim === 'object' ? secim : {};
  if (!Array.isArray(s.dizi)) return { gecerli: false, hata: 'Önce kendi örüntünü kur.' };
  if (!['dogru', 'yanlis'].includes(s.karar)) {
    return { gecerli: false, hata: 'Motor doğru mu sürdürdü, karar ver.' };
  }

  const inceleme = kendiKural.incele(s.dizi.map(String));
  if (inceleme.hata) return { gecerli: false, hata: inceleme.hata };

  // Motor tutarlı bir kural bulduysa sürdürmesi de doğrudur.
  const beklenenKarar = inceleme.tutarli ? 'dogru' : 'yanlis';
  const kararDogru = s.karar === beklenenKarar;

  const puan = inceleme.tutarli
    ? kararDogru
      ? KENDI_PUAN.tutarliDogruKarar
      : KENDI_PUAN.tutarliYanlisKarar
    : kararDogru
      ? KENDI_PUAN.tutarsizDogruKarar
      : KENDI_PUAN.tutarsizYanlisKarar;

  return {
    gecerli: true,
    // Ölçülen beceri: tek kurallı bir örüntü kurabilmek
    dogruMu: inceleme.tutarli,
    puan,
    kategori: inceleme.tutarli ? 'kendi-tutarli' : 'kendi-tutarsiz',
    ayrinti: {
      tutarli: inceleme.tutarli,
      kuralEtiketi: inceleme.kuralEtiketi,
      aciklama: inceleme.aciklama,
      bozulmaIndeksi: inceleme.bozulmaIndeksi,
      dizi: inceleme.dizi,
      surdurulen: inceleme.surdurulen,
      karar: s.karar,
      kararDogru,
      kendiKurali: String(s.kendiKurali || '').trim().slice(0, 80),
    },
  };
}

// Öğrenci diziyi kurunca motorun sürdürmesini ister (cevap öncesi ön izleme)
function kendiSurdur(dizi) {
  const inceleme = kendiKural.incele((dizi || []).map(String));
  if (inceleme.hata) return { hata: inceleme.hata };
  // Tutarlılık ve kural bu aşamada AÇIKLANMAZ — çocuk kendi kararını verecek.
  return { tamam: true, dizi: inceleme.dizi, surdurulen: inceleme.surdurulen };
}

module.exports = {
  MODLAR,
  ADLAR,
  gecerliMod,
  senkronMu,
  havuzKur,
  dogruCevap,
  istemciIcin,
  cevapAcikla,
  dogrula,
  kendiSurdur,
  KENDI_PUAN,
};
