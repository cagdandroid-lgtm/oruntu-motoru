// Öğretmen paneli istemcisi. Yetki, sunucu tarafında çerezle doğrulanır.

const soket = io();

const $ = (id) => document.getElementById(id);
const DURUM_METNI = {
  bekliyor: '⏳ Bekliyor',
  oynaniyor: '🎮 Oynanıyor',
  'tur-sonu': '🎉 Tur sonu',
  duraklatildi: '⏸️ Duraklatıldı',
  bitti: '🏁 Bitti',
};

let sonSoru = null;

function bildir(mesaj) {
  $('panel-bildirim').textContent = mesaj;
  setTimeout(() => ($('panel-bildirim').textContent = ''), 3500);
}

function gonder(olay, veri) {
  soket.emit(olay, veri || {}, (yanit) => {
    if (yanit && yanit.hata) bildir('⚠️ ' + yanit.hata);
  });
}

// ---------------- Kontroller ----------------

// Oturum: grup seçimi öğrenci giriş ekranını belirler (öğrenci grup seçmez)
let secilenGrup = null;
let acikOturum = { acik: false, grup: null };

function grupKartlariCiz(gruplar) {
  const alan = $('grup-kartlari');
  alan.innerHTML = '';
  for (const g of gruplar) {
    const kart = document.createElement('button');
    const aktifMi = secilenGrup === g.grup;
    kart.className = 'grup-kart' + (aktifMi ? ' secili' : '') + (acikOturum.grup === g.grup ? ' acik' : '');
    kart.setAttribute('aria-pressed', String(aktifMi));
    kart.innerHTML =
      `<b>${kacan(g.ad)}</b>` +
      `<span class="ipucu">${g.aktif} aktif öğrenci</span>` +
      `<span class="ipucu">${g.soruSayisi ? g.soruSayisi + ' soru' : '⚠️ içerik yok'}</span>` +
      (acikOturum.grup === g.grup ? '<span class="acik-rozeti">🚪 oturum açık</span>' : '');
    kart.addEventListener('click', () => {
      secilenGrup = g.grup;
      grupKartlariCiz(gruplar);
    });
    alan.appendChild(kart);
  }
}

$('oturum-ac').addEventListener('click', () => {
  if (!secilenGrup) return bildir('⚠️ Önce bir grup kartına dokun.');
  gonder('ogretmen:oturumAc', { grup: secilenGrup });
});
$('oturum-kapat').addEventListener('click', () => {
  if (confirm('Oturum kapatılacak; öğrenci ekranları bekleme moduna dönecek. Emin misin?')) {
    gonder('ogretmen:oturumKapat');
  }
});

$('baslat').addEventListener('click', () =>
  gonder('ogretmen:baslat', {
    seviye: Number($('seviye').value),
    mod: $('mod').value,
  })
);
$('duraklat').addEventListener('click', () => gonder('ogretmen:duraklat'));
$('devam').addEventListener('click', () => gonder('ogretmen:devam'));
$('atla').addEventListener('click', () => gonder('ogretmen:atla'));
$('kapat').addEventListener('click', () => gonder('ogretmen:turuKapat'));
$('geri-al').addEventListener('click', () => {
  if (confirm('Bu sorudan dağıtılan puanlar herkesten geri alınacak ve kayıtları analiz dışı bırakılacak. Emin misin?')) {
    soket.emit('ogretmen:puaniGeriAl', {}, (yanit) => {
      if (yanit && yanit.hata) bildir('⚠️ ' + yanit.hata);
      else if (yanit)
        bildir(
          `↩️ ${yanit.oyuncuSayisi} öğrenciden toplam ${yanit.geriAlinan} puan geri alındı` +
            (yanit.iptalEdilenKayit ? ` · ${yanit.iptalEdilenKayit} ölçüm kaydı analiz dışı bırakıldı.` : '.')
        );
    });
  }
});
$('sifirla').addEventListener('click', () => {
  if (confirm('Tüm skorlar sıfırlanacak (ölçüm kayıtları silinmez). Emin misin?'))
    gonder('ogretmen:sifirla');
});

// Öğrenci galerisini öğrencilere aç/kapat
let galeriAcik = false;
$('galeri-gorunurluk').addEventListener('click', () =>
  gonder('ogretmen:galeriGorunurluk', { acik: !galeriAcik })
);

// "Kendi Örüntünü Kur" bölümünü öğrenci ekranında aç/kapat
let tasarimAcik = true;
$('tasarim-gorunurluk').addEventListener('click', () =>
  gonder('ogretmen:tasarimGorunurluk', { acik: !tasarimAcik })
);

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const tus = e.key.toLocaleLowerCase('tr');
  if (tus === 'b') $('baslat').click();
  else if (tus === 'a') $('atla').click();
  else if (tus === 'k') $('kapat').click();
  else if (e.code === 'Space') {
    e.preventDefault();
    $(durumSonu === 'duraklatildi' ? 'devam' : 'duraklat').click();
  }
});

let durumSonu = 'bekliyor';

// ---------------- Sunucu olayları ----------------

soket.on('panel:durum', (veri) => {
  durumSonu = veri.durum;
  $('durum-rozeti').textContent = DURUM_METNI[veri.durum] || veri.durum;
  $('ilerleme-rozeti').textContent = veri.toplam ? `Soru ${veri.sira}/${veri.toplam}` : '—';
  $('ogrenci-sayisi').textContent = veri.oyuncular.length;
  $('cevap-durumu').textContent =
    veri.durum === 'oynaniyor'
      ? `${veri.cevaplayan}/${veri.bagliSayisi} öğrenci cevapladı`
      : `${veri.bagliSayisi} öğrenci sahnede`;

  // Oturum durumu
  acikOturum = veri.oturum || { acik: false, grup: null };
  if (!secilenGrup) secilenGrup = acikOturum.grup;
  grupKartlariCiz(veri.gruplar || []);

  const oturumRozeti = $('oturum-rozeti');
  oturumRozeti.textContent = acikOturum.acik ? `🚪 ${acikOturum.grup} oturumu açık` : '🔒 Oturum kapalı';
  oturumRozeti.classList.toggle('vurgulu', acikOturum.acik);
  $('oturum-ozet').textContent = acikOturum.acik
    ? `${acikOturum.grup} grubu · seviye ${veri.ayar.seviye}`
    : 'grup seç ve oturumu aç';
  $('oturum-durumu').textContent = acikOturum.acik
    ? `✅ Öğrenci ekranlarında ${acikOturum.grup} grubunun isim kartları görünüyor.`
    : 'Oturum kapalıyken öğrenci ekranlarında “Öğretmenini bekle” yazar.';
  $('canli-ozet').textContent = `${veri.bagliSayisi} sahnede · ${veri.oyuncular.length} kayıtlı`;
  $('galeri-ozet').textContent = `${(veri.galeri || []).length} tasarım`;

  galeriAcik = !!veri.galeriAcik;
  const gdugme = $('galeri-gorunurluk');
  gdugme.textContent = galeriAcik ? '👁️ Galeri açık' : '🙈 Galeri kapalı';
  gdugme.setAttribute('aria-pressed', String(galeriAcik));

  tasarimAcik = veri.tasarimAcik !== false;
  const tdugme = $('tasarim-gorunurluk');
  tdugme.textContent = tasarimAcik ? '✏️ Tasarım bölümü açık' : '🚫 Tasarım bölümü kapalı';
  tdugme.setAttribute('aria-pressed', String(tasarimAcik));

  sayaciCiz(veri.kalanSure);
  skorlariCiz(veri.oyuncular);
  galeriyiCiz(veri.galeri);
  // Ölçme kartı ve isim↔kod eşlemesi (public/rapor.js)
  if (window.olcumGuncelle) window.olcumGuncelle(veri.olcum, veri.oyuncular);
});

soket.on('sayac', sayaciCiz);

function sayaciCiz(kalan) {
  const kutu = $('sayac');
  kutu.textContent = sayacMetni(kalan);
  kutu.classList.toggle('acil', kalan !== null && kalan !== undefined && kalan <= 10);
}

soket.on('tur:basladi', ({ soru }) => {
  sonSoru = soru;
  const alan = $('onizleme-dizi');
  alan.innerHTML = '';
  soru.dizi.forEach((deger, i) => {
    const hucre = document.createElement('div');
    hucre.className = 'hucre' + (i === soru.gizliIndeks ? ' gizli-hucre' : '');
    hucre.textContent = i === soru.gizliIndeks ? '?' : deger;
    alan.appendChild(hucre);
  });
  $('onizleme-cevap').textContent = 'Cevap bekleniyor…';
});

// Öğretmene özel: doğru cevap (yalnızca yetkili odaya gönderilir)
soket.on('panel:cevap', ({ dogru, kural, aciklama }) => {
  $('onizleme-cevap').innerHTML = `✅ Doğru cevap: <b>${dogru}</b><br>🔑 ${kural} — ${aciklama}`;
});

function isimDuzenle(o) {
  const yeni = prompt(`"${o.isim}" için yeni isim:`, o.isim);
  if (yeni === null) return;
  gonder('ogretmen:isimDegistir', { anahtar: o.anahtar, yeniIsim: yeni });
}

function puanDuzenle(o) {
  const yeni = prompt(`"${o.isim}" için yeni puan:`, o.skor);
  if (yeni === null) return;
  gonder('ogretmen:puanDegistir', { anahtar: o.anahtar, puan: yeni });
}

// İsmi serbest bırak: kart yeniden seçilebilir olur, puan ve kayıtlar korunur
function serbestBirak(o) {
  if (!confirm(`"${o.isim}" ismi serbest bırakılsın mı?\n\nÖğrenci giriş ekranına döner; puanı ve kayıtları korunur, aynı isme yeniden dokununca kaldığı yerden devam eder.`)) return;
  gonder('ogretmen:serbestBirak', { kod: o.kod });
}

function skorlariCiz(oyuncular) {
  const liste = $('skor-liste');
  liste.innerHTML = '';
  if (!oyuncular.length) {
    liste.innerHTML = '<li><span class="isim">Henüz öğrenci katılmadı.</span></li>';
    return;
  }
  oyuncular.forEach((o, i) => {
    const madde = document.createElement('li');
    const madalya = ['🥇', '🥈', '🥉'][i] || i + 1;
    // İskeleti kur; kullanıcı verisini (isim) textContent ile güvenle yaz
    madde.innerHTML =
      `<span class="sira">${madalya}</span>` +
      `<span class="isim"></span>` +
      `<span class="kod-rozeti" title="Kayıtlarda kullanılan takma ad">${o.kod || '—'}</span>` +
      (o.misafir ? '<span class="misafir-rozeti">✨ misafir</span>' : '') +
      durumRozeti(o) +
      `<span class="puan">${o.skor} <span class="sr-only">puan</span></span>` +
      `<span class="duzen">
         <button class="mini" title="Öğrenci raporu" aria-label="Öğrenci raporu">📊</button>
         <button class="mini" title="İsmi değiştir" aria-label="İsmi değiştir">✏️</button>
         <button class="mini" title="Puanı değiştir" aria-label="Puanı değiştir">🔢</button>
         <button class="mini" title="İsmi serbest bırak" aria-label="İsmi serbest bırak">🔓</button>
       </span>`;
    madde.querySelector('.isim').textContent = o.isim;
    const [raporDugme, isimDugme, puanDugme, serbestDugme] = madde.querySelectorAll('.duzen .mini');
    raporDugme.addEventListener('click', () => window.raporGoster && window.raporGoster(o.anahtar));
    isimDugme.addEventListener('click', () => isimDuzenle(o));
    puanDugme.addEventListener('click', () => puanDuzenle(o));
    serbestDugme.addEventListener('click', () => serbestBirak(o));
    liste.appendChild(madde);
  });
}

function galeriyiCiz(galeri) {
  const alan = $('galeri');
  alan.innerHTML = '';
  if (!galeri || !galeri.length) {
    alan.innerHTML = '<span class="ipucu">Henüz tasarım gönderilmedi.</span>';
    return;
  }
  for (const t of galeri) {
    const kart = document.createElement('div');
    kart.className = 'galeri-kart';
    kart.innerHTML =
      `<b>${kacan(t.isim)}</b> <span class="ipucu">(${kacan(t.grup)} grubu)</span>` +
      `<div class="desen">${t.hucreler.map((h) => `<span>${kacan(h)}</span>`).join('')}</div>` +
      `<div class="satir">
         <button data-gonder="${t.id}">📤 Sınıfa Gönder</button>
         <button class="sade" data-sil="${t.id}">🗑️</button>
       </div>`;
    alan.appendChild(kart);
  }

  alan.querySelectorAll('[data-gonder]').forEach((d) =>
    d.addEventListener('click', () => gonder('ogretmen:tasarimGonder', { id: Number(d.dataset.gonder) }))
  );
  alan.querySelectorAll('[data-sil]').forEach((d) =>
    d.addEventListener('click', () => gonder('ogretmen:tasarimSil', { id: Number(d.dataset.sil) }))
  );
}
