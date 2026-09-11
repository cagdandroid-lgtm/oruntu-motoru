// Öğretmen paneli şifresi ve .env okuma.
//
// Şifre ASLA koda gömülmez: process.env.ADMIN_PASSWORD'tan okunur.
// Kaynak sırası: gerçek ortam değişkeni → .env dosyası → ortama göre varsayılan.
//
//  * YEREL geliştirmede (process.env.RENDER yoksa): .env oluşturmak ZORUNLU
//    DEĞİLDİR; sunucu "uycep-local" varsayılanıyla çalışır, npm start yeter.
//  * RENDER'da (process.env.RENDER varsa): varsayılan KULLANILMAZ; /teacher
//    girişi ADMIN_PASSWORD tanımlanana kadar kapalı tutulur.
//
// Bağımlılık eklemiyoruz (yalnız express + socket.io kuralı): .env okuyucu
// burada, on beş satırda.

const fs = require('fs');
const path = require('path');

const YEREL_VARSAYILAN = 'uycep-local';
const ENV_DOSYASI = path.join(__dirname, '..', '.env');

// KEY=value satırlarını okur; tırnakları ve # yorumlarını atar.
function envOku() {
  let ham;
  try {
    ham = fs.readFileSync(ENV_DOSYASI, 'utf8');
  } catch {
    return {}; // .env yoksa sorun değil
  }
  const degerler = {};
  for (const satir of ham.split('\n')) {
    const temiz = satir.trim();
    if (!temiz || temiz.startsWith('#')) continue;
    const esittir = temiz.indexOf('=');
    if (esittir < 1) continue;
    const anahtar = temiz.slice(0, esittir).trim();
    const deger = temiz.slice(esittir + 1).trim().replace(/^["']|["']$/g, '');
    degerler[anahtar] = deger;
  }
  return degerler;
}

function sifreyiCoz() {
  const renderMi = !!process.env.RENDER;

  if (process.env.ADMIN_PASSWORD) {
    return { sifre: process.env.ADMIN_PASSWORD, kaynak: 'ADMIN_PASSWORD ortam değişkeni', acik: true, renderMi };
  }

  const env = envOku();
  if (env.ADMIN_PASSWORD) {
    process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD; // alt modüller de görsün
    return { sifre: env.ADMIN_PASSWORD, kaynak: '.env dosyası', acik: true, renderMi };
  }

  if (renderMi) {
    // Render'da varsayılan şifre kullanılmaz — panel kapalı kalır.
    return { sifre: null, kaynak: 'tanımlı değil', acik: false, renderMi };
  }

  return { sifre: YEREL_VARSAYILAN, kaynak: 'yerel varsayılan', acik: true, renderMi };
}

// Sunucu açılışında konsola basılan özet (Render'da yalnız hesap sahibi görür).
function baslangictaYaz(kimlik) {
  const cizgi = '─'.repeat(52);
  console.log(cizgi);
  if (!kimlik.acik) {
    console.log('🚨🚨🚨  ÖĞRETMEN PANELİ KAPALI  🚨🚨🚨');
    console.log('');
    console.log('   ADMIN_PASSWORD tanımlı değil ve bu bir Render ortamı.');
    console.log('   Varsayılan şifre GÜVENLİK GEREĞİ kullanılmaz.');
    console.log('   /teacher girişi, Render panelinden');
    console.log('   Environment → ADMIN_PASSWORD tanımlanana kadar KAPALI.');
    console.log('');
  } else {
    console.log(`🔑 Öğretmen paneli şifresi: ${kimlik.sifre}`);
    console.log(`   Kaynak: ${kimlik.kaynak}`);
    if (kimlik.kaynak === 'yerel varsayılan') {
      console.log('   Kendi şifreni istersen: .env dosyasına ADMIN_PASSWORD=... yaz.');
    }
  }
  console.log(cizgi);
}

module.exports = { sifreyiCoz, baslangictaYaz, YEREL_VARSAYILAN };
