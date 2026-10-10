import type { ReactNode } from "react";

/**
 * Pill de estado. Portado de _ds_bundle.js L497 y su mapa STATUS (L455).
 * El `neutral` es el único con borde visible; el resto lo llevan transparente.
 */
export type BadgeStatus =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "primary"
  | "neutral";

const PALETA: Record<BadgeStatus, { caja: string; punto: string }> = {
  success: { caja: "bg-success-bg text-success-text border-transparent", punto: "bg-success" },
  warning: { caja: "bg-warning-bg text-warning-text border-transparent", punto: "bg-warning" },
  error: { caja: "bg-error-bg text-error-text border-transparent", punto: "bg-error" },
  info: { caja: "bg-info-bg text-info-text border-transparent", punto: "bg-info" },
  primary: { caja: "bg-primary-subtle text-primary border-transparent", punto: "bg-primary" },
  neutral: { caja: "bg-surface-2 text-text-muted border-border", punto: "bg-text-muted" },
};

export function Badge({
  children,
  status = "neutral",
  dot = true,
  className = "",
}: {
  children: ReactNode;
  status?: BadgeStatus;
  dot?: boolean;
  className?: string;
}) {
  const { caja, punto } = PALETA[status];
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-[5px] text-[13px] font-medium leading-[1.2] tracking-[-0.011em] ${caja} ${className}`}
    >
      {dot && (
        <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${punto}`} />
      )}
      {children}
    </span>
  );
}
