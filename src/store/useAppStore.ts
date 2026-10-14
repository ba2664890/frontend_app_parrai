// Store Zustand — état UI global AMSEN Parrainage
import { create } from "zustand";
import type { ViewId, StatsGlobales, Etudiant, TirageResult } from "@/lib/types";

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;

  evenementId: string | null;
  filiereActive: string;
  stats: StatsGlobales | null;
  setStats: (s: StatsGlobales) => void;
  setFiliereActive: (f: string) => void;

  currentNouveau: Etudiant | null;
  setCurrentNouveau: (e: Etudiant | null) => void;

  currentTirage: TirageResult | null;
  setCurrentTirage: (t: TirageResult | null) => void;
  drawAnimation: TirageResult | null;
  setDrawAnimation: (t: TirageResult | null) => void;

  revealStep2: number;
  revealStep3: number;
  setRevealStep2: (n: number) => void;
  setRevealStep3: (n: number) => void;
  resetReveal: () => void;

  socketConnected: boolean;
  setSocketConnected: (b: boolean) => void;

  modeTest: boolean;
  setModeTest: (b: boolean) => void;

  sonActif: boolean;
  setSonActif: (b: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "accueil",
  setView: (v) => set({ view: v }),

  evenementId: null,
  filiereActive: "AS",
  stats: null,
  setStats: (s) =>
    set({ stats: s, evenementId: s.evenementId, filiereActive: s.filiereActive }),
  setFiliereActive: (f) =>
    set((state) => ({
      filiereActive: f,
      stats: state.stats ? { ...state.stats, filiereActive: f } : state.stats,
    })),

  currentNouveau: null,
  setCurrentNouveau: (e) => set({ currentNouveau: e }),

  currentTirage: null,
  setCurrentTirage: (t) => set({ currentTirage: t }),
  drawAnimation: null,
  setDrawAnimation: (t) => set({ drawAnimation: t }),

  revealStep2: 1,
  revealStep3: 1,
  setRevealStep2: (n) => set({ revealStep2: n }),
  setRevealStep3: (n) => set({ revealStep3: n }),
  resetReveal: () => set({ revealStep2: 1, revealStep3: 1 }),

  socketConnected: false,
  setSocketConnected: (b) => set({ socketConnected: b }),

  modeTest: false,
  setModeTest: (b) => set({ modeTest: b }),

  sonActif: true,
  setSonActif: (b) => set({ sonActif: b }),
}));

