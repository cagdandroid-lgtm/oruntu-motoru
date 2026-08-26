// Yazdırılabilir öğrenci karnesi (A4, sade, veli diline uygun).
// Tek öğrenci veya sınıfın tamamı için tek belge üretir; her öğrenci
// ayrı bir A4 sayfasına gelir (veli toplantısı öncesi tek tık).

const kacir = (metin) =>
  String(metin === null || metin === undefined ? '' : metin).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const TARIH_BICIMI = { day: '2-digit', month: 'long', year: 'numeric' };
const bugun = () => new Date().toLocaleDateString('tr-TR', TARIH_BICIMI);

// Doğruluk yüzdesine göre veli diline uygun, cesaretlendirici yorum.
function yorum(yuzde, toplam) {
  if (!toplam) return 'Bu oturumda henüz soru çözülmedi.';
  if (yuzde >= 85) return 'Örüntü kuralını hızlı ve güvenle yakalıyor.';
  if (yuzde >= 65) return 'Örüntülerin çoğunu doğru çözüyor; zor örneklerde biraz daha pratik iyi gelecek.';
  if (yuzde >= 40) return 'Örüntü kurmayı öğreniyor; birlikte örnek çalışmak gelişimini hızlandırır.';
  return 'Örüntü çalışmalarına yeni alışıyor; kısa ve bol örnekli tekrarlar önerilir.';
}

const sureMetni = (sn) => (sn === null || sn === undefined ? '—' : `${sn} sn`);

function cubuk(yuzde) {
  const g = Math.max(0, Math.min(100, Number(yuzde) || 0));
  return `<span class="cubuk"><span class="dolu" style="width:${g}%"></span></span>`;
}

function kategoriTablosu(rapor) {
  if (!rapor.kategoriler.length) {
    return '<p class="bos">Bu oturumda kayıtlı görev yok.</p>';
  }
  const satirlar = rapor.kategoriler
    .map(
      (k) => `<tr>
        <td>${kacir(k.etiket)}</td>
        <td class="say">${k.dogru}/${k.toplam}</td>
        <td class="oran">${cubuk(k.yuzde)} <b>%${k.yuzde}</b></td>
      </tr>`
    )
    .join('');
  return `<table class="dokum">
    <thead><tr><th>Örüntü türü</th><th class="say">Doğru</th><th>Başarı</th></tr></thead>
    <tbody>${satirlar}</tbody>
  </table>`;
}

function degisimSatiri(rapor) {
  if (!rapor.degisim) return '';
  const d = rapor.degisim;
  const ok = d.dogrulukFarki > 0 ? '▲' : d.dogrulukFarki < 0 ? '▼' : '▬';
  const sozcuk = d.dogrulukFarki > 0 ? 'yükseldi' : d.dogrulukFarki < 0 ? 'geriledi' : 'aynı kaldı';
  const sure =
    d.sureFarki === null
      ? ''
      : ` Ortalama çözüm süresi ${Math.abs(d.sureFarki)} sn ${d.sureFarki < 0 ? 'kısaldı' : 'uzadı'}.`;
  return `<div class="degisim">
    <b>${ok} Geçen oturuma göre:</b> Başarı yüzdesi %${d.oncekiDogruluk} → %${rapor.dogrulukYuzdesi}
    (${Math.abs(d.dogrulukFarki)} puan ${sozcuk}).${sure}
  </div>`;
}

// Tek öğrencinin karne gövdesi (bir A4 sayfa)
function karneSayfasi(rapor, ayar) {
  return `<section class="sayfa">
  <header class="ust">
    <div>
      <h1>🧩 Örüntü Motoru — Öğrenci Karnesi</h1>
      <p class="alt">UYCEP Logic · sınıf içi örüntü çalışması</p>
    </div>
    <div class="tarih">${kacir(bugun())}</div>
  </header>

  <div class="kimlik">
    <div><span class="etiket">Öğrenci</span><b>${kacir(rapor.isim)}</b></div>
    <div><span class="etiket">Öğrenci kodu</span><b>${kacir(rapor.kod)}</b></div>
    <div><span class="etiket">Çalışma grubu</span><b>${kacir(ayar.grup)}</b></div>
  </div>

  <div class="kutular">
    <div class="kutu">
      <span class="sayi">%${rapor.dogrulukYuzdesi}</span>
      <span class="ad">Genel başarı</span>
    </div>
    <div class="kutu">
      <span class="sayi">${rapor.dogru}/${rapor.toplam}</span>
      <span class="ad">Doğru cevap</span>
    </div>
    <div class="kutu">
      <span class="sayi">${sureMetni(rapor.ortalamaSureSn)}</span>
      <span class="ad">Ortalama süre</span>
    </div>
    <div class="kutu">
      <span class="sayi">${rapor.enUzunSeri}</span>
      <span class="ad">En uzun doğru serisi</span>
    </div>
  </div>

  ${degisimSatiri(rapor)}

  <h2>Örüntü türlerine göre başarı</h2>
  ${kategoriTablosu(rapor)}

  <h2>Öğretmen notu</h2>
  <p class="yorum">${kacir(yorum(rapor.dogrulukYuzdesi, rapor.toplam))}</p>

  <h2>Evde birlikte yapabilirsiniz</h2>
  <ul class="oneri">
    <li>Mutfakta ya da yolda gördüğünüz tekrar eden desenleri (fayans, çit, korkuluk) birlikte fark edin.</li>
    <li>Bir örüntü başlatın, çocuğunuz devam ettirsin; sonra sırayı değiştirin.</li>
    <li>“Buradaki kural ne?” diye sorun — kuralı <i>anlatması</i>, bilmesinden daha değerlidir.</li>
  </ul>

  <footer class="dip">
    Bu karne oyun içi gözlemlere dayanır; bir sınav sonucu değildir.
    Amacı, çocuğun örüntü kurma becerisindeki gelişimi sizinle paylaşmaktır.
  </footer>
</section>`;
}

const STIL = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #fff; color: #24333B;
    font-family: 'Poppins', system-ui, -apple-system, sans-serif;
    font-size: 12pt; line-height: 1.5;
  }
  .sayfa { padding: 0 0 6mm; page-break-after: always; break-after: page; }
  .sayfa:last-child { page-break-after: auto; break-after: auto; }
  .ust { display: flex; justify-content: space-between; align-items: flex-end;
         border-bottom: 3px solid #1F4E4A; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 16pt; margin: 0; color: #1F4E4A; }
  h2 { font-size: 12.5pt; margin: 16px 0 8px; color: #1F4E4A; }
  .alt, .tarih { color: #55666F; font-size: 10pt; margin: 2px 0 0; }
  .kimlik { display: flex; gap: 10px; margin-bottom: 14px; }
  .kimlik > div { flex: 1; border: 1px solid #DCD3C4; border-radius: 8px; padding: 8px 10px; }
  .etiket { display: block; font-size: 9pt; color: #55666F; text-transform: uppercase; letter-spacing: .04em; }
  .kutular { display: flex; gap: 10px; margin-bottom: 12px; }
  .kutu { flex: 1; text-align: center; border: 1px solid #DCD3C4; border-radius: 8px;
          padding: 10px 6px; background: #F5F1EA; }
  .kutu .sayi { display: block; font-size: 17pt; font-weight: 700; color: #1F4E4A; }
  .kutu .ad { font-size: 9.5pt; color: #55666F; }
  .degisim { border-left: 4px solid #8F5214; background: #F6E8D5; padding: 8px 12px;
             border-radius: 6px; font-size: 10.5pt; margin-bottom: 6px; }
  table.dokum { width: 100%; border-collapse: collapse; font-size: 11pt; }
  .dokum th { text-align: left; border-bottom: 2px solid #DCD3C4; padding: 6px 4px;
              font-size: 10pt; color: #55666F; font-weight: 600; }
  .dokum td { border-bottom: 1px solid #EFE9DE; padding: 6px 4px; vertical-align: middle; }
  .dokum .say { text-align: center; white-space: nowrap; }
  .dokum .oran { width: 42%; white-space: nowrap; }
  .cubuk { display: inline-block; width: 60%; height: 10px; background: #E6DFD2;
           border-radius: 5px; overflow: hidden; vertical-align: middle; margin-right: 6px; }
  .cubuk .dolu { display: block; height: 100%; background: #3A7D78; }
  .yorum { margin: 0; }
  .oneri { margin: 0; padding-left: 20px; }
  .oneri li { margin-bottom: 4px; }
  .bos { color: #55666F; }
  .dip { margin-top: 18px; border-top: 1px solid #DCD3C4; padding-top: 8px;
         font-size: 9.5pt; color: #55666F; }
  .arac { position: sticky; top: 0; display: flex; gap: 10px; align-items: center;
          background: #1F4E4A; color: #fff; padding: 10px 14px; margin: -14px -14px 14px;
          font-size: 11pt; }
  .arac button { font: inherit; font-weight: 600; background: #fff; color: #1F4E4A;
                 border: 0; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
  @media print { .arac { display: none; } }
`;

function belge(baslik, govde, aracMetni) {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${kacir(baslik)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>${STIL}</style></head>
<body>
<div class="arac">
  <button onclick="window.print()">🖨️ Yazdır / PDF olarak kaydet</button>
  <span>${kacir(aracMetni)}</span>
</div>
${govde}
</body></html>`;
}

function tekKarne(rapor, ayar) {
  return belge(
    `Karne — ${rapor.isim}`,
    karneSayfasi(rapor, ayar),
    'Yazdırma penceresinde “Hedef: PDF olarak kaydet” seçilebilir.'
  );
}

function tumKarneler(raporlar, ayar) {
  const govde = raporlar.map((r) => karneSayfasi(r, ayar)).join('\n');
  return belge(
    'Sınıf karneleri',
    govde || '<p class="bos">Henüz öğrenci yok.</p>',
    `${raporlar.length} öğrenci · her öğrenci ayrı sayfada.`
  );
}

module.exports = { tekKarne, tumKarneler };
