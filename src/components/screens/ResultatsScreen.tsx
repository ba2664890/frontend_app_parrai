/**
 * Écran Résultats — consulte l'intégralité des binômes de parrainage
 * avec filtre par filière et affichage en grille de cartes famille.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import {
  FILIERE_COULEUR,
  FILIERE_LIBELLE,
  initiales,
  nomComplet,
  type Parrainage,
} from "@/lib/types";

// ─── Avatar portrait ─────────────────────────────────────────────────────────
function Avatar({
  nom,
  prenom,
  photo,
  color,
  size = "md",
}: {
  nom: string;
  prenom: string;
  photo: string | null;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "h-10 w-10 text-xs" : size === "lg" ? "h-16 w-16 text-base" : "h-12 w-12 text-sm";
  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-full ring-2 ring-white/60`}
      style={{ background: color }}
    >
      {photo ? (
        <img src={photo} alt={nomComplet({ nom, prenom })} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-headline font-black text-blanc-pure">
          {initiales(prenom, nom)}
        </div>
      )}
    </div>
  );
}

// ─── Carte d'une famille ──────────────────────────────────────────────────────
function FamilleCard({ binome }: { binome: { filleul: Parrainage["filleul"]; parrain2: Parrainage["parrain"] | null; parrain3: Parrainage["parrain"] | null; filiere: string; dateTirage: string } }) {
  const color = FILIERE_COULEUR[binome.filiere] ?? "#1F7A3A";
  const libelle = FILIERE_LIBELLE[binome.filiere] ?? binome.filiere;

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-md ring-1 ring-outline-variant/20 transition-shadow hover:shadow-lg">
      {/* En-tête filière */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 font-label-md text-[11px] font-black uppercase tracking-widest"
          style={{ background: color + "22", color }}
        >
          {libelle}
        </span>
        <span className="font-label-md text-[11px] text-on-surface-variant">
          {new Date(binome.dateTirage).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Filleul */}
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2">
        <Avatar
          nom={binome.filleul.nom}
          prenom={binome.filleul.prenom}
          photo={binome.filleul.photo}
          color="#64748b"
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate font-headline text-label-lg font-bold text-on-surface">
            {nomComplet(binome.filleul)}
          </p>
          <p className="font-label-md text-[11px] text-on-surface-variant">
            Filleul · 1ère année
          </p>
        </div>
      </div>

      {/* Séparateur → */}
      <div className="flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="material-symbols-outlined text-base text-outline">arrow_downward</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      {/* Parrains */}
      <div className="flex flex-col gap-2">
        {binome.parrain2 && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: (FILIERE_COULEUR[binome.filiere] ?? "#1F7A3A") + "15" }}>
            <Avatar
              nom={binome.parrain2.nom}
              prenom={binome.parrain2.prenom}
              photo={binome.parrain2.photo}
              color={color}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate font-headline text-label-lg font-bold" style={{ color }}>
                {nomComplet(binome.parrain2)}
              </p>
              <p className="font-label-md text-[11px] text-on-surface-variant">Parrain · 2e année</p>
            </div>
          </div>
        )}
        {binome.parrain3 && (
          <div className="flex items-center gap-3 rounded-xl bg-rouge-laterite/10 px-3 py-2">
            <Avatar
              nom={binome.parrain3.nom}
              prenom={binome.parrain3.prenom}
              photo={binome.parrain3.photo}
              color="#C62F24"
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate font-headline text-label-lg font-bold text-rouge-laterite">
                {nomComplet(binome.parrain3)}
              </p>
              <p className="font-label-md text-[11px] text-on-surface-variant">Parrain · 3e année</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export function ResultatsScreen() {
  const [parrainages, setParrainages] = useState<Parrainage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtreFiliere, setFiltreFiliere] = useState<string>("TOUTES");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .binomes()
      .then((data) => {
        if (!cancelled) {
          setParrainages(data.filter((p) => !p.annule));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur de chargement.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Grouper les parrainages (1 filleul peut avoir 2 lignes: parrain2 + parrain3)
  const familles = useMemo(() => {
    const map = new Map<
      string,
      { filleul: Parrainage["filleul"]; parrain2: Parrainage["parrain"] | null; parrain3: Parrainage["parrain"] | null; filiere: string; dateTirage: string }
    >();
    for (const p of parrainages) {
      const key = p.filleul.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          filleul: p.filleul,
          parrain2: p.niveau === 2 ? p.parrain : null,
          parrain3: p.niveau === 3 ? p.parrain : null,
          filiere: p.filleul.filiereCode,
          dateTirage: p.dateTirage,
        });
      } else {
        if (p.niveau === 2) existing.parrain2 = p.parrain;
        if (p.niveau === 3) existing.parrain3 = p.parrain;
      }
    }
    return Array.from(map.values());
  }, [parrainages]);

  // Filières disponibles (ordre stable)
  const filieres = useMemo(() => {
    const order = ["AS", "ISE_ECO", "ISE_MATH", "ISEP"];
    const present = new Set(familles.map((f) => f.filiere));
    return order.filter((f) => present.has(f));
  }, [familles]);

  const famFiltered = useMemo(
    () => filtreFiliere === "TOUTES" ? familles : familles.filter((f) => f.filiere === filtreFiliere),
    [familles, filtreFiliere],
  );

  return (
    <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
      <StageBackground variant="festive" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* En-tête */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-vert-teranga/10 px-4 py-2">
            <AmsenStar size={20} />
            <span className="font-label-md text-sm font-black uppercase tracking-widest text-vert-teranga">
              Familles de parrainage
            </span>
          </div>
          <h1 className="mt-3 font-headline text-[clamp(1.8rem,4vw,3rem)] font-black uppercase tracking-tight text-on-surface">
            Résultats officiels
          </h1>
          {!loading && (
            <p className="mt-1 font-body text-body-md text-on-surface-variant">
              {familles.length} famille{familles.length > 1 ? "s" : ""} constituée{familles.length > 1 ? "s" : ""}
            </p>
          )}
        </header>

        {/* Filtres par filière */}
        {!loading && !error && filieres.length > 1 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setFiltreFiliere("TOUTES")}
              className={`rounded-full px-4 py-1.5 font-label-md text-sm font-bold transition-all ${
                filtreFiliere === "TOUTES"
                  ? "bg-encre-text text-blanc-pure shadow-md"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              Toutes ({familles.length})
            </button>
            {filieres.map((f) => {
              const color = FILIERE_COULEUR[f] ?? "#1F7A3A";
              const count = familles.filter((fm) => fm.filiere === f).length;
              const active = filtreFiliere === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltreFiliere(f)}
                  className={`rounded-full px-4 py-1.5 font-label-md text-sm font-bold transition-all ${
                    active ? "shadow-md text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                  style={active ? { background: color } : {}}
                >
                  {FILIERE_LIBELLE[f]?.split(" ")[0] ?? f} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* États */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-vert-teranga border-t-transparent" />
            <p className="font-label-md text-on-surface-variant">Chargement des résultats…</p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md rounded-2xl bg-rouge-laterite/10 p-6 text-center">
            <span className="material-symbols-outlined text-3xl text-rouge-laterite">error</span>
            <p className="mt-2 font-label-md font-bold text-rouge-laterite">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-rouge-laterite px-5 py-2 font-label-md text-sm font-bold text-white"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && famFiltered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AmsenStar size={64} />
            <p className="font-headline text-headline-sm font-bold text-on-surface">
              Aucun résultat
            </p>
            <p className="font-body text-body-md text-on-surface-variant">
              {filtreFiliere === "TOUTES"
                ? "Les familles de parrainage apparaîtront ici après le premier tirage."
                : `Aucune famille pour la filière sélectionnée.`}
            </p>
          </div>
        )}

        {/* Grille des familles */}
        {!loading && !error && famFiltered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {famFiltered.map((fam) => (
              <FamilleCard key={fam.filleul.id} binome={fam} />
            ))}
          </div>
        )}

        {/* Bande tricolore bas de page */}
        <div className="mt-12 flex justify-center gap-0 overflow-hidden rounded-full">
          <div className="h-1 w-16 bg-vert-teranga" />
          <div className="h-1 w-16 bg-jaune-soleil" />
          <div className="h-1 w-16 bg-rouge-laterite" />
        </div>
      </main>
    </div>
  );
}
