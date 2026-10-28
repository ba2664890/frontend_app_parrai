import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { initiales, nomComplet, type Etudiant, type TirageResult } from "@/lib/types";

function FamilyAvatar({ etudiant, color }: { etudiant: Etudiant; color: string }) {
  return <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white/70" style={{ background: color }}>
    {etudiant.photo ? <img src={etudiant.photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-headline text-xl font-black text-blanc-pure">{initiales(etudiant.prenom, etudiant.nom)}</div>}
  </div>;
}

export function FamilyCard({ tirage }: { tirage: TirageResult }) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    const contact = (label: string, person: Etudiant) => [
      `${label}: ${nomComplet(person)}`,
      person.telephone ? `Téléphone: ${person.telephone}` : null,
      person.email ? `Email: ${person.email}` : null,
    ].filter(Boolean).join("\n");
    const details = [
      "AMSEN — FAMILLE DE PARRAINAGE",
      contact("Filleul", tirage.filleul),
      `Filière: ${tirage.filleul.filiereCode} · Niveau 1`,
      "",
      contact("Parrain 2e année", tirage.parrain2),
      "",
      contact("Parrain 3e année", tirage.parrain3),
    ].join("\n");
    let cancelled = false;
    QRCode.toDataURL(details, { errorCorrectionLevel: "M", margin: 2, width: 320, color: { dark: "#1a1a1a", light: "#ffffff" } })
      .then((url) => { if (!cancelled) setQrCode(url); })
      .catch(() => { if (!cancelled) setQrCode(null); });
    return () => { cancelled = true; };
  }, [tirage]);

  return (
    <section className="w-full rounded-[28px] border border-vert-teranga/15 bg-surface-container-lowest/95 p-5 shadow-xl backdrop-blur-sm animate-[float-slow_0.6s_ease-out]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-vert-teranga">family_restroom</span><h2 className="font-headline text-2xl font-black uppercase text-on-surface">Carte famille</h2></div>
        <span className="hidden rounded-full bg-vert-teranga/10 px-3 py-1 font-label-md text-xs font-bold text-vert-teranga sm:block">Parrainage</span>
      </div>
      <div className="grid items-center gap-5 sm:grid-cols-4">
        <div className="flex flex-col items-center text-center"><FamilyAvatar etudiant={tirage.filleul} color="#3f493f" /><p className="mt-2 font-headline text-lg font-black text-on-surface">{nomComplet(tirage.filleul)}</p><span className="font-label-md text-xs text-on-surface-variant">Filleul · {tirage.filleul.filiereCode} 1</span></div>
        <div className="flex flex-col items-center text-center"><FamilyAvatar etudiant={tirage.parrain2} color="#1F7A3A" /><p className="mt-2 font-headline text-lg font-black text-vert-teranga">{nomComplet(tirage.parrain2)}</p><span className="font-label-md text-xs text-on-surface-variant">Parrain · 2e année</span></div>
        <div className="flex flex-col items-center text-center"><FamilyAvatar etudiant={tirage.parrain3} color="#C62F24" /><p className="mt-2 font-headline text-lg font-black text-rouge-laterite">{nomComplet(tirage.parrain3)}</p><span className="font-label-md text-xs text-on-surface-variant">Parrain · 3e année</span></div>
        <div className="flex flex-col items-center text-center"><div className="h-24 w-24 rounded-xl bg-blanc-pure p-1.5 shadow-md">{qrCode ? <img src={qrCode} alt="QR code des coordonnées de la famille de parrainage" className="h-full w-full" /> : <span className="flex h-full items-center justify-center font-label-md text-xs text-outline">QR…</span>}</div><span className="mt-2 font-label-md text-xs text-on-surface-variant">Fiche de parrainage</span></div>
      </div>
    </section>
  );
}
