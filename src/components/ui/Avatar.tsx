/**
 * Avatar de iniciales. Portado de _ds_bundle.js L346.
 * `size` en px (40 por defecto); el tamaño de letra es round(size * 0.35).
 */
export function Avatar({
  name = "",
  initials,
  size = 40,
  variant = "primary",
  className = "",
}: {
  name?: string;
  initials?: string;
  size?: number;
  variant?: "primary" | "neutral";
  className?: string;
}) {
  const texto =
    initials ??
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const paleta =
    variant === "neutral"
      ? "bg-surface-2 text-text-muted"
      : "bg-primary-subtle text-primary";

  return (
    <span
      aria-label={name || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.011em] ${paleta} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {texto}
    </span>
  );
}
