// "i" grubu kayıtlarını üretir ve data/patterns.json'a yazar.
// e / p / c grubu kayıtlarına DOKUNULMAZ (dosyada oldukları gibi kalır).
//
// Çalıştırma: node araclar/i-uret.js
//
// Her taban dizi üç modda birden yayımlanır:
//   surdur → son hücre gizli · eksik → ortadaki hücre gizli · kural → hiçbiri gizli
// Kural modunun çeldiricileri AYNI SEVİYENİN kural havuzundan gelir; sayı
// sorusuna harf kuralı, harf sorusuna sayı kuralı çeldirici olarak KONMAZ.

const fs = require('fs');
const path = require('path');
const { SEVIYELER, CHC, ALFABE } = require('./i-icerik');

const DOSYA = path.join(__dirname, '..', 'data', 'patterns.json');
const MODLAR = ['surdur', 'eksik', 'kural'];
const MOD_KISA = { surdur: 's', eksik: 'e', kural: 'k' };
const harfMi = (taban) => taban.tur === 'harf';

// ---------------- Yinelenebilir karıştırma ----------------
// Aynı girdi her çalıştırmada aynı çıktıyı versin diye tohumlu üreteç.

function tohumla(metin) {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function karistir(dizi, rastgele) {
  const r = dizi.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// ---------------- Çeldiriciler ----------------

// Sayı çeldiricileri: son adım kadar sapma (klasik hatalar) + komşu değerler.
function sayiCeldiricileri(dizi, indeks, rastgele) {
  const dogru = dizi[indeks];
  const onceki = indeks > 0 ? dizi[indeks - 1] : null;
  const adim = onceki === null ? 1 : Math.abs(dogru - onceki);

  const adaylar = [
    onceki, // "işlemi hiç uygulamadı"
    dogru + adim, // "aynı farkı bir kez daha ekledi"
    dogru - adim,
    dogru + 1,
    dogru - 1,
    dogru + 2,
    dogru - 2,
    dogru * 2,
  ];

  const secilen = [];
  for (const a of adaylar) {
    if (!Number.isInteger(a) || a <= 0 || a === dogru) continue;
    if (secilen.includes(a)) continue;
    secilen.push(a);
    if (secilen.length === 3) break;
  }
  return karistir([dogru, ...secilen], rastgele).map(String);
}

// Harf çeldiricileri: alfabede komşu harfler (bir eksik / bir fazla adım).
function harfCeldiricileri(dizi, indeks, rastgele) {
  const dogru = dizi[indeks];
  const yer = ALFABE.indexOf(dogru);
  const secilen = [];
  for (const kayma of [1, -1, 2, -2, 3, -3]) {
    const y = yer + kayma;
    if (y < 0 || y >= ALFABE.length) continue;
    const harf = ALFABE[y];
    if (harf === dogru || secilen.includes(harf)) continue;
    secilen.push(harf);
    if (secilen.length === 3) break;
  }
  return karistir([dogru, ...secilen], rastgele);
}

// Kural çeldiricileri: aynı seviyenin kural havuzundan, aynı türden.
function kuralCeldiricileri(taban, havuz, rastgele) {
  const dogru = taban.kural;
  const uygun = havuz.filter((k) => k !== dogru);
  const secilen = karistir(uygun, rastgele).slice(0, 3);
  return karistir([dogru, ...secilen], rastgele);
}

// ---------------- Üretim ----------------

function uret() {
  const kayitlar = [];

  for (const seviye of [1, 2, 3]) {
    const tabanlar = SEVIYELER[seviye];
    // Bu seviyede geçen kurallar — çeldirici havuzu (sayı / harf ayrı)
    const sayiHavuzu = [...new Set(tabanlar.filter((t) => !harfMi(t)).map((t) => t.kural))];
    const harfHavuzu = [...new Set(tabanlar.filter(harfMi).map((t) => t.kural))];
    // Harf havuzu tek başına 4 seçeneğe yetmezse yakın harf kurallarıyla beslenir
    const harfEkleri = ['harfler birer', 'harfler ikişer', 'harfler üçer', 'harfler dörder', 'iki harf dizisi iç içe'];
    const tamHarfHavuzu = [...new Set([...harfHavuzu, ...harfEkleri])];

    tabanlar.forEach((taban, sira) => {
      for (const mod of MODLAR) {
        const id = `i${seviye}-${MOD_KISA[mod]}${String(sira + 1).padStart(2, '0')}`;
        const rastgele = tohumla(id);
        const dizi = taban.dizi.map(String);

        let gizliIndeks;
        if (mod === 'surdur') gizliIndeks = dizi.length - 1;
        else if (mod === 'eksik') gizliIndeks = taban.eksikIndeks;
        else gizliIndeks = -1;

        let secenekler;
        if (mod === 'kural') {
          secenekler = kuralCeldiricileri(taban, harfMi(taban) ? tamHarfHavuzu : sayiHavuzu, rastgele);
        } else if (harfMi(taban)) {
          secenekler = harfCeldiricileri(dizi, gizliIndeks, rastgele);
        } else {
          secenekler = sayiCeldiricileri(taban.dizi, gizliIndeks, rastgele).map(String);
        }

        kayitlar.push({
          id,
          grup: 'i',
          tur: taban.tur,
          seviye,
          mod,
          dizi,
          gizliIndeks,
          secenekler,
          kural: taban.kural,
          aciklama: taban.aciklama,
          chc: CHC[taban.tur] || ['Gf'],
        });
      }
    });
  }
  return kayitlar;
}

// ---------------- Dosyaya yaz ----------------

const ham = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
const digerGruplar = ham.oruntuler.filter((o) => o.grup !== 'i');
const yeniI = uret();

// e / i / diğerleri sırası korunsun: e ve kalanlar önce, i sonra
ham.oruntuler = [...digerGruplar, ...yeniI];
fs.writeFileSync(DOSYA, JSON.stringify(ham, null, 2) + '\n', 'utf8');

console.log(`[üretim] i grubu yenilendi: ${yeniI.length} kayıt`);
console.log(`[üretim] dokunulmayan diğer gruplar: ${digerGruplar.length} kayıt`);
console.log(`[üretim] dosya toplamı: ${ham.oruntuler.length}`);
