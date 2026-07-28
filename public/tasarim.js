// "Kendi Örüntünü Kur" mini modu — 6 hücrelik tasarım aracı.

const Tasarim = (() => {
  const PALET = ['🔺', '🟦', '🔴', '🟡', '🟢', '🟣', '⭐', '🌸', '🍎', '🐟', '1', '2', '3', '4', '5'];
  const hucreler = new Array(6).fill('');
  let aktifIndeks = 0;
  let gonderiliyor = false;

  const izgara = () => document.getElementById('tasarim-izgara');
  const bildirim = () => document.getElementById('tasarim-bildirim');

  function ciz() {
    const alan = izgara();
    alan.innerHTML = '';
    hucreler.forEach((deger, i) => {
      const hucre = document.createElement('div');
      hucre.className = 'tasarim-hucre' + (deger ? ' dolu' : '') + (i === aktifIndeks ? ' aktif' : '');
      hucre.textContent = deger || i + 1;
      hucre.addEventListener('click', () => {
        aktifIndeks = i;
        ciz();
      });
      alan.appendChild(hucre);
    });
  }

  function paletiCiz() {
    const alan = document.getElementById('palet');
    alan.innerHTML = '';
    for (const sembol of PALET) {
      const dugme = document.createElement('button');
      dugme.type = 'button';
      dugme.className = 'sade';
      dugme.textContent = sembol;
      dugme.addEventListener('click', () => {
        hucreler[aktifIndeks] = sembol;
        aktifIndeks = Math.min(5, aktifIndeks + 1);
        Efekt.tikSesi();
        ciz();
      });
      alan.appendChild(dugme);
    }
  }

  function baslat(soket) {
    ciz();
    paletiCiz();

    document.getElementById('tasarim-temizle').addEventListener('click', () => {
      hucreler.fill('');
      aktifIndeks = 0;
      bildirim().textContent = '';
      ciz();
    });

    document.getElementById('tasarim-gonder').addEventListener('click', () => {
      if (gonderiliyor) return;
      if (hucreler.some((h) => !h)) {
        bildirim().textContent = '⚠️ Önce altı hücrenin tamamını doldur.';
        return;
      }
      gonderiliyor = true;
      soket.emit('tasarim:gonder', { hucreler }, (yanit) => {
        gonderiliyor = false;
        if (yanit && yanit.hata) {
          bildirim().textContent = '⚠️ ' + yanit.hata;
          return;
        }
        bildirim().textContent = '✅ Tasarımın öğretmene gönderildi!';
        Efekt.konfeti(30);
      });
    });
  }

  return { baslat };
})();
