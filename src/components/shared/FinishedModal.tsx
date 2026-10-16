import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { spawnConfetti } from "@/components/shared/Confetti";
import { useEffect } from "react";

interface FinishedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filiere: string;
  isAllFinished?: boolean;
  reason?: "absents_restants" | "filiere_terminee" | null;
  autoRedirect?: boolean;
  onViewResults: () => void;
  onGoToPilote: () => void;
}

export function FinishedModal({
  open,
  onOpenChange,
  filiere,
  isAllFinished = false,
  reason = null,
  autoRedirect = false,
  onViewResults,
  onGoToPilote,
}: FinishedModalProps) {
  useEffect(() => {
    if (open) {
      spawnConfetti(70);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface-container-lowest/95 backdrop-blur-2xl border border-vert-teranga/30 p-8 rounded-3xl shadow-2xl text-center flex flex-col items-center">
        {/* Badge animé */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-jaune-soleil/30 blur-xl animate-pulse scale-150" />
          <div className="relative w-20 h-20 rounded-full amsen-gradient flex items-center justify-center text-blanc-pure shadow-xl ring-4 ring-vert-teranga/20 animate-bounce">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
        </div>

        <span className="px-4 py-1 rounded-full bg-vert-teranga/10 text-vert-teranga font-label-md text-label-md font-black uppercase tracking-widest mb-2 border border-vert-teranga/20">
          {isAllFinished ? "Promo 100% Complétée" : `Filière ${filiere} Complète`}
        </span>

        <DialogHeader className="text-center sm:text-center items-center">
          <DialogTitle className="font-headline text-headline-md font-black text-on-surface uppercase tracking-tight text-center">
            {isAllFinished
              ? "Tous les nouveaux sont parrainés !"
              : `Plus de nouveaux pour la filière ${filiere}`}
          </DialogTitle>
          <DialogDescription className="font-body text-body-md text-on-surface-variant max-w-sm mx-auto text-center mt-2">
            {isAllFinished
              ? "Toutes les filières ont terminé leurs tirages ! Félicitations à toute la promotion et aux parrains."
              : reason === "absents_restants"
                ? `Les nouveaux restants de la filière ${filiere} sont tous marqués absents. La cérémonie peut continuer avec une autre filière.`
              : `Tous les étudiants de la filière ${filiere} ont reçu leurs parrains. Vous pouvez passer à la filière suivante ou admirer les résultats.`}
          </DialogDescription>
        </DialogHeader>

        {autoRedirect && (
          <p className="rounded-full bg-surface-container-low px-4 py-2 font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Retour à l’accueil dans quelques instants
          </p>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onViewResults();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-full bg-vert-teranga hover:bg-vert-teranga/90 text-blanc-pure font-label-md text-label-md font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">family_restroom</span>
            <span>Voir les résultats</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onGoToPilote();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2 border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            <span>Changer de filière</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

