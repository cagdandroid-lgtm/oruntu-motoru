// Oturum durum makinesi: BOŞTA → LOBİ → OYUN ⇄ ARA → SONUÇ
//
// Aşama, var olan oyun durumundan TÜRETİLİR; mekanik değişmez. Grup ve
// etkinlik seçimi yalnız BOŞTA ve LOBİ'de yapılabilir — oyun başlayınca
// kilitlenir ve değiştirmenin tek yolu "Etkinliği Bitir"dir.

const ASAMALAR = {
  bosta: { ad: 'Boşta', emoji: '⚪', aciklama: 'Grup seçilmedi; öğrenci ekranları bekliyor.' },
  lobi: { ad: 'Lobi', emoji: '🚪', aciklama: 'Grup açık; öğrenciler isimlerine dokunuyor.' },
  oyun: { ad: 'Oyun', emoji: '🎮', aciklama: 'Etkinlik sürüyor.' },
  ara: { ad: 'Ara', emoji: '🎉', aciklama: 'Cevap açıklandı; sıradaki soru bekleniyor.' },
  sonuc: { ad: 'Sonuç', emoji: '🏁', aciklama: 'Etkinlik bitti; kapanış ekranı.' },
};

// Grup/etkinlik seçiminin açık olduğu aşamalar
const SECIM_ASAMALARI = ['bosta', 'lobi'];

function asama(oyun) {
  if (!oyun.oturum.acik) return 'bosta';
  if (oyun.durum === 'bitti') return 'sonuc';
  if (oyun.durum === 'oynaniyor' || oyun.durum === 'duraklatildi') return 'oyun';
  if (oyun.durum === 'tur-sonu') return 'ara';
  return 'lobi';
}

const secimAcikMi = (oyun) => SECIM_ASAMALARI.includes(asama(oyun));

// Panele giden özet
function ozet(oyun) {
  const a = asama(oyun);
  return {
    asama: a,
    ...ASAMALAR[a],
    secimAcik: secimAcikMi(oyun),
    kilitNotu: secimAcikMi(oyun)
      ? ''
      : 'Grup ve etkinlik kilitli — değiştirmek için “⏹ Etkinliği Bitir”.',
  };
}

// Etkinliği bitir: oturum BOŞTA'ya döner, sahne boşalır, öğrenci cihazları
// bekleme ekranına düşer ve kayıtlı isimlerini temizler.
// Ölçüm kayıtları SİLİNMEZ — ders sonunda CSV olarak indirilecek.
function etkinligiBitir(oyun) {
  const dusenSoketler = [];
  for (const o of oyun.oyuncular.values()) if (o.socketId) dusenSoketler.push(o.socketId);

  const oyuncuSayisi = oyun.oyuncular.size;
  oyun.oyuncular.clear();
  oyun.sifirla(true); // sessiz: tur durumu sıfırlanır, ölçüm kayıtları kalır
  oyun.oturum = { acik: false, grup: null, dersEtiketi: '' };

  console.log(
    `[oturum] ⏹ etkinlik bitirildi — ${oyuncuSayisi} öğrenci sahneden indi, ` +
      `${oyun.olcme.sayi} ölçüm kaydı korunuyor`
  );
  oyun.emit('degisti');
  return { tamam: true, dusenSoketler };
}

module.exports = { ASAMALAR, asama, secimAcikMi, ozet, etkinligiBitir };
