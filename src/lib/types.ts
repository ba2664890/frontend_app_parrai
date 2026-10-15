// Types partagés AMSEN Parrainage — frontend React

export type ViewId = "accueil" | "tirage" | "resultats" | "pilote";

export interface Etudiant {
  id: string;
  nom: string;
  prenom: string;
  filiereCode: string;
  niveau: number;
  photo: string | null;
  telephone: string | null;
  email: string | null;
  indice1: string | null;
  indice2: string | null;
  indice3: string | null;
  absent: boolean;
  tire: boolean;
}

export interface Parrainage {
  id: string;
  filleul: Etudiant;
  parrain: Etudiant;
  niveau: number;
  dateTirage: string;
  operateur: string;
  surprise: boolean;
  annule: boolean;
}

export interface StatsFiliere {
  code: string;
  libelle: string;
  couleur: string;
  totalNouveaux: number;
  parraines: number;
  restants: number;
  parrains2A: number;
  parrains3A: number;
  jetons2ARestants: number;
  jetons3ARestants: number;
}

export interface StatsGlobales {
  totalNouveaux: number;
  totalParraines: number;
  totalRestants: number;
  filieres: StatsFiliere[];
  urnesGenerees: boolean;
  evenementId: string | null;
  statut: string;
  filiereActive: string;
  evenementNom: string | null;
  modeAnimation: "cartes" | "roulette" | "coffre" | "constellation" | "des";
  difficulte: "facile" | "moyen" | "difficile";
}

export interface TirageResult {
  filleul: Etudiant;
  parrain2: Etudiant;
  parrain3: Etudiant;
  indices2: string[];
  indices3: string[];
}

export interface AuditEntry {
  id: string;
  horodatage: string;
  action: string;
  acteur: string;
  details: string;
}

export const FILIERE_COULEUR: Record<string, string> = {
  AS: "#1F7A3A",
  ISE: "#FFD800",
  ISE3_eco: "#FFD800",
  ISE_ECO: "#FFD800",
  ISE_MATH: "#C62F24",
  ISEP: "#1F7A3A",
};

export const FILIERE_LIBELLE: Record<string, string> = {
  AS: "Analyste statisticien",
  ISE: "Ingénieur statisticien économiste — classe commune",
  ISE3_eco: "ISE3",
  ISE_ECO: "Ingénieur statisticien économiste",
  ISE_MATH: "Ingénieur statisticien économiste",
  ISEP: "Cycle Ingénieurs",
};

export function codeFiliereAffiche(code: string): string {
  return code === "ISE3_eco" ? "ISE3" : code;
}

export function initiales(prenom: string, nom: string): string {
  return `${prenom.trim().charAt(0).toUpperCase()}. ${nom.trim().charAt(0).toUpperCase()}.`;
}

export function nomComplet(e: { prenom: string; nom: string }): string {
  return `${e.prenom} ${e.nom}`.trim();
}

