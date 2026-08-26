// Öğretmen paneli — ölçme, CSV dışa aktarım ve karne arayüzü.
// teacher.js içindeki `soket` ve `bildir` bağlantılarını kullanır.

(() => {
  const $ = (id) => document.getElementById(id);
  const pencere = $('rapor-pencere');
  let acikRapor = null;
  let disaAktarildiMi = false;
  let kayitSayisi = 0;

  const kacir = (m) =>
    String(m === null || m === undefined ? '' : m).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  // ---------------- CSV ve karne indirmeleri ----------------

  const yeniSekme = (adres) => window.open(adres, '_blank', 'noopener');

  function csvIndir(isimli) {
    if (!kayitSayisi) return bildir('⚠️ Henüz kaydedilmiş cevap yok.');
    // Gizli bağlantı: tarayıcı dosyayı sunucudan indirir (yetki çerezle doğrulanır)
    const bag = document.createElement('a');
    bag.href = '/teacher/veri/csv?ad=' + (isimli ? 'isimli' : 'kodlu');
    bag.download = '';
    document.body.appendChild(bag);
    bag.click();
    bag.remove();
    disaAktarildiMi = true;
    hatirlatmayiTazele();
    bildir(isimli ? '👪 İsimli CSV indiriliyor…' : '🔬 Kodlu CSV indiriliyor…');
  }

  $('csv-kodlu').addEventListener('click', () => csvIndir(false));
  $('csv-isimli').addEventListener('click', () => csvIndir(true));

  $('tum-karneler').addEventListener('click', () => {
    yeniSekme('/teacher/veri/karneler');
    disaAktarildiMi = true;
    hatirlatmayiTazele();
  });

  // ---------------- Önceki oturum CSV'si ----------------

  $('onceki-csv').addEventListener('change', (olay) => {
    const dosya = olay.target.files && olay.target.files[0];
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = async () => {
      try {
        const yanit = await fetch('/teacher/veri/onceki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: String(okuyucu.result), dosya: dosya.name }),
        });
        const sonuc = await yanit.json();
        if (sonuc.hata) bildir('⚠️ ' + sonuc.hata);
        else bildir(`📂 Önceki oturum yüklendi — ${sonuc.ogrenciSayisi} öğrenci eşleşti.`);
      } catch (e) {
        bildir('⚠️ Dosya yüklenemedi.');
      }
      olay.target.value = '';
    };
    okuyucu.readAsText(dosya, 'utf-8');
  });

  $('onceki-sil').addEventListener('click', async () => {
    await fetch('/teacher/veri/onceki-sil', { method: 'POST' });
    bildir('✖️ Önceki oturum karşılaştırması kaldırıldı.');
  });

  $('olcum-temizle').addEventListener('click', () => {
    if (!confirm('Bu oturumun TÜM ölçüm kayıtları silinecek. Önce CSV indirdin mi?')) return;
    soket.emit('ogretmen:olcumTemizle', {}, (yanit) => {
      if (yanit && yanit.hata) return bildir('⚠️ ' + yanit.hata);
      disaAktarildiMi = false;
      bildir(`🗑️ ${(yanit && yanit.silinen) || 0} kayıt silindi.`);
    });
  });

  // ---------------- Panel durumu ----------------

  function hatirlatmayiTazele() {
    // Ders sonunda ya da kayıt biriktikçe "raporu indir" hatırlatması
    const gorunsun = kayitSayisi > 0 && !disaAktarildiMi;
    $('veri-hatirlatma').classList.toggle('gizli', !gorunsun);
  }

  window.olcumGuncelle = (olcum, oyuncular) => {
    if (!olcum) return;
    kayitSayisi = olcum.kayitSayisi;
    if (olcum.sonDisaAktarim) disaAktarildiMi = true;
    $('kayit-rozeti').textContent = `${kayitSayisi} kayıt`;
    hatirlatmayiTazele();

    const durum = $('onceki-durum');
    if (olcum.onceki) {
      durum.textContent = `📂 Karşılaştırma açık: “${olcum.onceki.kaynak}” (${olcum.onceki.ogrenciSayisi} öğrenci). Karnelerde “geçen oturuma göre değişim” satırı görünecek.`;
      $('onceki-sil').classList.remove('gizli');
    } else {
      durum.textContent =
        'Önceki oturumun CSV’sini yüklersen karnede “geçen oturuma göre değişim” satırı görünür.';
      $('onceki-sil').classList.add('gizli');
    }

    kodListesiCiz(oyuncular || []);
    if (acikRapor) raporTazele(acikRapor);
  };

  function kodListesiCiz(oyuncular) {
    const liste = $('kod-liste');
    liste.innerHTML = '';
    if (!oyuncular.length) {
      liste.innerHTML = '<li class="ipucu">Henüz öğrenci katılmadı.</li>';
      return;
    }
    [...oyuncular]
      .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'))
      .forEach((o) => {
        const madde = document.createElement('li');
        madde.innerHTML = `<b class="kod">${kacir(o.kod)}</b> <span class="ad"></span>
          <span class="ipucu">${o.kayitSayisi} kayıt</span>`;
        madde.querySelector('.ad').textContent = o.isim;
        liste.appendChild(madde);
      });
  }

  // ---------------- Öğrenci Raporu ekranı ----------------

  window.raporGoster = (anahtar) => {
    acikRapor = anahtar;
    raporTazele(anahtar, true);
  };

  function raporTazele(anahtar, ac = false) {
    soket.emit('ogretmen:rapor', { anahtar }, (yanit) => {
      if (!yanit || yanit.hata) {
        acikRapor = null;
        return bildir('⚠️ ' + ((yanit && yanit.hata) || 'Rapor alınamadı.'));
      }
      raporCiz(yanit.rapor);
      if (ac && !pencere.open) pencere.showModal();
    });
  }

  const sureMetni = (sn) => (sn === null || sn === undefined ? '—' : `${sn} sn`);

  function raporCiz(r) {
    $('rapor-baslik').textContent = `📋 ${r.isim} — Öğrenci Raporu`;
    $('rapor-karne').onclick = () =>
      yeniSekme('/teacher/veri/karne?anahtar=' + encodeURIComponent(r.anahtar));

    const kutu = (sayi, ad) =>
      `<div class="rapor-kutu"><span class="sayi">${kacir(sayi)}</span><span class="ad">${ad}</span></div>`;

    const kategoriler = r.kategoriler.length
      ? r.kategoriler
          .map(
            (k) => `<tr>
              <td>${kacir(k.etiket)}</td>
              <td class="say">${k.dogru}/${k.toplam}</td>
              <td class="oran"><span class="cubuk"><span class="dolu" style="width:${k.yuzde}%"></span></span> <b>%${k.yuzde}</b></td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="3" class="ipucu">Bu oturumda kayıtlı görev yok.</td></tr>';

    const chc = r.chcDokumu.length
      ? r.chcDokumu.map((c) => `<span class="chc-etiket">${kacir(c.alan)} · %${c.yuzde}</span>`).join(' ')
      : '<span class="ipucu">—</span>';

    const degisim = r.degisim
      ? `<p class="degisim-satiri">${
          r.degisim.dogrulukFarki > 0 ? '▲' : r.degisim.dogrulukFarki < 0 ? '▼' : '▬'
        } <b>Geçen oturuma göre:</b> %${r.degisim.oncekiDogruluk} → %${r.dogrulukYuzdesi}
        (${Math.abs(r.degisim.dogrulukFarki)} puan)${
          r.degisim.sureFarki === null
            ? ''
            : ` · ortalama süre ${Math.abs(r.degisim.sureFarki)} sn ${
                r.degisim.sureFarki < 0 ? 'kısaldı' : 'uzadı'
              }`
        } <span class="ipucu">(${kacir(r.degisim.kaynak)})</span></p>`
      : '';

    $('rapor-govde').innerHTML = `
      <p class="ipucu">Kod: <b>${kacir(r.kod)}</b> · Oyun puanı: <b>${r.skor}</b> ·
        Ulaşılan kademe: <b>${kacir(r.ulasilanKademe)}</b></p>
      <div class="rapor-kutular">
        ${kutu('%' + r.dogrulukYuzdesi, 'Genel doğruluk')}
        ${kutu(`${r.dogru}/${r.toplam}`, 'Doğru cevap')}
        ${kutu(sureMetni(r.ortalamaSureSn), 'Ortalama süre')}
        ${kutu(r.enUzunSeri, 'En uzun seri')}
      </div>
      ${degisim}
      <h3 class="alt-baslik">Kategori bazlı doğruluk</h3>
      <table class="rapor-dokum">
        <thead><tr><th>Örüntü türü</th><th class="say">Doğru</th><th>Başarı</th></tr></thead>
        <tbody>${kategoriler}</tbody>
      </table>
      <h3 class="alt-baslik">CHC dağılımı <span class="ipucu-satir">— yalnız öğretmene görünür</span></h3>
      <p class="chc-satir">${chc}</p>
      <p class="ipucu">Yanlış: ${r.yanlis} · Cevapsız: ${r.atlandi}</p>`;
  }

  $('rapor-kapat').addEventListener('click', () => pencere.close());
  pencere.addEventListener('close', () => (acikRapor = null));

  // Ders bitince hatırlatmayı öne çıkar
  soket.on('oyun:bitti', () => {
    hatirlatmayiTazele();
    if (kayitSayisi && !disaAktarildiMi) {
      bildir('📥 Ders bitti — raporu indirmeyi unutma! (Veri yalnızca bellekte tutulur.)');
      $('olcme-karti').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Panel kapanmadan önce indirilmemiş veri uyarısı
  window.addEventListener('beforeunload', (olay) => {
    if (kayitSayisi && !disaAktarildiMi) {
      olay.preventDefault();
      olay.returnValue = '';
    }
  });
})();
