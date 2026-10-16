// Écran conservé pour la consultation directe des derniers résultats.
// Le parcours normal se termine désormais directement dans TirageScreen.
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import { FamilyCard } from "@/components/shared/FamilyCard";
import { MentorRevealCard } from "@/components/shared/MentorRevealCard";
import { nomComplet } from "@/lib/types";

export function ResultatsScreen() {
  const tirage = useAppStore((s) => s.currentTirage);
  const setView = useAppStore((s) => s.setView);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const setDrawAnimation = useAppStore((s) => s.setDrawAnimation);
  const setStats = useAppStore((s) => s.setStats);

  const [revealed, setRevealed] = useState({ two: false, three: false });
  const [loadingNext, setLoadingNext] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRevealed({ two: false, three: false });
    setMessage(null);
    setError(null);
  }, [tirage?.filleul.id]);

  if (!tirage) {
    return (
      <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
        <StageBackground />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-space-lg text-center">
          <AmsenStar size={80} />
          <h1 className="mt-space-md font-headline text-headline-xl font-extrabold uppercase text-encre-text">Aucune révélation en cours</h1>
          <p className="mt-space-sm max-w-xl font-body text-body-lg text-on-surface-variant">La dernière carte famille apparaîtra ici après un tirage.</p>
          <button onClick={() => setView("accueil")} className="mt-space-lg rounded-full amsen-gradient px-space-xl py-space-md font-headline text-headline-sm font-black uppercase tracking-wider text-blanc-pure shadow-lg transition-transform hover:scale-105">Retour à l’accueil</button>
        </div>
      </div>
    );
  }

  const complete = revealed.two && revealed.three;
  const appelerSuivant = async () => {
    if (!complete || loadingNext) return;
    setLoadingNext(true);
    setError(null);
    setMessage(null);
    try {
      const { nouveau, raison } = await api.prochainNouveau(tirage.filleul.filiereCode, tirage.filleul.id);
      if (!nouveau) {
        const latestStats = await api.stats();
        setStats(latestStats);
        setMessage(raison === "absents_restants"
          ? "Les nouveaux non parrainés restants de cette filière sont marqués absents."
          : "Tous les nouveaux présents de cette filière sont maintenant parrainés.");
        return;
      }
      setCurrentNouveau(nouveau);
      setCurrentTirage(null);
      setDrawAnimation(null);
      setView("tirage");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’appeler le nouveau suivant.");
    } finally {
      setLoadingNext(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden bg-background">
      <StageBackground variant="festive" />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-margin py-space-md">
        <header className="mb-6 text-center">
          <span className="rounded-full bg-vert-teranga/10 px-4 py-2 font-label-md text-sm font-black uppercase tracking-widest text-vert-teranga">Résultat certifié</span>
          <h1 className="mt-4 font-headline text-[clamp(2.3rem,5vw,4rem)] font-black uppercase tracking-tight text-on-surface">La famille de {nomComplet(tirage.filleul)}</h1>
          <p className="mt-2 font-body text-body-md text-on-surface-variant">Les deux parrains enregistrés par l’urne sont révélés ci-dessous.</p>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          <MentorRevealCard key={`results-2-${tirage.parrain2.id}`} parrain={tirage.parrain2} niveau={2} onRevealed={() => setRevealed((value) => ({ ...value, two: true }))} />
          <MentorRevealCard key={`results-3-${tirage.parrain3.id}`} parrain={tirage.parrain3} niveau={3} onRevealed={() => setRevealed((value) => ({ ...value, three: true }))} />
        </div>
        {complete && <div className="mt-6"><FamilyCard tirage={tirage} /><div className="mt-6 flex justify-center"><button type="button" onClick={appelerSuivant} disabled={loadingNext} className="flex items-center gap-2 rounded-full bg-vert-teranga px-7 py-4 font-headline text-xl font-black uppercase tracking-wide text-blanc-pure shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"><span>{loadingNext ? "Chargement…" : "Nouveau suivant"}</span><span className="material-symbols-outlined">arrow_forward</span></button></div></div>}
        {message && <p className="mt-5 rounded-2xl border border-vert-teranga/20 bg-vert-teranga/10 px-5 py-3 text-center font-label-md font-bold text-vert-teranga" role="status">{message}</p>}
        {error && <p className="mt-5 text-center font-label-md font-bold text-rouge-laterite" role="alert">{error}</p>}
      </main>
    </div>
  );
}
