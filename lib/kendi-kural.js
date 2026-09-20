// "Kendi Örüntünü Kur" modunun beyni: çocuğun kurduğu 4-6 öğelik diziyi
// inceler, TEK kurallı olup olmadığına karar verir ve diziyi sürdürür.
//
// Puan kural TUTARLILIĞINA göre verilir: amaç, çocuğun gerçekten tek kurallı
// bir örüntü kurup kurmadığını görünür kılmaktır. Motor kuralı bulamazsa
// elinden gelen tahmini yapar ve nerede bozulduğunu söyler.

const sayisalMi = (dizi) => dizi.every((h) => /^-?\d+$/.test(String(h).trim()));
const sayilar = (dizi) => dizi.map((h) => Number(h));

// ---------- Aday kural çözümleyicileri ----------
// Her biri ya null döner ya da { tip, etiket, anlat, sonraki(dizi, kaç) }

function sabitFark(dizi) {
  if (!sayisalMi(dizi)) return null;
  const s = sayilar(dizi);
  const fark = s[1] - s[0];
  for (let i = 2; i < s.length; i++) if (s[i] - s[i - 1] !== fark) return null;
  return {
    tip: 'aritmetik',
    etiket: fark >= 0 ? `+${fark}` : `${fark}`,
    anlat: fark >= 0 ? `Her adımda ${fark} ekleniyor.` : `Her adımda ${-fark} çıkarılıyor.`,
    sonraki: (d, kac) => {
      const son = Number(d[d.length - 1]);
      return Array.from({ length: kac }, (_, i) => String(son + fark * (i + 1)));
    },
  };
}

function sabitOran(dizi) {
  if (!sayisalMi(dizi)) return null;
  const s = sayilar(dizi);
  if (s.some((x) => x === 0)) return null;
  const oran = s[1] / s[0];
  if (!Number.isInteger(oran) || Math.abs(oran) < 2) return null;
  for (let i = 2; i < s.length; i++) if (s[i] / s[i - 1] !== oran) return null;
  return {
    tip: 'geometrik',
    etiket: `×${oran}`,
    anlat: `Her sayı bir öncekinin ${oran} katı.`,
    sonraki: (d, kac) => {
      let son = Number(d[d.length - 1]);
      return Array.from({ length: kac }, () => String((son *= oran)));
    },
  };
}

// ABAB, ABCABC, AABB … — 1-3 öğelik bir bloğun tekrarı
function dongu(dizi) {
  for (let p = 1; p <= 3; p++) {
    if (dizi.length < p * 2) break; // en az iki tam tekrar görülmeli
    let uyuyor = true;
    for (let i = p; i < dizi.length; i++) {
      if (String(dizi[i]) !== String(dizi[i - p])) {
        uyuyor = false;
        break;
      }
    }
    if (!uyuyor) continue;
    const blok = dizi.slice(0, p).map(String);
    return {
      tip: 'dongu',
      etiket: `${blok.join('')} tekrarı`,
      anlat: `${p} öğelik bir blok (${blok.join(', ')}) baştan sona tekrar ediyor.`,
      sonraki: (d, kac) => Array.from({ length: kac }, (_, i) => String(d[(d.length + i) % p])),
    };
  }
  return null;
}

// 1,3,5,3,1 gibi ortadan simetrik diziler
function ayna(dizi) {
  if (dizi.length < 5) return null;
  const n = dizi.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    if (String(dizi[i]) !== String(dizi[n - 1 - i])) return null;
  }
  // Her öğesi aynı olan dizi ayna değil, döngüdür
  if (new Set(dizi.map(String)).size === 1) return null;
  return {
    tip: 'ayna',
    etiket: 'ayna (simetrik)',
    anlat: 'Dizi ortadan katlanınca üst üste geliyor.',
    // Ayna kapalı bir biçimdir; sürdürmek için baştan geri sarılır
    sonraki: (d, kac) => Array.from({ length: kac }, (_, i) => String(d[i % d.length])),
  };
}

const COZUMLEYICILER = [sabitFark, sabitOran, dongu, ayna];

// ---------- Tutarsız dizide en iyi tahmin ----------

// Kural yoksa motor yine de bir şey yapar: en sık görülen farkla (ya da son
// öğeyi tekrarlayarak) sürdürür ve kuralın NEREDE bozulduğunu bildirir.
function enIyiTahmin(dizi) {
  if (sayisalMi(dizi)) {
    const s = sayilar(dizi);
    const farklar = s.slice(1).map((x, i) => x - s[i]);
    const sayac = new Map();
    for (const f of farklar) sayac.set(f, (sayac.get(f) || 0) + 1);
    const [enSik] = [...sayac.entries()].sort((a, b) => b[1] - a[1]);
    const fark = enSik ? enSik[0] : 1;
    // Kuralın ilk bozulduğu yer
    const bozulma = farklar.findIndex((f) => f !== fark);
    return {
      tip: 'tahmin',
      etiket: fark >= 0 ? `+${fark} (tahmin)` : `${fark} (tahmin)`,
      anlat: `Çoğu adımda ${Math.abs(fark)} ${fark >= 0 ? 'ekleniyor' : 'çıkarılıyor'}, ama bir yerde bozuluyor.`,
      bozulmaIndeksi: bozulma >= 0 ? bozulma + 1 : -1,
      sonraki: (d, kac) => {
        const son = Number(d[d.length - 1]);
        return Array.from({ length: kac }, (_, i) => String(son + fark * (i + 1)));
      },
    };
  }
  // Sembolik: en uzun tekrar eden başlangıç bloğunu varsay
  const blok = dizi.slice(0, Math.min(2, dizi.length)).map(String);
  let bozulma = -1;
  for (let i = 0; i < dizi.length; i++) {
    if (String(dizi[i]) !== blok[i % blok.length]) {
      bozulma = i;
      break;
    }
  }
  return {
    tip: 'tahmin',
    etiket: `${blok.join('')} tekrarı (tahmin)`,
    anlat: 'Baştaki blok tekrar ediyor gibi görünüyor ama dizi bir yerde bozuluyor.',
    bozulmaIndeksi: bozulma,
    sonraki: (d, kac) =>
      Array.from({ length: kac }, (_, i) => blok[(d.length + i) % blok.length]),
  };
}

// ---------- Dışa açılan tek işlev ----------

// Diziyi inceler ve motorun sürdürdüğü hâliyle birlikte döner.
function incele(dizi, kacTerimSurdur = 2) {
  const temiz = dizi.map((h) => String(h).trim()).filter((h) => h !== '');
  if (temiz.length < 4) return { hata: 'En az 4 öğe kurmalısın.' };
  if (temiz.length > 6) return { hata: 'En çok 6 öğe kurabilirsin.' };
  // Aynı öğenin tekrarı örüntü değildir: aksi hâlde "🔺🔺🔺🔺" kurup
  // hiç düşünmeden tam puan alınabilirdi.
  if (new Set(temiz).size < 2) {
    return { hata: 'En az iki farklı öğe kullan — aynı şeyin tekrarı örüntü sayılmaz.' };
  }

  for (const cozumleyici of COZUMLEYICILER) {
    const kural = cozumleyici(temiz);
    if (!kural) continue;
    return {
      tutarli: true,
      tip: kural.tip,
      kuralEtiketi: kural.etiket,
      aciklama: kural.anlat,
      dizi: temiz,
      surdurulen: kural.sonraki(temiz, kacTerimSurdur),
    };
  }

  const tahmin = enIyiTahmin(temiz);
  return {
    tutarli: false,
    tip: tahmin.tip,
    kuralEtiketi: tahmin.etiket,
    aciklama: tahmin.anlat,
    bozulmaIndeksi: tahmin.bozulmaIndeksi,
    dizi: temiz,
    surdurulen: tahmin.sonraki(temiz, kacTerimSurdur),
  };
}

module.exports = { incele, sayisalMi };
