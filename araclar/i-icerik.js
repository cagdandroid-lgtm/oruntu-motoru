// "i" grubu (3.-4. sınıf) taban dizileri — sayısal ağırlıklı, e'den belirgin zor.
//
// Her taban dizi ÜÇ modda birden yayımlanır (Sürdür / Eksiği Bul / Kuralı Yakala).
// Kural etiketleri SEMBOLİKTİR ("+7", "×3", "fark artıyor") — hem kural modunun
// seçeneklerinde hem de tur sonu geri bildiriminde bu etiket görünür.
//
// eksikIndeks: "Eksiği Bul" modunda gizlenecek hücre. Baş ve son hücre asla
// gizlenmez; iç içe dizilerde kendi şeridinden çıkarılabilecek bir konum seçilir.

// Harf örüntülerinde Latin alfabesi kullanılır (istenen örnek: A, C, E …).
const ALFABE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SEVIYELER = {
  // ---------------- SEVİYE 1 — e'nin bittiği yerden başlar ----------------
  1: [
    { tur: 'sayi', dizi: [6, 10, 14, 18, 22, 26, 30], kural: '+4', eksikIndeks: 3,
      dogrula: 'artimli', p: 4, aciklama: 'Her adımda 4 ekleniyor.' },
    { tur: 'sayi', dizi: [7, 14, 21, 28, 35, 42, 49], kural: '+7', eksikIndeks: 4,
      dogrula: 'artimli', p: 7, aciklama: 'Yedişer sayıyoruz.' },
    { tur: 'sayi', dizi: [9, 18, 27, 36, 45, 54, 63], kural: '+9', eksikIndeks: 2,
      dogrula: 'artimli', p: 9, aciklama: 'Dokuzar sayıyoruz.' },
    { tur: 'sayi', dizi: [60, 54, 48, 42, 36, 30, 24], kural: '-6', eksikIndeks: 3,
      dogrula: 'artimli', p: -6, aciklama: 'Her adımda 6 azalıyor.' },
    { tur: 'sayi', dizi: [80, 72, 64, 56, 48, 40, 32], kural: '-8', eksikIndeks: 4,
      dogrula: 'artimli', p: -8, aciklama: 'Her adımda 8 azalıyor.' },
    { tur: 'buyuyen', dizi: [1, 2, 4, 7, 11, 16, 22], kural: 'fark artıyor', eksikIndeks: 3,
      dogrula: 'farkArtan', p: [1, 1], aciklama: 'Aralar büyüyor: +1, +2, +3, +4 …' },
    { tur: 'buyuyen', dizi: [2, 3, 5, 8, 12, 17, 23], kural: 'fark artıyor', eksikIndeks: 4,
      dogrula: 'farkArtan', p: [1, 1], aciklama: 'Aralar birer birer büyüyor.' },
    { tur: 'buyuyen', dizi: [2, 4, 8, 16, 32, 64, 128], kural: '×2', eksikIndeks: 3,
      dogrula: 'carpan', p: 2, aciklama: 'Her sayı bir öncekinin iki katı.' },
    { tur: 'buyuyen', dizi: [5, 10, 20, 40, 80, 160], kural: '×2', eksikIndeks: 2,
      dogrula: 'carpan', p: 2, aciklama: 'Her adımda ikiye katlanıyor.' },
    { tur: 'buyuyen', dizi: [1, 3, 9, 27, 81, 243], kural: '×3', eksikIndeks: 3,
      dogrula: 'carpan', p: 3, aciklama: 'Her sayı bir öncekinin üç katı.' },
    { tur: 'sayi', dizi: [1, 4, 9, 16, 25, 36, 49], kural: 'kare sayılar', eksikIndeks: 4,
      dogrula: 'kare', p: 1, aciklama: '1×1, 2×2, 3×3, 4×4 … kare sayılar.' },
    { tur: 'ic-ice', dizi: [10, 1, 9, 2, 8, 3, 7, 4], kural: 'iki dizi iç içe', eksikIndeks: 4,
      dogrula: 'iceIce', p: [[10, -1], [1, 1]], aciklama: 'Biri geriye (10, 9, 8 …), diğeri ileriye (1, 2, 3 …) gidiyor.' },
    { tur: 'harf', dizi: ['A', 'C', 'E', 'G', 'I', 'K', 'M'], kural: 'harfler ikişer', eksikIndeks: 3,
      dogrula: 'harfAdim', p: 2, aciklama: 'Alfabede birer harf atlanıyor.' },
    { tur: 'ayna', dizi: [3, 7, 11, 15, 11, 7, 3], kural: 'ayna (simetrik)', eksikIndeks: 2,
      dogrula: 'ayna', aciklama: 'Dizi ortadan katlanınca üst üste geliyor.' },
  ],

  // ---------------- SEVİYE 2 — daha büyük adımlar, iki yönlü şeritler ----------------
  2: [
    { tur: 'sayi', dizi: [12, 24, 36, 48, 60, 72, 84], kural: '+12', eksikIndeks: 4,
      dogrula: 'artimli', p: 12, aciklama: 'Onikişer sayıyoruz.' },
    { tur: 'sayi', dizi: [15, 30, 45, 60, 75, 90, 105], kural: '+15', eksikIndeks: 2,
      dogrula: 'artimli', p: 15, aciklama: 'Onbeşer sayıyoruz.' },
    { tur: 'sayi', dizi: [91, 78, 65, 52, 39, 26, 13], kural: '-13', eksikIndeks: 3,
      dogrula: 'artimli', p: -13, aciklama: 'Her adımda 13 azalıyor.' },
    { tur: 'sayi', dizi: [98, 84, 70, 56, 42, 28, 14], kural: '-14', eksikIndeks: 4,
      dogrula: 'artimli', p: -14, aciklama: 'Her adımda 14 azalıyor.' },
    { tur: 'buyuyen', dizi: [1, 3, 7, 13, 21, 31, 43], kural: 'fark artıyor', eksikIndeks: 3,
      dogrula: 'farkArtan', p: [2, 2], aciklama: 'Aralar ikişer büyüyor: +2, +4, +6, +8 …' },
    { tur: 'buyuyen', dizi: [1, 3, 6, 10, 15, 21, 28, 36], kural: 'fark artıyor', eksikIndeks: 4,
      dogrula: 'farkArtan', p: [2, 1], aciklama: 'Aralar birer büyüyor: +2, +3, +4, +5 …' },
    { tur: 'buyuyen', dizi: [3, 6, 12, 24, 48, 96, 192], kural: '×2', eksikIndeks: 4,
      dogrula: 'carpan', p: 2, aciklama: 'Her adımda ikiye katlanıyor.' },
    { tur: 'buyuyen', dizi: [7, 14, 28, 56, 112, 224], kural: '×2', eksikIndeks: 2,
      dogrula: 'carpan', p: 2, aciklama: 'Her sayı bir öncekinin iki katı.' },
    { tur: 'buyuyen', dizi: [2, 6, 18, 54, 162, 486], kural: '×3', eksikIndeks: 3,
      dogrula: 'carpan', p: 3, aciklama: 'Her adımda üçe katlanıyor.' },
    { tur: 'buyuyen', dizi: [5, 15, 45, 135, 405], kural: '×3', eksikIndeks: 2,
      dogrula: 'carpan', p: 3, aciklama: 'Her sayı bir öncekinin üç katı.' },
    { tur: 'sayi', dizi: [4, 9, 16, 25, 36, 49, 64], kural: 'kare sayılar', eksikIndeks: 3,
      dogrula: 'kare', p: 2, aciklama: '2×2, 3×3, 4×4 … kare sayılar.' },
    { tur: 'ic-ice', dizi: [2, 20, 4, 19, 6, 18, 8, 17], kural: 'iki dizi iç içe', eksikIndeks: 5,
      dogrula: 'iceIce', p: [[2, 2], [20, -1]], aciklama: 'Bir dizi ikişer artıyor, diğeri birer azalıyor.' },
    { tur: 'harf', dizi: ['B', 'E', 'H', 'K', 'N', 'Q'], kural: 'harfler üçer', eksikIndeks: 3,
      dogrula: 'harfAdim', p: 3, aciklama: 'Alfabede ikişer harf atlanıyor.' },
    { tur: 'ayna', dizi: [6, 12, 18, 24, 18, 12, 6], kural: 'ayna (simetrik)', eksikIndeks: 5,
      dogrula: 'ayna', aciklama: 'Ortadaki 24’ten sonra dizi geri sarıyor.' },
  ],

  // ---------------- SEVİYE 3 — gerçekten zorlayıcı (30 sn süreli) ----------------
  3: [
    { tur: 'buyuyen', dizi: [1, 1, 2, 3, 5, 8, 13, 21, 34], kural: 'son iki sayının toplamı', eksikIndeks: 5,
      dogrula: 'fibonacci', aciklama: 'Her sayı kendinden önceki iki sayının toplamı.' },
    { tur: 'buyuyen', dizi: [2, 3, 5, 8, 13, 21, 34, 55], kural: 'son iki sayının toplamı', eksikIndeks: 4,
      dogrula: 'fibonacci', aciklama: '2+3=5, 3+5=8, 5+8=13 …' },
    { tur: 'buyuyen', dizi: [1, 3, 9, 27, 81, 243, 729], kural: '×3', eksikIndeks: 4,
      dogrula: 'carpan', p: 3, aciklama: 'Her adımda üçe katlanıyor.' },
    { tur: 'buyuyen', dizi: [4, 12, 36, 108, 324, 972], kural: '×3', eksikIndeks: 2,
      dogrula: 'carpan', p: 3, aciklama: 'Her sayı bir öncekinin üç katı.' },
    { tur: 'buyuyen', dizi: [6, 12, 24, 48, 96, 192, 384], kural: '×2', eksikIndeks: 4,
      dogrula: 'carpan', p: 2, aciklama: 'Her adımda ikiye katlanıyor.' },
    { tur: 'buyuyen', dizi: [1, 2, 6, 13, 23, 36, 52, 71], kural: 'fark artıyor', eksikIndeks: 4,
      dogrula: 'farkArtan', p: [1, 3], aciklama: 'Aralar üçer büyüyor: +1, +4, +7, +10 …' },
    { tur: 'buyuyen', dizi: [5, 10, 20, 35, 55, 80, 110, 145], kural: 'fark artıyor', eksikIndeks: 3,
      dogrula: 'farkArtan', p: [5, 5], aciklama: 'Aralar beşer büyüyor: +5, +10, +15, +20 …' },
    { tur: 'sayi', dizi: [2, 5, 10, 17, 26, 37, 50, 65], kural: 'kare sayılar +1', eksikIndeks: 4,
      dogrula: 'kareArti', p: [1, 1], aciklama: 'Kare sayıların bir fazlası: 1+1, 4+1, 9+1 …' },
    { tur: 'sayi', dizi: [9, 16, 25, 36, 49, 64, 81, 100], kural: 'kare sayılar', eksikIndeks: 5,
      dogrula: 'kare', p: 3, aciklama: '3×3, 4×4, 5×5 … kare sayılar.' },
    { tur: 'ic-ice', dizi: [1, 100, 2, 90, 4, 80, 8, 70], kural: 'iki dizi iç içe', eksikIndeks: 4,
      dogrula: 'iceIceKarma', p: [[1, 2], [100, -10]], aciklama: 'Biri ikiye katlanıyor, diğeri onar azalıyor.' },
    { tur: 'ic-ice', dizi: [3, 2, 6, 4, 12, 8, 24, 16], kural: 'iki dizi iç içe', eksikIndeks: 5,
      dogrula: 'iceIceCarpan', p: [[3, 2], [2, 2]], aciklama: 'İki dizi de ikiye katlanıyor ama farklı yerden başlıyor.' },
    { tur: 'harf', dizi: ['A', 'E', 'I', 'M', 'Q', 'U'], kural: 'harfler dörder', eksikIndeks: 3,
      dogrula: 'harfAdim', p: 4, aciklama: 'Alfabede üçer harf atlanıyor.' },
    { tur: 'harf', dizi: ['A', 'Z', 'C', 'X', 'E', 'V', 'G', 'T'], kural: 'iki harf dizisi iç içe', eksikIndeks: 5,
      dogrula: 'harfIceIce', p: [[0, 2], [25, -2]], aciklama: 'Biri baştan (A, C, E …), diğeri sondan (Z, X, V …) geliyor.' },
    { tur: 'ayna', dizi: [4, 12, 36, 108, 36, 12, 4], kural: 'ayna (simetrik)', eksikIndeks: 5,
      dogrula: 'ayna', aciklama: 'Üçe katlanarak çıkıyor, sonra aynı yoldan iniyor.' },
  ],
};

// CHC etiketleri (öğrenciye ASLA gösterilmez; panelde ve kayıtta yaşar)
const CHC = {
  sayi: ['Gq', 'Gf'],
  buyuyen: ['Gf', 'Gq'],
  'ic-ice': ['Gf', 'Gsm'],
  harf: ['Gf', 'Gc'],
  ayna: ['Gv', 'Gf'],
};

module.exports = { SEVIYELER, CHC, ALFABE };
