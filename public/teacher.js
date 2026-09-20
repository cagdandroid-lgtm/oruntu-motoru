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
    // Grup rengi kartın üst şeridine ve seçili zemine yansır (data/gruplar.json)
    if (g.renk) kart.style.setProperty('--grup-renk', g.renk);
    if (g.sis) kart.style.setProperty('--grup-sis', g.sis);
    kart.innerHTML =
      `<span class="grup-emoji" aria-hidden="true">${kacan(g.emoji || '')}</span>` +
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
  const etiket = $('ders-etiketi').value.trim();
  if (!etiket && !confirm('Ders etiketi boş. Etiketsiz devam edilsin mi?\n\n(Etiket kayıtlarda ve karne başlığında görünür; sonradan oturumu yeniden açarak eklenebilir.)')) return;
  gonder('ogretmen:oturumAc', { grup: secilenGrup, etiket });
});
$('oturum-kapat').addEventListener('click', () => {
  if (confirm('Oturum kapatılacak; öğrenci ekranları bekleme moduna dönecek. Emin misin?')) {
    gonder('ogretmen:oturumKapat');
  }
});

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
// ⏹ Etkinliği Bitir — grup/etkinlik değiştirmenin tek yolu (onaylı)
$('etkinligi-bitir').addEventListener('click', () => {
  if (!confirm('Etkinlik bitirilsin mi?\n\nOturum kapanır, öğrenci cihazları bekleme ekranına döner ve kayıtlı isimleri silinir. Ölçüm kayıtları korunur (CSV\'yi indirmeyi unutma).')) return;
  gonder('ogretmen:etkinligiBitir');
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
let sonAsama = {}; // panel:durum'dan gelen aşama/ilerleme özeti
let sonSunucuEtiketi = null; // ders etiketi kutusunun son eşitlendiği değer

// ---------------- Sunucu olayları ----------------

soket.on('panel:durum', (veri) => {
  durumSonu = veri.durum;
  sonAsama = veri;
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
  const acikGrup = (veri.gruplar || []).find((g) => g.grup === acikOturum.grup);
  const grupAdi = acikGrup ? `${acikGrup.emoji} ${acikGrup.ad}` : acikOturum.grup;
  oturumRozeti.textContent = acikOturum.acik ? `🚪 ${grupAdi} oturumu açık` : '🔒 Oturum kapalı';
  oturumRozeti.classList.toggle('vurgulu', acikOturum.acik);
  const ders = acikOturum.dersEtiketi || '';
  // Kutu yalnız sunucudaki etiket DEĞİŞTİĞİNDE eşitlenir: böylece oturum
  // açılınca temizlenmiş hâli (dış tırnaksız) görünür, ama öğretmenin henüz
  // göndermediği yeni bir etiket her panel güncellemesinde silinmez.
  const dersKutusu = $('ders-etiketi');
  if (ders !== sonSunucuEtiketi) {
    sonSunucuEtiketi = ders;
    if (document.activeElement !== dersKutusu) dersKutusu.value = ders;
  }

  $('oturum-ozet').textContent = acikOturum.acik
    ? `${grupAdi} · seviye ${veri.ayar.seviye}` + (ders ? ` · ${ders}` : '')
    : 'grup seç ve oturumu aç';
  $('oturum-durumu').textContent = acikOturum.acik
    ? `✅ Öğrenci ekranlarında ${grupAdi} isim kartları görünüyor.` +
      // Etiket tırnağa alınmaz: etiket kendi tırnağını içerse iç içe görünüyordu
      (ders ? ` 🏷️ Ders etiketi: ${ders}` : ' Ders etiketi girilmedi.')
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

  // Mod seçimi ve soru gezinme (public/panel-modlar.js)
  PanelModlar.guncelle(veri);

  // BOŞTA/LOBİ'de önceki turun sorusu ve cevabı panelde asılı kalmasın
  if (veri.asama === 'bosta' || veri.asama === 'lobi') {
    $('onizleme-dizi').innerHTML = '<span class="ipucu">Henüz tur başlamadı.</span>';
    $('onizleme-cevap').textContent = '';
    sonSoru = null;
  }

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

  if (sonAsama.ilerlemeModu === 'bireysel') {
    alan.innerHTML =
      '<span class="ipucu">👤 Bireysel ilerleme — her öğrenci farklı soruda. Kimin kaçıncı soruda olduğu sağdaki listede görünür.</span>';
    $('onizleme-cevap').textContent = '';
    return;
  }
  if (soru.mod === 'kendi') {
    alan.innerHTML = '<span class="ipucu">🎨 Öğrenciler kendi örüntülerini kuruyor — hazır dizi yok.</span>';
  } else {
    soru.dizi.forEach((deger, i) => {
      const hucre = document.createElement('div');
      const gizliMi = i === soru.gizliIndeks;
      hucre.className = 'hucre' + (gizliMi ? ' gizli-hucre' : '');
      hucre.textContent = gizliMi ? '?' : deger === null ? '' : deger;
      alan.appendChild(hucre);
    });
    if (soru.mod === 'uzak') {
      const hedef = document.createElement('div');
      hedef.className = 'hucre gizli-hucre';
      hedef.textContent = `${soru.hedefTerim}.?`;
      alan.append(Object.assign(document.createElement('div'), { className: 'hucre', textContent: '…' }), hedef);
    }
  }
  $('onizleme-cevap').textContent = 'Cevap bekleniyor…';
});

// Öğretmene özel: doğru cevap (yalnızca yetkili odaya gönderilir)
soket.on('panel:cevap', ({ dogru, kural, aciklama, mod, bozukIndeks, dogruDeger }) => {
  let satir;
  if (mod === 'kendi') {
    // Hazır cevabı olmayan bireysel mod: puan kural tutarlılığına göre verilir
    satir = '🎨 Hazır cevap yok — puan, öğrencinin kurduğu dizinin tek kurallı olmasına göre verilir.';
  } else if (mod === 'hata') {
    satir =
      bozukIndeks >= 0
        ? `🐞 Hata <b>${bozukIndeks + 1}. öğede</b>; doğrusu <b>${dogruDeger}</b>.`
        : '✅ Bu turda hata YOK — doğru cevap “hata yok”.';
  } else {
    satir = `✅ Doğru cevap: <b>${dogru}</b>`;
  }
  $('onizleme-cevap').innerHTML = `${satir}<br>🔑 ${kacan(kural || '')} — ${kacan(aciklama || '')}`;
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

// Sahneden çıkar: oyuncu silinir, puanı düşer, cihazındaki isim temizlenir
function sahnedenCikar(o) {
  if (!confirm(`"${o.isim}" sahneden çıkarılsın mı?\n\nPuanı silinir ve cihazında isim seçme ekranı açılır. Kısa bir süre aynı isimle geri giremez. Ölçüm kayıtları korunur.`)) return;
  gonder('ogretmen:sahnedenCikar', { kod: o.kod });
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
      // Bireysel modda herkes farklı sorudadır
      (o.soruToplam
        ? `<span class="soru-ilerleme${o.bitirdi ? ' bitti' : ''}">${
            o.bitirdi ? '🏁 bitirdi' : `soru ${o.soruSira}/${o.soruToplam}`
          }</span>`
        : '') +
      (o.misafir ? '<span class="misafir-rozeti">✨ misafir</span>' : '') +
      durumRozeti(o) +
      `<span class="puan">${o.skor} <span class="sr-only">puan</span></span>` +
      `<span class="duzen">
         <button class="mini" title="Öğrenci raporu" aria-label="Öğrenci raporu">📊</button>
         <button class="mini" title="İsmi değiştir" aria-label="İsmi değiştir">✏️</button>
         <button class="mini" title="Puanı değiştir" aria-label="Puanı değiştir">🔢</button>
         <button class="mini" title="İsmi serbest bırak" aria-label="İsmi serbest bırak">🔓</button>
         <button class="mini tehlikeli" title="Sahneden çıkar" aria-label="Sahneden çıkar">🚪</button>
       </span>`;
    madde.querySelector('.isim').textContent = o.isim;
    const [raporDugme, isimDugme, puanDugme, serbestDugme, cikarDugme] =
      madde.querySelectorAll('.duzen .mini');
    raporDugme.addEventListener('click', () => window.raporGoster && window.raporGoster(o.anahtar));
    isimDugme.addEventListener('click', () => isimDuzenle(o));
    puanDugme.addEventListener('click', () => puanDuzenle(o));
    serbestDugme.addEventListener('click', () => serbestBirak(o));
    cikarDugme.addEventListener('click', () => sahnedenCikar(o));
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
