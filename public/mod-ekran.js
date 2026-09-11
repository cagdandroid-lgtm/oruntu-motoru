// Yeni dört modun öğrenci ekranı: Hatayı Bul, Tersine Örüntü, Uzak Terim,
// Kendi Örüntünü Kur. Mevcut üç modun çizimi app.js'te olduğu gibi kalır.
//
// Doğru cevap burada DA bulunmaz; her karar sunucuya gönderilir.

const ModEkran = (() => {
  const $ = (id) => document.getElementById(id);
  const gorunur = (el, evet) => el && el.classList.toggle('gizli', !evet);
  const sayisalMi = (d) => d !== null && d !== undefined && /^-?\d+$/.test(String(d));

  let gonder = null; // app.js'ten gelen cevapGonder(secim)
  let soru = null;
  let secilenHucre = null; // Hatayı Bul'un birinci adımı

  const baslik = (metin) => ($('mod-basligi').textContent = metin);
  const altBaslik = (metin) => ($('mod-aciklamasi').textContent = metin);

  function hucreYap(deger, ekSinif = '') {
    const h = document.createElement('div');
    h.className = 'hucre' + (sayisalMi(deger) ? ' sayi' : '') + (ekSinif ? ' ' + ekSinif : '');
    h.textContent = deger === null || deger === undefined ? '' : deger;
    return h;
  }

  function seceneklerAlani() {
    const alan = $('secenekler');
    alan.innerHTML = '';
    return alan;
  }

  function secenekDugmesi(deger, metinMi = false) {
    const d = document.createElement('button');
    d.className = 'secenek' + (metinMi ? ' metin' : '');
    d.textContent = deger;
    d.dataset.deger = deger;
    return d;
  }

  // ================= (1) HATAYI BUL =================
  // İki adım: önce kuralı bozan hücreye dokun, sonra doğrusunu seç.
  // Bazı turlarda hiç hata yoktur — o zaman "hata yok" doğru cevaptır.

  function hataCiz() {
    secilenHucre = null;
    baslik('🐞 Hatayı Bul');
    altBaslik('Bu dizide kuralı bozan bir öğe olabilir. Varsa ona dokun; yoksa “hata yok” de.');

    const alan = $('dizi');
    alan.innerHTML = '';
    soru.dizi.forEach((deger, i) => {
      const h = hucreYap(deger, 'secilebilir');
      h.style.animationDelay = i * 0.05 + 's';
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      h.setAttribute('aria-label', `${i + 1}. öğe: ${deger}`);
      const sec = () => hucreSecildi(i, h);
      h.addEventListener('click', sec);
      h.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sec();
        }
      });
      alan.appendChild(h);
    });

    const alanS = seceneklerAlani();
    const yok = document.createElement('button');
    yok.className = 'secenek metin hata-yok';
    yok.id = 'hata-yok-dugmesi';
    yok.textContent = '✅ Bu dizide hata yok';
    yok.addEventListener('click', () => gonder({ hucre: -1 }));
    alanS.appendChild(yok);
  }

  function hucreSecildi(i, el) {
    if (secilenHucre !== null) return; // birinci adım bir kez verilir
    secilenHucre = i;
    document.querySelectorAll('#dizi .hucre').forEach((h) => {
      h.classList.remove('secilebilir');
      h.classList.add('donuk');
    });
    el.classList.remove('donuk');
    el.classList.add('isaretli');

    altBaslik(`${i + 1}. öğeyi işaretledin. Peki oraya ne gelmeliydi?`);
    const alan = seceneklerAlani();
    const secenekler = (soru.duzeltmeSecenekleri || [])[i] || [];
    for (const deger of secenekler) {
      const d = secenekDugmesi(deger);
      d.addEventListener('click', () => gonder({ hucre: i, deger }));
      alan.appendChild(d);
    }
  }

  // ================= (2) TERSİNE ÖRÜNTÜ =================
  // Kural ve SON terim verilir; başlangıç terimi sorulur.

  function tersineCiz() {
    baslik('⏪ Tersine Örüntü');
    altBaslik(
      `Kural: ${soru.kuralEtiketi} · ${soru.adimSayisi} adım geriye git. ` +
        'Bu dizi hangi sayıyla başlamış olmalı?'
    );

    const alan = $('dizi');
    alan.innerHTML = '';
    soru.dizi.forEach((deger, i) => {
      const sonMu = i === soru.dizi.length - 1;
      const h = hucreYap(sonMu ? deger : i === 0 ? '?' : '', sonMu ? '' : i === 0 ? 'gizli-hucre' : 'bos-hucre');
      h.style.animationDelay = i * 0.05 + 's';
      if (i === 0) h.id = 'gizli-hucre';
      alan.appendChild(h);

      if (!sonMu) {
        const ok = document.createElement('span');
        ok.className = 'akis-oku';
        ok.textContent = '→';
        ok.setAttribute('aria-hidden', 'true');
        alan.appendChild(ok);
      }
    });

    const alanS = seceneklerAlani();
    for (const deger of soru.secenekler) {
      const d = secenekDugmesi(deger);
      d.addEventListener('click', () => gonder(deger));
      alanS.appendChild(d);
    }
  }

  // ================= (3) UZAK TERİM =================
  // Tek tek saymanın mümkün olmadığı kadar uzak bir terim sorulur.

  function uzakCiz() {
    baslik('🔭 Uzak Terim');
    altBaslik(`Bu dizi aynı kuralla sürerse ${soru.hedefTerim}. terim kaç olur?`);

    const alan = $('dizi');
    alan.innerHTML = '';
    soru.dizi.forEach((deger, i) => {
      const h = hucreYap(deger);
      h.style.animationDelay = i * 0.05 + 's';
      alan.appendChild(h);
    });

    const nokta = document.createElement('div');
    nokta.className = 'hucre nokta-hucre';
    nokta.textContent = '…';
    nokta.setAttribute('aria-label', 'devamı');
    alan.appendChild(nokta);

    const hedef = hucreYap('?', 'gizli-hucre');
    hedef.id = 'gizli-hucre';
    const etiket = document.createElement('span');
    etiket.className = 'hedef-etiket';
    etiket.textContent = `${soru.hedefTerim}.`;
    hedef.appendChild(etiket);
    alan.appendChild(hedef);

    const alanS = seceneklerAlani();
    for (const deger of soru.secenekler) {
      const d = secenekDugmesi(deger);
      d.addEventListener('click', () => gonder(deger));
      alanS.appendChild(d);
    }
  }

  // ================= Dışa açılan yüzey =================

  const YENI_MODLAR = ['hata', 'tersine', 'uzak', 'kendi'];

  return {
    yeniMi: (mod) => YENI_MODLAR.includes(mod),

    ciz(yeniSoru, cevapGonder, soket) {
      soru = yeniSoru;
      gonder = cevapGonder;
      $('secenekler').className = 'secenekler';
      // Kendi Örüntünü Kur'da hazır dizi yoktur; boş kutu gösterilmez
      gorunur($('dizi'), soru.mod !== 'kendi');
      switch (soru.mod) {
        case 'hata':
          return hataCiz();
        case 'tersine':
          return tersineCiz();
        case 'uzak':
          return uzakCiz();
        case 'kendi':
          return ModKendi.baslat(cevapGonder, soket);
      }
    },

    // Tur bitince doğru cevabın gösterimi
    turBitti(sonuc, benim) {
      if (!soru) return '';
      if (soru.mod === 'hata') {
        const hucreler = document.querySelectorAll('#dizi .hucre');
        if (sonuc.bozukIndeks >= 0 && hucreler[sonuc.bozukIndeks]) {
          const h = hucreler[sonuc.bozukIndeks];
          h.classList.remove('donuk', 'secilebilir');
          h.classList.add('acildi');
          h.textContent = sonuc.dogruDeger;
        }
        return sonuc.bozukIndeks >= 0
          ? `Hata ${sonuc.bozukIndeks + 1}. öğedeydi; doğrusu <b>${sonuc.dogruDeger}</b>.`
          : 'Bu dizide gerçekten hata yoktu. ✅';
      }
      if (soru.mod === 'tersine') {
        const gizli = document.getElementById('gizli-hucre');
        if (gizli) {
          gizli.textContent = sonuc.dogru;
          gizli.classList.remove('gizli-hucre');
          gizli.classList.add('acildi');
        }
        return `Başlangıç terimi <b>${sonuc.dogru}</b>.`;
      }
      if (soru.mod === 'uzak') {
        const gizli = document.getElementById('gizli-hucre');
        if (gizli) {
          gizli.textContent = sonuc.dogru;
          gizli.classList.remove('gizli-hucre');
          gizli.classList.add('acildi');
        }
        return `${soru.hedefTerim}. terim <b>${sonuc.dogru}</b>.`;
      }
      if (soru.mod === 'kendi') return ModKendi.ozet(benim && benim.ayrinti);
      return '';
    },
  };
})();
