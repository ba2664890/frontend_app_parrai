import type { StatsGlobales } from "@/lib/types";

export function ModeRevealOverlay({
  mode,
  progress,
}: {
  mode: StatsGlobales["modeAnimation"];
  progress: number;
}) {
  const coverOpacity = Math.max(0, 1 - progress);

  if (mode === "cartes") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <div
          className="reveal-card-back absolute inset-y-0 left-0 w-1/2 origin-left"
          style={{ transform: `translateX(-${progress * 108}%) rotateY(-${progress * 35}deg)` }}
        >
          <div className="reveal-card-pattern h-full border-r-4 border-jaune-soleil/80" />
        </div>
        <div
          className="reveal-card-back absolute inset-y-0 right-0 w-1/2 origin-right"
          style={{ transform: `translateX(${progress * 108}%) rotateY(${progress * 35}deg)` }}
        >
          <div className="reveal-card-pattern h-full border-l-4 border-jaune-soleil/80" />
        </div>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-jaune-soleil px-5 py-3 font-headline text-xl font-black uppercase tracking-[0.2em] text-encre-text shadow-xl transition-opacity" style={{ opacity: coverOpacity }}>
          AMSEN
        </span>
      </div>
    );
  }

  if (mode === "roulette") {
    return (
      <div className="reveal-roulette pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden" style={{ opacity: coverOpacity }} aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-encre-text/80 via-encre-text/35 to-encre-text/80" />
        <div className="reveal-roulette-window relative w-full border-y-2 border-jaune-soleil/80 py-5 text-center font-headline text-3xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
          <div className="reveal-roulette-track">
            <div className="flex shrink-0 gap-8"><span> • • • </span><span> PARRAIN </span><span> • • • </span><span> AMSEN </span><span> • • • </span><span> À VOUS DE JOUER </span></div>
            <div className="flex shrink-0 gap-8" aria-hidden="true"><span> • • • </span><span> PARRAIN </span><span> • • • </span><span> AMSEN </span><span> • • • </span><span> À VOUS DE JOUER </span></div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "coffre") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#17140f]/65" style={{ opacity: coverOpacity }} />
        <div className="reveal-vault-door absolute inset-y-0 left-0 w-1/2 border-r-4 border-[#c5a45c]" style={{ transform: `translateX(-${progress * 108}%)` }} />
        <div className="reveal-vault-door absolute inset-y-0 right-0 w-1/2 border-l-4 border-[#c5a45c]" style={{ transform: `translateX(${progress * 108}%)` }} />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-[#f6d98b] drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]" style={{ opacity: coverOpacity }}>
          <span className="material-symbols-outlined reveal-lock-icon text-7xl">lock</span>
          <span className="font-label-lg text-label-lg font-black uppercase tracking-[0.25em]">Coffre mystère</span>
        </div>
      </div>
    );
  }

  if (mode === "constellation") {
    return (
      <div className="reveal-constellation pointer-events-none absolute inset-0 z-[1]" style={{ opacity: coverOpacity }} aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 0 800 800" preserveAspectRatio="none">
          <rect width="800" height="800" fill="#101b38" fillOpacity="0.82" />
          <g fill="none" stroke="#ffe88a" strokeOpacity="0.75" strokeWidth="2">
            <path d="M95 180 220 110 330 205 465 120 585 230 710 145M115 505 245 395 365 500 510 385 680 475M220 110 245 395M330 205 365 500M465 120 510 385M585 230 680 475" />
          </g>
          <g fill="#fff4b0">
            <circle cx="95" cy="180" r="7" /><circle cx="220" cy="110" r="9" /><circle cx="330" cy="205" r="6" />
            <circle cx="465" cy="120" r="8" /><circle cx="585" cy="230" r="6" /><circle cx="710" cy="145" r="9" />
            <circle cx="115" cy="505" r="8" /><circle cx="245" cy="395" r="6" /><circle cx="365" cy="500" r="9" />
            <circle cx="510" cy="385" r="7" /><circle cx="680" cy="475" r="9" />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="reveal-star-label rounded-full border border-jaune-soleil/60 bg-[#101b38]/80 px-6 py-3 font-headline text-xl font-black uppercase tracking-[0.2em] text-jaune-soleil">Une étoile se révèle</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden bg-[#10131b]/75" style={{ opacity: coverOpacity }} aria-hidden="true">
      <div className="reveal-dice-pair flex items-center gap-8 text-[clamp(5rem,16vw,12rem)] leading-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.75)]">
        <span>🎲</span><span>🎲</span>
      </div>
      <div className="absolute bottom-[18%] rounded-full bg-black/55 px-6 py-3 font-headline text-xl font-black uppercase tracking-[0.2em] text-white">Les dés sont lancés</div>
    </div>
  );
}
