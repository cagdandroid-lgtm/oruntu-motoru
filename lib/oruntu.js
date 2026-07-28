// Örüntü içeriğinin yüklenmesi, filtrelenmesi ve istemciye güvenli biçimde sunulması.
// Cevap bilgisi (gizli hücre / kural) bu modülün dışına ASLA sızdırılmaz.

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, '..', 'data', 'patterns.json');

let oruntuler = [];

function yukle() {
  const ham = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  oruntuler = ham.oruntuler || [];
  console.log(`[içerik] ${oruntuler.length} örüntü yüklendi (${DOSYA})`);
  return oruntuler.length;
}

// Belirli grup/seviye/mod için karıştırılmış soru listesi
function havuzOlustur(grup, seviye, mod) {
  const secilen = oruntuler.filter(
    (o) => o.grup === grup && o.seviye === Number(seviye) && o.mod === mod
  );
  return karistir(secilen);
}

function karistir(dizi) {
  const r = dizi.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Sorunun doğru cevabı — yalnızca sunucuda kullanılır.
function dogruCevap(soru) {
  return soru.mod === 'kural' ? soru.kural : soru.dizi[soru.gizliIndeks];
}

// İstemciye gönderilecek güvenli sürüm: gizli hücre ve kural çıkarılır.
function istemciIcin(soru, sira, toplam) {
  const gorunenDizi = soru.dizi.map((h, i) => (i === soru.gizliIndeks ? null : h));
  return {
    id: soru.id,
    tur: soru.tur,
    seviye: soru.seviye,
    mod: soru.mod,
    dizi: gorunenDizi,
    gizliIndeks: soru.gizliIndeks,
    secenekler: karistir(soru.secenekler),
    sira,
    toplam,
  };
}

// Tur bitince açıklanan cevap paketi
function cevapAcikla(soru) {
  return {
    dogru: dogruCevap(soru),
    kural: soru.kural,
    aciklama: soru.aciklama,
    tamDizi: soru.dizi,
    gizliIndeks: soru.gizliIndeks,
  };
}

// Öğrenci tasarımını (6 hücre) çözülebilir bir soruya çevirir.
// Son hücre gizlenir; çeldiriciler tasarımda geçen sembollerden üretilir.
function tasarimdanSoru(tasarim) {
  const dizi = tasarim.hucreler.slice(0, 6);
  const gizliIndeks = dizi.length - 1;
  const dogru = dizi[gizliIndeks];

  const set = new Set([dogru]);
  for (const h of karistir([...new Set(dizi)])) {
    if (set.size >= 4) break;
    set.add(h);
  }
  const yedek = ['⭐', '🌸', '🍎', '🐟', '🟠', '⬛', '🔺', '🟦'];
  let i = 0;
  while (set.size < 4) set.add(yedek[i++ % yedek.length]);

  return {
    id: `tasarim-${tasarim.id}`,
    grup: tasarim.grup,
    tur: 'ogrenci-tasarimi',
    seviye: 2,
    mod: 'surdur',
    dizi,
    gizliIndeks,
    secenekler: karistir([...set]),
    kural: 'öğrenci tasarımı',
    aciklama: `Bu örüntüyü ${tasarim.isim} tasarladı. 🎨`,
  };
}

module.exports = {
  yukle,
  havuzOlustur,
  dogruCevap,
  istemciIcin,
  cevapAcikla,
  tasarimdanSoru,
  karistir,
  tumu: () => oruntuler,
};
