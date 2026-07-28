// Kutlama efektleri ve opsiyonel sesler.

const Efekt = (() => {
  const RENKLER = ['#4A3A75', '#7E6CAD', '#FFD166', '#2E9E6B', '#EFEBF6', '#F78FB3'];
  const kap = () => document.getElementById('konfeti');

  function konfeti(adet = 60) {
    const alan = kap();
    if (!alan) return;
    for (let i = 0; i < adet; i++) {
      const parca = document.createElement('div');
      parca.className = 'konfeti-parca';
      parca.style.left = Math.random() * 100 + 'vw';
      parca.style.top = '-20px';
      parca.style.background = RENKLER[Math.floor(Math.random() * RENKLER.length)];
      parca.style.animationDuration = 2 + Math.random() * 1.6 + 's';
      parca.style.animationDelay = Math.random() * 0.35 + 's';
      alan.appendChild(parca);
      setTimeout(() => parca.remove(), 4200);
    }
  }

  // Web Audio ile küçük tonlar — dosya bağımlılığı yok
  let sesAcik = true;
  let ctx = null;

  function ton(frekans, sure, tip = 'sine') {
    if (!sesAcik) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const kazanc = ctx.createGain();
      osc.type = tip;
      osc.frequency.value = frekans;
      kazanc.gain.setValueAtTime(0.09, ctx.currentTime);
      kazanc.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sure);
      osc.connect(kazanc).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + sure);
    } catch (_) {
      /* ses desteklenmiyorsa sessizce geç */
    }
  }

  return {
    konfeti,
    dogruSesi: () => { ton(660, 0.14); setTimeout(() => ton(880, 0.22), 130); },
    yanlisSesi: () => ton(200, 0.25, 'triangle'),
    tikSesi: () => ton(520, 0.06),
    sesiDegistir: (acik) => { sesAcik = acik; },
    sesAcikMi: () => sesAcik,
  };
})();
