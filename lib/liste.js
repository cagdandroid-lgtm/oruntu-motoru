// Kalıcı öğrenci listesi (data/ogrenciler.json) ve oturumluk misafirler.
//
// Kodlar dönem boyunca SABİTTİR: ölçüm kayıtlarında öğrencinin adı değil
// bu kod yazılır ve aynı öğrenci her hafta her oyunda aynı kodu alır.
// Panelden yapılan değişiklikler o oturumda anında geçerlidir; kalıcılık
// için öğretmen "Listeyi İndir" ile güncel JSON'u alıp depoya koyar.

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, '..', 'data', 'ogrenciler.json');
const GRUPLAR = ['p', 'e', 'i', 'c'];

const GRUP_ADI = {
  p: 'p grubu',
  e: 'e grubu',
  i: 'i grubu',
  c: 'c grubu',
};

let ogrenciler = []; // kalıcı liste (JSON'dan)
let misafirler = []; // yalnız bu oturum; JSON'a yazılmaz
let aciklama = '';
let misafirSayaci = 0;

function yukle() {
  try {
    const ham = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
    aciklama = ham._aciklama || '';
    ogrenciler = (ham.ogrenciler || []).map(temizle).filter(Boolean);
    console.log(`[liste] ${ogrenciler.length} öğrenci yüklendi (${DOSYA})`);
  } catch (e) {
    ogrenciler = [];
    console.log(`[liste] ⚠️ data/ogrenciler.json okunamadı (${e.message}) — liste boş başlıyor`);
  }
  return ogrenciler.length;
}

function temizle(kayit) {
  const kod = String((kayit && kayit.kod) || '').trim().toUpperCase();
  const isim = String((kayit && kayit.isim) || '').trim();
  const grup = String((kayit && kayit.grup) || '').trim().toLowerCase();
  if (!kod || !isim || !GRUPLAR.includes(grup)) return null;
  return { kod, isim, grup, aktif: kayit.aktif !== false };
}

// ---------------- Sorgular ----------------

const tumu = () => [...ogrenciler, ...misafirler];

function bul(kod) {
  const k = String(kod || '').toUpperCase();
  return tumu().find((o) => o.kod === k) || null;
}

// Öğrenci giriş ekranına gidecek liste: YALNIZ o grubun aktif öğrencileri.
// Başka grupların isimleri ya da sayısı bu paketin dışındadır.
function grupKartlari(grup) {
  return tumu()
    .filter((o) => o.grup === grup && o.aktif)
    .map((o) => ({ kod: o.kod, isim: o.isim, misafir: !!o.misafir }))
    .sort((a, b) => a.isim.localeCompare(b.isim, 'tr'));
}

// ---------------- Düzenleme (oturum içi) ----------------

// Gruba göre boştaki ilk kodu üretir: E-01, E-02 … (mevcut kodlar korunur)
function sonrakiKod(grup) {
  const harf = String(grup).toUpperCase();
  const kullanilan = new Set(tumu().map((o) => o.kod));
  for (let i = 1; i <= 999; i++) {
    const aday = `${harf}-${String(i).padStart(2, '0')}`;
    if (!kullanilan.has(aday)) return aday;
  }
  return null;
}

function ekle({ isim, grup }) {
  const temizIsim = String(isim || '').trim().slice(0, 40);
  const temizGrup = String(grup || '').toLowerCase();
  if (!temizIsim) return { hata: 'İsim boş olamaz.' };
  if (!GRUPLAR.includes(temizGrup)) return { hata: 'Geçersiz grup.' };

  const kod = sonrakiKod(temizGrup);
  if (!kod) return { hata: 'Bu grup için boş kod kalmadı.' };

  const yeni = { kod, isim: temizIsim, grup: temizGrup, aktif: true };
  ogrenciler.push(yeni);
  console.log(`[liste] öğrenci eklendi — ${kod} ${temizIsim} (${temizGrup})`);
  return { tamam: true, ogrenci: yeni };
}

function guncelle(kod, degisiklik) {
  const o = bul(kod);
  if (!o) return { hata: 'Öğrenci bulunamadı.' };
  if (o.misafir) return { hata: 'Misafir kaydı düzenlenemez; çıkarıp yeniden ekleyebilirsin.' };

  if (degisiklik.isim !== undefined) {
    const temizIsim = String(degisiklik.isim).trim().slice(0, 40);
    if (!temizIsim) return { hata: 'İsim boş olamaz.' };
    o.isim = temizIsim;
  }
  if (degisiklik.grup !== undefined) {
    const g = String(degisiklik.grup).toLowerCase();
    if (!GRUPLAR.includes(g)) return { hata: 'Geçersiz grup.' };
    o.grup = g; // kod değişmez — geçmiş kayıtların sürekliliği bozulmaz
  }
  if (degisiklik.aktif !== undefined) o.aktif = !!degisiklik.aktif;

  console.log(`[liste] ${o.kod} güncellendi — ${o.isim} (${o.grup}, ${o.aktif ? 'aktif' : 'pasif'})`);
  return { tamam: true, ogrenci: o };
}

// ---------------- Misafir (yalnız bu oturum) ----------------

function misafirEkle({ isim, grup }) {
  const temizIsim = String(isim || '').trim().slice(0, 40);
  const temizGrup = String(grup || '').toLowerCase();
  if (!temizIsim) return { hata: 'Misafirin adını yaz.' };
  if (!GRUPLAR.includes(temizGrup)) return { hata: 'Önce bir oturum grubu seç.' };

  const kod = `M-${String(++misafirSayaci).padStart(2, '0')}`;
  const misafir = { kod, isim: temizIsim, grup: temizGrup, aktif: true, misafir: true };
  misafirler.push(misafir);
  console.log(`[liste] misafir eklendi — ${kod} ${temizIsim} (${temizGrup} oturumu)`);
  return { tamam: true, ogrenci: misafir };
}

function misafirCikar(kod) {
  const i = misafirler.findIndex((m) => m.kod === String(kod || '').toUpperCase());
  if (i < 0) return { hata: 'Misafir bulunamadı.' };
  const [m] = misafirler.splice(i, 1);
  console.log(`[liste] misafir çıkarıldı — ${m.kod} ${m.isim}`);
  return { tamam: true };
}

// ---------------- Panel görünümü ----------------

// Panelde filtrelenmiş liste (grup, aktif/pasif, isim araması)
function panelListesi({ grup = 'hepsi', durum = 'hepsi', arama = '' } = {}) {
  const q = String(arama).trim().toLocaleLowerCase('tr');
  return tumu()
    .filter((o) => (grup === 'hepsi' ? true : o.grup === grup))
    .filter((o) => (durum === 'hepsi' ? true : durum === 'aktif' ? o.aktif : !o.aktif))
    .filter((o) => (q ? o.isim.toLocaleLowerCase('tr').includes(q) || o.kod.toLocaleLowerCase('tr').includes(q) : true))
    .map((o) => ({ ...o, misafir: !!o.misafir }))
    .sort((a, b) => a.grup.localeCompare(b.grup, 'tr') || a.kod.localeCompare(b.kod, 'tr'));
}

// Grup başına aktif öğrenci sayısı (yalnız panelde görünür)
function grupOzeti() {
  return GRUPLAR.map((g) => ({
    grup: g,
    ad: GRUP_ADI[g],
    aktif: tumu().filter((o) => o.grup === g && o.aktif).length,
    toplam: tumu().filter((o) => o.grup === g).length,
  }));
}

// "Listeyi İndir": güncel ogrenciler.json metni (misafirler dâhil edilmez)
function jsonMetni() {
  return JSON.stringify(
    {
      _aciklama: aciklama,
      guncelleme: new Date().toISOString().slice(0, 10),
      ogrenciler: ogrenciler.map(({ kod, isim, grup, aktif }) => ({ kod, isim, grup, aktif })),
    },
    null,
    2
  );
}

module.exports = {
  yukle,
  tumu,
  bul,
  grupKartlari,
  ekle,
  guncelle,
  misafirEkle,
  misafirCikar,
  panelListesi,
  grupOzeti,
  jsonMetni,
  GRUPLAR,
  GRUP_ADI,
};
