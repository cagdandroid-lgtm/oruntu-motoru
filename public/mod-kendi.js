// "Kendi Örüntünü Kur" modunun öğrenci ekranı: çocuk 4-6 öğelik kendi
// dizisini kurar, motor kuralı tahmin edip sürdürür, çocuk "doğru/yanlış
// sürdürdü" kararını verir. Yanlış derse kendi kuralını yazabilir.
//
// Puan sunucuda, KURAL TUTARLILIĞINA göre hesaplanır; burada karar yoktur.

const ModKendi = (() => {
  const $ = (id) => document.getElementById(id);
  let gonder = null; // app.js'ten gelen cevapGonder(secim)

  const altBaslik = (metin) => ($('mod-aciklamasi').textContent = metin);

  function seceneklerAlani() {
    const alan = $('secenekler');
    alan.innerHTML = '';
    return alan;
  }

  const PALET = ['🔺', '🟦', '🔴', '🟡', '🟢', '🟣', '⭐', '🌸'];
const SLOT = 6;
let slotlar = [];
let aktifSlot = 0;
let asama = 'kurma'; // kurma → karar
let surdurulen = [];

function ciz(soket) {
  slotlar = new Array(SLOT).fill('');
  aktifSlot = 0;
  asama = 'kurma';
  surdurulen = [];

  altBaslik('4-6 öğelik kendi örüntünü kur. Sonra motor kuralını tahmin edip sürdürecek.');
  $('dizi').innerHTML = '';
  kendiArayuzu(soket);
}

function kendiArayuzu(soket) {
  const alan = seceneklerAlani();
  alan.className = 'kendi-alani';

  // --- kurduğu dizi ---
  const izgara = document.createElement('div');
  izgara.className = 'kendi-izgara';
  slotlar.forEach((deger, i) => {
    const h = document.createElement('button');
    h.type = 'button';
    h.className =
      'kendi-slot' + (deger ? ' dolu' : '') + (i === aktifSlot && asama === 'kurma' ? ' aktif' : '');
    h.textContent = deger || i + 1;
    h.disabled = asama !== 'kurma';
    h.addEventListener('click', () => {
      aktifSlot = i;
      kendiArayuzu(soket);
    });
    izgara.appendChild(h);
  });
  // motorun eklediği terimler
  for (const deger of surdurulen) {
    const h = document.createElement('div');
    h.className = 'kendi-slot motor';
    h.textContent = deger;
    izgara.appendChild(h);
  }
  alan.appendChild(izgara);

  if (asama === 'kurma') {
    alan.appendChild(kendiPaleti(soket));
    alan.appendChild(kendiSayiPadi(soket));

    const satir = document.createElement('div');
    satir.className = 'dugme-satiri';
    const temizle = document.createElement('button');
    temizle.className = 'ikincil';
    temizle.textContent = '🧹 Temizle';
    temizle.addEventListener('click', () => {
      slotlar = new Array(SLOT).fill('');
      aktifSlot = 0;
      kendiArayuzu(soket);
    });
    const surdur = document.createElement('button');
    surdur.textContent = '🤖 Motor sürdürsün';
    surdur.addEventListener('click', () => motorSurdursun(soket));
    satir.append(temizle, surdur);
    alan.appendChild(satir);

    const ipucu = document.createElement('p');
    ipucu.className = 'ipucu';
    ipucu.textContent = 'Şekle dokun ya da sayı yaz. En az 4 öğe gerekli.';
    alan.appendChild(ipucu);
    return;
  }

  // --- karar aşaması ---
  const soruMetni = document.createElement('p');
  soruMetni.className = 'kendi-soru';
  soruMetni.textContent = 'Motor senin kuralına göre doğru mu sürdürdü?';
  alan.appendChild(soruMetni);

  const satir = document.createElement('div');
  satir.className = 'dugme-satiri';
  const evet = document.createElement('button');
  evet.className = 'secenek metin karar-dogru';
  evet.textContent = '✅ Doğru sürdürdü';
  evet.addEventListener('click', () => gonder({ dizi: doluSlotlar(), karar: 'dogru' }));
  const hayir = document.createElement('button');
  hayir.className = 'secenek metin karar-yanlis';
  hayir.textContent = '❌ Yanlış sürdürdü';
  hayir.addEventListener('click', () => kendiKuraliSor(alan));
  satir.append(evet, hayir);
  alan.appendChild(satir);
}

// "Yanlış sürdürdü" diyen çocuk kendi kuralını anlatır (isteğe bağlı).
function kendiKuraliSor(alan) {
  alan.innerHTML = '';
  const izgara = document.createElement('div');
  izgara.className = 'kendi-izgara';
  for (const d of doluSlotlar()) {
    const h = document.createElement('div');
    h.className = 'kendi-slot dolu';
    h.textContent = d;
    izgara.appendChild(h);
  }
  alan.appendChild(izgara);

  const etiket = document.createElement('p');
  etiket.className = 'kendi-soru';
  etiket.textContent = 'Peki senin kuralın neydi? (istersen boş bırak)';
  alan.appendChild(etiket);

  const girdi = document.createElement('input');
  girdi.type = 'text';
  girdi.maxLength = 80;
  girdi.placeholder = 'Örnek: ikişer artıyor';
  girdi.autocomplete = 'off';
  alan.appendChild(girdi);

  const yolla = document.createElement('button');
  yolla.textContent = '📨 Gönder';
  const gonderKarar = () =>
    gonder({ dizi: doluSlotlar(), karar: 'yanlis', kendiKurali: girdi.value });
  yolla.addEventListener('click', gonderKarar);
  girdi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') gonderKarar();
  });
  alan.appendChild(yolla);
  girdi.focus();
}

const doluSlotlar = () => slotlar.filter((d) => String(d).trim() !== '');

function kendiPaleti(soket) {
  const palet = document.createElement('div');
  palet.className = 'palet';
  for (const sembol of PALET) {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'sade';
    d.textContent = sembol;
    d.addEventListener('click', () => {
      slotlar[aktifSlot] = sembol;
      aktifSlot = Math.min(SLOT - 1, aktifSlot + 1);
      Efekt.tikSesi();
      kendiArayuzu(soket);
    });
    palet.appendChild(d);
  }
  return palet;
}

function kendiSayiPadi(soket) {
  const pad = document.createElement('div');
  pad.className = 'palet sayi-pad';
  for (const rakam of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'sade';
    d.textContent = rakam;
    d.addEventListener('click', () => {
      // Aynı slotta rakamlar yan yana eklenir (çok basamaklı sayı yazılabilsin)
      const suanki = String(slotlar[aktifSlot] || '');
      slotlar[aktifSlot] = /^\d+$/.test(suanki) ? (suanki + rakam).slice(0, 4) : rakam;
      Efekt.tikSesi();
      kendiArayuzu(soket);
    });
    pad.appendChild(d);
  }
  const sil = document.createElement('button');
  sil.type = 'button';
  sil.className = 'sade';
  sil.textContent = '⌫';
  sil.setAttribute('aria-label', 'Son öğeyi sil');
  sil.addEventListener('click', () => {
    slotlar[aktifSlot] = '';
    kendiArayuzu(soket);
  });
  pad.appendChild(sil);
  const ileri = document.createElement('button');
  ileri.type = 'button';
  ileri.className = 'sade';
  ileri.textContent = '▶ sonraki kutu';
  ileri.addEventListener('click', () => {
    aktifSlot = Math.min(SLOT - 1, aktifSlot + 1);
    kendiArayuzu(soket);
  });
  pad.appendChild(ileri);
  return pad;
}

function motorSurdursun(soket) {
  const dizi = doluSlotlar();
  if (dizi.length < 4) {
    $('geri-bildirim').innerHTML =
      '<div class="geri-bildirim notr">En az 4 öğe kurmalısın. 🙂</div>';
    return;
  }
  soket.emit('kendi:surdur', { dizi }, (yanit) => {
    if (!yanit || yanit.hata) {
      $('geri-bildirim').innerHTML = `<div class="geri-bildirim notr">${yanit ? yanit.hata : 'Olmadı, tekrar dene.'}</div>`;
      return;
    }
    surdurulen = yanit.surdurulen;
    asama = 'karar';
    $('geri-bildirim').innerHTML = '';
    altBaslik('Motor iki öğe ekledi (gri kutular). Senin kuralına uyuyor mu?');
    kendiArayuzu(soket);
    Efekt.tikSesi();
  });
}

  return {
    baslat(cevapGonder, soket) {
      gonder = cevapGonder;
      $('mod-basligi').textContent = '🎨 Kendi Örüntünü Kur';
      ciz(soket);
    },

    // Tur bitince: tutarlılık geri bildirimi (sunucudan gelen ayrıntıyla)
    ozet(ayrinti) {
      if (!ayrinti) return 'Bu turda örüntü kurmadın.';
      const bas = ayrinti.tutarli
        ? '✅ Kurduğun örüntü tek kurallıydı'
        : '⚠️ Kurduğun dizide kural bir yerde bozuluyordu';
      const yer =
        !ayrinti.tutarli && ayrinti.bozulmaIndeksi >= 0
          ? ` (${ayrinti.bozulmaIndeksi + 1}. öğeden sonra)`
          : '';
      const kural = ` — motorun okuduğu kural: <b>${ayrinti.kuralEtiketi}</b>.`;
      const seninki = ayrinti.kendiKurali ? ` Senin kuralın: “${ayrinti.kendiKurali}”.` : '';
      return bas + yer + kural + seninki;
    },
  };
})();
