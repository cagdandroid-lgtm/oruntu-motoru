// Lobi/bekleme ekranı ortam animasyonu: canvas ile süzülen örüntü sembolleri.
// Düşük yoğunluk, yavaş hareket, CPU dostu. Soru ekranında ÇALIŞMAZ.
// prefers-reduced-motion açıksa hiç başlamaz.

const Ambiyans = (() => {
  const SEMBOLLER = ['🔺', '🟦', '⭐', '🌸', '🍎', '🐟', '🟢', '🟣'];
  const YOGUNLUK = 14; // ekranda aynı anda en çok bu kadar öğe
  let tuval = null;
  let ctx = null;
  let parcalar = [];
  let cerceve = null;
  let sonAn = 0;

  const azHareket = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function olcuAyarla() {
    if (!tuval) return;
    const oran = Math.min(window.devicePixelRatio || 1, 2);
    tuval.width = tuval.clientWidth * oran;
    tuval.height = tuval.clientHeight * oran;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
  }

  const yeniParca = (baslangicta) => ({
    x: Math.random() * (tuval.clientWidth || 1),
    y: baslangicta ? Math.random() * (tuval.clientHeight || 1) : (tuval.clientHeight || 1) + 40,
    hiz: 8 + Math.random() * 14, // px/sn — bilinçli olarak yavaş
    salinim: 6 + Math.random() * 14,
    faz: Math.random() * Math.PI * 2,
    boy: 20 + Math.random() * 18,
    saydam: 0.07 + Math.random() * 0.09, // çok soluk: metnin okunurluğunu bozmaz
    sembol: SEMBOLLER[Math.floor(Math.random() * SEMBOLLER.length)],
  });

  function adim(an) {
    const fark = Math.min((an - sonAn) / 1000, 0.05);
    sonAn = an;
    const g = tuval.clientWidth;
    const y = tuval.clientHeight;
    ctx.clearRect(0, 0, g, y);

    for (const p of parcalar) {
      p.y -= p.hiz * fark;
      p.faz += fark * 0.6;
      if (p.y < -40) Object.assign(p, yeniParca(false), { y: y + 40 });
      ctx.globalAlpha = p.saydam;
      ctx.font = `${p.boy}px system-ui, sans-serif`;
      ctx.fillText(p.sembol, p.x + Math.sin(p.faz) * p.salinim, p.y);
    }
    ctx.globalAlpha = 1;
    cerceve = requestAnimationFrame(adim);
  }

  return {
    baslat(tuvalId) {
      if (cerceve || azHareket()) return;
      tuval = document.getElementById(tuvalId);
      if (!tuval) return;
      ctx = tuval.getContext('2d');
      olcuAyarla();
      parcalar = Array.from({ length: YOGUNLUK }, () => yeniParca(true));
      window.addEventListener('resize', olcuAyarla);
      sonAn = performance.now();
      cerceve = requestAnimationFrame(adim);
    },
    durdur() {
      if (cerceve) cancelAnimationFrame(cerceve);
      cerceve = null;
      window.removeEventListener('resize', olcuAyarla);
      if (ctx && tuval) ctx.clearRect(0, 0, tuval.clientWidth, tuval.clientHeight);
    },
  };
})();
