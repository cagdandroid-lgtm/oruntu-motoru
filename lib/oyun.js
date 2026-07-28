// Oyun durumu ve tur mantığı. Cevap doğrulaması yalnızca burada yapılır.

const { EventEmitter } = require('events');
const icerik = require('./oruntu');

const SEVIYE_SURESI = { 1: null, 2: null, 3: 30 }; // saniye — seviye 3'te süre sınırı zorunlu
const TUR_ARASI = 6; // doğru cevabın gösterildiği süre (sn)
const TEMEL_PUAN = 100;
const HIZ_BONUSU = [50, 40, 30, 20, 10]; // ilk doğru cevaplayanlara

const anahtarla = (isim) => isim.trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');

class Oyun extends EventEmitter {
  constructor() {
    super();
    this.oyuncular = new Map(); // anahtar -> oyuncu
    this.sifirla(true);
  }

  // ---------- Oyuncu yönetimi ----------

  katil(isim, socketId) {
    const temiz = String(isim || '').trim().slice(0, 20);
    if (!temiz) return { hata: 'Lütfen bir isim yaz.' };

    const anahtar = anahtarla(temiz);
    let oyuncu = this.oyuncular.get(anahtar);

    if (oyuncu) {
      // Aynı isimle dönen öğrenci kaldığı yerden devam eder
      oyuncu.socketId = socketId;
      oyuncu.bagli = true;
      console.log(`[katılım] ${oyuncu.isim} yeniden bağlandı (skor: ${oyuncu.skor})`);
    } else {
      oyuncu = { anahtar, isim: temiz, skor: 0, dogruSayisi: 0, socketId, bagli: true };
      this.oyuncular.set(anahtar, oyuncu);
      console.log(`[katılım] ${temiz} oyuna katıldı`);
    }
    return { oyuncu };
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

  skorTablosu() {
    return [...this.oyuncular.values()]
      .map((o) => ({
        anahtar: o.anahtar, // öğretmen panelinde düzenleme için kimlik
        isim: o.isim,
        skor: o.skor,
        dogruSayisi: o.dogruSayisi,
        bagli: o.bagli,
        cevapladi: this.cevaplar.has(o.anahtar),
      }))
      .sort((a, b) => b.skor - a.skor || a.isim.localeCompare(b.isim, 'tr'));
  }

  get bagliSayisi() {
    return [...this.oyuncular.values()].filter((o) => o.bagli).length;
  }

  // ---------- Tur akışı ----------

  sifirla(sessiz = false) {
    this._sayaciDurdur();
    this.durum = 'bekliyor'; // bekliyor | oynaniyor | tur-sonu | duraklatildi | bitti
    this.ayar = { grup: 'e', seviye: 1, mod: 'surdur' };
    this.havuz = [];
    this.soruIndeksi = -1;
    this.soru = null;
    this.cevaplar = new Map(); // oyuncu anahtarı -> {secim, dogruMu, kazanilan}
    this.sonTurPuanlari = new Map(); // en son kapanmış turun puan anlık görüntüsü (geri alma için)
    this.kalanSure = null;
    this.dogruSirasi = 0;
    if (!sessiz) {
      for (const o of this.oyuncular.values()) {
        o.skor = 0;
        o.dogruSayisi = 0;
      }
      console.log('[oyun] sıfırlandı');
      this.emit('degisti');
    }
  }

  baslat({ grup, seviye, mod }) {
    const gecerliGrup = ['e', 'i', 'c', 'p'].includes(grup) ? grup : 'e';
    const gecerliSeviye = [1, 2, 3].includes(Number(seviye)) ? Number(seviye) : 1;
    const gecerliMod = ['surdur', 'eksik', 'kural'].includes(mod) ? mod : 'surdur';

    this.ayar = { grup: gecerliGrup, seviye: gecerliSeviye, mod: gecerliMod };
    this.havuz = icerik.havuzOlustur(gecerliGrup, gecerliSeviye, gecerliMod);
    this.soruIndeksi = -1;

    if (!this.havuz.length) {
      console.log(`[oyun] havuz boş: ${gecerliGrup}/${gecerliSeviye}/${gecerliMod}`);
      return { hata: 'Bu grup, seviye ve mod için soru bulunamadı.' };
    }

    for (const o of this.oyuncular.values()) {
      o.skor = 0;
      o.dogruSayisi = 0;
    }
    console.log(`[oyun] başladı — grup:${gecerliGrup} seviye:${gecerliSeviye} mod:${gecerliMod} (${this.havuz.length} soru)`);
    this.sonrakiSoru();
    return { tamam: true };
  }

  sonrakiSoru() {
    this._sayaciDurdur();
    this.soruIndeksi++;

    if (this.soruIndeksi >= this.havuz.length) {
      this.durum = 'bitti';
      this.soru = null;
      console.log('[oyun] tüm sorular bitti');
      this.emit('oyunBitti', this.skorTablosu());
      return;
    }

    this.soru = this.havuz[this.soruIndeksi];
    this.cevaplar = new Map();
    this.dogruSirasi = 0;
    this.durum = 'oynaniyor';

    const sure = SEVIYE_SURESI[this.soru.seviye] ?? null;
    this.kalanSure = sure;

    console.log(`[tur] ${this.soruIndeksi + 1}/${this.havuz.length} — ${this.soru.id}`);
    this.emit('turBasladi', {
      soru: icerik.istemciIcin(this.soru, this.soruIndeksi + 1, this.havuz.length),
      kalanSure: this.kalanSure,
    });

    if (sure) this._sayaciBaslat();
  }

  // Özel soru (öğrenci tasarımı) — havuza sırayı bozmadan araya girer
  ozelSoru(soru) {
    this._sayaciDurdur();
    this.havuz.splice(this.soruIndeksi + 1, 0, soru);
    this.sonrakiSoru();
  }

  atla() {
    if (this.durum === 'bitti') return;
    console.log('[tur] öğretmen soruyu atladı');
    this.sonrakiSoru();
  }

  duraklat() {
    if (this.durum !== 'oynaniyor') return;
    this.durum = 'duraklatildi';
    this._sayaciDurdur();
    console.log('[oyun] duraklatıldı');
    this.emit('degisti');
  }

  devam() {
    if (this.durum !== 'duraklatildi') return;
    this.durum = 'oynaniyor';
    if (this.kalanSure) this._sayaciBaslat();
    console.log('[oyun] devam ediyor');
    this.emit('degisti');
  }

  // ---------- Cevap doğrulama (yalnızca sunucuda) ----------

  cevapVer(socketId, secim) {
    if (this.durum !== 'oynaniyor' || !this.soru) return { hata: 'Şu an cevap alınmıyor.' };

    const oyuncu = this.oyuncuBul(socketId);
    if (!oyuncu) return { hata: 'Önce oyuna katılmalısın.' };
    if (this.cevaplar.has(oyuncu.anahtar)) return { hata: 'Bu tur için cevabın alındı.' };

    // İstemciden gelen değer, sorunun geçerli seçenekleri arasında olmalı
    const secimStr = String(secim);
    if (!this.soru.secenekler.map(String).includes(secimStr)) {
      console.log(`[cevap] ${oyuncu.isim} geçersiz seçenek gönderdi`);
      return { hata: 'Geçersiz seçenek.' };
    }

    const dogruMu = secimStr === String(icerik.dogruCevap(this.soru));
    let kazanilan = 0;
    if (dogruMu) {
      kazanilan = TEMEL_PUAN + (HIZ_BONUSU[this.dogruSirasi] || 0);
      this.dogruSirasi++;
      oyuncu.skor += kazanilan;
      oyuncu.dogruSayisi++;
    }
    this.cevaplar.set(oyuncu.anahtar, { secim: secimStr, dogruMu, kazanilan });
    console.log(`[cevap] ${oyuncu.isim} → ${dogruMu ? 'doğru' : 'yanlış'} (+${kazanilan})`);

    this.emit('cevapGeldi');

    // Bağlı herkes cevapladıysa turu kapat
    if (this.cevaplar.size >= this.bagliSayisi && this.bagliSayisi > 0) {
      this.turuKapat('herkes-cevapladi');
    }
    return { tamam: true, dogruMu, kazanilan };
  }

  turuKapat(sebep) {
    if (this.durum !== 'oynaniyor') return;
    this._sayaciDurdur();
    this.durum = 'tur-sonu';
    console.log(`[tur] kapandı (${sebep})`);

    // Bu turda dağıtılan puanları geri alınabilir olsun diye sakla
    this.sonTurPuanlari = new Map([...this.cevaplar].map(([a, c]) => [a, { ...c }]));

    const sonuc = icerik.cevapAcikla(this.soru);
    const kisisel = {};
    for (const [anahtar, c] of this.cevaplar) kisisel[anahtar] = c;

    this.emit('turBitti', {
      sonuc,
      kisisel,
      skorlar: this.skorTablosu(),
      sonSoruMu: this.soruIndeksi >= this.havuz.length - 1,
    });

    // Kısa kutlama arası, sonra otomatik sonraki soru
    this._araZamanlayici = setTimeout(() => {
      if (this.durum === 'tur-sonu') this.sonrakiSoru();
    }, TUR_ARASI * 1000);
  }

  // ---------- Öğretmen düzenlemeleri ----------

  // En son turda dağıtılan puanları geri alır (yanlış/tartışmalı soru vb.).
  // Aktif tur oynanıyorsa o turdaki puanlar, değilse son kapanan tur geri alınır.
  turPuaniniGeriAl() {
    const aktifMi = this.durum === 'oynaniyor' || this.durum === 'duraklatildi';
    const kaynak = aktifMi ? this.cevaplar : this.sonTurPuanlari;

    let toplam = 0;
    let sayi = 0;
    for (const [anahtar, c] of kaynak) {
      if (!c.dogruMu || !c.kazanilan) continue;
      const oyuncu = this.oyuncular.get(anahtar);
      if (!oyuncu) continue;
      oyuncu.skor = Math.max(0, oyuncu.skor - c.kazanilan);
      oyuncu.dogruSayisi = Math.max(0, oyuncu.dogruSayisi - 1);
      toplam += c.kazanilan;
      sayi++;
    }

    if (!sayi) return { hata: 'Geri alınacak puan yok.' };

    // Aynı puanların ikinci kez geri alınmasını önle
    if (aktifMi) {
      for (const c of this.cevaplar.values()) {
        c.kazanilan = 0;
        c.geriAlindi = true;
      }
    }
    this.sonTurPuanlari = new Map();

    console.log(`[puan] tur puanları geri alındı — ${sayi} öğrenci, toplam -${toplam}`);
    this.emit('degisti');
    return { tamam: true, geriAlinan: toplam, oyuncuSayisi: sayi };
  }

  isimDegistir(anahtar, yeniIsim) {
    const oyuncu = this.oyuncular.get(anahtar);
    if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

    const temiz = String(yeniIsim || '').trim().slice(0, 20);
    if (!temiz) return { hata: 'İsim boş olamaz.' };

    const yeniAnahtar = anahtarla(temiz);
    if (yeniAnahtar !== anahtar && this.oyuncular.has(yeniAnahtar)) {
      return { hata: 'Bu isim zaten kullanılıyor.' };
    }

    const eskiIsim = oyuncu.isim;
    if (yeniAnahtar !== anahtar) {
      // Anahtar değiştiği için tüm haritalarda yeniden anahtarla
      this.oyuncular.delete(anahtar);
      oyuncu.anahtar = yeniAnahtar;
      this.oyuncular.set(yeniAnahtar, oyuncu);
      for (const harita of [this.cevaplar, this.sonTurPuanlari]) {
        if (harita.has(anahtar)) {
          harita.set(yeniAnahtar, harita.get(anahtar));
          harita.delete(anahtar);
        }
      }
    }
    oyuncu.isim = temiz;

    console.log(`[düzenleme] "${eskiIsim}" → "${temiz}" olarak değiştirildi`);
    this.emit('degisti');
    return { tamam: true, oyuncu, eskiAnahtar: anahtar };
  }

  puanAyarla(anahtar, puan) {
    const oyuncu = this.oyuncular.get(anahtar);
    if (!oyuncu) return { hata: 'Öğrenci bulunamadı.' };

    const p = Math.round(Number(puan));
    if (!Number.isFinite(p) || p < 0 || p > 1000000) return { hata: 'Geçersiz puan.' };

    console.log(`[düzenleme] ${oyuncu.isim} puanı ${oyuncu.skor} → ${p}`);
    oyuncu.skor = p;
    this.emit('degisti');
    return { tamam: true };
  }

  // ---------- Sayaç ----------

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
