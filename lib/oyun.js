// Oyun durumu ve tur mantığı. Cevap doğrulaması yalnızca burada yapılır.

const { EventEmitter } = require('events');
const icerik = require('./oruntu');
const { OlcmeDeposu } = require('./olcme');
const duzenleme = require('./duzenleme');
const oturum = require('./oturum');

const SEVIYE_SURESI = { 1: null, 2: null, 3: 30 }; // saniye — seviye 3'te süre sınırı zorunlu
const TUR_ARASI = 6; // doğru cevabın gösterildiği süre (sn)
const TEMEL_PUAN = 100;
const HIZ_BONUSU = [50, 40, 30, 20, 10]; // ilk doğru cevaplayanlara

class Oyun extends EventEmitter {
  constructor() {
    super();
    this.oyuncular = new Map(); // anahtar -> oyuncu
    this.olcme = new OlcmeDeposu(); // olay kaydı (bellekte; ders sonunda CSV indirilir)
    // Sınıf oturumu: öğretmen bir grup/etkinlik seçene kadar öğrenci ekranı bekler.
    this.oturum = { acik: false, grup: null };
    this.sifirla(true);
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

  oturumAc(grup) {
    return oturum.oturumAc(this, grup);
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

  // Öğrencilere de yayınlanan tablo: KOD burada bulunmaz
  // (isim ↔ kod eşlemesi yalnız öğretmen panelinde yaşar).
  skorTablosu() {
    return [...this.oyuncular.values()]
      .map((o) => ({
        isim: o.isim,
        skor: o.skor,
        dogruSayisi: o.dogruSayisi,
        bagli: o.bagli,
        cevapladi: this.cevaplar.has(o.anahtar),
      }))
      .sort((a, b) => b.skor - a.skor || a.isim.localeCompare(b.isim, 'tr'));
  }

  // Öğretmen paneline özel tablo: takma ad (kod) ve ölçüm sayısı burada görünür.
  // skorTablosu() öğrencilere de gittiği için kod ORAYA eklenmez.
  panelTablosu() {
    // Kayıt sayıları tek geçişte toplanır (her cevapta yeniden yayınlanır)
    const sayilar = new Map();
    for (const k of this.olcme.gecerliKayitlar()) {
      sayilar.set(k.anahtar, (sayilar.get(k.anahtar) || 0) + 1);
    }
    return [...this.oyuncular.values()]
      .map((o) => ({
        anahtar: o.kod, // panelde düzenleme kimliği = kalıcı öğrenci kodu
        kod: o.kod,
        isim: o.isim,
        grup: o.grup,
        misafir: !!o.misafir,
        kilitli: !!o.kilitli,
        skor: o.skor,
        dogruSayisi: o.dogruSayisi,
        bagli: o.bagli,
        cevapladi: this.cevaplar.has(o.kod),
        kayitSayisi: sayilar.get(o.kod) || 0,
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
    // Grup oturumdan gelir; sıfırlama oturumu kapatmaz.
    this.ayar = { grup: (this.oturum && this.oturum.grup) || 'e', seviye: 1, mod: 'surdur' };
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

  baslat({ seviye, mod }) {
    if (!this.oturum.acik) return { hata: 'Önce bir grup seçip oturumu aç.' };
    const gecerliGrup = this.oturum.grup; // oturum TEK gruba aittir
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
    this.turNo++;
    this.soruBaslangic = Date.now();
    this.duraklamaToplami = 0; // duraklatılan saniyeler süreye yazılmaz

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
    this._duraklamaBasi = Date.now();
    this._sayaciDurdur();
    console.log('[oyun] duraklatıldı');
    this.emit('degisti');
  }

  devam() {
    if (this.durum !== 'duraklatildi') return;
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

    // Standart olay kaydı (ölçme ve veri standardı) — isim değil kod yazılır.
    this.olcme.ekle({
      soru: this.soru,
      ayar: this.ayar,
      oyuncu,
      sonuc: dogruMu ? 'dogru' : 'yanlis',
      sureSn: this._gecenSure(),
      deneme: 1, // her soruda tek cevap hakkı vardır
      ipucu: false, // bu oyunda ipucu mekaniği yok
      turNo: this.turNo,
    });

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
    this.sonTurNo = this.turNo;

    // Bağlı olduğu hâlde cevaplamayan öğrenci "atlandi" olarak kaydedilir.
    const gecen = this._gecenSure();
    for (const oyuncu of this.oyuncular.values()) {
      if (!oyuncu.bagli || this.cevaplar.has(oyuncu.anahtar)) continue;
      this.olcme.ekle({
        soru: this.soru,
        ayar: this.ayar,
        oyuncu,
        sonuc: 'atlandi',
        sureSn: gecen,
        deneme: 0,
        ipucu: false,
        turNo: this.turNo,
      });
    }

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
