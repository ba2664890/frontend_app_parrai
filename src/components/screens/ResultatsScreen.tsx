import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import { FamilyCard } from "@/components/shared/FamilyCard";
import { FILIERE_COULEUR, nomComplet, type Etudiant, type Parrainage, type TirageResult } from "@/lib/types";

// Carte affichant un parrain révélé avec le design exact (comme sur la capture)
function RevealedMentorCard({
  parrain,
  niveau,
}: {
  parrain: Etudiant;
  niveau: 2 | 3;
}) {
  const color = FILIERE_COULEUR[parrain.filiereCode] ?? "#1F7A3A";

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-blanc-pure bg-surface-container-lowest p-4 shadow-[0_24px_50px_-28px_rgba(20,66,37,.55)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-3 py-1 font-label-md text-xs font-black uppercase tracking-wider"
          style={{
            background: color,
            color: parrain.filiereCode === "ISE_ECO" ? "#1a1a1a" : "#fff",
          }}
        >
          Parrain · {niveau}e année
        </span>
        <span className="font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          100 %
        </span>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-container">
        {parrain.photo ? (
          <img
            className="h-full w-full object-cover"
            src={parrain.photo}
            alt={nomComplet(parrain)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,216,0,.35),transparent_35%),linear-gradient(135deg,#14532d,#1f7a3a_58%,#0f3920)]">
            <span className="font-headline text-6xl font-black tracking-wider text-blanc-pure">
              {parrain.prenom.charAt(0)}
              {parrain.nom.charAt(0)}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-full bg-surface-container-lowest/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="font-label-md text-xs font-black uppercase tracking-wide" style={{ color }}>
            Parrain révélé
          </span>
        </div>
      </div>

      <div className="pt-4 text-center">
        <p className="font-label-md text-xs font-black uppercase tracking-[0.2em]" style={{ color }}>
          {parrain.filiereCode}_{niveau}
        </p>
        <h2 className="mt-1 min-h-12 font-headline text-[clamp(1.55rem,3.2vw,2.5rem)] font-black leading-none uppercase tracking-tight text-on-surface">
          {nomComplet(parrain).toUpperCase()}
        </h2>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full w-full" style={{ background: color }} />
      </div>
    </article>
  );
}

// Carte complète d'une famille révélée (2 parrains + carte famille QR)
function FamilyResultItem({ family }: { family: TirageResult }) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/80 p-5 md:p-8 shadow-xl backdrop-blur-sm">
      <header className="text-center">
        <span className="rounded-full bg-vert-teranga/10 px-4 py-1.5 font-label-md text-xs font-black uppercase tracking-widest text-vert-teranga">
          Parrainage officiel · {family.filleul.filiereCode}
        </span>
        <h2 className="mt-3 font-headline text-[clamp(1.8rem,3.5vw,2.8rem)] font-black uppercase tracking-tight text-on-surface">
          La famille de {nomComplet(family.filleul)}
        </h2>
        <p className="mt-1 font-body text-body-sm text-on-surface-variant">
          Les deux parrains enregistrés par l’urne sont révélés ci-dessous.
        </p>
      </header>

      {/* Les deux parrains (2A et 3A) avec la présentation demandée */}
      <div className="grid gap-5 md:grid-cols-2">
        <RevealedMentorCard parrain={family.parrain2} niveau={2} />
        <RevealedMentorCard parrain={family.parrain3} niveau={3} />
      </div>

      {/* Carte famille récapitulative avec QR code */}
      <FamilyCard tirage={family} />
    </div>
  );
}

export function ResultatsScreen() {
  const currentTirage = useAppStore((s) => s.currentTirage);
  const [binomes, setBinomes] = useState<Parrainage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFiliere, setSelectedFiliere] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.binomes()
      .then((data) => {
        if (!cancelled) setBinomes(data);
      })
      .catch((err) => {
        console.error("Erreur chargement binômes:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Regroupement des binômes individuels (1 parrainage = 1 parrain) en familles (filleul + parrain2 + parrain3)
  const families: TirageResult[] = useMemo(() => {
    const map = new Map<string, { filleul: Etudiant; parrain2?: Etudiant; parrain3?: Etudiant }>();

    // Si on a un tirage actif dans le store, on s'assure qu'il est inclus en tête
    if (currentTirage) {
      map.set(currentTirage.filleul.id, {
        filleul: currentTirage.filleul,
        parrain2: currentTirage.parrain2,
        parrain3: currentTirage.parrain3,
      });
    }

    binomes.forEach((b) => {
      if (!b.filleul || !b.parrain) return;
      const fId = b.filleul.id;
      const existing = map.get(fId) || { filleul: b.filleul };
      if (b.niveau === 2 || b.parrain.niveau === 2) {
        existing.parrain2 = b.parrain;
      } else if (b.niveau === 3 || b.parrain.niveau === 3) {
        existing.parrain3 = b.parrain;
      }
      map.set(fId, existing);
    });

    const result: TirageResult[] = [];
    map.forEach((val) => {
      if (val.parrain2 && val.parrain3) {
        result.push({
          filleul: val.filleul,
          parrain2: val.parrain2,
          parrain3: val.parrain3,
        });
      }
    });

    return result;
  }, [binomes, currentTirage]);

  // Filières disponibles
  const filieresDisponibles = useMemo(() => {
    const set = new Set<string>();
    families.forEach((f) => {
      if (f.filleul?.filiereCode) set.add(f.filleul.filiereCode);
    });
    return Array.from(set).sort();
  }, [families]);

  // Filtrage par filière et recherche
  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      const matchFiliere = selectedFiliere === "ALL" || f.filleul?.filiereCode === selectedFiliere;
      if (!matchFiliere) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const filleulName = nomComplet(f.filleul).toLowerCase();
      const p2Name = nomComplet(f.parrain2).toLowerCase();
      const p3Name = nomComplet(f.parrain3).toLowerCase();
      const filiereName = (f.filleul?.filiereCode || "").toLowerCase();

      return (
        filleulName.includes(q) ||
        p2Name.includes(q) ||
        p3Name.includes(q) ||
        filiereName.includes(q)
      );
    });
  }, [families, selectedFiliere, search]);

  return (
    <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden bg-background">
      <StageBackground variant="festive" />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-margin py-space-md flex flex-col gap-8">
        
        {/* BARRE DE CONTRÔLE : FILTRES PAR CLASSE & RECHERCHE */}
        <section className="bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-xl border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filtres filière / classe */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 thin-scroll">
            <span className="font-label-md text-xs font-bold uppercase text-on-surface-variant mr-1 shrink-0">
              Classe :
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiliere("ALL")}
              className={`px-4 py-2 rounded-full font-label-md text-xs font-bold transition-all shrink-0 ${
                selectedFiliere === "ALL"
                  ? "bg-encre-text text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Toutes ({families.length})
            </button>
            {filieresDisponibles.map((filiereCode) => {
              const count = families.filter((f) => f.filleul?.filiereCode === filiereCode).length;
              const color = FILIERE_COULEUR[filiereCode] || "#1F7A3A";
              const isSelected = selectedFiliere === filiereCode;
              return (
                <button
                  key={filiereCode}
                  type="button"
                  onClick={() => setSelectedFiliere(filiereCode)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-xs font-bold transition-all shrink-0 ${
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

          {/* Recherche */}
          <div className="relative min-w-[260px] md:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par prénom ou nom…"
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
        </section>

        {/* LISTE DES RÉSULTATS : CHAQUE FAMILLE A LE DESIGN EXACT DEMANDÉ */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-5xl text-vert-teranga animate-spin">
              progress_activity
            </span>
            <p className="font-body text-body-lg text-on-surface-variant font-bold">
              Chargement des résultats…
            </p>
          </div>
        ) : filteredFamilies.length === 0 ? (
          <div className="py-20 text-center bg-surface-container-lowest/80 rounded-3xl p-8 border border-outline-variant/30">
            <AmsenStar size={56} className="mx-auto opacity-40 mb-3" />
            <h3 className="font-headline text-headline-sm font-bold text-on-surface">
              Aucun résultat trouvé
            </h3>
            <p className="font-body text-body-sm text-on-surface-variant mt-1">
              {search
                ? "Aucune famille ne correspond à votre recherche."
                : "Aucun tirage n'a encore été enregistré pour cette classe."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {filteredFamilies.map((family) => (
              <FamilyResultItem key={family.filleul.id} family={family} />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
