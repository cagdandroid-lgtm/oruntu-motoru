// Klasik üç modun (Sürdür / Eksiği Bul / Kuralı Yakala) soru çizimi.
// Davranış eskisiyle birebir aynıdır; yalnız kendi modülüne taşındı.
// Yeni dört mod public/mod-ekran.js ve public/mod-kendi.js içindedir.

const ModKlasik = (() => {
  const $ = (id) => document.getElementById(id);

  function diziyiCiz(soru) {
    const alan = $('dizi');
    alan.innerHTML = '';
    soru.dizi.forEach((deger, i) => {
      const hucre = document.createElement('div');
      const gizliMi = i === soru.gizliIndeks;
      const sayisalMi = deger !== null && /^\d+$/.test(String(deger));
      hucre.className = 'hucre' + (gizliMi ? ' gizli-hucre' : '') + (sayisalMi ? ' sayi' : '');
      hucre.textContent = gizliMi ? '?' : deger;
      hucre.style.animationDelay = i * 0.05 + 's';

      if (gizliMi) {
        hucre.id = 'gizli-hucre';
        hucre.addEventListener('dragover', (e) => {
          e.preventDefault();
          hucre.classList.add('suruklenirken');
        });
        hucre.addEventListener('dragleave', () => hucre.classList.remove('suruklenirken'));
        hucre.addEventListener('drop', (e) => {
          e.preventDefault();
          hucre.classList.remove('suruklenirken');
          const secim = e.dataTransfer.getData('text/plain');
          if (secim) cevapGonder(secim);
        });
      }
      alan.appendChild(hucre);
    });
  }

  function secenekleriCiz(soru) {
    const alan = $('secenekler');
    alan.innerHTML = '';
    const metinMi = soru.mod === 'kural';

    for (const secenek of soru.secenekler) {
      const dugme = document.createElement('button');
      dugme.className = 'secenek' + (metinMi ? ' metin' : '');
      dugme.textContent = secenek;
      dugme.dataset.deger = secenek;
      dugme.draggable = !metinMi;

      dugme.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', secenek));
      dugme.addEventListener('click', () => cevapGonder(secenek));
      alan.appendChild(dugme);
    }
  }

  return { diziyiCiz, secenekleriCiz };
})();
