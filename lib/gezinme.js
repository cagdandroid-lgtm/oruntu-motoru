// Tur içi soru gezinme: sonraki / önceki / "şu soruya git" ve atlanan
// sorunun ölçüm kaydı. Öğretmen panelinde bu denetimler YALNIZ senkron
// modlarda görünür; bireysel modda (Kendi Örüntünü Kur) gizlenir.
//
// Cevap doğrulama ve puanlama lib/oyun.js içinde kalır.

const icerik = require('./oruntu');

const SEVIYE_SURESI = { 1: null, 2: null, 3: 30 }; // seviye 3'te süre sınırı zorunlu

function sonrakiSoru(oyun) {
  soruyuGoster(oyun, oyun.soruIndeksi + 1);
}

// Öğretmenin soru gezinmesi — YALNIZ senkron modlarda panelde görünür.
// Atlanan soru, cevaplamamış öğrenciler için "atlandi" olarak kaydedilir.
function oncekiSoru(oyun) {
  if (oyun.soruIndeksi <= 0) return { hata: 'Bu ilk soru.' };
  atlandiKaydet(oyun);
  soruyuGoster(oyun, oyun.soruIndeksi - 1);
  console.log(`[tur] önceki soruya dönüldü → ${oyun.soruIndeksi + 1}/${oyun.havuz.length}`);
  return { tamam: true, sira: oyun.soruIndeksi + 1 };
}

function soruyaGit(oyun, sira) {
  const hedef = Number(sira) - 1; // panelde 1 tabanlı gösterilir
  if (!Number.isInteger(hedef) || hedef < 0 || hedef >= oyun.havuz.length) {
    return { hata: 'Geçersiz soru numarası.' };
  }
  if (hedef === oyun.soruIndeksi) return { tamam: true, sira: hedef + 1 };
  atlandiKaydet(oyun);
  soruyuGoster(oyun, hedef);
  console.log(`[tur] şu soruya gidildi → ${hedef + 1}/${oyun.havuz.length}`);
  return { tamam: true, sira: hedef + 1 };
}

function soruyuGoster(oyun, indeks) {
  oyun._sayaciDurdur();
  oyun.soruIndeksi = indeks;

  if (oyun.soruIndeksi >= oyun.havuz.length) {
    oyun.durum = 'bitti';
    oyun.soru = null;
    console.log('[oyun] tüm sorular bitti');
    oyun.emit('oyunBitti', oyun.skorTablosu());
    return;
  }

  oyun.soru = oyun.havuz[oyun.soruIndeksi];
  oyun.cevaplar = new Map();
  oyun.dogruSirasi = 0;
  oyun.durum = 'oynaniyor';
  oyun.turNo++;
  oyun.soruBaslangic = Date.now();
  oyun.duraklamaToplami = 0; // duraklatılan saniyeler süreye yazılmaz

  const sure = SEVIYE_SURESI[oyun.soru.seviye] ?? null;
  oyun.kalanSure = sure;

  console.log(`[tur] ${oyun.soruIndeksi + 1}/${oyun.havuz.length} — ${oyun.soru.id}`);
  oyun.emit('turBasladi', {
    soru: icerik.istemciIcin(oyun.soru, oyun.soruIndeksi + 1, oyun.havuz.length),
    kalanSure: oyun.kalanSure,
  });

  if (sure) oyun._sayaciBaslat();
}

// Özel soru (öğrenci tasarımı) — havuza sırayı bozmadan araya girer
function ozelSoru(oyun, soru) {
  oyun._sayaciDurdur();
  oyun.havuz.splice(oyun.soruIndeksi + 1, 0, soru);
  sonrakiSoru(oyun);
}

function atla(oyun) {
  if (oyun.durum === 'bitti') return;
  console.log('[tur] öğretmen soruyu atladı');
  atlandiKaydet(oyun);
  sonrakiSoru(oyun);
}

// Cevaplamadan geçilen soruyu, bağlı öğrenciler için "atlandi" kaydeder.
// Aynı tur iki kez kaydedilmez (sayaç turNo üzerinden ilerler).
function atlandiKaydet(oyun) {
  if (oyun.durum !== 'oynaniyor' && oyun.durum !== 'duraklatildi') return 0;
  if (!oyun.soru) return 0;
  const gecen = oyun._gecenSure();
  let sayi = 0;
  for (const oyuncu of oyun.oyuncular.values()) {
    if (!oyuncu.bagli || oyun.cevaplar.has(oyuncu.anahtar)) continue;
    oyun.olcme.ekle({
      soru: oyun.soru,
      ayar: oyun.ayar,
      oyuncu,
      sonuc: 'atlandi',
      sureSn: gecen,
      deneme: 0,
      ipucu: false,
      turNo: oyun.turNo,
    });
    sayi++;
  }
  if (sayi) console.log(`[tur] ${sayi} öğrenci için "atlandi" kaydedildi`);
  return sayi;
}

module.exports = { sonrakiSoru, oncekiSoru, soruyaGit, soruyuGoster, ozelSoru, atla, atlandiKaydet, SEVIYE_SURESI };
