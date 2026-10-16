
// ÉCRAN 4 — PILOTE
// Console animateur : sélecteur filières/urnes, contrôles tirage,
// mode animation, import CSV, journal d'audit, stats, exports.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { StageBackground } from "@/components/shared/StageBackground";
import { AmsenLogo } from "@/components/shared/AmsenLogo";
import {
  FILIERE_COULEUR,
  FILIERE_LIBELLE,
  initiales,
  nomComplet,
  type StatsFiliere,
} from "@/lib/types";
import { toast } from "@/hooks/use-toast";

export function PiloteScreen() {
  const stats = useAppStore((s) => s.stats);
  const setStats = useAppStore((s) => s.setStats);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const currentNouveau = useAppStore((s) => s.currentNouveau);
  const setView = useAppStore((s) => s.setView);
  const socketConnected = useAppStore((s) => s.socketConnected);
  const modeTest = useAppStore((s) => s.modeTest);
  const setModeTest = useAppStore((s) => s.setModeTest);
  const sonActif = useAppStore((s) => s.sonActif);
  const setSonActif = useAppStore((s) => s.setSonActif);
  const qc = useQueryClient();

  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventName, setEventName] = useState(`Cérémonie de parrainage ${new Date().getFullYear()}`);
  const [selectedFiliere, setSelectedFiliere] = useState<string | null>(stats?.filiereActive ?? null);
  const filieres = stats?.filieres ?? [];

  useEffect(() => {
    if (stats?.filiereActive) {
      setSelectedFiliere(stats.filiereActive);
      return;
    }
    if (!selectedFiliere && filieres.length > 0) {
      setSelectedFiliere(filieres[0].code);
    }
  }, [stats?.filiereActive, filieres, selectedFiliere]);

  const { data: binomes = [] } = useQuery({
    queryKey: ["binomes"],
    queryFn: () => api.binomes(),
    staleTime: 10_000,
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.audit(),
    staleTime: 10_000,
  });

  const refresh = async () => {
    try {
      const next = await api.stats();
      setStats(next);
      if (next.filiereActive) setSelectedFiliere(next.filiereActive);
    } catch {
      // nothing to do: screen stays usable with current cached state
    }
    await qc.invalidateQueries({ queryKey: ["binomes"] });
    await qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      toast({ title: "Nom requis", description: "Saisissez le nom de la cérémonie.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await api.creerEvenement(eventName.trim());
      toast({ title: "Cérémonie créée", description: "Vous pouvez maintenant importer les étudiants." });
      await refresh();
    } catch (e) {
      toast({ title: "Création impossible", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleFiliere = async (code: string) => {
    try {
      await api.changerFiliere(code);
      setSelectedFiliere(code);
      toast({ title: `Filière active : ${code}` });
      await refresh();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleGenererUrnes = async () => {
    setBusy(true);
    try {
      const r = await api.genererUrnes();
      toast({ title: "Urnes générées", description: `Empreinte : ${r.empreinte?.slice(0, 12)}…` });
      await refresh();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDemarrer = async () => {
    try {
      await api.demarrerEvenement();
      toast({ title: "Cérémonie démarrée" });
      await refresh();
    } catch (e) {
      toast({ title: "Démarrage impossible", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    }
  };

  const handleTerminer = async () => {
    try {
      await api.terminerEvenement();
      toast({ title: "Cérémonie terminée" });
      await refresh();
    } catch (e) {
      toast({ title: "Arrêt impossible", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    }
  };

  const handleResetTirages = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer TOUS les tirages et remettre les compteurs à zéro ?")) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.reinitialiserTirages();
      toast({
        title: "Tirages réinitialisés",
        description: `${res.parrainages_supprimes} parrainages supprimés. Tous les compteurs sont revenus à 0.`,
      });
      setCurrentNouveau(null);
      await refresh();
    } catch (e) {
      toast({
        title: "Erreur de réinitialisation",
        description: e instanceof Error ? e.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleProchain = async () => {
    const targetFiliere = selectedFiliere ?? filieres[0]?.code ?? null;
    if (!targetFiliere) {
      toast({ title: "Aucune filière disponible", variant: "destructive" });
      return;
    }
    try {
      const { nouveau } = await api.prochainNouveau(targetFiliere, currentNouveau?.id);
      if (nouveau) {
        setSelectedFiliere(targetFiliere);
        setCurrentNouveau(nouveau);
        setView("tirage");
        toast({ title: "Nouveau sur scène", description: nomComplet(nouveau) });
      } else {
        toast({ title: "Aucun nouveau restant", description: `Filière ${targetFiliere} terminée` });
      }
    } catch (e) {
      toast({ title: "Appel impossible", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!csv.trim()) {
      toast({ title: "CSV vide", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await api.importCsv(csv);
      toast({ title: "Import réussi", description: `${r.count} étudiants importés` });
      setCsv("");
      await refresh();
    } catch (e) {
      toast({ title: "Erreur import", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const data = await api.exportFormat(format);
      const blob = new Blob([data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `amsen_binomes.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Export ${format.toUpperCase()} téléchargé` });
    } catch {
      toast({ title: "Erreur export", variant: "destructive" });
    }
  };

  const handleSon = async () => {
    const next = !sonActif;
    try {
      await api.changerSon(next);
      setSonActif(next);
    } catch (e) {
      toast({ title: "Son non modifié", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    }
  };

  const urnesGenerees = stats?.urnesGenerees ?? false;
  const statut = stats?.statut ?? "preparation";
  const hasEvent = !!stats?.evenementId;
  const hasStudents = (stats?.totalNouveaux ?? 0) > 0;

  return (
    <div className="relative flex flex-col w-full overflow-hidden min-h-[calc(100vh-5rem-3.5rem)]">
      <StageBackground />

      <div className="relative z-10 w-full px-space-lg py-space-md flex flex-col gap-space-lg">
        <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <AmsenLogo size={28} />
              <span className="font-headline text-headline-sm tracking-tight text-on-surface font-extrabold uppercase">
                Régie Pilote
              </span>
            </div>
            <div className="flex items-center gap-2 bg-surface px-space-md py-1.5 rounded-full shadow-sm">
              <span className={"w-2.5 h-2.5 rounded-full " + (socketConnected ? "bg-vert-teranga animate-pulse" : "bg-rouge-laterite")} />
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                {socketConnected ? "WebSocket Connecté" : "Hors-ligne"}
              </span>
              <span className="font-label-md text-label-md text-outline">|</span>
              <span className="font-label-md text-label-md text-vert-teranga font-bold">
                Statut : {statut}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              type="button"
              onClick={() => setModeTest(!modeTest)}
              className={"flex items-center gap-1.5 px-space-md py-2 rounded-full font-label-md text-label-md transition-all shadow-sm " + (modeTest ? "bg-jaune-soleil text-encre-text" : "bg-surface hover:bg-surface-container text-on-surface")}
            >
              <span className="material-symbols-outlined text-[20px] text-outline">science</span>
              <span>Mode Test {modeTest ? "ON" : "OFF"}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px] text-vert-teranga">table_view</span>
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("json")}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px] text-vert-teranga">code</span>
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => void handleResetTirages()}
              disabled={busy}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-rouge-laterite/10 hover:bg-rouge-laterite/20 text-rouge-laterite font-label-md text-label-md transition-all shadow-sm font-bold"
              title="Supprimer tous les tirages et remettre les compteurs à zéro"
            >
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              <span>Remise à 0</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSon()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface hover:bg-surface-container text-on-surface transition-all shadow-sm"
              title="Couper le son"
            >
              <span className="material-symbols-outlined text-[20px]">{sonActif ? "volume_up" : "volume_off"}</span>
            </button>
            <button
              type="button"
              onClick={() => setView("accueil")}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface hover:bg-surface-container text-on-surface transition-all shadow-sm"
              title="Plein écran projection"
            >
              <span className="material-symbols-outlined text-[20px]">fullscreen</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-space-md" aria-label="Préparation de la cérémonie">
          <div className="xl:col-span-2 bg-surface-container-lowest p-space-md rounded-xl shadow-md">
            <div className="flex items-start gap-space-sm">
              <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-vert-teranga text-white font-bold">1</span>
              <div className="flex-1">
                <h2 className="font-headline text-headline-sm font-bold text-on-surface">
                  {hasEvent ? stats?.evenementNom : "Créer la cérémonie"}
                </h2>
                {hasEvent ? (
                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    Cérémonie active · {statut}. Importez les étudiants, puis générez les urnes.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 font-body text-body-md text-on-surface-variant">
                      Aucun événement n’existe encore. Créez la cérémonie pour activer ses commandes, sans charger de fausses données.
                    </p>
                    <div className="mt-space-sm flex flex-col sm:flex-row gap-space-xs">
                      <input
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleCreateEvent();
                        }}
                        aria-label="Nom de la cérémonie"
                        placeholder="Nom de la cérémonie"
                        className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-2 font-body text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-vert-teranga/40"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateEvent()}
                        disabled={busy || !eventName.trim()}
                        className="px-space-md py-2 rounded-lg bg-vert-teranga text-white font-label-md font-bold disabled:opacity-50"
                      >
                        {busy ? "Création…" : "Créer la cérémonie"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col justify-center gap-2">
            <SetupStep number="2" complete={hasStudents} label={`${stats?.totalNouveaux ?? 0} nouveaux importés`} />
            <SetupStep number="3" complete={urnesGenerees} label={urnesGenerees ? "Urnes prêtes" : "Générer les urnes"} />
            <p className="pl-11 font-label-md text-label-md text-on-surface-variant">
              {hasStudents ? `${stats?.totalRestants ?? 0} nouveaux restent à parrainer.` : "Importez la liste CSV dans la section en bas de page."}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-gutter items-start">
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-headline text-headline-sm font-bold text-on-surface">Filières en jeu</span>
                <span className="font-label-md text-label-md text-outline">{filieres.length} filières</span>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Suivi de l&apos;ordre défini par la filière active.
              </p>
              <div className="flex flex-col gap-space-xs">
                {filieres.length === 0 && (
                  <div className="text-on-surface-variant font-label-md text-label-md p-space-sm">
                    {hasEvent ? "Aucune filière importée. Importez un CSV avec le code de filière de chaque étudiant." : "Les filières apparaîtront après l’import du fichier CSV."}
                  </div>
                )}
                {filieres.map((f) => (
                  <FiliereTrack
                    key={f.code}
                    f={f}
                    active={selectedFiliere === f.code}
                    onClick={() => void handleFiliere(f.code)}
                    disabled={!hasEvent || busy}
                  />
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-headline text-headline-sm font-bold text-on-surface">Urnes de jetons</span>
                <span className={"font-label-md text-label-md font-bold px-2 py-0.5 rounded-full " + (urnesGenerees ? "bg-vert-teranga/15 text-vert-teranga" : "bg-rouge-laterite/15 text-rouge-laterite")}>
                  {urnesGenerees ? "Générées" : "Non générées"}
                </span>
              </div>
              <p className="font-body text-body-md text-on-surface-variant">
                {urnesGenerees
                  ? "Les urnes sont prêtes. Chaque clic tire un jeton de façon cryptographique et équitable (écart de charge ≤ 1)."
                  : "Générez les urnes avant la cérémonie : l'algorithme répartit les jetons de façon équitable par filière et niveau."}
              </p>
              <button
                type="button"
                onClick={() => void handleGenererUrnes()}
                disabled={busy || !hasEvent || !hasStudents}
                className="flex items-center justify-center gap-2 px-space-md py-space-sm rounded-xl amsen-gradient text-blanc-pure font-label-lg text-label-lg font-bold shadow-md hover:scale-[1.02] transition-transform disabled:opacity-60"
              >
                <span className="material-symbols-outlined">casino</span>
                {urnesGenerees ? "Régénérer les urnes" : "Générer les urnes"}
              </button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <span className="font-headline text-headline-sm font-bold text-on-surface">Console animateur</span>
                <div className="flex items-center gap-space-xs">
                  {statut === "preparation" && (
                    <button
                      type="button"
                      onClick={() => void handleDemarrer()}
                      disabled={!hasEvent || !urnesGenerees || busy}
                      className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-vert-teranga text-blanc-pure font-label-md text-label-md font-bold shadow-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      Démarrer
                    </button>
                  )}
                  {statut === "en_cours" && (
                    <button
                      type="button"
                      onClick={() => void handleTerminer()}
                      disabled={!hasEvent || busy}
                      className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-rouge-laterite text-blanc-pure font-label-md text-label-md font-bold shadow-sm hover:scale-[1.02] transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">stop</span>
                      Terminer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleProchain()}
                    disabled={!hasEvent || !urnesGenerees || !selectedFiliere || busy}
                    className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-encre-text text-blanc-pure font-label-md text-label-md font-bold shadow-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_play</span>
                    {selectedFiliere ? `Appeler le prochain · ${selectedFiliere}` : "Appeler le prochain"}
                  </button>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="font-headline text-headline-sm font-bold text-on-surface">Binômes révélés</span>
                  <span className="font-label-md text-label-md text-vert-teranga font-bold">{binomes.length}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto thin-scroll">
                  {binomes.length === 0 && (
                    <p className="font-body text-body-md text-on-surface-variant p-space-sm">Aucun tirage pour l&apos;instant.</p>
                  )}
                  {binomes.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low">
                      <span
                        className="w-2 h-10 rounded-full"
                        style={{ background: FILIERE_COULEUR[b.filleul.filiereCode] ?? "#1F7A3A" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-headline text-label-lg font-bold text-on-surface truncate">
                          {nomComplet(b.filleul)}
                        </div>
                        <div className="font-label-md text-label-md text-on-surface-variant truncate">
                          → {initiales(b.parrain.prenom, b.parrain.nom)} ({b.niveau}A) · {b.filleul.filiereCode}
                        </div>
                      </div>
                      <span className="font-label-md text-label-md text-outline shrink-0">
                        {new Date(b.dateTirage).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="font-headline text-headline-sm font-bold text-on-surface">Journal d&apos;audit</span>
                  <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto thin-scroll">
                  {audit.length === 0 && (
                    <p className="font-body text-body-md text-on-surface-variant p-space-sm">Journal vide.</p>
                  )}
                  {audit.map((a) => (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                      <span className={"w-2 h-2 rounded-full mt-1.5 shrink-0 " + auditDot(a.action)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide">
                          {a.action}
                        </div>
                        <div className="font-label-md text-label-md text-on-surface-variant truncate">
                          {a.acteur} · {new Date(a.horodatage).toLocaleTimeString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-headline text-headline-sm font-bold text-on-surface">Import de listes (CSV)</span>
                <span className="font-label-md text-label-md text-outline">
                  Colonnes : nom,prenom,filiere,niveau,photo,telephone,email,indice1,indice2,indice3
                </span>
              </div>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={4}
                placeholder={"nom,prenom,filiere,niveau,photo,telephone,email,indice1,indice2,indice3\nDiallo,Awa,AS,1,,+221770000000,awa.diallo@ensae.sn,Basket,Balance,Thieb"}
                className="w-full p-space-sm rounded-lg border border-outline-variant bg-surface-container-low font-body text-body-md text-on-surface resize-y focus:outline-none focus:ring-2 focus:ring-vert-teranga/40"
              />
              <label className="w-fit cursor-pointer rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-2 font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsv(await file.text());
                    e.target.value = "";
                  }}
                />
                Choisir un fichier CSV
              </label>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-space-md py-2 rounded-full bg-vert-teranga text-blanc-pure font-label-md text-label-md font-bold shadow-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Importer
                </button>
                <span className="font-label-md text-label-md text-outline">
                  Les filières inconnues sont créées automatiquement.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FiliereTrack({
  f,
  active,
  onClick,
  disabled,
}: {
  f: StatsFiliere;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const color = FILIERE_COULEUR[f.code] ?? "#1F7A3A";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "group w-full p-space-md rounded-xl transition-all flex items-center justify-between text-left " +
        (active ? "bg-surface shadow-md ring-2" : "bg-surface-container-low hover:bg-surface-container") +
        (disabled ? " opacity-60 cursor-not-allowed" : "")
      }
      style={active ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className="flex items-center gap-space-sm">
        <span className="w-4 h-10 rounded-full transition-transform group-hover:scale-110" style={{ background: color }} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-headline text-headline-sm text-on-surface font-black">{f.code}</span>
            {active && <span className="w-2 h-2 rounded-full bg-vert-teranga animate-pulse" />}
          </div>
          <div className="font-label-md text-label-md text-on-surface-variant font-medium">
            {FILIERE_LIBELLE[f.code] ?? f.libelle}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="px-space-sm py-0.5 rounded-full bg-surface-container font-label-md text-label-md font-bold tabular-nums" style={{ color }}>
          {f.restants} restants
        </span>
        <span className="font-label-md text-label-md text-outline">
          {f.parraines}/{f.totalNouveaux} · {f.parrains2A + f.parrains3A} parrains
        </span>
      </div>
    </button>
  );
}

function SetupStep({ number, complete, label }: { number: string; complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-space-sm">
      <span className={`flex w-8 h-8 items-center justify-center rounded-full font-label-md text-label-md font-bold ${complete ? "bg-vert-teranga text-white" : "bg-surface-container text-on-surface-variant"}`}>
        {number}
      </span>
      <span className={`font-label-md text-label-md ${complete ? "text-on-surface" : "text-on-surface-variant"}`}>
        {label}
      </span>
    </div>
  );
}

function auditDot(action: string): string {
  if (action === "tirage") return "bg-vert-teranga";
  if (action === "annulation") return "bg-rouge-laterite";
  if (action === "urne_generee") return "bg-jaune-soleil";
  if (action === "import") return "bg-primary";
  if (action === "absent") return "bg-rouge-laterite";
  return "bg-outline";
}
