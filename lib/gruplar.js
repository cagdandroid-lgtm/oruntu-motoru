// Geçerli çalışma grupları — tek kaynak: data/gruplar.json.
//
// Geriye dönük uyumluluk: i ve c grupları u grubunda birleşti. Eski bir
// dosyadan, CSV'den ya da istemciden "i"/"c" gelirse burada "u"ya çevrilir;
// kodun geri kalanı yalnız p / e / u bilir.

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, '..', 'data', 'gruplar.json');
const GECIS_DOSYASI = path.join(__dirname, '..', 'data', 'kod-gecisi.json');

// Dosya okunamazsa yine çalışsın diye yedek tanım
const YEDEK = [
  { kod: 'p', ad: 'P Grubu', emoji: '🐣', renk: '#B04A2F', sis: '#F8E6E0' },
  { kod: 'e', ad: 'E Grubu', emoji: '🌱', renk: '#256B4D', sis: '#E2EFE8' },
  { kod: 'u', ad: 'U Grubu', emoji: '🚀', renk: '#4A4AA0', sis: '#E8E7F6', eskiKodlar: ['i', 'c'] },
];

function oku() {
  try {
    const ham = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    if (Array.isArray(ham.gruplar) && ham.gruplar.length) return ham.gruplar;
  } catch (e) {
    console.log(`[gruplar] ⚠️ data/gruplar.json okunamadı (${e.message}) — yedek tanım kullanılıyor`);
  }
  return YEDEK;
}

const TANIMLAR = oku();
const GRUPLAR = TANIMLAR.map((g) => g.kod);

// Eski kod → yeni grup ("i" → "u", "c" → "u")
const ESKI = {};
for (const g of TANIMLAR) for (const eski of g.eskiKodlar || []) ESKI[eski] = g.kod;

// Her giriş noktasında kullanılır: küçük harfe çevirir, eski kodu eşler.
function normalize(grup) {
  const g = String(grup || '').trim().toLowerCase();
  return ESKI[g] || g;
}

const gecerliMi = (grup) => GRUPLAR.includes(normalize(grup));
const bilgi = (grup) => TANIMLAR.find((g) => g.kod === normalize(grup)) || null;
const ad = (grup) => (bilgi(grup) || { ad: String(grup) }).ad;

// Eski öğrenci kodu → yeni kod (I-04 → U-04). Önceki oturum CSV'leri için.
let kodGecisi = {};
try {
  kodGecisi = JSON.parse(fs.readFileSync(GECIS_DOSYASI, 'utf8')).gecis || {};
} catch {
  kodGecisi = {};
}
const kodNormalize = (kod) => {
  const k = String(kod || '').trim().toUpperCase();
  return kodGecisi[k] || k;
};

module.exports = { TANIMLAR, GRUPLAR, ESKI, normalize, gecerliMi, bilgi, ad, kodNormalize };
