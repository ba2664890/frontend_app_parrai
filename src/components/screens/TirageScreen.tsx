
// ÉCRAN 2 — TIRAGE
// Le nouveau est sur scène. Roulette des noms qui se fige, bouton géant
// « DÉCOUVRIR » sur lequel il appuie → tirage des 2 parrains → confettis.
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { spawnConfetti } from "@/components/shared/Confetti";
import { StageBackground } from "@/components/shared/StageBackground";
import { ModeRevealOverlay } from "@/components/shared/ModeRevealOverlay";
import { AmsenLogo } from "@/components/shared/AmsenLogo";
import { FILIERE_COULEUR, FILIERE_LIBELLE, initiales, nomComplet, type Etudiant, type TirageResult } from "@/lib/types";

const DRAW_ANIMATION_DURATION_MS = 3000;
const REVEAL_MODE = "cartes" as const;

// Pool de noms pour l'effet roulette (spectacle visuel)
const ROULETTE_POOL = [
  "AWA DIOP", "CHEIKH NDIAYE", "MARIAMA BA", "IBRAHIMA SARR", "FATIMA SALL",
  "OUSMANE FALL", "AMINATA SOW", "MAMADOU DIALLO", "KHADY GUEYE", "PAP SY",
  "BINETA MBAYE", "EL HADJI CISSE", "ASTOU KANE", "MODOU FAYE", "NDÈYE DIONE",
];

export function TirageScreen() {
  const currentNouveau = useAppStore((s) => s.currentNouveau);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const drawingResult = useAppStore((s) => s.drawAnimation);
  const setDrawAnimation = useAppStore((s) => s.setDrawAnimation);
  const resetReveal = useAppStore((s) => s.resetReveal);
  const setView = useAppStore((s) => s.setView);
  const stats = useAppStore((s) => s.stats);
  const filiereActive = useAppStore((s) => s.filiereActive);

  const [displayName, setDisplayName] = useState<string>("…");
  const [spinning, setSpinning] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!drawingResult) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / DRAW_ANIMATION_DURATION_MS);
      setDrawProgress(progress);
      if (progress >= 1) {
        clearInterval(interval);
        setDrawAnimation(null);
        setView("resultats");
      }
    }, 40);

    return () => clearInterval(interval);
  }, [drawingResult, setDrawAnimation, setView]);

  const totalParraines = stats?.totalParraines ?? 0;
  const total = stats?.totalNouveaux ?? 0;

  // Lancer la roulette à l'arrivée d'un nouveau
  useEffect(() => {
    if (!currentNouveau) {
      setDisplayName("…");
      setShowResult(false);
      return;
    }
    settledRef.current = false;
    setSpinning(true);
    setShowResult(false);
    const target = nomComplet(currentNouveau).toUpperCase();
    let elapsed = 0;
    const speed = 70;
    const duration = 2000;
    const iv = setInterval(() => {
      setDisplayName(ROULETTE_POOL[Math.floor(Math.random() * ROULETTE_POOL.length)]);
      elapsed += speed;
      if (elapsed >= duration) {
        clearInterval(iv);
        setSpinning(false);
        setDisplayName(target);
        settledRef.current = true;
      }
    }, speed);
    return () => clearInterval(iv);
  }, [currentNouveau]);

  const isExpectedFlowError = (message: string) =>
    /déjà tiré|absent|urne vide|Aucun nouveau restant|Les urnes doivent être générées/i.test(message);

  const decouvrir = async () => {
    if (!currentNouveau || revealing || drawingResult) return;
    setRevealing(true);
    setError(null);
    try {
      const tirage = await api.executerTirage(currentNouveau.id);
      setCurrentTirage(tirage);
      resetReveal();
      spawnConfetti(60);
      setShowResult(false);
      setDrawProgress(0);
      setDrawAnimation(tirage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur de tirage";
      if (isExpectedFlowError(msg)) {
        setError(null);
        await suivant();
        return;
      }
      setError(msg);
    } finally {
      setRevealing(false);
    }
  };

  const suivant = async () => {
    setShowResult(false);
    setCurrentTirage(null);
    try {
      const { nouveau } = await api.prochainNouveau(filiereActive, currentNouveau?.id);
      setCurrentNouveau(nouveau);
      if (!nouveau) setError("Aucun nouveau restant dans cette filière.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      if (isExpectedFlowError(msg)) {
        setError(null);
        return;
      }
      setError(msg);
    }
  };

  const marquerAbsent = async () => {
    if (!currentNouveau) return;
    try {
      await api.marquerAbsent(currentNouveau.id, true);
      await suivant();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (!currentNouveau) {
    const filiereStats = stats?.filieres.find((f) => f.code === filiereActive);
    const filiereFinished = filiereStats ? filiereStats.restants === 0 : false;
    const allFinished = (stats?.totalRestants ?? 0) === 0 && (stats?.totalNouveaux ?? 0) > 0;

    return (
      <div className="relative flex flex-col w-full overflow-hidden min-h-[calc(100vh-5rem-3.5rem)]">
        <StageBackground variant="festive" />
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-space-lg max-w-4xl mx-auto">
          {allFinished || filiereFinished ? (
            <div className="relative bg-surface-container-lowest/90 backdrop-blur-xl border border-vert-teranga/20 p-space-xl rounded-3xl shadow-2xl flex flex-col items-center animate-[float-slow_0.6s_ease-out]">
              <div className="w-24 h-24 rounded-full amsen-gradient flex items-center justify-center text-blanc-pure shadow-lg mb-space-md ring-8 ring-vert-teranga/10 animate-bounce">
                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  celebration
                </span>
              </div>
              <span className="px-space-md py-1 rounded-full bg-vert-teranga/10 text-vert-teranga font-label-lg text-label-lg font-black uppercase tracking-widest mb-2">
                {allFinished ? "Promotion 100% Parrainée" : `Filière ${filiereActive} Terminée`}
              </span>
              <h1 className="font-headline text-headline-xl text-on-surface font-black uppercase tracking-tight">
                {allFinished ? "Tous les nouveaux ont été parrainés !" : `Tous les filleuls ${filiereActive} ont leurs parrains !`}
              </h1>
              <p className="mt-space-sm font-body text-body-lg text-on-surface-variant max-w-lg">
                {allFinished
                  ? "La cérémonie officielle a atteint 100% de parrainages pour l'ensemble des filières. Félicitations à toute la famille ENSAE Dakar !"
                  : `Il n'y a plus aucun nouveau en attente dans la filière ${filiereActive}. Choisissez une autre filière ou consultez les résultats finaux.`}
              </p>
              
              <div className="flex items-center gap-space-md mt-space-lg flex-wrap justify-center">
                <button
                  onClick={() => setView("resultats")}
                  className="px-space-xl py-space-sm rounded-full bg-vert-teranga text-blanc-pure font-label-lg text-label-lg font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">family_restroom</span>
                  <span>Voir la Carte Famille</span>
                </button>
                <button
                  onClick={() => setView("pilote")}
                  className="px-space-lg py-space-sm rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-lg text-label-lg font-bold transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">tune</span>
                  <span>Changer de filière (Pilote)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <AmsenLogo size={160} className="mb-space-md" />
              <h1 className="font-headline text-headline-xl text-encre-text font-extrabold uppercase">
                En attente du prochain
              </h1>
              <p className="mt-space-sm font-body text-body-lg text-on-surface-variant max-w-xl">
                Aucun nouveau n&apos;est sur scène. L&apos;animateur peut lancer le tirage du
                prochain étudiant de la filière {filiereActive}.
              </p>
              <button
                onClick={suivant}
                className="mt-space-lg px-space-xl py-space-md rounded-full amsen-gradient text-blanc-pure font-headline text-headline-sm font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined align-middle mr-2">play_arrow</span>
                Appeler le prochain nouveau
              </button>
            </>
          )}

          {error && (
            <p className="mt-space-md font-label-md text-label-md text-rouge-laterite font-semibold">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const filiereColor = FILIERE_COULEUR[currentNouveau.filiereCode] ?? "#1F7A3A";

  return (
    <div className="relative flex flex-col w-full overflow-hidden min-h-[calc(100vh-5rem-3.5rem)]">
      <StageBackground variant="festive" />

      {drawingResult && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-encre-text/90 p-space-md text-center backdrop-blur-md" role="status" aria-live="polite">
          <div>
            <span className="font-label-lg text-label-lg font-bold uppercase tracking-[0.3em] text-jaune-soleil">
              Révélation du binôme
            </span>
            <h2 className="mt-2 font-headline text-headline-xl font-black uppercase text-white">
              Les parrains se révèlent
            </h2>
          </div>

          <div className="relative isolate grid h-[min(62vh,620px)] w-[min(92vw,980px)] grid-cols-2 gap-3 overflow-hidden rounded-3xl border-2 border-jaune-soleil/70 bg-surface-container shadow-2xl">
            {[drawingResult.parrain2, drawingResult.parrain3].map((parrain, index) => (
              <div key={parrain.id} className="relative flex min-w-0 flex-col overflow-hidden bg-surface-container-high">
                {parrain.photo ? (
                  <img src={parrain.photo} alt="" className="h-full min-h-0 w-full flex-1 object-cover object-center" />
                ) : (
                  <div className="flex h-full min-h-0 flex-1 items-center justify-center font-headline text-6xl font-black text-vert-teranga">
                    {initiales(parrain.prenom, parrain.nom)}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-4 pt-14 text-white">
                  <span className="block font-label-md text-label-md font-bold uppercase tracking-widest text-jaune-soleil">
                    Parrain · {index === 0 ? "2e année" : "3e année"}
                  </span>
                  <span className="mt-1 block truncate font-headline text-headline-sm font-black uppercase">
                    {drawProgress >= 0.88 ? nomComplet(parrain) : initiales(parrain.prenom, parrain.nom)}
                  </span>
                </div>
              </div>
            ))}
            <ModeRevealOverlay mode={REVEAL_MODE} progress={drawProgress} />
          </div>

          <div className="w-[min(80vw,480px)]">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-jaune-soleil transition-[width] duration-75" style={{ width: `${Math.round(drawProgress * 100)}%` }} />
            </div>
            <p className="mt-2 font-label-md text-label-md font-semibold text-white/80">
              {Math.max(0, Math.ceil((DRAW_ANIMATION_DURATION_MS / 1000) * (1 - drawProgress)))} s
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-7xl mx-auto px-margin py-space-md flex flex-col justify-between items-center flex-1">
        {/* Barre supérieure */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-space-sm bg-surface-container-low/80 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-sm">
            <AmsenLogo size={36} />
            <div className="flex flex-col">
              <span className="font-headline text-label-md tracking-wider text-on-surface uppercase font-black">
                AMSEN ENSAE
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                Cérémonie de Parrainage
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs bg-vert-teranga/10 px-space-md py-space-xs rounded-full">
              <span className="w-3.5 h-3.5 rounded-full bg-vert-teranga animate-ping" />
              <span className="font-label-lg text-label-lg text-vert-teranga font-bold tracking-wider uppercase">
                Urne Active
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 bg-surface-container-high px-space-md py-space-xs rounded-2xl shadow-sm">
              <span className="font-headline text-headline-sm text-vert-teranga font-black tabular-nums">
                {totalParraines}
              </span>
              <span className="font-headline text-body-lg text-outline font-bold">/</span>
              <span className="font-headline text-headline-sm text-on-surface font-extrabold tabular-nums">
                {total}
              </span>
            </div>
          </div>
        </div>

        {/* Scène centrale */}
        <div className="w-full flex flex-col items-center justify-center my-auto py-space-xs text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-jaune-soleil text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              stars
            </span>
            <p className="font-headline text-headline-md text-on-surface tracking-tight uppercase font-extrabold drop-shadow-sm">
              Qui est le prochain ?
            </p>
            <span className="material-symbols-outlined text-jaune-soleil text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              stars
            </span>
          </div>

          {/* Chip filière */}
          <div
            className="mb-3 flex items-center gap-2 px-space-md py-1.5 rounded-full shadow-md font-label-lg text-label-lg font-black tracking-widest uppercase"
            style={{ background: filiereColor, color: currentNouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: currentNouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }} />
            <span>{currentNouveau.filiereCode}_1</span>
          </div>

          {/* Nom géant */}
          <div className="relative overflow-visible px-space-xl py-1 flex items-center justify-center">
            <h1
              className="font-headline text-display-stage text-on-surface font-black uppercase tracking-tight text-center leading-none drop-shadow-sm transition-all duration-300"
              style={{
                transform: spinning ? `translateY(${Math.sin(Date.now() / 60) * 6}px) scale(0.98)` : "translateY(0) scale(1)",
                fontSize: "clamp(48px, 7vw, 96px)",
              }}
            >
              {displayName}
            </h1>
          </div>

          {/* Soulignement tricolore */}
          <div className="flex items-center justify-center gap-1.5 mt-2 w-48 h-2">
            <span className="w-1/3 h-full bg-vert-teranga rounded-full" />
            <span className="w-1/3 h-full bg-jaune-soleil rounded-full" />
            <span className="w-1/3 h-full bg-rouge-laterite rounded-full" />
          </div>

          {/* Bouton DÉCOUVRIR */}
          <div className="relative mt-space-sm flex flex-col items-center">
            <div className="absolute inset-0 rounded-full bg-jaune-soleil/40 blur-2xl animate-pulse scale-125 pointer-events-none" />
            <button
              onClick={decouvrir}
              disabled={revealing || spinning || !!drawingResult}
              className="relative group cursor-pointer w-[260px] h-[260px] rounded-full flex flex-col items-center justify-center text-blanc-pure shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed amsen-gradient"
              type="button"
            >
              <div className="absolute inset-2 rounded-full bg-blanc-pure/15 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all group-hover:bg-transparent">
                <span
                  className="material-symbols-outlined text-5xl mb-1 drop-shadow-md text-blanc-pure transform group-hover:scale-110 transition-transform duration-300"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  touch_app
                </span>
                <span className="font-headline text-headline-sm font-black tracking-widest text-blanc-pure uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  {revealing ? "…" : "DÉCOUVRIR"}
                </span>
              </div>
            </button>
            <div className="mt-space-md flex items-center gap-2 bg-surface-container-low px-space-md py-space-xs rounded-full shadow-sm">
              <span className="material-symbols-outlined text-vert-teranga text-xl animate-bounce">arrow_upward</span>
              <p className="font-label-lg text-label-lg text-on-surface font-semibold tracking-wide">
                Appuie pour révéler tes parrains
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-space-sm font-label-md text-label-md text-rouge-laterite font-semibold">{error}</p>
          )}

          {/* Carte résultat (apparaît après le clic) */}
          {showResult && (
            <div className="w-full max-w-4xl bg-surface-container-lowest rounded-3xl p-space-lg shadow-2xl mt-4 mb-2 animate-[float-slow_0.6s_ease-out]">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-3.5 h-3.5 rounded-full bg-vert-teranga animate-pulse" />
                  <span className="font-headline text-headline-sm font-black uppercase text-on-surface">
                    Binôme révélé !
                  </span>
                </div>
                <span
                  className="font-label-md text-label-md uppercase px-space-sm py-1 rounded-full font-bold"
                  style={{ background: filiereColor, color: currentNouveau.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff" }}
                >
                  {FILIERE_LIBELLE[currentNouveau.filiereCode]} · Promo 2025
                </span>
              </div>
              <p className="font-body text-body-md text-on-surface-variant text-center mb-space-sm">
                Redirection vers la cérémonie de révélation…
              </p>
            </div>
          )}
        </div>

        {/* Barre de contrôle animateur */}
        <div className="w-full pt-space-xs flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-outline font-label-md text-label-md">
            <span className="w-2 h-2 rounded-full bg-jaune-soleil animate-pulse" />
            <span>En attente de confirmation sur scène</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              onClick={marquerAbsent}
              disabled={showResult || revealing}
              title={
                showResult
                  ? "Tirage déjà effectué : ce nouveau a ses deux parrains et ne peut pas être retiré de l'urne."
                  : "Marquer absent : retire définitivement ce nouveau de l'urne."
              }
              className="flex items-center gap-1.5 px-space-md py-space-xs rounded-full font-label-md text-label-md font-semibold text-rouge-laterite bg-surface-container-low hover:bg-rouge-laterite/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">person_remove</span>
              <span>Absent (retirer de l&apos;urne)</span>
            </button>
            <button
              onClick={suivant}
              className="flex items-center gap-1.5 px-space-md py-space-xs rounded-full font-label-md text-label-md font-semibold text-blanc-pure bg-vert-teranga hover:bg-primary-container shadow-md transition-all"
            >
              <span>Étudiant Suivant</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
