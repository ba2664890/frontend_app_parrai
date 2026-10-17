import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { spawnConfetti } from "@/components/shared/Confetti";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import { FinishedModal } from "@/components/shared/FinishedModal";
import type { SphereDrawPhase } from "@/components/shared/PhotoSphereStage";
import { FILIERE_COULEUR, FILIERE_LIBELLE, initiales, nomComplet, type Etudiant, type PortraitEtudiant, type TirageResult } from "@/lib/types";

// Three.js ne rejoint le navigateur qu'à l'ouverture de la scène cérémonie.
const PhotoSphereStage = lazy(() => import("@/components/shared/PhotoSphereStage").then((module) => ({ default: module.PhotoSphereStage })));

type DrawState = "idle" | "rolling" | "settling" | "revealing" | "complete" | "error";
type CompletionState = {
  reason: "absents_restants" | "filiere_terminee" | null;
  isAllFinished: boolean;
};

const MIN_ROLL_DURATION_MS = 2800;
const SETTLING_DURATION_MS = 2200;
const REVEAL_DURATION_MS = 3000;

function NouveauOnStage({ nouveau }: { nouveau: Etudiant }) {
  const color = FILIERE_COULEUR[nouveau.filiereCode] ?? "#1F7A3A";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-space-md pb-40">
      <article className="newcomer-stage-card pointer-events-auto flex w-full max-w-3xl flex-col items-center text-center">
        <span className="mb-3 rounded-full px-4 py-1.5 font-label-md text-xs font-black uppercase tracking-[0.18em] shadow-sm" style={{ background: color, color: nouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}>
          Nouveau sur scène
        </span>
        <div className="newcomer-stage-avatar overflow-hidden rounded-full border-4 border-blanc-pure shadow-[0_16px_40px_rgba(0,0,0,.24)]" style={{ background: color }}>
          {nouveau.photo ? <img src={nouveau.photo} alt={nomComplet(nouveau)} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center font-headline text-3xl font-black tracking-wider text-blanc-pure">{initiales(nouveau.prenom, nouveau.nom)}</span>}
        </div>
        <h1 className="mt-4 font-headline text-[clamp(2rem,5vw,4rem)] font-black uppercase leading-none tracking-tight text-black drop-shadow-sm">{nomComplet(nouveau)}</h1>
        <p className="mt-2 font-label-md text-sm font-bold uppercase tracking-wider text-black">{FILIERE_LIBELLE[nouveau.filiereCode]} · 1re année</p>
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
  const setStats = useAppStore((s) => s.setStats);
  const setView = useAppStore((s) => s.setView);
  const filiereActive = useAppStore((s) => s.filiereActive);

  const [drawState, setDrawState] = useState<DrawState>("idle");
  const [portraits, setPortraits] = useState<PortraitEtudiant[]>([]);
  const [tirage, setTirage] = useState<TirageResult | null>(null);
  const [revealProgress, setRevealProgress] = useState(0);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const drawLockRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  // Une fin de filière reste visible assez longtemps pour l'animateur, puis
  // ramène naturellement l'affichage à l'accueil.
  useEffect(() => {
    if (!completion) return;
    const redirectTimer = window.setTimeout(() => setView("accueil"), 5000);
    return () => window.clearTimeout(redirectTimer);
  }, [completion, setView]);

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

  const terminerFiliere = async (reason: CompletionState["reason"]) => {
    setCurrentNouveau(null);
    setDrawAnimation(null);
    try {
      const latestStats = await api.stats();
      setStats(latestStats);
      setCompletion({
        reason,
        isAllFinished: latestStats.totalRestants === 0 && latestStats.totalNouveaux > 0,
      });
    } catch {
      // Le message de fin reste utile même si le rafraîchissement des compteurs échoue.
      setCompletion({ reason, isAllFinished: false });
    }
  };

  const chargerSuivant = async () => {
    if (loadingNext || completion || (currentNouveau && drawState !== "complete")) return;
    setLoadingNext(true);
    try {
      const { nouveau, raison } = await api.prochainNouveau(filiereActive, currentNouveau?.id);
      setCurrentTirage(null);
      setDrawAnimation(null);
      setCurrentNouveau(nouveau);
      if (!nouveau) await terminerFiliere(raison ?? "filiere_terminee");
    } catch {
      setDrawState("error");
    } finally {
      setLoadingNext(false);
    }
  };

  const marquerAbsent = async () => {
    if (!currentNouveau || (drawState !== "idle" && drawState !== "error")) return;
    try {
      await api.marquerAbsent(currentNouveau.id, true);
      // L'appel est ici volontairement manuel, jamais exécuté après une erreur de tirage.
      const { nouveau, raison } = await api.prochainNouveau(filiereActive, currentNouveau.id);
      setCurrentNouveau(nouveau);
      if (!nouveau) await terminerFiliere(raison ?? "absents_restants");
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
      <FinishedModal
        open={Boolean(completion)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletion(null);
            setView("accueil");
          }
        }}
        filiere={filiereActive}
        isAllFinished={completion?.isAllFinished}
        reason={completion?.reason}
        autoRedirect
        onViewResults={() => {
          setCompletion(null);
          setView("resultats");
        }}
        onGoToPilote={() => {
          setCompletion(null);
          setView("pilote");
        }}
      />
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><span className="h-28 w-28 animate-ping rounded-full border border-violet-300/60 shadow-[0_0_70px_rgba(139,92,246,.9)]" /></div>}>
        <PhotoSphereStage
          portraits={portraits}
          winner2={winnersVisible ? tirage?.parrain2 ?? null : null}
          winner3={winnersVisible ? tirage?.parrain3 ?? null : null}
          phase={scenePhase}
          showMentorSpheres={showMentorSpheres}
          revealProgress={revealProgress}
          family={tirage}
        />
      </Suspense>

      {currentNouveau && canStart && <NouveauOnStage nouveau={currentNouveau} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex items-end justify-center gap-5">
        {canStart && currentNouveau && (
          <div className="pointer-events-auto relative flex flex-col items-center">
            <div className="absolute inset-0 scale-125 rounded-full bg-jaune-soleil/35 blur-2xl animate-pulse" />
            <button
              type="button"
              onClick={decouvrir}
              aria-label={drawState === "error" ? "Réessayer le tirage" : "Lancer le tirage"}
              className={"relative group h-[260px] w-[260px] cursor-pointer rounded-full p-2.5 amsen-gradient shadow-[0_24px_50px_rgba(31,122,58,.35)] transition-transform duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 " + (drawState === "error" ? "sphere-icon-control--alert" : "")}
            >
              <span className="flex h-full w-full flex-col items-center justify-center rounded-full bg-blanc-pure/10 p-space-sm text-blanc-pure backdrop-blur-[2px] transition-colors group-hover:bg-transparent">
                {drawState === "error" ? (
                  <span className="material-symbols-outlined mb-2 text-5xl">refresh</span>
                ) : (
                  <AmsenStar size={48} fill="#ffffff" className="mb-2 transition-transform duration-500 group-hover:rotate-45" />
                )}
                <span className="font-headline text-headline-md font-black uppercase leading-none tracking-wider text-white drop-shadow-lg">
                  {drawState === "error" ? "Réessayer" : "Découvrir"}
                </span>
                <span className="mt-2 font-label-md text-label-md font-semibold uppercase tracking-widest text-white/90">
                  Lancer le tirage
                </span>
              </span>
            </button>
          </div>
        )}
        {canStart && currentNouveau && (
          <button type="button" onClick={marquerAbsent} className="sphere-icon-control sphere-icon-control--secondary pointer-events-auto mb-5" aria-label="Marquer le nouveau absent">
            <span className="material-symbols-outlined text-2xl">person_remove</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">Absent</span>
          </button>
        )}
        {!currentNouveau && !completion && (
          <button type="button" onClick={chargerSuivant} disabled={loadingNext} className={"pointer-events-auto sphere-icon-control sphere-icon-control--primary disabled:cursor-wait disabled:opacity-60 " + (drawState === "error" ? "sphere-icon-control--alert" : "")} aria-label="Appeler le nouveau suivant">
            <span className="material-symbols-outlined text-2xl">play_arrow</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">{loadingNext ? "Recherche…" : "Nouveau suivant"}</span>
          </button>
        )}
        {drawState === "complete" && !completion && (
          <button type="button" onClick={chargerSuivant} disabled={loadingNext} className="pointer-events-auto sphere-icon-control sphere-icon-control--primary disabled:cursor-wait disabled:opacity-60" aria-label="Appeler le nouveau suivant">
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            <span className="font-label-md text-sm font-black uppercase tracking-wider">{loadingNext ? "Recherche…" : "Nouveau suivant"}</span>
          </button>
        )}
      </div>
    </section>
  );
}
