export function StageFooter() {
  return (
    <footer className="w-full bg-blanc-pure py-space-sm mt-auto">
      <div className="w-full px-space-lg flex items-center justify-between text-on-surface-variant">
        <span className="font-label-md text-label-md hidden sm:inline">
          Amicale des Sénégalais de l&apos;ENSAE Dakar © 2026
        </span>
        <div className="flex items-center gap-space-sm font-label-md text-label-md">
          <span className="text-filiere-as font-bold">AS</span>
          <span>•</span>
          <span className="text-on-surface font-bold bg-filiere-ise-eco px-2 py-0.5 rounded">ISE</span>
          <span>•</span>
          <span className="hidden md:inline font-bold amsen-gradient-text">ISEP</span>
        </div>
      </div>
    </footer>
  );
}

