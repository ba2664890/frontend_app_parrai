import { useEffect, useRef, useState } from "react";
import { spawnConfettiIn } from "@/components/shared/Confetti";
import { FILIERE_COULEUR, initiales, nomComplet, type Etudiant } from "@/lib/types";

const REVEAL_DURATION_MS = 3000;

export function MentorRevealCard({
  parrain,
  niveau,
  onRevealed,
}: {
  parrain: Etudiant;
  niveau: 2 | 3;
  onRevealed: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);
  const callbackRef = useRef(onRevealed);
  const confettiRef = useRef<HTMLDivElement>(null);
  callbackRef.current = onRevealed;

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(1);
    callbackRef.current();
    if (confettiRef.current) spawnConfettiIn(confettiRef.current, 28);
  };

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - startedAt) / REVEAL_DURATION_MS);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(interval);
        complete();
      }
    }, 60);
    return () => window.clearInterval(interval);
  }, []);

  const color = FILIERE_COULEUR[parrain.filiereCode] ?? "#1F7A3A";
  const secondsLeft = Math.max(0, Math.ceil(3 * (1 - progress)));
  const revealed = progress >= 1;
  const initials = initiales(parrain.prenom, parrain.nom);
  const displayName = revealed ? nomComplet(parrain).toUpperCase() : progress > 0.62 ? `${initials} …` : "??? ???";

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-blanc-pure bg-surface-container-lowest p-4 shadow-[0_24px_50px_-28px_rgba(20,66,37,.55)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full px-3 py-1 font-label-md text-xs font-black uppercase tracking-wider" style={{ background: color, color: parrain.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}>
          Parrain · {niveau}e année
        </span>
        <span className="font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">{Math.round(progress * 100)} %</span>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-container">
        {parrain.photo ? (
          <img
            className="h-full w-full object-cover"
            src={parrain.photo}
            alt={revealed ? nomComplet(parrain) : "Portrait en cours de révélation"}
            style={{ filter: `blur(${Math.max(0, 26 * (1 - progress))}px)`, transform: `scale(${1 + 0.1 * (1 - progress)})`, transition: "filter 60ms linear, transform 60ms linear" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,216,0,.35),transparent_35%),linear-gradient(135deg,#14532d,#1f7a3a_58%,#0f3920)]">
            <span className="font-headline text-6xl font-black tracking-wider text-blanc-pure">{initials}</span>
          </div>
        )}
        {!revealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-encre-text/30 backdrop-blur-[2px]">
            <span className="font-headline text-[clamp(5rem,11vw,8rem)] font-black leading-none text-blanc-pure drop-shadow-2xl">{secondsLeft}</span>
            <span className="mt-1 font-label-md text-sm font-black uppercase tracking-[0.18em] text-blanc-pure">Défloutage</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-full bg-surface-container-lowest/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="font-label-md text-xs font-black uppercase tracking-wide" style={{ color }}>{revealed ? "Parrain révélé" : `Initiales : ${initials}`}</span>
          {!revealed && <button type="button" onClick={complete} className="rounded-full bg-vert-teranga px-3 py-1 font-label-md text-xs font-black text-blanc-pure transition-transform active:scale-95">Révéler</button>}
        </div>
      </div>

      <div className="pt-4 text-center">
        <p className="font-label-md text-xs font-black uppercase tracking-[0.2em]" style={{ color }}>{parrain.filiereCode}_{niveau}</p>
        <h2 className="mt-1 min-h-12 font-headline text-[clamp(1.55rem,3.2vw,2.5rem)] font-black leading-none uppercase tracking-tight text-on-surface">{displayName}</h2>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full transition-[width] duration-75" style={{ width: `${progress * 100}%`, background: color }} /></div>
      <div ref={confettiRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </article>
  );
}
