// "i" grubu içerik denetimi. Her diziyi KENDİ kuralından bağımsızca yeniden
// hesaplar ve dosyadakiyle karşılaştırır; ayrıca oyun mekaniğinin gerektirdiği
// tüm değişmezleri sınar. Çalıştırma: node araclar/i-dogrula.js

const path = require('path');
const { SEVIYELER, ALFABE } = require('./i-icerik');
const icerik = require('../lib/oruntu');

let hata = 0;
const sorun = (m) => { console.log('  ❌ ' + m); hata++; };
const tamam = (m) => console.log('  ✅ ' + m);

// ---------- Dizileri kuraldan yeniden üret ----------

const H = (h) => ALFABE.indexOf(h);

const URETICILER = {
  artimli: (d, p) => d.map((_, i) => d[0] + p * i),
  carpan: (d, p) => d.map((_, i) => d[0] * Math.pow(p, i)),
  fibonacci: (d) => d.map((_, i) => (i < 2 ? d[i] : null)).reduce((a, v, i) => {
    a.push(i < 2 ? d[i] : a[i - 1] + a[i - 2]); return a;
  }, []),
  farkArtan: (d, [ilk, buyume]) => {
    const r = [d[0]];
    for (let i = 1; i < d.length; i++) r.push(r[i - 1] + ilk + buyume * (i - 1));
    return r;
  },
  kare: (d, bas) => d.map((_, i) => (bas + i) ** 2),
  kareArti: (d, [bas, ek]) => d.map((_, i) => (bas + i) ** 2 + ek),
  ayna: (d) => d.map((_, i) => d[Math.min(i, d.length - 1 - i)]),
  iceIce: (d, [[a0, ad], [b0, bd]]) =>
    d.map((_, i) => (i % 2 === 0 ? a0 + ad * (i / 2) : b0 + bd * ((i - 1) / 2))),
  iceIceKarma: (d, [[a0, ac], [b0, bd]]) =>
    d.map((_, i) => (i % 2 === 0 ? a0 * Math.pow(ac, i / 2) : b0 + bd * ((i - 1) / 2))),
  iceIceCarpan: (d, [[a0, ac], [b0, bc]]) =>
    d.map((_, i) => (i % 2 === 0 ? a0 * Math.pow(ac, i / 2) : b0 * Math.pow(bc, (i - 1) / 2))),
  harfAdim: (d, p) => d.map((_, i) => ALFABE[H(d[0]) + p * i]),
  harfIceIce: (d, [[a0, ad], [b0, bd]]) =>
    d.map((_, i) => (i % 2 === 0 ? ALFABE[a0 + ad * (i / 2)] : ALFABE[b0 + bd * ((i - 1) / 2)])),
};

console.log('▶ Diziler kendi kurallarını gerçekten sağlıyor mu?');
let dogrulanan = 0;
for (const seviye of [1, 2, 3]) {
  for (const taban of SEVIYELER[seviye]) {
    const uretici = URETICILER[taban.dogrula];
    if (!uretici) { sorun(`${taban.kural}: "${taban.dogrula}" doğrulayıcısı yok`); continue; }
    const beklenen = uretici(taban.dizi, taban.p);
    if (JSON.stringify(beklenen) !== JSON.stringify(taban.dizi)) {
      sorun(`s${seviye} "${taban.kural}" ${JSON.stringify(taban.dizi)} ≠ kuraldan üretilen ${JSON.stringify(beklenen)}`);
    } else dogrulanan++;
  }
}
if (!hata) tamam(`${dogrulanan} taban dizinin tamamı kuralıyla birebir tutarlı`);

// ---------- Üretilen kayıtları denetle ----------

icerik.yukle();
const hepsi = icerik.tumu();
const iKayit = hepsi.filter((o) => o.grup === 'i');

console.log('\n▶ Kapsam: her mod × seviye en az 12 kayıt');
for (const s of [1, 2, 3]) {
  for (const m of ['surdur', 'eksik', 'kural']) {
    const n = iKayit.filter((o) => o.seviye === s && o.mod === m).length;
    if (n < 12) sorun(`seviye ${s} / ${m}: yalnız ${n} kayıt`);
  }
}
if (!hata) tamam('9 kombinasyonun hepsinde ≥12 kayıt (14 er)');

console.log('\n▶ İstenen örüntü aileleri her mod ve seviyede var mı?');
const AILELER = {
  'fark artıyor': (o) => o.kural === 'fark artıyor',
  '×2': (o) => o.kural === '×2',
  '×3': (o) => o.kural === '×3',
  'iç içe': (o) => o.tur === 'ic-ice',
  'kare sayılar': (o) => o.kural.startsWith('kare sayılar'),
  harf: (o) => o.tur === 'harf',
};
for (const [ad, sec] of Object.entries(AILELER)) {
  const eksikler = [];
  for (const s of [1, 2, 3]) {
    for (const m of ['surdur', 'eksik', 'kural']) {
      if (!iKayit.some((o) => o.seviye === s && o.mod === m && sec(o))) eksikler.push(`s${s}/${m}`);
    }
  }
  if (eksikler.length) sorun(`"${ad}" şurada yok: ${eksikler.join(', ')}`);
  else tamam(`"${ad}" → 9 kombinasyonun hepsinde var`);
}

console.log('\n▶ Oyun mekaniği değişmezleri');
for (const o of iKayit) {
  const dogru = String(icerik.dogruCevap(o));
  if (!o.secenekler.map(String).includes(dogru)) sorun(`${o.id}: doğru cevap seçenekler arasında yok`);
  if (new Set(o.secenekler.map(String)).size !== o.secenekler.length) sorun(`${o.id}: yinelenen seçenek`);
  if (o.secenekler.length !== 4) sorun(`${o.id}: ${o.secenekler.length} seçenek (4 olmalı)`);
  if (o.mod === 'kural') {
    if (o.gizliIndeks !== -1) sorun(`${o.id}: kural modunda gizliIndeks -1 olmalı`);
  } else {
    if (o.gizliIndeks < 1 || o.gizliIndeks >= o.dizi.length) sorun(`${o.id}: geçersiz gizliIndeks ${o.gizliIndeks}`);
    if (o.mod === 'surdur' && o.gizliIndeks !== o.dizi.length - 1) sorun(`${o.id}: sürdür modunda son hücre gizlenmeli`);
    if (o.mod === 'eksik' && o.gizliIndeks === o.dizi.length - 1) sorun(`${o.id}: eksik modunda son hücre gizlenemez`);
  }
  if (!Array.isArray(o.chc) || !o.chc.length) sorun(`${o.id}: chc etiketi yok`);
}
if (!hata) tamam(`${iKayit.length} kaydın tamamı geçerli (doğru cevap seçenekte, 4 benzersiz seçenek, gizliIndeks tutarlı)`);

console.log('\n▶ Çeldirici kalitesi');
const SEMBOL = /^([+-]\d+|×\d+|fark artıyor|kare sayılar( \+1)?|iki dizi iç içe|ayna \(simetrik\)|son iki sayının toplamı|harfler (birer|ikişer|üçer|dörder)|iki harf dizisi iç içe)$/;
let kuralSayisi = 0;
for (const o of iKayit.filter((x) => x.mod === 'kural')) {
  kuralSayisi++;
  for (const s of o.secenekler) {
    if (!SEMBOL.test(s)) sorun(`${o.id}: "${s}" sembolik kural biçiminde değil`);
  }
  const harfSorusu = o.tur === 'harf';
  for (const s of o.secenekler) {
    const harfKurali = s.startsWith('harf') || s === 'iki harf dizisi iç içe';
    if (harfSorusu !== harfKurali) sorun(`${o.id}: ${harfSorusu ? 'harf' : 'sayı'} sorusuna "${s}" çeldiricisi konmuş`);
  }
}
if (!hata) tamam(`${kuralSayisi} kural sorusunun seçeneklerinin tümü sembolik ve aynı türden`);

// Sürdür/eksik çeldiricileri: emoji ya da sembol sızmamalı (i sayısal ağırlıklı)
for (const o of iKayit.filter((x) => x.mod !== 'kural')) {
  for (const s of o.secenekler.map(String)) {
    const gecerli = /^\d+$/.test(s) || (o.tur === 'harf' && ALFABE.includes(s));
    if (!gecerli) sorun(`${o.id}: "${s}" seçeneği sayı ya da harf değil`);
  }
}

console.log('\n▶ Diğer gruplara dokunulmadı mı?');
const digerleri = hepsi.filter((o) => o.grup !== 'i');
console.log(`  ℹ i dışı kayıt: ${digerleri.length} (e: ${digerleri.filter((o) => o.grup === 'e').length})`);

console.log('\n▶ Zorluk ilerlemesi (e ile karşılaştırma)');
const enBuyuk = (g, s) =>
  Math.max(...hepsi.filter((o) => o.grup === g && o.seviye === s)
    .flatMap((o) => o.dizi.map(Number).filter(Number.isFinite)), 0);
for (const s of [1, 2, 3]) {
  console.log(`  ℹ seviye ${s}: e en büyük sayı ${enBuyuk('e', s)} · i en büyük sayı ${enBuyuk('i', s)}`);
}

console.log(hata ? `\n❌ ${hata} sorun` : '\n✅ tüm denetimler geçti');
process.exit(hata ? 1 : 0);
