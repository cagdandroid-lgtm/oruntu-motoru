// Öğrenci ve öğretmen ekranlarının paylaştığı durum göstergeleri.
// Kural: bilgi asla yalnız renkle verilmez — her rozet ikon + metin taşır.

// Kullanıcı üretimi metni (isim, tasarım hücresi) innerHTML'e gömmeden önce kaçış.
function kacan(metin) {
  return String(metin == null ? '' : metin)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function durumRozeti(oyuncu) {
  if (!oyuncu.bagli) return '<span class="durum kopuk">🔌 Kopuk</span>';
  if (oyuncu.cevapladi) return '<span class="durum cevapladi">✅ Cevapladı</span>';
  return '<span class="durum bekliyor">⏳ Düşünüyor</span>';
}

// Sayaç: son 10 saniyede renge ek olarak "son" etiketi gösterilir.
function sayacMetni(kalan) {
  if (kalan === null || kalan === undefined) return '⏱ Süresiz';
  const saniye = Math.max(0, kalan);
  return saniye <= 10 ? `⏱ Son ${saniye} sn!` : `⏱ ${saniye} sn`;
}
