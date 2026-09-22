// Yeni modların soru üreteci: Hatayı Bul, Tersine Örüntü, Uzak Terim.
// Mevcut üç mod (Sürdür / Eksiği Bul / Kuralı Yakala) patterns.json'dan
// gelmeyi sürdürür; bu dosya onlara dokunmaz.

const K = require('./kurallar');
const { chcKodu } = require('./chc');

const karistir = (d) => {
  const r = d.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const rastgele = (d) => d[Math.floor(Math.random() * d.length)];
const araliktan = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Dört seçeneği tamamla: doğru + benzersiz, pozitif tam sayı çeldiriciler
function seceneklerKur(dogru, adaylar, yedekAdim = 1) {
  const set = new Map([[String(dogru), dogru]]);
  for (const a of adaylar) {
    if (set.size >= 4) break;
    if (!Number.isInteger(a) || a <= 0 || set.has(String(a))) continue;
    set.set(String(a), a);
  }
  let k = 1;
  while (set.size < 4) {
    for (const yon of [1, -1]) {
      const a = dogru + yon * k * yedekAdim;
      if (Number.isInteger(a) && a > 0 && !set.has(String(a))) set.set(String(a), a);
      if (set.size >= 4) break;
    }
    if (++k > 60) break;
  }
  return karistir([...set.values()].map(String));
}

// ---------------- (2) TERSİNE ÖRÜNTÜ ----------------
// Kural ve SON terim verilir, başlangıç terimi sorulur (geriye çalışma).
//   e katmanı → tek adımlı kural (+3, ×2)
//   u katmanı → iki adımlı kural (×2 sonra +1)   (eski i + c grupları)

function tersineKural(grup, seviye) {
  if (grup === 'e') {
    if (seviye === 1) return { tip: 'topla', a: araliktan(2, 5) };
    if (seviye === 2) return rastgele([{ tip: 'topla', a: araliktan(4, 9) }, { tip: 'carp', a: 2 }]);
    return rastgele([{ tip: 'topla', a: araliktan(6, 12) }, { tip: 'carp', a: rastgele([2, 3]) }]);
  }
  // u katmanı: iki adımlı
  if (seviye === 1) return { tip: 'carpTopla', a: 2, b: araliktan(1, 3) };
  if (seviye === 2) return { tip: 'carpTopla', a: rastgele([2, 3]), b: araliktan(1, 4) };
  return { tip: 'carpTopla', a: rastgele([2, 3]), b: araliktan(2, 6) };
}

function tersineUret(grup, seviye, sira) {
  const kural = tersineKural(grup, seviye);
  const adim = grup === 'e' ? araliktan(3, 4) : araliktan(3, 4); // kaç adım geriye
  const uzunluk = adim + 1;
  const ilk = grup === 'e' ? araliktan(1, 9) : araliktan(1, 6);
  const d = K.dizi(kural, ilk, uzunluk);
  const son = d[d.length - 1];

  // Çeldiriciler: bir eksik/fazla adım geri gitme, ters işlemi yanlış sıralama
  const birEksikGeri = d[1];
  const birFazlaGeri = K.tersUygula(kural, ilk);
  const yanlisSira =
    kural.tip === 'carpTopla' ? (son - kural.b * adim) / Math.pow(kural.a, adim) : null;

  return {
    id: `tersine-${grup}${seviye}-${sira}`,
    grup,
    tur: 'tersine',
    seviye,
    mod: 'tersine',
    uretilmis: true,
    chc: chcKodu('tersine'),
    // Ekranda: ilk hücre "?", aradakiler boş, son hücre dolu
    dizi: d.map(String),
    gizliIndeks: 0,
    adimSayisi: adim,
    sonTerim: String(son),
    kuralEtiketi: K.etiket(kural),
    secenekler: seceneklerKur(ilk, [birEksikGeri, birFazlaGeri, yanlisSira], 1),
    kural: K.etiket(kural),
    aciklama: `${K.anlat(kural)} ${K.tersAnlat(kural)} ${adim} adım geriye gidince ${ilk} bulunur.`,
  };
}

// ---------------- (3) UZAK TERİM ----------------
// "Bu dizinin 10. terimi kaçtır?" — tek tek saymayı imkânsız kılacak kadar uzak.
//   e → 8-10. terim · u → 15-20. terim
// Şıklarda "tek tek sayan" çeldirici bulunur: bir eksik / bir fazla terim.

function uzakKural(grup, seviye) {
  if (grup === 'e') {
    if (seviye === 1) return { tip: 'topla', a: araliktan(2, 4) };
    if (seviye === 2) return { tip: 'topla', a: araliktan(3, 6) };
    return rastgele([{ tip: 'topla', a: araliktan(5, 9) }, { tip: 'carp', a: 2 }]);
  }
  if (seviye === 1) return { tip: 'topla', a: araliktan(3, 7) };
  if (seviye === 2) return { tip: 'topla', a: araliktan(6, 12) };
  return { tip: 'topla', a: araliktan(9, 15) };
}

function uzakUret(grup, seviye, sira) {
  const kural = uzakKural(grup, seviye);
  // Çarpımsal kuralda sayılar patlamasın diye hedef terim yakın tutulur
  const hedef =
    kural.tip === 'carp' ? araliktan(7, 8) : grup === 'e' ? araliktan(8, 10) : araliktan(15, 20);
  const ilk = kural.tip === 'carp' ? araliktan(1, 3) : araliktan(1, 9);
  const gosterilen = K.dizi(kural, ilk, 4); // ilk dört terim görünür
  const dogru = K.nTerim(kural, ilk, hedef);

  // "Tek tek sayan" çeldiriciler: bir önceki ve bir sonraki terim
  const birEksik = K.nTerim(kural, ilk, hedef - 1);
  const birFazla = K.nTerim(kural, ilk, hedef + 1);
  // Sık hata: (n-1) yerine n kez adım uygulamak (aritmetikte ilk + n·fark)
  const eksiBirUnutan = kural.tip === 'topla' ? ilk + hedef * kural.a : null;

  return {
    id: `uzak-${grup}${seviye}-${sira}`,
    grup,
    tur: 'uzak',
    seviye,
    mod: 'uzak',
    uretilmis: true,
    chc: chcKodu('uzak'),
    dizi: gosterilen.map(String),
    gizliIndeks: -1,
    hedefTerim: hedef,
    kuralEtiketi: K.etiket(kural),
    secenekler: seceneklerKur(dogru, [birEksik, birFazla, eksiBirUnutan], kural.a || 1),
    kural: String(dogru),
    aciklama:
      kural.tip === 'topla'
        ? `${K.anlat(kural)} ${hedef}. terim = ${ilk} + ${hedef - 1} × ${kural.a} = ${dogru}.`
        : `${K.anlat(kural)} ${hedef}. terim ${dogru} olur.`,
  };
}

// ---------------- (1) HATAYI BUL ----------------
// Dizideki bir öğe kuralı bozar; çocuk önce hatalı öğeye dokunur, sonra
// doğrusunu seçer. Turların bir bölümünde HİÇ hata yoktur — o zaman
// doğru cevap "hata yok"tur.

const HATA_YOK = 'hata-yok';
const HATASIZ_ORAN = 0.3; // turların yaklaşık üçte biri temiz gelir

// Sayısal diziyi bozar: komşu adım kadar kaydırır (inandırıcı hata)
function sayiyiBoz(dizi, i) {
  const sayilar = dizi.map(Number);
  const adim = Math.abs(sayilar[1] - sayilar[0]) || 1;
  const yon = Math.random() < 0.5 ? 1 : -1;
  const yeni = sayilar[i] + yon * (Math.random() < 0.6 ? adim : 1);
  return yeni > 0 ? String(yeni) : String(sayilar[i] + adim);
}

// Sembolik diziyi bozar: dizideki BAŞKA bir sembolle değiştirir
function sembolBoz(dizi, i) {
  const digerleri = [...new Set(dizi)].filter((h) => h !== dizi[i]);
  return digerleri.length ? rastgele(digerleri) : dizi[i];
}

// Bir temel örüntü kaydını "Hatayı Bul" sorusuna çevirir.
function hataUret(temel, sira, hatasizMi = Math.random() < HATASIZ_ORAN) {
  const dogruDizi = temel.dizi.map(String);
  const sayisalMi = dogruDizi.every((h) => /^-?\d+$/.test(h));

  let bozukIndeks = -1;
  let gosterilenDizi = dogruDizi.slice();

  if (!hatasizMi && dogruDizi.length >= 4) {
    // Baş ve son hücre bozulmaz: çocuk kuralı iki yandan görebilsin
    bozukIndeks = araliktan(1, dogruDizi.length - 2);
    const yeni = sayisalMi ? sayiyiBoz(dogruDizi, bozukIndeks) : sembolBoz(dogruDizi, bozukIndeks);
    if (yeni === dogruDizi[bozukIndeks]) {
      bozukIndeks = -1; // bozulamadı (tek sembollü dizi) → temiz tur
    } else {
      gosterilenDizi = dogruDizi.slice();
      gosterilenDizi[bozukIndeks] = yeni;
    }
  }

  // 2. adım seçenekleri HER hücre için üretilir. Yalnız bozuk hücre için
  // üretilseydi, boş liste "bu tur temiz" bilgisini ele verirdi; ayrıca temiz
  // turda bir hücreye dokunan çocuk çıkmaza girerdi.
  const duzeltmeSecenekleri = dogruDizi.map((dogruDeger, i) => {
    if (sayisalMi) {
      const sayi = Number(dogruDeger);
      const adim = Math.abs(Number(dogruDizi[1]) - Number(dogruDizi[0])) || 1;
      return seceneklerKur(sayi, [Number(gosterilenDizi[i]), sayi + adim, sayi - adim], adim);
    }
    const set = new Set([String(dogruDeger), String(gosterilenDizi[i])]);
    for (const h of karistir([...new Set(dogruDizi)])) {
      if (set.size >= 4) break;
      set.add(String(h));
    }
    for (const h of ['⭐', '🌸', '🍎', '🐟']) {
      if (set.size >= 4) break;
      set.add(h);
    }
    return karistir([...set]);
  });

  return {
    id: `hata-${temel.id}-${sira}`,
    grup: temel.grup,
    tur: temel.tur,
    seviye: temel.seviye,
    mod: 'hata',
    uretilmis: true,
    chc: chcKodu('hata'),
    dizi: gosterilenDizi, // ekranda görünen (bozuk olabilir) dizi
    dogruDizi, // yalnız sunucuda: kuralın gerektirdiği hâli
    gizliIndeks: -1,
    bozukIndeks, // -1 → hata yok
    duzeltmeSecenekleri,
    secenekler: [], // seçenekler hücrelerin kendisidir; ayrıca "hata yok" düğmesi
    kural: temel.kural,
    aciklama:
      bozukIndeks >= 0
        ? `${bozukIndeks + 1}. hücre kuralı bozuyordu; doğrusu ${dogruDizi[bozukIndeks]} olmalıydı.`
        : 'Bu dizide hata yoktu — kural baştan sona bozulmadan sürüyordu.',
  };
}

module.exports = { tersineUret, uzakUret, hataUret, HATA_YOK, seceneklerKur };
