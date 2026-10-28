// Écran de consultation des résultats : affiche le dernier tirage si présent,
// ainsi que la liste complète de tous les binômes avec recherche et filtre par filière/classe.
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import { FamilyCard } from "@/components/shared/FamilyCard";
import { MentorRevealCard } from "@/components/shared/MentorRevealCard";
import { FILIERE_COULEUR, FILIERE_LIBELLE, nomComplet, type Parrainage } from "@/lib/types";

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

  // État pour la liste globale des binômes
  const [binomes, setBinomes] = useState<Parrainage[]>([]);
  const [loadingBinomes, setLoadingBinomes] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFiliere, setSelectedFiliere] = useState<string>("ALL");

  useEffect(() => {
    setRevealed({ two: false, three: false });
    setMessage(null);
    setError(null);
  }, [tirage?.filleul.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingBinomes(true);
    api.binomes()
      .then((data) => {
        if (!cancelled) setBinomes(data);
      })
      .catch((err) => {
        console.error("Erreur chargement binômes:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingBinomes(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filieresDisponibles = useMemo(() => {
    const set = new Set<string>();
    binomes.forEach((b) => {
      if (b.filleul?.filiereCode) set.add(b.filleul.filiereCode);
    });
    return Array.from(set).sort();
  }, [binomes]);

  const filteredBinomes = useMemo(() => {
    return binomes.filter((b) => {
      const matchFiliere = selectedFiliere === "ALL" || b.filleul?.filiereCode === selectedFiliere;
      if (!matchFiliere) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const filleulName = nomComplet(b.filleul).toLowerCase();
      const parrainName = nomComplet(b.parrain).toLowerCase();
      const filiereName = (FILIERE_LIBELLE[b.filleul?.filiereCode] || b.filleul?.filiereCode || "").toLowerCase();

      return (
        filleulName.includes(q) ||
        parrainName.includes(q) ||
        filiereName.includes(q)
      );
    });
  }, [binomes, selectedFiliere, search]);

  const complete = revealed.two && revealed.three;
  const appelerSuivant = async () => {
    if (!tirage || !complete || loadingNext) return;
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
      <StageBackground variant={tirage ? "festive" : "default"} />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-margin py-space-md flex flex-col gap-8">
        
        {/* SECTION 1 : AFFICHAGE DU DERNIER TIRAGE EN COURS (SI EXISTANT) */}
        {tirage ? (
          <div>
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
          </div>
        ) : (
          <header className="text-center pt-2">
            <span className="rounded-full bg-vert-teranga/10 px-4 py-2 font-label-md text-sm font-black uppercase tracking-widest text-vert-teranga">
              Cérémonie AMSEN
            </span>
            <h1 className="mt-4 font-headline text-[clamp(2rem,4vw,3.2rem)] font-black uppercase tracking-tight text-on-surface">
              Tous les résultats du parrainage
            </h1>
            <p className="mt-2 font-body text-body-md text-on-surface-variant">
              Consultez l'ensemble des attributions et binômes formés lors de la cérémonie.
            </p>
          </header>
        )}

        {/* SECTION 2 : TOUS LES RÉSULTATS AVEC FILTRE ET RECHERCHE */}
        <section className="bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-xl border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div>
              <h2 className="font-headline text-headline-sm font-black uppercase tracking-tight text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vert-teranga">group</span>
                Liste complète des binômes ({filteredBinomes.length})
              </h2>
              <p className="font-body text-body-sm text-on-surface-variant mt-1">
                Filtrez par filière ou recherchez un étudiant par son prénom ou nom.
              </p>
            </div>

            {/* Barre de recherche */}
            <div className="relative min-w-[260px] md:w-80">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher filleul ou parrain…"
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/50 bg-surface-container-low text-on-surface font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-vert-teranga focus:border-transparent transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtres par classe / filière */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 thin-scroll">
            <span className="font-label-md text-xs font-bold uppercase text-on-surface-variant mr-1 shrink-0">
              Filière :
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiliere("ALL")}
              className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all shrink-0 ${
                selectedFiliere === "ALL"
                  ? "bg-encre-text text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Toutes ({binomes.length})
            </button>
            {filieresDisponibles.map((filiereCode) => {
              const count = binomes.filter((b) => b.filleul?.filiereCode === filiereCode).length;
              const color = FILIERE_COULEUR[filiereCode] || "#1F7A3A";
              const isSelected = selectedFiliere === filiereCode;
              return (
                <button
                  key={filiereCode}
                  type="button"
                  onClick={() => setSelectedFiliere(filiereCode)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? "#FFFFFF" : color }}
                  />
                  <span>{filiereCode}</span>
                  <span className="opacity-80 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Liste / Grille des résultats */}
          {loadingBinomes ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-vert-teranga animate-spin">
                progress_activity
              </span>
              <p className="font-body text-body-md text-on-surface-variant">Chargement des binômes…</p>
            </div>
          ) : filteredBinomes.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-2">search_off</span>
              <p className="font-headline text-headline-sm font-bold text-on-surface">Aucun binôme trouvé</p>
              <p className="font-body text-body-sm text-on-surface-variant mt-1">
                {search ? "Essayez avec d'autres termes de recherche." : "Aucun tirage n'a encore été enregistré."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBinomes.map((binome) => {
                const color = FILIERE_COULEUR[binome.filleul?.filiereCode] || "#1F7A3A";
                return (
                  <article
                    key={binome.id}
                    className="flex flex-col justify-between p-4 rounded-2xl bg-surface-container-low/80 hover:bg-surface-container border border-outline-variant/30 transition-all hover:shadow-md"
                  >
                    <div>
                      {/* En-tête de carte */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full font-label-md text-[11px] font-black uppercase text-white shadow-xs"
                          style={{ backgroundColor: color }}
                        >
                          {binome.filleul?.filiereCode}
                        </span>
                        <span className="font-label-md text-[11px] font-semibold text-outline">
                          {binome.dateTirage
                            ? new Date(binome.dateTirage).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      {/* Filleul */}
                      <div className="mb-2.5">
                        <span className="font-label-md text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Filleul(e) · 1A
                        </span>
                        <h3 className="font-headline text-label-lg font-black uppercase text-on-surface truncate">
                          {nomComplet(binome.filleul)}
                        </h3>
                      </div>

                      {/* Flèche de lien */}
                      <div className="flex items-center gap-1.5 text-vert-teranga my-1 opacity-80">
                        <span className="material-symbols-outlined text-[16px]">south</span>
                        <span className="font-label-md text-[10px] font-bold uppercase tracking-wider">
                          Parrainé par
                        </span>
                      </div>

                      {/* Parrain */}
                      <div className="flex items-center gap-3 mt-1.5 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                        {binome.parrain?.photo ? (
                          <img
                            src={binome.parrain.photo}
                            alt={nomComplet(binome.parrain)}
                            className="w-10 h-10 rounded-full object-cover border border-outline-variant/40 shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-headline text-xs font-black text-white shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {binome.parrain ? binome.parrain.prenom.charAt(0) : "P"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-headline text-label-md font-bold uppercase text-on-surface truncate">
                            {nomComplet(binome.parrain)}
                          </h4>
                          <p className="font-label-md text-[11px] font-semibold text-on-surface-variant">
                            Parrain {binome.niveau}e Année
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
