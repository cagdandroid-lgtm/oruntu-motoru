// Oyun durumu ve tur mantığı. Cevap doğrulaması yalnızca burada yapılır.

const { EventEmitter } = require('events');
const icerik = require('./oruntu');
const { OlcmeDeposu } = require('./olcme');
const duzenleme = require('./duzenleme');
const oturum = require('./oturum');
const modlar = require('./modlar');
const gezinme = require('./gezinme');
const asamaModulu = require('./asama');
const bireysel = require('./bireysel');
const cevapModulu = require('./cevap');
const tablolar = require('./tablolar');

const { SEVIYE_SURESI } = gezinme; // seviye 3'te süre sınırı zorunlu
const { TUR_ARASI } = cevapModulu; // doğru cevabın gösterildiği süre (sn)
const MAKS_HAVUZ = 30; // çok mod seçilince tur ders boyunu aşmasın

class Oyun extends EventEmitter {
  constructor() {
    super();
    this.oyuncular = new Map(); // anahtar -> oyuncu
    this.olcme = new OlcmeDeposu(); // olay kaydı (bellekte; ders sonunda CSV indirilir)
    // Sınıf oturumu: öğretmen bir grup/etkinlik seçene kadar öğrenci ekranı bekler.
    this.oturum = { acik: false, grup: null, dersEtiketi: '' };
    this.sifirla(true);
  }

  // ---------- Oturum durum makinesi (lib/asama.js) ----------
  // BOŞTA → LOBİ → OYUN ⇄ ARA → SONUÇ

  get asama() {
    return asamaModulu.asama(this);
  }

  get secimAcikMi() {
    return asamaModulu.secimAcikMi(this);
  }

  asamaOzeti() {
    return asamaModulu.ozet(this);
  }

  // Grup/etkinlik değiştirmenin TEK yolu
  etkinligiBitir() {
    for (const o of this.oyuncular.values()) bireysel.temizle(o);
    return asamaModulu.etkinligiBitir(this);
  }

  get bireyselMi() {
    return this.ayar && this.ayar.ilerleme === 'bireysel';
  }

  // ---------- Oyuncu yönetimi ----------

  // ---------- Sınıf oturumu ve katılım (lib/oturum.js) ----------

  katil(veri, socketId) {
    return oturum.katil(this, veri || {}, socketId);
  }

  serbestBirak(kod) {
    return oturum.serbestBirak(this, kod);
  }

  girisPaketi() {
    return oturum.girisPaketi(this);
  }

  oturumAc(grup, etiket) {
    return oturum.oturumAc(this, grup, etiket);
  }

  sahnedenCikar(kod, secenek) {
    return oturum.sahnedenCikar(this, kod, secenek);
  }

  oturumKapat() {
    return oturum.oturumKapat(this);
  }


  ayrildi(socketId) {
    for (const o of this.oyuncular.values()) {
      if (o.socketId === socketId) {
        o.bagli = false;
        o.socketId = null;
        console.log(`[ayrılma] ${o.isim} bağlantısı koptu (skoru korunuyor)`);
        return o;
      }
    }
    return null;
  }

  oyuncuBul(socketId) {
    for (const o of this.oyuncular.values()) if (o.socketId === socketId) return o;
    return null;
  }

  // ---------- Skor tabloları (lib/tablolar.js) ----------

  skorTablosu() {
    return tablolar.skorTablosu(this);
  }

  panelTablosu() {
    return tablolar.panelTablosu(this);
  }

  get bagliSayisi() {
    return [...this.oyuncular.values()].filter((o) => o.bagli).length;
  }

  // ---------- Tur akışı ----------

  sifirla(sessiz = false) {
    this._sayaciDurdur();
    this.durum = 'bekliyor'; // bekliyor | oynaniyor | tur-sonu | duraklatildi | bitti
    // Grup oturumdan gelir; sıfırlama oturumu kapatmaz.
    this.ayar = {
      grup: (this.oturum && this.oturum.grup) || 'e',
      seviye: 1,
      mod: 'surdur',
      ilerleme: 'senkron', // senkron | bireysel
      gecis: 'otomatik', // otomatik | onayli (yalnız senkron)
      dersEtiketi: (this.oturum && this.oturum.dersEtiketi) || '',
    };
    this.havuz = [];
    this.soruIndeksi = -1;
    this.soru = null;
    this.cevaplar = new Map(); // oyuncu anahtarı -> {secim, dogruMu, kazanilan}
    this.sonTurPuanlari = new Map(); // en son kapanmış turun puan anlık görüntüsü (geri alma için)
    this.kalanSure = null;
    this.dogruSirasi = 0;
    this.turNo = 0; // ölçüm kayıtlarını tura bağlayan sayaç
    this.sonTurNo = null; // en son kapanan turun numarası (iptal için)
    this.soruBaslangic = null;
    this.duraklamaToplami = 0;
    if (!sessiz) {
      for (const o of this.oyuncular.values()) {
        o.skor = 0;
        o.dogruSayisi = 0;
      }
      console.log('[oyun] sıfırlandı');
      this.emit('degisti');
    }
  }

  // Öğretmen birden çok mod seçebilir; seçilenler sırayla (dönüşümlü) ya da
  // "mod karışık" anahtarıyla rastgele sırada gelir.
  baslat({ seviye, mod, modlar: secilenModlar, karisik, ilerleme, gecis }) {
    if (!this.oturum.acik) return { hata: 'Önce bir grup seçip oturumu aç.' };
    // Etkinlik seçimi yalnız BOŞTA/LOBİ'de; oyun başlayınca kilitlenir
    if (!this.secimAcikMi) {
      return { hata: 'Etkinlik sürüyor. Değiştirmek için “⏹ Etkinliği Bitir”.' };
    }
    const gecerliGrup = this.oturum.grup; // oturum TEK gruba aittir
    const gecerliSeviye = [1, 2, 3].includes(Number(seviye)) ? Number(seviye) : 1;

    // Geriye dönük uyum: tek `mod` alanı da kabul edilir.
    const istenen = Array.isArray(secilenModlar) && secilenModlar.length ? secilenModlar : [mod];
    const gecerliModlar = [...new Set(istenen.filter((m) => modlar.gecerliMod(m)))];
    if (!gecerliModlar.length) gecerliModlar.push('surdur');
    const karisikMi = !!karisik;

    this.ayar = {
      grup: gecerliGrup,
      seviye: gecerliSeviye,
      mod: gecerliModlar[0], // ilk mod; her sorunun kendi modu soru.mod'da durur
      modlar: gecerliModlar,
      karisik: karisikMi,
      ilerleme: ilerleme === 'bireysel' ? 'bireysel' : 'senkron',
      gecis: gecis === 'onayli' ? 'onayli' : 'otomatik',
      dersEtiketi: this.oturum.dersEtiketi || '',
    };

    const { havuz, bosModlar } = this._havuzKur(gecerliGrup, gecerliSeviye, gecerliModlar, karisikMi);
    this.havuz = havuz;
    this.soruIndeksi = -1;

    if (!this.havuz.length) {
      console.log(`[oyun] havuz boş: ${gecerliGrup}/${gecerliSeviye}/${gecerliModlar.join('+')}`);
      return { hata: 'Seçilen grup, seviye ve modlar için soru bulunamadı.' };
    }

    for (const o of this.oyuncular.values()) {
      o.skor = 0;
      o.dogruSayisi = 0;
    }
    console.log(
      `[oyun] başladı — grup:${gecerliGrup} seviye:${gecerliSeviye} ` +
        `mod:${gecerliModlar.join('+')}${karisikMi ? ' (karışık)' : ' (sırayla)'} ` +
        `· ilerleme:${this.ayar.ilerleme} · geçiş:${this.ayar.gecis} (${this.havuz.length} soru)`
    );

    if (this.bireyselMi) {
      // Herkes kendi hızında: ortak tur yoktur, her öğrenci kendi sorusunu alır
      this.durum = 'oynaniyor';
      this.soruIndeksi = 0;
      this.soru = null;
      this.kalanSure = null;
      bireysel.baslat(this);
      this.emit('degisti');
    } else {
      this.sonrakiSoru();
    }
    return bosModlar.length
      ? { tamam: true, uyari: `Bu seviyede içeriği olmayan mod atlandı: ${bosModlar.join(', ')}` }
      : { tamam: true };
  }

  // Modları dönüşümlü harmanlar (her modun payı korunur), sonra gerekirse karıştırır.
  _havuzKur(grup, seviye, secilenModlar, karisikMi) {
    const havuzlar = [];
    const bosModlar = [];
    for (const m of secilenModlar) {
      const h = icerik.havuzOlustur(grup, seviye, m);
      if (h.length) havuzlar.push(h);
      else bosModlar.push(m);
    }

    // Dönüşümlü harmanlama: s1-mod1, s1-mod2, s2-mod1 …
    const harman = [];
    const enUzun = Math.max(0, ...havuzlar.map((h) => h.length));
    for (let i = 0; i < enUzun; i++) {
      for (const h of havuzlar) if (i < h.length) harman.push(h[i]);
    }

    const kirpilmis = harman.slice(0, MAKS_HAVUZ);
    return { havuz: karisikMi ? icerik.karistir(kirpilmis) : kirpilmis, bosModlar };
  }

  // ---------- Soru gezinme (lib/gezinme.js) ----------

  sonrakiSoru() {
    if (this.bireyselMi) return; // bireysel modda ortak soru sırası yoktur
    gezinme.sonrakiSoru(this);
  }

  // Öğretmenin soru gezinmesi — panelde YALNIZ senkron modlarda görünür.
  oncekiSoru() {
    if (this.bireyselMi) return { hata: 'Bireysel ilerlemede soru gezinme yoktur.' };
    return gezinme.oncekiSoru(this);
  }

  soruyaGit(sira) {
    if (this.bireyselMi) return { hata: 'Bireysel ilerlemede soru gezinme yoktur.' };
    return gezinme.soruyaGit(this, sira);
  }

  // Özel soru (öğrenci tasarımı) — havuza sırayı bozmadan araya girer
  ozelSoru(soru) {
    // Bireysel modda herkes farklı sorudadır; araya soru sokmak sırayı kaydırır
    if (this.bireyselMi) return { hata: 'Bireysel modda tasarım sınıfa gönderilemez.' };
    gezinme.ozelSoru(this, soru);
    return { tamam: true };
  }

  atla() {
    if (this.bireyselMi) return { hata: 'Bireysel ilerlemede soru gezinme yoktur.' };
    gezinme.atla(this);
    return { tamam: true };
  }

  _atlandiKaydet() {
    return gezinme.atlandiKaydet(this);
  }

  duraklat() {
    if (this.durum !== 'oynaniyor') return;
    if (this.bireyselMi) {
      // Bireysel modda ortak sayaç yoktur; cevap alımı durur
      this.durum = 'duraklatildi';
      console.log('[oyun] duraklatıldı (bireysel)');
      this.emit('degisti');
      return;
    }
    this.durum = 'duraklatildi';
    this._duraklamaBasi = Date.now();
    this._sayaciDurdur();
    console.log('[oyun] duraklatıldı');
    this.emit('degisti');
  }

  devam() {
    if (this.durum !== 'duraklatildi') return;
    if (this.bireyselMi) {
      this.durum = 'oynaniyor';
      console.log('[oyun] devam ediyor (bireysel)');
      this.emit('degisti');
      return;
    }
    this.durum = 'oynaniyor';
    if (this._duraklamaBasi) {
      this.duraklamaToplami += Date.now() - this._duraklamaBasi;
      this._duraklamaBasi = null;
    }
    if (this.kalanSure) this._sayaciBaslat();
    console.log('[oyun] devam ediyor');
    this.emit('degisti');
  }

  // ---------- Cevap doğrulama (yalnızca sunucuda) ----------

  cevapVer(socketId, secim) {
    const oyuncu = this.oyuncuBul(socketId);
    if (!oyuncu) return { hata: 'Önce oyuna katılmalısın.' };

    // Bireysel modda herkesin kendi sorusu vardır (lib/bireysel.js)
    if (this.bireyselMi) {
      if (this.durum !== 'oynaniyor') return { hata: 'Şu an cevap alınmıyor.' };
      return bireysel.cevapVer(this, oyuncu, secim);
    }

    if (this.durum !== 'oynaniyor' || !this.soru) return { hata: 'Şu an cevap alınmıyor.' };
    return cevapModulu.cevapVer(this, oyuncu, secim);
  }

  turuKapat(sebep) {
    return cevapModulu.turuKapat(this, sebep);
  }

  // ---------- Bireysel ilerleme (lib/bireysel.js) ----------
  // Öğrenci kontrollü ilerleme ve pas geç YALNIZ bireysel modda; senkron
  // modda öğrenciden gelen ilerleme isteği bireysel.js'te reddedilir.

  bireyselDevamEt(oyuncu) {
    if (this.bireyselMi && this.durum === 'oynaniyor') bireysel.yenidenBagland(this, oyuncu);
  }

  oyuncununSorusu(oyuncu) {
    return bireysel.oyuncununSorusu(this, oyuncu);
  }

  ogrenciSonraki(socketId) {
    return bireysel.istek(this, this.oyuncuBul(socketId), bireysel.ogrenciSonraki);
  }

  pasGec(socketId) {
    return bireysel.istek(this, this.oyuncuBul(socketId), bireysel.pasGec);
  }

  bireyselRozetler() {
    return bireysel.rozetler(this);
  }

  // Tavansız yolda kuyruk hiç bitmez; kapanış öğretmen kararıdır ("✅ Turu Bitir")
  _bireyselKapanis() {
    bireysel.kapanis(this);
  }

  // ---------- Öğretmen düzenlemeleri (lib/duzenleme.js) ----------

  turPuaniniGeriAl() {
    return duzenleme.turPuaniniGeriAl(this);
  }

  isimDegistir(anahtar, yeniIsim) {
    return duzenleme.isimDegistir(this, anahtar, yeniIsim);
  }

  puanAyarla(anahtar, puan) {
    return duzenleme.puanAyarla(this, anahtar, puan);
  }

  // ---------- Sayaç ----------

  // Sorunun başından bu yana geçen süre (duraklatılan saniyeler düşülür).
  _gecenSure() {
    if (!this.soruBaslangic) return null;
    const durgun = this._duraklamaBasi ? Date.now() - this._duraklamaBasi : 0;
    const ms = Date.now() - this.soruBaslangic - this.duraklamaToplami - durgun;
    return Math.max(0, ms) / 1000;
  }

  _sayaciBaslat() {
    this._sayaciDurdur();
    this._sayac = setInterval(() => {
      this.kalanSure--;
      this.emit('sayac', this.kalanSure);
      if (this.kalanSure <= 0) this.turuKapat('süre-doldu');
    }, 1000);
  }

  _sayaciDurdur() {
    if (this._sayac) clearInterval(this._sayac);
    if (this._araZamanlayici) clearTimeout(this._araZamanlayici);
    this._sayac = null;
    this._araZamanlayici = null;
  }
}

module.exports = { Oyun, SEVIYE_SURESI, TUR_ARASI };
