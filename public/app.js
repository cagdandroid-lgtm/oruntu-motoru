// Öğrenci istemcisi. Doğru cevap hiçbir zaman burada bulunmaz; sunucudan gelir.

const soket = io();

const MOD_METNI = {
  surdur: { baslik: '➡️ Örüntüyü Sürdür', aciklama: 'Dizinin bir sonraki adımı hangisi?' },
  eksik: { baslik: '🕳️ Eksiği Bul', aciklama: 'Boş bırakılan hücreye ne gelmeli?' },
  kural: { baslik: '🔍 Kuralı Yakala', aciklama: 'Bu örüntünün kuralı hangisi?' },
};

let benimIsim = '';
let benimKod = localStorage.getItem('oruntu_kod') || '';
let jeton = localStorage.getItem('oruntu_jeton') || '';
let mevcutSoru = null;
let cevapVerdim = false;
let oyundaMiyim = false;

const $ = (id) => document.getElementById(id);
const gorunur = (el, evet) => el.classList.toggle('gizli', !evet);

// ---------------- Giriş: sınıf oturumu modeli ----------------
// Öğrenci isim YAZMAZ ve grup SEÇMEZ. Öğretmen seçim yapana kadar
// ortam animasyonlu bekleme ekranı görünür; seçim yapıldığı an bu ekran
// kendiliğinden AKTİF grubun isim kartlarına döner (yenileme gerekmez).

Ambiyans.baslat('ambiyans');

function girisHatasi(mesaj) {
  const kutu = $('giris-hata');
  kutu.textContent = mesaj;
  gorunur(kutu, true);
  clearTimeout(girisHatasi._z);
  girisHatasi._z = setTimeout(() => gorunur(kutu, false), 5000);
}

// Baş harfli avatar balonu için ilk harf (Türkçe uyumlu)
const basHarf = (isim) => (isim || '?').trim().charAt(0).toLocaleUpperCase('tr');

function kartlariCiz(kartlar) {
  const alan = $('isim-kartlari');
  alan.innerHTML = '';
  if (!kartlar.length) {
    alan.innerHTML = '<p class="lobi-alt">Bu grupta aktif öğrenci yok. Öğretmenine söyle.</p>';
    return;
  }
  kartlar.forEach((k, i) => {
    const kart = document.createElement('button');
    kart.className = 'isim-kart' + (k.oyunda ? ' oyunda' : '');
    kart.style.animationDelay = Math.min(i * 0.04, 0.6) + 's';
    kart.innerHTML =
      `<span class="avatar" aria-hidden="true">${kacan(basHarf(k.isim))}</span>` +
      `<span class="kart-isim"></span>` +
      (k.oyunda ? '<span class="oyunda-rozeti">🎮 oyunda</span>' : '') +
      (k.misafir ? '<span class="misafir-rozeti">✨ misafir</span>' : '');
    kart.querySelector('.kart-isim').textContent = k.isim;
    kart.addEventListener('click', () => katil(k.kod));
    alan.appendChild(kart);
  });
}

function katil(kod) {
  soket.emit('katil', { kod, jeton }, (yanit) => {
    if (yanit && yanit.hata) return girisHatasi('⚠️ ' + yanit.hata);
    oyunaGir(kod, yanit);
    Efekt.katilimSesi();
  });
}

function oyunaGir(kod, yanit) {
  benimIsim = yanit.isim;
  benimKod = kod;
  jeton = yanit.jeton;
  oyundaMiyim = true;
  localStorage.setItem('oruntu_kod', kod);
  localStorage.setItem('oruntu_jeton', jeton);

  $('oyuncu-adi').textContent = '👤 ' + benimIsim;
  $('puanim').textContent = yanit.skor + ' puan';
  Ambiyans.durdur(); // soru/oyun ekranında arka plan animasyonu YOKTUR
  gorunur($('ekran-giris'), false);
  gorunur($('ekran-oyun'), true);
  Tasarim.baslat(soket);
}

function girisEkraninaDon() {
  oyundaMiyim = false;
  gorunur($('ekran-oyun'), false);
  gorunur($('ekran-giris'), true);
  Ambiyans.baslat('ambiyans');
}

// Oturum durumu değiştikçe giriş ekranı kendiliğinden güncellenir.
// Kartlar yalnız paket GERÇEKTEN değişince yeniden çizilir; yoksa her sunucu
// yayınında DOM yenilenir ve öğrencinin dokunuşu boşa düşebilir.
let sonGirisPaketi = '';
soket.on('giris', (paket) => {
  const imza = JSON.stringify(paket);
  if (imza === sonGirisPaketi) return;
  sonGirisPaketi = imza;

  gorunur($('bekleme-lobi'), !paket.acik);
  gorunur($('kart-lobi'), paket.acik);
  if (paket.acik) kartlariCiz(paket.kartlar);
});

// Öğretmen serbest bıraktı ya da oturum grubu değişti: giriş ekranına dönülür
soket.on('cikarildin', (veri) => {
  benimIsim = '';
  benimKod = '';
  localStorage.removeItem('oruntu_kod');
  localStorage.removeItem('oruntu_jeton');
  girisEkraninaDon();
  girisHatasi(
    veri && veri.sebep === 'grup'
      ? 'Öğretmen başka bir gruba geçti. 👋'
      : 'Öğretmen seni listeye geri aldı. İstersen adına yeniden dokun. 🙂'
  );
});

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
  // Öğretmen oturumu kapattıysa öğrenci bekleme ekranına döner
  if (durum.oturumAcik === false && oyundaMiyim) return girisEkraninaDon();

  // Öğretmen "Kendi Örüntünü Kur" bölümünü kapattıysa kart tamamen gizlenir
  const tasarimAcik = durum.tasarimAcik !== false;
  gorunur($('tasarim-karti'), tasarimAcik);
  if (!tasarimAcik) tasarimPaneli(false);

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
  // Bağlantı koptuysa aynı KODLA otomatik geri dön (kilitli kartı jeton açar)
  if (!benimKod) return;
  soket.emit('katil', { kod: benimKod, jeton }, (yanit) => {
    if (yanit && yanit.tamam) oyunaGir(benimKod, yanit);
  });
});
