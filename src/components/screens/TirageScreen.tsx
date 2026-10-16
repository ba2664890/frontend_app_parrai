import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { spawnConfetti } from "@/components/shared/Confetti";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenLogo } from "@/components/shared/AmsenLogo";
import { FamilyCard } from "@/components/shared/FamilyCard";
import { MentorRevealCard } from "@/components/shared/MentorRevealCard";
import { PhotoLotteryRoll } from "@/components/shared/PhotoLotteryRoll";
import { FILIERE_COULEUR, FILIERE_LIBELLE, nomComplet, type PortraitEtudiant, type TirageResult } from "@/lib/types";

type DrawState = "idle" | "rolling" | "revealing" | "unveiling" | "complete" | "error";

const MIN_ROLL_DURATION_MS = 2800;
const isExpectedFlowError = (message: string) =>
  /déjà tiré|absent|urne vide|Aucun nouveau restant|Les urnes doivent être générées/i.test(message);

export function TirageScreen() {
  const currentNouveau = useAppStore((s) => s.currentNouveau);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const setDrawAnimation = useAppStore((s) => s.setDrawAnimation);
  const setLocalDrawInProgress = useAppStore((s) => s.setLocalDrawInProgress);
  const setView = useAppStore((s) => s.setView);
  const stats = useAppStore((s) => s.stats);
  const filiereActive = useAppStore((s) => s.filiereActive);

  const [drawState, setDrawState] = useState<DrawState>("idle");
  const [portraits, setPortraits] = useState<PortraitEtudiant[]>([]);
  const [tirage, setTirage] = useState<TirageResult | null>(null);
  const [rollsSettled, setRollsSettled] = useState(0);
  const [revealed, setRevealed] = useState({ two: false, three: false });
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const drawLockRef = useRef(false);

  const totalParraines = stats?.totalParraines ?? 0;
  const total = stats?.totalNouveaux ?? 0;
  const filiereColor = currentNouveau ? FILIERE_COULEUR[currentNouveau.filiereCode] ?? "#1F7A3A" : "#1F7A3A";

  // Lecture seule : charger les portraits n'exécute jamais de tirage.
  useEffect(() => {
    if (!currentNouveau) return;
    let cancelled = false;
    setPortraits([]);
    api.portraits(currentNouveau.filiereCode)
      .then((items) => { if (!cancelled) setPortraits(items); })
      .catch(() => { if (!cancelled) setPortraits([]); });
    return () => { cancelled = true; };
  }, [currentNouveau?.id, currentNouveau?.filiereCode]);

  // Un candidat s'affiche immédiatement, sans roulette automatique.
  useEffect(() => {
    drawLockRef.current = false;
    setLocalDrawInProgress(false);
    setDrawState("idle");
    setTirage(null);
    setRollsSettled(0);
    setRevealed({ two: false, three: false });
    setError(null);
    if (currentNouveau) setEmptyMessage(null);
  }, [currentNouveau?.id, setLocalDrawInProgress]);

  const decouvrir = async () => {
    if (!currentNouveau || drawLockRef.current || drawState === "rolling" || drawState === "revealing") return;
    // Verrou synchrone : un double-clic n'atteint jamais l'API deux fois.
    drawLockRef.current = true;
    setLocalDrawInProgress(true);
    setDrawState("rolling");
    setError(null);
    setTirage(null);
    setRollsSettled(0);
    setRevealed({ two: false, three: false });
    const startedAt = Date.now();

    try {
      const result = await api.executerTirage(currentNouveau.id);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_ROLL_DURATION_MS) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, MIN_ROLL_DURATION_MS - elapsed));
      }
      setCurrentTirage(result);
      setDrawAnimation(null);
      setTirage(result);
      setDrawState("revealing");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Erreur de tirage";
      setDrawState("error");
      setError(isExpectedFlowError(message)
        ? `${message}. Aucun nouveau suivant n’a été appelé automatiquement.`
        : message);
      drawLockRef.current = false;
      setLocalDrawInProgress(false);
    }
  };

  const handleRollSettled = useCallback(() => {
    setRollsSettled((count) => {
      const next = count + 1;
      if (next >= 2) {
        setDrawState("unveiling");
        spawnConfetti(42);
      }
      return next;
    });
  }, []);

  const handleMentorRevealed = (level: 2 | 3) => {
    setRevealed((previous) => {
      const next = level === 2 ? { ...previous, two: true } : { ...previous, three: true };
      if (next.two && next.three) {
        setDrawState("complete");
        setLocalDrawInProgress(false);
        spawnConfetti(80);
      }
      return next;
    });
  };

  const chargerSuivant = async () => {
    setError(null);
    setEmptyMessage(null);
    try {
      const { nouveau, raison } = await api.prochainNouveau(filiereActive, currentNouveau?.id);
      setCurrentTirage(null);
      setDrawAnimation(null);
      setCurrentNouveau(nouveau);
      if (!nouveau) {
        setEmptyMessage(raison === "absents_restants"
          ? "Les nouveaux restants dans cette filière sont marqués absents."
          : "Aucun nouveau restant dans cette filière.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’appeler le nouveau suivant.");
    }
  };

  const suivant = async () => {
    if (drawState !== "complete" && currentNouveau) return;
    await chargerSuivant();
  };

  const marquerAbsent = async () => {
    if (!currentNouveau || (drawState !== "idle" && drawState !== "error")) return;
    try {
      await api.marquerAbsent(currentNouveau.id, true);
      await chargerSuivant();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erreur lors du retrait de l’urne.");
    }
  };

  if (!currentNouveau) {
    const filiereStats = stats?.filieres.find((f) => f.code === filiereActive);
    const filiereFinished = filiereStats ? filiereStats.restants === 0 : false;
    const allFinished = (stats?.totalRestants ?? 0) === 0 && (stats?.totalNouveaux ?? 0) > 0;
    return (
      <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
        <StageBackground variant="festive" />
        <div className="relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-space-lg text-center">
          <div className="max-w-3xl rounded-3xl border border-vert-teranga/20 bg-surface-container-lowest/90 p-space-xl shadow-2xl backdrop-blur-xl">
            <AmsenLogo size={96} className="mx-auto mb-space-md" />
            <span className="rounded-full bg-vert-teranga/10 px-space-md py-1 font-label-md text-label-md font-black uppercase tracking-widest text-vert-teranga">{allFinished ? "Promotion 100 % parrainée" : filiereFinished ? `Filière ${filiereActive} terminée` : "Scène prête"}</span>
            <h1 className="mt-3 font-headline text-[clamp(2.25rem,5vw,4rem)] font-black uppercase tracking-tight text-on-surface">{allFinished || filiereFinished ? "La famille s’agrandit" : "En attente du prochain nouveau"}</h1>
            <p className="mt-space-sm font-body text-body-lg text-on-surface-variant">{allFinished || filiereFinished ? "Consultez les résultats ou choisissez une autre filière pour continuer la cérémonie." : `L’animateur peut appeler le prochain étudiant de la filière ${filiereActive}.`}</p>
            <div className="mt-space-lg flex flex-wrap justify-center gap-space-sm">
              {!allFinished && !filiereFinished && <button onClick={suivant} className="rounded-full amsen-gradient px-space-xl py-space-md font-headline text-headline-sm font-black uppercase tracking-wider text-blanc-pure shadow-lg transition-transform hover:scale-105"><span className="material-symbols-outlined mr-2 align-middle">play_arrow</span>Appeler le prochain</button>}
              <button onClick={() => setView("resultats")} className="rounded-full bg-surface-container-high px-space-lg py-space-sm font-label-lg font-bold text-on-surface transition-colors hover:bg-surface-container-highest">Voir les résultats</button>
            </div>
            {(emptyMessage || error) && <p className="mt-space-md font-label-md font-semibold text-rouge-laterite" role="alert">{emptyMessage || error}</p>}
          </div>
        </div>
      </div>
    );
  }

  const isRolling = drawState === "rolling" || drawState === "revealing";
  const isRevealing = drawState === "unveiling" || drawState === "complete";
  const canStart = drawState === "idle" || drawState === "error";

  return (
    <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
      <StageBackground variant="festive" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-margin py-space-md">
        <header className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm rounded-full bg-surface-container-low/80 px-space-md py-space-xs shadow-sm backdrop-blur-md"><AmsenLogo size={36} /><div><p className="font-headline text-label-md font-black uppercase tracking-wider text-on-surface">AMSEN ENSAE</p><p className="font-label-md text-xs text-on-surface-variant">Cérémonie de parrainage</p></div></div>
          <div className="flex items-center gap-space-sm"><span className="rounded-full bg-vert-teranga/10 px-space-md py-space-xs font-label-md text-xs font-black uppercase tracking-wider text-vert-teranga"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-vert-teranga animate-pulse" />Urne active</span><span className="rounded-2xl bg-surface-container-high px-space-md py-space-xs font-headline text-xl font-black text-vert-teranga">{totalParraines}<span className="mx-1 text-outline">/</span><span className="text-on-surface">{total}</span></span></div>
        </header>

        <main className="my-auto w-full py-space-lg">
          {!isRolling && !isRevealing && (
            <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <span className="flex items-center gap-2 font-label-lg font-black uppercase tracking-[0.2em] text-vert-teranga"><span className="material-symbols-outlined text-jaune-soleil">stars</span>Nouveau sur scène<span className="material-symbols-outlined text-jaune-soleil">stars</span></span>
              <div className="mt-5 rounded-full px-5 py-2 font-label-lg font-black uppercase tracking-widest shadow-md" style={{ background: filiereColor, color: currentNouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}>{currentNouveau.filiereCode}_1 · {FILIERE_LIBELLE[currentNouveau.filiereCode]}</div>
              <h1 className="mt-5 font-headline text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-none tracking-tight text-on-surface">{nomComplet(currentNouveau)}</h1>
              <div className="mt-5 flex h-2 w-48 overflow-hidden rounded-full"><span className="flex-1 bg-vert-teranga" /><span className="flex-1 bg-jaune-soleil" /><span className="flex-1 bg-rouge-laterite" /></div>
              <button type="button" onClick={decouvrir} disabled={!canStart} className="group relative mt-8 flex h-[min(260px,60vw)] w-[min(260px,60vw)] items-center justify-center rounded-full amsen-gradient text-blanc-pure shadow-[0_24px_55px_-12px_rgba(31,122,58,.65)] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"><span className="absolute inset-2 rounded-full border border-blanc-pure/30 bg-blanc-pure/10" /><span className="relative flex flex-col items-center"><span className="material-symbols-outlined mb-1 text-5xl">touch_app</span><span className="font-headline text-2xl font-black uppercase tracking-widest">Découvrir</span><span className="mt-1 font-label-md text-xs font-bold uppercase tracking-wider">Ses deux parrains</span></span></button>
              <p className="mt-5 rounded-full bg-surface-container-low px-4 py-2 font-label-md text-sm font-semibold text-on-surface-variant">Le tirage démarre uniquement à l’appui sur Découvrir.</p>
            </section>
          )}

          {isRolling && (
            <section className="mx-auto w-full max-w-6xl text-center">
              <p className="font-label-lg font-black uppercase tracking-[0.2em] text-vert-teranga">Parrainage de {nomComplet(currentNouveau)}</p>
              <h1 className="mt-2 font-headline text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase tracking-tight text-on-surface">Les parrains se dévoilent</h1>
              <p className="mx-auto mt-2 max-w-2xl font-body text-body-md text-on-surface-variant">Les portraits défilent pour la cérémonie. Seul le résultat enregistré par l’urne peut arrêter les bandes.</p>
              <div className="mt-7 grid gap-5 lg:grid-cols-2">
                <PhotoLotteryRoll niveau={2} portraits={portraits} winner={drawState === "revealing" ? tirage?.parrain2 ?? null : null} onSettled={handleRollSettled} />
                <PhotoLotteryRoll niveau={3} portraits={portraits} winner={drawState === "revealing" ? tirage?.parrain3 ?? null : null} onSettled={handleRollSettled} />
              </div>
              <div className="mt-5 flex items-center justify-center gap-2 font-label-md text-sm font-bold uppercase tracking-wider text-on-surface-variant"><span className="h-2.5 w-2.5 rounded-full bg-jaune-soleil animate-pulse" />{drawState === "rolling" ? "Vérification sécurisée auprès de l’urne…" : "Résultats confirmés — arrêt des roulettes…"}</div>
            </section>
          )}

          {isRevealing && tirage && (
            <section className="mx-auto w-full max-w-6xl">
              <div className="mb-6 text-center"><p className="font-label-lg font-black uppercase tracking-[0.2em] text-vert-teranga">Famille de {nomComplet(tirage.filleul)}</p><h1 className="mt-2 font-headline text-[clamp(2.3rem,5vw,4rem)] font-black uppercase tracking-tight text-on-surface">Voici tes parrains</h1><p className="mt-2 font-body text-body-md text-on-surface-variant">Les portraits se révèlent en direct. Les initiales prennent le relais si aucune photo n’est renseignée.</p></div>
              <div className="grid gap-5 md:grid-cols-2"><MentorRevealCard key={`2-${tirage.parrain2.id}`} parrain={tirage.parrain2} niveau={2} onRevealed={() => handleMentorRevealed(2)} /><MentorRevealCard key={`3-${tirage.parrain3.id}`} parrain={tirage.parrain3} niveau={3} onRevealed={() => handleMentorRevealed(3)} /></div>
              {drawState === "complete" && <div className="mt-6"><FamilyCard tirage={tirage} /><div className="mt-6 flex justify-center"><button type="button" onClick={suivant} className="flex items-center gap-2 rounded-full bg-vert-teranga px-7 py-4 font-headline text-xl font-black uppercase tracking-wide text-blanc-pure shadow-lg transition-transform hover:scale-105 active:scale-95"><span>Nouveau suivant</span><span className="material-symbols-outlined">arrow_forward</span></button></div></div>}
            </section>
          )}

          {error && <p className="mx-auto mt-5 max-w-3xl rounded-2xl border border-rouge-laterite/20 bg-rouge-laterite/10 px-5 py-3 text-center font-label-md font-bold text-rouge-laterite" role="alert">{error}</p>}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-space-sm border-t border-outline/15 pt-space-sm">
          <span className="font-label-md text-sm text-outline">{drawState === "complete" ? "Parrainage enregistré · prêt pour le nouveau suivant" : isRolling ? "Mise en scène en cours · une seule requête sécurisée" : "En attente de l’animateur"}</span>
          <div className="flex items-center gap-2"><button type="button" onClick={marquerAbsent} disabled={drawState !== "idle" && drawState !== "error"} className="rounded-full bg-surface-container-low px-4 py-2 font-label-md text-sm font-semibold text-rouge-laterite transition-colors hover:bg-rouge-laterite/10 disabled:cursor-not-allowed disabled:opacity-40"><span className="material-symbols-outlined mr-1 align-middle text-lg">person_remove</span>Absent</button>{drawState === "complete" && <button type="button" onClick={suivant} className="rounded-full bg-encre-text px-4 py-2 font-label-md text-sm font-bold text-blanc-pure transition-transform active:scale-95">Nouveau suivant</button>}</div>
        </footer>
      </div>
    </div>
  );
}
