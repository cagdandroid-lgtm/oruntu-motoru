// Geçerli çalışma grupları — TEK kaynak: data/gruplar.json.
// Kodun hiçbir yerinde sabit grup listesi yoktur; kartlar, filtreler ve
// doğrulama bu modülden beslenir.
//
// Geriye dönük uyumluluk (Eylül 2026 birleşmesi) — iki kaynaktan, ikisi de VERİ:
//  1. data/gruplar.json → her grubun "eskiKodlar" alanı (eski grup değeri → yeni grup)
//  2. data/kod_esleme.json → eski öğrenci kodu → yeni kod (kanonik, asla silinmez);
//     eski kodun harfi de yeni grubu gösterdiğinden grup eşlemesi buradan da çıkar.

const fs = require('fs');
const path = require('path');

const VERI = path.join(__dirname, '..', 'data');

function jsonOku(ad) {
  try {
    return JSON.parse(fs.readFileSync(path.join(VERI, ad), 'utf8'));
  } catch (e) {
    console.log(`[gruplar] ⚠️ data/${ad} okunamadı (${e.message})`);
    return null;
  }
}

// ---------- Grup tanımları ----------

const ham = jsonOku('gruplar.json');
const TANIMLAR =
  ham && Array.isArray(ham.gruplar) && ham.gruplar.length
    ? ham.gruplar.map((g) => ({ ...g, kod: String(g.kod).toLowerCase() }))
    : [];
if (!TANIMLAR.length) {
  console.log('[gruplar] 🚨 data/gruplar.json boş ya da yok — hiçbir grup tanımlı değil!');
}
const GRUPLAR = TANIMLAR.map((g) => g.kod);

// ---------- Eski öğrenci kodu → yeni kod ----------

const esleme = jsonOku('kod_esleme.json');
const KOD_ESLEME = {};
for (const e of (esleme && esleme.esleme) || []) {
  if (e && e.eski && e.yeni) KOD_ESLEME[String(e.eski).toUpperCase()] = String(e.yeni).toUpperCase();
}

// ---------- Eski grup değeri → yeni grup ----------

const ESKI = {};
for (const g of TANIMLAR) for (const eski of g.eskiKodlar || []) ESKI[String(eski).toLowerCase()] = g.kod;
// Eşleme tablosundan türet: "C-02 → U-22" ise "c" grubu "u"ya taşınmıştır
for (const [eski, yeni] of Object.entries(KOD_ESLEME)) {
  const eskiHarf = eski.split('-')[0].toLowerCase();
  const yeniHarf = yeni.split('-')[0].toLowerCase();
  if (eskiHarf !== yeniHarf && GRUPLAR.includes(yeniHarf) && !GRUPLAR.includes(eskiHarf)) {
    ESKI[eskiHarf] = ESKI[eskiHarf] || yeniHarf;
  }
}

// Her giriş noktasında kullanılır: küçük harfe çevirir, eski değeri eşler.
function normalize(grup) {
  const g = String(grup || '').trim().toLowerCase();
  return ESKI[g] || g;
}

const gecerliMi = (grup) => GRUPLAR.includes(normalize(grup));
const bilgi = (grup) => TANIMLAR.find((g) => g.kod === normalize(grup)) || null;
const ad = (grup) => (bilgi(grup) || { ad: String(grup) }).ad;

// Eski öğrenci kodu → yeni kod (cihazda kalmış kod, eski CSV, eski liste)
const kodNormalize = (kod) => {
  const k = String(kod || '').trim().toUpperCase();
  return KOD_ESLEME[k] || k;
};

// ogrenciler.json kayıtlarındaki "eski_kod" alanını da eşlemeye katar
function eskiKodlariKaydet(ogrenciler) {
  for (const o of ogrenciler) {
    if (o.eski_kod && o.kod) KOD_ESLEME[String(o.eski_kod).toUpperCase()] = String(o.kod).toUpperCase();
  }
}

module.exports = { TANIMLAR, GRUPLAR, ESKI, normalize, gecerliMi, bilgi, ad, kodNormalize, eskiKodlariKaydet };
