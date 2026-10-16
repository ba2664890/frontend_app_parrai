import { useEffect, useMemo, useRef, useState } from "react";
import { initiales, nomComplet, type Etudiant, type PortraitEtudiant } from "@/lib/types";

const SETTLING_DURATION_MS = 1350;

function PortraitTile({ portrait, featured = false }: { portrait: PortraitEtudiant; featured?: boolean }) {
  return (
    <article
      className={
        "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-lg " +
        (featured ? "border-jaune-soleil ring-4 ring-jaune-soleil/35" : "border-blanc-pure/80")
      }
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-vert-teranga/25 via-surface-container to-rouge-laterite/20">
        {portrait.photo ? (
          <img className="h-full w-full object-cover" src={portrait.photo} alt="" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,216,0,.35),transparent_35%),linear-gradient(135deg,#14532d,#1f7a3a_58%,#0f3920)]">
            <span className="font-headline text-4xl font-black tracking-wider text-blanc-pure drop-shadow-md">
              {initiales(portrait.prenom, portrait.nom)}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-encre-text/75 px-3 py-1 font-label-md text-xs font-black uppercase tracking-widest text-blanc-pure backdrop-blur-sm">
          {portrait.niveau}A
        </span>
      </div>
      <div className="px-4 py-3 text-center">
        <p className="truncate font-headline text-lg font-black uppercase tracking-tight text-on-surface">
          {nomComplet(portrait)}
        </p>
        <p className="mt-0.5 font-label-md text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
          {portrait.filiereCode}
        </p>
      </div>
    </article>
  );
}

/**
 * Bande purement décorative : le gagnant est toujours fourni par le serveur.
 * Elle ne contient aucune logique de sélection aléatoire métier.
 */
export function PhotoLotteryRoll({
  niveau,
  portraits,
  winner,
  onSettled,
}: {
  niveau: 2 | 3;
  portraits: PortraitEtudiant[];
  winner: Etudiant | null;
  onSettled: () => void;
}) {
  const [movingToWinner, setMovingToWinner] = useState(false);
  const settledRef = useRef(false);
  const candidates = useMemo(() => {
    const filtered = portraits.filter((portrait) => portrait.niveau === niveau);
    return filtered.length ? filtered : winner ? [winner] : [];
  }, [niveau, portraits, winner]);

  const rollingCards = useMemo(
    () => Array.from({ length: Math.max(18, candidates.length * 5) }, (_, index) => candidates[index % Math.max(candidates.length, 1)]).filter(Boolean),
    [candidates],
  );
  const finishingCards = useMemo(() => {
    if (!winner) return [];
    const surrounding = Array.from({ length: 8 }, (_, index) => candidates[index % Math.max(candidates.length, 1)]).filter(Boolean);
    return [...surrounding.slice(0, 4), winner, ...surrounding.slice(4)];
  }, [candidates, winner]);

  useEffect(() => {
    settledRef.current = false;
    setMovingToWinner(false);
    if (!winner) return;

    const start = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMovingToWinner(true));
    });
    const done = window.setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        onSettled();
      }
    }, SETTLING_DURATION_MS);

    return () => {
      cancelAnimationFrame(start);
      window.clearTimeout(done);
    };
  }, [winner?.id, onSettled]);

  const yearLabel = niveau === 2 ? "Parrain · 2e année" : "Parrain · 3e année";
  const cards = winner ? finishingCards : rollingCards;

  return (
    <section className="w-full overflow-hidden rounded-[26px] border border-blanc-pure/80 bg-surface-container-lowest/85 p-4 shadow-[0_24px_50px_-28px_rgba(20,66,37,.55)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className={"h-3 w-3 rounded-full " + (winner ? "bg-jaune-soleil" : "bg-vert-teranga animate-pulse")} />
          <h3 className="font-headline text-xl font-black uppercase tracking-tight text-on-surface">{yearLabel}</h3>
        </div>
        <span className="rounded-full bg-encre-text px-3 py-1 font-label-md text-xs font-black uppercase tracking-[0.16em] text-blanc-pure">
          {winner ? "Résultat certifié" : "Recherche en cours"}
        </span>
      </div>

      <div className="photo-lottery-window relative h-56 overflow-hidden rounded-2xl bg-surface-container">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[var(--photo-lottery-card-width)] -translate-x-1/2 border-x-2 border-jaune-soleil/90 bg-jaune-soleil/[0.06] shadow-[0_0_38px_rgba(255,216,0,.34)]" />
        <span className="pointer-events-none absolute left-1/2 top-1 z-30 -translate-x-1/2 text-jaune-soleil drop-shadow-md material-symbols-outlined">arrow_drop_down</span>
        <span className="pointer-events-none absolute bottom-1 left-1/2 z-30 -translate-x-1/2 rotate-180 text-jaune-soleil drop-shadow-md material-symbols-outlined">arrow_drop_down</span>
        <div
          className={winner ? "photo-lottery-finish-track" : "photo-lottery-roll-track"}
          style={winner ? { transform: movingToWinner ? "translateX(calc(-4 * (var(--photo-lottery-card-width) + 0.75rem)))" : "translateX(0)" } : undefined}
        >
          {cards.map((portrait, index) => (
            <div className="photo-lottery-card" key={`${winner?.id ?? "roll"}-${portrait.id}-${index}`}>
              <PortraitTile portrait={portrait} featured={Boolean(winner && index === 4)} />
            </div>
          ))}
        </div>
        {cards.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined animate-pulse text-4xl text-vert-teranga">group</span>
            <span className="font-label-md text-xs font-black uppercase tracking-[0.18em]">Chargement des portraits</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-surface-container via-surface-container/55 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-surface-container via-surface-container/55 to-transparent" />
      </div>
    </section>
  );
}
