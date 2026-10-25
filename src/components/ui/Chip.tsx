import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ANILLO_FOCO } from "./foco";

/**
 * Chip de alternancia para una selección única que SÍ se puede deseleccionar
 * (el canal de origen del cliente, CRM Shell.dc.html L1079-1087).
 *
 * El design system del handoff no trae chips; el prototipo los estila a mano.
 *
 * Es un botón con `aria-pressed`, no un radio, y eso es deliberado: un radio no
 * se puede desmarcar, y aquí volver a pulsar el chip activo lo deselecciona. Para
 * una elección obligatoria (el estado del cliente) lo correcto son radios
 * nativos, no esto.
 *
 * Lleva `type="button"` fijo porque siempre vive dentro de un <form>, donde el
 * tipo por omisión sería submit.
 */
export function Chip({
  children,
  activo,
  className = "",
  ...rest
}: {
  children: ReactNode;
  activo: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-pressed">) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={activo}
      className={`cursor-pointer rounded-md border px-3.5 py-[9px] text-sm font-medium transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
        activo
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border-strong bg-surface text-text-muted hover:bg-surface-2"
      } ${ANILLO_FOCO} ${className}`}
    >
      {children}
    </button>
  );
}
