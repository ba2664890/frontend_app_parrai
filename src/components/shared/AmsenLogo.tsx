// Logo officiel AMSEN (fourni par l'utilisateur — /public/amsen-logo.jpeg)
export function AmsenLogo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/amsen-logo.jpeg"
      alt="Logo officiel AMSEN"
      width={size}
      height={size}
      className={"object-cover rounded-full bg-blanc-pure ring-1 ring-surface-container-high shrink-0 " + className}
      style={{ width: size, height: size }}
    />
  );
}

// Petite étoile verte seule (motif décoratif — dégradé signature du drapeau)
export function AmsenStar({
  size = 24,
  className = "",
  fill = "#1F7A3A",
}: {
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <polygon
        points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36"
        fill={fill}
      />
    </svg>
  );
}
