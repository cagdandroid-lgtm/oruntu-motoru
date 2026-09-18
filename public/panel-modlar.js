// Öğretmen paneli — mod seçimi (birden çok mod, "mod karışık") ve soru
// gezinme (önceki / sonraki / şu soruya git). Gezinme denetimleri YALNIZ
// senkron modda görünür; bireysel modda gizlenir.
// teacher.js içindeki `soket`, `gonder` ve `bildir` bağlantılarını kullanır.

const PanelModlar = (() => {
  const $ = (id) => document.getElementById(id);
  let modBilgi = {};
  let secilenModlar = ['surdur'];
  let sonSeciciToplam = 0;

  function modSecimiCiz() {
    const alan = $('mod-secim');
    alan.innerHTML = '';
    for (const [anahtar, bilgi] of Object.entries(modBilgi)) {
      const etiket = document.createElement('label');
      etiket.className = 'mod-kutu' + (secilenModlar.includes(anahtar) ? ' secili' : '');
      const kutu = document.createElement('input');
      kutu.type = 'checkbox';
      kutu.value = anahtar;
      kutu.checked = secilenModlar.includes(anahtar);
      // Liste baştan çizilmez; yalnız ilgili kutunun görünümü güncellenir
      // (yeniden çizim, tıklanan düğümü DOM'dan koparıyordu).
      kutu.addEventListener('change', () => {
        if (!kutu.checked && secilenModlar.length === 1) {
          kutu.checked = true;
          return bildir('⚠️ En az bir mod seçili kalmalı.');
        }
        secilenModlar = kutu.checked
          ? [...new Set([...secilenModlar, anahtar])]
          : secilenModlar.filter((m) => m !== anahtar);
        etiket.classList.toggle('secili', kutu.checked);
      });
      const metin = document.createElement('span');
      metin.textContent = `${bilgi.emoji} ${bilgi.ad}`;
      etiket.append(kutu, metin);
      if (!bilgi.senkron) {
        const rozet = document.createElement('span');
        rozet.className = 'bireysel-rozeti';
        rozet.textContent = '👤 bireysel';
        etiket.appendChild(rozet);
      }
      alan.appendChild(etiket);
    }
  }

  // "Şu soruya git" seçicisi — havuz değiştikçe yeniden kurulur
  function soruSeciciyiTazele(sira, toplam) {
    const secici = $('soruya-git');
    if (toplam !== sonSeciciToplam) {
      sonSeciciToplam = toplam;
      secici.innerHTML = '';
      for (let i = 1; i <= toplam; i++) {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = `${i}. soru`;
        secici.appendChild(o);
      }
    }
    secici.value = String(sira);
  }

  $('baslat').addEventListener('click', () =>
    gonder('ogretmen:baslat', {
      seviye: Number($('seviye').value),
      modlar: secilenModlar,
      karisik: $('mod-karisik').checked,
    })
  );
  $('onceki-soru').addEventListener('click', () => gonder('ogretmen:oncekiSoru'));
  $('sonraki-soru').addEventListener('click', () => gonder('ogretmen:atla'));
  $('soruya-git').addEventListener('change', (e) => {
    const sira = Number(e.target.value);
    if (sira) gonder('ogretmen:soruyaGit', { sira });
  });

  // Her panel güncellemesinde çağrılır
  function guncelle(veri) {
    if (veri.modBilgi && Object.keys(modBilgi).length === 0) {
      modBilgi = veri.modBilgi;
      if (veri.ayar && veri.ayar.modlar) secilenModlar = veri.ayar.modlar.slice();
      modSecimiCiz();
    }
    if (veri.ayar && typeof veri.ayar.karisik === 'boolean') {
      $('mod-karisik').checked = veri.ayar.karisik;
    }
    const gezinmeAcik = veri.senkronMu !== false && veri.toplam > 0;
    $('soru-gezinme').classList.toggle('gizli', !gezinmeAcik);
    $('gezinme-notu').classList.toggle('gizli', veri.senkronMu !== false || !veri.toplam);
    if (gezinmeAcik) soruSeciciyiTazele(veri.sira, veri.toplam);
    $('onceki-soru').disabled = veri.sira <= 1;
  }

  return { guncelle };
})();
