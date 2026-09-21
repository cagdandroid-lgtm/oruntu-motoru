// Bireysel modda öğrenci kontrollü ilerleme (CLAUDE.md "İlerleme ve geçiş"):
//  • Cevaptan sonra geri bildirim, öğrenci "Sonraki soru ▶" diyene kadar kalır.
//  • Bir soruda belirli süre cevap veremeyen öğrenciye onaylı "Pas geç" açılır.
// Senkron modda bu düğmeler HİÇ görünmez; sunucu da isteği reddeder.
// app.js'ten SONRA yüklenir (soket ve olay sırası için).

(() => {
  const $ = (id) => document.getElementById(id);
  const alan = () => $('bireysel-kontrol');
  let pasZamanlayici = null;
  let bireyselSoru = false;

  function temizle() {
    clearTimeout(pasZamanlayici);
    pasZamanlayici = null;
    alan().innerHTML = '';
    alan().classList.add('gizli');
  }

  function goster(icerik) {
    alan().innerHTML = '';
    alan().appendChild(icerik);
    alan().classList.remove('gizli');
  }

  // ---- Pas geç: süre dolunca açılır, onay ister ----
  function pasDugmesi() {
    const d = document.createElement('button');
    d.className = 'uyari pas-gec';
    d.textContent = '⏭ Pas geç';
    d.addEventListener('click', () => {
      if (!confirm('Bu soruyu pas geçmek istiyor musun?\n\nBu soru için puan alamazsın, ama sıradakine geçersin. 🙂')) return;
      d.disabled = true;
      soket.emit('bireysel:pasGec', {}, (yanit) => {
        if (yanit && yanit.hata) {
          d.disabled = false;
          $('geri-bildirim').innerHTML = `<div class="geri-bildirim notr">${kacan(yanit.hata)}</div>`;
        }
      });
    });
    const kutu = document.createElement('div');
    kutu.className = 'bireysel-satir';
    const not = document.createElement('p');
    not.className = 'ipucu';
    not.textContent = 'Takıldın mı? Sorun değil — istersen bu soruyu geçebilirsin.';
    kutu.append(not, d);
    return kutu;
  }

  // ---- Sonraki soru ▶ ----
  function sonrakiDugmesi() {
    const d = document.createElement('button');
    d.className = 'basla sonraki-soru';
    d.textContent = 'Sonraki soru ▶';
    d.addEventListener('click', () => {
      d.disabled = true;
      soket.emit('bireysel:sonraki', {}, (yanit) => {
        if (yanit && yanit.hata) {
          d.disabled = false;
          $('geri-bildirim').insertAdjacentHTML(
            'beforeend',
            `<div class="geri-bildirim notr">${kacan(yanit.hata)}</div>`
          );
        }
      });
    });
    const kutu = document.createElement('div');
    kutu.className = 'bireysel-satir';
    kutu.appendChild(d);
    return kutu;
  }

  soket.on('tur:basladi', ({ soru }) => {
    temizle();
    bireyselSoru = !!(soru && soru.bireysel);
    if (!bireyselSoru) return; // senkron modda hiçbir düğme yok
    const sure = Math.max(1, Number(soru.pasSaniye) || 60);
    pasZamanlayici = setTimeout(() => goster(pasDugmesi()), sure * 1000);
  });

  soket.on('tur:bitti', (veri) => {
    clearTimeout(pasZamanlayici);
    if (!veri || !veri.bireysel) return temizle();
    if (veri.benim && veri.benim.pas) {
      $('geri-bildirim').innerHTML =
        '<div class="geri-bildirim notr">⏭ Bu soruyu pas geçtin — puan yok, sıradakine geçebilirsin. ' +
        `<span class="kural-metni">🔑 Doğrusu: <b>${kacan(veri.sonuc && veri.sonuc.dogru != null ? veri.sonuc.dogru : '')}</b></span></div>`;
    }
    goster(sonrakiDugmesi());
  });

  // Etkinlik bitti / oturum kapandı / çıkarıldı → düğmeler kalkar
  for (const olay of ['oyun:bitti', 'cikarildin']) soket.on(olay, temizle);
})();
