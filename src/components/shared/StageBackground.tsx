
// Fond de scène ambient — halos tricolores, étoile filante, particules
// Utilisé sur tous les écrans publics pour l'ambiance amphi
import { AmsenStar } from "./AmsenLogo";

export function StageBackground({ variant = "default" }: { variant?: "default" | "center" | "festive" }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Étoile verte tournante lente (watermark) */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[780px] opacity-[0.045] flex items-center justify-center"
        style={{ animation: "spin 120s linear infinite" }}
      >
        <AmsenStar size={780} />
      </div>

      {/* Halos tricolores */}
      <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-vert-teranga/10 blur-[110px]" />
      {variant !== "center" && (
        <div className="absolute top-1/3 -right-24 w-[480px] h-[480px] rounded-full bg-rouge-laterite/10 blur-[130px]" />
      )}
      <div className="absolute -bottom-24 left-1/3 w-[520px] h-[520px] rounded-full bg-jaune-soleil/15 blur-[120px]" />

      {/* Particules flottantes */}
      <div className="absolute top-1/4 left-[12%] w-3.5 h-3.5 rounded-full bg-vert-teranga/35 animate-bounce" />
      <div className="absolute top-1/2 left-[8%] w-2.5 h-2.5 rounded-sm bg-jaune-soleil/40 rotate-45 animate-pulse" />
      <div className="absolute top-1/3 right-[14%] w-3 h-3 rounded-full bg-rouge-laterite/35 animate-bounce" />
      <div className="absolute top-2/3 right-[10%] w-2 h-2 rounded-full bg-vert-teranga/40 animate-pulse" />
      <div className="absolute bottom-1/4 left-[30%] w-2.5 h-2.5 rounded-sm bg-jaune-soleil/30 rotate-12 animate-ping" />

      {variant === "festive" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full bg-gradient-to-tr from-vert-teranga/15 via-jaune-soleil/20 to-rouge-laterite/15 blur-3xl" />
      )}
    </div>
  );
}
