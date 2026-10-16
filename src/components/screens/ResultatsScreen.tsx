
// ÉCRAN 3 — RÉSULTATS & JEUX
// Cérémonie « Qui sont-ils ? » : chaque parrain passe en plein écran,
// photo floutée qui se défloute AUTOMATIQUEMENT et PROGRESSIVEMENT sur 3 secondes
// avec un compte à rebours géant, puis révélation totale + confettis.
// Carte Famille à la fin quand les 2 parrains sont révélés.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { spawnConfetti, spawnConfettiIn } from "@/components/shared/Confetti";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import {
  FILIERE_COULEUR,
  initiales,
  nomComplet,
  type Etudiant,
  type TirageResult,
} from "@/lib/types";

const REVEAL_DURATION_MS = 3000;

export function ResultatsScreen() {
  const tirage = useAppStore((s) => s.currentTirage);
  const setView = useAppStore((s) => s.setView);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const setDrawAnimation = useAppStore((s) => s.setDrawAnimation);
  const setStats = useAppStore((s) => s.setStats);

  const [mentorIdx, setMentorIdx] = useState(0);
  const [revealed2, setRevealed2] = useState(false);
  const [revealed3, setRevealed3] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);

  const parrain = mentorIdx === 0 ? tirage?.parrain2 : tirage?.parrain3;
  const niveau = mentorIdx === 0 ? 2 : 3;
  const bothRevealed = revealed2 && revealed3;

  const nextMentor = async () => {
    if (mentorIdx === 0) {
      setMentorIdx(1);
      return;
    }
    if (!bothRevealed || loadingNext || !tirage) return;

    setLoadingNext(true);
    setNextError(null);
    try {
      const { nouveau } = await api.prochainNouveau(
        tirage.filleul.filiereCode,
        tirage.filleul.id,
      );
      setCurrentNouveau(nouveau);
      setCurrentTirage(null);
      setDrawAnimation(null);
      if (!nouveau) {
        const latestStats = await api.stats();
        setStats(latestStats);
      }
      setView("tirage");
    } catch (error) {
      setNextError(error instanceof Error ? error.message : "Impossible d’appeler le nouveau suivant.");
    } finally {
      setLoadingNext(false);
    }
  };

  const onRevealed = () => {
    if (mentorIdx === 0) setRevealed2(true);
    else setRevealed3(true);
  };

  if (!tirage || !parrain) {
    return (
      <div className="relative flex flex-col w-full overflow-hidden min-h-[calc(100vh-5rem-3.5rem)]">
        <StageBackground />
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-space-lg">
          <AmsenStar size={80} />
          <h1 className="mt-space-md font-headline text-headline-xl text-encre-text font-extrabold uppercase">
            Aucune révélation en cours
          </h1>
          <p className="mt-space-sm font-body text-body-lg text-on-surface-variant max-w-xl">
            La cérémonie de révélation apparaîtra ici après un tirage. Retournez à
            l&apos;accueil pour lancer le prochain.
          </p>
          <button
            onClick={() => setView("accueil")}
            className="mt-space-lg px-space-xl py-space-md rounded-full amsen-gradient text-blanc-pure font-headline text-headline-sm font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-transform"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  const filiereColor = FILIERE_COULEUR[parrain.filiereCode] ?? "#1F7A3A";

  return (
    <div className="relative flex flex-col w-full overflow-hidden bg-background min-h-[calc(100vh-5rem-3.5rem)]">
      <StageBackground variant="festive" />

      <div className="relative z-10 w-full px-margin py-space-sm flex flex-col gap-space-sm">
        {/* Bandeau supérieur */}
        <div className="flex items-center justify-between mb-space-sm flex-wrap gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg uppercase tracking-wider shadow-sm">
              Filleul · {nomComplet(tirage.filleul)}
            </span>
            <div className="flex items-center gap-space-xs bg-vert-teranga/10 px-space-md py-space-xs rounded-full">
              <span
                className="material-symbols-outlined text-vert-teranga"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                groups_3
              </span>
              <span className="font-headline text-headline-sm text-vert-teranga font-black">
                {nomComplet(tirage.filleul)}
              </span>
              <span
                className="px-space-xs py-0.5 rounded-full font-label-md text-label-md ml-2"
                style={{
                  background: filiereColor,
                  color: parrain.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff",
                }}
              >
                {parrain.filiereCode} 1
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-md bg-surface-container-lowest px-space-md py-space-xs rounded-full shadow-md">
            <span className="font-label-lg text-label-lg text-on-surface-variant font-bold uppercase tracking-wide">
              Révélation Parrains
            </span>
            <div className="flex items-center gap-space-xs">
              <span
                className={
                  "w-4 h-4 rounded-full transition-all " +
                  (mentorIdx === 0
                    ? "bg-vert-teranga"
                    : revealed2
                    ? "bg-vert-teranga opacity-70"
                    : "bg-surface-variant")
                }
              />
              <span
                className={
                  "w-4 h-4 rounded-full transition-all " +
                  (mentorIdx === 1
                    ? "bg-rouge-laterite"
                    : revealed3
                    ? "bg-rouge-laterite opacity-70"
                    : "bg-surface-variant")
                }
              />
            </div>
            <span className="font-label-lg text-label-lg text-vert-teranga font-extrabold tabular-nums">
              {mentorIdx + 1} / 2
            </span>
          </div>
        </div>

        {/* Scène principale — remontée à chaque changement de parrain via key */}
        <ParrainReveal
          key={mentorIdx}
          parrain={parrain}
          niveau={niveau}
          filiereColor={filiereColor}
          onRevealed={onRevealed}
          onNext={nextMentor}
          bothRevealed={bothRevealed}
          isFirst={mentorIdx === 0}
          nextDisabled={loadingNext}
        />

        {/* Carte Famille (quand les 2 parrains sont révélés) */}
        {bothRevealed && <FamilyCard tirage={tirage} />}
        {nextError && (
          <p className="text-center font-label-md text-label-md font-semibold text-rouge-laterite" role="alert">
            {nextError}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Composant enfant : scène de révélation d'un parrain.
// Remonté via key={mentorIdx} → l'état (progress, step) se réinitialise
// automatiquement à chaque parrain, sans reset manuel.
// ------------------------------------------------------------------
function ParrainReveal({
  parrain,
  niveau,
  filiereColor,
  onRevealed,
  onNext,
  bothRevealed,
  isFirst,
  nextDisabled,
}: {
  parrain: Etudiant;
  niveau: number;
  filiereColor: string;
  onRevealed: () => void;
  onNext: () => void;
  bothRevealed: boolean;
  isFirst: boolean;
  nextDisabled: boolean;
}) {
  // Progression du défloutage : 0 → 1 sur 3 secondes (démarrage automatique)
  const [progress, setProgress] = useState(0);
  // 1 = très flou, 2 = moyen, 3 = révélé
  const [step, setStep] = useState(1);
  const confettiHolderRef = useRef<HTMLDivElement>(null);
  const notifiedRef = useRef(false);

  // Défloutage automatique et progressif sur 3 secondes avec compte à rebours.
  // Le composant étant remonté (key) à chaque parrain, l'effet ne tourne qu'une fois.
  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / REVEAL_DURATION_MS);
      setProgress(p);
      // Paliers : 2 à ~1,8 s (60 %), 3 à 3 s (100 %)
      setStep((prev) => {
        if (p >= 1 && prev < 3) return 3;
        if (p >= 0.6 && prev < 2) return 2;
        return prev;
      });
      if (p >= 1) {
        clearInterval(iv);
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          onRevealed();
        }
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Confettis à la révélation totale
  useEffect(() => {
    if (step === 3) {
      spawnConfetti(55);
      if (confettiHolderRef.current) spawnConfettiIn(confettiHolderRef.current, 40);
    }
  }, [step]);

  // Révélation manuelle immédiate (l'animateur court-circuite le compte à rebours)
  const revealNow = () => {
    setProgress(1);
    setStep(3);
    if (!notifiedRef.current) {
      notifiedRef.current = true;
      onRevealed();
    }
  };

  const initials = initiales(parrain.prenom, parrain.nom);
  // Flou lissé et progressif : 24 px → 0 px sur 3 secondes
  const blurPx = Math.max(0, 24 * (1 - progress));
  const scale = 1 + 0.1 * (1 - progress);
  const pct = Math.round(progress * 100);
  const secondsLeft = Math.max(0, Math.ceil((REVEAL_DURATION_MS / 1000) * (1 - progress)));
  const displayName =
    step === 3 ? nomComplet(parrain).toUpperCase() : step === 2 ? `${initials} …` : "??? ???";
  const yearLabel = niveau === 2 ? "2e Année" : "3e Année";

  return (
    <div className="grid grid-cols-12 gap-gutter items-stretch" style={{ minHeight: "46vh" }}>
      <div className="col-span-12 md:col-span-10 md:col-start-2 flex flex-col justify-between p-space-sm bg-surface-container-lowest rounded-[18px] shadow-[0_10px_24px_-10px_rgba(26,26,26,0.08),0_4px_10px_-6px_rgba(26,26,26,0.04)] relative overflow-hidden transition-all duration-500">
        {/* Métadonnées + jauge */}
        <div className="flex items-center justify-between z-10 flex-wrap gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span
              className="px-space-md py-space-xs rounded-full font-headline text-headline-sm font-black uppercase"
              style={{
                background: filiereColor,
                color: parrain.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff",
              }}
            >
              {yearLabel}
            </span>
            <span className="px-space-md py-space-xs rounded-full bg-encre-text text-blanc-pure font-label-lg text-label-lg font-bold">
              {parrain.filiereCode}_{niveau}
            </span>
          </div>
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full">
            <span className="material-symbols-outlined text-outline">lens_blur</span>
            <span className="font-label-md text-label-md text-on-surface-variant">Jauge Mystère</span>
            <div className="w-32 h-3 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-100 ease-linear"
                style={{
                  width: `${pct}%`,
                  background: step === 3 ? "#C62F24" : step === 2 ? "#FFD800" : "#1F7A3A",
                }}
              />
            </div>
            <span className="font-label-md text-label-md font-bold text-on-surface tabular-nums">
              {pct}%
            </span>
          </div>
        </div>

        {/* Zone identité */}
        <div className="flex flex-col md:flex-row md:justify-center items-center gap-space-lg my-auto py-space-sm z-10">
          {/* Photo floutée — plein écran, très visible */}
          <div
            className="relative w-[min(520px,86vw)] h-[min(440px,55vh)] md:w-[min(620px,43vw)] md:h-[min(560px,68vh)] rounded-[28px] overflow-hidden shadow-xl bg-surface-container flex-shrink-0 ring-2 ring-blanc-pure"
          >
            {parrain.photo ? (
              <img
                src={parrain.photo}
                alt={nomComplet(parrain)}
                className="w-full h-full object-cover object-center"
                style={{
                  filter: `blur(${blurPx}px)`,
                  transform: `scale(${scale})`,
                  transition: "filter 100ms linear, transform 100ms linear",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container">
                <AmsenStar size={180} />
              </div>
            )}
            {step < 3 && (
              <div className="absolute inset-0 z-10 bg-encre-text/25 backdrop-blur-[2px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <span
                    className="font-headline font-black text-blanc-pure drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] leading-none tabular-nums"
                    style={{ fontSize: "clamp(96px, 12vw, 180px)" }}
                  >
                    {secondsLeft}
                  </span>
                  <span className="mt-3 font-label-lg text-label-lg text-blanc-pure/90 uppercase tracking-widest font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                    Défloutage en cours…
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 z-10 py-2 px-space-md bg-surface-container-lowest/95 backdrop-blur-md rounded-full text-center shadow-lg flex items-center justify-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-vert-teranga animate-pulse" />
              <span className="font-label-lg text-label-lg text-vert-teranga font-black uppercase tracking-wide">
                {step === 3 ? "Officiellement Parrain !" : `Défloutage : ${secondsLeft}s`}
              </span>
            </div>
          </div>

          {/* Initiales + nom */}
          <div className="flex flex-col flex-1 min-w-0 justify-center pl-0 md:flex-none md:w-[32%] md:pl-space-lg pr-space-md text-center md:text-left">
            <div className="flex items-center gap-space-sm mb-space-sm justify-center md:justify-start">
              <div
                className="border-2 px-space-lg py-space-xs rounded-2xl shadow-inner overflow-hidden flex items-center justify-center"
                style={{ borderColor: filiereColor + "4d", background: filiereColor + "1a" }}
              >
                <span
                  className="font-headline text-headline-md font-black tabular-nums tracking-widest animate-pulse"
                  style={{ color: filiereColor, fontSize: "clamp(32px, 3.2vw, 44px)" }}
                >
                  {initials}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="font-label-lg text-label-lg font-extrabold uppercase tracking-wider"
                  style={{ color: filiereColor }}
                >
                  Initiales Détectées
                </span>
                <span className="font-body text-body-md text-outline font-medium">
                  Candidat au parrainage
                </span>
              </div>
            </div>
            <div className="min-h-[110px] flex items-center my-space-xs justify-center md:justify-start">
              <h1
                className="font-headline text-on-surface font-extrabold uppercase tracking-tight leading-none drop-shadow-sm transition-all duration-500"
                style={{ fontSize: "clamp(40px, 5.5vw, 80px)", lineHeight: 1.04 }}
              >
                {displayName}
              </h1>
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between pt-space-sm z-10 flex-wrap gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-full bg-rouge-laterite animate-pulse" />
            <span className="font-label-md text-label-md font-semibold text-on-surface-variant">
              Défloutage automatique · 3 secondes
            </span>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={revealNow}
              disabled={step >= 3}
              className="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-vert-teranga hover:bg-primary-container text-blanc-pure font-label-lg text-label-lg transition-transform active:scale-95 shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined">celebration</span>
              <span>Révéler maintenant</span>
            </button>
            <button
              onClick={onNext}
              disabled={nextDisabled || (!isFirst && !bothRevealed)}
              className="flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-encre-text hover:bg-inverse-surface text-blanc-pure font-label-lg text-label-lg transition-transform active:scale-95 shadow-md"
            >
              <span>
                {isFirst
                  ? "Parrain 2 (3e Année)"
                  : bothRevealed
                  ? nextDisabled
                    ? "Chargement…"
                    : "Nouveau suivant"
                  : "Voir carte Famille"}
              </span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <div ref={confettiHolderRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
        <div className="absolute bottom-0 left-0 right-0 h-2 amsen-gradient" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Carte Famille — affichée quand les 2 parrains sont révélés.
// ------------------------------------------------------------------
function FamilyCard({ tirage }: { tirage: TirageResult }) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    const contactLine = (label: string, etudiant: Etudiant) => [
      `${label}: ${nomComplet(etudiant)}`,
      etudiant.telephone ? `Téléphone: ${etudiant.telephone}` : null,
      etudiant.email ? `Email: ${etudiant.email}` : null,
    ].filter(Boolean).join("\n");

    const familyDetails = [
      "AMSEN — FAMILLE DE PARRAINAGE",
      contactLine("Filleul", tirage.filleul),
      `Filière: ${tirage.filleul.filiereCode} · Niveau 1`,
      "",
      contactLine("Parrain 2e année", tirage.parrain2),
      "",
      contactLine("Parrain 3e année", tirage.parrain3),
    ].join("\n");

    let cancelled = false;
    QRCode.toDataURL(familyDetails, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    }).then((dataUrl) => {
      if (!cancelled) setQrCode(dataUrl);
    }).catch(() => {
      if (!cancelled) setQrCode(null);
    });

    return () => { cancelled = true; };
  }, [tirage]);

  return (
    <div className="w-full bg-surface-container-lowest rounded-3xl p-space-md shadow-xl animate-[float-slow_0.6s_ease-out]">
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-space-sm">
          <span
            className="material-symbols-outlined text-vert-teranga"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            family_restroom
          </span>
          <span className="font-headline text-headline-sm font-black uppercase text-on-surface">
            Carte Famille
          </span>
        </div>
        <span className="font-label-md text-label-md text-on-surface-variant">
          Souvenir de parrainage · {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md items-center">
        {/* Filleul */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-surface-container-high flex items-center justify-center font-headline text-headline-md font-black text-on-surface shadow-lg ring-4 ring-surface-container">
            {initiales(tirage.filleul.prenom, tirage.filleul.nom)}
          </div>
          <span className="mt-2 font-headline text-headline-sm font-extrabold text-on-surface">
            {nomComplet(tirage.filleul)}
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant">
            Filleul · {tirage.filleul.filiereCode} 1
          </span>
        </div>
        {/* Parrain 2 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-vert-teranga flex items-center justify-center font-headline text-headline-md font-black text-blanc-pure shadow-lg ring-4 ring-vert-teranga/30 overflow-hidden">
            {tirage.parrain2.photo ? (
              <img src={tirage.parrain2.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              initiales(tirage.parrain2.prenom, tirage.parrain2.nom)
            )}
          </div>
          <span className="mt-2 font-headline text-headline-sm font-extrabold text-vert-teranga">
            {nomComplet(tirage.parrain2)}
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant">Parrain · 2e Année</span>
        </div>
        {/* Parrain 3 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-rouge-laterite flex items-center justify-center font-headline text-headline-md font-black text-blanc-pure shadow-lg ring-4 ring-rouge-laterite/30 overflow-hidden">
            {tirage.parrain3.photo ? (
              <img src={tirage.parrain3.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              initiales(tirage.parrain3.prenom, tirage.parrain3.nom)
            )}
          </div>
          <span className="mt-2 font-headline text-headline-sm font-extrabold text-rouge-laterite">
            {nomComplet(tirage.parrain3)}
          </span>
          <span className="font-label-md text-label-md text-on-surface-variant">Parrain · 3e Année</span>
        </div>
        {/* QR code */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-blanc-pure rounded-xl shadow-md p-1.5 flex items-center justify-center">
            {qrCode ? (
              <img src={qrCode} alt="QR code des coordonnées du filleul et de ses parrains" className="w-full h-full" />
            ) : (
              <span className="font-label-md text-label-md text-outline">QR…</span>
            )}
          </div>
          <span className="mt-2 font-label-md text-label-md text-on-surface-variant">
            Fiche de parrainage
          </span>
          <span className="font-label-md text-label-md text-outline">Scanner pour voir les coordonnées</span>
        </div>
      </div>
    </div>
  );
}
