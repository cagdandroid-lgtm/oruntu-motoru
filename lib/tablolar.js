// Skor tabloları. İki ayrı görünüm vardır ve ayrımı korumak ÖNEMLİDİR:
//   skorTablosu  → öğrencilere de yayınlanır; öğrenci KODU burada bulunmaz
//   panelTablosu → yalnız öğretmen odasına gider; kod ve ölçüm sayısı içerir
// Bireysel ilerlemede her satır "kaçıncı soruda" bilgisini de taşır.

const siralaAzalan = (a, b) => b.skor - a.skor || a.isim.localeCompare(b.isim, 'tr');

// "kaçıncı soruda" bilgisi (yalnız bireysel ilerlemede).
// Öğrenci görünümü YALNIZ sırayı taşır — tavansız yolda kimin üst seviyeye
// çıktığı skor tablosundan anlaşılmasın (zorluk gizliliği).
function ilerlemeOzeti(oyun, o) {
  const cozulen = o.ilerleme ? o.ilerleme.cozulen : 0;
  return { soruSira: cozulen + 1 };
}

// Panel görünümü: öğretmen seviyeyi ve tavansız yolda olup olmadığını da görür
function panelIlerlemesi(oyun, o) {
  if (!o.ilerleme) return { soruSira: 1, seviye: oyun.ayar.seviye, tavansiz: false };
  return {
    soruSira: o.ilerleme.cozulen + 1,
    seviye: o.ilerleme.seviye,
    tavansiz: o.ilerleme.indeks >= o.ilerleme.temelUzunluk,
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
      ...(oyun.bireyselMi ? panelIlerlemesi(oyun, o) : {}),
    }))
    .sort(siralaAzalan);
}

module.exports = { skorTablosu, panelTablosu, ilerlemeOzeti, panelIlerlemesi };
