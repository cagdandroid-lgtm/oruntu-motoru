// CHC dar yetenek etiketleri — TEK kaynak (CHC hizalaması, CLAUDE.md).
//
// Etiket, görevin MODUNA göre belirlenir:
//   Sürdür · Eksiği Bul · Kuralı Yakala · Hatayı Bul  → Gf-I  (tümevarım: kuralı çıkarma)
//   Tersine Örüntü · Uzak Terim                       → Gf-RQ (nicel akıl yürütme)
//   Kendi Örüntünü Kur                                → Glr   (bellekten geri getirme)
//
// patterns.json, üreteçler ve olay kaydı bu eşlemeyi kullanır. CHC bilgisi
// öğretmen panelinde yalnız "ℹ️ Etkinlik Bilgisi" modalında görünür;
// öğrenciye hiçbir biçimde gitmez.

// CLAUDE.md'nin tanımladığı dar yetenek kodları
const DAR_KODLAR = ['Gf-I', 'Gf-RG', 'Gf-RQ', 'Gv-Vz', 'Gv-SR', 'Gsm-WM', 'Gs-P', 'Glr'];

const MOD_CHC = {
  surdur: ['Gf-I'],
  eksik: ['Gf-I'],
  kural: ['Gf-I'],
  hata: ['Gf-I'],
  tersine: ['Gf-RQ'],
  uzak: ['Gf-RQ'],
  kendi: ['Glr'],
};

const VARSAYILAN = ['Gf-I']; // örüntü oyununun çekirdeği

const chcKodu = (mod) => (MOD_CHC[mod] || VARSAYILAN).slice();
const darMi = (kod) => DAR_KODLAR.includes(kod);

// Kayda yazılacak etiket: sorunun kendi etiketi DAR koddaysa o kullanılır,
// değilse (eski/geniş etiket, etiketsiz soru) modun etiketi yazılır.
// Böylece kayda asla geniş kod ("Gf", "Gq") düşmez.
function kayitEtiketi(soru) {
  const kendi = Array.isArray(soru && soru.chc) ? soru.chc.filter(darMi) : [];
  return kendi.length ? kendi : chcKodu(soru && soru.mod);
}

module.exports = { DAR_KODLAR, MOD_CHC, chcKodu, darMi, kayitEtiketi };
