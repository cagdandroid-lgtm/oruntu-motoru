// Parametrik kural cebiri — "Tersine Örüntü" ve "Uzak Terim" modlarının
// dizileri buradan üretilir. patterns.json'daki elle yazılmış içeriğe ve
// araclar/i-uret.js üretecine DOKUNMAZ; onlar olduğu gibi çalışmayı sürdürür.
//
// Kural biçimi: { tip, a, b }
//   topla      → x + a
//   carp       → x × a
//   carpTopla  → x × a + b   (i katmanının iki adımlı kuralı)

const TIPLER = ['topla', 'carp', 'carpTopla'];

function uygula(kural, x) {
  switch (kural.tip) {
    case 'topla':
      return x + kural.a;
    case 'carp':
      return x * kural.a;
    case 'carpTopla':
      return x * kural.a + kural.b;
    default:
      throw new Error(`bilinmeyen kural tipi: ${kural.tip}`);
  }
}

// Bir adım geriye. Diziler daima ileriye üretildiği için sonuç tam sayı çıkar.
function tersUygula(kural, y) {
  switch (kural.tip) {
    case 'topla':
      return y - kural.a;
    case 'carp':
      return y / kural.a;
    case 'carpTopla':
      return (y - kural.b) / kural.a;
    default:
      throw new Error(`bilinmeyen kural tipi: ${kural.tip}`);
  }
}

// n. terim (1 tabanlı): nTerim(k, ilk, 1) === ilk
function nTerim(kural, ilk, n) {
  let x = ilk;
  for (let i = 1; i < n; i++) x = uygula(kural, x);
  return x;
}

function dizi(kural, ilk, uzunluk) {
  const d = [ilk];
  for (let i = 1; i < uzunluk; i++) d.push(uygula(kural, d[i - 1]));
  return d;
}

// Sembolik etiket — kural modundaki yazımla aynı dili konuşur ("+3", "×2").
function etiket(kural) {
  switch (kural.tip) {
    case 'topla':
      return kural.a >= 0 ? `+${kural.a}` : `${kural.a}`;
    case 'carp':
      return `×${kural.a}`;
    case 'carpTopla':
      return `×${kural.a} sonra +${kural.b}`;
    default:
      return '?';
  }
}

// Çocuk diline uygun tek cümlelik açıklama
function anlat(kural) {
  switch (kural.tip) {
    case 'topla':
      return `Her adımda ${kural.a} ekleniyor.`;
    case 'carp':
      return `Her sayı bir öncekinin ${kural.a} katı.`;
    case 'carpTopla':
      return `Her adımda önce ${kural.a} ile çarpılıyor, sonra ${kural.b} ekleniyor.`;
    default:
      return '';
  }
}

// Geriye doğru tek adımın çocuk diliyle tersi (Tersine Örüntü ipucu)
function tersAnlat(kural) {
  switch (kural.tip) {
    case 'topla':
      return `Geriye giderken ${kural.a} çıkarılır.`;
    case 'carp':
      return `Geriye giderken ${kural.a}'e bölünür.`;
    case 'carpTopla':
      return `Geriye giderken önce ${kural.b} çıkarılır, sonra ${kural.a}'e bölünür.`;
    default:
      return '';
  }
}

module.exports = { TIPLER, uygula, tersUygula, nTerim, dizi, etiket, anlat, tersAnlat };
