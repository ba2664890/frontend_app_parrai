
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenLogo, AmsenStar } from "@/components/shared/AmsenLogo";
import { FinishedModal } from "@/components/shared/FinishedModal";
import { FILIERE_COULEUR, FILIERE_LIBELLE, initiales, nomComplet, type Etudiant, type StatsFiliere, type TirageResult } from "@/lib/types";
import { useEffect, useState } from "react";

const SLOGANS = [
  "Deux parrains t'attendent.",
  "Le hasard a choisi.",
  "Prêt à découvrir ?",
  "Qui veillera sur toi ?",
];

export function AccueilScreen() {
  const stats = useAppStore((s) => s.stats);
  const filiereActive = useAppStore((s) => s.filiereActive);
  const setView = useAppStore((s) => s.setView);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const currentNouveau = useAppStore((s) => s.currentNouveau);
  const currentTirage = useAppStore((s) => s.currentTirage);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);

  const [sloganIdx, setSloganIdx] = useState(0);
  const [sloganOpacity, setSloganOpacity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Charger le dernier binôme tiré s'il n'est pas encore dans le store
  useEffect(() => {
    if (!currentTirage) {
      api.binomes().then((binomes) => {
        if (binomes && binomes.length >= 2) {
          // Les parrainages sont triés par date décroissante
          const p1 = binomes[0];
          const p2 = binomes[1];
          if (p1.filleul.id === p2.filleul.id) {
            const parrain2 = p1.niveau === 2 ? p1.parrain : p2.parrain;
            const parrain3 = p1.niveau === 3 ? p1.parrain : p2.parrain;
            setCurrentTirage({
              filleul: p1.filleul,
              parrain2,
              parrain3,
              indices2: [],
              indices3: [],
            });
          }
        }
      }).catch(() => {});
    }
  }, [currentTirage, setCurrentTirage]);

  useEffect(() => {
    const iv = setInterval(() => {
      setSloganOpacity(0);
      setTimeout(() => {
        setSloganIdx((i) => (i + 1) % SLOGANS.length);
        setSloganOpacity(1);
      }, 300);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const commencer = async () => {
    const filiere = filiereActive || stats?.filieres?.[0]?.code || "AS";
    setLoading(true);
    try {
      await api.changerFiliere(filiere);
      const { nouveau } = await api.prochainNouveau(filiere, currentNouveau?.id);
      if (nouveau) {
        setCurrentNouveau(nouveau);
        setView("tirage");
      } else {
        setModalOpen(true);
      }
    } catch (e) {
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const totalParraines = stats?.totalParraines ?? 0;
  const totalNouveaux = stats?.totalNouveaux ?? 0;
  const filieres = stats?.filieres ?? [];

  const filiereStats = filieres.find((f) => f.code === filiereActive);
  const filiereFinished = filiereStats ? filiereStats.restants === 0 : false;
  const allFinished = (stats?.totalRestants ?? 0) === 0 && totalNouveaux > 0;

  return (
    <div className="flex flex-col w-full relative overflow-hidden select-none">
      <StageBackground />

      <FinishedModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        filiere={filiereActive}
        isAllFinished={allFinished}
        onViewResults={() => setView("resultats")}
        onGoToPilote={() => setView("pilote")}
      />

      <div className="relative z-10 w-full px-[6vw] py-space-md flex flex-col justify-between min-h-[calc(100vh-5rem-3.5rem)]">
        {/* Bandeau supérieur */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-space-sm bg-surface-container-low/90 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-sm">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-vert-teranga animate-ping" />
            <span className="font-label-md text-label-md text-encre-text uppercase tracking-widest font-bold">
              Cérémonie Officielle AMSEN
            </span>
            <span className="hidden sm:inline font-body-md text-outline">|</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-vert-teranga/20 bg-vert-teranga/10 px-3 py-1.5 text-vert-teranga shadow-sm ring-1 ring-white/70">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-vert-teranga/70">Filière tirée</span>
                <span className="font-headline text-sm font-extrabold">
                  {filiereActive} <span className="font-label-md font-semibold">· {FILIERE_LIBELLE[filiereActive] ?? filiereActive}</span>
                </span>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-baseline gap-space-xs bg-surface-container-lowest px-space-md py-space-xs rounded-2xl shadow-sm">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">
                Parrainés
              </span>
              <span className="font-headline-md text-headline-md text-vert-teranga font-black tabular-nums tracking-tight">
                {totalParraines}
              </span>
              <span className="font-headline-sm text-headline-sm text-outline font-semibold">/</span>
              <span className="font-headline-md text-headline-md text-encre-text font-black tabular-nums tracking-tight">
                {totalNouveaux}
              </span>
            </div>
          </div>
        </div>

        {/* Composition centrale : 2 cartes (mystère ou révélées) + bouton */}
        <div className="grid grid-cols-12 gap-gutter items-center my-auto py-space-sm">
          {/* Carte gauche — Parrain 2e année */}
          <div className="col-span-12 md:col-span-3 flex justify-start">
            <MysteryCard
              year="2ᵉ Année"
              accent="vert-teranga"
              icon="school"
              label={currentTirage?.parrain2 ? nomComplet(currentTirage.parrain2) : "Futur Parrain"}
              footer={currentTirage?.filleul ? `Filleul : ${nomComplet(currentTirage.filleul)}` : "Identité scellée"}
              footerIcon={currentTirage?.parrain2 ? "check_circle" : "verified_user"}
              parrain={currentTirage?.parrain2}
            />
          </div>

          {/* Centre — logo + titre + bouton */}
          <div className="col-span-12 md:col-span-6 flex flex-col items-center text-center px-space-xs">
            <div className="relative mb-space-sm group">
              <div className="absolute inset-0 rounded-full bg-jaune-soleil/40 blur-3xl group-hover:blur-[40px] transition-all duration-500 scale-125" />
              <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full p-1.5 bg-surface-container-lowest shadow-2xl flex items-center justify-center ring-4 ring-jaune-soleil/20">
                <AmsenLogo size={220} className="w-full h-full" />
              </div>
            </div>

            <h1 className="font-headline text-headline-xl text-encre-text tracking-tight font-extrabold uppercase mt-space-xs leading-none">
              Qui sera ton parrain ?
            </h1>

            <div className="h-9 my-space-xs flex items-center justify-center overflow-hidden">
              <p
                className="font-body text-body-lg text-on-surface-variant font-medium tracking-wide transition-opacity duration-300"
                style={{ opacity: sloganOpacity }}
              >
                {SLOGANS[sloganIdx]}
              </p>
            </div>

            {/* Bouton central pulsant ou indicateur terminé */}
            {allFinished || filiereFinished ? (
              <div className="relative mt-space-xs flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="w-52 h-52 rounded-full amsen-gradient p-2 shadow-2xl flex items-center justify-center animate-[float-slow_4s_ease-in-out_infinite] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-blanc-pure/15 backdrop-blur-md flex flex-col items-center justify-center text-blanc-pure p-4">
                    <span className="material-symbols-outlined text-5xl mb-1 drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                      celebration
                    </span>
                    <span className="font-headline text-headline-sm font-black tracking-wider uppercase text-center leading-tight">
                      {allFinished ? "100% Terminé" : `${filiereActive} Terminé`}
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold mt-2 text-blanc-pure/90 bg-blanc-pure/20 px-3 py-1 rounded-full">
                      Voir le récap
                    </span>
                  </div>
                </button>
                <div className="mt-space-sm flex items-center gap-2 bg-vert-teranga/15 border border-vert-teranga/30 px-space-md py-1.5 rounded-full shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-vert-teranga animate-ping" />
                  <span className="font-label-md text-label-md font-bold text-vert-teranga">
                    {allFinished ? "Tous les nouveaux sont parrainés" : `Filière ${filiereActive} au complet`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative mt-space-xs flex items-center justify-center">
                <div className="absolute w-[300px] h-[300px] rounded-full bg-jaune-soleil/35 blur-2xl animate-pulse" />
                <button
                  onClick={commencer}
                  disabled={loading || !filiereActive || !stats?.urnesGenerees}
                  className="relative group cursor-pointer w-[260px] h-[260px] rounded-full p-2.5 shadow-[0_24px_50px_rgba(31,122,58,0.35)] transition-transform duration-300 active:scale-95 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed amsen-gradient"
                  style={{ animation: "float-slow 3s ease-in-out infinite" }}
                  type="button"
                >
                  <div className="w-full h-full rounded-full bg-blanc-pure/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-space-sm text-blanc-pure group-hover:bg-transparent transition-colors">
                    <AmsenStar size={48} fill="#ffffff" className="mb-2 group-hover:rotate-45 transition-transform duration-500" />
                    <span className="font-headline text-headline-md font-black tracking-wider text-blanc-pure uppercase leading-none drop-shadow-lg">
                      {loading ? "…" : "COMMENCER"}
                    </span>
                    <span className="mt-2 font-label-md text-label-md tracking-widest text-blanc-pure/90 uppercase font-semibold">
                      Lancer le tirage
                    </span>
                  </div>
                </button>
              </div>
            )}

            {!stats?.urnesGenerees && (
              <p className="mt-space-xs font-label-md text-label-md text-rouge-laterite font-semibold">
                ⚠ Les urnes ne sont pas encore générées — voir l&apos;écran Pilote.
              </p>
            )}
          </div>

          {/* Carte droite — Parrain 3e année */}
          <div className="col-span-12 md:col-span-3 flex justify-end">
            <MysteryCard
              year="3ᵉ Année"
              accent="rouge-laterite"
              icon="workspace_premium"
              label={currentTirage?.parrain3 ? nomComplet(currentTirage.parrain3) : "Parrain Majeur"}
              footer={currentTirage?.filleul ? `Filleul : ${nomComplet(currentTirage.filleul)}` : "Révélation imminente"}
              footerIcon={currentTirage?.parrain3 ? "check_circle" : "auto_awesome"}
              parrain={currentTirage?.parrain3}
            />
          </div>
        </div>

        {/* Bandeau inférieur — 4 anneaux de progression + ticker */}
        <div className="w-full flex flex-col gap-space-sm pt-space-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-space-md shadow-sm">
            {filieres.length > 0
              ? filieres.map((f) => <FiliereRing key={f.code} f={f} />)
              : [0, 1, 2, 3].map((i) => <FiliereRingSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MysteryCard({
  year,
  accent,
  icon,
  label,
  footer,
  footerIcon,
  parrain,
}: {
  year: string;
  accent: "vert-teranga" | "rouge-laterite";
  icon: string;
  label: string;
  footer: string;
  footerIcon: string;
  parrain?: Etudiant;
}) {
  const accentBg = accent === "vert-teranga" ? "bg-vert-teranga" : "bg-rouge-laterite";
  const accentText = accent === "vert-teranga" ? "text-vert-teranga" : "text-rouge-laterite";
  const accentBgSoft = accent === "vert-teranga" ? "bg-vert-teranga/10" : "bg-rouge-laterite/10";
  return (
    <div className={`group relative w-full max-w-[290px] h-[370px] bg-gradient-to-br ${accent === "vert-teranga" ? "from-blanc-pure via-surface-container-low to-vert-teranga/5" : "from-blanc-pure via-surface-container-low to-rouge-laterite/5"} rounded-3xl p-space-md shadow-xl flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 ${accentBg} text-blanc-pure px-3.5 py-1 rounded-full font-label-md text-label-md font-bold uppercase tracking-wider shadow-sm`}>
          <span className="material-symbols-outlined text-sm">{icon}</span> {year}
        </span>
        <span className={`material-symbols-outlined ${parrain ? accentText : "text-outline/50"} transition-colors`}>
          {parrain ? "lock_open" : "lock"}
        </span>
      </div>
      <div className="my-auto flex flex-col items-center justify-center">
        {parrain ? (
          <div className="flex flex-col items-center text-center">
            <div className={`relative w-28 h-28 rounded-full ${accentBgSoft} flex items-center justify-center overflow-hidden shadow-lg ring-4 ${accent === "vert-teranga" ? "ring-vert-teranga/30" : "ring-rouge-laterite/30"}`}>
              {parrain.photo ? (
                <img src={parrain.photo} alt={nomComplet(parrain)} className="w-full h-full object-cover" />
              ) : (
                <span className={`font-headline text-headline-lg ${accentText} font-black`}>
                  {initiales(parrain.prenom, parrain.nom)}
                </span>
              )}
            </div>
            <p className="mt-space-sm font-headline text-label-lg font-extrabold text-on-surface uppercase tracking-tight line-clamp-1">
              {label}
            </p>
          </div>
        ) : (
          <>
            <div className={`relative w-24 h-24 rounded-full ${accentBgSoft} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
              <span className={`font-headline text-headline-xl ${accentText} font-black animate-pulse`}>?</span>
            </div>
            <p className="mt-space-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              {label}
            </p>
          </>
        )}
      </div>
      <div className="w-full bg-surface-container/70 backdrop-blur-sm py-2 px-3 rounded-xl flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
        <span className="truncate pr-1">{footer}</span>
        <span className={`material-symbols-outlined text-base ${accentText} shrink-0`}>{footerIcon}</span>
      </div>
    </div>
  );
}

function FiliereRing({ f }: { f: StatsFiliere }) {
  const pct = f.totalNouveaux > 0 ? Math.round((f.parraines / f.totalNouveaux) * 100) : 0;
  const color = FILIERE_COULEUR[f.code] ?? "#1F7A3A";
  const isISEP = f.code === "ISEP";
  return (
    <div className="flex items-center gap-space-md">
      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {isISEP && (
            <defs>
              <linearGradient id={`grad-${f.code}`} x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#1F7A3A" />
                <stop offset="50%" stopColor="#FFD800" />
                <stop offset="100%" stopColor="#C62F24" />
              </linearGradient>
            </defs>
          )}
          <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={isISEP ? `url(#grad-${f.code})` : color}
            strokeDasharray={`${pct}, 100`}
            strokeLinecap="round"
            strokeWidth="3.8"
          />
        </svg>
        <span className="absolute font-headline text-headline-sm font-black" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="font-headline text-headline-sm leading-none text-encre-text font-extrabold truncate">
            {f.code}
          </span>
        </div>
        <span className="font-label-md text-label-md text-on-surface-variant mt-1 truncate">
          {FILIERE_LIBELLE[f.code] ?? f.libelle}
        </span>
        <span className="font-label-md text-label-md text-outline mt-0.5">
          {f.parraines}/{f.totalNouveaux} · {f.restants} restants
        </span>
      </div>
    </div>
  );
}

function FiliereRingSkeleton() {
  return (
    <div className="flex items-center gap-space-md animate-pulse">
      <div className="w-16 h-16 rounded-full bg-surface-container" />
      <div className="flex flex-col gap-1">
        <div className="h-4 w-16 bg-surface-container rounded" />
        <div className="h-3 w-24 bg-surface-container rounded" />
      </div>
    </div>
  );
}
