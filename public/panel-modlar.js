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

  const secili = (ad) => (document.querySelector(`input[name="${ad}"]:checked`) || {}).value;

  $('baslat').addEventListener('click', () =>
    gonder('ogretmen:baslat', {
      seviye: Number($('seviye').value),
      modlar: secilenModlar,
      karisik: $('mod-karisik').checked,
      ilerleme: secili('ilerleme'),
      gecis: secili('gecis'),
    })
  );

  // Geçiş kontrolü yalnız senkron modda anlamlıdır
  for (const kutu of document.querySelectorAll('input[name="ilerleme"]')) {
    kutu.addEventListener('change', () =>
      $('gecis-secim').classList.toggle('gizli', secili('ilerleme') === 'bireysel')
    );
  }
  $('onceki-soru').addEventListener('click', () => gonder('ogretmen:oncekiSoru'));
  $('sonraki-soru').addEventListener('click', () => gonder('ogretmen:atla'));
  $('soruya-git').addEventListener('change', (e) => {
    const sira = Number(e.target.value);
    if (sira) gonder('ogretmen:soruyaGit', { sira });
  });

  // Grup/etkinlik seçimi yalnız BOŞTA ve LOBİ'de açıktır
  function secimKilidi(veri) {
    const acik = veri.secimAcik !== false;
    for (const id of ['grup-kartlari', 'ders-etiketi', 'seviye', 'mod-secim', 'oturum-ac']) {
      const el = $(id);
      if (!el) continue;
      el.classList.toggle('kilitli-alan', !acik);
      if ('disabled' in el) el.disabled = !acik;
    }
    for (const ad of ['ilerleme', 'gecis']) {
      for (const k of document.querySelectorAll(`input[name="${ad}"]`)) k.disabled = !acik;
    }
    $('mod-karisik').disabled = !acik;
    $('baslat').disabled = !acik;
    $('secim-kilidi').classList.toggle('gizli', acik);
  }

  // Her panel güncellemesinde çağrılır
  function guncelle(veri) {
    secimKilidi(veri);

    // Aşama rozeti
    const rozet = $('asama-rozeti');
    rozet.textContent = `${veri.emoji || ''} ${veri.ad || ''}`.trim();
    rozet.className = 'rozet asama-' + (veri.asama || 'bosta');
    rozet.title = veri.aciklama || '';

    // İlerleme / geçiş seçimleri sunucudaki değerle eşitlenir
    if (veri.ilerlemeModu) {
      const k = document.querySelector(`input[name="ilerleme"][value="${veri.ilerlemeModu}"]`);
      if (k) k.checked = true;
    }
    if (veri.gecisKontrolu) {
      const k = document.querySelector(`input[name="gecis"][value="${veri.gecisKontrolu}"]`);
      if (k) k.checked = true;
    }
    $('gecis-secim').classList.toggle('gizli', veri.ilerlemeModu === 'bireysel');

    // Öğretmen onaylı geçişte ARA aşamasında uyarı
    $('onay-bekliyor').classList.toggle(
      'gizli',
      !(veri.gecisKontrolu === 'onayli' && veri.asama === 'ara')
    );
    if (veri.modBilgi && Object.keys(modBilgi).length === 0) {
      modBilgi = veri.modBilgi;
      if (veri.ayar && veri.ayar.modlar) secilenModlar = veri.ayar.modlar.slice();
      modSecimiCiz();
    }
    if (veri.ayar && typeof veri.ayar.karisik === 'boolean') {
      $('mod-karisik').checked = veri.ayar.karisik;
    }
    // Soru gezinme YALNIZ senkron ilerlemede ve senkron modda görünür
    const gezinmeAcik =
      veri.senkronMu !== false && veri.ilerlemeModu !== 'bireysel' && veri.toplam > 0;
    $('soru-gezinme').classList.toggle('gizli', !gezinmeAcik);
    const bireyselMi = veri.ilerlemeModu === 'bireysel';
    $('gezinme-notu').classList.toggle(
      'gizli',
      (veri.senkronMu !== false && !bireyselMi) || !veri.toplam
    );
    if (gezinmeAcik) soruSeciciyiTazele(veri.sira, veri.toplam);
    $('onceki-soru').disabled = veri.sira <= 1;
  }

  return { guncelle };
})();
