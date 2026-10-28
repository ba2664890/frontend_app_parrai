// Écran de résultats — affiche tous les binômes avec filtre filière et recherche.
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenStar } from "@/components/shared/AmsenLogo";
import { nomComplet, FILIERE_COULEUR, FILIERE_LIBELLE, initiales, type Parrainage } from "@/lib/types";

// ── Utilitaires ────────────────────────────────────────────────────────────────

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function Avatar({ nom, prenom, photo, color, size = "md" }: { nom: string; prenom: string; photo: string | null; color: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-10 w-10 text-sm" : "h-14 w-14 text-base";
  return (
    <div className={`${cls} shrink-0 overflow-hidden rounded-full ring-2 ring-white/60`} style={{ background: color }}>
      {photo
        ? <img src={photo} alt={`${prenom} ${nom}`} className="h-full w-full object-cover" />
        : <div className="flex h-full items-center justify-center font-headline font-black text-blanc-pure">{initiales(prenom, nom)}</div>
      }
    </div>
  );
}

// ── Carte binôme ───────────────────────────────────────────────────────────────

function BinomeCard({ parrainage }: { parrainage: Parrainage }) {
  const filieureColor = FILIERE_COULEUR[parrainage.filleul.filiereCode] ?? "#1F7A3A";
  const filiereLabel = FILIERE_LIBELLE[parrainage.filleul.filiereCode] ?? parrainage.filleul.filiereCode;
  const parrain2Color = "#1F7A3A";
  const parrain3Color = "#C62F24";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      {/* Barre de filière */}
      <div className="h-1 w-full" style={{ background: filieureColor }} />

      <div className="p-4">
        {/* Badge filière */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className="rounded-full px-2.5 py-0.5 font-label-md text-[11px] font-black uppercase tracking-widest"
            style={{ background: filieureColor + "20", color: filieureColor }}
          >
            {parrainage.filleul.filiereCode}
          </span>
          <span className="font-label-md text-[11px] text-on-surface-variant">
            {new Date(parrainage.dateTirage).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Filleul */}
        <div className="mb-3 flex items-center gap-3">
          <Avatar nom={parrainage.filleul.nom} prenom={parrainage.filleul.prenom} photo={parrainage.filleul.photo} color={filieureColor} />
          <div className="min-w-0">
            <p className="truncate font-headline text-lg font-black uppercase text-on-surface leading-tight">
              {nomComplet(parrainage.filleul)}
            </p>
            <p className="font-label-md text-xs text-on-surface-variant">{filiereLabel} · 1re année</p>
          </div>
        </div>

        {/* Séparateur flèche */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-outline-variant/30" />
          <span className="material-symbols-outlined text-[16px] text-outline">arrow_downward</span>
          <div className="h-px flex-1 bg-outline-variant/30" />
        </div>

        {/* Parrains */}
        <div className="flex flex-col gap-2.5">
          {/* Parrain 2A */}
          <div className="flex items-center gap-3 rounded-xl bg-vert-teranga/8 p-2.5">
            <Avatar nom={parrainage.parrain.nom} prenom={parrainage.parrain.prenom} photo={parrainage.parrain.photo} color={parrain2Color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-headline text-sm font-black text-vert-teranga">{nomComplet(parrainage.parrain)}</p>
              <p className="font-label-md text-[11px] text-on-surface-variant">Parrain · 2e année</p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-vert-teranga/60">shield_person</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────

export function ResultatsScreen() {
  const setView = useAppStore((s) => s.setView);

  const [binomes, setBinomes] = useState<Parrainage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedFiliere, setSelectedFiliere] = useState<string>("toutes");

  // Chargement de tous les binômes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.binomes()
      .then((data) => { if (!cancelled) { setBinomes(data); setError(null); } })
      .catch(() => { if (!cancelled) setError("Impossible de charger les résultats."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Liste des filières présentes
  const filieres = useMemo(() => {
    const codes = Array.from(new Set(binomes.map((b) => b.filleul.filiereCode))).sort();
    return codes;
  }, [binomes]);

  // Filtrage
  const filtered = useMemo(() => {
    const q = normalise(search.trim());
    return binomes.filter((b) => {
      if (selectedFiliere !== "toutes" && b.filleul.filiereCode !== selectedFiliere) return false;
      if (!q) return true;
      return (
        normalise(nomComplet(b.filleul)).includes(q) ||
        normalise(nomComplet(b.parrain)).includes(q) ||
        normalise(b.filleul.filiereCode).includes(q)
      );
    });
  }, [binomes, selectedFiliere, search]);

  // ── État vide ─────────────────────────────────────────────────────────────────
  if (!loading && binomes.length === 0 && !error) {
    return (
      <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
        <StageBackground />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-space-lg text-center">
          <AmsenStar size={80} />
          <h1 className="mt-space-md font-headline text-headline-xl font-extrabold uppercase text-encre-text">
            Aucun binôme encore révélé
          </h1>
          <p className="mt-space-sm max-w-xl font-body text-body-lg text-on-surface-variant">
            Les familles de parrainage apparaîtront ici après les tirages.
          </p>
          <button
            onClick={() => setView("accueil")}
            className="mt-space-lg rounded-full amsen-gradient px-space-xl py-space-md font-headline text-headline-sm font-black uppercase tracking-wider text-blanc-pure shadow-lg transition-transform hover:scale-105"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-5rem-3.5rem)] w-full flex-col overflow-hidden">
      <StageBackground variant="festive" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">

        {/* En-tête */}
        <header className="mb-8 text-center">
          <span className="rounded-full bg-vert-teranga/10 px-4 py-2 font-label-md text-sm font-black uppercase tracking-widest text-vert-teranga">
            Résultats officiels
          </span>
          <h1 className="mt-4 font-headline text-[clamp(1.8rem,4vw,3rem)] font-black uppercase tracking-tight text-on-surface">
            Familles de parrainage
          </h1>
          {!loading && (
            <p className="mt-2 font-body text-body-md text-on-surface-variant">
              {binomes.length} binôme{binomes.length > 1 ? "s" : ""} révélé{binomes.length > 1 ? "s" : ""}
            </p>
          )}
        </header>

        {/* Barre de filtre + recherche */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* Filtres filière */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFiliere("toutes")}
              className={`rounded-full px-4 py-1.5 font-label-md text-sm font-bold transition-all ${selectedFiliere === "toutes" ? "bg-encre-text text-blanc-pure shadow-md" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
            >
              Toutes ({binomes.length})
            </button>
            {filieres.map((code) => {
              const count = binomes.filter((b) => b.filleul.filiereCode === code).length;
              const color = FILIERE_COULEUR[code] ?? "#1F7A3A";
              const active = selectedFiliere === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedFiliere(code)}
                  className={`rounded-full px-4 py-1.5 font-label-md text-sm font-bold transition-all ${active ? "text-blanc-pure shadow-md" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  style={active ? { background: color } : {}}
                >
                  {code} ({count})
                </button>
              );
            })}
          </div>

          {/* Recherche */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un nom…"
              className="w-full rounded-full border border-outline-variant/40 bg-surface-container-lowest py-2 pl-9 pr-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-vert-teranga focus:ring-2 focus:ring-vert-teranga/20 sm:w-64"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <p className="mb-6 rounded-2xl border border-rouge-laterite/20 bg-rouge-laterite/10 px-5 py-3 text-center font-label-md font-bold text-rouge-laterite" role="alert">
            {error}
          </p>
        )}

        {/* Chargement */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-vert-teranga/20 border-t-vert-teranga" />
          </div>
        )}

        {/* Résultats filtrés vides */}
        {!loading && filtered.length === 0 && binomes.length > 0 && (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
            <p className="mt-3 font-body text-body-lg text-on-surface-variant">
              Aucun résultat pour <strong>"{search || selectedFiliere}"</strong>
            </p>
            <button
              onClick={() => { setSearch(""); setSelectedFiliere("toutes"); }}
              className="mt-4 rounded-full border border-outline-variant/40 px-5 py-2 font-label-md text-sm font-bold text-on-surface hover:bg-surface-container"
            >
              Effacer les filtres
            </button>
          </div>
        )}

        {/* Grille des binômes */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((b) => (
              <BinomeCard key={b.id} parrainage={b} />
            ))}
          </div>
        )}

        {/* Compteur bas de page */}
        {!loading && filtered.length > 0 && (
          <p className="mt-8 text-center font-label-md text-xs text-on-surface-variant">
            {filtered.length} binôme{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            {(search || selectedFiliere !== "toutes") && ` sur ${binomes.length}`}
          </p>
        )}
      </main>
    </div>
  );
}
