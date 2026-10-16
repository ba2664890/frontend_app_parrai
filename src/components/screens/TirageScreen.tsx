import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { spawnConfetti } from "@/components/shared/Confetti";
import { StageBackground } from "@/components/shared/StageBackground";
import type { SphereDrawPhase } from "@/components/shared/PhotoSphereStage";
import { FILIERE_COULEUR, FILIERE_LIBELLE, initiales, nomComplet, type Etudiant, type PortraitEtudiant, type TirageResult } from "@/lib/types";

// Three.js ne rejoint le navigateur qu'à l'ouverture de la scène cérémonie.
const PhotoSphereStage = lazy(() => import("@/components/shared/PhotoSphereStage").then((module) => ({ default: module.PhotoSphereStage })));

type DrawState = "idle" | "rolling" | "settling" | "revealing" | "complete" | "error";

const MIN_ROLL_DURATION_MS = 2800;
const SETTLING_DURATION_MS = 2200;
const REVEAL_DURATION_MS = 3000;

function NouveauOnStage({ nouveau }: { nouveau: Etudiant }) {
  const color = FILIERE_COULEUR[nouveau.filiereCode] ?? "#1F7A3A";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-space-md pb-24">
      <article className="newcomer-stage-card pointer-events-auto flex w-full max-w-sm flex-col items-center rounded-[28px] border border-blanc-pure bg-surface-container-lowest/95 p-space-md text-center shadow-[0_28px_70px_-28px_rgba(31,122,58,.48)] backdrop-blur-xl">
        <span className="mb-3 rounded-full px-4 py-1.5 font-label-md text-xs font-black uppercase tracking-[0.18em]" style={{ background: color, color: nouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}>
          Nouveau sur scène
        </span>
        <div className="newcomer-stage-avatar overflow-hidden rounded-full border-4 border-blanc-pure shadow-xl" style={{ background: color }}>
          {nouveau.photo ? <img src={nouveau.photo} alt={nomComplet(nouveau)} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center font-headline text-3xl font-black tracking-wider text-blanc-pure">{initiales(nouveau.prenom, nouveau.nom)}</span>}
        </div>
        <h1 className="mt-4 font-headline text-[clamp(2rem,4vw,3rem)] font-black uppercase leading-none tracking-tight text-on-surface">{nomComplet(nouveau)}</h1>
        <p className="mt-2 font-label-md text-sm font-bold uppercase tracking-wider text-on-surface-variant">{FILIERE_LIBELLE[nouveau.filiereCode]} · 1re année</p>
        <div className="mt-5 flex h-1.5 w-32 overflow-hidden rounded-full"><span className="flex-1 bg-vert-teranga" /><span className="flex-1 bg-jaune-soleil" /><span className="flex-1 bg-rouge-laterite" /></div>
      </article>
    </div>
  );
}

/**
 * Scène de cérémonie intégrée à l'habillage AMSEN. L'animation est centrale,
 * tandis que les commandes restent explicites pour l'animateur.
 */
export function TirageScreen() {
  const currentNouveau = useAppStore((s) => s.currentNouveau);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const setDrawAnimation = useAppStore((s) => s.setDrawAnimation);
  const setLocalDrawInProgress = useAppStore((s) => s.setLocalDrawInProgress);
  const filiereActive = useAppStore((s) => s.filiereActive);

  const [drawState, setDrawState] = useState<DrawState>("idle");
  const [portraits, setPortraits] = useState<PortraitEtudiant[]>([]);
  const [tirage, setTirage] = useState<TirageResult | null>(null);
  const [revealProgress, setRevealProgress] = useState(0);
  const drawLockRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  // Cette requête est strictement une lecture des portraits publics de la filière.
  useEffect(() => {
    if (!currentNouveau) return;
    let cancelled = false;
    setPortraits([]);
    api.portraits(currentNouveau.filiereCode)
      .then((items) => { if (!cancelled) setPortraits(items); })
      .catch(() => { if (!cancelled) setPortraits([]); });
    return () => { cancelled = true; };
  }, [currentNouveau?.id, currentNouveau?.filiereCode]);

  // Aucun mouvement de tirage n'est lancé lorsqu'un nouveau arrive sur scène.
  useEffect(() => {
    clearTimers();
    drawLockRef.current = false;
    setLocalDrawInProgress(false);
    setDrawState("idle");
    setTirage(null);
    setRevealProgress(0);
  }, [currentNouveau?.id, setLocalDrawInProgress]);

  const decouvrir = async () => {
    if (!currentNouveau || drawLockRef.current || (drawState !== "idle" && drawState !== "error")) return;
    drawLockRef.current = true;
    setLocalDrawInProgress(true);
    setDrawState("rolling");
    setTirage(null);
    setRevealProgress(0);
    const startedAt = Date.now();

    try {
      // Le backend décide toujours les deux parrains avant toute révélation visuelle.
      const result = await api.executerTirage(currentNouveau.id);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_ROLL_DURATION_MS) {
        await new Promise<void>((resolve) => {
          timersRef.current.push(window.setTimeout(resolve, MIN_ROLL_DURATION_MS - elapsed));
        });
      }
      setCurrentTirage(result);
      setDrawAnimation(null);
      setTirage(result);
      setDrawState("settling");

      timersRef.current.push(window.setTimeout(() => {
        setDrawState("revealing");
        spawnConfetti(70);
      }, SETTLING_DURATION_MS));
    } catch {
      // Aucun tirage suivant n'est déclenché : l'icône rouge permet un nouvel essai.
      setDrawState("error");
      drawLockRef.current = false;
      setLocalDrawInProgress(false);
    }
  };

  // Les deux portraits sélectionnés restent dans la scène WebGL : seule leur
  // texture se défloute pendant ce compte à rebours commun.
  useEffect(() => {
    if (drawState !== "revealing") return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / REVEAL_DURATION_MS);
      setRevealProgress(progress);
      if (progress === 1) {
        window.clearInterval(interval);
        setDrawState("complete");
        setLocalDrawInProgress(false);
        spawnConfetti(100);
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [drawState, setLocalDrawInProgress]);

  const chargerSuivant = async () => {
    if (currentNouveau && drawState !== "complete") return;
    try {
      const { nouveau } = await api.prochainNouveau(filiereActive, currentNouveau?.id);
      setCurrentTirage(null);
      setDrawAnimation(null);
      setCurrentNouveau(nouveau);
      if (!nouveau) setDrawState("error");
    } catch {
      setDrawState("error");
    }
  };

  const marquerAbsent = async () => {
    if (!currentNouveau || (drawState !== "idle" && drawState !== "error")) return;
    try {
      await api.marquerAbsent(currentNouveau.id, true);
      // L'appel est ici volontairement manuel, jamais exécuté après une erreur de tirage.
      const { nouveau } = await api.prochainNouveau(filiereActive, currentNouveau.id);
      setCurrentNouveau(nouveau);
      if (!nouveau) setDrawState("error");
    } catch {
      setDrawState("error");
    }
  };

  const scenePhase: SphereDrawPhase = drawState === "rolling"
    ? "rolling"
    : drawState === "settling"
      ? "settling"
      : drawState === "revealing" || drawState === "complete"
        ? drawState
        : "idle";
  const winnersVisible = drawState === "settling" || drawState === "revealing" || drawState === "complete";
  const canStart = drawState === "idle" || drawState === "error";
  const showMentorSpheres = drawState === "rolling" || winnersVisible;

  return (
    <section className="draw-sphere-screen relative min-h-[calc(100vh-5rem-3.5rem)] w-full overflow-hidden" aria-label="Scène de tirage en sphères 3D">
      <StageBackground variant="festive" />
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><span className="h-28 w-28 animate-ping rounded-full border border-violet-300/60 shadow-[0_0_70px_rgba(139,92,246,.9)]" /></div>}>
        <PhotoSphereStage
          portraits={portraits}
          winner2={winnersVisible ? tirage?.parrain2 ?? null : null}
          winner3={winnersVisible ? tirage?.parrain3 ?? null : null}
          phase={scenePhase}
          showMentorSpheres={showMentorSpheres}
          revealProgress={revealProgress}
        />
      </Suspense>

      {currentNouveau && canStart && <NouveauOnStage nouveau={currentNouveau} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex items-center justify-center gap-5">
        {canStart && currentNouveau && (
          <button
            type="button"
            onClick={decouvrir}
            className={"pointer-events-auto sphere-icon-control sphere-icon-control--primary " + (drawState === "error" ? "sphere-icon-control--alert" : "")}
            aria-label={drawState === "error" ? "Réessayer le tirage" : "Lancer le tirage"}
          >
            <span className="material-symbols-outlined text-2xl">{drawState === "error" ? "refresh" : "play_arrow"}</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">{drawState === "error" ? "Réessayer" : "Découvrir"}</span>
          </button>
        )}
        {canStart && currentNouveau && (
          <button type="button" onClick={marquerAbsent} className="pointer-events-auto sphere-icon-control sphere-icon-control--secondary" aria-label="Marquer le nouveau absent">
            <span className="material-symbols-outlined text-2xl">person_remove</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">Absent</span>
          </button>
        )}
        {!currentNouveau && (
          <button type="button" onClick={chargerSuivant} className={"pointer-events-auto sphere-icon-control sphere-icon-control--primary " + (drawState === "error" ? "sphere-icon-control--alert" : "")} aria-label="Appeler le nouveau suivant">
            <span className="material-symbols-outlined text-2xl">play_arrow</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">Nouveau suivant</span>
          </button>
        )}
        {drawState === "complete" && (
          <button type="button" onClick={chargerSuivant} className="pointer-events-auto sphere-icon-control sphere-icon-control--primary" aria-label="Appeler le nouveau suivant">
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">Nouveau suivant</span>
          </button>
        )}
      </div>
    </section>
  );
}
