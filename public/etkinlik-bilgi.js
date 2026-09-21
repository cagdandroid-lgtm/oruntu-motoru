// Öğretmen paneli — "ℹ️ Etkinlik Bilgisi" modalı (CLAUDE.md).
// Üç sekme: KAZANIMLAR · CHC · VELİ ÖZETİ (+ tek tıkla Kopyala).
// Günlük akışta görünmez; yalnız düğmeye basılınca açılır. Öğrencide YOKTUR.

(() => {
  const $ = (id) => document.getElementById(id);
  const pencere = $('etkinlik-bilgi');
  let yuklendi = false;

  const kacir = (m) =>
    String(m == null ? '' : m).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function alanKarti(etiket, a) {
    const dar = (a.dar || []).map((d) => `<code>${kacir(d)}</code>`).join(' ');
    return `<div class="chc-kart"><b>${kacir(etiket)} — ${kacir(a.alan)} · ${kacir(a.ad)}</b>
      <span class="chc-dar">Dar yetenek: ${dar}</span><p>${kacir(a.gerekce)}</p></div>`;
  }

  async function yukle() {
    if (yuklendi) return;
    const yanit = await fetch('/teacher/veri/etkinlik-bilgi');
    const b = await yanit.json();
    if (b.hata) {
      $('bilgi-amac').textContent = '⚠️ ' + b.hata;
      return;
    }
    $('bilgi-amac').innerHTML = `<b>🎯 Amaç:</b> ${kacir(b.amac || '')}`;
    $('bilgi-kazanimlar').innerHTML = (b.kazanimlar || []).map((k) => `<li>${kacir(k)}</li>`).join('');
    const c = b.chc || {};
    $('bilgi-chc').innerHTML =
      (c.birincil ? alanKarti('Birincil', c.birincil) : '') +
      (c.ikincil || []).map((a) => alanKarti('İkincil', a)).join('') +
      (c.gerekce ? `<p class="ipucu">${kacir(c.gerekce)}</p>` : '');
    $('bilgi-veli').textContent = b.veli_ozeti || '';
    yuklendi = true;
  }

  function sekmeAc(ad) {
    for (const s of pencere.querySelectorAll('.sekme')) {
      const acik = s.dataset.sekme === ad;
      s.classList.toggle('secili', acik);
      s.setAttribute('aria-selected', String(acik));
    }
    for (const g of pencere.querySelectorAll('.sekme-govde')) g.classList.toggle('gizli', g.dataset.govde !== ad);
  }

  $('etkinlik-bilgi-ac').addEventListener('click', async () => {
    await yukle();
    sekmeAc('kazanim');
    pencere.showModal();
  });
  $('etkinlik-bilgi-kapat').addEventListener('click', () => pencere.close());
  for (const s of pencere.querySelectorAll('.sekme')) s.addEventListener('click', () => sekmeAc(s.dataset.sekme));

  // WhatsApp veli grubuna yapıştırmak için
  $('veli-kopyala').addEventListener('click', async () => {
    const metin = $('bilgi-veli').textContent;
    try {
      await navigator.clipboard.writeText(metin);
      $('veli-kopyala-durum').textContent = '✅ Kopyalandı';
    } catch {
      // Pano izni yoksa metni seçili bırak; öğretmen Ctrl/Cmd+C ile kopyalar
      const aralik = document.createRange();
      aralik.selectNodeContents($('bilgi-veli'));
      const secim = window.getSelection();
      secim.removeAllRanges();
      secim.addRange(aralik);
      $('veli-kopyala-durum').textContent = 'Metin seçildi — Ctrl/Cmd + C ile kopyala';
    }
    setTimeout(() => ($('veli-kopyala-durum').textContent = ''), 3000);
  });
})();
