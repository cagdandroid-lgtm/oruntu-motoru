// Ölçme ve veri standardı — UYCEP Logic ortak olay kaydı şeması.
//
// Bu modül, oyunlar arası birleştirilebilirlik için ZORUNLU olan sabit
// sütunlu olay kaydını tutar. SUTUNLAR dizisindeki adlar hiçbir koşulda
// değiştirilemez; yeni bilgi gerekiyorsa sona yeni sütun eklenir
// (isimli dışa aktarımdaki "ogrenci_ad" gibi).
//
// Veri yalnızca BELLEKTE tutulur (Render diski kalıcı değildir); ders
// bitiminde öğretmene "raporu indir" hatırlatması gösterilir.

const OYUN_ADI = 'oruntu-motoru';

// ---- DEĞİŞTİRİLEMEZ standart sütunlar ----
const SUTUNLAR = [
  'zaman',
  'oyun',
  'set_veya_paket',
  'grup',
  'ogrenci_kod',
  'gorev_id',
  'kategori',
  'chc',
  'zorluk',
  'sonuc',
  'sure_sn',
  'deneme',
  'ipucu_kullanildi',
];

// Standart sütunların SONUNA eklenen ek sütunlar (standart şema bozulmaz):
//  - misafir     : her dışa aktarımda — araştırma setini süzmek için
//  - ogrenci_ad  : yalnız isimli (veli raporu) dışa aktarımda
const MISAFIR_SUTUNU = 'misafir';
const ISIM_SUTUNU = 'ogrenci_ad';

// Kategori etiketleri — veli diline uygun, karne ve rapor ekranında kullanılır.
const KATEGORI_ETIKET = {
  'sekil-renk': 'Şekil ve renk örüntüleri',
  ayna: 'Ayna (simetri) örüntüleri',
  buyuyen: 'Büyüyen örüntüler',
  sayi: 'Sayı örüntüleri',
  'ic-ice': 'İç içe örüntüler',
  harf: 'Harf örüntüleri',
  'ogrenci-tasarimi': 'Arkadaş tasarımı örüntüler',
};

// CHC eşlemesi: data dosyasında "chc" alanı varsa O kullanılır; yoksa
// örüntü türünden türetilir. Seviye 3 süreli olduğu için Gs eklenir.
const CHC_ESLEME = {
  'sekil-renk': ['Gf', 'Gv'],
  ayna: ['Gv', 'Gf'],
  buyuyen: ['Gf', 'Gq'],
  sayi: ['Gq', 'Gf'],
  'ic-ice': ['Gv', 'Gf'],
  harf: ['Gf', 'Gc'],
  'ogrenci-tasarimi': ['Gf', 'Gv'],
};

function chcAlanlari(soru) {
  if (Array.isArray(soru.chc) && soru.chc.length) return soru.chc.slice();
  const temel = CHC_ESLEME[soru.tur] || ['Gf'];
  const alanlar = temel.slice();
  if (Number(soru.seviye) === 3 && !alanlar.includes('Gs')) alanlar.push('Gs');
  return alanlar;
}

const iki = (n) => Math.round(Number(n) * 100) / 100;

// ---------------- Depo ----------------

class OlcmeDeposu {
  constructor() {
    this.kayitlar = [];
    this.oncekiOturum = null; // { kaynak, ogrenciler: Map }
    this.sonDisaAktarim = null; // ISO zaman
  }

  get sayi() {
    return this.kayitlar.filter((k) => !k.iptal).length;
  }

  // Bir cevabı/görevi standart şemayla kaydeder.
  ekle({ soru, ayar, oyuncu, sonuc, sureSn, deneme = 1, ipucu = false, turNo }) {
    const kayit = {
      zaman: new Date().toISOString(),
      oyun: OYUN_ADI,
      set_veya_paket: `${ayar.grup}-${ayar.seviye}-${ayar.mod}`,
      grup: ayar.grup,
      ogrenci_kod: oyuncu.kod,
      gorev_id: soru.id,
      kategori: soru.tur,
      chc: chcAlanlari(soru).join('|'),
      zorluk: `${ayar.grup}-${soru.seviye}`,
      sonuc, // dogru | yanlis | atlandi
      sure_sn: sureSn === null || sureSn === undefined ? '' : iki(sureSn),
      deneme,
      ipucu_kullanildi: ipucu ? 'evet' : 'hayir',
      // ---- standart şemanın sonuna eklenen sütun ----
      misafir: oyuncu.misafir ? 'evet' : 'hayir',
      // ---- dışa aktarılmayan iç alanlar ----
      anahtar: oyuncu.anahtar,
      isim: oyuncu.isim,
      turNo,
      iptal: false,
    };
    this.kayitlar.push(kayit);
    return kayit;
  }

  // Öğretmen soruyu iptal edince (puan geri alma) o turun kayıtları
  // analiz dışında bırakılır — silinmez, yalnızca işaretlenir.
  turuIptalEt(turNo) {
    let sayi = 0;
    for (const k of this.kayitlar) {
      if (k.turNo === turNo && !k.iptal) {
        k.iptal = true;
        sayi++;
      }
    }
    return sayi;
  }

  temizle() {
    this.kayitlar = [];
    this.sonDisaAktarim = null;
  }

  gecerliKayitlar() {
    return this.kayitlar.filter((k) => !k.iptal);
  }

  // ---------------- CSV dışa aktarım ----------------

  // isimli=false → araştırma için yalnız kod; isimli=true → veli raporu için ad da eklenir.
  csv({ isimli = false, isimCozucu = null } = {}) {
    const basliklar = isimli
      ? [...SUTUNLAR, MISAFIR_SUTUNU, ISIM_SUTUNU]
      : [...SUTUNLAR, MISAFIR_SUTUNU];
    const satirlar = [basliklar.join(',')];

    for (const k of this.gecerliKayitlar()) {
      const hucreler = SUTUNLAR.map((s) => alanKacir(k[s]));
      hucreler.push(alanKacir(k.misafir || 'hayir'));
      if (isimli) {
        const ad = (isimCozucu && isimCozucu(k.anahtar)) || k.isim || '';
        hucreler.push(alanKacir(ad));
      }
      satirlar.push(hucreler.join(','));
    }

    this.sonDisaAktarim = new Date().toISOString();
    return '﻿' + satirlar.join('\r\n') + '\r\n'; // BOM: Excel Türkçe karakterleri doğru okusun
  }

  // Standart dosya adı: <oyun>_<grup>_<tarih>.csv
  dosyaAdi(varsayilanGrup = 'e') {
    const gruplar = new Set(this.gecerliKayitlar().map((k) => k.grup));
    const grup = gruplar.size === 1 ? [...gruplar][0] : gruplar.size === 0 ? varsayilanGrup : 'karma';
    const tarih = new Date().toISOString().slice(0, 10);
    return `${OYUN_ADI}_${grup}_${tarih}.csv`;
  }

  // ---------------- Önceki oturum (CSV içe aktarma) ----------------

  // Yüklenen CSV'den öğrenci başına özet çıkarır; rapor ekranında
  // "geçen oturuma göre değişim" satırı için kullanılır.
  oncekiOturumuYukle(metin, dosyaAdi = 'önceki oturum') {
    const tablo = csvCoz(metin);
    if (!tablo.length) return { hata: 'CSV boş ya da okunamadı.' };

    const basliklar = tablo[0].map((b) => b.trim());
    const gerekli = ['ogrenci_kod', 'sonuc'];
    for (const g of gerekli) {
      if (!basliklar.includes(g)) return { hata: `CSV'de "${g}" sütunu yok.` };
    }
    const dizin = Object.fromEntries(basliklar.map((b, i) => [b, i]));

    const ogrenciler = new Map(); // eşleşme anahtarı -> özet
    for (const satir of tablo.slice(1)) {
      if (!satir.length || satir.every((h) => h === '')) continue;
      const kod = (satir[dizin.ogrenci_kod] || '').trim();
      const ad = dizin[ISIM_SUTUNU] !== undefined ? (satir[dizin[ISIM_SUTUNU]] || '').trim() : '';
      if (!kod && !ad) continue;

      const anahtar = ad ? 'ad:' + ad.toLocaleLowerCase('tr') : 'kod:' + kod;
      if (!ogrenciler.has(anahtar)) {
        ogrenciler.set(anahtar, { kod, ad, toplam: 0, dogru: 0, sureToplam: 0, sureSayisi: 0 });
      }
      const o = ogrenciler.get(anahtar);
      const sonuc = (satir[dizin.sonuc] || '').trim();
      o.toplam++;
      if (sonuc === 'dogru') o.dogru++;
      const sure = Number(dizin.sure_sn !== undefined ? satir[dizin.sure_sn] : NaN);
      if (Number.isFinite(sure)) {
        o.sureToplam += sure;
        o.sureSayisi++;
      }
    }

    for (const o of ogrenciler.values()) {
      o.dogruluk = o.toplam ? iki((o.dogru / o.toplam) * 100) : 0;
      o.ortalamaSure = o.sureSayisi ? iki(o.sureToplam / o.sureSayisi) : null;
    }

    this.oncekiOturum = { kaynak: dosyaAdi, ogrenciler };
    return { tamam: true, ogrenciSayisi: ogrenciler.size, kaynak: dosyaAdi };
  }

  oncekiOturumuUnut() {
    this.oncekiOturum = null;
  }

  oncekiKayit(kod, isim) {
    if (!this.oncekiOturum) return null;
    const { ogrenciler } = this.oncekiOturum;
    return (
      (isim && ogrenciler.get('ad:' + String(isim).toLocaleLowerCase('tr'))) ||
      ogrenciler.get('kod:' + kod) ||
      null
    );
  }

  // ---------------- Öğrenci raporu ----------------

  rapor(oyuncu) {
    const kayitlar = this.gecerliKayitlar().filter((k) => k.anahtar === oyuncu.anahtar);

    let dogru = 0;
    let yanlis = 0;
    let atlandi = 0;
    let sureToplam = 0;
    let sureSayisi = 0;
    let seri = 0;
    let enUzunSeri = 0;
    const kategoriHarita = new Map();
    const chcHarita = new Map();
    const kademeler = new Set();

    for (const k of kayitlar) {
      if (k.sonuc === 'dogru') {
        dogru++;
        seri++;
        enUzunSeri = Math.max(enUzunSeri, seri);
      } else {
        if (k.sonuc === 'yanlis') yanlis++;
        else atlandi++;
        seri = 0;
      }
      if (k.sure_sn !== '' && Number.isFinite(Number(k.sure_sn))) {
        sureToplam += Number(k.sure_sn);
        sureSayisi++;
      }
      kademeler.add(k.zorluk);

      const kt = kategoriHarita.get(k.kategori) || { kategori: k.kategori, toplam: 0, dogru: 0 };
      kt.toplam++;
      if (k.sonuc === 'dogru') kt.dogru++;
      kategoriHarita.set(k.kategori, kt);

      for (const alan of String(k.chc).split('|').filter(Boolean)) {
        const c = chcHarita.get(alan) || { alan, toplam: 0, dogru: 0 };
        c.toplam++;
        if (k.sonuc === 'dogru') c.dogru++;
        chcHarita.set(alan, c);
      }
    }

    const toplam = kayitlar.length;
    const yuzdele = (d, t) => (t ? iki((d / t) * 100) : 0);
    const dogrulukYuzdesi = yuzdele(dogru, toplam);
    const ortalamaSureSn = sureSayisi ? iki(sureToplam / sureSayisi) : null;

    const onceki = this.oncekiKayit(oyuncu.kod, oyuncu.isim);
    const degisim = onceki
      ? {
          kaynak: this.oncekiOturum.kaynak,
          oncekiDogruluk: onceki.dogruluk,
          dogrulukFarki: iki(dogrulukYuzdesi - onceki.dogruluk),
          oncekiOrtalamaSure: onceki.ortalamaSure,
          sureFarki:
            onceki.ortalamaSure !== null && ortalamaSureSn !== null
              ? iki(ortalamaSureSn - onceki.ortalamaSure)
              : null,
        }
      : null;

    return {
      kod: oyuncu.kod,
      isim: oyuncu.isim,
      misafir: !!oyuncu.misafir,
      anahtar: oyuncu.anahtar,
      skor: oyuncu.skor,
      toplam,
      dogru,
      yanlis,
      atlandi,
      dogrulukYuzdesi,
      ortalamaSureSn,
      enUzunSeri,
      ulasilanKademe: [...kademeler].sort().pop() || '—',
      kademeler: [...kademeler].sort(),
      kategoriler: [...kategoriHarita.values()]
        .map((k) => ({
          ...k,
          etiket: KATEGORI_ETIKET[k.kategori] || k.kategori,
          yuzde: yuzdele(k.dogru, k.toplam),
        }))
        .sort((a, b) => b.toplam - a.toplam),
      chcDokumu: [...chcHarita.values()]
        .map((c) => ({ ...c, yuzde: yuzdele(c.dogru, c.toplam) }))
        .sort((a, b) => b.toplam - a.toplam),
      degisim,
    };
  }
}

// ---------------- CSV yardımcıları ----------------

function alanKacir(deger) {
  const metin = deger === null || deger === undefined ? '' : String(deger);
  return /[",\r\n]/.test(metin) ? `"${metin.replace(/"/g, '""')}"` : metin;
}

// Basit RFC4180 çözümleyici (tırnaklı alanlar ve kaçırılmış tırnak destekli).
function csvCoz(metin) {
  const ham = String(metin || '').replace(/^﻿/, '');
  const tablo = [];
  let satir = [];
  let alan = '';
  let tirnakta = false;

  for (let i = 0; i < ham.length; i++) {
    const c = ham[i];
    if (tirnakta) {
      if (c === '"') {
        if (ham[i + 1] === '"') {
          alan += '"';
          i++;
        } else tirnakta = false;
      } else alan += c;
      continue;
    }
    if (c === '"') tirnakta = true;
    else if (c === ',') {
      satir.push(alan);
      alan = '';
    } else if (c === '\n') {
      satir.push(alan);
      tablo.push(satir);
      satir = [];
      alan = '';
    } else if (c !== '\r') alan += c;
  }
  if (alan !== '' || satir.length) {
    satir.push(alan);
    tablo.push(satir);
  }
  return tablo.filter((s) => s.length && !(s.length === 1 && s[0] === ''));
}

module.exports = {
  OlcmeDeposu,
  OYUN_ADI,
  SUTUNLAR,
  MISAFIR_SUTUNU,
  ISIM_SUTUNU,
  KATEGORI_ETIKET,
  chcAlanlari,
  csvCoz,
};
