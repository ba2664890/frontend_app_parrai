// Synchronisation temps réel — WebSocket natif Django Channels
import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { on, isConnected } from "@/lib/socket";
import { api } from "@/lib/api";
import type { StatsGlobales, Etudiant, TirageResult } from "@/lib/types";

export function RealtimeSync() {
  const setStats = useAppStore((s) => s.setStats);
  const setFiliereActive = useAppStore((s) => s.setFiliereActive);
  const setSocketConnected = useAppStore((s) => s.setSocketConnected);
  const setCurrentNouveau = useAppStore((s) => s.setCurrentNouveau);
  const setCurrentTirage = useAppStore((s) => s.setCurrentTirage);
  const setView = useAppStore((s) => s.setView);
  const fetched = useRef(false);

  // Fetch initial des stats
  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      api.stats()
        .then((s: StatsGlobales) => setStats(s))
        .catch(() => {});
    }
  }, [setStats]);

  // Abonnements WebSocket
  useEffect(() => {
    const unsubs = [
      on("connect", () => setSocketConnected(true)),
      on("disconnect", () => setSocketConnected(false)),
      on("stats:update", (data) => setStats(data as StatsGlobales)),
      on("controle", (data) => {
        const commande = data as {
          commande?: string;
          payload?: { mode?: string; difficulte?: string | null };
        };
        const mode = commande.payload?.mode;
        const modes: StatsGlobales["modeAnimation"][] = [
          "cartes",
          "roulette",
          "coffre",
          "constellation",
          "des",
        ];
        if (commande.commande !== "mode" || !mode || !modes.includes(mode as StatsGlobales["modeAnimation"])) {
          return;
        }

        const currentStats = useAppStore.getState().stats;
        if (!currentStats) return;
        const updatedStats: StatsGlobales = {
          ...currentStats,
          modeAnimation: mode as StatsGlobales["modeAnimation"],
        };
        const difficulte = commande.payload?.difficulte;
        if (difficulte === "facile" || difficulte === "moyen" || difficulte === "difficile") {
          updatedStats.difficulte = difficulte;
        }
        setStats(updatedStats);
      }),
      on("filiere:change", (data) => {
        setFiliereActive((data as { filiere: string }).filiere);
      }),
      on("nouveau:tire", (data) => {
        const { nouveau } = data as { nouveau: Etudiant | null };
        setCurrentNouveau(nouveau);
        if (nouveau) setView("tirage");
      }),
      on("tirage:execute", (data) => {
        const { tirage } = data as { tirage: TirageResult };
        const state = useAppStore.getState();

        // Le backend diffuse avant de répondre au POST. Le client qui exécute
        // le tirage doit rester sur Tirage pour jouer son animation; ignorer
        // aussi les événements retardés d'un ancien filleul.
        if (state.currentNouveau?.id !== tirage.filleul.id) return;

        setCurrentTirage(tirage);
        if (state.view !== "tirage") setView("resultats");
      }),
    ];

    // Mettre à jour l'état de connexion initial
    setSocketConnected(isConnected());

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [setStats, setFiliereActive, setSocketConnected, setCurrentNouveau, setCurrentTirage, setView]);

  return null;
}

