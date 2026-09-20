// Senkron turda cevap doğrulama, puanlama ve tur kapanışı.
// Bireysel ilerleme lib/bireysel.js'te; soru içeriği lib/modlar.js'te.
// Cevap bilgisi bu dosyanın dışına ASLA sızmaz.

const icerik = require('./oruntu');
const modlar = require('./modlar');

const TUR_ARASI = 6; // doğru cevabın gösterildiği süre (sn)
const TEMEL_PUAN = 100;
const HIZ_BONUSU = [50, 40, 30, 20, 10]; // ilk doğru cevaplayanlara

function cevapVer(oyun, oyuncu, secim) {
  if (oyun.cevaplar.has(oyuncu.anahtar)) return { hata: 'Bu tur için cevabın alındı.' };

  // Doğrulama moda göre yapılır (lib/modlar.js); cevap istemciye sızmaz.
  const sonucVeri = modlar.dogrula(oyun.soru, secim);
  if (!sonucVeri.gecerli) {
    console.log(`[cevap] ${oyuncu.isim} geçersiz cevap gönderdi — ${sonucVeri.hata}`);
    return { hata: sonucVeri.hata };
  }

  const dogruMu = sonucVeri.dogruMu;
  let kazanilan = 0;
  if (typeof sonucVeri.puan === 'number') {
    // Kendi Örüntünü Kur: puan kural tutarlılığına göre kademeli verilir
    kazanilan = sonucVeri.puan + (dogruMu ? HIZ_BONUSU[oyun.dogruSirasi] || 0 : 0);
  } else if (dogruMu) {
    kazanilan = TEMEL_PUAN + (HIZ_BONUSU[oyun.dogruSirasi] || 0);
  }
  if (dogruMu) {
    oyun.dogruSirasi++;
    oyuncu.dogruSayisi++;
  }
  oyuncu.skor += kazanilan;
  oyun.cevaplar.set(oyuncu.anahtar, {
    secim: typeof secim === 'object' ? JSON.stringify(secim) : String(secim),
    dogruMu,
    kazanilan,
    ayrinti: sonucVeri.ayrinti || null,
  });

  // Standart olay kaydı (ölçme ve veri standardı) — isim değil kod yazılır.
  // kategori, modun bildirdiği değerle değiştirilebilir (kendi-tutarli vb.).
  oyun.olcme.ekle({
    soru: sonucVeri.kategori ? { ...oyun.soru, tur: sonucVeri.kategori } : oyun.soru,
    ayar: oyun.ayar,
    oyuncu,
    sonuc: dogruMu ? 'dogru' : 'yanlis',
    sureSn: oyun._gecenSure(),
    deneme: 1, // her soruda tek cevap hakkı vardır
    ipucu: false, // bu oyunda ipucu mekaniği yok
    turNo: oyun.turNo,
  });

  console.log(`[cevap] ${oyuncu.isim} → ${dogruMu ? 'doğru' : 'yanlış'} (+${kazanilan})`);
  oyun.emit('cevapGeldi');

  // Bağlı herkes cevapladıysa turu kapat
  if (oyun.cevaplar.size >= oyun.bagliSayisi && oyun.bagliSayisi > 0) {
    turuKapat(oyun, 'herkes-cevapladi');
  }
  return { tamam: true, dogruMu, kazanilan, ayrinti: sonucVeri.ayrinti || null };
}

function turuKapat(oyun, sebep) {
  // Duraklatılmışken de kapatılabilir (öğretmen önce devam etmek zorunda kalmasın)
  if (oyun.durum !== 'oynaniyor' && oyun.durum !== 'duraklatildi') return;
  if (oyun.bireyselMi) return; // bireysel modda ortak tur yoktur
  oyun._sayaciDurdur();

  // Bağlı olduğu hâlde cevaplamayan öğrenci "atlandi" olarak kaydedilir.
  // Kayıt, durum değişmeden ÖNCE alınır.
  oyun._atlandiKaydet();

  oyun.durum = 'tur-sonu';
  console.log(`[tur] kapandı (${sebep})`);

  // Bu turda dağıtılan puanları geri alınabilir olsun diye sakla
  oyun.sonTurPuanlari = new Map([...oyun.cevaplar].map(([a, c]) => [a, { ...c }]));
  oyun.sonTurNo = oyun.turNo;

  const sonuc = icerik.cevapAcikla(oyun.soru);
  const kisisel = {};
  for (const [anahtar, c] of oyun.cevaplar) kisisel[anahtar] = c;

  oyun.emit('turBitti', {
    sonuc,
    kisisel,
    skorlar: oyun.skorTablosu(),
    sonSoruMu: oyun.soruIndeksi >= oyun.havuz.length - 1,
  });

  // Geçiş kontrolü: "otomatik" ise kısa kutlama arasından sonra sıradaki
  // soru kendiliğinden gelir; "öğretmen onaylı" ise öğretmen başlatana dek beklenir.
  if (oyun.ayar.gecis === 'onayli') {
    console.log('[tur] sıradaki soru öğretmen onayı bekliyor');
    return;
  }
  oyun._araZamanlayici = setTimeout(() => {
    if (oyun.durum === 'tur-sonu') oyun.sonrakiSoru();
  }, TUR_ARASI * 1000);
}

module.exports = { cevapVer, turuKapat, TUR_ARASI, TEMEL_PUAN, HIZ_BONUSU };
