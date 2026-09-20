// Skor tabloları. İki ayrı görünüm vardır ve ayrımı korumak ÖNEMLİDİR:
//   skorTablosu  → öğrencilere de yayınlanır; öğrenci KODU burada bulunmaz
//   panelTablosu → yalnız öğretmen odasına gider; kod ve ölçüm sayısı içerir
// Bireysel ilerlemede her satır "kaçıncı soruda" bilgisini de taşır.

const siralaAzalan = (a, b) => b.skor - a.skor || a.isim.localeCompare(b.isim, 'tr');

// "kaçıncı soruda" bilgisi (yalnız bireysel ilerlemede)
function ilerlemeOzeti(oyun, o) {
  if (!o.ilerleme) return { soruSira: 0, soruToplam: oyun.havuz.length, bitirdi: false };
  return {
    soruSira: Math.min(o.ilerleme.indeks + 1, oyun.havuz.length),
    soruToplam: oyun.havuz.length,
    bitirdi: !!o.ilerleme.bitti,
  };
}

const cevapladiMi = (oyun, o, anahtar) =>
  oyun.bireyselMi ? !!(o.ilerleme && o.ilerleme.cevapVerdi) : oyun.cevaplar.has(anahtar);

function skorTablosu(oyun) {
  return [...oyun.oyuncular.values()]
    .map((o) => ({
      isim: o.isim,
      skor: o.skor,
      dogruSayisi: o.dogruSayisi,
      bagli: o.bagli,
      cevapladi: cevapladiMi(oyun, o, o.anahtar),
      ...(oyun.bireyselMi ? ilerlemeOzeti(oyun, o) : {}),
    }))
    .sort(siralaAzalan);
}

function panelTablosu(oyun) {
  // Kayıt sayıları tek geçişte toplanır (her cevapta yeniden yayınlanır)
  const sayilar = new Map();
  for (const k of oyun.olcme.gecerliKayitlar()) {
    sayilar.set(k.anahtar, (sayilar.get(k.anahtar) || 0) + 1);
  }
  return [...oyun.oyuncular.values()]
    .map((o) => ({
      anahtar: o.kod, // panelde düzenleme kimliği = kalıcı öğrenci kodu
      kod: o.kod,
      isim: o.isim,
      grup: o.grup,
      misafir: !!o.misafir,
      kilitli: !!o.kilitli,
      skor: o.skor,
      dogruSayisi: o.dogruSayisi,
      bagli: o.bagli,
      cevapladi: cevapladiMi(oyun, o, o.kod),
      kayitSayisi: sayilar.get(o.kod) || 0,
      ...(oyun.bireyselMi ? ilerlemeOzeti(oyun, o) : {}),
    }))
    .sort(siralaAzalan);
}

module.exports = { skorTablosu, panelTablosu, ilerlemeOzeti };
