// Öğrenci istemcisi. Doğru cevap hiçbir zaman burada bulunmaz; sunucudan gelir.

const soket = io();

const MOD_METNI = {
  surdur: { baslik: '➡️ Örüntüyü Sürdür', aciklama: 'Dizinin bir sonraki adımı hangisi?' },
  eksik: { baslik: '🕳️ Eksiği Bul', aciklama: 'Boş bırakılan hücreye ne gelmeli?' },
  kural: { baslik: '🔍 Kuralı Yakala', aciklama: 'Bu örüntünün kuralı hangisi?' },
};

let benimIsim = '';
let mevcutSoru = null;
let cevapVerdim = false;

const $ = (id) => document.getElementById(id);
const gorunur = (el, evet) => el.classList.toggle('gizli', !evet);

// ---------------- Giriş ----------------

function katil() {
  const isim = $('isim-girdisi').value.trim();
  if (!isim) {
    $('giris-hata').textContent = 'Lütfen adını yaz.';
    gorunur($('giris-hata'), true);
    return;
  }
  soket.emit('katil', { isim }, (yanit) => {
    if (yanit && yanit.hata) {
      $('giris-hata').textContent = yanit.hata;
      gorunur($('giris-hata'), true);
      return;
    }
    benimIsim = yanit.isim;
    localStorage.setItem('oruntu_isim', benimIsim);
    $('oyuncu-adi').textContent = '👤 ' + benimIsim;
    $('puanim').textContent = yanit.skor + ' puan';
    gorunur($('ekran-giris'), false);
    gorunur($('ekran-oyun'), true);
    Tasarim.baslat(soket);
  });
}

$('katil-dugmesi').addEventListener('click', katil);
$('isim-girdisi').addEventListener('keydown', (e) => { if (e.key === 'Enter') katil(); });

const kayitliIsim = localStorage.getItem('oruntu_isim');
if (kayitliIsim) $('isim-girdisi').value = kayitliIsim;

// ---------------- Ses açma/kapama (tercih hatırlanır) ----------------

function sesiUygula(acik) {
  Efekt.sesiDegistir(acik);
  localStorage.setItem('oruntu_ses', acik ? 'acik' : 'kapali');
  const dugme = $('ses-dugmesi');
  dugme.textContent = acik ? '🔊 Ses açık' : '🔇 Ses kapalı';
  dugme.setAttribute('aria-pressed', String(acik));
}

sesiUygula(localStorage.getItem('oruntu_ses') !== 'kapali');
$('ses-dugmesi').addEventListener('click', () => sesiUygula(!Efekt.sesAcikMi()));

// ---------------- Tasarım panelini aç/kapa (ekranda tek odak) ----------------

function tasarimPaneli(ac) {
  gorunur($('tasarim-govde'), ac);
  $('tasarim-ac').setAttribute('aria-expanded', String(ac));
  $('tasarim-ok').textContent = ac ? 'Kapat ▴' : 'Aç ▾';
}

$('tasarim-ac').addEventListener('click', () =>
  tasarimPaneli($('tasarim-govde').classList.contains('gizli'))
);

// ---------------- Soru çizimi ----------------

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

function cevapGonder(secim) {
  if (cevapVerdim || !mevcutSoru) return;
  cevapVerdim = true;

  document.querySelectorAll('.secenek').forEach((d) => {
    d.disabled = true;
    if (d.dataset.deger === String(secim)) d.classList.add('secildi');
  });

  soket.emit('cevap', { secim }, (yanit) => {
    if (yanit && yanit.hata) {
      cevapVerdim = false;
      document.querySelectorAll('.secenek').forEach((d) => {
        d.disabled = false;
        d.classList.remove('secildi');
      });
      return;
    }
    $('geri-bildirim').innerHTML =
      '<div class="geri-bildirim iyi">✔️ Cevabın alındı, arkadaşlarını bekliyoruz…</div>';
  });
}

// ---------------- Sunucu olayları ----------------

soket.on('tur:basladi', ({ soru, kalanSure }) => {
  mevcutSoru = soru;
  cevapVerdim = false;

  gorunur($('bekleme-karti'), false);
  gorunur($('soru-karti'), true);
  tasarimPaneli(false); // soru gelince tek odak: tasarım paneli kapanır
  $('geri-bildirim').innerHTML = '';
  $('mod-basligi').textContent = MOD_METNI[soru.mod].baslik;
  $('mod-aciklamasi').textContent =
    MOD_METNI[soru.mod].aciklama + (soru.mod === 'surdur' ? ' (seçeneği sürükleyip bırakabilirsin)' : '');
  $('soru-sirasi').textContent = `Soru ${soru.sira}/${soru.toplam}`;

  diziyiCiz(soru);
  secenekleriCiz(soru);
  sayaciGuncelle(kalanSure);
});

soket.on('sayac', sayaciGuncelle);

function sayaciGuncelle(kalan) {
  const kutu = $('sayac');
  if (kalan === null || kalan === undefined) {
    gorunur(kutu, false);
    return;
  }
  gorunur(kutu, true);
  kutu.textContent = sayacMetni(kalan);
  kutu.classList.toggle('acil', kalan <= 10);
}

soket.on('tur:bitti', ({ sonuc, benim }) => {
  gorunur($('sayac'), false);

  // Gizli hücreyi aç
  const gizli = $('gizli-hucre');
  if (gizli && sonuc.gizliIndeks >= 0) {
    gizli.textContent = sonuc.tamDizi[sonuc.gizliIndeks];
    gizli.classList.remove('gizli-hucre');
    gizli.classList.add('acildi');
  }

  // Seçenekleri işaretle — renge ek olarak ✓ / ✗ işareti ve metin etiketi
  document.querySelectorAll('.secenek').forEach((d) => {
    d.disabled = true;
    const metin = d.textContent;
    if (d.dataset.deger === String(sonuc.dogru)) {
      d.classList.add('dogru-secenek');
      d.innerHTML = `<span class="isaret" aria-hidden="true">✓</span>${metin}<span class="sr-only"> (doğru cevap)</span>`;
    } else if (d.classList.contains('secildi')) {
      d.classList.add('yanlis-secenek');
      d.innerHTML = `<span class="isaret" aria-hidden="true">✗</span>${metin}<span class="sr-only"> (senin cevabın, yanlış)</span>`;
    }
  });

  const kuralSatiri = `<span class="kural-metni">🔑 Kural: ${sonuc.kural} — ${sonuc.aciklama}</span>`;

  if (benim && benim.dogruMu) {
    $('geri-bildirim').innerHTML =
      `<div class="geri-bildirim iyi">🎉 Harika! Doğru cevap. +${benim.kazanilan} puan${kuralSatiri}</div>`;
    Efekt.konfeti(70);
    Efekt.dogruSesi();
  } else if (benim) {
    $('geri-bildirim').innerHTML =
      `<div class="geri-bildirim nazik">💙 Bu sefer olmadı, hiç sorun değil! Doğrusu: <b>${sonuc.dogru}</b>${kuralSatiri}</div>`;
    Efekt.yanlisSesi();
  } else {
    $('geri-bildirim').innerHTML =
      `<div class="geri-bildirim nazik">⏰ Süre doldu. Doğrusu: <b>${sonuc.dogru}</b>${kuralSatiri}</div>`;
  }
  cevapVerdim = true;
});

soket.on('skorlar', skorlariCiz);

function skorlariCiz(skorlar) {
  const liste = $('skor-liste');
  liste.innerHTML = '';
  skorlar.forEach((o, i) => {
    if (o.isim === benimIsim) $('puanim').textContent = o.skor + ' puan';
    const madde = document.createElement('li');
    if (o.isim === benimIsim) madde.classList.add('ben');
    const madalya = ['🥇', '🥈', '🥉'][i] || i + 1;
    madde.innerHTML =
      `<span class="sira">${madalya}</span>` +
      `<span class="isim">${kacan(o.isim)}${o.isim === benimIsim ? ' (sen)' : ''}</span>` +
      durumRozeti(o) +
      `<span class="puan">${o.skor} <span class="sr-only">puan</span></span>`;
    liste.appendChild(madde);
  });
}

soket.on('durum', (durum) => {
  if (durum.durum === 'bekliyor' || durum.durum === 'bitti') {
    gorunur($('soru-karti'), false);
    gorunur($('bekleme-karti'), true);
    gorunur($('sayac'), false);
  }
  if (durum.durum === 'duraklatildi') {
    $('mod-aciklamasi').textContent = '⏸️ Öğretmen oyunu duraklattı.';
  }
});

// Sınıf tasarımları galerisi (öğretmen açıp kapatabilir)
soket.on('galeri', ({ acik, tasarimlar }) => {
  gorunur($('ogrenci-galeri-karti'), acik);
  if (!acik) return;
  const alan = $('ogrenci-galeri');
  alan.innerHTML = '';
  if (!tasarimlar.length) {
    alan.innerHTML = '<span class="ipucu">Henüz tasarım paylaşılmadı.</span>';
    return;
  }
  for (const t of tasarimlar) {
    const kart = document.createElement('div');
    kart.className = 'galeri-kart';
    kart.innerHTML =
      `<b>${kacan(t.isim)}</b>` +
      `<div class="desen">${t.hucreler.map((h) => `<span>${kacan(h)}</span>`).join('')}</div>`;
    alan.appendChild(kart);
  }
});

// Öğretmen ismimi değiştirdiyse yerel adı güncelle
soket.on('senin:isim', ({ isim }) => {
  benimIsim = isim;
  localStorage.setItem('oruntu_isim', isim);
  $('oyuncu-adi').textContent = '👤 ' + isim;
});

soket.on('oyun:bitti', () => {
  gorunur($('soru-karti'), false);
  gorunur($('bekleme-karti'), true);
  $('bekleme-karti').innerHTML =
    '<h2>🏁 Tur bitti!</h2><p class="ipucu">Skor tablosuna göz at. Öğretmen yeni bir tur başlatabilir. 🎉</p>';
  Efekt.konfeti(90);
});

soket.on('connect', () => {
  // Bağlantı koptuysa aynı isimle otomatik geri dön
  if (benimIsim) soket.emit('katil', { isim: benimIsim }, () => {});
});
