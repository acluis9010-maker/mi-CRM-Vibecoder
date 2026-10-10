import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ANILLO_FOCO } from "./foco";
import { Spinner } from "./Spinner";

/**
 * Botón. Portado de _ds_bundle.js L19.
 * Alturas 48px (móvil) / 44px compacto, radio 6px, peso 600 (500 en
 * secondary/ghost). Una sola acción primaria por vista (design-2.md §1).
 *
 * `--control-h` vive en :root y no genera utilidad, de ahí `h-[var(...)]`:
 * `h-[--control-h]` compilaría a `height: --control-h`, que es CSS inválido.
 */
type Variante = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTES: Record<Variante, string> = {
  primary:
    "bg-primary text-on-primary font-semibold border-transparent hover:bg-primary-hover active:bg-primary-active active:translate-y-px",
  secondary:
    "bg-surface text-text font-medium border-border-strong hover:bg-surface-2",
  ghost:
    "bg-transparent text-text-muted font-medium border-transparent hover:bg-surface-2",
  destructive:
    "bg-error text-white font-semibold border-transparent hover:brightness-90",
};

export function Button({
  children,
  variant = "primary",
  size = "default",
  loading = false,
  iconLeft,
  iconRight,
  disabled,
  className = "",
  ...rest
}: {
  children?: ReactNode;
  variant?: Variante;
  size?: "default" | "compact";
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const inerte = disabled || loading;
  const alto =
    size === "compact"
      ? "h-[var(--control-h-compact)]"
      : "h-[var(--control-h)]";

  return (
    <button
      {...rest}
      disabled={inerte}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border px-5 text-[15px] leading-none tracking-[-0.011em] transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] select-none ${alto} ${
        inerte
          ? "cursor-not-allowed border-border bg-surface-2 text-text-subtle shadow-none"
          : `cursor-pointer ${VARIANTES[variant]}`
      } ${ANILLO_FOCO} ${className}`}
    >
      {loading && <Spinner />}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}
