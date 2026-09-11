// Örüntü içeriğinin yüklenmesi, filtrelenmesi ve istemciye güvenli biçimde sunulması.
// Cevap bilgisi (gizli hücre / kural) bu modülün dışına ASLA sızdırılmaz.

const fs = require('fs');
const path = require('path');
const modlar = require('./modlar');

const DOSYA = path.join(__dirname, '..', 'data', 'patterns.json');

let oruntuler = [];

function yukle() {
  const ham = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  oruntuler = ham.oruntuler || [];
  console.log(`[içerik] ${oruntuler.length} örüntü yüklendi (${DOSYA})`);
  return oruntuler.length;
}

// Belirli grup/seviye/mod için karıştırılmış soru listesi.
// surdur/eksik/kural patterns.json'dan gelir; yeni modlar üretilir.
function havuzOlustur(grup, seviye, mod) {
  const sv = Number(seviye);
  const uretilmisHavuz = modlar.havuzKur(mod, grup, sv, temelKayitlar(grup, sv));
  if (uretilmisHavuz) return karistir(uretilmisHavuz);

  const secilen = oruntuler.filter((o) => o.grup === grup && o.seviye === sv && o.mod === mod);
  return karistir(secilen);
}

// "Hatayı Bul" tam dizilere ihtiyaç duyar; surdur kayıtları bunu sağlar.
function temelKayitlar(grup, seviye) {
  return oruntuler.filter((o) => o.grup === grup && o.seviye === seviye && o.mod === 'surdur');
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
const dogruCevap = (soru) => modlar.dogruCevap(soru);

// İstemciye gönderilecek güvenli sürüm: gizli hücre ve kural çıkarılır.
const istemciIcin = (soru, sira, toplam) => modlar.istemciIcin(soru, sira, toplam, karistir);

// Tur bitince açıklanan cevap paketi
const cevapAcikla = (soru) => modlar.cevapAcikla(soru);

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
  temelKayitlar,
  tumu: () => oruntuler,
};
