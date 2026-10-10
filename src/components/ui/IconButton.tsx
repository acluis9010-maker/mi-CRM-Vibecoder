import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ANILLO_FOCO } from "./foco";

/**
 * Botón de solo icono. Portado de _ds_bundle.js L204.
 * `aria-label` es obligatorio en el tipo: design-2.md §6 lo exige y es fácil
 * de olvidar cuando no hay texto visible.
 */
type Variante = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-primary text-on-primary border-transparent hover:bg-primary-hover",
  secondary: "bg-surface text-text border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-text-muted border-transparent hover:bg-surface-2",
  destructive: "bg-error text-white border-transparent hover:brightness-90",
};

export function IconButton({
  children,
  variant = "ghost",
  size = "default",
  disabled,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variante;
  size?: "default" | "compact";
  "aria-label": string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const lado =
    size === "compact"
      ? "size-[var(--control-h-compact)]"
      : "size-[var(--control-h)]";

  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md border transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${lado} ${
        disabled
          ? "cursor-not-allowed border-transparent bg-surface-2 text-text-subtle"
          : `cursor-pointer ${VARIANTES[variant]}`
      } ${ANILLO_FOCO} ${className}`}
    >
      {children}
    </button>
  );
}
