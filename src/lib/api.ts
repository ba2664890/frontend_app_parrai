// Client API — appels fetch vers Django REST API /api/*
import type { StatsGlobales, TirageResult, Etudiant, AuditEntry, Parrainage } from "./types";

const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let errorMsg = txt;
    try {
      const parsed = JSON.parse(txt);
      if (parsed && typeof parsed === "object" && parsed.error) {
        errorMsg = parsed.error;
      }
    } catch {}
    throw new Error(errorMsg || `API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async stats(): Promise<StatsGlobales> {
    return json(await fetch(`${BASE}/stats/`));
  },

  async creerEvenement(nom: string): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/evenements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      })
    );
  },

  async prochainNouveau(filiere?: string): Promise<{ nouveau: Etudiant | null }> {
    return json(
      await fetch(`${BASE}/tirage/prochain/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filiere }),
      })
    );
  },

  async executerTirage(nouveauId: string): Promise<TirageResult> {
    return json(
      await fetch(`${BASE}/tirage/executer/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nouveauId }),
      })
    );
  },

  async annulerTirage(parrainageId: string, motif: string): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/tirage/annuler/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parrainageId, motif }),
      })
    );
  },

  async reinitialiserTirages(): Promise<{ ok: boolean; parrainages_supprimes: number }> {
    return json(
      await fetch(`${BASE}/tirage/reinitialiser/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  },

  async marquerAbsent(etudiantId: string, absent: boolean): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "absent", etudiantId, absent }),
      })
    );
  },

  async changerFiliere(filiere: string): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "filiere", filiere }),
      })
    );
  },

  async changerMode(mode: string, difficulte?: string): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mode", mode, difficulte }),
      })
    );
  },

  async changerSon(son: boolean): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "son", son }),
      })
    );
  },

  async genererUrnes(): Promise<{ ok: boolean; empreinte?: string }> {
    return json(await fetch(`${BASE}/urnes/`, { method: "POST" }));
  },

  async demarrerEvenement(): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demarrer" }),
      })
    );
  },

  async terminerEvenement(): Promise<{ ok: boolean }> {
    return json(
      await fetch(`${BASE}/controle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminer" }),
      })
    );
  },

  async binomes(): Promise<Parrainage[]> {
    return json(await fetch(`${BASE}/binomes/`));
  },

  async audit(): Promise<AuditEntry[]> {
    return json(await fetch(`${BASE}/audit/`));
  },

  async importCsv(csv: string): Promise<{ ok: boolean; count: number }> {
    return json(
      await fetch(`${BASE}/import/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      })
    );
  },

  async exportFormat(format: "csv" | "json"): Promise<string> {
    const res = await fetch(`${BASE}/export/?format=${format}`);
    return res.text();
  },
};

