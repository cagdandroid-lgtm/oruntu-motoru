// Öğretmen paneli — Öğrenci Listesi yönetim ekranı (data/ogrenciler.json).
// Değişiklikler o oturumda anında geçerlidir; kalıcılık için "Listeyi İndir".

(() => {
  const $ = (id) => document.getElementById(id);
  const GRUP_ADI = { p: 'p grubu', e: 'e grubu', i: 'i grubu', c: 'c grubu' };

  const suzgec = () => ({
    grup: $('liste-grup').value,
    durum: $('liste-durum').value,
    arama: $('liste-arama').value,
  });

  function listeyiTazele() {
    soket.emit('ogretmen:listeGetir', suzgec(), (yanit) => {
      if (!yanit || yanit.hata) return;
      ciz(yanit.ogrenciler);
    });
  }

  function ciz(ogrenciler) {
    const alan = $('ogrenci-liste');
    alan.innerHTML = '';
    $('liste-ozet').textContent = `${ogrenciler.length} kayıt`;

    if (!ogrenciler.length) {
      alan.innerHTML = '<li class="ipucu">Bu süzgece uyan öğrenci yok.</li>';
      return;
    }

    for (const o of ogrenciler) {
      const madde = document.createElement('li');
      madde.className = 'ogrenci-satiri' + (o.aktif ? '' : ' pasif');
      madde.innerHTML =
        `<span class="kod">${kacan(o.kod)}</span>` +
        `<span class="ad"></span>` +
        `<span class="grup-rozeti">${kacan(GRUP_ADI[o.grup] || o.grup)}</span>` +
        (o.misafir ? '<span class="misafir-rozeti">✨ misafir</span>' : '') +
        `<span class="durum ${o.aktif ? 'cevapladi' : 'kopuk'}">${o.aktif ? '✅ aktif' : '⏸️ pasif'}</span>` +
        `<span class="duzen">
           <button class="mini" title="İsmi düzenle" aria-label="İsmi düzenle">✏️</button>
           <button class="mini" title="Grubunu değiştir" aria-label="Grubunu değiştir">🔀</button>
           <button class="mini" title="${o.aktif ? 'Pasifleştir' : 'Aktifleştir'}"
                   aria-label="${o.aktif ? 'Pasifleştir' : 'Aktifleştir'}">${o.aktif ? '⏸️' : '▶️'}</button>
         </span>`;
      madde.querySelector('.ad').textContent = o.isim;

      const [isimDugme, grupDugme, durumDugme] = madde.querySelectorAll('.duzen .mini');

      if (o.misafir) {
        // Misafir kaydı düzenlenmez; yalnız oturumdan çıkarılır
        isimDugme.remove();
        grupDugme.remove();
        durumDugme.textContent = '🗑️';
        durumDugme.title = 'Misafiri çıkar';
        durumDugme.setAttribute('aria-label', 'Misafiri çıkar');
        durumDugme.addEventListener('click', () => {
          if (confirm(`"${o.isim}" misafiri oturumdan çıkarılsın mı?`)) {
            gonder('ogretmen:misafirCikar', { kod: o.kod });
            setTimeout(listeyiTazele, 120);
          }
        });
      } else {
        isimDugme.addEventListener('click', () => {
          const yeni = prompt(`"${o.isim}" için yeni isim:`, o.isim);
          if (yeni === null) return;
          guncelle(o.kod, { isim: yeni });
        });
        grupDugme.addEventListener('click', () => {
          const yeni = prompt(`"${o.isim}" hangi gruba taşınsın? (p / e / i / c)\n\nKodu (${o.kod}) DEĞİŞMEZ — geçmiş kayıtların sürekliliği korunur.`, o.grup);
          if (yeni === null) return;
          guncelle(o.kod, { grup: String(yeni).trim().toLowerCase() });
        });
        durumDugme.addEventListener('click', () => guncelle(o.kod, { aktif: !o.aktif }));
      }
      alan.appendChild(madde);
    }
  }

  function guncelle(kod, degisiklik) {
    soket.emit('ogretmen:listeGuncelle', { kod, degisiklik }, (yanit) => {
      if (yanit && yanit.hata) return bildir('⚠️ ' + yanit.hata);
      listeyiTazele();
    });
  }

  // ---------------- Süzgeçler ----------------

  $('liste-grup').addEventListener('change', listeyiTazele);
  $('liste-durum').addEventListener('change', listeyiTazele);
  let aramaZamani = null;
  $('liste-arama').addEventListener('input', () => {
    clearTimeout(aramaZamani);
    aramaZamani = setTimeout(listeyiTazele, 180);
  });

  // ---------------- Ekleme ----------------

  $('yeni-ekle').addEventListener('click', () => {
    const isim = $('yeni-isim').value.trim();
    if (!isim) return bildir('⚠️ Önce öğrencinin adını yaz.');
    soket.emit('ogretmen:listeEkle', { isim, grup: $('yeni-grup').value }, (yanit) => {
      if (yanit && yanit.hata) return bildir('⚠️ ' + yanit.hata);
      $('yeni-isim').value = '';
      bildir(`➕ ${yanit.ogrenci.isim} eklendi — kodu ${yanit.ogrenci.kod}. Kalıcı olması için listeyi indir.`);
      listeyiTazele();
    });
  });

  $('misafir-ekle').addEventListener('click', () => {
    const isim = $('misafir-isim').value.trim();
    if (!isim) return bildir('⚠️ Misafirin adını yaz.');
    soket.emit('ogretmen:misafirEkle', { isim }, (yanit) => {
      if (yanit && yanit.hata) return bildir('⚠️ ' + yanit.hata);
      $('misafir-isim').value = '';
      bildir(`✨ ${yanit.ogrenci.isim} misafir olarak eklendi — kodu ${yanit.ogrenci.kod}.`);
      listeyiTazele();
    });
  });

  [$('yeni-isim'), $('misafir-isim')].forEach((girdi) =>
    girdi.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      (girdi.id === 'yeni-isim' ? $('yeni-ekle') : $('misafir-ekle')).click();
    })
  );

  $('liste-indir').addEventListener('click', () => {
    const bag = document.createElement('a');
    bag.href = '/teacher/veri/liste.json';
    bag.download = 'ogrenciler.json';
    document.body.appendChild(bag);
    bag.click();
    bag.remove();
    bildir('⬇️ ogrenciler.json indiriliyor — depoya koyup push etmeyi unutma.');
  });

  // Panel yayını listeyi kendiliğinden tazelemez (sorgu → yayın → sorgu
  // geri besleme döngüsünü önler); tazeleme süzgeç, düzenleme ve bölüm
  // açılışında yapılır.
  $('bolum-liste').addEventListener('toggle', () => {
    if ($('bolum-liste').open) listeyiTazele();
  });
})();
