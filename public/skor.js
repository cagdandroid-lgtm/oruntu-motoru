// Öğrenci ekranındaki skor tablosu ve kapanış sahnesi.
// Bireysel ilerlemede her satır "kaçıncı soruda" bilgisini de taşır;
// kapanışta kişisel özet ve onur rozetleri gösterilir.

const Skor = (() => {
  const $ = (id) => document.getElementById(id);

  function tabloyuCiz(skorlar, benimIsim) {
    const liste = $('skor-liste');
    liste.innerHTML = '';
    skorlar.forEach((o, i) => {
      const benMi = o.isim === benimIsim;
      if (benMi) $('puanim').textContent = o.skor + ' puan';
      const madde = document.createElement('li');
      if (benMi) madde.classList.add('ben');
      const madalya = ['🥇', '🥈', '🥉'][i] || i + 1;
      madde.innerHTML =
        `<span class="sira">${madalya}</span>` +
        `<span class="isim">${kacan(o.isim)}${benMi ? ' (sen)' : ''}</span>` +
        // Bireysel ilerlemede herkes farklı sorudadır
        (o.soruToplam
          ? `<span class="soru-ilerleme${o.bitirdi ? ' bitti' : ''}">${
              o.bitirdi ? '🏁' : `${o.soruSira}/${o.soruToplam}`
            }</span>`
          : '') +
        durumRozeti(o) +
        `<span class="puan">${o.skor} <span class="sr-only">puan</span></span>`;
      liste.appendChild(madde);
    });
  }

  // Kapanış: kişisel özet + iki onur rozeti
  function kapanis({ kisisel, rozetler }) {
    const ozet = kisisel
      ? `<p class="ipucu">Puanın <b>${kisisel.skor}</b> · ${kisisel.dogru}/${kisisel.toplam} doğru (%${kisisel.dogruluk}).</p>`
      : '<p class="ipucu">Skor tablosuna göz at. Öğretmen yeni bir etkinlik başlatabilir. 🎉</p>';
    const rozetListesi =
      rozetler && rozetler.length
        ? `<ul class="rozet-listesi">${rozetler
            .map((r) => `<li><b>${kacan(r.rozet)}</b>${kacan(r.isim)} — ${kacan(r.deger)}</li>`)
            .join('')}</ul>`
        : '';
    return `<h2>🏁 Etkinlik bitti!</h2>${ozet}${rozetListesi}`;
  }

  return { tabloyuCiz, kapanis };
})();
