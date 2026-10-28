import { useAppStore } from "@/store/useAppStore";
import { AmsenLogo } from "@/components/shared/AmsenLogo";
import type { ViewId } from "@/lib/types";

const NAV: { id: ViewId; label: string }[] = [
  { id: "resultats", label: "Résultats" },
];

export function StageHeader() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const stats = useAppStore((s) => s.stats);
  const socketConnected = useAppStore((s) => s.socketConnected);

  const parraines = stats?.totalParraines ?? 0;
  const total = stats?.totalNouveaux ?? 0;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-blanc-pure/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 w-full px-space-lg flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setView("accueil")}
          className="flex items-center gap-space-sm group"
          aria-label="Aller à l'accueil"
        >
          <AmsenLogo size={52} className="group-hover:scale-105 transition-transform shadow-md" />
          <div className="flex flex-col text-left">
            <span className="font-headline text-headline-sm tracking-tight text-on-surface font-extrabold uppercase leading-none">
              AMSEN
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium tracking-wide">
              ENSAE Parrainage
            </span>
          </div>
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-space-xs p-1 bg-surface-container-low rounded-full">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={active ? "page" : undefined}
                className={
                  "px-space-md py-space-xs rounded-full font-label-md text-label-md transition-all duration-200 " +
                  (active
                    ? "bg-surface-container-high text-on-surface font-bold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface")
                }
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Statut live */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
            <span
              className={
                "w-3 h-3 rounded-full " +
                (socketConnected ? "bg-vert-teranga animate-pulse" : "bg-outline")
              }
            />
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
              {socketConnected ? "Session Live" : "Hors-ligne"}
            </span>
          </div>
          <div className="flex items-baseline gap-1 bg-surface-container px-space-md py-space-xs rounded-xl">
            <span className="font-headline text-headline-sm text-vert-teranga font-black tabular-nums">
              {parraines}
            </span>
            <span className="font-body-lg text-body-lg text-outline font-semibold">/</span>
            <span className="font-headline text-headline-sm text-on-surface font-extrabold tabular-nums">
              {total}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

